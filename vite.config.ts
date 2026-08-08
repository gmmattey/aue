import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
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
          ATENÇÃO — PENDÊNCIA DE ARTE, NÃO É CÓDIGO.
          Aqui havia `pwa-192x192.png` e `pwa-512x512.png`. Nenhum dos dois
          existe em public/ (conferido). Ícone declarado que responde 404 não
          torna o app instalável e ainda faz o navegador registrar erro, então
          ficou só o arquivo que existe de verdade.

          Para o PWA ficar completo é preciso criar public/pwa-192x192.png e
          public/pwa-512x512.png (este último também com `purpose: 'maskable'`)
          e devolvê-los a esta lista. NÃO verifiquei em navegador se o SVG
          sozinho basta para o Chrome oferecer a instalação — trate isso como
          não verificado.
        */
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
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
});
