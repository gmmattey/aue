> # ⚠️ ARQUIVADO — SEM AUTORIDADE
>
> Este documento descreve o Auê **antes** do reposicionamento de 2026-08-09,
> quando ele era um webapp/PWA com ambição de rede social e governança por gate
> sequencial.
>
> Hoje o Auê é um **jogo mobile casual, web-first**:
> [`../jogo/VISAO.md`](../jogo/VISAO.md) · [`../escopo/ESCOPO_ATUAL.md`](../escopo/ESCOPO_ATUAL.md) · [`../../AGENTS.md`](../../AGENTS.md)
>
> Ele fica versionado como contexto histórico. **Não use nada daqui como
> argumento para implementar, ampliar escopo ou reverter decisão.** Ver
> [`README.md`](README.md).

---

# Checklist de lançamento — Auê

Documento de execução, para uma pessoa: Luiz. Diz o que fazer, em que ordem, e
o que fica sem prova.

> ## ⚠️ ATUALIZADO EM 2026-08-08 — o que mudou desde que este documento foi escrito
>
> Três afirmações do texto original **deixaram de ser verdade**. Elas foram
> corrigidas abaixo, mas o resto do documento (seções 1 a 8) ainda descreve o
> escopo antigo em vários pontos. Leia com isto em mente.
>
> 1. **O código está commitado e no `origin/main`.** Não existe branch
>    `mvp/lancamento-publico` pendente. O passo "commitar e dar push" saiu da
>    ordem geral.
> 2. **O áudio SOBE para o Storage.** O texto da seção 3 diz que "não encontrei
>    nenhuma chamada a `supabase.storage` em `src/`" — isso deixou de valer no
>    commit `b39f119`. Hoje há upload, URL assinada e moderação em
>    `src/db/supabase.ts`.
> 3. **A faixa de migrações a aplicar é maior:** `20260807000015` a
>    `20260807000031`, e não até `000026`. Entraram `000027` (áudio do
>    resultado), `000028` (moderação de áudio), `000029` (login anônimo),
>    `000030` (batalhas em sessão) e `000031` (disputa presencial).
>
> **O escopo do lançamento também mudou** — ver a seção "Leia isto antes do
> resto" do `README.md`. Em resumo: o produto público é gravar + batalha por
> link + disputa presencial, sem login. Feed, ranking, perfil, XP e login
> social estão desligados por flag.
>
> **Pendências de arte: RESOLVIDAS.** `og-image.png`, `pwa-192x192.png`,
> `pwa-512x512.png` e `pwa-maskable-512x512.png` existem em `public/`, gerados a
> partir do símbolo oficial em `docs/design_system/`. O `favicon.svg` deixou de
> ser o raio roxo e passou a ser a marca.
>
> **Domínio: CONFIRMADO** como `https://aue.vercel.app`, e já aplicado em
> `index.html`, `robots.txt`, `sitemap.xml` e na Edge Function `og-preview`.
>
> **Duas coisas novas que podem estragar o lançamento em silêncio:**
>
> - **`Anonymous sign-ins` precisa estar LIGADO** no painel do Supabase
>   (Authentication → Providers). É a identidade do produto inteiro. Desligado,
>   o app grava e mostra a nota, mas o áudio não sobe e a batalha fica muda —
>   sem erro visível para você.
> - **Um build sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` publica um
>   bundle que contém APENAS a tela "o app não está configurado".** As
>   variáveis são de build; configurá-las depois no painel não conserta, só um
>   build novo. Verificado: sem elas o chunk principal sai com 433 KB e nenhuma
>   string do app; com elas, 526 KB.

## Estado de partida (leia antes)

- **O SQL DEIXOU DE SER O MAIOR RISCO.** Em 2026-08-08 as **32 migrações foram
  aplicadas, em ordem, num Postgres 17.6 real** — o projeto Supabase `Auê`
  (`enjykrpprjfmeqxunzcs`, org GMMATTEY, `sa-east-1`). **Nenhuma falhou.** Ver
  "O que já foi verificado no banco", abaixo.
- Ninguém abriu o app em **navegador**. Tudo que está escrito sobre layout,
  rolagem, microfone e instalabilidade do PWA continua vindo de leitura de
  código. O que foi exercitado contra o banco foi a camada de dados, por RPC —
  tudo o que acontece DEPOIS da gravação.

## O que já foi verificado no banco (2026-08-08)

Executado contra o projeto de produção recém-criado, com **sessões anônimas
reais** criadas pelo GoTrue, e não com a chave de serviço:

| Verificação | Resultado |
|---|---|
| 32 migrações aplicadas em ordem | todas OK |
| Perfil criado para visitante anônimo, **sem** `is_founder` | OK — a `000029` faz o que promete |
| A grava, abre batalha, código com 10 caracteres | OK |
| **B abre o link sem nunca ter usado o app e vê a rodada de A** | OK — é o produto inteiro |
| B responde; C entra pelo mesmo link | OK — 3 rodadas, ordem e líder corretos |
| `GET /rest/v1/batalhas` com a chave anônima | **recusado** (idem `rodadas_batalha` e `participantes_batalha`) |
| Código inventado | devolve nulo, indistinguível de expirado |
| B tentando abrir batalha com o resultado de A | recusado |
| Disputa presencial: 3 participantes, 2 rounds, local `churrasco` | OK, ordem dos turnos preservada |
| Round derivado pelo servidor; 3º round numa disputa de 2 | recusado |
| 6 participantes; apelidos repetidos | recusados |
| Batalha com `expires_at` no passado | some — **os 7 dias cortam de verdade** |

Os dados de teste foram apagados: o banco está zerado (0 usuários, 0 perfis,
0 resultados, 0 batalhas).

**Advisors do Supabase**, lidos e triados:

- `rls_enabled_no_policy` (INFO) nas três tabelas de batalha — **é o desenho**,
  não um defeito. Ver a seção 2 da `20260807000030` antes de "consertar".
- `auth_allow_anonymous_sign_ins` e `anon_security_definer_function_executable`
  (WARN) — consequência direta do produto sem login.
- `auth_leaked_password_protection` (WARN) — irrelevante, não há senha.
- `function_search_path_mutable` (WARN) em `aue_score_v1`,
  `aue_origin_score_v1` e `aue_classification_v1` — **pendência real, herdada
  da `000011`**. São as funções que validam o score em CHECK constraint; um
  `ALTER FUNCTION ... SET search_path = public, pg_temp` resolve. Não bloqueia
  o lançamento.
- `auth_rls_initplan` (WARN, 25×) — `auth.uid()` reavaliado por linha nas
  policies antigas. Custo de desempenho, não de segurança. Fica para depois.
- Verificação de pipeline que **foi** feita: `npm run typecheck`, `npm run lint`,
  `npm run test` (65 testes) e `npm run build` passaram depois da última edição.
  Entre os 65, dez são de **comportamento** de verdade — a lógica de turnos da
  disputa presencial (`src/features/battle/turnos.test.ts`). O resto continua
  sendo fórmula de score, deriva de funções SQL e primeiro quadro de tela.

## Ordem geral

1. Painel do Supabase: **ligar `Anonymous sign-ins`** (Authentication →
   Providers). Sem isto o resto não adianta.
2. Banco em **staging** — aplicar 000015…000031 uma a uma (seção 1).
3. Painel do Supabase de **produção**: auth, URLs de redirect (seção 2).
   Providers sociais NÃO são necessários no corte atual.
4. Banco de **produção**: repetir a aplicação das migrações já validadas em staging.
5. Variáveis de ambiente na Vercel (seção 3) — **em Production E em Preview**.
6. Deploy em **Preview** primeiro, testar, depois promover para produção.
7. Verificação pós-deploy: o teste dos **dois telefones** (seção 4 e abaixo).
8. Só depois: OG dinâmico (seção 5), AdSense (seção 6), Push e Auê+ (seção 7).

## O teste que decide o lançamento

Não é `npm test`. É este, com **dois aparelhos de verdade**, não duas abas:

1. Celular A abre `aue.vercel.app`, grava, gera o link `/b/CODIGO` e manda no
   WhatsApp.
2. Celular B, **que nunca abriu o app**, abre o link: ouve o arroto de A, vê a
   nota, grava e manda de volta.
3. Celular A reabre o mesmo link: vê as duas rodadas, na ordem certa.
4. Um terceiro celular entra pelo mesmo link e grava: vira a rodada 3.
5. Recarregue os três: a ordem e o líder não mudam.

**O passo 2 é o produto inteiro. Se ele falhar, nada mais importa.**

Dois problemas conhecidos que provavelmente aparecem aqui:

- **Testar por LAN (`http://192.168.x.x`) não grava.** `navigator.mediaDevices`
  é `undefined` fora de contexto seguro. Teste por deploy de Preview (HTTPS).
- **Safari no iPhone grava `audio/mp4`**, que pode não estar no
  `allowed_mime_types` do bucket `audio_records`. Se o upload falhar no iPhone,
  é isso — e num produto de duelo por áudio, aceitar não é opção. O conserto é
  acrescentar o mime ao bucket.

---

## 1. Banco: aplicar as migrações em staging

### 1.1. Monte o staging

Crie um **projeto Supabase separado**, nunca teste no de produção. Aplique
`20260807000000` … `20260807000014` primeiro: as migrações da faixa 15–26
assumem que essas já existem. Elas provavelmente já rodaram no seu projeto atual,
mas confirme no ambiente que você for usar:

```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
```

Guarde essa lista. Se aparecer `20260807000015` **já aplicada**, pare: existiu
uma versão antiga desse número (o conteúdo de fundador, hoje renumerado para
`20260807000022`) e o banco pode ter o conteúdo errado sob esse número. Ver 1.5,
bloco G.

### 1.2. Método, uma migração por vez

Para cada arquivo, na ordem numérica:

1. **Ensaio.** No SQL Editor do painel (ou `psql` com role owner), cole:

   ```sql
   BEGIN;
   -- conteúdo integral do arquivo .sql aqui
   ROLLBACK;
   ```

   Isso encontra erro de sintaxe, objeto faltando e conflito de nome sem deixar
   nada aplicado. Conferido: nenhuma das migrações usa `CREATE INDEX
   CONCURRENTLY`, `VACUUM` ou `ALTER SYSTEM`, então todas cabem dentro de uma
   transação.
2. **Aplicação de verdade.** Mesma coisa com `COMMIT` no lugar do `ROLLBACK`.
3. **Registre a versão**, senão a CLI vai tentar reaplicar tudo depois:

   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version)
   VALUES ('20260807000015') ON CONFLICT DO NOTHING;
   ```
4. **Teste o bloco** (1.5) antes de ir para a próxima.

Alternativa: `supabase migration up` pela CLI aplica e registra sozinho, mas não
tem ensaio com `ROLLBACK`. Se usar a CLI, faça o ensaio manual antes assim mesmo.

### 1.3. Rollback: onde existe e onde não existe

`supabase/rollback/` (leia o `README.md` de lá antes de usar qualquer um).

Na faixa 15–26 **existe** rollback para: `000015`, `000016`, `000023`, `000024`,
`000025`, `000026`.

**Não existe rollback** para: `000017`, `000018`, `000019`, `000020`, `000021`,
`000022`. Fora da faixa, também não existe para `000013` e `000014`.

Consequência prática: se algo der errado em `000017`–`000022`, **não encadeie
rollbacks** — as tabelas criadas por elas (`seguidores`, `conquistas`,
`conquistas_usuario`, `posts_comunidade`, `favoritos`) ficariam de pé apontando
para um estado anterior. Nessa faixa o caminho de volta é restaurar de `pg_dump`.
Faça o dump **antes** de começar, mesmo em staging:

```
pg_dump "postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" > antes.sql
```

Nenhum dos scripts de rollback foi executado por ninguém. Eles também não passaram
por parser.

### 1.4. Avisos por arquivo

- **`000018`** renomeou `user_conquistas` para `conquistas_usuario` **editando a
  migração no lugar**. Só é seguro em banco onde a `000018` nunca rodou. Se ela
  aparecer em `schema_migrations`, o banco tem o nome antigo: rode
  `ALTER TABLE public."user_conquistas" RENAME TO conquistas_usuario;` à mão.
- **`000022`** foi renumerada de `000015`. Se o banco já tem `is_founder` em
  `profiles`, o conteúdo já rodou sob o número antigo; o DDL é idempotente, mas
  confira antes com a query do cabeçalho do arquivo.
- **`000021` reintroduz o bug de XP (C1)** e a `000023` é quem conserta. Entre uma
  e outra, XP não acumula. Não tire conclusão de teste de XP feito nesse intervalo.
- **`000025`** cria índice único parcial em `reacoes`. Se já houver curtidas
  duplicadas, a criação **falha** — é o comportamento desejado. Apague as
  duplicatas e rode de novo.

### 1.5. O que testar depois de cada bloco

Rode o app local apontado para o staging (`.env` com a URL e a anon key do
staging) e teste pela interface o que for de interface; o resto por SQL.

**Bloco A — `000015` + `000016` (ranking e posse do desafio)**
- Grave um arroto **sem conta**: tem que salvar e gerar nota, e **não** aparecer
  no ranking.
- Grave **logado**: aparece no ranking com o apelido do perfil.
- `SELECT * FROM global_ranking LIMIT 5;` como `anon` e como `authenticated` —
  a view tem `security_invoker`, então precisa retornar sem erro de permissão.
- Tente inserir em `desafios` um `challenger_result_id` que não é seu: tem que
  ser recusado pela policy.

**Bloco B — `000017` (perfil, seguidores, preferências)**
- Perfil abre sem erro e mostra apelido/nível.
- `SELECT toggle_follow('<outro_user_id>');` duas vezes: segue e deixa de seguir.
- Colunas novas existem em `profiles` (`bio`, `titulo`, `is_premium`,
  `notify_*`).

**Bloco C — `000018` (conquistas)**
- Catálogo populado: `SELECT count(*) FROM conquistas;` maior que zero.
- Grave um resultado e confira se o trigger destravou alguma conquista:
  `SELECT * FROM conquistas_usuario WHERE user_id = '<seu_id>';`
- A tela de conquistas sem sessão deve dizer "Entre na sua conta…", nunca uma
  lista.

**Bloco D — `000019` (feed)**
- Feed carrega. Poste um link de rede social pelo app e veja aparecer.
- Falha de rede tem que virar estado de erro com "Tentar de novo", nunca post
  fictício. (`VITE_FEED_DEMO` precisa estar vazio.)

**Bloco E — `000020` (favoritos e lobby de campeonato)**
- Ligas está OFF por flag no cliente; teste só por SQL:
  `SELECT toggle_favorite('<result_id>');` duas vezes.

**Bloco F — `000021` (endurecimento)**
- Tente atualizar `profiles.is_premium` pelo cliente: tem que ser revertido.
- `INSERT` direto em `conquistas_usuario` como `authenticated`: tem que ser negado.
- **Não teste XP aqui** (ver 1.4).

**Bloco G — `000022` (fundador)** e **`000024` (corte em 500)**
- Crie uma conta nova: `is_founder` deve vir `true` enquanto houver menos de 500
  perfis; a coroa aparece no perfil.
- `SELECT count(*) FROM profiles WHERE is_founder;`

**Bloco H — `000023` (XP e `submit_resultado`)** — o bloco mais importante
- Grave um resultado logado e confira **antes e depois**:
  `SELECT xp_total, nivel, titulo FROM profiles WHERE id = '<seu_id>';`
  XP tem que **subir**. Se não subir, a válvula `app.allow_stat_update` não está
  funcionando e não adianta seguir.
- Suba de nível gravando várias vezes e confira que `nivel` e `titulo` mudam.
- Confira o cap diário: gravações além do limite não devem dar XP (mas devem
  salvar o resultado normalmente).
- Tente enviar um score arbitrário pelo cliente: o servidor recalcula, o valor
  gravado tem que ser o do servidor.

**Bloco I — `000025` (curtir)**
- Curta um post, recarregue: contagem persiste. Curta de novo: descurte.
- Mesma pessoa não consegue curtir duas vezes (o índice único garante).
- Deslogado: vê a contagem, não consegue reagir.

**Bloco J — `000026` (comentar)**
- Abra os comentários de um post, escreva, recarregue, apague o próprio.
- Deslogado: lê, não escreve.

**Teste final de ponta a ponta, em staging, antes de tocar em produção**
- Gravar → nota → "Desafiar um amigo" → copiar link `/d/CODIGO` → abrir em aba
  anônima → responder o desafio → ver o vencedor.
- Observação: não encontrei nenhuma chamada a `supabase.storage` em `src/`, o
  que indica que o áudio **não** é enviado para o Storage (só é analisado no
  navegador e o resultado numérico é submetido). Não verifiquei isso em runtime;
  se importar, confirme durante este teste.

### 1.6. Produção

Só depois de todos os blocos passarem em staging: `pg_dump` do banco de produção,
e repita 1.2 lá, na mesma ordem, com o mesmo ensaio `BEGIN`/`ROLLBACK`.

---

## 2. Painel do Supabase (produção)

- **Auth → URL Configuration**: `Site URL` = domínio de produção. Em
  `Redirect URLs`, inclua `https://<dominio>/**` e também a URL de preview da
  Vercel se for testar login no preview. Sem isso o login com Google volta para
  `localhost` e o usuário fica preso.
- **Auth → Providers → Google**: habilitado, com client id/secret. No Google
  Cloud, a URI de redirect autorizada é `https://<ref>.supabase.co/auth/v1/callback`.
- **TikTok e X**: o corte lista os três provedores como ON, mas **só existe botão
  do Google na interface** (`src/App.tsx:156`). As funções `signInWithTikTok` e
  `signInWithTwitter` existem em `src/db/supabase.ts` e ninguém as chama. TikTok
  nem é provedor nativo do supabase-js (daí o cast em `supabase.ts:17`). Decisão
  sua: ou o lançamento sai só com Google (e o texto de divulgação acompanha), ou
  entra trabalho de código + configuração de painel que ninguém fez.
- Anote a **anon key** e a **URL** do projeto de produção; vão para a Vercel.

---

## 3. Variáveis de ambiente na Vercel

**`VITE_*` é resolvida em tempo de BUILD.** Mudar o valor no painel não muda nada
no site que já está no ar: exige **novo build + redeploy**. Vale para todas as de
baixo, sem exceção.

Defina no escopo Production **e** Preview.

**Obrigatórias (sem elas o app não sobe):**

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto de produção |
| `VITE_SUPABASE_ANON_KEY` | anon key do projeto de produção |

**Obrigatória para publicar as páginas legais sem aviso vermelho:**

| Variável | Valor |
|---|---|
| `VITE_CONTATO_PRIVACIDADE` | `buildealabs@gmail.com` |

Este é o **valor real do lançamento**, decidido por Luiz em 2026-08-08, e já está
no `.env.example`. Precisa existir no environment **Production** (e em Preview,
se for conferir lá) **antes do build**.

Sem ela, três telas publicadas ficam capengas ao mesmo tempo: `/privacidade` e
`/termos` mostram em vermelho "o canal de contato ainda não foi configurado
nesta publicação", e a tela "Apagar minha conta" deixa o usuário sem caminho de
exclusão. E como toda `VITE_*` é resolvida em **tempo de build**, preencher a
variável no painel depois do deploy **não conserta** — exige build novo. Nada
inventa um endereço no lugar: a ausência é declarada, não maquiada.

**Devem ficar AUSENTES ou VAZIAS no lançamento** (o padrão de todas é desligado;
não criar a variável já é o comportamento correto):

- `VITE_FEATURE_LIGAS` — Ligas/Campeonatos OFF
- `VITE_FEATURE_ASSINATURA` — Auê+ OFF
- `VITE_FEATURE_PUSH` — Push OFF
- `VITE_FEATURE_GRUPOS_AVANCADOS` — criação avançada de grupos OFF
- `VITE_FEED_DEMO` — **nunca** `1` em produção; ligada, uma falha de rede exibe
  posts fictícios
- `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_FEED` — anúncios inertes (ver seção 6)
- `VITE_VAPID_PUBLIC_KEY` — push desligado

Só `1` ou `true` ligam uma flag. Qualquer outro valor — vazio, `0`, `false`,
placeholder — mantém desligado (`src/shared/flags.ts`).

**Não coloque na Vercel** `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`,
`VAPID_SUBJECT` nem `PUSH_WEBHOOK_SECRET`. São segredos de Edge Function e vão em
Supabase → Edge Functions → Secrets.

**Build:** `vercel.json` já declara `framework: vite`, `buildCommand: npm run
build`, `outputDirectory: dist`, `cleanUrls` e os rewrites. Não precisa
configurar nada disso na interface.

Sobre os rewrites — a **ordem importa**, e o arquivo não aceita comentário:
`/privacidade` e `/termos` apontam para os `.html` próprios delas e vêm **antes**
do catch-all `/(.*) → /index.html`. Se alguém mover as duas para o fim, o
catch-all engole tudo e as páginas legais voltam a ser servidas com o `canonical`
da home — contradizendo o `sitemap.xml` e derrubando a indexação delas, sem
nenhum sintoma no build. `src/seo-publico.test.ts` trava essa ordem.

---

## 4. Verificação depois do primeiro deploy

Faça em Preview antes de promover.

### 4.1. `/d/:id` não pode dar 404

```
curl -I https://<dominio>/d/ABC123
```

Esperado: `200` e `content-type: text/html`. Se vier `404`, o `vercel.json` não
foi aplicado (confira se o arquivo está na raiz do projeto que a Vercel está
buildando).

Confira também que o rewrite **não** engoliu os arquivos estáticos — os três
abaixo têm que devolver o próprio arquivo, não o `index.html`:

```
curl -s https://<dominio>/robots.txt | head -3
curl -s https://<dominio>/sitemap.xml | head -3
curl -s https://<dominio>/manifest.webmanifest | head -3
```

E confira que as duas páginas legais são servidas pelo HTML **delas**, e não pelo
`index.html` do catch-all — é isso que faz o `canonical` parar de mentir:

```
curl -s https://<dominio>/privacidade | grep -i canonical
curl -s https://<dominio>/termos      | grep -i canonical
```

Esperado: `href="https://<dominio>/privacidade"` e `href="https://<dominio>/termos"`,
cada uma a sua. Se as duas devolverem o canonical da raiz, o rewrite não está
sendo aplicado na ordem certa (seção 3) e o `sitemap.xml` volta a declarar URLs
que o próprio HTML manda ignorar.

E no navegador: abra `https://<dominio>/d/ABC123` com um código inexistente — tem
que aparecer a tela "desafio não encontrado" dentro da moldura do app, com o
convite para gravar, e não um 404 da Vercel nem uma tela branca. Depois gere um
desafio de verdade e abra o link em aba anônima.

### 4.2. Prévia do link no WhatsApp

**Saiba o que esperar:** no corte de lançamento o Open Graph é **estático**. O
card vai mostrar o título, a descrição e a imagem do `index.html` — os mesmos
para qualquer `/d/:id`. Isso é o esperado, não é defeito. Nome e nota do
desafiante no card só com a seção 5.

> **Corrigido em 2026-08-08.** Este parágrafo dizia que não existia
> `og-image.png` e que a meta `og:image` tinha sido removida. As duas coisas
> deixaram de ser verdade: `public/og-image.png` existe (1200x630, gerado do
> símbolo oficial) e `index.html` declara `og:image`, `og:image:width`,
> `og:image:height` e `og:image:alt`. Quem executasse o texto antigo ao pé da
> letra removeria uma tag correta.

Como testar:
1. Mande o link `https://<dominio>/d/CODIGO` para você mesmo no WhatsApp (Web ou
   celular). O card tem que aparecer com título e descrição — não pode aparecer
   só a URL crua.
2. O WhatsApp **cacheia por URL**. Se editar as metas e testar de novo, use um
   código diferente ou acrescente `?v=2`.
3. Cheque também no Sharing Debugger do Facebook
   (`developers.facebook.com/tools/debug/`) e no Card Validator do X: eles
   mostram o que o crawler leu e permitem forçar nova raspagem.
4. Se o card não aparecer, confira `https://<dominio>/robots.txt` — o
   `facebookexternalhit` consulta o robots antes de raspar, e `/d/` está
   liberado explicitamente lá.

---

## 5. Open Graph dinâmico (pendente, fora do corte)

O que existe: `supabase/functions/og-preview/index.ts`, que gera título e
descrição por desafio. O que **não** existe: qualquer coisa chamando essa função.
O rewrite de crawler que existia no `vercel.json` foi **removido** de propósito.

Para ligar depois, na ordem (detalhes em
`docs/technical/deploy-vercel-e-og-dinamico.md`, seções 2 e 3):

1. **Corrigir o laço de recarga.** A função termina com
   `window.location.replace("/d/<id>")`, caminho **relativo**. Servida na própria
   URL `/d/:id` pelo rewrite, ela manda o cliente para a URL que acabou de gerar a
   página — recarga infinita para qualquer cliente que case com a regex de
   user-agent e execute JavaScript (Googlebot renderiza). Duas saídas possíveis
   estão escritas no doc técnico. **Nenhuma foi implementada.** Este item é
   pré-requisito, não opcional.
2. Descobrir o **ref do projeto** Supabase (é o subdomínio de
   `VITE_SUPABASE_URL`) — o rewrite antigo tinha o placeholder
   `SUPABASE_PROJECT_REF`, que apontaria para um host que não resolve.
3. `supabase functions deploy og-preview --no-verify-jwt`. O `--no-verify-jwt` é
   necessário: crawler não manda `Authorization` e receberia 401. **Não foi
   verificado se essa função está sequer deployada hoje.**
4. Confirmar que responde sem autenticação:
   `curl -A "facebookexternalhit/1.1" https://<ref>.supabase.co/functions/v1/og-preview?id=ABC123`
5. Recolocar o bloco de rewrite no `vercel.json` **antes** da regra de SPA, com o
   ref real.
6. `supabase/functions/og-preview/index.ts:110` tem `https://aue.app` fixo no
   `og:url`. Se o domínio for outro, corrija junto.

### Domínio de produção — CONFIRMADO

> **Corrigido em 2026-08-08.** Esta seção dizia que o domínio era uma suposição
> (`https://aue.app`) e mandava "reintroduzir `<link rel="canonical">` e
> `og:url` em `index.html`, que foram removidos". As duas tags **estão no
> arquivo** desde a confirmação do domínio. Seguir a instrução antiga seria
> reintroduzir o que já existe, ou pior, mexer no que está correto.

O domínio é `https://aue.vercel.app` e já está aplicado em `index.html`,
`privacidade.html`, `termos.html`, `public/robots.txt`, `public/sitemap.xml` e
`src/shared/desktop/enderecoPublico.ts` (que alimenta o QR Code da landing).
`src/seo-publico.test.ts` trava a coerência entre esses seis lugares — trocar o
domínio em um e esquecer os outros quebra o teste.

**O único lugar que o teste NÃO alcança** é a Edge Function:
`supabase/functions/og-preview/index.ts:110` ainda tem `https://aue.app` fixo no
`og:url`. Só importa quando a seção 5 for ligada, mas corrija junto.

---

## 6. AdSense — duas pendências, nenhuma é código

A colocação já está implementada no feed (após o 3º post) e **liga sozinha**
quando `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_FEED` forem preenchidas e o
build refeito. Enquanto vazias, nada do Google é carregado e o espaço nem é
renderizado. Não há mudança de código pendente.

Antes de preencher:

1. ~~Publicar política de privacidade e termos de uso.~~ **FEITO.** As duas
   existem em páginas públicas com URL própria: `/privacidade` e `/termos`,
   listadas no `sitemap.xml`, com `canonical` verdadeiro cada uma, linkadas do
   rodapé da landing de desktop e (a de privacidade) do aviso de uma linha da
   tela de gravação. São essas as duas URLs a colar no formulário do AdSense.
2. **Decidir o aviso de consentimento (LGPD).** Não há nenhum implementado. É
   decisão sua sobre o que coletar e como pedir; depois vira trabalho de código.
3. **Saiba o que muda no texto publicado.** A frase da política sobre anúncios é
   DERIVADA das variáveis (`src/features/legal/anunciosAtivos.ts`): com o
   cliente e um slot preenchidos, a política passa sozinha de "não exibe
   anúncios nesta versão" para a versão que admite o AdSense e os cookies do
   Google. `src/features/legal/coerenciaDeAnuncios.test.tsx` monta a tela de
   resultado de verdade e quebra se os dois lados discordarem — antes disso,
   preencher as variáveis publicava um documento legal mentindo, sem nada
   quebrar.

Só depois disso: preencher as duas variáveis, **rebuild + redeploy**, e conferir
no site publicado que o `<ins>` do AdSense aparece.

---

## 7. Push e Auê+ ficam OFF

**Push** (`VITE_FEATURE_PUSH` vazia). O código completo existe: Service Worker,
Edge Function `send-push`, tabela `push_subscriptions` e trigger de webhook. Falta
configuração. Para ligar depois:

1. `npx web-push generate-vapid-keys`.
2. Em Supabase → Edge Functions → Secrets: `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:…`) e `PUSH_WEBHOOK_SECRET`.
   Sem o `PUSH_WEBHOOK_SECRET` a função roda com service role e fica
   publicamente chamável.
3. `supabase functions deploy send-push`.
4. Configurar o Database Webhook que a migração `20260807000012` pressupõe.
5. Na Vercel: `VITE_VAPID_PUBLIC_KEY` = **exatamente** a mesma chave pública, e
   `VITE_FEATURE_PUSH=1`. Rebuild + redeploy.
6. Testar recebendo uma notificação de verdade num aparelho antes de anunciar.

Enquanto isso, os três interruptores de notificação não são renderizados. A
preferência já gravada em `profiles` continua no banco, intacta.

**Auê+** (`VITE_FEATURE_ASSINATURA` vazia). Não existe provedor de pagamento
integrado — nada seria cobrado. O item de menu, a tela de venda e o banner do
perfil não são montados. Para ligar depois é preciso, no mínimo: integrar
pagamento, decidir o que a assinatura de fato entrega (hoje só remove anúncio via
`is_premium`), e só então `VITE_FEATURE_ASSINATURA=1` + rebuild.

Aviso para ambas e para Ligas: **as strings continuam no bundle**. A flag é de
runtime, o bundler não elimina o ramo. Não são renderizadas, mas quem olhar o JS
as encontra.

**Ligas** (`VITE_FEATURE_LIGAS` vazia): não ligue antes de plugar a tela no banco.
`ChampionshipLobbyScreen.tsx` ainda exibe participantes e pódio escritos à mão no
código (Carol 98.1, Bruno, Julia). A função `getChampionshipLobby` existe em
`src/db/supabase.ts` e a tela não a usa.

---

## 8. O que continua sem prova

Não confunda "escrito" com "testado". Nada abaixo foi verificado por ninguém:

- **Todo o SQL da faixa 000015–000026.** Nunca aplicado, nunca parseado. É o
  maior risco do lançamento e é o motivo de a seção 1 existir.
- **Todos os scripts de `supabase/rollback/`.** Nunca executados.
- **O app rodando em navegador.** Nenhum agente abriu. Sem verificação: layout
  da Home em tela pequena, rolagem do feed sob a barra fixa (`height: 100dvh` foi
  aplicado por leitura de spec, não observado no Safari iOS), o fluxo
  Home → "Gravar meu Auê" → permissão de microfone, e a aparência do
  ChallengeView.
- **Instalabilidade do PWA.** A arte existe (ver abaixo) e o manifest declara
  `favicon.svg` + PNG 192, PNG 512 e um 512 `maskable`. O que continua **sem
  prova** é o comportamento: ninguém abriu num Android real para ver se o Chrome
  oferece a instalação, nem num iPhone para ver o ícone na tela de início. PWA
  está anunciado como ON no corte — confirme nos dois antes de anunciar.

> **Corrigido em 2026-08-08.** Os três itens abaixo diziam que **não existia
> nenhum PNG em `public/`**, que faltava devolver os ícones ao `vite.config.ts`
> e a meta `og:image` ao `index.html`, e que o `favicon.svg` era um raio roxo.
> Nada disso vale mais. Quem executasse esta lista ao pé da letra desfaria o que
> está certo.

- **Arte: EXISTE.** `public/og-image.png` (1200x630), `public/pwa-192x192.png`,
  `public/pwa-512x512.png` e `public/pwa-maskable-512x512.png`, todos gerados a
  partir do símbolo oficial em `docs/design_system/`. Os quatro já estão
  declarados no `vite.config.ts` e no `index.html`.
- **`public/apple-touch-icon.png` (180x180)** entrou depois, e é o que faz o
  "Adicionar à Tela de Início" do iPhone produzir o símbolo do Auê em vez de uma
  miniatura genérica da página — gesto que a landing de desktop ensina. Vem com
  as metas `apple-mobile-web-app-*` nas três entradas HTML.
- **O `favicon.svg` é a marca**, não mais o raio roxo `#863bff` herdado de outro
  projeto.
- **A Edge Function `og-preview` estar deployada** no projeto de produção, e se
  exige JWT.
- **O domínio de produção.** `aue.app` foi assumido, nunca confirmado.
- **Os testes automatizados não cobrem comportamento.** São 38: a fórmula de score
  e 6 smoke tests que renderizam o primeiro quadro das telas por
  `renderToStaticMarkup` (sem DOM, sem efeito, sem clique). Eles guardam o corte
  — garantem que Auê+, Ligas e os dados de protótipo não voltem à tela — e nada
  além disso.
