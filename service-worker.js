/* IMNVLab Service Worker — cache + Firebase Cloud Messaging (background push) */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const CACHE_NAME = 'imnvlab-v2';
const APP_FILES = ['./', './index.html', './styles.css', './dashboard.js', './manifest.json'];

const firebaseConfig = {
  apiKey: 'AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM',
  authDomain: 'climat-7c7f7.firebaseapp.com',
  projectId: 'climat-7c7f7',
  storageBucket: 'climat-7c7f7.firebasestorage.app',
  messagingSenderId: '267164246485',
  appId: '1:267164246485:web:a72b776b880ba5b8b71d5c'
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || payload.data?.title || 'IMNVLab · Alerta';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Nova condição ambiental detectada.',
    icon: payload.notification?.icon || './icon-192.png',
    badge: './icon-192.png',
    tag: payload.data?.tag || 'imnvlab-alert',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [120, 60, 120]
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './index.html#alertas';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('index.html') && 'focus' in client) {
          client.focus();
          if (client.navigate) client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
