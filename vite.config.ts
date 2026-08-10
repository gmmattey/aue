import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const entrada = (arquivo: string) => fileURLToPath(new URL(arquivo, import.meta.url));

/**
 * O build da casca é o MESMO build da web, com uma diferença só: sem service
 * worker (`npm run build:casca`, modo `casca`).
 *
 * POR QUE TIRAR O SERVICE WORKER DE DENTRO DO APP: ele existe para guardar a
 * casca do site e o modelo do juiz quando a pessoa está num navegador. Dentro
 * do app, os arquivos já chegaram pela loja e vivem no aparelho — um segundo
 * cache por cima disso só cria um jeito de o app continuar servindo a versão
 * velha depois de atualizado, e é um bug que só aparece no celular de outra
 * pessoa. A web continua com ele, intacta.
 */
const ehCasca = (mode: string) => mode === 'casca';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  /*
    UMA ENTRADA HTML POR ROTA INDEXÁVEL — o conserto do canonical.

    O app é uma SPA e `vercel.json` reescreve qualquer caminho para o
    `index.html`. Consequência: `/privacidade` era servida com o título, a
    descrição e o `<link rel="canonical">` da HOME, enquanto
    `public/sitemap.xml` declarava `/privacidade` como URL indexável. Sitemap e
    canonical se contradiziam, e quem ganha essa briga é o canonical — a página
    é tratada como duplicata da raiz.

    Com estas entradas, cada rota indexável tem um `.html` de verdade no `dist/`,
    com o próprio canonical. O CONTEÚDO continua sendo o mesmo componente React
    (todas as entradas carregam `/src/main.tsx` e o roteador decide pela URL),
    então não existe texto legal escrito duas vezes.

    O QUE ISTO NÃO É: prerender. O texto só aparece depois do JavaScript. O que
    a mudança entrega é a identidade correta de cada URL, não HTML estático — e
    está dito assim dentro de `privacidade.html`, para ninguém prometer no
    checklist uma indexação que a arquitetura não faz.

    Só entra aqui rota ESTÁVEL e pública. `/b/:code` e `/d/:id` são efêmeros e
    por usuário: continuam caindo no `index.html` pelo rewrite, como sempre.
  */
  build: {
    rollupOptions: {
      input: {
        index: entrada('index.html'),
        privacidade: entrada('privacidade.html'),
        termos: entrada('termos.html'),
        comoJogar: entrada('como-jogar.html'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      /* Ver o comentário do topo: dentro da casca não há service worker. */
      disable: ehCasca(mode),
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      // `generateSW` (modo padrão) gera o dist/sw.js e sobrescreve o
      // public/sw.js. Sem esta linha, os handlers de push nunca chegam a
      // produção. `importScripts` injeta `importScripts('/push-sw.js')` no
      // topo do SW gerado — ver public/push-sw.js para o porquê desta
      // abordagem em vez de `injectManifest`.
      workbox: {
        importScripts: ['/push-sw.js'],
        /*
          O MODELO DO JUIZ NÃO ENTRA NO PRECACHE.

          `public/modelos/yamnet/` tem 16 MB de pesos. Precache é o que o
          service worker baixa na INSTALAÇÃO, antes de a pessoa pedir qualquer
          coisa — colocar o modelo ali faria toda primeira visita pagar 16 MB no
          4G para abrir uma tela com uma bolha. A maioria das visitas nem chega
          a gravar.

          Hoje os padrões do plugin já não pegariam `.bin` nem `.json`, mas
          "hoje não pega" não é decisão: acrescentar `json` ao glob amanhã
          reabriria isto sem ninguém perceber. A regra fica escrita.
        */
        globIgnores: ['**/modelos/**'],
        /*
          ÁUDIO ASSINADO NUNCA É CACHEADO.

          Desde a 20260807000028 o bucket `audio_records` é privado e o áudio é
          servido por URL assinada de 5 minutos, cuja emissão é autorizada
          contra `resultados.is_hidden`. Um áudio cacheado pelo service worker
          continuaria tocando depois de ser escondido por moderação ou apagado
          pelo autor — o cache do navegador viraria o furo por onde a moderação
          vaza, e num PWA instalado ele sobrevive ao fechamento do app.

          O padrão do `generateSW` já NÃO cacheia requisição de outra origem, e
          o Supabase é outra origem. Esta regra é redundante DE PROPÓSITO: ela
          transforma o comportamento padrão em decisão declarada, para que
          acrescentar um `runtimeCaching` genérico amanhã não reabra o buraco
          sem ninguém perceber.

          `NetworkOnly` sem `cacheName`: não há cache a nomear.
        */
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/storage/v1/object/'),
            handler: 'NetworkOnly',
          },
          /*
            O MODELO DO JUIZ, ESSE SIM, FICA GUARDADO — depois de baixado uma vez.

            Fora do precache (ver `globIgnores`) e dentro do cache de runtime:
            ninguém paga os 16 MB para abrir o app, e quem já arrotou uma vez não
            paga de novo na segunda. `CacheFirst` porque o conteúdo é imutável —
            são os pesos publicados pelo Google, e trocar de versão significa
            trocar de caminho.

            NÃO É O MESMO CASO DO ÁUDIO logo acima, e a diferença é o que
            autoriza esta regra: áudio de gente pode ser escondido por moderação
            ou apagado pelo autor, e cache seria o furo por onde isso vaza. Peso
            de rede neural não tem dono nem botão de apagar.

            Um ano de validade e teto de 8 entradas: o modelo são 5 arquivos, e a
            folga cobre uma troca de versão sem estourar a cota.
          */
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/modelos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'aue-modelos',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Auê!',
        short_name: 'Auê',
        // Era 'Auê Judgement Engine MVP' — nome interno do motor e a palavra
        // "MVP" indo para a tela de instalação do usuário.
        description: 'Grave seu arroto, receba a nota e desafie os amigos.',
        // Era '#ffffff' num app de fundo escuro: a barra do sistema piscava
        // branco ao abrir. Mesmo valor de `--bg` em src/index.css.
        theme_color: '#0a0a08',
        background_color: '#0a0a08',
        display: 'standalone',
        start_url: '/',
        // O manifest saía com `lang: 'en'` (padrão do plugin) num app inteiro
        // em português.
        lang: 'pt-BR',
        /*
          PENDÊNCIA DE ARTE RESOLVIDA.

          Antes havia só `favicon.svg` aqui, porque os PNGs declarados não
          existiam em public/ — e ícone que responde 404 não torna o app
          instalável. O Chrome exige pelo menos um ícone PNG de 192px ou mais
          para oferecer a instalação; enquanto isso faltou, o
          `beforeinstallprompt` provavelmente nunca disparava e o botão de
          instalar simplesmente não aparecia.

          Os três PNGs foram gerados a partir de
          `docs/design/design-system/assets/aue-bolha-mark.svg`, o símbolo oficial
          COM o ponto de exclamação vazado. (Os PNGs de `assets/logo/` são a
          bolha sólida, sem o exclamação — não servem como marca.)

          O `favicon.svg` também foi trocado: era um raio roxo #863bff, herdado
          de outro projeto, que não tem nada a ver com o verde-limão do Auê.

          `maskable` separado do ícone normal, e não como `purpose` do mesmo
          arquivo: o Android recorta o maskable num círculo/squircle e só
          garante os 80% centrais, então ele tem o símbolo reduzido para caber
          na zona segura. Declarar o mesmo arquivo com os dois propósitos faria
          o ícone normal aparecer com margem demais ou o maskable aparecer
          cortado — dependendo de quem escolhesse.
        */
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        /*
          `share_target` REMOVIDO no corte de lançamento. Ele anunciava o app
          ao sistema operacional como destino de compartilhamento de áudio e
          fazia POST para /import-audio, rota que não existe no roteador
          (só há /d/:id e o catch-all). Com o rewrite de SPA da Vercel esse
          POST passa a cair no index.html em vez de dar 404, ou seja, o
          usuário compartilharia um áudio e o app abriria sem nada acontecer.
          Para reativar: criar a rota e o handler que lê o FormData do POST.
        */
      }
    })
  ],
}));
