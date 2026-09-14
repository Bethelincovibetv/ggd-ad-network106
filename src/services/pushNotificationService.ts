import { db } from '@/lib/firebase';
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationChime, playMoneyTransferSound } from '@/utils/audio';
import { toast } from 'sonner';

export interface PushNotificationPayload {
  id?: string;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type?: 'system' | 'welcome' | 'credit_task' | 'chat' | 'message' | 'urgent_message' | 'syndicate' | 'bonus';
  userId?: string;
  saveToDb?: boolean;
}

const GGD_SITE_LOGO = '/favicon.png';

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Ensures Service Worker is registered and ready
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    if (swRegistration && swRegistration.active) return swRegistration;

    // Check existing registration first
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing && existing.active) {
      swRegistration = existing;
      return existing;
    }

    // Register sw.js
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    swRegistration = registration;
    return registration;
  } catch (err) {
    console.warn('Service worker registration fallback:', err);
    try {
      const fallbackReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      swRegistration = fallbackReg;
      return fallbackReg;
    } catch (fbErr) {
      console.warn('Fallback SW registration error:', fbErr);
      return null;
    }
  }
}

/**
 * Register Service Worker and Request Web Push Permission
 */
export async function registerPushNotification(userId?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Web Notifications are not supported by this browser.' };
  }

  try {
    let permission: NotificationPermission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch {
        // Fallback for older browsers using callback pattern
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((p) => resolve(p));
        });
      }
    }

    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    const registration = await getOrRegisterServiceWorker();

    // Generate unique device identifier
    const deviceId = `device_${userId || 'guest'}_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    const syntheticToken = `fcm_token_${Math.random().toString(36).substring(2)}_${Date.now()}`;

    // Store in Firebase Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'push_devices', deviceId), {
          userId: userId || 'anonymous',
          token: syntheticToken,
          platform: 'web',
          userAgent: navigator.userAgent.slice(0, 250),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firebase push device sync note:', err);
    }

    // Store in Supabase profiles if user is signed in
    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({ has_push_enabled: true } as any)
          .eq('user_id', userId);
      } catch {}
    }

    localStorage.setItem('ggd_push_registered', 'true');
    return { success: true, token: syntheticToken };
  } catch (error: any) {
    console.error('Error registering push notification:', error);
    return { success: false, error: error?.message || 'Failed to enable push notifications' };
  }
}

/**
 * Dispatch real-time notification with sound, vibration, native push, in-app toast, and persistence
 */
export async function triggerRealtimePush(payload: PushNotificationPayload): Promise<boolean> {
  const icon = payload.icon || GGD_SITE_LOGO;
  const soundType = payload.type === 'bonus' || payload.type === 'credit_task' ? 'cash' : 'message';
  
  // 1. Play sound
  try {
    if (soundType === 'cash') {
      playMoneyTransferSound();
    } else {
      playNotificationChime();
    }
  } catch {}

  // 2. Device vibration if supported
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 75, 150]);
    }
  } catch {}

  // 3. Dispatch global browser custom event for instant in-app notification badge sync
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ggd-push-notification', { detail: payload }));
    }
  } catch {}

  // 4. In-app interactive Toast so users never miss an alert and can read full message immediately
  const notifId = payload.id || `push-${Date.now()}`;
  const targetUrl = payload.url || `/?tab=notifications&notificationId=${encodeURIComponent(notifId)}`;

  toast(payload.title, {
    description: payload.body,
    action: {
      label: 'Read Full Message',
      onClick: () => {
        if (typeof window !== 'undefined') {
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

  // 5. Save to Firebase Firestore notifications
  try {
    if (db && payload.saveToDb !== false) {
      await addDoc(collection(db, 'notifications'), {
        userId: payload.userId || 'broadcast',
        title: payload.title,
        body: payload.body,
        icon,
        url: payload.url || '/',
        type: payload.type || 'system',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firebase notification record note:', err);
  }

  // 6. Save to Supabase notifications table if requested
  if (payload.userId && payload.saveToDb !== false) {
    try {
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        title: payload.title,
        message: payload.body,
        type: payload.type || 'system',
        link_url: payload.url || '/',
      });
    } catch (err) {
      console.warn('Supabase notification insert note:', err);
    }
  }

  // 7. Native Web Push / ServiceWorker Notification display
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await getOrRegisterServiceWorker();
      if (reg) {
        if (reg.showNotification) {
          await reg.showNotification(payload.title, {
            body: payload.body,
            icon,
            badge: GGD_SITE_LOGO,
            data: { url: payload.url || '/' },
            tag: `ggd-${Date.now()}`,
          });
          return true;
        }
        if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: payload.title,
            body: payload.body,
            icon,
            badge: GGD_SITE_LOGO,
            url: payload.url || '/',
            type: payload.type,
          });
          return true;
        }
      }
      
      // Fallback window Notification (guarded against Android/mobile Illegal Constructor)
      if (typeof window.Notification === 'function') {
        try {
          new Notification(payload.title, {
            body: payload.body,
            icon,
            badge: GGD_SITE_LOGO,
          });
          return true;
        } catch (constrErr) {
          console.debug('Direct Notification constructor skipped:', constrErr);
        }
      }
    } catch (e) {
      console.warn('Web notification trigger warning:', e);
    }
  }

  return true;
}

/**
 * Dispatch an instant Quick Message notification to recipient
 */
export async function sendQuickMessageNotification({
  recipientUserId,
  senderName,
  messagePreview,
  chatUrl,
}: {
  recipientUserId: string;
  senderName?: string;
  messagePreview: string;
  chatUrl?: string;
}): Promise<void> {
  const sender = senderName || 'GGD Member';
  const title = `💬 Quick Message from ${sender}`;
  const body = messagePreview.length > 100 ? `${messagePreview.slice(0, 97)}...` : messagePreview;

  // Insert notification into recipient's database record
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

  // Also trigger active push sound + banner
  await triggerRealtimePush({
    userId: recipientUserId,
    title,
    body,
    type: 'chat',
    url: chatUrl || '/inbox',
    saveToDb: false, // Already inserted above
  });
}

/**
 * Utility checks
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isPushEnabled(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
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
  return triggerRealtimePush({ ...payload, saveToDb: false });
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
    type: 'system',
  });
}




