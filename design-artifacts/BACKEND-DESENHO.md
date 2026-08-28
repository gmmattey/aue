# Auê! — Desenho de backend

**Autor:** Thiago (engenharia)
**Data:** 2026-08-07
**Base:** `789ece07-6123-4280-aaf9-5705e4011684/DECISOES.md` (fonte de verdade, **oito** decisões) + leitura do protótipo.
**Status:** documento de **desenho**. Nada foi provisionado, nenhum recurso em nuvem criado, nenhum código de aplicação escrito. O SQL e as assinaturas de endpoint aqui são **especificação ilustrativa**, não artefato executável.

## Enquadramento

Rafael colocou o backend na Onda B e recomendou não iniciar o MVP antes do spike de áudio. Este documento respeita isso.

**D8 corrigiu uma premissa que era minha e estava errada.** O Auê! é **PWA apenas** — nunca houve plano de versão nativa. A hipótese de nativo entrou pela equipe de avaliação: eu levantei "pode forçar app nativo" como contingência técnica ao registrar a limitação de `MediaRecorder` no iOS, Rafael converteu isso no risco R1 e Rian trouxe App Review 1.2 da Apple presumindo distribuição em loja. Nada disso partiu do produto. Este documento foi reescrito para remover o erro, e o erro tinha três consequências concretas no desenho:

1. **Não existe IAP.** Toda a reconciliação de estado de assinatura com Apple e Google saiu. A cobrança é por gateway próprio (§4), e isso **simplifica** D7 em vez de complicá-la — o reembolso passa a ser nosso.
2. **Não existe requisito de loja.** App Review 1.2 sai. A fila de moderação de D2 permanece, mas o driver agora é D1 (13+ sob LGPD, critério de melhor interesse) e a promessa de `legal.html:76` (§5).
3. **A PWA deixou de ser descartável e virou o produto.** Isso adicionou obrigações reais ao backend, que ganharam seção própria (§8).

A premissa que sustenta o resto do documento:

> O backend é uma **API HTTP/JSON stateless + Postgres + object storage privado**, e o contrato de ingestão de áudio é **"um arquivo chega"** — não "um stream ao vivo". Isso não é detalhe: é exatamente a propriedade que faz o backend sobreviver aos dois desfechos possíveis do spike de captura no iOS (§9), sem que exista nenhuma rota nativa de escape.

Onde escrevo Postgres, é Postgres genérico. **Não estou assumindo Supabase** — a plataforma não foi escolhida. Onde o mapeamento para Supabase é relevante (RLS), anoto explicitamente.

---

## 1. Modelo de dados

### 1.1 Classificação de dados

Duas marcações são usadas no DDL:

- **[PD]** — dado pessoal sob LGPD.
- **[PD-A]** — dado pessoal **de adolescente** (13–17), quando o titular for menor.

Observação estrutural importante: **[PD-A] não é uma propriedade de coluna, é uma propriedade de linha**, derivada da data de nascimento do dono. Não dá para marcar "esta tabela é de adolescente". O que dá para fazer — e o desenho abaixo faz — é manter `account.is_minor` derivado e canônico, e keyar as políticas de tratamento nele (retenção, exportação, publicidade, visibilidade de perfil).

**Consequência de D1 ainda não registrada em lugar nenhum:** o protótipo tem slot de anúncio em pelo menos 8 telas (`ranking.html:140`, `desafio.html:141`, `grupo-vez.html:111` — este último um intersticial entre turnos, `campeonatos-lista.html:109`, `duelo-resultado.html:120`, `compartilhar.html:179`, `grupo-criar.html:120`, `grupo-resultado.html:122`). Com 13+, as políticas de AdMob/AdSense e o critério de melhor interesse obrigam **anúncio não-personalizado** para a faixa 13–17. Isso derruba o eCPM de uma fração provavelmente grande da base. É consequência econômica de D1, não detalhe técnico. Sinalizo; a decisão é de Luiz.

### 1.2 Identidade e conta

O ponto central do desenho: **convidado não é "ausência de conta", é uma conta de tipo `guest`.** Todas as FKs apontam para `account` desde o primeiro segundo. Reivindicar a conta (§3) é uma **promoção in-place**, não uma migração de dados.

```sql
CREATE TYPE account_kind   AS ENUM ('guest','registered','npc');
CREATE TYPE account_status AS ENUM ('active','suspended','banned','deactivated','purged','merged');

CREATE TABLE account (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            account_kind   NOT NULL DEFAULT 'guest',
  status          account_status NOT NULL DEFAULT 'active',

  -- Perfil. Só existe a partir da promoção. perfil-editar.html:89 => apelido <= 20.
  nickname        text CHECK (char_length(nickname) <= 20),      -- [PD] [PD-A]
  avatar_key      text,                                          -- [PD] [PD-A] objeto no storage
  bio             text,                                          -- não existe no protótipo; reservado

  -- Gate etário (D1/D3). NUNCA herdado do OAuth (D3).
  birth_date      date,                                          -- [PD] [PD-A] determina PD-A
  age_verified_at timestamptz,
  is_minor        boolean GENERATED ALWAYS AS
                    (birth_date IS NOT NULL
                     AND birth_date > (CURRENT_DATE - INTERVAL '18 years')) STORED,

  -- D6: versão dos termos aceita, para forçar re-aceite quando o texto mudar.
  terms_version_accepted int,
  terms_accepted_at      timestamptz,

  -- Progressão (perfil.html:106,110,115-117)
  xp_total        bigint NOT NULL DEFAULT 0,
  level           int    NOT NULL DEFAULT 1,
  personal_best   numeric(4,1),        -- derivado de score_event; ver §6
  wins_count      int NOT NULL DEFAULT 0,
  streak_days     int NOT NULL DEFAULT 0,

  merged_into     uuid REFERENCES account(id),   -- §3, colisão de reivindicação
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz,   -- D7 etapa 1
  deletion_due_at timestamptz,   -- D7 etapa 2
  purged_at       timestamptz
);

-- Identidade externa. Um account pode ter N provedores (login.html:87-95).
CREATE TABLE identity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  provider      text NOT NULL,          -- 'google' | 'tiktok' | 'x'  (login.html:87-95)
  subject       text NOT NULL,          -- [PD] sub do provedor
  email         citext,                 -- [PD] [PD-A] só se o provedor devolver
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, subject)
);

-- Credencial do convidado. Bearer opaco, rotacionado a cada uso. Ver §3.
CREATE TABLE guest_session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  token_hash    bytea NOT NULL UNIQUE,   -- hash do token; o token nunca é armazenado
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  claimed_at    timestamptz
);

CREATE TABLE social_link (          -- seguidores.html:21-23, comunidade.html:129-132
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  network    text NOT NULL CHECK (network IN ('instagram','tiktok','youtube','x')),
  url        text NOT NULL,          -- [PD] [PD-A] identifica o adolescente fora do app
  PRIMARY KEY (account_id, network)
);
```

Nota sobre `social_link` e D1: seguidor cross-plataforma exposto no perfil de um adolescente (`seguidores.html:22-24`) é exatamente o item que o DECISOES.md:19 diz que "passa a exigir defesa sob o critério de melhor interesse". Do lado do backend, o que dá para oferecer é o interruptor: `social_link` visível só para maiores, ou opt-in explícito. **Não é decisão minha** — registro como pendência de produto.

### 1.3 Gravação, pontuação e origem

```sql
CREATE TYPE recording_state AS ENUM
  ('uploading','scoring','scored','failed','removed','purged');

CREATE TABLE recording (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  state         recording_state NOT NULL DEFAULT 'uploading',

  object_key    text,               -- [PD] [PD-A] voz é dado pessoal. Bucket PRIVADO.
  duration_ms   int,                -- gravacao.html:104 => teto 10s no protótipo
  codec         text,               -- ver §8: depende do spike
  byte_size     bigint,
  content_hash  bytea,              -- dedupe e detecção de reenvio do mesmo áudio

  -- D4: origem opcional, DEPOIS do resultado. NULL é estado de primeira classe.
  origin_kind   text CHECK (origin_kind IN ('ar','bebida','comida')),
  origin_detail text,               -- 'cerveja'|'refrigerante'|'vinho'|'outra'|...
  origin_set_at timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now(),
  retain_until  timestamptz         -- ciclo de vida; ver §7
);

-- Append-only. Fonte de verdade de ranking, histórico e personal_best.
CREATE TABLE score_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id   uuid NOT NULL REFERENCES recording(id) ON DELETE CASCADE,
  account_id     uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,

  score          numeric(4,1) NOT NULL CHECK (score >= 0 AND score <= 100),
  klass          text NOT NULL,       -- 'Deus do Auê' ... 'Arroto de Hamster'
  metrics        jsonb NOT NULL,      -- resultado.html:118-138: profundidade/potência/duração/textura

  -- OBRIGATÓRIO. Sem isso, mudar o algoritmo corrompe silenciosamente todo board histórico.
  algorithm_version text NOT NULL,
  computed_by    text NOT NULL CHECK (computed_by IN ('client','server')),
  is_authoritative boolean NOT NULL DEFAULT false,   -- ver §7.4

  mode           text NOT NULL CHECK (mode IN ('solo','duelo','grupo','campeonato')),
  group_id       uuid,
  scored_at      timestamptz NOT NULL DEFAULT now()
);
```

Duas escolhas que valem defesa:

- **`score_event` append-only, `personal_best` derivado.** O achado de DECISOES.md:168 (87,4 é "melhor pessoal" mas `resultado.html:105` entrega 91,4 e `duelo-resultado.html:101` entrega 93,8, nenhum dos dois no histórico) é sintoma de melhor-pessoal escrito ad hoc. Com o evento como fonte, `personal_best = max(score)` e a contradição vira impossível por construção.
- **`algorithm_version` em toda pontuação.** O spike vai iterar no algoritmo. Sem versão, um ajuste de calibração reordena o ranking histórico sem aviso.

### 1.4 Grafo social, comunidade e conteúdo

```sql
CREATE TABLE follow (                       -- seguidores.html:20-23
  follower_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE TABLE community (                    -- comunidade-criar.html:103-116
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) <= 40),
  description text CHECK (char_length(description) <= 140),
  image_key   text,
  privacy     text NOT NULL CHECK (privacy IN ('public','invite')),
  is_official boolean NOT NULL DEFAULT false,   -- FEATURE_COMMUNITY_CREATION (comunidade-criar.html:91)
  owner_id    uuid REFERENCES account(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_member (
  community_id uuid NOT NULL REFERENCES community(id) ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('member','moderator','owner')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, account_id)
);

CREATE TYPE content_state AS ENUM ('visible','hidden_pending_review','removed');

CREATE TABLE post (                          -- feed.html:25-27, comunidade.html:140-224
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  community_id  uuid REFERENCES community(id) ON DELETE CASCADE,   -- NULL = feed global
  type          text NOT NULL CHECK (type IN ('result','social_link')),
  recording_id  uuid REFERENCES recording(id),                     -- type='result'
  link_network  text, link_url text,                               -- type='social_link' [PD]
  state         content_state NOT NULL DEFAULT 'visible',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((type='result' AND recording_id IS NOT NULL)
      OR (type='social_link' AND link_url IS NOT NULL))
);

CREATE TABLE comment (                       -- comunidade-comentarios.html:114-129 (plano, sem thread)
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),  -- [PD] [PD-A]
  state      content_state NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reaction (                      -- comunidade.html:158-220 (like E dislike)
  post_id    uuid NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  value      smallint NOT NULL CHECK (value IN (-1, 1)),
  PRIMARY KEY (post_id, account_id)
);
```

`comment.body` ganhou `<= 500`. Hoje `comunidade-comentarios.html:135` não tem `maxlength` nenhum. Limite no schema é a defesa barata.

### 1.5 Grupo, campeonato, desafio

O protótipo tem **dois conceitos distintos chamados "jogador"** e eles não cabem na mesma tabela sem `account_id` nulo:

- `grupo-criar.html:105,116` — nomes livres, `maxlength=20`, teto de 5, sem cadastro, sem persistência entre sessões (`index.html:318`).
- `campeonato-criar.html:91-108` — contas reais, sem teto.

```sql
CREATE TABLE play_group (              -- "Grupo" persistente (campeonatos-lista.html:85)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, owner_id uuid NOT NULL REFERENCES account(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE membership_state AS ENUM ('invited','accepted','declined','removed');
CREATE TABLE group_member (            -- D5: convite + aceite + gestão
  group_id uuid NOT NULL REFERENCES play_group(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  state membership_state NOT NULL DEFAULT 'invited',
  invited_at timestamptz NOT NULL DEFAULT now(), responded_at timestamptz,
  PRIMARY KEY (group_id, account_id)
);

CREATE TYPE round_state AS ENUM ('open','running','finished');
CREATE TABLE round (                   -- rodada local OU rodada de campeonato
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('local','championship')),
  championship_id uuid, group_id uuid REFERENCES play_group(id),
  state round_state NOT NULL DEFAULT 'open',
  current_turn_seq int,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);

CREATE TABLE round_participant (
  round_id uuid NOT NULL REFERENCES round(id) ON DELETE CASCADE,
  seq int NOT NULL,
  account_id uuid REFERENCES account(id),                 -- NULL = jogador local anônimo
  display_name text NOT NULL CHECK (char_length(display_name) <= 20),  -- [PD] se digitado
  turn_state text NOT NULL DEFAULT 'waiting'
             CHECK (turn_state IN ('waiting','current','done')),
  score_event_id uuid REFERENCES score_event(id),
  PRIMARY KEY (round_id, seq)
);

CREATE TYPE championship_state AS ENUM ('running','finished');
CREATE TABLE championship (            -- campeonatos-lista.html:87,101,120
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 40),
  group_id uuid NOT NULL REFERENCES play_group(id),
  state championship_state NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);

-- compartilhar.html:160-177: um áudio compartilhado, N desafios, status POR destinatário.
CREATE TYPE challenge_state AS ENUM ('sent','viewed','qualified','expired');
CREATE TABLE challenge (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id  uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  recording_id   uuid NOT NULL REFERENCES recording(id) ON DELETE CASCADE,
  public_token   text NOT NULL UNIQUE,   -- opaco, alta entropia, NÃO derivável do id
  state          challenge_state NOT NULL DEFAULT 'sent',

  -- Snapshot no envio. Resolve estruturalmente a incoerência de DECISOES.md:169.
  snapshot_score numeric(4,1) NOT NULL,
  snapshot_rank  int,
  snapshot_period_key text,

  responder_id   uuid REFERENCES account(id),
  response_score_event_id uuid REFERENCES score_event(id),
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz, qualified_at timestamptz,
  expires_at timestamptz NOT NULL
);
```

**`snapshot_rank` é decisão, não detalhe.** `desafio.html:121` mostra "Luiz está em #3 hoje" e `compartilhar.html:119` mostra "#12 hoje". Se esses números forem lidos ao vivo, o card compartilhado mente à medida que o board se move. Congelados no envio e rotulados como do momento do envio, param de mentir. É a correção estrutural da contradição que o DECISOES.md:169 lista como bug.

Adicionei `expires_at` no desafio: o protótipo (`compartilhar.html:165-175`) não tem estado terminal negativo — só `Enviado → Visualizou → Qualificado`. Link público de áudio sem expiração é passivo permanente de moderação.

### 1.6 Moderação, assinatura, ranking

Tabelas de `report`, `block`, `moderation_action` em §5; `subscription` em §4; `leaderboard_entry` em §6.

### 1.7 O que é [PD-A] na prática

Toda linha cujo `account.is_minor = true` em: `account` (apelido, avatar, data de nascimento, e-mail), `identity.email`, `social_link.url`, `recording.object_key` (a voz), `comment.body`, `post.link_url`, `round_participant.display_name`, e qualquer texto livre. Ou seja: **quase tudo**. A implicação de desenho é que não existe caminho fácil de "isolar os dados de menores numa tabela"; a política tem de ser aplicada nas consultas, o que reforça a arquitetura de porta única das §2 e §5.

Aberto (jurídico, não engenharia): se a gravação de voz é dado pessoal **sensível** sob o Art. 5º II da LGPD. Aqui ela não é usada para identificar ninguém, o que argumenta contra; mas é voz de adolescente. **Não validei.**

---

## 2. A fronteira de publicação como regra única (L1 / D3)

Esta é a seção que o C2 de Rian existe para forçar. O achado nasceu de checagens inconsistentes espalhadas (`login.html:87` ia para `home.html` sem gate, `login.html:91` ia para `idade.html` com gate). Se a resposta for "agora colocamos o `if` certo em cada lugar", o C2 volta em outra forma.

### 2.1 O predicado

Existe **uma** função. Uma implementação, um nome, um lugar:

```sql
CREATE FUNCTION is_publisher(a account) RETURNS boolean AS $$
  SELECT a.kind = 'registered'
     AND a.status = 'active'                        -- não suspenso (§5), não desativado (§4)
     AND a.birth_date IS NOT NULL
     AND a.birth_date <= (CURRENT_DATE - INTERVAL '13 years')
     AND a.terms_version_accepted >= current_required_terms_version();
$$ LANGUAGE sql STABLE;
```

O que esse predicado único absorve, de graça, sem nenhuma checagem adicional em lugar nenhum:

| Requisito | De onde vem | Cláusula |
|---|---|---|
| Precisa de conta | D3 | `kind = 'registered'` |
| Precisa de idade, 13+ | D1, D3 | `birth_date <= hoje - 13 anos` |
| Idade guardada pelo Auê!, nunca herdada do OAuth | D3 | `birth_date` é coluna própria, populada só por `POST /age` |
| Precisa ter aceitado os termos vigentes | D6 | `terms_version_accepted >= …` |
| Suspenso por moderação não publica | D2 | `status = 'active'` |
| Conta desativada (etapa 1 da exclusão) não publica | D7 | `status = 'active'` |

Seis requisitos de quatro decisões diferentes, um predicado. Isso é o argumento a favor do desenho: quando a moderação suspender alguém, ela não precisa saber que existe um gate de publicação — o gate já a obedece.

### 2.2 O mecanismo de aplicação

Três camadas, **uma regra**. As camadas não são checagens redundantes; são o mesmo predicado invocado em três momentos diferentes.

**Camada 1 — tabela declarativa ação→capacidade, fail-closed no boot.**

Toda rota mutante declara uma ação. Existe uma tabela estática única:

```
ACTION_CAPABILITY = {
  # exige is_publisher
  publish_recording, create_post, create_comment, react_to_post,
  follow_user, join_community, create_community, accept_challenge,
  create_group, invite_to_group, create_championship,
  edit_profile, set_social_link, share_recording*,

  # livre para guest
  create_recording, request_score, read_own_result, set_origin,
  read_shared_challenge, read_public_feed*,
}
```

A propriedade que torna isso um mecanismo e não uma convenção: **na subida do processo, o servidor enumera todas as rotas mutantes e falha o boot se alguma não estiver na tabela.** Não é possível adicionar um endpoint sem gate — o deploy quebra. É isso que impede o C2 de voltar; um code review disciplinado, não.

**Camada 2 — o mesmo predicado no banco.** Toda tabela de conteúdo publicado (`post`, `comment`, `reaction`, `follow`, `community_member`, `group_member`) carrega uma política de INSERT que chama `is_publisher()` sobre o ator da sessão. Se a plataforma for Supabase, isso é RLS literal; se for Postgres puro, é policy + `SET LOCAL app.actor_id`. Um bug na API, um script de migração, uma Edge Function nova — nenhum consegue inserir conteúdo de um convidado.

**Camada 3 — teste de contrato enumerado.** Um único teste percorre `ACTION_CAPABILITY` e, para cada ação da classe publisher, afirma negação para os cinco atores: `guest`, `registered sem birth_date`, `registered com 12 anos`, `suspended`, `deactivated`. Ação nova sem linha no teste → o teste falha por contagem. A lista de L1 deixa de ser prosa e vira asserção executável.

### 2.3 A lista de L1 está incompleta — dois itens para Luiz

L1 se descreve como "lista preliminar". Ao fechar o fecho, dois casos não enumerados apareceram e **nenhum é meu para decidir**:

1. **Compartilhar é ato de publicação?** `resultado.html:97,143` leva a `compartilhar.html`, alcançável por convidado. Compartilhar gera uma URL pública que qualquer um abre sem conta e que toca o áudio (`desafio.html:124-132`, `index.html:292`). Pela própria lógica de D3 — publicar no feed exige conta+idade porque expõe conteúdo a terceiros — compartilhar expõe o mesmo áudio ao mesmo público. Marquei `share_recording*` com asterisco. Se ficar livre, existe uma via de publicação anônima sem gate etário e sem responsável identificável, e a fila de moderação de D2 recebe conteúdo sem dono. **Recomendo classificar como publicação.** Custo: mata o loop viral do convidado, que D5 acabou de promover a único mecanismo de retorno do produto. É um trade-off real entre D3 e D5, e é decisão de produto.
2. **O feed público é legível por convidado?** D3 enumera o que **escreve**, nunca o que **lê**. `read_public_feed*` também está com asterisco. Ler o feed sem conta significa expor UGC não moderado a alguém de idade desconhecida — inclusive abaixo de 13. Ler o desafio compartilhado sem conta é requisito explícito (`index.html:292`), então a resposta não pode ser "leitura sempre exige conta". **Recomendo:** desafio compartilhado legível sem conta (é um item, com dono, denunciável); feed e comunidade exigem conta. Sem decisão, fica fail-closed.

### 2.4 Assinaturas de endpoint (especificação)

```
POST   /v1/guest/session            -> {guest_token}          guest
POST   /v1/recordings               -> {recording_id, upload_url}   guest
POST   /v1/recordings/{id}/complete -> {state}                guest
GET    /v1/recordings/{id}/score    -> {score, klass, metrics} owner
PATCH  /v1/recordings/{id}/origin   -> 204                    owner        (D4)
POST   /v1/account/claim            -> {session}              guest        (§3)
POST   /v1/account/age              -> {is_publisher}         registered   (D3)

POST   /v1/posts                    -> 201                    PUBLISHER
POST   /v1/posts/{id}/comments      -> 201                    PUBLISHER
PUT    /v1/posts/{id}/reaction      -> 204                    PUBLISHER
PUT    /v1/users/{id}/follow        -> 204                    PUBLISHER
POST   /v1/communities/{id}/join    -> 204                    PUBLISHER
POST   /v1/challenges/{token}/accept-> 201                    PUBLISHER
POST   /v1/groups                   -> 201                    PUBLISHER

POST   /v1/reports                  -> 201                    autenticado (§5)
PUT    /v1/users/{id}/block         -> 204                    autenticado
GET    /v1/leaderboard?scope&period&group_id                  ver §6
POST   /v1/account/export           -> 202                    fresh-auth  (§4)
POST   /v1/account/deletion         -> 202                    fresh-auth  (§4)

GET    /v1/app-version              -> {build, min_supported_build}  público  (§8.1)
POST   /v1/recordings/{id}/upload-url -> {url}                owner        (§7.1)
GET    /d/{public_token}            -> HTML + Open Graph       público  (§8.4)
```

---

## 3. Sessão anônima e reivindicação (L2)

### 3.1 Ciclo de vida

```
[nada] --primeiro POST /recordings--> guest account (kind=guest) + guest_session
   |
   +-- 30d sem uso ------------------------------> purge (conta + áudio)
   +-- gate etário reprovado (<13) --------------> purge imediato do áudio
   +-- login OIDC ------------------------------> claim
```

**A reivindicação é promoção, não migração.** Como o convidado já é uma `account`, `recording.account_id` e `score_event.account_id` já apontam para a linha certa. Reivindicar é:

```sql
UPDATE account SET kind='registered' WHERE id = :guest_account_id;
INSERT INTO identity (account_id, provider, subject, email) VALUES (…);
UPDATE guest_session SET claimed_at = now() WHERE id = :session_id;
```

Uma transação, sem re-parent de linha, sem risco de migração parcial, sem órfão. É a razão inteira de o convidado ser uma conta desde o início.

Note que **a promoção sozinha não libera publicação**: `is_publisher()` ainda exige `birth_date` e termos. O interstício de idade (`idade.html`, que D3 tira do onboarding) roda depois do login, e só então o gate abre. Duas etapas, um predicado.

### 3.2 A colisão que o desenho ingênuo esquece

Usuário já tem conta, troca de aparelho, grava como convidado, faz login. Agora há **duas** contas e a identidade OIDC já está tomada. Promoção in-place é impossível.

Regra: se `identity(provider,subject)` já existe, é **transferência limitada**, não fusão:

```sql
UPDATE recording   SET account_id = :existing WHERE account_id = :guest;
UPDATE score_event SET account_id = :existing WHERE account_id = :guest;
UPDATE account SET status='merged', merged_into=:existing WHERE id=:guest;
```

Só gravações e pontuações migram. Nunca grafo social, comunidade, XP ou assinatura — o convidado não tem nada disso, porque §2 proibiu. A operação é fechada, idempotente e auditável. O escopo restrito da migração é **consequência direta** do gate único: porque o convidado não pôde criar nada social, não existe nada social para fundir.

### 3.3 Segurança do token de convidado

`guest_token` é uma credencial bearer: quem o tiver reivindica as gravações daquela sessão. Mitigações no desenho:

- Opaco, ≥256 bits, armazenado só como hash.
- **Rotacionado a cada uso** (o servidor devolve o próximo token em cada resposta) — um token vazado envelhece em uma requisição.
- TTL de 30 dias no servidor, e a reivindicação exige token com `last_used_at` dentro de 24h.
- Teto de gravações retidas por sessão de convidado (proponho 10) — limita custo e limita o estrago de um vazamento.

### 3.4 O token **não** pode morar no `localStorage` — e isso é consequência de D8

Com PWA apenas, o iOS Safari deixa de ser um dos alvos e passa a ser **o** alvo crítico. E o ITP do Safari expira armazenamento gravável por script (`localStorage`, IndexedDB, cookies escritos via `document.cookie`) após **7 dias** sem interação com o site, em navegação normal.

O TTL de 30 dias do §3.1 seria, na prática, 7 dias no iOS. A gravação do convidado — o objeto inteiro de L2 — evaporaria antes de a conta ser reivindicada, e o backend nunca saberia por quê.

> **Decisão de desenho: o token de convidado é um cookie `HttpOnly; Secure; SameSite=Lax` definido pelo servidor via `Set-Cookie`, não um valor em `localStorage`.** Cookie primário definido pelo servidor não cai na regra de 7 dias que atinge armazenamento gravável por script. Ganho colateral relevante: `HttpOnly` torna o token ilegível por XSS, o que importa dado o `innerHTML` com entrada de usuário de `comunidade.html:244` que o DECISOES.md:181 já converteu em regra vinculante do MVP.

Duas limitações que **não** consigo remover por desenho, e registro como tal:

- **PWA instalada e Safari têm armazenamento separado no iOS.** Quem gravar como convidado no Safari e depois instalar na tela de início entra na PWA sem cookie e sem gravação. Não há truque de backend para isso. Mitigação de produto: sugerir a instalação **antes** da primeira gravação, ou aceitar a perda. É item para Marcelo e Rafael, não para mim.
- O áudio ainda não enviado, em fila offline no IndexedDB (§8.2), **é** gravável por script e **está** sujeito à expiração de 7 dias e à ejeção por pressão de armazenamento. Uma gravação feita offline pode ser perdida antes de subir. O desenho tem de tratar isso como falha visível, não como silêncio.

### 3.5 Nunca reivindicada

Purga em 30 dias de inatividade: objeto de áudio deletado, linhas de `recording`/`score_event`/`account` deletadas. Nada de convidado entra em ranking, feed ou agregado — a pontuação de convidado é privada por construção, porque entrar no board é publicação (§2), então não há board para reparar quando a conta some.

### 3.6 O caso desconfortável: o áudio do menor de 13

O convidado grava **antes** de qualquer idade ser pedida. Isso é o desenho de D3 e é o certo para o produto — mas significa que o sistema guarda voz de alguém de idade desconhecida, possivelmente 9 anos.

Proposta: quando o gate etário reprova (`birth_date` indica <13), a resposta ao `POST /v1/account/age` dispara **purga imediata e síncrona** do áudio e das pontuações daquela sessão, e o que resta é um registro mínimo antiabuso (hash salgado do token + timestamp, retido 90 dias) para impedir a tentativa em loop até acertar a data. Guardar um cadastro de "menor bloqueado" com identificador seria, ele próprio, coleta de dado de criança. **Não validei juridicamente**; é o desenho que me parece mais defensável, e é item de revisão do jurídico.

---

## 4. Assinatura e exclusão (D7 / L3 / D8)

### 4.1 Assinatura por gateway próprio — nós somos a autoridade do direito de acesso

D8 removeu o IAP. Sem App Store e sem Google Play, a cobrança passa por gateway próprio (Stripe, Pix ou equivalente). A inversão que isso produz é a mais importante desta seção:

| | Com IAP (premissa errada) | Com gateway próprio (D8) |
|---|---|---|
| Autoridade do **dinheiro** | Apple / Google | gateway |
| Autoridade do **direito de acesso** | Apple / Google | **Auê!** |
| Reembolso | fora do nosso controle | **nosso** |
| Estados a espelhar | grace period, account hold, revoke, dois formatos, dois sandboxes | período pago, um formato |

Antes, o entitlement era um espelho de um estado que não controlávamos, e a reconciliação existia porque o espelho podia dessincronizar de forma invisível. Agora, o **período pago é nosso registro**; o gateway só confirma que o dinheiro entrou. Isso apaga a classe inteira de bugs de reconciliação e simplifica D7 de verdade.

```sql
CREATE TYPE sub_status AS ENUM
  ('none','active','cancelled_pending_expiry','expired','refunded','charged_back');

CREATE TABLE subscription (
  account_id      uuid PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
  provider        text NOT NULL CHECK (provider IN ('stripe','pix')),
  provider_ref    text UNIQUE,            -- [PD] id de assinatura/cliente no gateway
  status          sub_status NOT NULL DEFAULT 'none',
  current_period_end timestamptz,         -- fim do período JÁ PAGO. Nosso registro.
  auto_renewing   boolean NOT NULL DEFAULT false,
  cancelled_at    timestamptz,
  last_synced_at  timestamptz NOT NULL DEFAULT now()
);

-- Append-only. Um pagamento confirmado concede um período. É o livro-caixa do acesso.
CREATE TABLE payment_event (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  provider_event_id text NOT NULL UNIQUE,   -- idempotência do webhook
  kind          text NOT NULL CHECK (kind IN
                  ('paid','refunded','chargeback','failed','cancelled')),
  amount_cents  int NOT NULL,
  grants_until  timestamptz,                -- só para kind='paid'
  received_at   timestamptz NOT NULL DEFAULT now()
);
```

`entitled := status IN ('active','cancelled_pending_expiry') AND current_period_end > now()`. Uma expressão derivada, nunca escrita à mão. Corrige a contradição de DECISOES.md:167 (`perfil.html:133-138` não-assinante vs `configuracoes.html:92-97` assinante, a um clique de distância) na raiz: existe um só lugar de onde a UI lê.

### 4.2 Reconciliação com o gateway

Continua existindo, mas encolheu — agora reconcilia **dinheiro**, não direito de acesso.

1. **Webhook** do gateway, idempotente por `provider_event_id`. Eventos que importam: pagamento confirmado, falha de cobrança, cancelamento, **reembolso** e **chargeback**. O handler sempre reconsulta o gateway antes de gravar; webhook é dica, não prova.
2. **Varredura periódica** — job diário sobre `subscription` com `status <> 'none'`, comparando `current_period_end` com o gateway. Rede para webhook perdido.
3. **Nada vindo do cliente é aceito como prova de pagamento.** Nunca foi diferente, e continua.

Duas notas específicas de Brasil, e a segunda é decisão de produto pendente:

- **Chargeback substitui o reembolso de loja como o evento hostil.** Com cartão, a disputa é aberta pelo emissor e chega dias depois. Precisa revogar o acesso e, se houver reincidência, bloquear nova assinatura pelo mesmo meio.
- **Pix comum não é recorrente.** Um Pix é pagamento único: concede um período de 30 dias e acaba, sem renovação automática (`auto_renewing = false`). Isso não quebra nada — o modelo de `payment_event` → período já cobre — mas muda o produto: `assinatura.html:142` promete "cobrança recorrente mensal" e `assinatura-cancelar.html` pressupõe algo a cancelar. Com Pix avulso não há o que cancelar; a assinatura simplesmente expira. Ou se usa Pix Automático, ou o texto dessas telas muda. **Não é decisão minha.**

**Reembolso, agora que é nosso.** D7 diz "sem reembolso; o período pago não é destruído, é cumprido em modo desativado". Com IAP isso era em parte uma limitação disfarçada de política — a Apple reembolsava quando quisesse, de qualquer jeito. Com gateway próprio, é genuinamente uma escolha, e ela passa a ser sustentável: podemos honrá-la. Registro que o inverso também virou possível (reembolso proporcional no cancelamento) e que isso **não** é o que D7 decidiu. Se Luiz quiser revisitar, agora dá.

### 4.3 Estados da conta

```
active ──request_deletion──> deactivated ──due──> purged
  │  ▲                            │
  │  └────── reactivate ──────────┘        (dentro da janela)
  ├──suspend──> suspended ──unsuspend──> active
  └──ban──────> banned ──────due────────> purged
```

`deactivated` (etapa 1 de D7) — imediato, mesma transação da requisição:
- some do feed, ranking, comunidades, listas de seguidores e busca;
- `is_publisher()` já retorna falso (`status <> 'active'`), então nenhuma escrita passa, sem nenhum código novo;
- conteúdo publicado fica oculto, **não deletado** — a reativação precisa ser reversível;
- a **renovação automática é desligada** no gateway, mas o período já pago **não** é interrompido: D7 diz que ele é cumprido em modo desativado. Isso contradiz `conta-apagar.html:84` ("Assinatura ativa é cancelada na hora"), que é o texto que D7 substitui. Com gateway próprio isto é uma chamada nossa e determinística — com IAP dependeria da loja.

`purged` (etapa 2) — deleção física: objetos de áudio, `recording`, `score_event`, `post`, `comment`, `reaction`, `follow`, `social_link`, `identity`, PII de `account`. Sobra uma lápide mínima e sem PII: hash salgado do `provider_ref` (para impedir reassinar e reivindicar histórico) e o registro de moderação (dever legal). Comentários **são** deletados: são texto do titular, portanto dado pessoal dele; como a lista é plana (`comunidade-comentarios.html:114-129`, sem thread), não quebra nada.

Nota fiscal e contábil: registros de pagamento têm prazo de guarda próprio (obrigação fiscal), que sobrevive à exclusão da conta. A lápide guarda valor, data e referência do gateway **sem** ligação a dado pessoal do titular além do exigido. Prazo exato é do contador, **não validei**.

### 4.4 L3 — o prazo, e uma simplificação que reduz o risco que Luiz aceitou

L3 aponta que D7 não cobre quem não assina. Mas o problema real é o risco residual que o próprio D7 registra (DECISOES.md:123): prazo variável por ciclo de cobrança é difícil de defender sob a LGPD.

Observação que muda o quadro: **o único plano é mensal, R$ 4,99/mês (`assinatura.html:130-134`).** Logo `current_period_end` está sempre a no máximo ~31 dias. Então:

> **Proposta: `deletion_due_at = now() + 30 dias`, uniforme, para todo mundo.**

Consequências:
- Usuário gratuito passa a ter prazo — L3 fechada.
- Usuário assinante: o ciclo pago acaba **dentro** da janela de 30 dias em praticamente todos os casos, então "cumprir o período pago em modo desativado" continua verdadeiro sem precisar de regra própria.
- O risco de DECISOES.md:123 desaparece: o prazo deixa de variar por usuário. Vira um número único, publicável na política de privacidade, defensável.
- Duas regras viram uma. Menos código, menos borda.

**Condição que quebra isso:** um plano anual. Com plano anual, `current_period_end` pode ficar 11 meses à frente e as duas regras divergem de novo. Registrar como restrição vinculante: *plano anual exige revisitar D7*.

Se Luiz preferir manter D7 literal, a fórmula é `deletion_due_at = max(subscription.current_period_end, now() + 30d)` — funciona, mas reintroduz o prazo variável e o risco que ele já é.

D8 dá um segundo argumento a favor do prazo uniforme: como o reembolso agora é nosso, o caso de borda "reembolso chega durante a desativação e o fim do ciclo pago deixa de existir" — que com IAP exigia um piso — desaparece por construção. O piso de 30 dias já é o prazo.

### 4.5 Reautenticação, confirmação, exportação (achado A3)

`conta-apagar.html:90-91` apaga em um clique. O desenho exige, em ordem:

1. **Fresh auth** — re-execução do OIDC nos últimos 5 minutos. Um `auth_time` velho não serve. Vale igualmente para exportação.
2. **Confirmação digitada** — o usuário digita o próprio apelido. Barato, e elimina o toque acidental.
3. **Exportação oferecida antes** — a tela de exclusão oferece exportar primeiro, e a exportação também existe sozinha em Configurações (LGPD Art. 18, prometido em `legal.html:82`).

Exportação: job assíncrono, produz `.zip` com JSON (perfil, histórico, pontuações, posts, comentários, comunidades, assinatura) + os arquivos de áudio. Entrega por URL assinada de 7 dias. Limite de 1 por 24h. Requer fresh auth.

**Ponto de LGPD que o desenho tem de resolver e que costuma passar batido:** a exportação não pode conter dado pessoal de terceiro. Comentários que *outras pessoas* escreveram nos posts do titular, nomes de seguidores, membros de comunidade — são dados de outros titulares. O pacote leva o conteúdo **do titular** e agregados numéricos sobre os outros (contagens), nunca a lista nominal.

---

## 5. Fila de moderação (D2)

### 5.0 O driver mudou, a obrigação não

Eu tinha apresentado o canal de contato publicado como requisito da Apple (App Review 1.2). D8 tirou a loja da equação, e com ela a Apple. **A fila continua obrigatória, por dois motivos que nunca dependeram de loja:**

1. **D1.** 13+ sob LGPD coloca o produto sob o critério de melhor interesse do adolescente. Feed público, perfil público e comentários abertos para menores sem via de denúncia é indefensável — e é indefensável perante a ANPD, não perante um revisor de app.
2. **`legal.html:76`** já promete, hoje, que "o Auê! pode remover conteúdo ou suspender contas". Promessa em política de privacidade que nenhuma tela cumpre é exposição por si só.

A diferença prática de D8 aqui é de **prazo**, não de existência: sem submissão à loja, não há um revisor externo bloqueando o lançamento até a fila existir. O incentivo forçado sumiu; a obrigação ficou. Registro isso explicitamente porque é o tipo de item que, sem porteiro, escorrega para depois do lançamento.

### 5.1 Modelo

```sql
CREATE TYPE report_state AS ENUM ('open','triaged','actioned','dismissed');
CREATE TYPE report_reason AS ENUM
  ('sexual','minor_safety','violence','harassment','hate','spam','illegal','other');

CREATE TABLE report (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid REFERENCES account(id),
  target_type  text NOT NULL CHECK (target_type IN ('recording','post','comment','account')),
  target_id    uuid NOT NULL,
  reason       report_reason NOT NULL,
  note         text CHECK (char_length(note) <= 500),
  priority     smallint NOT NULL,          -- derivada de reason; ver SLA
  state        report_state NOT NULL DEFAULT 'open',
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  UNIQUE (reporter_id, target_type, target_id)   -- 1 denúncia por pessoa por item
);

CREATE TABLE block (                         -- bidirecional na leitura
  blocker_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE moderation_action (             -- append-only, auditoria
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid NOT NULL REFERENCES account(id),
  target_type text NOT NULL, target_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN
    ('dismiss','remove_content','warn','suspend','ban','restore')),
  reason text NOT NULL,
  suspend_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 5.2 A porta única de leitura, simétrica à de escrita

Bloqueio é filtro de leitura, e filtro de leitura reimplementado em cada consulta é a mesma doença do C2, do outro lado. Então: **uma função de visibilidade**, usada por todo caminho de leitura de conteúdo — feed, comunidade, comentários, ranking, perfil, link compartilhado.

```sql
CREATE FUNCTION is_visible(viewer uuid, author uuid, st content_state)
RETURNS boolean AS $$
  SELECT st = 'visible'
     AND NOT EXISTS (SELECT 1 FROM block
                     WHERE (blocker_id=viewer AND blocked_id=author)
                        OR (blocker_id=author AND blocked_id=viewer))
     AND (SELECT status FROM account WHERE id=author) = 'active';
$$ LANGUAGE sql STABLE;
```

Simetria que vale explicitar: `is_publisher` é a porta única de escrita, `is_visible` é a porta única de leitura. As duas se alimentam de `account.status`, então suspender uma conta some com o conteúdo dela e cala a conta, em uma escrita.

### 5.3 Auto-ocultação antes do humano

D2 assume, como risco residual, que conteúdo impróprio fica visível a adolescentes até alguém denunciar. A alavanca mais barata contra isso não é contratar mais gente, é encurtar a exposição por máquina:

- **N denúncias distintas ⇒ `hidden_pending_review` automático.** Proponho N=3, e N=1 para `minor_safety` e `sexual`. O item some da leitura na hora e a fila decide depois. Falso positivo custa uma restauração; falso negativo custa a empresa.
- Rate limit por autor e por denunciante (denúncia em massa é vetor de abuso).
- Blocklist de URL no compositor de link social (`comunidade.html:129-132,240` aceita qualquer `http(s)://`) — hoje é uma via aberta de spam e pornografia com validação de prefixo apenas.
- Limite de tamanho em `comment.body` (§1.4).

### 5.4 SLA proposto

| Prioridade | Conteúdo | Alvo | Cobertura |
|---|---|---|---|
| P0 | segurança de menor, sexual, ameaça, doxxing | **4h** | 24/7 |
| P1 | assédio dirigido, ódio | **24h** | horário comercial |
| P2 | spam, fora de tópico, baixa severidade | **72h** | horário comercial |
| Canal de contato publicado (D2) | e-mail publicado em `legal.html` e no site | **1 dia útil** para acusar recebimento | horário comercial |

O canal publicado continua no desenho mesmo sem a Apple: é o endereço para o qual um pai, uma escola ou a própria ANPD escreve. Sob D1 esse endereço é mais necessário, não menos.

### 5.5 O que o SLA implica em carga — com honestidade sobre o que não sei

**Não tenho projeção de tráfego.** Sem DAU nem volume de publicação, qualquer número de fila é chute. O que dá para entregar é o método e a ordem de grandeza.

Taxa de denúncia em apps sociais de UGC costuma cair na faixa de 0,1% a 1% dos itens publicados por dia. Aplicando aos dois extremos plausíveis de um MVP:

- 1.000 itens publicados/dia × 0,5% ≈ **5 denúncias/dia** → ~15 min/dia de trabalho. Uma pessoa, em paralelo com outras funções.
- 50.000 itens/dia × 0,5% ≈ **250 denúncias/dia** × 1–2 min ≈ **5–8h/dia** → um moderador dedicado, em tempo integral.

Mas a carga não é o problema. O problema é a **cobertura**:

> P0 em 4h, 24/7, é impossível para uma pessoa. Não existe configuração em que uma pessoa cubra 24 horas por dia, sete dias por semana. O SLA de 4h implica, desde o dia 1, **plantão remunerado ou fornecedor externo de moderação**. Esse é o custo real de D2 com 13+, e ele é fixo — não escala com o tráfego, existe mesmo com 10 usuários.

As alternativas honestas, se o custo não couber: (a) subir P0 para 24h e aceitar exposição maior; (b) N=1 de auto-ocultação em mais categorias, comprando tempo por máquina em vez de por gente; (c) adiar o feed público e lançar só com comunidades — mas D2 manteve o feed no MVP explicitamente, então isso seria reabrir a decisão. **Recomendo (b) agressivamente**, porque é a única que não custa dinheiro recorrente nem reabre decisão.

Item adicional, jurídico e **não validado**: material de abuso infantil tem dever de notificação a autoridades no Brasil, com prazo e destinatário próprios. Isso não é fila de moderação normal e precisa de procedimento à parte, definido pelo jurídico antes do lançamento.

---

## 6. Ranking em duas dimensões (D5)

### 6.1 As dimensões, e por que não são três

`ranking.html:100-102` tem períodos **Hoje / Semana / Recordes**. `ranking.html:90` e `ranking-vazio.html:72` têm o botão "Filtrar por grupo", hoje inerte, que D5 promoveu a MVP.

Espaço de consulta: `scope ∈ {global, group:<id>} × period ∈ {today, week, all_time}`. Seis combinações.

Origem (D4) **não** é dimensão de ranking: é atributo de exibição em `recording`, e D4 pede o estado "origem não informada" no resultado, histórico e ranking — o que é `NULL` renderizado, não board novo. **Se em algum momento a origem virar filtro de ranking, isto vira 18 combinações e o desenho abaixo precisa ser revisto.**

### 6.2 Estratégia: híbrido materializado/sob demanda

```sql
CREATE TABLE leaderboard_entry (
  scope_type text NOT NULL CHECK (scope_type IN ('global')),
  period_key text NOT NULL,          -- '2026-08-07' | '2026-W32' | 'all'
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  best_score numeric(4,1) NOT NULL,
  best_score_event_id uuid NOT NULL REFERENCES score_event(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_type, period_key, account_id)
);
CREATE INDEX ON leaderboard_entry (scope_type, period_key, best_score DESC);
```

**Board global: materializado na escrita.** Cada `score_event` faz upsert nos três `period_key` do momento:

```sql
INSERT INTO leaderboard_entry (scope_type, period_key, account_id, best_score, best_score_event_id)
VALUES ('global', :pk, :account, :score, :event)
ON CONFLICT (scope_type, period_key, account_id) DO UPDATE
  SET best_score = EXCLUDED.best_score,
      best_score_event_id = EXCLUDED.best_score_event_id,
      updated_at = now()
  WHERE EXCLUDED.best_score > leaderboard_entry.best_score;
```

Métrica é **melhor do período, não soma** — coerente com "Melhor Auê" (`perfil.html:115`) e com pódio.

**Boards de grupo: calculados sob demanda.** Junção `score_event × group_member` no momento da consulta. Razão: grupos são pequenos (o pass-the-phone tem teto de 5, `grupo-criar.html:116`) e a associação **muda**. Se o board de grupo fosse materializado no momento da pontuação, entrar ou sair de um grupo deixaria o board historicamente errado, e a alternativa seria recomputação em cascata a cada mudança de associação. Sob demanda é correto por construção e barato na escala real.

Resumo da escolha: **materializa o que é grande e quente (global), calcula o que é pequeno e sensível a correção (grupo).**

### 6.3 Posição, delta e o eu fixado

- **Posição não é armazenada.** É derivada na leitura: `COUNT(*) WHERE best_score > :meu` + 1, com o índice acima. Armazenar posição obriga a reescrever N linhas a cada pontuação.
- **Linha fixa do próprio usuário** (`ranking.html:145-153`, posição 12 fora do top): consulta separada, sempre executada, mesclada na resposta. Barata, e é o que faz a tela funcionar para quem está em 400º.
- **Delta semanal** (`ranking.html:135,150`, "↑3 essa semana"): exige a posição da semana anterior. Job semanal grava `leaderboard_snapshot(period_key, account_id, position)`; o delta é subtração. Notar que o protótipo mostra delta semanal mesmo com a aba **Hoje** ativa — o delta é sempre semanal, independente da aba.
- **Fuso.** "Hoje" precisa de um fuso, e ele tem de ser **fixo (America/Sao_Paulo)**, não por usuário. Board por fuso de usuário não é um board — é vários, e destrói tanto a comparabilidade quanto o snapshot "#3 hoje" do card compartilhado. Custo aceito: quem estiver fora do Brasil vê o board virar à meia-noite de Brasília.
- **NPCs** (`ranking.html:115,127`, "Personagem Auê"): `account.kind='npc'`. Entram no board, ficam fora de moderação, exclusão, métricas de usuário e de qualquer agregado de negócio. É um detalhe pequeno que, esquecido, contamina todo dashboard.

### 6.4 Recomputação

Como `score_event` é append-only e o board é derivado, todo board é reconstruível por varredura. Isso é o seguro contra o cenário do §1.3: mudança de `algorithm_version` permite repontuar e reconstruir de forma controlada e auditável, em vez de descobrir a divergência em produção.

---

## 7. Armazenamento e processamento de áudio

### 7.1 Estável em qualquer desfecho do spike

**Upload direto ao storage, nunca pela API.** `POST /v1/recordings` devolve uma URL PUT assinada de vida curta; o cliente sobe direto; `POST /v1/recordings/{id}/complete` fecha. Mantém o backend fora do caminho de bytes.

Duas correções que D8 impõe neste fluxo, e que vêm da fila offline da §8.2:

- **A URL assinada tem de ser renovável.** Uma gravação feita offline pode ficar na fila por dias; uma URL de 5 minutos morre muito antes. `POST /v1/recordings/{id}/upload-url` reemite. A URL é curta; o **direito** de subir é longo.
- **A ingestão é idempotente por chave do cliente.** O cliente gera um `client_recording_id` (UUIDv7) no momento da captura e o envia como `Idempotency-Key`. Reenviar devolve o mesmo `recording_id`, nunca um segundo. Sem isso, uma fila offline que refaz o flush duplica gravação — e duplicata em `score_event` contamina ranking e histórico.

Vantagem de escala real: um clipe de 10 s tem dezenas de KB (tabela abaixo). **Não precisa de upload resumível, multipart nem tus** — um único PUT resolve, e a fila offline pode reter o blob inteiro em memória/IndexedDB sem drama. É a única parte do desenho onde o tamanho minúsculo do áudio simplifica de verdade.

**Bucket privado, leitura sempre indireta.** Chave `recordings/{uuid}` — aleatória, não enumerável. Toda leitura passa por `GET /v1/recordings/{id}/audio`, que aplica `is_visible()` (§5.2) e devolve uma URL GET assinada de 5 minutos.

> Esta é a decisão de armazenamento mais importante do documento, e ela é **totalmente independente do spike**: uma URL pública permanente **não pode ser despublicada**. Se o objeto for público, a remoção por moderação de D2 é teatro — o link continua funcionando em cache, em print, em quem já o tinha. Moderação real exige que todo acesso a áudio passe por uma indireção assinada e revogável. Se uma coisa só deste documento sobreviver, que seja esta.

**Ciclo de vida.** Retenção em camadas, alinhada ao produto:

| Situação | Retenção |
|---|---|
| Convidado não reivindicado | 30 dias, teto de 10 gravações |
| Gate etário reprovado (<13) | purga imediata (§3.6) |
| Gratuito, não publicado | 30 dias |
| Publicado | enquanto o post existir |
| Assinante | indefinido — **é** o "Favoritos salvos" (`assinatura.html:123-124`) |
| Removido por moderação | invisível na hora, purga em 30 dias (janela de recurso) |
| Conta desativada | retido até `deletion_due_at`, ilegível |

Coincidência útil, não acidente: o benefício pago "guarde seus melhores arrotos" é exatamente a camada de retenção cara. Quem gera custo de armazenamento de longo prazo é quem paga por ele.

**Custo.** Com um clipe de 10 s (`gravacao.html:104`, "/ 10s"):

| Codec | Tamanho/clipe |
|---|---|
| Opus 24 kbps mono | ~30 KB |
| AAC/Opus 64 kbps | ~80 KB |
| WAV PCM 16-bit 44,1 kHz mono | ~880 KB |

A 10.000 gravações/dia e 40 KB: ~12 GB acumulados por mês, ~146 GB no primeiro ano. A US$0,015–0,02/GB/mês, isso é **US$2–3/mês no fim do primeiro ano**. Egressa 1 milhão de reproduções/mês = 40 GB ≈ US$3,60 em S3+CloudFront, **US$0 em R2**.

Conclusão honesta: **na escala de MVP, o custo de áudio é irrelevante em qualquer configuração.** Não vale otimizar por preço. O que muda a conta em uma ordem de grandeza é o codec — PCM é 30× Opus — e codec é decisão do spike (§9). Otimizar pela revogabilidade, não pelo centavo.

### 7.2 Depende do spike

Formato/codec, taxa de amostragem, duração máxima real, se é preciso subir PCM não comprimido para o DSP do servidor, e onde a pontuação roda. Detalhado na §9.

### 7.3 Anti-fraude

Ranking público com pontuação é alvo. Sem chamar de segurança perfeita: `content_hash` bloqueia reenvio do mesmo arquivo; rate limit por conta e por sessão; e a regra da §7.4.

Um vetor que a fila offline abre e que precisa de regra explícita: **carimbo de tempo declarado pelo cliente é forjável.** Uma gravação enfileirada offline chega com atraso legítimo, então o servidor precisa aceitar `recorded_at` do cliente — mas aceitá-lo para o ranking permitiria escolher em qual dia a nota entra. Regra: `recorded_at` é declarado pelo cliente e serve **só para exibição no histórico**; o board usa `scored_at` do servidor; e uma gravação declarada com mais de 24h **não entra no board de hoje**, entra no de todos os tempos. Três linhas de regra que fecham o buraco.

### 7.4 A regra que sobrevive ao spike: pontuação publicada é atestada pelo servidor

- **Pontuação do cliente = feedback imediato.** Preserva o pico de expectativa entre gravar e ver a nota, que D4 protege deliberadamente e que ficou mais crítico agora que o convidado entra por aí. Sem round-trip, sem espera — e, num produto PWA sujeito a rede ruim, sem depender de rede.
- **Pontuação do servidor = autoridade.** Qualquer nota que entre em ranking, feed, duelo ou card compartilhado é a do servidor, recomputada de forma assíncrona. `score_event.is_authoritative` marca qual é qual.
- Mesmo algoritmo, determinístico, versionado. Divergência acima de um epsilon: o servidor vence e o evento é logado — divergência sistemática é sinal de bug ou de fraude.

Este desenho tem uma propriedade que D8 tornou mais valiosa, não menos: ele **degrada** em vez de quebrar. Se o DSP no browser não for viável no iOS, o cliente iOS simplesmente não mostra preview e espera a nota do servidor; o modelo de dados, os endpoints e o board continuam idênticos. A alternativa — pontuação só no cliente — não teria essa propriedade, e é mais um motivo para não adotá-la.

Risco assumido: as duas notas podem discordar e o usuário vê a nota mudar. Mitigação é determinismo e epsilon; **não é risco eliminado**.

---

## 8. A PWA como produto — o que o backend precisa oferecer (D8)

D8 revogou o "consertar a PWA está fora de escopo". `manifest.json:13-15` aponta para um diretório `icons/` que não existe, não há service worker (logo `offline.html` é inalcançável) e o manifest é referenciado por uma única tela (`landing.html:7`). Isso agora é MVP.

O que segue é a **fatia de backend** dessa obrigação. Service worker, instalação e UI de atualização são do cliente; o backend tem cinco deveres sem os quais a PWA não funciona, e eles não são opcionais.

### 8.1 Versionamento de assets e invalidação

Uma PWA guarda uma cópia do app no dispositivo do usuário e pode rodar uma versão arbitrariamente velha por semanas. Isso é diferente de web e diferente de loja. O backend precisa de:

- **Nomes de arquivo com hash de conteúdo** (`app.9f3c1a.js`) servidos com `Cache-Control: public, max-age=31536000, immutable`. Asset com nome estável e cache longo é o modo clássico de deixar um usuário preso numa versão quebrada sem saída.
- **Documentos de entrada (`/`, HTML) com `Cache-Control: no-cache`** — revalidam sempre. É o único fio que puxa a versão nova.
- **`GET /v1/app-version` → `{build, min_supported_build}`.** Este é o **kill switch**: quando o contrato de API mudar de forma incompatível, `min_supported_build` sobe e o cliente antigo mostra "atualize" em vez de falhar de maneira ilegível. Sem loja, não existe ninguém forçando atualização — este endpoint é o substituto.
- **Versionamento de API tolerante.** Corolário do acima: contratos antigos não podem quebrar em silêncio. Rotas versionadas (`/v1/`), campos novos sempre opcionais, remoção só depois de o `min_supported_build` ter passado por cima.

Regra de cache que é de segurança, não de desempenho: **o service worker nunca cacheia resposta autenticada.** Só GETs públicos e de leitura entram no cache, com TTL curto. Aparelho compartilhado — o caso normal do pass-the-phone de `grupo-criar.html`, aliás — vazaria dados de um usuário para o próximo.

### 8.2 Fila de upload de áudio offline

O caminho crítico do produto é gravar. Gravar num ônibus, num bar, num banheiro de escritório — exatamente onde a rede falha. Se a gravação se perde quando a rede cai, o produto se perde junto.

Desenho:

1. Captura grava o blob no IndexedDB com um `client_recording_id` (UUIDv7) gerado no cliente.
2. Flush tenta `POST /v1/recordings` + PUT assinado + `complete`, com `Idempotency-Key: client_recording_id`.
3. Falhou: fica na fila, com backoff, e a UI mostra "vai subir quando der" — nunca uma nota falsa.
4. Reflush no próximo foreground.

O item 4 não é preguiça, é limitação: **Background Sync não existe no Safari.** Não há como o navegador tentar reenviar sozinho depois; o flush só acontece quando o usuário reabre o app. A consequência de desenho é que a fila pode ter dias de idade, e é dela que saem as três exigências que já embuti na §7: URL de upload renovável, ingestão idempotente e `recorded_at` do cliente sem poder de decidir em qual dia o board recebe a nota (§7.3).

A parte desconfortável, e não sei consertá-la por backend: o blob na fila é armazenamento gravável por script e **pode ser ejetado** pelo iOS antes de subir (§3.4). Uma gravação pode ser genuinamente perdida. O desenho exige que isso seja **falha visível** — a UI diz que a gravação se perdeu — e não um item que some da lista sem explicação. Preferir uma má notícia honesta a um silêncio.

### 8.3 Estratégia de cache, por classe de recurso

| Recurso | Estratégia | Motivo |
|---|---|---|
| App shell (HTML de entrada) | network-first, fallback ao cache | pega versão nova, sobrevive offline |
| JS/CSS com hash | cache-first, imutável | nunca mudam sob o mesmo nome |
| Ícones, fontes (self-hosted, ver DECISOES.md:182) | cache-first | e resolve o vazamento de IP para o Google em 50/50 telas |
| `offline.html` | precache | hoje inalcançável por falta de SW |
| GET de API autenticada | **network-only** | §8.1, aparelho compartilhado |
| GET de API pública (feed, ranking) | stale-while-revalidate, TTL curto | tela abre rápido, atualiza atrás |
| Áudio | **network-only, URL assinada** | cachear áudio destrói a revogabilidade da §7.1 |

A última linha é a que costuma ser violada por reflexo: cachear áudio no service worker parece boa engenharia e desfaz a única propriedade que torna a remoção por moderação real. Se o áudio estiver no cache do dispositivo, remover o conteúdo não o remove de ninguém. Se algum cache de áudio for adotado por desempenho, tem de ser TTL de minutos e chaveado pela URL assinada, que expira sozinha.

### 8.4 O link compartilhado precisa ser renderizado no servidor — e isso é consequência de D5 + D8

D5 removeu o sino de notificações e registrou o risco: o link compartilhado por fora (WhatsApp, story) vira o **único** mecanismo de retorno do produto. D8 acrescentou que também não há loja, então o link é igualmente o **principal mecanismo de aquisição**. Ele carrega o produto inteiro nas costas.

Um link que o WhatsApp não consegue pré-visualizar tem desempenho drasticamente pior que um com card. E o crawler do WhatsApp não executa JavaScript e não carrega credencial. Logo:

- **`GET /d/{public_token}` tem de devolver HTML renderizado no servidor** com Open Graph completo: `og:title` (`"Luiz marcou 91,4 e te desafiou"`, o padrão de `desafio.html:100`), `og:description`, `og:image`.
- **`og:image` tem de ser um PNG gerado no servidor** — o card 4:5 de `compartilhar.html:114-131`, com apelido, nota, classe e o `snapshot_rank` do §1.5. Renderização em servidor, cacheada por `public_token`.
- Só então a PWA assume a navegação.

**Tensão real com a §7.1, e como a resolvo:** a §7.1 diz que nada é publicamente legível. Mas o crawler não tem credencial. Resolução: **o que fica publicamente legível é a imagem derivada, nunca o áudio.** O card é um render de apelido + número; o áudio continua atrás de `is_visible()` + URL assinada. A URL do card é opaca (`public_token`), servida pela API com verificação do estado de moderação e TTL de cache curto — remover o conteúdo mata o card na próxima revalidação. O áudio nunca vaza para o crawler.

Aberto, e é de produto: o card exibe apelido e nota de um usuário que pode ser adolescente, num objeto público indexável. Sob D1 (melhor interesse), isso merece um olhar. **Não decido isso.**

### 8.5 Push está fora, e o teto é mais baixo do que parece

D5 tirou o sino do MVP, então não há trabalho aqui agora. Registro para quando voltar: no iOS, Web Push exige 16.4+ **e** que o usuário tenha instalado a PWA na tela de início. Ou seja, o alcance de push nunca será a base inteira — será o subconjunto que instalou. Isso não muda nada hoje; muda a expectativa de quem um dia disser "vamos ligar o push para resolver a retenção". Não vai resolver sozinho.

### 8.6 Resumo dos deveres de backend para a PWA

1. Assets com hash de conteúdo + cabeçalhos `Cache-Control` corretos por classe.
2. `GET /v1/app-version` com `min_supported_build` — o kill switch que substitui a loja.
3. Ingestão idempotente (`Idempotency-Key`) + URL de upload renovável.
4. Autoridade de carimbo de tempo no servidor, com `recorded_at` do cliente só para exibição.
5. `GET /d/{public_token}` renderizado no servidor, com card OG gerado e revogável.

---

## 9. O que depende do spike (a pergunta mudou)

D8 fechou a saída nativa. **Não existe rota alternativa de plataforma, e não vou inventar uma.** A pergunta do spike deixou de ser "PWA serve ou exige nativo?" e passou a ser:

> **A captura de áudio funciona em PWA no iOS Safari — inclusive no modo instalado na tela de início — e, se não funcionar, qual é o plano?**

### 9.1 Itens que o spike decide

| # | Item | Efeito no backend |
|---|---|---|
| S1 | Codec e container que o navegador entrega | Safari devolve MP4/AAC, Chrome devolve WebM/Opus. **Divergem**, e o backend recebe os dois |
| S2 | Necessidade de transcodificação no servidor para normalizar | se sim, entra um worker de ffmpeg e um custo de CPU real |
| S3 | Duração máxima e taxa de amostragem realmente obteníveis | valida ou derruba o teto de 10 s de `gravacao.html:104` |
| S4 | Onde a pontuação roda (cliente, servidor, ou os dois da §7.4) | define se existe fila de pontuação e qual a latência |
| S5 | O DSP precisa de PCM não comprimido? | ~30× o tamanho do upload e do armazenamento (§7.1) |
| S6 | Runtime do worker de pontuação | define infraestrutura de fila |
| S7 | Calibração de ruído (`calibracao.html`) é possível no navegador? | exige AudioContext ao vivo; ver 9.2 |
| S8 | Latência aceitável entre `complete` e a nota | fila síncrona ou assíncrona |
| S9 | Geração do vídeo 9:16 (`compartilhar.html:130`, 0:07) | **sem nativo, quase certamente servidor** (ffmpeg). É trabalho de backend que eu não tinha contabilizado |

### 9.2 O que quebra se a captura não funcionar no iOS

Sendo direto, e sem oferecer uma saída que não existe:

**O que NÃO quebra:** nada do backend. Modelo de dados, gate único, sessão de convidado, moderação, assinatura, exclusão, ranking e armazenamento são todos indiferentes a como o arquivo foi produzido. É exatamente para isso que o contrato de ingestão é "um arquivo chega" e não "um stream ao vivo" (§ Enquadramento). Essa escolha foi feita pensando neste cenário.

**O que quebra:** o produto no iOS. E aí há três desfechos, e nenhum deles é "fazer um app nativo":

1. **A falha é específica do modo instalado.** Historicamente o `getUserMedia` no iOS teve regressões que atingiam a PWA em `display: standalone` mas não o Safari em aba. Se for esse o caso, a mitigação é rodar em aba — e o custo é perder a instalação, perder o ícone na tela de início e, pior, **perder a proteção contra a expiração de 7 dias do §3.4**, o que degrada a sessão de convidado e L2 junto. Custo alto, mas o produto vive.
2. **`MediaRecorder` não serve, mas captura por arquivo serve.** `<input type="file" accept="audio/*" capture>` abre o gravador do sistema no iOS e devolve um arquivo. Continua PWA, continua web, não é nativo. O upload é idêntico — **o backend não muda uma linha**. O custo é de experiência e é sério: acaba o timer ao vivo e a forma de onda de `gravacao.html:104-113`, acaba a calibração de ruído de `calibracao.html` (que precisa de AudioContext ao vivo), e o momento de gravar deixa de acontecer dentro do produto. As telas do Marcelo que dependem disso teriam de ser redesenhadas. É um plano B feio, mas é um plano B **real** e não-nativo.
3. **Nada funciona no iOS.** Aí é lançar sem iOS ou sem gravação no iOS. Como D8 já registra, isso é decisão de continuidade do projeto — não é detalhe técnico e não é minha para tomar.

O que quero deixar registrado com clareza: o desfecho 2 existe e vale ser testado **dentro do timebox de 5 dias do spike**, porque ele muda a resposta de "o produto morre no iOS" para "o produto perde uma tela querida no iOS". A diferença entre esses dois resultados é grande demais para não ser medida. Recomendo que o spike inclua explicitamente o teste do desfecho 2, e não só o de `MediaRecorder`.

### 9.3 O que não depende do spike

Identidade e sessão de convidado (§3), gate único (§2), grafo social e conteúdo (§1.4), moderação (§5), assinatura e exclusão (§4), ranking (§6), política de armazenamento e revogabilidade (§7.1) e os deveres de PWA da §8. Por superfície, é a **maior parte** do backend — e D8 aumentou essa fração, porque removeu do documento a única peça que estava genuinamente refém da plataforma (o IAP).

---

## 10. Estimativa revisada

Minha estimativa anterior foi **6–10 semanas** de backend. As oito decisões mudaram o escopo nos dois sentidos.

**Removeram:**

| Item | Efeito |
|---|---|
| Push/notificações fora do MVP (D5) | **−1 a −1,5 sem.** Push é caro: ciclo de vida de token, preferências por categoria (`configuracoes.html:106-133` mostra três), reentrega. Sai inteiro. |
| **Reconciliação IAP com Apple e Google (D8)** | **−1,5 a −2,5 sem.** Sai por completo. Era a linha mais cara da minha estimativa anterior. |

**Adicionaram:**

| Item | Efeito |
|---|---|
| Moderação (D2): denúncia, bloqueio, remoção, suspensão, auto-ocultação | +1 a +1,5 sem |
| **Console de moderação** — a fila precisa de alguém operando, e esse alguém precisa de uma ferramenta | **+1,5 a +2,5 sem** |
| **Cobrança por gateway próprio (D8)**: webhooks, período pago, reembolso, chargeback | +1 a +1,5 sem |
| Exclusão em duas etapas + fresh auth + exportação LGPD (D7, A3) | +1 a +1,5 sem |
| **Infraestrutura de PWA (D8, §8)**: versionamento de assets + kill switch, ingestão idempotente com URL renovável, política de cache, autoridade de carimbo de tempo | **+1 a +1,5 sem** |
| **Landing compartilhada renderizada no servidor + geração do card OG (D8, §8.4)** | **+0,5 a +1 sem** |
| **Geração do vídeo 9:16 no servidor (§9.1 S9)** — sem nativo, não há para onde empurrar | +0,5 a +1 sem |
| Ranking em duas dimensões + delta semanal + snapshots (D5) | +0,5 a +1 sem |
| Sessão anônima + reivindicação + colisão de merge (L2) | +0,5 a +1 sem |
| Convite/aceite/gestão de participantes (D5) | +0,5 sem |
| Origem opcional e estado "não informada" em três superfícies (D4) | +0,25 sem |
| Termos versionados + re-aceite (D6) | +0,25 sem |

**Estimativa revisada: 11–16 semanas**, um backend em tempo integral.

A direção honesta, e vou ser específico sobre o que mudou com D8: **a troca IAP → PWA é aproximadamente neutra em custo, mas ligeiramente pior.** Sai 1,5–2,5 semanas de IAP; entram 1–1,5 de gateway próprio, 1–1,5 de infraestrutura de PWA, 0,5–1 de landing/card OG e 0,5–1 de geração de vídeo no servidor. Somando, D8 **acrescentou** cerca de 1 semana ao total, não retirou. A intuição de "sem loja é mais simples" vale para a cobrança e não vale para o resto: sem loja, tudo que a plataforma dava de graça — distribuição, atualização forçada, renderização de vídeo no dispositivo, um lugar de onde o usuário volta — vira trabalho nosso.

Quatro coisas que quero dizer sem enfeitar:

1. **O maior acréscimo continua sendo o console de moderação.** Ele quase nunca entra na estimativa porque não é "o produto". Mas D2 decidiu que existe uma fila operada por alguém com tempo de resposta definido, e fila sem ferramenta é caixa de e-mail. É um app interno: autenticação de moderador, listagem por prioridade, player de áudio, ações, auditoria. Se for cortado, o SLA da §5.4 é ficção. E D8 removeu o revisor da Apple, que era quem forçaria isso a existir antes do lançamento (§5.0).
2. **O item novo mais subestimado é o versionamento da PWA.** Não pela dificuldade, mas porque ninguém sente falta dele até existir um usuário preso numa versão quebrada e nenhuma forma de alcançá-lo. Sem loja, o `min_supported_build` da §8.1 é a única alavanca.
3. **Errei ao introduzir a hipótese nativa.** Ela virou risco R1 no plano de Rafael e trouxe App Review 1.2 para a análise de Rian. Custou atenção da equipe e enviesou o desenho anterior deste documento. O que aprendo: contingência técnica que eu levanto tem de vir rotulada como minha hipótese, não circular como premissa de produto.
4. **A estimativa não inclui** o motor de pontuação (é o spike), o cliente PWA em si (service worker, telas, instalação), o redesenho do Marcelo, o texto legal reescrito de D6, nem a operação contínua da fila de moderação — que é custo recorrente de pessoa, não de engenharia.

**Sequenciamento sugerido, respeitando a Onda B de Rafael:** a §9.3 mostra que a maior parte do backend não depende do spike. Não estou pedindo para começar — a recomendação de Rafael continua de pé, e agora com mais força, porque o spike deixou de ter rota de escape. Estou registrando que, **quando** o MVP começar, o caminho crítico é o gate único (§2) + a sessão de convidado (§3), porque todo o resto pendura neles, e porque são exatamente as duas coisas que o protótipo não tem em nenhuma forma.

---

## 11. O que não determinei

Registro sem inflar. Isto é o que **não** validei:

1. **Volume de tráfego.** Sem DAU nem taxa de publicação, a carga da fila de moderação (§5.5) é método com faixa, não número. Só a conclusão de cobertura 24/7 é robusta a qualquer volume.
2. **O teto diário do plano gratuito.** `assinatura.html:115` promete "sem limite diário" ao assinante, o que implica um limite ao gratuito. **Esse número não aparece em nenhum dos 50 arquivos.** Sem ele, não modelei quota. É decisão de produto pendente.
3. **O gateway de pagamento.** D8 diz "Stripe, Pix ou equivalente" — a escolha não foi feita. O desenho da §4 é agnóstico, mas **Pix avulso não é recorrente** e isso contradiz o texto de `assinatura.html:142` e a premissa de `assinatura-cancelar.html`. Precisa de decisão antes do código.
4. **O comportamento real do iOS.** Escrevi §3.4 (expiração de 7 dias do armazenamento gravável por script), §8.2 (ausência de Background Sync no Safari) e §9.2 (regressões de `getUserMedia` em modo instalado) com base no que sei do comportamento do Safari, **não de teste em aparelho**. São exatamente as premissas que o spike tem de medir, e podem estar desatualizadas. Não confie nelas sem verificar.
5. **A plataforma de dados.** Postgres genérico. Supabase, Neon, RDS, tudo cabe. A escolha muda o mapeamento da §2.2 camada 2 (RLS ou policy manual), não o desenho.
6. **Se compartilhar é publicação** (§2.3) e **se o feed é legível por convidado** (§2.3). Ambas decisões de Luiz. Fail-closed até lá.
7. **Jurídico:** se voz é dado sensível sob a LGPD; se 30 dias é prazo defensável; o procedimento obrigatório de notificação para material de abuso infantil; se a purga imediata do áudio do menor de 13 (§3.6) é a conduta correta; o prazo fiscal de guarda dos registros de pagamento (§4.3); e se o card OG público com apelido e nota de um adolescente (§8.4) se sustenta sob o critério de melhor interesse. Nenhum destes é meu para decidir.
8. **A economia do anúncio não-personalizado** para 13–17 (§1.1). Identifiquei a consequência; não dimensionei a perda de receita.
9. **Leitura do protótipo:** li diretamente o fluxo de gravação, resultado, origem, legal, conta, assinatura e configurações. Os detalhes de feed, comunidade, perfil, conquistas, histórico, grupo, campeonato, desafio, ranking e compartilhamento vieram de leitura delegada com citação de `arquivo:linha`, que conferi por amostragem, **não integralmente**.
10. **Nada foi provisionado.** Nenhum projeto, banco, bucket, gateway ou fila existe. Todo SQL aqui é ilustrativo e nunca foi executado. Nenhum arquivo dentro de `789ece07-6123-4280-aaf9-5705e4011684/` foi alterado — apenas lido.
