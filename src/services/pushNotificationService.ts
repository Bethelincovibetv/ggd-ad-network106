import { db } from '@/lib/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationChime, playMoneyTransferSound } from '@/utils/audio';
import { toast } from 'sonner';
import {
  NotificationDeduplicator,
  PushCategory,
  PushPriority,
  buildNotificationDedupKey,
  buildServiceWorkerNotificationSpec,
  isHighPriorityNotification,
  resolveCallDeepLinkUrl,
  sanitizePushIconUrl,
  shouldDisplayNativeNotification,
} from '@/lib/pushPolicy';

export interface PushNotificationPayload {
  id?: string;
  tag?: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type?: PushCategory | string;
  priority?: PushPriority;
  requireInteraction?: boolean;
  userId?: string; // target user ID ('broadcast' or 'all' for global)
  targetUserId?: string; // alias for target user ID
  senderId?: string; // ID of user initiating the notification
  saveToDb?: boolean;
  sendRemotePush?: boolean;
  allowNativeWhenFocused?: boolean; // only for explicit manual "Send Test Push" diagnostics
  skipDedupe?: boolean;
  callId?: string;
  callType?: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
  isCall?: boolean;
}

const GGD_SITE_LOGO = '/favicon.png';
const PUSH_OPT_OUT_KEY = 'ggd_push_opted_out';
const PUSH_REGISTERED_KEY = 'ggd_push_registered';

let swRegistration: ServiceWorkerRegistration | null = null;

// Shared cross-component deduplication registry (prevents Bell + NotificationsPage + Dispatcher duplicates)
const globalNotificationDedup = new NotificationDeduplicator(35_000);

function safeStorageGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) localStorage.setItem(key, val);
  } catch {}
}

function safeStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) localStorage.removeItem(key);
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Returns true if the current browser tab is visible AND focused.
 */
export function isTabActivelyFocused(): boolean {
  if (typeof document === 'undefined') return true;
  if (document.visibilityState !== 'visible') return false;
  if (typeof document.hasFocus === 'function') {
    return document.hasFocus();
  }
  return true;
}

/**
 * Checks whether the user manually opted out of Web Push in settings.
 */
export function isUserPushOptedOut(): boolean {
  return safeStorageGet(PUSH_OPT_OUT_KEY) === 'true';
}

/**
 * Checks and records whether a notification ID or signature has already been presented recently.
 * Returns true if NEW (caller should proceed), false if DUPLICATE (caller should skip alerting again).
 */
export function markNotificationNotDuplicate(params: {
  id?: string | null;
  userId?: string | null;
  type?: string | null;
  title?: string | null;
  body?: string | null;
}): boolean {
  const key = buildNotificationDedupKey(params);
  return globalNotificationDedup.markIfNew(key);
}

/**
 * Ensures Service Worker is registered and ready
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    if (swRegistration && swRegistration.active) return swRegistration;

    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing && existing.active) {
      swRegistration = existing;
      return existing;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    try {
      await navigator.serviceWorker.ready;
    } catch {}
    swRegistration = registration;
    return registration;
  } catch (err) {
    console.warn('Service worker registration fallback:', err);
    try {
      const fallbackReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      swRegistration = fallbackReg;
      return fallbackReg;
    } catch (fbErr) {
      console.warn('Fallback SW registration error:', fbErr);
      return null;
    }
  }
}

/**
 * Subscribes this browser's PushManager to backend VAPID keys and syncs to server + Supabase.
 */
export async function subscribeBrowserToWebPush(
  registration: ServiceWorkerRegistration,
  userId?: string
): Promise<PushSubscriptionJSON | null> {
  if (!registration?.pushManager) return null;

  try {
    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) return null;
    const keyJson = await keyRes.json();
    const publicKey = keyJson?.publicKey;
    if (!publicKey || typeof publicKey !== 'string') return null;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const subJson = sub.toJSON();
    if (userId && subJson?.endpoint) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          userId,
          subscription: subJson,
        }),
      }).catch(() => {});
    }

    return subJson;
  } catch (err) {
    // Expected in browsers/headless iframes without push messaging endpoints
    console.debug('Web Push PushManager subscription note:', err);
    return null;
  }
}

/**
 * Register Service Worker and Request Web Push Permission cleanly
 */
export async function registerPushNotification(
  userId?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Web Notifications are not supported by this browser.' };
  }

  try {
    let permission: NotificationPermission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission was denied or dismissed. You can enable it in your browser site settings.',
      };
    }

    safeStorageRemove(PUSH_OPT_OUT_KEY);
    safeStorageSet(PUSH_REGISTERED_KEY, 'true');

    const registration = await getOrRegisterServiceWorker();
    let pushSub: PushSubscriptionJSON | null = null;
    if (registration) {
      pushSub = await subscribeBrowserToWebPush(registration, userId);
    }

    const deviceId = `device_${userId || 'guest'}_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    const deviceToken = pushSub?.endpoint || `web_push_${Math.random().toString(36).substring(2)}_${Date.now()}`;

    // Store device metadata in Firestore
    try {
      if (db) {
        await setDoc(
          doc(db, 'push_devices', deviceId),
          {
            userId: userId || 'anonymous',
            token: deviceToken,
            platform: 'web',
            hasWebPushSubscription: Boolean(pushSub),
            userAgent: navigator.userAgent.slice(0, 250),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Firebase push device sync note:', err);
    }

    // Store preference & subscription in Supabase profiles if user is signed in
    if (userId) {
      try {
        const updateFields: Record<string, any> = { has_push_enabled: true };
        if (pushSub) {
          updateFields.push_subscription = pushSub;
        }
        await supabase
          .from('profiles')
          .update(updateFields as any)
          .eq('user_id', userId);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ggd-push-preference-changed', { detail: { enabled: true } }));
    }

    return { success: true, token: deviceToken };
  } catch (error: any) {
    console.error('Error registering push notification:', error);
    return { success: false, error: error?.message || 'Failed to enable push notifications' };
  }
}

/**
 * Cleanly enables or disables user push notifications from Settings / Notification Center.
 */
export async function setUserPushEnabled(
  enabled: boolean,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (enabled) {
    return registerPushNotification(userId);
  }

  // Disable push cleanly without touching browser permissions (user can re-enable seamlessly)
  safeStorageSet(PUSH_OPT_OUT_KEY, 'true');
  safeStorageRemove(PUSH_REGISTERED_KEY);

  try {
    let endpoint: string | undefined;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
      }
    }

    if (userId) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ userId, endpoint }),
      }).catch(() => {});

      await supabase
        .from('profiles')
        .update({ has_push_enabled: false, push_subscription: null } as any)
        .eq('user_id', userId);
    }
  } catch (err) {
    console.warn('Error unsubscribing push:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ggd-push-preference-changed', { detail: { enabled: false } }));
  }

  return { success: true };
}

/**
 * Helper to get active user ID in the current browser session
 */
async function getCurrentSessionUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Displays a Service Worker native notification if policy permits.
 */
async function presentNativeServiceWorkerNotification(
  payload: PushNotificationPayload
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  const isCall = Boolean(
    payload.isCall || payload.type === 'call_incoming' || payload.type === 'call'
  );
  const isTabFocused = payload.allowNativeWhenFocused ? false : isTabActivelyFocused();
  const canShow = shouldDisplayNativeNotification({
    permission: Notification.permission,
    userOptedOut: isUserPushOptedOut(),
    isTabFocused,
    isCall,
    isDuplicate: false,
  });

  if (!canShow) return false;

  const spec = buildServiceWorkerNotificationSpec({
    id: payload.id,
    tag: payload.tag,
    title: payload.title,
    body: payload.body,
    icon: payload.icon,
    url: payload.url,
    type: payload.type,
    priority: payload.priority,
    requireInteraction: payload.requireInteraction,
    callId: payload.callId,
    callType: payload.callType,
    callerName: payload.callerName,
    callerAvatar: payload.callerAvatar,
    isCall,
  });

  try {
    const reg = await getOrRegisterServiceWorker();
    if (reg) {
      if (typeof reg.showNotification === 'function') {
        await reg.showNotification(spec.title, spec.options);
        return true;
      }
      if (reg.active) {
        reg.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          ...payload,
          title: spec.title,
          body: spec.options.body,
          icon: spec.options.icon,
          badge: spec.options.badge,
          tag: spec.options.tag,
          requireInteraction: spec.options.requireInteraction,
          renotify: spec.options.renotify,
          notificationType: payload.type,
          isCall,
        });
        return true;
      }
    }

    if (typeof window.Notification === 'function') {
      try {
        new Notification(spec.title, {
          body: spec.options.body,
          icon: spec.options.icon,
          badge: spec.options.badge,
          tag: spec.options.tag,
        });
        return true;
      } catch (constrErr) {
        console.debug('Direct Notification constructor skipped:', constrErr);
      }
    }
  } catch (e) {
    console.warn('Web notification trigger warning:', e);
  }

  return false;
}

/**
 * Sends a server-side encrypted Web Push message so recipients outside the app
 * or on closed tabs also receive immediate OS alerts.
 */
async function dispatchServerWebPush(payload: PushNotificationPayload): Promise<void> {
  if (payload.sendRemotePush === false) return;
  const targetId = payload.userId || payload.targetUserId;
  if (!targetId) return;

  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: targetId,
        id: payload.id,
        tag: payload.tag,
        title: payload.title,
        body: payload.body,
        icon: sanitizePushIconUrl(payload.icon),
        url: payload.url || '/',
        type: payload.type || 'system',
        priority:
          payload.priority ||
          (isHighPriorityNotification(payload.type, payload.priority) ? 'urgent' : 'normal'),
        requireInteraction: payload.requireInteraction,
      }),
    });
  } catch {}
}

/**
 * Targeted Push Notification Dispatcher
 * Strictly isolates recipient notifications & suppresses duplicate focused-tab alerts:
 * - If targeted to another user: persists to DB + dispatches server Web Push. Never alerts sender!
 * - If targeted for current user (or broadcast):
 *   - Deduplicates by notification ID/signature.
 *   - Focused tab: in-app toast + audio/chime ONLY (no duplicate OS notification).
 *   - Hidden/inactive tab: triggers Service Worker native Web Push notification.
 */
export async function triggerRealtimePush(payload: PushNotificationPayload): Promise<boolean> {
  const targetId = payload.userId || payload.targetUserId;
  const isBroadcast = !targetId || targetId === 'broadcast' || targetId === 'all';
  const icon = sanitizePushIconUrl(payload.icon, GGD_SITE_LOGO);
  const soundType =
    payload.type === 'bonus' ||
    payload.type === 'credit_task' ||
    payload.type === 'credit_transfer' ||
    payload.type === 'wallet_credit'
      ? 'cash'
      : 'message';

  let currentUserId: string | null = null;
  try {
    currentUserId = await getCurrentSessionUserId();
  } catch {}

  const isForAnotherUser = !isBroadcast && Boolean(targetId && currentUserId && targetId !== currentUserId);
  let insertedSupabaseId: string | undefined;

  // 1. Save to Database for the designated recipient (Supabase)
  if (targetId && payload.saveToDb !== false && !isBroadcast) {
    try {
      const { data: inserted } = await supabase
        .from('notifications')
        .insert({
          user_id: targetId,
          title: payload.title,
          message: payload.body,
          type: payload.type || 'system',
          link_url: payload.url || '/',
        })
        .select('id')
        .maybeSingle();
      if (inserted?.id) {
        insertedSupabaseId = inserted.id;
      }
    } catch (err) {
      console.warn('Supabase notification insert note:', err);
    }
  }

  // 2. Save to Firestore notifications
  if (payload.saveToDb !== false && db) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: targetId || 'broadcast',
        title: payload.title,
        body: payload.body,
        icon,
        url: payload.url || '/',
        type: payload.type || 'system',
        priority: payload.priority || (isHighPriorityNotification(payload.type, payload.priority) ? 'urgent' : 'normal'),
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase notification record note:', err);
    }
  }

  // 3. Dispatch real Web Push to recipient / broadcast devices when remote target or explicit broadcast
  if (isForAnotherUser || isBroadcast) {
    dispatchServerWebPush({
      ...payload,
      id: payload.id || insertedSupabaseId,
      userId: targetId || 'broadcast',
    });
  }

  // If this notification belongs to another user, DO NOT alert current user locally!
  if (isForAnotherUser) {
    return true;
  }

  // 4. Respect user opt-out for local delivery if no DB persistence was requested
  const resolvedId = payload.id || insertedSupabaseId;
  if (
    !payload.skipDedupe &&
    !markNotificationNotDuplicate({
      id: resolvedId,
      userId: targetId || currentUserId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
    })
  ) {
    return true;
  }

  // 5. Play audio chime on the intended user's device
  try {
    if (soundType === 'cash') {
      playMoneyTransferSound();
    } else {
      playNotificationChime();
    }
  } catch {}

  // 6. Device vibration
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(
        isHighPriorityNotification(payload.type, payload.priority)
          ? [300, 120, 300]
          : [150, 75, 150]
      );
    }
  } catch {}

  // 7. Dispatch global browser custom event
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ggd-push-notification', { detail: payload }));
    }
  } catch {}

  // 8. In-app interactive Toast (when in browser)
  const notifId = resolvedId || `push-${Date.now()}`;
  const isUrgent = isHighPriorityNotification(payload.type, payload.priority);
  const toastFn = isUrgent ? toast.warning : toast;
  toastFn(payload.title, {
    description: payload.body,
    duration: isUrgent ? 7500 : 4500,
    action: {
      label: payload.url?.startsWith('/inbox') ? 'Open Chat' : 'View',
      onClick: () => {
        if (typeof window !== 'undefined') {
          if (payload.url && payload.url !== '/' && !payload.url.startsWith('http')) {
            const targetTab = payload.url.includes('inbox')
              ? 'inbox'
              : payload.url.includes('tasks')
              ? 'tasks'
              : payload.url.includes('wallet')
              ? 'wallet'
              : 'notifications';
            if (window.location.pathname === '/') {
              window.dispatchEvent(new CustomEvent('ggd-nav', { detail: targetTab }));
              return;
            }
          }

          try {
            localStorage.setItem('ggd_active_tab', 'notifications');
            localStorage.setItem('ggd_selected_notification_id', notifId);
          } catch {}

          if (window.location.pathname === '/') {
            window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'notifications' }));
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('ggd-open-notification-detail', {
                  detail: {
                    id: notifId,
                    title: payload.title,
                    message: payload.body,
                    body: payload.body,
                    type: payload.type,
                    link_url: payload.url,
                    created_at: new Date().toISOString(),
                    is_read: true,
                  },
                })
              );
            }, 60);
          } else {
            window.location.assign(`/?tab=notifications&notificationId=${encodeURIComponent(notifId)}`);
          }
        }
      },
    },
  });

  // 9. Native OS Web Push / ServiceWorker Notification ONLY when tab is unfocused/hidden
  // (or allowNativeWhenFocused is explicitly enabled for manual settings test button)
  await presentNativeServiceWorkerNotification({ ...payload, id: resolvedId });

  return true;
}

/**
 * Triggers a persistent incoming call notification when user is outside app or tab is inactive.
 */
export async function notifyIncomingCallPush({
  callId,
  callerName,
  callerAvatar,
  callType,
}: {
  callId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
}): Promise<boolean> {
  if (!callId) return false;
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  const canShow = shouldDisplayNativeNotification({
    permission: Notification.permission,
    userOptedOut: isUserPushOptedOut(),
    isTabFocused: isTabActivelyFocused(),
    isCall: true,
    isDuplicate: false,
  });

  if (!canShow) return false;

  const callLabel = callType === 'video' ? 'Video' : 'Audio';
  const title = `📞 Incoming ${callLabel} Call from ${callerName || 'GGD Member'}`;
  const body = `${callerName || 'GGD Member'} is calling you (${callLabel}). Tap to answer or decline.`;

  return presentNativeServiceWorkerNotification({
    id: callId,
    tag: `call-${callId}`,
    title,
    body,
    icon: sanitizePushIconUrl(callerAvatar, GGD_SITE_LOGO),
    url: resolveCallDeepLinkUrl(callId, 'accept'),
    type: 'call_incoming',
    priority: 'urgent',
    requireInteraction: true,
    callId,
    callType,
    callerName,
    callerAvatar,
    isCall: true,
  });
}

/**
 * Automatically closes persistent incoming call OS notifications when answered, declined, or missed.
 */
export async function dismissIncomingCallPush(callId?: string | null): Promise<void> {
  if (!callId || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const targetTag = `call-${callId}`;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      if (typeof reg.getNotifications === 'function') {
        const active = await reg.getNotifications({ tag: targetTag });
        active.forEach((n) => n.close());
        // Also close any call notifications matching callId in data
        const all = await reg.getNotifications();
        all.forEach((n) => {
          if (n.data?.callId === callId || n.tag === targetTag) {
            n.close();
          }
        });
      }
      reg.active?.postMessage({
        type: 'DISMISS_NOTIFICATION',
        tag: targetTag,
        callId,
      });
    }
  } catch (err) {
    console.debug('Could not dismiss incoming call push:', err);
  }
}

/**
 * Activity Helper 1: Task Proof / Submission Approved or Rejected
 */
export async function notifyTaskStatusPush({
  userId,
  taskTitle,
  approved,
  rewardCredits,
  reason,
  url = '/?tab=tasks',
}: {
  userId: string;
  taskTitle: string;
  approved: boolean;
  rewardCredits?: number;
  reason?: string;
  url?: string;
}): Promise<boolean> {
  if (!userId) return false;

  const creditText = rewardCredits && rewardCredits > 0 ? ` +${rewardCredits.toLocaleString()} GGG Credits credited!` : '';
  const title = approved ? '✅ Task Proof Approved!' : '❌ Task Proof Rejected';
  const body = approved
    ? `Your submission for "${taskTitle}" was approved.${creditText}`
    : `Your submission for "${taskTitle}" was rejected${reason ? `: ${reason}` : '. Please check requirements and resubmit.'}`;

  return triggerRealtimePush({
    userId,
    title,
    body,
    type: approved ? 'wallet_credit' : 'task_status',
    priority: 'high',
    url,
    saveToDb: true,
  });
}

/**
 * Activity Helper 2: Task Rewards, Payouts & Wallet Credits Received
 */
export async function notifyWalletCreditPush({
  userId,
  title,
  description,
  type = 'wallet_credit',
  url = '/?tab=wallet',
}: {
  userId: string;
  title: string;
  description: string;
  type?: 'wallet_credit' | 'credit_task' | 'credit_transfer' | 'bonus';
  url?: string;
}): Promise<boolean> {
  if (!userId) return false;
  return triggerRealtimePush({
    userId,
    title,
    body: description,
    type,
    priority: 'high',
    url,
    saveToDb: true,
  });
}

/**
 * Activity Helper 3: Ad Campaign or Business Listing Status Change
 */
export async function notifyAdOrBusinessStatusPush({
  userId,
  entityType,
  itemTitle,
  statusLabel,
  details,
  url,
  urgent = false,
}: {
  userId: string;
  entityType: 'ad' | 'business_listing';
  itemTitle: string;
  statusLabel: string;
  details?: string;
  url?: string;
  urgent?: boolean;
}): Promise<boolean> {
  if (!userId) return false;
  const label = entityType === 'ad' ? 'Banner Advert' : 'Business Listing';
  return triggerRealtimePush({
    userId,
    title: `${urgent ? '⚠️' : '📢'} ${label} ${statusLabel}`,
    body: details || `"${itemTitle}" status is now ${statusLabel}.`,
    type: entityType === 'ad' ? 'ad_status' : 'business_status',
    priority: urgent ? 'high' : 'normal',
    url: url || (entityType === 'ad' ? '/?tab=campaigns' : '/?tab=my-business'),
    saveToDb: true,
  });
}

/**
 * Activity Helper 4: Urgent Direct Messages
 */
export async function notifyUrgentMessagePush({
  recipientUserId,
  senderName,
  messagePreview,
  chatUrl = '/inbox',
  title,
}: {
  recipientUserId: string;
  senderName?: string;
  messagePreview: string;
  chatUrl?: string;
  title?: string;
}): Promise<boolean> {
  if (!recipientUserId) return false;
  const sender = senderName || 'GGD Member';
  const trimmed = messagePreview.length > 120 ? `${messagePreview.slice(0, 117)}...` : messagePreview;
  return triggerRealtimePush({
    userId: recipientUserId,
    title: title || `🚨 Urgent Message from ${sender}`,
    body: trimmed,
    type: 'urgent_message',
    priority: 'urgent',
    requireInteraction: true,
    url: chatUrl,
    saveToDb: true,
  });
}

/**
 * Activity Helper 5: Priority Admin Announcement
 */
export async function notifyPriorityAnnouncementPush({
  userId,
  title,
  body,
  url = '/',
  urgent = true,
  saveToDb = false,
}: {
  userId?: string;
  title: string;
  body: string;
  url?: string;
  urgent?: boolean;
  saveToDb?: boolean;
}): Promise<boolean> {
  return triggerRealtimePush({
    userId: userId || 'broadcast',
    title: urgent ? `🚨 Priority: ${title}` : `📢 ${title}`,
    body,
    url,
    type: urgent ? 'admin_priority' : 'admin',
    priority: urgent ? 'urgent' : 'normal',
    requireInteraction: urgent,
    saveToDb,
  });
}

/**
 * Dispatch an instant targeted Quick Message notification to recipient ONLY
 */
export async function sendQuickMessageNotification({
  recipientUserId,
  senderName,
  messagePreview,
  chatUrl,
  urgent = false,
}: {
  recipientUserId: string;
  senderName?: string;
  messagePreview: string;
  chatUrl?: string;
  urgent?: boolean;
}): Promise<void> {
  if (!recipientUserId) return;

  if (urgent) {
    await notifyUrgentMessagePush({
      recipientUserId,
      senderName,
      messagePreview,
      chatUrl: chatUrl || '/inbox',
    });
    return;
  }

  const sender = senderName || 'GGD Member';
  const title = `💬 Quick Message from ${sender}`;
  const body = messagePreview.length > 100 ? `${messagePreview.slice(0, 97)}...` : messagePreview;

  try {
    await supabase.from('notifications').insert({
      user_id: recipientUserId,
      title,
      message: body,
      type: 'chat',
      link_url: chatUrl || '/inbox',
    });
  } catch (err) {
    console.warn('Could not insert message notification:', err);
  }

  try {
    if (db) {
      await addDoc(collection(db, 'notifications'), {
        userId: recipientUserId,
        title,
        body,
        icon: GGD_SITE_LOGO,
        url: chatUrl || '/inbox',
        type: 'chat',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch {}

  dispatchServerWebPush({
    userId: recipientUserId,
    title,
    body,
    url: chatUrl || '/inbox',
    type: 'chat',
    priority: 'normal',
  });
}

/**
 * Utility checks
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isPushEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted' &&
    !isUserPushOptedOut()
  );
}

export function getPushPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
  return Notification.permission;
}

export async function requestPushPermission(userId?: string): Promise<boolean> {
  const res = await registerPushNotification(userId);
  return res.success;
}

export async function showPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  return triggerRealtimePush({ ...payload, saveToDb: false, sendRemotePush: false });
}

export async function broadcastFeaturedProductNotification(product: {
  id: string;
  title: string;
  price?: number;
  image_url?: string;
}): Promise<boolean> {
  const priceDisplay = product.price ? ` — ₦${Number(product.price).toLocaleString()}` : '';
  return triggerRealtimePush({
    title: '🔥 New Blazing Deal Just Featured!',
    body: `Check out "${product.title}"${priceDisplay} on the GGD Marketplace.`,
    icon: product.image_url || GGD_SITE_LOGO,
    url: `/product/${product.id}`,
    type: 'business_status',
  });
}
