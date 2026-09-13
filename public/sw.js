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

  const isCall = data.type === 'call_incoming' || data.isCall === true || data.isCall === 'true';
  const callType = data.callType === 'video' ? 'Video' : 'Audio';
  const callerName = data.callerName || 'GGD Member';
  const callId = data.callId || '';

  if (isCall) {
    const callTitle = `📞 Incoming ${callType} Call from ${callerName}`;
    const callOptions = {
      body: `Tap to answer incoming ${callType.toLowerCase()} call`,
      icon: data.callerAvatar || GGD_LOGO,
      badge: GGD_LOGO,
      tag: `call-${callId || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 500, 250],
      data: {
        url: `/?callId=${callId}&action=accept`,
        declineUrl: `/?callId=${callId}&action=decline`,
        callId,
        isCall: true,
      },
      actions: [
        { action: 'answer', title: '📞 Accept Call' },
        { action: 'decline', title: '❌ Decline' }
      ]
    };
    event.waitUntil(self.registration.showNotification(callTitle, callOptions));
    return;
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
  if (event.action === 'dismiss' || event.action === 'decline') return;

  const isCall = event.notification.data?.isCall;
  const targetUrl = isCall && event.action === 'answer'
    ? event.notification.data?.url
    : (event.notification.data?.url || '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
