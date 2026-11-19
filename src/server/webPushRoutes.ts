import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateVAPIDKeys, setVapidDetails, sendNotification as sendWebPush } from 'web-push';
import { isValidWebPushSubscription, sanitizePushIconUrl, type WebPushSubscriptionShape } from '../lib/pushPolicy';

const DATA_DIR = path.resolve(process.cwd(), 'uploads');
const VAPID_FILE = path.join(DATA_DIR, '.vapid-keys.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, '.push-subscriptions.json');

interface StoredVapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

type SubscriptionsMap = Record<string, WebPushSubscriptionShape[]>;

let cachedVapid: StoredVapidKeys | null = null;
let subscriptionsCache: SubscriptionsMap | null = null;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function getOrInitVapidKeys(): StoredVapidKeys {
  if (cachedVapid) return cachedVapid;

  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@ggdadnetwork.com';

  if (envPub && envPriv) {
    cachedVapid = { publicKey: envPub, privateKey: envPriv, subject };
  } else {
    ensureDataDir();
    try {
      if (fs.existsSync(VAPID_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
        if (parsed?.publicKey && parsed?.privateKey) {
          cachedVapid = {
            publicKey: parsed.publicKey,
            privateKey: parsed.privateKey,
            subject: parsed.subject || subject,
          };
        }
      }
    } catch {}

    if (!cachedVapid) {
      const generated = generateVAPIDKeys();
      cachedVapid = {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
        subject,
      };
      try {
        fs.writeFileSync(VAPID_FILE, JSON.stringify(cachedVapid, null, 2), 'utf8');
      } catch (err) {
        console.warn('[WebPush] Could not persist generated VAPID keys:', err);
      }
    }
  }

  try {
    setVapidDetails(cachedVapid.subject, cachedVapid.publicKey, cachedVapid.privateKey);
  } catch (err) {
    console.warn('[WebPush] Failed to configure VAPID details:', err);
  }

  return cachedVapid;
}

function loadSubscriptions(): SubscriptionsMap {
  if (subscriptionsCache) return subscriptionsCache;
  ensureDataDir();
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        subscriptionsCache = parsed as SubscriptionsMap;
        return subscriptionsCache;
      }
    }
  } catch {}
  subscriptionsCache = {};
  return subscriptionsCache;
}

function saveSubscriptions(map: SubscriptionsMap): void {
  subscriptionsCache = map;
  ensureDataDir();
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch {}
}

function upsertSubscription(userId: string, sub: WebPushSubscriptionShape): void {
  const map = loadSubscriptions();
  const list = map[userId] || [];
  const filtered = list.filter((item) => item.endpoint !== sub.endpoint);
  filtered.push(sub);
  map[userId] = filtered.slice(-10); // keep up to 10 active devices per user
  saveSubscriptions(map);
}

function removeSubscription(userId: string, endpoint?: string): void {
  const map = loadSubscriptions();
  if (!endpoint) {
    delete map[userId];
  } else if (map[userId]) {
    map[userId] = map[userId].filter((item) => item.endpoint !== endpoint);
    if (map[userId].length === 0) {
      delete map[userId];
    }
  }
  saveSubscriptions(map);
}

async function resolveProfileSubscriptions(
  userId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<WebPushSubscriptionShape[]> {
  const map = loadSubscriptions();
  const result: WebPushSubscriptionShape[] = [...(map[userId] || [])];
  const seen = new Set(result.map((s) => s.endpoint));

  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,has_push_enabled,push_subscription`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    if (resp.ok) {
      const rows = await resp.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row?.has_push_enabled === false) {
            return [];
          }
          const raw = row?.push_subscription;
          const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
          if (isValidWebPushSubscription(parsed) && !seen.has(parsed.endpoint)) {
            seen.add(parsed.endpoint);
            result.push(parsed);
          }
        }
      }
    }
  } catch {}

  return result;
}

export async function sendWebPushNotification({
  userId,
  payload,
  urgency = 'normal',
  ttlSeconds = 3600,
}: {
  userId?: string;
  payload: Record<string, any>;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  ttlSeconds?: number;
}): Promise<{ sent: number; failed: number; totalTargets: number }> {
  getOrInitVapidKeys();

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://sdgxpquruczhkpyhjaxn.supabase.co').trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVydWN6aGtweWhqYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20'
  )
    .trim()
    .replace(/\s+/g, '');

  const isBroadcast = !userId || userId === 'broadcast' || userId === 'all';
  const targetSubs: Array<{ ownerId: string; sub: WebPushSubscriptionShape }> = [];

  if (isBroadcast) {
    const map = loadSubscriptions();
    const seen = new Set<string>();
    for (const [ownerId, subs] of Object.entries(map)) {
      for (const sub of subs) {
        if (!seen.has(sub.endpoint)) {
          seen.add(sub.endpoint);
          targetSubs.push({ ownerId, sub });
        }
      }
    }
  } else {
    const subs = await resolveProfileSubscriptions(userId, supabaseUrl, supabaseKey);
    for (const sub of subs) {
      targetSubs.push({ ownerId: userId, sub });
    }
  }

  if (targetSubs.length === 0) {
    return { sent: 0, failed: 0, totalTargets: 0 };
  }

  const safePayload = {
    ...payload,
    icon: sanitizePushIconUrl(payload.icon || payload.callerAvatar),
  };
  const body = JSON.stringify(safePayload);

  let sent = 0;
  let failed = 0;

  await Promise.all(
    targetSubs.map(async ({ ownerId, sub }) => {
      try {
        await sendWebPush(sub as any, body, {
          TTL: ttlSeconds,
          urgency,
        });
        sent += 1;
      } catch (err: any) {
        failed += 1;
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          removeSubscription(ownerId, sub.endpoint);
        }
      }
    })
  );

  return { sent, failed, totalTargets: targetSubs.length };
}

export function registerWebPushRoutes(app: Express): void {
  // Ensure keys are initialized cleanly on server startup
  getOrInitVapidKeys();

  app.get('/api/push/vapid-public-key', (_req: Request, res: Response) => {
    const keys = getOrInitVapidKeys();
    return res.json({
      enabled: true,
      publicKey: keys.publicKey,
    });
  });

  app.post('/api/push/subscribe', async (req: Request, res: Response) => {
    try {
      const { userId, subscription } = req.body || {};
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'Missing userId' });
      }
      if (!isValidWebPushSubscription(subscription)) {
        return res.status(400).json({ error: 'Invalid Web Push subscription payload' });
      }

      upsertSubscription(userId, subscription);

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://sdgxpquruczhkpyhjaxn.supabase.co').trim();
        const supabaseKey = (
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVydWN6aGtweWhqYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20'
        )
          .trim()
          .replace(/\s+/g, '');

        fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: authHeader,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            has_push_enabled: true,
            push_subscription: subscription,
          }),
        }).catch(() => {});
      }

      return res.json({ success: true, subscribed: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save subscription' });
    }
  });

  app.post('/api/push/unsubscribe', async (req: Request, res: Response) => {
    try {
      const { userId, endpoint } = req.body || {};
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'Missing userId' });
      }

      removeSubscription(userId, typeof endpoint === 'string' ? endpoint : undefined);

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const supabaseUrl = (process.env.VITE_SUPABASE_URL || 'https://sdgxpquruczhkpyhjaxn.supabase.co').trim();
        const supabaseKey = (
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVydWN6aGtweWhqYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20'
        )
          .trim()
          .replace(/\s+/g, '');

        fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: authHeader,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            has_push_enabled: false,
            push_subscription: null,
          }),
        }).catch(() => {});
      }

      return res.json({ success: true, unsubscribed: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to remove subscription' });
    }
  });

  app.post('/api/push/send', async (req: Request, res: Response) => {
    try {
      const {
        userId,
        title,
        body,
        icon,
        url,
        type,
        priority,
        id,
        tag,
        requireInteraction,
      } = req.body || {};

      if (!title || !body) {
        return res.status(400).json({ error: 'Missing title or body' });
      }

      const isUrgent =
        priority === 'high' ||
        priority === 'urgent' ||
        type === 'urgent_message' ||
        type === 'admin_priority' ||
        type === 'call_incoming';

      const result = await sendWebPushNotification({
        userId,
        urgency: isUrgent ? 'high' : 'normal',
        ttlSeconds: isUrgent ? 300 : 3600,
        payload: {
          id,
          tag,
          title,
          body,
          icon,
          url: url || '/',
          type: type || 'system',
          priority: priority || (isUrgent ? 'urgent' : 'normal'),
          requireInteraction: Boolean(requireInteraction ?? isUrgent),
        },
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to dispatch Web Push' });
    }
  });
}
