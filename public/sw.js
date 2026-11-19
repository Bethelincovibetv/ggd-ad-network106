// Universal Service Worker for GGD AD NETWORK Push Notifications & Incoming Call Controls
const CACHE_NAME = 'ggd-app-cache-v2';
const GGD_LOGO = '/favicon.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function sanitizeIcon(raw) {
  if (!raw || typeof raw !== 'string') return GGD_LOGO;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.length > 500) return GGD_LOGO;
  return trimmed;
}

function buildPayloadSpec(data) {
  const isCall =
    data.type === 'call_incoming' ||
    data.isCall === true ||
    data.isCall === 'true';

  if (isCall) {
    const callTypeLabel = data.callType === 'video' ? 'Video' : 'Audio';
    const callerName = (data.callerName || 'GGD Member').trim() || 'GGD Member';
    const callId = data.callId || '';
    const tag = data.tag || (callId ? `call-${callId}` : `call-${Date.now()}`);

    return {
      isCall: true,
      title: data.title || `📞 Incoming ${callTypeLabel} Call from ${callerName}`,
      options: {
        body:
          data.body ||
          `${callerName} is calling you (${callTypeLabel}). Tap to answer now.`,
        icon: sanitizeIcon(data.callerAvatar || data.icon),
        badge: GGD_LOGO,
        tag,
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500, 250],
        data: {
          url: callId ? `/?callId=${encodeURIComponent(callId)}&action=accept` : (data.url || '/'),
          declineUrl: callId ? `/?callId=${encodeURIComponent(callId)}&action=decline` : '/',
          callId,
          callType: data.callType || 'audio',
          callerName,
          isCall: true,
        },
        actions: [
          { action: 'answer', title: '📞 Accept Call' },
          { action: 'decline', title: '❌ Decline' },
        ],
      },
    };
  }

  const urgent =
    data.priority === 'high' ||
    data.priority === 'urgent' ||
    data.type === 'urgent_message' ||
    data.type === 'admin_priority';

  const tag =
    data.tag ||
    (data.id ? `ggd-${data.id}` : `ggd-${data.type || 'alert'}-${Date.now()}`);

  return {
    isCall: false,
    title: data.title || 'GGD Ad Network',
    options: {
      body: data.body || data.message || 'You have a new update from GGD Ad Network.',
      icon: sanitizeIcon(data.icon),
      badge: sanitizeIcon(data.badge),
      tag,
      renotify: Boolean(urgent),
      requireInteraction: Boolean(data.requireInteraction ?? urgent),
      vibrate: urgent ? [300, 120, 300, 120, 300] : [200, 100, 200],
      data: {
        id: data.id,
        url: data.url || data.link || '/',
        type: data.type || 'system',
        priority: data.priority || (urgent ? 'urgent' : 'normal'),
        isCall: false,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open', title: urgent ? 'Open Urgent Alert' : 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    },
  };
}

// Push Event Listener (for background Web Push when outside app or inactive tab)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const spec = buildPayloadSpec(data);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Avoid duplicating notifications when user has the app tab actively focused
        const hasFocusedClient = windowClients.some(
          (client) => client.focused === true
        );
        if (hasFocusedClient) {
          return undefined;
        }
        return self.registration.showNotification(spec.title, spec.options);
      })
  );
});

// Client Message Listener (Direct SHOW_NOTIFICATION / DISMISS_NOTIFICATION from app)
self.addEventListener('message', (event) => {
  const payload = event.data;
  if (!payload || typeof payload !== 'object') return;

  if (payload.type === 'SHOW_NOTIFICATION') {
    const spec = buildPayloadSpec({
      ...payload,
      type: payload.notificationType || payload.typePayload || payload.category || (payload.isCall ? 'call_incoming' : 'system'),
    });
    event.waitUntil(self.registration.showNotification(spec.title, spec.options));
    return;
  }

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

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  const notifData = event.notification.data || {};
  const isCall = Boolean(notifData.isCall);
  const callId = notifData.callId || '';

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  if (isCall && event.action === 'decline') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((windowClients) => {
          if (windowClients.length > 0 && callId) {
            windowClients.forEach((client) => {
              client.postMessage({
                type: 'CALL_ACTION_DECLINE',
                callId,
              });
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

  const targetUrl =
    isCall && event.action === 'answer'
      ? notifData.url || (callId ? `/?callId=${encodeURIComponent(callId)}&action=accept` : '/')
      : notifData.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windowClients) => {
        if (windowClients.length > 0) {
          const preferred =
            windowClients.find((c) => c.focused) || windowClients[0];

          if (isCall && callId) {
            preferred.postMessage({
              type: 'CALL_NOTIFICATION_CLICK',
              callId,
              action: 'accept',
            });
          } else {
            preferred.postMessage({
              type: 'PUSH_NOTIFICATION_CLICK',
              url: targetUrl,
              notificationId: notifData.id,
            });
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
