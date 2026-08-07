// public/sw.js
//
// ARQUIVO INTENCIONALMENTE VAZIO — NÃO COLOQUE LÓGICA AQUI.
//
// O `vite-plugin-pwa` roda em modo `generateSW` e gera o `dist/sw.js`. O Vite
// copia `public/` para `dist/` ANTES disso, então qualquer código escrito aqui
// é silenciosamente sobrescrito pelo service worker gerado e nunca executa em
// produção. Foi exatamente esse o defeito que deixou as notificações push sem
// efeito (revisão Rian, A4.2).
//
// Os handlers de `push` e `notificationclick` agora vivem em
// `public/push-sw.js` e são injetados no service worker gerado via
// `workbox.importScripts` no `vite.config.ts`.
