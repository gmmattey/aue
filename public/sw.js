// public/sw.js
//
// ARQUIVO INTENCIONALMENTE VAZIO — NÃO COLOQUE LÓGICA AQUI.
//
// O `vite-plugin-pwa` roda em modo `generateSW` e gera o `dist/sw.js`. O Vite
// copia `public/` para `dist/` ANTES disso, então qualquer código escrito aqui
// é silenciosamente sobrescrito pelo service worker gerado e nunca executa em
// produção. Foi exatamente esse o defeito que deixou as notificações push sem
// efeito (revisão Rian, A4.2) — e o push inteiro saiu do produto na #109.
