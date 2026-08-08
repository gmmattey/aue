# Auê MVP 🎙️💨

**Auê** é uma rede social irreverente, focada em avaliação, gamificação e competição de arrotos. A plataforma permite que os usuários gravem seus desempenhos, recebam notas da engine de avaliação, desafiem amigos e participem de comunidades e campeonatos em tempo real.

## 🌟 Principais Funcionalidades

- **Motor de Avaliação (Judgement Engine):** Análise acústica baseada em algoritmos que medem Potência, Profundidade, Duração e Textura, calculando um Score (0 a 100). A análise do áudio roda no navegador; o **score final, a classificação e o resultado dos duelos são recalculados no servidor** (RPC `submit_resultado` e trigger `on_desafio_set_winner`), e o cliente não consegue gravar um score arbitrário.
- **Gamificação e Níveis:** Cada resultado válido concede XP. Acumule XP para subir de nível e ganhar títulos (ex: "Iniciante do Gás", "Deus do Auê").
- **Desafios:** Envie desafios 1x1 diretos para amigos superarem seu resultado.
- **Comunidade (Feed):** Timeline de posts (arrotos e links de rede social) com filtro por tópico. Falha ao carregar vira **estado de erro com "Tentar de novo"** — nunca conteúdo fictício disfarçado de real (posts de demonstração só aparecem com `VITE_FEED_DEMO=1` e sempre com aviso na tela). **Curtir funciona** — uma curtida por pessoa por post, alternável, garantida pelo servidor (RPC `toggle_reacao`); quem não está logado vê a contagem mas não reage. **Comentar funciona** — folha de comentários por post (RPCs `listar_comentarios` e `criar_comentario`), com apagar o próprio comentário; quem não está logado lê mas não escreve. *Descurtir* existe no schema e na RPC `toggle_reacao`, mas ainda não tem botão.
- **Ranking Global:** Top 50 por melhor score, identificado pelo **apelido do perfil** para quem está logado (o servidor ignora qualquer nome enviado pelo cliente) e pelo nome digitado para quem grava sem conta. **Só entram usuários autenticados** — resultados anônimos aparecem no feed e podem virar desafio, mas não disputam o ranking. A submissão anônima não tem identidade nem limite verificável, então deixá-la no ranking significava entregar o top 50 a quem quisesse forjar parciais (ver `supabase/migrations/20260807000015_global_ranking_authenticated_only.sql`).
- **Grupos e Campeonatos:** Crie ou junte-se a "panelinhas" (grupos) e lute pela liderança no ranking dos Campeonatos organizados pela comunidade.
- **Notificações Push Nativas (PWA):** ⚠️ *Implementado, porém ainda **não operacional**: depende de configuração manual (veja "Notificações Push" em Próximos Passos).* O código completo existe — Service Worker, Edge Function `send-push` e triggers de banco —, mas sem as chaves VAPID e os segredos do webhook a feature aparece explicitamente desabilitada na interface.
- **Monetização (AdSense):** colocação **implementada e inerte**. O anúncio in-feed já está posicionado (após o 3º post) e assinantes não o veem. Enquanto `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_FEED` estiverem vazios, o script do Google não é carregado em nenhuma visita e o espaço nem é renderizado em produção. Ligar = preencher as duas variáveis e refazer o build; ver "Próximos Passos".

## 🛠️ Stack Tecnológica

O projeto foi arquitetado com tecnologias modernas para garantir rapidez, responsividade e escalabilidade:

- **Frontend:** React 19 + TypeScript
- **Build & Bundler:** Vite (com suporte a PWA via `vite-plugin-pwa`)
- **Backend & Database:** Supabase (PostgreSQL) com forte uso de RLS (Row Level Security) e Edge Functions (Deno) para orquestração de Notificações Push.
- **Autenticação:** Supabase Auth com suporte a Social Logins (Google, TikTok, X).
- **SEO & Otimização:** O App já está indexado e otimizado com meta tags sociais, Open Graph, `robots.txt` e `sitemap.xml`.

## 🚀 Como Rodar o Projeto

1. Clone o repositório.
2. Certifique-se de ter as migrações SQL aplicadas no seu Supabase (pasta `supabase/migrations/`).
3. Crie e preencha o arquivo `.env` (baseando-se no `.env.example`).
4. Instale as dependências:
   ```bash
   npm install
   ```
5. Rode o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## ✅ Verificação

```bash
npm run typecheck   # tsc -b
npm run lint        # oxlint
npm run test        # vitest run
npm run build       # tsc -b && vite build
```

### `vitest` está instalado — as ressalvas antigas caíram

O `vitest` (`^4.1.10`) está em `node_modules` desde o commit `e0f2655`. As duas
gambiarras que existiam por causa da ausência dele foram desfeitas:

- `vitest.config.ts` voltou a usar `defineConfig` de `vitest/config`, com
  checagem de tipo das opções.
- `npm run typecheck` agora roda `tsc -b && tsc -p tsconfig.test.json`, ou seja,
  **passou a cobrir os arquivos de teste**, que antes não eram checados por
  ninguém. O `tsconfig.test.json` continua fora de `references` de propósito:
  entrar na solução raiz exigiria tornar o `tsconfig.app.json` composite e
  habilitar emit nele.

### O que os testes cobrem — e o que não cobrem

`src/features/audio/rules.formula.test.ts` trava a fórmula `aue-score-v1`, que
vive duplicada em TypeScript (`src/features/audio/rules.ts`) e em SQL
(`supabase/migrations/20260807000011_...sql`). Mudar um peso só de um lado faz
a constraint `resultados_score_coherent` rejeitar **toda** gravação — falha em
produção e silenciosa em dev. O teste tem vetores fixos com resultado escrito
na mão, extrai os pesos do TS por sondagem comportamental e os pesos/faixas do
SQL **lendo o arquivo da migração**, e compara os dois lados.

**Não cobre o banco.** A comparação é entre dois ARQUIVOS versionados. Se a
migração 000011 nunca foi aplicada, ou se alguém redefinir `aue_score_v1`
direto no Postgres, o teste continua verde e o banco está diferente.

### Nenhum SQL deste repositório foi validado por parser

Não há Postgres, Docker, `psql`, Deno nem Supabase CLI neste ambiente de
desenvolvimento, e a decisão foi não subir um banco local. Portanto **todas as
migrações e todos os scripts de rollback foram escritos e revisados apenas por
leitura** — nenhum passou por um parser de SQL, muito menos foi executado.
Aplique sempre com `BEGIN` / `ROLLBACK` primeiro. O mesmo vale para as Edge
Functions: sem Deno, elas só passaram por revisão manual e por uma checagem
parcial de tipos com `tsc` usando shims para `Deno` e para os imports remotos.

## 🧯 Rollback de migrações

`supabase/rollback/` tem um script de desfazimento manual para as migrações
`20260807000010`, `000011`, `000012`, `000015` (ranking), `000016`, `000023`,
`000024`, `000025` e `000026`.

**Cobertura incompleta, e isso é conhecido:** as migrações `000013`, `000014`,
`000017`, `000018`, `000019`, `000020`, `000021` e `000022` **não têm** script
de rollback. Escrevê-los é trabalho pendente; até lá, o caminho de volta dessas
oito é `pg_dump` antes de aplicar.

Eles ficam **fora** de `supabase/migrations/` de propósito, para que
`supabase db push` nunca os aplique sozinho. São de **emergência**: rodam um por
vez, na ordem inversa da numeração, com role de owner. **Não recuperam dados
criados no intervalo** — e o rollback da `000011` apaga de vez as colunas
`desafios.winner` / `resolved_at`. Leia `supabase/rollback/README.md` antes.

## 📚 Sobre a pasta `docs/`

Dois documentos descrevem um sistema que **não é o que foi construído**, e
receberam aviso no topo (2026-08-07):

- `docs/schema/banco_de_dados.md` — descreve nove tabelas das quais só duas
  existem. A fonte de verdade do schema é `supabase/migrations/`.
- `docs/technical/arquitetura.md` — descreve persistência local com IndexedDB e
  offline-first que não existe no código.

Os demais (`especificacao_funcional.md`, `especificacao_ux_ui.md`,
`auditoria_de_mercado.md`) são documentos de projeto e é legítimo que descrevam
intenção em vez de implementação — não foram marcados.

Nenhum foi apagado: a decisão de descartar ou reescrever é de Luiz. Enquanto
isso, o aviso impede que alguém leia os dois primeiros como verdade atual.

## 📈 Próximos Passos e Deploy

### Notificações Push — pendente de configuração manual
A feature **não funciona até que os passos abaixo sejam executados**. Enquanto isso, o botão de notificações fica desabilitado com aviso explícito na interface.

1. Gere o par de chaves VAPID:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. **Frontend:** coloque a chave pública em `VITE_VAPID_PUBLIC_KEY` no `.env`.
3. **Edge Function:** defina os secrets `VAPID_SUBJECT` (ex.: `mailto:seu@email.com`), `VAPID_PUBLIC_KEY` (a mesma do item 2), `VAPID_PRIVATE_KEY` e `PUSH_WEBHOOK_SECRET`. A função usa a service role key e só aceita chamadas que enviem `PUSH_WEBHOOK_SECRET` no header `x-webhook-secret`.
4. **Deploy** da Edge Function `send-push`.
5. **Gatilho no banco:** a migração `20260807000012_push_notification_webhook.sql` já cria os triggers (`comentarios` INSERT e `desafios` UPDATE), mas eles leem a URL e o segredo do Supabase Vault. Registre os dois segredos uma única vez:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-push', 'push_webhook_url');
   select vault.create_secret('<mesmo valor de PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
   ```
   Sem esses segredos o trigger é um no-op (apenas um WARNING no log) e nada quebra. O trigger só é criado se a extensão `pg_net` estiver instalada; alternativamente, configure Database Webhooks equivalentes pelo painel do Supabase.

### Assinatura e exclusão de conta — declarados indisponíveis, não fingidos

Duas ações em Configurações **anunciavam sucesso sem fazer nada**: o botão de
assinar respondia `alert('Integração de pagamento pronta!')`, e o de apagar a
conta respondia `alert('Solicitação de exclusão processada.')` sem apagar coisa
alguma — enquanto a tela afirmava que o perfil, o histórico e as conquistas
seriam removidos para sempre.

Correção interina aplicada: os dois dizem a verdade agora.

- **Assinatura** — botão desabilitado, "Assinatura em breve", com aviso de que
  nada será cobrado. Ao integrar o pagamento, trocar por handler real.
- **Exclusão de conta** — a tela informa que a exclusão automática não existe e
  oferece o endereço de `VITE_CONTATO_PRIVACIDADE` para o pedido manual. Sem a
  variável, nenhum endereço é inventado. **Preencher essa variável é o mínimo
  para não deixar o usuário sem caminho de eliminação.** A exclusão de verdade
  exige Edge Function com service role (o cliente não apaga `auth.users`) e uma
  decisão sobre cascata: resultados anônimos permanecem? o ranking muda?

Ainda pendente na mesma tela: os três interruptores de notificação são estado
local puro. As colunas `notify_challenges`, `notify_ranking` e
`notify_community` existem em `profiles` e `updateProfile` já as aceita, mas a
tela não lê nem grava — a escolha se perde ao recarregar.

### Outros

- **Migrações pendentes de aplicação:** da `20260807000015` (ranking só de
  autenticados) em diante, **nada foi aplicado em nenhum ambiente** — inclui
  `000016` a `000026`. Aplique em staging primeiro, uma por vez, e confira o
  ranking, o acúmulo de XP e o fluxo de criar/responder desafio, logado e
  deslogado.
- **Selo de fundador — as 500 primeiras vagas:** a `20260807000024` troca o
  "todo mundo é fundador" por um corte de contagem. A regra vive só em
  `public.aue_vaga_de_fundador_disponivel()`; para mudar o número, edite
  aquela função e nada mais. Perfis existentes não são alterados — confira
  quantas vagas já estão ocupadas com
  `SELECT count(*) FROM public.profiles WHERE is_founder;` antes de anunciar a
  campanha.
- **Colisão de numeração resolvida:** existiam dois arquivos `20260807000015`.
  O de fundador virou `20260807000022_founder_status.sql`. Antes de aplicar em
  um ambiente que já rodou a versão antiga, confira o que está registrado —
  há a consulta pronta no cabeçalho daquele arquivo.
- **Verificação obrigatória do XP:** a migração `20260807000023` conserta uma
  regressão que deixava o XP sem acumular. Depois de aplicar, grave um
  resultado com usuário logado e confirme que `profiles.xp_total` **aumentou**.
  Se não aumentar, o trigger `on_profile_update` está com uma definição antiga
  de `protect_profile_stats()`.
- **Advisors do Supabase:** depois de aplicar, rode os advisors de segurança e
  confirme que sumiram o alerta *"Security Definer View"* sobre
  `public.global_ranking` e os de *"Function Search Path Mutable"*.
- **AdSense — colocação pronta, inerte até a liberação do Google.** A posição
  já existe no feed (após o 3º post, `FeedScreen`) e o assinante não a vê. Sem
  as variáveis de ambiente, nada é carregado e, em produção, o espaço nem é
  renderizado. Para ligar depois da aprovação basta preencher
  `VITE_ADSENSE_CLIENT` e `VITE_ADSENSE_SLOT_FEED` — **e refazer o build**:
  variável `VITE_*` é resolvida em tempo de compilação, então mudar só o painel
  da hospedagem não surte efeito. Antes de ligar ainda faltam duas coisas que
  não são código: **publicar uma política de privacidade** (o Google exige para
  aprovar a conta) e **decidir o aviso de consentimento** (LGPD) — não há
  nenhum implementado.

---
*Auê — Porque toda grande performance merece ser ouvida e avaliada.*
