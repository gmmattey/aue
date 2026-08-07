# Auê MVP 🎙️💨

**Auê** é uma rede social irreverente, focada em avaliação, gamificação e competição de arrotos. A plataforma permite que os usuários gravem seus desempenhos, recebam notas da engine de avaliação, desafiem amigos e participem de comunidades e campeonatos em tempo real.

## 🌟 Principais Funcionalidades

- **Motor de Avaliação (Judgement Engine):** Análise acústica baseada em algoritmos que medem Potência, Profundidade, Duração e Textura, calculando um Score (0 a 100). A análise do áudio roda no navegador; o **score final, a classificação e o resultado dos duelos são recalculados no servidor** (RPC `submit_resultado` e trigger `on_desafio_set_winner`), e o cliente não consegue gravar um score arbitrário.
- **Gamificação e Níveis:** Cada resultado válido concede XP. Acumule XP para subir de nível e ganhar títulos (ex: "Iniciante do Gás", "Deus do Auê").
- **Desafios:** Envie desafios 1x1 diretos para amigos superarem seu resultado.
- **Comunidade (Feed):** Timeline global de resultados onde os usuários podem curtir, descurtir e comentar as performances da galera.
- **Ranking Global:** Top 50 por melhor score. **Só entram usuários autenticados** — resultados anônimos aparecem no feed e podem virar desafio, mas não disputam o ranking. A submissão anônima não tem identidade nem limite verificável, então deixá-la no ranking significava entregar o top 50 a quem quisesse forjar parciais (ver `supabase/migrations/20260807000015_global_ranking_authenticated_only.sql`).
- **Grupos e Campeonatos:** Crie ou junte-se a "panelinhas" (grupos) e lute pela liderança no ranking dos Campeonatos organizados pela comunidade.
- **Notificações Push Nativas (PWA):** ⚠️ *Implementado, porém ainda **não operacional**: depende de configuração manual (veja "Notificações Push" em Próximos Passos).* O código completo existe — Service Worker, Edge Function `send-push` e triggers de banco —, mas sem as chaves VAPID e os segredos do webhook a feature aparece explicitamente desabilitada na interface.
- **Monetização Embutida:** Integração nativa com blocos do Google AdSense pronta no front-end.

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

### `vitest` ainda não está instalado

O `vitest` está declarado em `devDependencies` (`^4.1.10`), mas **não está em
`node_modules`**: o `npm install` que o traria depende de autorização e ainda
não foi rodado. Até lá, `npx vitest run` funciona resolvendo pelo cache do
`npx`. Duas consequências de propósito:

- `vitest.config.ts` exporta um **objeto cru** em vez de usar `defineConfig`
  de `vitest/config` — o import quebraria o startup com `ERR_MODULE_NOT_FOUND`,
  porque o Vitest resolve a config a partir da raiz do projeto.
- os arquivos de teste ficam **fora** do `tsconfig.app.json` e são checados por
  `tsconfig.test.json`, que **não** está em `references`. Se estivesse,
  `npm run typecheck` falharia com `Cannot find module 'vitest'`.

Depois do `npm install`, rode `npx tsc -p tsconfig.test.json` para checar os
testes e, se quiser, ligue as duas coisas acima (há instruções nos comentários
de cada arquivo).

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

`supabase/rollback/` tem um script de desfazimento manual para cada uma das
migrações `20260807000010`, `000011`, `000012`, `000015` e `000016`.

Eles ficam **fora** de `supabase/migrations/` de propósito, para que
`supabase db push` nunca os aplique sozinho. São de **emergência**: rodam um por
vez, na ordem inversa da numeração, com role de owner. **Não recuperam dados
criados no intervalo** — e o rollback da `000011` apaga de vez as colunas
`desafios.winner` / `resolved_at`. Leia `supabase/rollback/README.md` antes.

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

### Outros

- **Migrações pendentes de aplicação:** `20260807000015` (ranking só de
  autenticados + `security_invoker` na view) e `20260807000016` (INSERT em
  `desafios` exige ser dono do `challenger_result_id`) foram escritas mas
  **não** aplicadas em nenhum ambiente. Aplique em staging primeiro e confira o
  ranking e o fluxo de criar/responder desafio, logado e deslogado.
- **Advisors do Supabase:** depois de aplicar a `000015`, rode os advisors de
  segurança e confirme que o alerta *"Security Definer View"* sobre
  `public.global_ranking` sumiu.
- **AdSense:** Atualize o script do `index.html` e os blocos de componentes `<AdBanner />` com a sua key comercial aprovada pelo Google.

---
*Auê — Porque toda grande performance merece ser ouvida e avaliada.*
