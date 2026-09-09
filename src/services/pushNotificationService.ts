import { supabase } from '@/integrations/supabase/client';
import { playNotificationChime } from '@/utils/audio';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

const PUSH_ENABLED_KEY = 'ggd_push_notifications_enabled';

/**
 * Check if the current browser environment supports the Web Notifications API.
 */
export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current push notification permission status.
 */
export const getPushPermission = (): NotificationPermission => {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
};

/**
 * Check if push notifications are enabled and granted.
 */
export const isPushEnabled = (): boolean => {
  if (!isPushSupported()) return false;
  return Notification.permission === 'granted';
};

/**
 * Request permission from the user for push notifications.
 */
export const requestPushPermission = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.warn('Notifications API not supported in this browser environment.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PUSH_ENABLED_KEY, granted ? 'true' : 'false');
    }

    if (granted) {
      showPushNotification({
        title: '🔔 Push Notifications Enabled!',
        body: 'You will now receive real-time updates for new arrivals, messages, and featured items.',
        url: '/',
      });
    }

    return granted;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
};

/**
 * Display a native browser notification (with fallback to sound and console).
 */
export const showPushNotification = (payload: PushNotificationPayload) => {
  try {
    playNotificationChime();
  } catch (_e) {
    // Non-blocking audio
  }

  if (!isPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const icon = payload.icon || '/favicon.ico';
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon,
      badge: payload.badge || icon,
      tag: payload.tag || 'ggd-notification',
    });

    notification.onclick = () => {
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('Native notification failed, falling back:', err);
    return false;
  }
};

/**
 * Broadcast notification when a business features a new product or service.
 * - Stores in database notifications table for platform persistence.
 * - Triggers instant push notification for subscribers.
 */
export const broadcastFeaturedProductNotification = async (listing: {
  id: string;
  title: string;
  business_name?: string;
  price?: number | string;
  image_url?: string;
}) => {
  const priceDisplay = listing.price ? ` (₦${Number(listing.price).toLocaleString()})` : '';
  const business = listing.business_name || 'Accredited Business';
  const title = `🔥 Blazing Feature: ${listing.title}`;
  const body = `${business} just spotlighted "${listing.title}"${priceDisplay}! Check out this new arrival now.`;

  // 1. Show browser push notification to current active user
  showPushNotification({
    title,
    body,
    icon: listing.image_url || '/favicon.ico',
    url: '/#directory',
    tag: `featured-product-${listing.id}`,
  });

  // 2. Insert into database notifications for user persistence
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title,
        message: body,
        type: 'featured_product',
        read: false,
      });
    }
  } catch (err) {
    console.warn('Could not persist featured product notification:', err);
  }
};
