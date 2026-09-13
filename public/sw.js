// Universal Service Worker for GGD AD NETWORK Push Notifications & Offline Support
const CACHE_NAME = 'ggd-app-cache-v1';
const GGD_LOGO = '/favicon.png';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Push Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'GGD Ad Network';
  const options = {
    body: data.body || data.message || 'You have a new update from GGD Ad Network',
    icon: data.icon || GGD_LOGO,
    badge: data.badge || GGD_LOGO,
    data: {
      url: data.url || data.link || '/',
      timestamp: Date.now(),
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open Notification' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          if (client.url.includes(urlToOpen) || urlToOpen === '/') {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
