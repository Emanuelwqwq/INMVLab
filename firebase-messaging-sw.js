// firebase-messaging-sw.js
// Esse arquivo roda em segundo plano no navegador, mesmo com o site fechado.
// É ele quem exibe a notificação quando chega uma mensagem push do Firebase.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBWDcTMNN4aUYywXhgUw_gJzlkB45F1foM",
  authDomain: "climat-7c7f7.firebaseapp.com",
  projectId: "climat-7c7f7",
  storageBucket: "climat-7c7f7.firebasestorage.app",
  messagingSenderId: "267164246485",
  appId: "1:267164246485:web:a72b776b880ba5b8b71d5c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'IMNVLab';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: 'icon.svg',
    badge: 'icon.svg'
  });
});
