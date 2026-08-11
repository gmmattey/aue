import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const entrada = (arquivo: string) => fileURLToPath(new URL(arquivo, import.meta.url));
const ehCasca = (mode: string) => mode === 'casca';

export default defineConfig(({ mode }) => ({
  /*
    Uma entrada HTML por URL pública indexável. PT e EN carregam o mesmo
    `/src/main.tsx`; quem decide o componente é o roteador. Isso dá canonical,
    title, description e hreflang próprios sem criar uma segunda aplicação.
  */
  build: {
    rollupOptions: {
      input: {
        index: entrada('index.html'),
        privacidade: entrada('privacidade.html'),
        termos: entrada('termos.html'),
        comoJogar: entrada('como-jogar.html'),
        englishHome: entrada('en/index.html'),
        howToPlayEn: entrada('en/how-to-play.html'),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      disable: ehCasca(mode),
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        importScripts: ['/push-sw.js'],
        globIgnores: ['**/modelos/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/storage/v1/object/'),
            handler: 'NetworkOnly',
          },
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
        description: 'Grave seu arroto, receba a nota e desafie os amigos.',
        theme_color: '#0a0a08',
        background_color: '#0a0a08',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
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
      },
    }),
  ],
}));
