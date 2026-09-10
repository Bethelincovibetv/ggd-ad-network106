// Firebase Cloud Messaging Service Worker for GGD AD NETWORK
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAI3Fql00P4MnRfVUgljdvVvfBBhFv-fi4",
  projectId: "gen-lang-client-0716279602",
  messagingSenderId: "289558116603",
  appId: "1:289558116603:web:a7c8e35d36d19e613f185e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'GGD AD NETWORK Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update from GGD AD NETWORK',
    icon: payload.notification?.icon || '/favicon.png',
    badge: '/favicon.png',
    data: {
      url: payload.data?.url || payload.fcmOptions?.link || '/',
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
