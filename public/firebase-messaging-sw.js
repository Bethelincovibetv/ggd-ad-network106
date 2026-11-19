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
const GGD_LOGO = '/favicon.png';

function sanitizeIcon(raw) {
  if (!raw || typeof raw !== 'string') return GGD_LOGO;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.length > 500) return GGD_LOGO;
  return trimmed;
}

messaging.onBackgroundMessage((payload) => {
  const isCall = payload.data?.type === 'call_incoming' || payload.data?.isCall === 'true';
  const callType = payload.data?.callType === 'video' ? 'Video' : 'Audio';
  const callerName = payload.data?.callerName || 'GGD Member';
  const callId = payload.data?.callId || '';

  if (isCall) {
    const callTitle = `📞 Incoming ${callType} Call from ${callerName}`;
    const callOptions = {
      body: `${callerName} is calling you (${callType}). Tap to answer now.`,
      icon: sanitizeIcon(payload.data?.callerAvatar),
      badge: GGD_LOGO,
      tag: `call-${callId || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250],
      data: {
        url: `/?callId=${encodeURIComponent(callId)}&action=accept`,
        declineUrl: `/?callId=${encodeURIComponent(callId)}&action=decline`,
        callId,
        isCall: true,
      },
      actions: [
        { action: 'answer', title: '📞 Accept Call' },
        { action: 'decline', title: '❌ Decline' }
      ]
    };
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      if (clientsList.some((c) => c.focused === true)) return undefined;
      return self.registration.showNotification(callTitle, callOptions);
    });
  }

  const urgent =
    payload.data?.priority === 'high' ||
    payload.data?.priority === 'urgent' ||
    payload.data?.type === 'urgent_message' ||
    payload.data?.type === 'admin_priority';

  const notificationTitle = payload.notification?.title || payload.data?.title || 'GGD AD NETWORK';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update from GGD AD NETWORK',
    icon: sanitizeIcon(payload.notification?.icon || payload.data?.icon),
    badge: GGD_LOGO,
    tag: payload.data?.tag || (payload.data?.id ? `ggd-${payload.data.id}` : undefined),
    renotify: Boolean(urgent),
    requireInteraction: Boolean(urgent),
    data: {
      id: payload.data?.id,
      url: payload.data?.url || payload.fcmOptions?.link || '/',
      isCall: false,
    },
    vibrate: urgent ? [300, 120, 300, 120, 300] : [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
    if (clientsList.some((c) => c.focused === true)) return undefined;
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
});

self.addEventListener('message', (event) => {
  const payload = event.data;
  if (!payload || typeof payload !== 'object') return;
  if (payload.type === 'DISMISS_NOTIFICATION') {
    const targetTag = payload.tag || (payload.callId ? `call-${payload.callId}` : '');
    const targetCallId = payload.callId || '';
    event.waitUntil(
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => {
          const matchesTag = targetTag && notification.tag === targetTag;
          const matchesCallId = targetCallId && notification.data?.callId === targetCallId;
          if (matchesTag || matchesCallId) {
            notification.close();
          }
        });
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  const notifData = event.notification.data || {};
  const isCall = Boolean(notifData.isCall);
  const callId = notifData.callId || '';
  event.notification.close();

  if (event.action === 'dismiss') return;

  if (event.action === 'decline' && isCall) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        if (windowClients.length > 0 && callId) {
          windowClients.forEach((client) => {
            client.postMessage({ type: 'CALL_ACTION_DECLINE', callId });
          });
          return undefined;
        }
        if (notifData.declineUrl && self.clients.openWindow) {
          return self.clients.openWindow(notifData.declineUrl);
        }
        return undefined;
      })
    );
    return;
  }

  const targetUrl = isCall && event.action === 'answer'
    ? (notifData.url || (callId ? `/?callId=${encodeURIComponent(callId)}&action=accept` : '/'))
    : (notifData.url || '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      if (windowClients.length > 0) {
        const preferred = windowClients.find((c) => c.focused) || windowClients[0];
        if (isCall && callId) {
          preferred.postMessage({ type: 'CALL_NOTIFICATION_CLICK', callId, action: 'accept' });
        }
        if ('focus' in preferred) {
          await preferred.focus().catch(() => {});
        }
        if (!isCall && 'navigate' in preferred && targetUrl && targetUrl !== '/') {
          return preferred.navigate(targetUrl).catch(() => undefined);
        }
        return preferred;
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
