# Hospedagem no Firebase, e os dois endereços convivendo

Escopo: `firebase.json`, `.firebaserc` e o procedimento de publicar. Não cobre
banco, autenticação nem variáveis de aplicação (essas estão no `.env.example`).

Issue: [#137](https://github.com/gmmattey/aue/issues/137).

## 1. A decisão: os dois no ar ao mesmo tempo

O Auê passa a responder em **`https://aue.web.app`** (Firebase Hosting, projeto
`aue-game`, site `aue`) **sem desligar `https://aue.vercel.app`**.

Decisão do Luiz em 10/08: mantém os dois, e só depois que o Firebase estabilizar
o Vercel sai. O motivo é simples — endereço que alguém já mandou no zap não é
nosso pra matar de um dia pro outro.

Os dois servem **o mesmo build, o mesmo Supabase, o mesmo jogo**. Não existe
"versão do Firebase" e "versão do Vercel". Se um dia existir, alguém errou.

## 2. Por que o endereço canônico NÃO mudou junto

`ORIGEM_CANONICA` (`src/shared/enderecoPublico.ts`) continua sendo
`https://aue.vercel.app` nesta fatia. De propósito.

Endereço canônico é o que o site declara ao buscador como "o de verdade", e ele
aparece em cinco lugares travados por `src/seo-publico.test.ts`. Apontar o
canônico para um endereço antes de ele estar validado é o pior caso possível de
SEO: manda o buscador desindexar a URL que está de pé e indexar uma que talvez
não responda.

Enquanto os dois convivem, o de produção é o Vercel — então ele é o canônico.

**A virada do canônico é a fatia 2**, junto com a desativação do Vercel. O que
ela envolve está no §5.

Isso não atrapalha ninguém jogando: `origemDoJogo()`
(`src/plataforma/web/enderecoDoJogo.ts`) monta o link de desafio a partir da
origem de onde o jogo está rodando, não da constante. Batalha criada no
`aue.web.app` gera link do `aue.web.app`, e a briga fica inteira no mesmo lugar.

## 3. O que o `firebase.json` faz, e por quê

O app é uma SPA: `/d/:id` e `/b/:code` são roteados no cliente
(`src/App.tsx`). Sem regra de reescrita, o Hosting procura o arquivo `/d/ABC123`,
não acha e devolve **404** — e o link de desafio, que é o mecanismo de
distribuição do produto, morre antes do React montar. O 404 aparece do outro
lado, no telefone de outra pessoa, onde ninguém está olhando.

As regras espelham o `vercel.json` e nada além:

- `/privacidade`, `/termos` e `/como-jogar` servem os HTML estáticos que o
  `vite.config.ts` gera como entradas próprias;
- `**` cai no `index.html`.

Arquivo que existe em `dist/` é servido como arquivo: o Firebase procura no
sistema de arquivos **antes** de aplicar reescrita, igual à Vercel. Por isso não
há regra de exclusão para `sw.js`, `manifest.webmanifest`, `robots.txt`,
`sitemap.xml`, `ads.txt`, `og-image.png` e `assets/*` — ela seria redundante e
mais fácil de errar.

**Isso é leitura da documentação dos dois provedores, não observação.** Confira
na primeira publicação: já mordeu antes, quando `/favicon.ico` respondia HTML
disfarçado de ícone (commit `422e5ee`).

### Os cabeçalhos de cache

`sw.js`, `push-sw.js` e `manifest.webmanifest` saem com `Cache-Control:
no-cache`. Sem isso o Hosting serve com cache de uma hora por padrão, e o service
worker antigo continua no ar depois de uma publicação — o app fica preso numa
versão velha e ninguém entende por quê. Os arquivos de `assets/*` têm hash no
nome e não precisam disso.

## 4. Como publicar

**Antes de qualquer coisa: as variáveis.** `VITE_*` é lida em **tempo de
build**, não em runtime. Um build sem elas gera um jogo que abre bonito e não
fala com backend nenhum, e configurar depois no painel **não conserta** — exige
build novo.

O mínimo que precisa existir num `.env` local (ou no ambiente do CI) antes de
rodar `npm run build`:

| Variável | O que quebra sem ela |
|---|---|
| `VITE_SUPABASE_URL` | O jogo não fala com o banco. Nada de gravar, dar nota ou criar batalha. |
| `VITE_SUPABASE_ANON_KEY` | Idem. |
| `VITE_CONTATO_PRIVACIDADE` | A política publica dois avisos vermelhos dizendo que o canal de contato não foi configurado. |

### As flags: leia a produção, não o `.env.example`

O `.env.example` diz que um build sem nenhuma `VITE_FEATURE_*` "já sai com o
corte de lançamento correto". **Isso está desatualizado.**

A produção de hoje roda com **`VITE_FEATURE_ARENA=1`** e
**`VITE_FEATURE_DISPUTA_LOCAL=1`**. Foi lido do bundle servido pelo
`aue.vercel.app`, não de documento.

Isso já mordeu: a primeira publicação manual no Firebase saiu sem as duas, e o
`aue.web.app` passou a servir o fluxo de telas antigo enquanto o
`aue.vercel.app` servia a Arena. **Dois jogos diferentes no mesmo produto, sem
erro em lugar nenhum.**

A prova de paridade é barata e vale rodar sempre que publicar à mão:

```bash
diff <(curl -s https://aue.vercel.app/ | grep -oE '/assets/[^"]+\.js' | sort -u) \
     <(curl -s https://aue.web.app/  | grep -oE '/assets/[^"]+\.js' | sort -u)
```

Nome de arquivo idêntico nos dois lados = mesmo build. Divergiu, alguma flag
divergiu.

### Publicação automática

O `.github/workflows/publicar-firebase.yml` publica a cada merge na `main`. Os
segredos que ele exige estão no cabeçalho do próprio arquivo.

As flags ficam **escritas no workflow**, à vista, em vez de escondidas num
painel — pelo motivo do parágrafo acima. Mexeu na Vercel, mexe lá também.

### Publicação à mão

Com o `.env` no lugar:

```bash
npm run build
firebase deploy --only hosting --project aue-game
```

O deploy publica o conteúdo de `dist/` no site `aue`, e o endereço é
`https://aue.web.app`.

Publicar no Firebase **não mexe** no Vercel. Os dois continuam de pé.

## 5. O que falta pra desligar o Vercel (fatia 2)

Não faça nada disso antes do `aue.web.app` estar validado em celular real e com
link recebido de verdade no WhatsApp.

1. Trocar `ORIGEM_CANONICA` para `https://aue.web.app`. As cinco cópias
   (`index.html`, `privacidade.html`, `termos.html`, `public/robots.txt`,
   `public/sitemap.xml`) estão travadas por `src/seo-publico.test.ts` — o teste
   cai se alguém trocar em um lugar e esquecer os outros. É o comportamento
   desejado.
2. Corrigir à mão o domínio fixo em `supabase/functions/og-preview/index.ts`.
   **Fora do alcance do teste**, e por isso erra em silêncio.
3. Corrigir o comentário em `supabase/migrations/20260807000030_batalhas_em_sessao.sql:236`,
   que cita o endereço antigo como exemplo de link. É comentário, não quebra
   nada — mas é documentação mentindo.
4. Redirecionar `aue.vercel.app` para `aue.web.app` em vez de simplesmente
   desligar. Link que já circulou continua funcionando.

## 6. Duas coisas que não têm conserta bonito

**Quem já instalou o Auê pelo `aue.vercel.app` fica lá.** App instalado se prende
à origem de onde foi instalado: outro service worker, outro armazenamento local.
Não existe migração automática e não vamos inventar uma. Se alguém reclamar que
"o app não atualizou", é isto.

**A prévia dinâmica do WhatsApp continua desligada, nos dois.** O cartão que sai
hoje é o estático do `index.html`, e a Edge Function `og-preview` nunca foi
roteada (`deploy-vercel-e-og-dinamico.md` §2). A mudança de hospedagem não piora
nada — mas a #101 vai querer prévia com a nota da batalha, e o desvio por
user-agent que a Vercel faz com `has: user-agent` **pode não ter equivalente no
Firebase Hosting**, que roteia por caminho e só faz proxy para Functions/Cloud
Run — produto que a #137 proíbe.

**Isso não foi verificado.** Está registrado como pendência na #137 e precisa
estar resolvido antes da #101 começar, não no meio dela.
