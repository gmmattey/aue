# Deploy na Vercel, rota /d/:id e Open Graph dinâmico

Escopo deste documento: `vercel.json`, `index.html`, `public/robots.txt`,
`public/sitemap.xml`. Não cobre variáveis de aplicação (ver `.env.example`) nem
banco.

## 1. O que `vercel.json` resolve

O app é uma SPA Vite: o roteamento de `/d/:id` acontece no cliente
(`src/App.tsx`). Sem rewrite, a Vercel procura o arquivo `/d/ABC123` no
`dist/`, não acha e devolve **404** — o link de desafio, que é o mecanismo de
distribuição do produto, morre antes do React montar.

`vercel.json` tem **uma** regra: `/(.*)` → `/index.html` (SPA).

Assets, `/sitemap.xml`, `/robots.txt`, `/sw.js`, `/manifest.webmanifest` e
`/assets/*` **não** são engolidos por ela: na ordem de roteamento da Vercel a
checagem de sistema de arquivos acontece **antes** dos `rewrites`. Qualquer
caminho que exista em `dist/` é servido como arquivo. Por isso não há regra de
exclusão explícita — ela seria redundante e mais fácil de errar.

## 2. O rewrite de crawler foi REMOVIDO (e por quê)

Existiu aqui um segundo rewrite, antes do de SPA, que desviava `/d/:id` para a
Edge Function `og-preview` quando o user-agent fosse de crawler de link. Ele
**saiu**. O card do desafio no lançamento é o card estático de `index.html`.

Três motivos, dois deles bloqueantes:

1. **Placeholder no destino.** O valor era
   `https://SUPABASE_PROJECT_REF.supabase.co/functions/v1/og-preview?id=:id`.
   Não existe nenhum ref real em arquivo versionado do repositório e nenhum foi
   inventado. Um host que não resolve faz a Vercel devolver erro de proxy: o
   link compartilhado sairia **sem card nenhum**, pior que o card estático.
2. **Laço de recarga.** A função termina com
   `window.location.replace("/d/<id>")` (`og-preview/index.ts:96` e `:123`).
   Esse caminho é **relativo à origem**. Servida no domínio do Supabase, ela
   mandava o visitante para o app; servida **na própria URL `/d/:id`** pelo
   rewrite, ela manda para a URL que acabou de gerar aquela página. Qualquer
   cliente que case com a regex de user-agent **e execute JavaScript** —
   Googlebot renderiza; UAs com `Telegram`, `WhatsApp`, `Pinterest`, `Mastodon`
   também casam — entra em recarga infinita. Não foi observado em runtime (não
   há deploy); é leitura do código dos dois lados.
3. **Verificação de JWT.** Edge Function do Supabase exige `Authorization` por
   padrão. Crawler não manda. Sem `--no-verify-jwt` no deploy, o crawler
   receberia um 401 em JSON. Não foi possível verificar se a função está
   sequer publicada.

A função foi apagada em 13/08, do repositório e do ar. O porquê está no
[ADR 0003](adr/0003-a-previa-do-link.md) §10.

## 3. Como ligar o Open Graph dinâmico depois (checklist)

> **ESTE CHECKLIST ESTÁ MORTO. NÃO SIGA.**
>
> Ele foi escrito antes de alguém tentar, e a tentativa aconteceu: o gateway do
> domínio compartilhado do Supabase **não deixa Edge Function servir HTML**.
> Força `text/plain` e um CSP `sandbox`, então o robô não lê a prévia e quem
> clica não chega no jogo. Testado duas vezes, em 11/08 e 13/08.
>
> A [#143](https://github.com/gmmattey/aue/issues/143) fechou aceitando o cartão
> estático, e a nota viaja como imagem pela
> [#151](https://github.com/gmmattey/aue/issues/151). O caminho inteiro está no
> [ADR 0003](adr/0003-a-previa-do-link.md) §10 — **leia antes de tentar de
> novo.** Os arquivos citados abaixo não existem mais.
>
> Fica aqui como registro do que se pensava, não como instrução.

Pré-requisito: resolver o item 2 abaixo. Ligar o rewrite sem ele **quebra** a
navegação para parte dos clientes.

1. Descobrir o ref do projeto Supabase (painel → Project Settings → General,
   ou o subdomínio de `VITE_SUPABASE_URL`).
2. **Corrigir o laço de redirecionamento**, escolhendo uma das duas saídas:
   - editar `supabase/functions/og-preview/index.ts` para não emitir o
     `window.location.replace` quando a função já está sendo servida no
     caminho `/d/<id>` (comparar com `new URL(req.url).pathname`); **ou**
   - marcar a volta com um parâmetro e excluí-la do rewrite, usando o campo
     `missing` da Vercel:
     `"missing": [{ "type": "query", "key": "app" }]` na regra, e
     `window.location.replace("/d/<id>?app=1")` na função. A segunda
     requisição deixa de casar e cai no SPA.
   Nenhuma das duas foi implementada nem testada.
3. Recolocar o bloco de rewrite (com o ref real) **antes** da regra de SPA:
   ```json
   {
     "source": "/d/:id",
     "has": [{ "type": "header", "key": "user-agent", "value": ".*(facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|Discordbot|Slackbot|LinkedInBot|Googlebot|bingbot|Applebot).*" }],
     "destination": "https://<ref>.supabase.co/functions/v1/og-preview?id=:id"
   }
   ```
4. Fazer o deploy da Edge Function: `supabase functions deploy og-preview`.
   **Não verificado**: se a função já está deployada no projeto de produção.
   O código existir no repositório não garante que esteja no ar.
5. A função precisa ser **pública** (sem verificação de JWT). Crawler não manda
   `Authorization`. Se o projeto estiver com `verify_jwt` ligado por padrão, o
   deploy tem que ser `--no-verify-jwt`. Confirmar respondendo 200 a
   `curl -A "facebookexternalhit/1.1" https://<ref>.supabase.co/functions/v1/og-preview?id=ABC123`
   **sem** cabeçalho de autorização.
6. `SUPABASE_URL` e `SUPABASE_ANON_KEY` são injetadas automaticamente em
   funções hospedadas no Supabase; a função degrada para card genérico se
   faltarem (ver `supabase/functions/og-preview/index.ts:51`).
7. Confirmar o domínio de produção (ver seção 4).
8. Testar com user-agent de crawler:
   `curl -A "facebookexternalhit/1.1" https://<dominio>/d/ABC123 | head -40`
   Deve vir o HTML da função. Sem `-A`, deve vir o `index.html` da SPA. Testar
   também com `-A "Googlebot/2.1"` e conferir que **não** há laço.

Limitações que continuam valendo quando isso for ligado: detecção por
user-agent não é infalível (bot novo cai no SPA e mostra o card estático — que
degrada bem); a regex de `has.value` na Vercel é case-sensitive; e a função
**não gera imagem**, o card sai só com título e descrição.

## 4. PENDÊNCIA — domínio de produção não confirmado

Todo o SEO deste repositório assumia `https://aue.app`. O domínio **não foi
confirmado** por ninguém.

Onde isso está hoje:

- `public/robots.txt` (linha `Sitemap:`) e `public/sitemap.xml` — **ainda com
  `aue.app`**. Exigem URL absoluta; sitemap com host errado é simplesmente
  ignorado pelo buscador, dano baixo.
- `supabase/functions/og-preview/index.ts:110` — `og:url` gerado com
  `https://aue.app` fixo no código. Inerte enquanto a função não estiver
  roteada.
- `index.html` — o `<link rel="canonical">` e o `og:url` foram **removidos**.
  Canonical apontando para um domínio que não é o publicado é o pior caso de
  SEO possível: instrui o buscador a não indexar a URL real. Sem a tag, cada
  URL é canônica de si mesma, que é o comportamento correto enquanto o domínio
  for desconhecido.

Confirmado o domínio, reintroduzir `canonical` e `og:url` em `index.html` (o
lugar está comentado no arquivo) e alinhar os outros três pontos.

## 5. Pendência de arte (não é código)

Nenhum PNG existe em `public/` — só `favicon.svg` e `icons.svg` (conferido).
Isso afeta três coisas:

- `og:image` foi **removido** de `index.html` porque apontava para
  `/pwa-512x512.png`, inexistente. Card social sai sem imagem.
- O manifest do PWA declarava `pwa-192x192.png` e `pwa-512x512.png`, que não
  existem. **Já corrigido**: as duas entradas saíram do `vite.config.ts` e
  ficou só `favicon.svg`, que existe de verdade — ícone declarado que responde
  404 não torna o app instalável e ainda faz o navegador registrar erro. NÃO
  foi verificado em navegador se o SVG sozinho basta para o Chrome oferecer a
  instalação; trate como não verificado até alguém abrir o app e conferir.
- Recomendação: `public/og-image.png` (1200x630), `public/pwa-192x192.png` e
  `public/pwa-512x512.png`. Quando existirem, devolver os dois PNG à lista de
  `icons` em `vite.config.ts` (o 512 também com `purpose: 'maskable'`) e
  reintroduzir a meta `og:image` em `index.html`, onde o lugar está comentado.

## 5.1. Manifest do PWA — o que mudou junto

Além dos ícones, no mesmo bloco: `name` era `Auê App` e `description` era
`Auê Judgement Engine MVP` (nome interno do motor e a palavra "MVP" indo para
a tela de instalação); `theme_color` era `#ffffff` num app de fundo escuro;
`lang` saía `en` por padrão. Agora saem `Auê!`, a descrição do corte,
`#0a0a08` (mesmo valor de `--bg`) e `pt-BR`.

O `share_target` foi **removido**. Ele anunciava o app ao sistema operacional
como destino de compartilhamento de áudio e fazia `POST /import-audio`, rota
que não existe no roteador. Com o rewrite de SPA, esse POST passaria a cair no
`index.html` em vez de dar 404 — o usuário compartilharia um áudio e o app
abriria sem nada acontecer. Para reativar, é preciso antes criar a rota e o
handler que lê o `FormData`.

## 6. Sitemap e robots

`sitemap.xml` passou a listar só `https://aue.app/`. As entradas anteriores
(`/comunidade`, `/grupos`, `/campeonatos`) não são rotas — caíam no catch-all
e devolviam a home. `/campeonatos` ainda por cima aponta para a feature que
sai OFF por flag no lançamento.

`robots.txt` libera `/d/` explicitamente: o `facebookexternalhit` consulta
`robots.txt` antes de raspar o card, então bloquear `/d/` mataria a prévia.

Os dois arquivos ainda dizem `aue.app`. Ver seção 4.

## 7. Pendências de conformidade (decisão do Luiz, não é código)

Não existe em lugar nenhum do app link para **política de privacidade** ou
**termos de uso**. O app autentica com Google, captura microfone e tem espaço
de anúncio preparado (`AdBanner`). Publicar assim é
problema de conformidade, e a aprovação do AdSense depois vai exigir a página.

Não foi criada aqui: seria conteúdo jurídico inventado. Precisa do texto do
Luiz. Depois de existir, o link natural é em Configurações, junto de "Apagar
conta".

## 8. PWA — o que falta verificar

O manifest gerado (`dist/manifest.webmanifest`) declara **um** ícone:
`favicon.svg` com `sizes: "any"`, sem PNG 192/512 e sem `purpose: "maskable"`.
Trocar PNG inexistente por SVG existente foi a decisão certa (ícone 404 é
pior), mas **não foi verificado em navegador** se o Chrome considera o app
instalável só com isso. PWA está na lista de features ON do lançamento: antes
de anunciar, abrir em um Android real e confirmar que a instalação é oferecida.
Se não for, ou a arte entra (seção 5) ou o PWA sai do anúncio.
