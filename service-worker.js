/* Cache and push receiver; click handler must precede Firebase. */
const CACHE_NAME = 'imnvlab-v7', RECEIPTS = 'imnvlab-push-receipts';
const APP_FILES = ['./', './index.html', './styles.css', './dashboard.js', './manifest.json', './icon-192.png', './icon-512.png'];
const scopeUrl = new URL(self.registration.scope);
function safeTarget(value) {
  try { const url = new URL(value || 'index.html#alertas', scopeUrl); if (url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname)) return url.href; } catch {}
  return new URL('index.html#alertas', scopeUrl).href;
}
self.addEventListener('notificationclick', event => {
  event.notification.close(); event.stopImmediatePropagation();
  const target = safeTarget(event.notification.data?.url);
  event.waitUntil((async () => {
    for (const client of await clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      const url = new URL(client.url);
      if (url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname)) { await client.navigate(target); return client.focus(); }
    }
    return clients.openWindow(target);
  })());
});
let displayQueue = Promise.resolve();
function displayPush(payload) {
  displayQueue = displayQueue.catch(() => {}).then(async () => {
    const data = payload.data || {}, receipts = await caches.open(RECEIPTS);
    const receipt = data.id ? new URL('__push_receipts/' + encodeURIComponent(data.id), scopeUrl).href : null;
    if (receipt && await receipts.match(receipt)) return;
    await self.registration.showNotification(data.title || payload.notification?.title || 'IMNVLab · Alerta', {
      body: data.body || payload.notification?.body || 'Nova condição ambiental detectada.',
      icon: new URL('icon-192.png', scopeUrl).href, badge: new URL('icon-192.png', scopeUrl).href,
      tag: data.tag || 'imnvlab-weather', data: { url: safeTarget(data.url) }
    });
    if (receipt) {
      await receipts.put(receipt, new Response('seen'));
      const keys = await receipts.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - 100)).map(key => receipts.delete(key)));
    }
  });
  return displayQueue;
}
self.addEventListener('message', event => {
  if (event.data?.type === 'IMNV_PUSH') event.waitUntil(displayPush(event.data.payload || {}));
});
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  firebase.initializeApp({ apiKey: 'AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM', authDomain: 'climat-7c7f7.firebaseapp.com', projectId: 'climat-7c7f7', storageBucket: 'climat-7c7f7.firebasestorage.app', messagingSenderId: '267164246485', appId: '1:267164246485:web:a72b776b880ba5b8b71d5c' });
  firebase.messaging().onBackgroundMessage(payload => { if (!payload.notification) return displayPush(payload); });
} catch (error) { console.warn('Push indisponível no service worker:', error.message); }
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))); self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key.startsWith('imnvlab-') && key !== CACHE_NAME && key !== RECEIPTS).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== scopeUrl.origin || !APP_FILES.some(file => new URL(file, scopeUrl).pathname === url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }
    catch { return await cache.match(event.request) || Response.error(); }
  })());
});
