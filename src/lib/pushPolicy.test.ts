import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldDisplayNativeNotification,
  isHighPriorityNotification,
  resolveCallDeepLinkUrl,
  parseCallActionFromSearch,
  buildServiceWorkerNotificationSpec,
  isValidWebPushSubscription,
  NotificationDeduplicator,
  buildNotificationDedupKey,
  sanitizePushIconUrl,
} from './pushPolicy';

describe('pushPolicy', () => {
  it('suppresses native OS push notifications when tab is actively focused', () => {
    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'granted',
        userOptedOut: false,
        isTabFocused: true,
        isCall: false,
        isDuplicate: false,
      }),
      false
    );

    // Incoming calls are shown inside the in-app banner when tab is focused
    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'granted',
        userOptedOut: false,
        isTabFocused: true,
        isCall: true,
        isDuplicate: false,
      }),
      false
    );
  });

  it('allows native OS push notifications when tab is inactive/hidden and permission granted', () => {
    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'granted',
        userOptedOut: false,
        isTabFocused: false,
        isCall: false,
        isDuplicate: false,
      }),
      true
    );

    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'granted',
        userOptedOut: false,
        isTabFocused: false,
        isCall: true,
        isDuplicate: false,
      }),
      true
    );
  });

  it('respects user opt-out, denied permission, and duplicates', () => {
    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'granted',
        userOptedOut: true,
        isTabFocused: false,
        isCall: true,
        isDuplicate: false,
      }),
      false
    );

    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'denied',
        userOptedOut: false,
        isTabFocused: false,
        isCall: false,
        isDuplicate: false,
      }),
      false
    );

    assert.equal(
      shouldDisplayNativeNotification({
        permission: 'granted',
        userOptedOut: false,
        isTabFocused: false,
        isCall: false,
        isDuplicate: true,
      }),
      false
    );
  });

  it('builds persistent incoming call notification specs with caller info and deep links', () => {
    const spec = buildServiceWorkerNotificationSpec({
      type: 'call_incoming',
      isCall: true,
      callId: 'call_abc_123',
      callType: 'video',
      callerName: 'Adaeze Okoro',
      callerAvatar: 'https://cdn.example.com/ada.jpg',
      title: 'Incoming Video Call from Adaeze Okoro',
      body: 'Adaeze Okoro is calling you live on GGD Network.',
    });

    assert.equal(spec.title, 'Incoming Video Call from Adaeze Okoro');
    assert.equal(spec.options.tag, 'call-call_abc_123');
    assert.equal(spec.options.requireInteraction, true);
    assert.equal(spec.options.renotify, true);
    assert.equal(spec.options.icon, 'https://cdn.example.com/ada.jpg');
    assert.equal(spec.options.data.url, '/?callId=call_abc_123&action=accept');
    assert.equal(spec.options.data.declineUrl, '/?callId=call_abc_123&action=decline');
    assert.deepEqual(
      spec.options.actions?.map((a) => a.action),
      ['answer', 'decline']
    );
  });

  it('sanitizes oversized data: URLs out of push icons', () => {
    const hugeDataUrl = 'data:image/png;base64,' + 'A'.repeat(1000);
    assert.equal(sanitizePushIconUrl(hugeDataUrl), '/favicon.png');
    assert.equal(sanitizePushIconUrl('https://cdn.example.com/avatar.png'), 'https://cdn.example.com/avatar.png');
  });

  it('marks urgent messages and priority admin announcements as high priority with requireInteraction', () => {
    assert.equal(isHighPriorityNotification('urgent_message'), true);
    assert.equal(isHighPriorityNotification('admin_priority'), true);
    assert.equal(isHighPriorityNotification('system', 'high'), true);
    assert.equal(isHighPriorityNotification('credit_task', 'normal'), false);

    const spec = buildServiceWorkerNotificationSpec({
      id: 'notif-99',
      type: 'urgent_message',
      title: 'Urgent Direct Message',
      body: 'Please confirm delivery right away.',
      url: '/inbox',
    });

    assert.equal(spec.options.requireInteraction, true);
    assert.equal(spec.options.renotify, true);
    assert.equal(spec.options.tag, 'ggd-notif-99');
  });

  it('deduplicates notifications deterministically within TTL and expires after TTL', () => {
    const dedup = new NotificationDeduplicator(10_000);
    const key = buildNotificationDedupKey({
      id: 'db-uuid-1',
      type: 'task_status',
      title: 'Task Approved',
      body: 'Earned 50 credits',
    });

    assert.equal(dedup.markIfNew(key, 1_000), true);
    assert.equal(dedup.markIfNew(key, 5_000), false);
    assert.equal(dedup.markIfNew(key, 12_000), true);

    const sigKey = buildNotificationDedupKey({
      id: 'push-12345',
      userId: 'u1',
      type: 'wallet_credit',
      title: 'Credits Received',
      body: '+100 GGG',
    });
    assert.ok(sigKey.startsWith('sig:wallet_credit:u1:'));
  });

  it('parses and constructs call deep-link URLs cleanly', () => {
    const url = resolveCallDeepLinkUrl('call xyz', 'accept');
    assert.equal(url, '/?callId=call%20xyz&action=accept');
    assert.deepEqual(parseCallActionFromSearch('?callId=call%20xyz&action=accept'), {
      callId: 'call xyz',
      action: 'accept',
    });
    assert.deepEqual(parseCallActionFromSearch('?callId=c1&action=decline'), {
      callId: 'c1',
      action: 'decline',
    });
    assert.equal(parseCallActionFromSearch('?tab=inbox'), null);
  });

  it('validates real Web Push subscription objects', () => {
    assert.equal(
      isValidWebPushSubscription({
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'key1', auth: 'auth1' },
      }),
      true
    );
    assert.equal(isValidWebPushSubscription({ endpoint: 'http://insecure.com', keys: {} }), false);
    assert.equal(isValidWebPushSubscription(null), false);
  });
});
