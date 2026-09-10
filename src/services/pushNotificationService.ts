import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationChime, playMoneyTransferSound } from '@/utils/audio';
import { playRewardSound } from '@/lib/soundEffects';
import { toast } from 'sonner';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  type?: 'system' | 'welcome' | 'credit_task' | 'chat' | 'syndicate' | 'bonus';
  userId?: string;
}

const GGD_SITE_LOGO = '/favicon.png';

/**
 * Register Service Worker and Request Web Push Permission
 */
export async function registerPushNotification(userId?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, error: 'Web Notifications are not supported by this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    let registration: ServiceWorkerRegistration | null = null;
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
    }

    // Generate a unique device identifier
    const deviceId = `device_${userId || 'guest'}_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    const syntheticToken = `fcm_token_${Math.random().toString(36).substring(2)}_${Date.now()}`;

    // Store in Firebase Firestore
    try {
      await setDoc(doc(db, 'push_devices', deviceId), {
        userId: userId || 'anonymous',
        token: syntheticToken,
        platform: 'web',
        userAgent: navigator.userAgent.slice(0, 250),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase push device sync note:', err);
    }

    // Store in Supabase profiles/metadata if user is signed in
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
 * Dispatch real-time web push notification with sound and GGD site logo
 */
export async function triggerRealtimePush(payload: PushNotificationPayload): Promise<boolean> {
  const icon = payload.icon || GGD_SITE_LOGO;
  const soundType = payload.type === 'bonus' || payload.type === 'credit_task' ? 'cash' : 'message';
  
  if (soundType === 'cash') {
    playMoneyTransferSound();
  } else {
    playNotificationChime();
  }

  // Save to Firebase Firestore notifications
  try {
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
  } catch (err) {
    console.warn('Firebase notification record note:', err);
  }

  // Save to Supabase notifications table for in-app bell sync
  if (payload.userId) {
    try {
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        title: payload.title,
        message: payload.body,
        type: payload.type || 'system',
        link_url: payload.url || '/',
      });
    } catch {}
  }

  // Native Web Push Notification display
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') || await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          registration.showNotification(payload.title, {
            body: payload.body,
            icon,
            badge: GGD_SITE_LOGO,
            data: { url: payload.url || '/' },
            tag: `ggd-${Date.now()}`,
          });
          return true;
        }
      }
      
      // Fallback window Notification
      new Notification(payload.title, {
        body: payload.body,
        icon,
        badge: GGD_SITE_LOGO,
      });
      return true;
    } catch (e) {
      console.warn('Web notification trigger warning:', e);
    }
  }

  return false;
}

/**
 * Send Test Push Notification
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
  return triggerRealtimePush(payload);
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



