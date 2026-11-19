export type PushCategory =
  | 'system'
  | 'welcome'
  | 'credit_task'
  | 'task_status'
  | 'chat'
  | 'message'
  | 'urgent_message'
  | 'syndicate'
  | 'bonus'
  | 'admin'
  | 'admin_priority'
  | 'credit_transfer'
  | 'wallet_credit'
  | 'ad_status'
  | 'business_status'
  | 'call_incoming'
  | 'call';

export type PushPriority = 'normal' | 'high' | 'urgent';

export interface NotificationPolicyInput {
  permission: NotificationPermission | 'unsupported';
  userOptedOut: boolean;
  isTabFocused: boolean;
  isCall: boolean;
  isDuplicate: boolean;
}

export interface NotificationSpecInput {
  id?: string;
  tag?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  type?: PushCategory | string;
  priority?: PushPriority;
  requireInteraction?: boolean;
  callId?: string;
  callType?: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
  isCall?: boolean;
}

export interface WebPushSubscriptionShape {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const DEFAULT_ICON = '/favicon.png';

/**
 * Sanitizes an avatar or icon URL for OS/Web Push payloads.
 * Rejects oversized inline data: URLs that bloat push payloads or fail SW display.
 */
export function sanitizePushIconUrl(raw?: string | null, fallback = DEFAULT_ICON): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('data:')) return fallback;
  if (trimmed.length > 500) return fallback;
  return trimmed;
}

/**
 * Pure check deciding whether a native browser/OS notification should be displayed.
 * Rules:
 * - Requires browser 'granted' permission, user NOT opted out, and NOT a duplicate.
 * - Active focused tab: suppresses OS push notifications (already shown in-app via toast/bell/banner).
 * - Hidden or unfocused tab (or closed app): shows OS push notifications for all alerts and calls.
 */
export function shouldDisplayNativeNotification(input: NotificationPolicyInput): boolean {
  if (input.permission !== 'granted') return false;
  if (input.userOptedOut) return false;
  if (input.isDuplicate) return false;
  if (input.isTabFocused) return false;
  return true;
}

/**
 * Determines whether a notification represents a high-priority or urgent alert.
 */
export function isHighPriorityNotification(type?: string, priority?: PushPriority): boolean {
  if (priority === 'high' || priority === 'urgent') return true;
  return (
    type === 'urgent_message' ||
    type === 'admin_priority' ||
    type === 'call_incoming' ||
    type === 'call'
  );
}

/**
 * Constructs canonical deep-link URL for incoming call notification clicks.
 */
export function resolveCallDeepLinkUrl(callId: string, action: 'accept' | 'decline' = 'accept'): string {
  const safeCallId = encodeURIComponent(callId || '');
  const safeAction = action === 'decline' ? 'decline' : 'accept';
  return `/?callId=${safeCallId}&action=${safeAction}`;
}

/**
 * Parses URL search parameters or notification payload to extract call click directives.
 */
export function parseCallActionFromSearch(search: string): { callId: string; action: 'accept' | 'decline' } | null {
  if (!search) return null;
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const callId = params.get('callId')?.trim();
    if (!callId) return null;
    const rawAction = params.get('action');
    return {
      callId,
      action: rawAction === 'decline' ? 'decline' : 'accept',
    };
  } catch {
    return null;
  }
}

/**
 * Builds deterministic Service Worker showNotification options for any GGD activity.
 */
export function buildServiceWorkerNotificationSpec(input: NotificationSpecInput): {
  title: string;
  options: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
    actions?: Array<{ action: string; title: string }>;
  };
} {
  const isCall = Boolean(
    input.isCall || input.type === 'call_incoming' || input.type === 'call'
  );

  if (isCall) {
    const callTypeLabel = input.callType === 'video' ? 'Video' : 'Audio';
    const callerLabel = (input.callerName || 'GGD Member').trim() || 'GGD Member';
    const callId = input.callId || '';
    const tag = callId ? `call-${callId}` : input.tag || 'call-incoming';
    const icon = sanitizePushIconUrl(input.callerAvatar || input.icon, DEFAULT_ICON);

    return {
      title: input.title || `Incoming ${callTypeLabel} Call from ${callerLabel}`,
      options: {
        body:
          input.body ||
          `${callerLabel} is calling you (${callTypeLabel}). Tap to answer or decline.`,
        icon,
        badge: input.badge || DEFAULT_ICON,
        tag,
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500, 250],
        data: {
          url: callId ? resolveCallDeepLinkUrl(callId, 'accept') : input.url || '/',
          declineUrl: callId ? resolveCallDeepLinkUrl(callId, 'decline') : '/',
          callId,
          callType: input.callType || 'audio',
          callerName: callerLabel,
          isCall: true,
        },
        actions: [
          { action: 'answer', title: 'Accept Call' },
          { action: 'decline', title: 'Decline' },
        ],
      },
    };
  }

  const urgent = isHighPriorityNotification(input.type, input.priority);
  const icon = sanitizePushIconUrl(input.icon, DEFAULT_ICON);
  const tag =
    input.tag ||
    (input.id ? `ggd-${input.id}` : `ggd-${input.type || 'alert'}-${input.title.slice(0, 24)}`);

  return {
    title: input.title || 'GGD Ad Network',
    options: {
      body: input.body || 'You have a new update on GGD Ad Network.',
      icon,
      badge: input.badge || DEFAULT_ICON,
      tag,
      renotify: urgent,
      requireInteraction: Boolean(input.requireInteraction ?? urgent),
      vibrate: urgent ? [300, 120, 300, 120, 300] : [200, 100, 200],
      data: {
        id: input.id,
        url: input.url || '/',
        type: input.type || 'system',
        priority: input.priority || (urgent ? 'urgent' : 'normal'),
        isCall: false,
      },
      actions: [
        { action: 'open', title: urgent ? 'Open Urgent Alert' : 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    },
  };
}

/**
 * Validates that a PushSubscription JSON object contains valid endpoint and encryption keys.
 */
export function isValidWebPushSubscription(sub: unknown): sub is WebPushSubscriptionShape {
  if (!sub || typeof sub !== 'object') return false;
  const candidate = sub as Record<string, any>;
  if (typeof candidate.endpoint !== 'string' || !candidate.endpoint.startsWith('https://')) {
    return false;
  }
  if (!candidate.keys || typeof candidate.keys !== 'object') return false;
  return (
    typeof candidate.keys.p256dh === 'string' &&
    candidate.keys.p256dh.length > 0 &&
    typeof candidate.keys.auth === 'string' &&
    candidate.keys.auth.length > 0
  );
}

/**
 * TTL-based deduplication tracker shared across Bell, NotificationsPage, and push dispatcher.
 */
export class NotificationDeduplicator {
  private readonly seen = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs = 30_000) {
    this.ttlMs = ttlMs;
  }

  public prune(nowMs: number): void {
    for (const [key, expiresAt] of this.seen.entries()) {
      if (expiresAt <= nowMs) {
        this.seen.delete(key);
      }
    }
  }

  /**
   * Returns true if the key has NOT been seen within TTL (and records it);
   * returns false if it IS a duplicate within the TTL window.
   */
  public markIfNew(key: string, nowMs = Date.now()): boolean {
    this.prune(nowMs);
    if (!key) return true;
    const existingExpiry = this.seen.get(key);
    if (existingExpiry && existingExpiry > nowMs) {
      return false;
    }
    this.seen.set(key, nowMs + this.ttlMs);
    return true;
  }

  public hasSeen(key: string, nowMs = Date.now()): boolean {
    this.prune(nowMs);
    const exp = this.seen.get(key);
    return Boolean(exp && exp > nowMs);
  }

  public clear(): void {
    this.seen.clear();
  }
}

/**
 * Builds a canonical deduplication key so Supabase realtime Bell, NotificationsPage,
 * local dispatcher, and SW push do not alert twice for the same notification record.
 */
export function buildNotificationDedupKey(params: {
  id?: string | null;
  userId?: string | null;
  type?: string | null;
  title?: string | null;
  body?: string | null;
}): string {
  const rawId = params.id?.trim();
  if (rawId && !rawId.startsWith('push-')) {
    return `id:${rawId}`;
  }
  const t = (params.type || 'system').trim().toLowerCase();
  const u = (params.userId || 'self').trim();
  const title = (params.title || '').trim().toLowerCase();
  const body = (params.body || '').trim().toLowerCase().slice(0, 120);
  return `sig:${t}:${u}:${title}:${body}`;
}
