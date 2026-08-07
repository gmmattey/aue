/* eslint-disable */
// public/push-sw.js
//
// Handlers de Web Push do Auê.
//
// POR QUE ESTE ARQUIVO EXISTE:
// O `vite-plugin-pwa` roda em modo `generateSW` (padrão). Nesse modo o Workbox
// GERA o `dist/sw.js` do zero e sobrescreve qualquer `public/sw.js` copiado
// pelo Vite. Resultado: os handlers de `push`/`notificationclick` que viviam em
// `public/sw.js` nunca chegavam a produção — a feature de push estava morta.
//
// A correção é declarar este arquivo em `workbox.importScripts` no
// `vite.config.ts`. O Workbox então emite um `importScripts('/push-sw.js')` no
// topo do service worker gerado, e estes handlers passam a valer.
//
// Por que `importScripts` e não `injectManifest`:
// `injectManifest` obrigaria a escrever o service worker inteiro à mão
// (incluindo `precacheAndRoute(self.__WB_MANIFEST)`), o que exige adicionar
// `workbox-precaching` como dependência direta — ou seja, `npm install`. Como
// instalar dependências está fora da autorização e o precache automático
// funciona bem, `importScripts` é a opção que resolve o defeito sem mudar a
// estratégia de cache nem o grafo de dependências.

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Error parsing push data', e);
    data = {};
  }

  const options = {
    body: data.body || 'Você tem uma nova notificação do Auê!',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Auê', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetPath = (event.notification.data && event.notification.data.url) || '/';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
