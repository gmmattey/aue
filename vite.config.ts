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
      },
      manifest: {
        name: 'Auê App',
        short_name: 'Auê',
        description: 'Auê Judgement Engine MVP',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          }
        ],
        share_target: {
          action: "/import-audio",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            files: [
              {
                name: "audio_file",
                accept: ["audio/*", "video/mp4", "video/webm"]
              }
            ]
          }
        }
      }
    })
  ],
});
