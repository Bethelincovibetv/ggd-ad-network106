export interface BannerAdRecord {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_url: string;
  is_active?: boolean | null;
  impressions?: number | null;
  clicks?: number | null;
  user_id?: string;
  created_at: string;
  expires_at?: string | null;
  source?: string;
  owner_email?: string;
  approved?: boolean | null;
  rejection_reason?: string | null;
  ad_type?: string | null;
  target_state?: string | null;
  youtube_url?: string | null;
  watch_duration_seconds?: number | null;
  reward_credits?: number | null;
  budget_credits?: number | null;
  idempotency_key?: string | null;
  external_reference?: string | null;
  duration_days?: number | null;
}

export type BannerStatus = 'active' | 'paused' | 'pending' | 'rejected' | 'expired';
export type BannerStatusFilter = 'all' | BannerStatus | 'inactive';
export type BannerSourceFilter = 'all' | 'api' | 'direct';

const EXCLUDED_AD_TYPES = new Set([
  'watch',
  'task',
  'credit_task',
  'credit-task',
  'earn_task',
  'earn-task',
  'video_task',
  'video',
  'syndicate',
]);

/**
 * Returns true strictly for Banner Adverts and excludes Credit Tasks,
 * Watch-to-Earn video tasks, or task-reward entries.
 */
export function isBannerAdvert(ad: Partial<BannerAdRecord> | null | undefined): boolean {
  if (!ad) return false;
  const rawType = typeof ad.ad_type === 'string' ? ad.ad_type.trim().toLowerCase() : '';
  if (rawType && EXCLUDED_AD_TYPES.has(rawType)) {
    return false;
  }
  if (typeof ad.youtube_url === 'string' && ad.youtube_url.trim().length > 0) {
    return false;
  }
  if (typeof ad.reward_credits === 'number' && ad.reward_credits > 0) {
    return false;
  }
  if (typeof ad.watch_duration_seconds === 'number' && ad.watch_duration_seconds > 0) {
    return false;
  }
  return true;
}

export function isBannerExpired(ad: Pick<BannerAdRecord, 'expires_at'>, nowMs = Date.now()): boolean {
  if (!ad.expires_at) return false;
  const ts = new Date(ad.expires_at).getTime();
  return Number.isFinite(ts) && ts < nowMs;
}

export function getBannerStatus(ad: BannerAdRecord, nowMs = Date.now()): BannerStatus {
  if (isBannerExpired(ad, nowMs)) return 'expired';
  if (ad.is_active) return 'active';
  if (ad.rejection_reason && ad.rejection_reason.trim().length > 0) return 'rejected';
  if (ad.approved === false) return 'pending';
  return 'paused';
}

export function getBannerDaysLeft(ad: Pick<BannerAdRecord, 'expires_at'>, nowMs = Date.now()): number | null {
  if (!ad.expires_at) return null;
  const ts = new Date(ad.expires_at).getTime();
  if (!Number.isFinite(ts)) return null;
  const diff = ts - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export function computeBannerCtr(impressions?: number | null, clicks?: number | null): string {
  const imp = Math.max(0, Number(impressions) || 0);
  const clk = Math.max(0, Number(clicks) || 0);
  if (imp === 0) return '0.0';
  return ((clk / imp) * 100).toFixed(1);
}

export interface BannerStatsSummary {
  total: number;
  active: number;
  paused: number;
  pending: number;
  rejected: number;
  expired: number;
  inactive: number;
  api: number;
  direct: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: string;
}

export function computeBannerStats(ads: BannerAdRecord[], nowMs = Date.now()): BannerStatsSummary {
  const banners = ads.filter(isBannerAdvert);
  let active = 0;
  let paused = 0;
  let pending = 0;
  let rejected = 0;
  let expired = 0;
  let api = 0;
  let direct = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  for (const ad of banners) {
    const status = getBannerStatus(ad, nowMs);
    if (status === 'active') active++;
    else if (status === 'expired') expired++;
    else if (status === 'pending') pending++;
    else if (status === 'rejected') rejected++;
    else paused++;

    if (ad.source === 'api') api++;
    else direct++;

    totalImpressions += Math.max(0, Number(ad.impressions) || 0);
    totalClicks += Math.max(0, Number(ad.clicks) || 0);
  }

  return {
    total: banners.length,
    active,
    paused,
    pending,
    rejected,
    expired,
    inactive: paused + pending + rejected,
    api,
    direct,
    totalImpressions,
    totalClicks,
    avgCtr: computeBannerCtr(totalImpressions, totalClicks),
  };
}

export interface FilterBannerOptions {
  status?: BannerStatusFilter;
  source?: BannerSourceFilter;
  search?: string;
  placement?: 'all' | 'national' | 'state';
  nowMs?: number;
}

export function filterBannerAds<T extends BannerAdRecord>(
  ads: T[],
  options: FilterBannerOptions = {}
): T[] {
  const {
    status = 'all',
    source = 'all',
    search = '',
    placement = 'all',
    nowMs = Date.now(),
  } = options;

  const q = search.trim().toLowerCase();

  return ads.filter((ad) => {
    if (!isBannerAdvert(ad)) return false;

    const adStatus = getBannerStatus(ad, nowMs);
    if (status === 'inactive') {
      if (adStatus === 'active' || adStatus === 'expired') return false;
    } else if (status !== 'all' && adStatus !== status) {
      return false;
    }

    if (source !== 'all' && (ad.source || 'direct') !== source) {
      return false;
    }

    if (placement === 'national' && ad.target_state && ad.target_state.trim().length > 0) {
      return false;
    }
    if (placement === 'state' && (!ad.target_state || ad.target_state.trim().length === 0)) {
      return false;
    }

    if (q) {
      const hay = [
        ad.title,
        ad.description,
        ad.target_url,
        ad.owner_email,
        ad.target_state,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function generateBannerIdempotencyKey(prefix = 'banner'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'banner';
  const uuid =
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${cleanPrefix}_${uuid}`.slice(0, 128);
}

export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}

export function resolveIdempotencyHeaders(idempotencyKey?: string | null): Record<string, string> {
  const normalized = normalizeIdempotencyKey(idempotencyKey);
  return normalized ? { 'Idempotency-Key': normalized } : {};
}

export function isDuplicateIdempotencyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; status?: unknown; message?: unknown };
  const code = String(record.code || '').trim();
  const status = Number(record.status || 0);
  const message = String(record.message || '').toLowerCase();
  return (
    code === '23505' ||
    status === 409 ||
    message.includes('duplicate key') ||
    message.includes('unique constraint')
  );
}

export function isMissingSchemaColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; message?: unknown };
  const code = String(record.code || '').trim();
  const message = String(record.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
}

export function coalesceIdempotentRequest<T>(
  inFlightMap: Map<string, Promise<T>>,
  key: string,
  task: () => Promise<T>
): Promise<T> {
  const normalized = normalizeIdempotencyKey(key);
  if (!normalized) return task();
  const existing = inFlightMap.get(normalized);
  if (existing) return existing;
  const promise = Promise.resolve()
    .then(task)
    .finally(() => {
      inFlightMap.delete(normalized);
    });
  inFlightMap.set(normalized, promise);
  return promise;
}

export function buildDuplicateBannerPayload(
  ad: BannerAdRecord,
  userId: string,
  idempotencyKey?: string
) {
  const payload: {
    user_id: string;
    title: string;
    description: string;
    image_url: string | null;
    target_url: string;
    target_state: string | null;
    ad_type: string;
    is_active: boolean;
    approved: boolean;
    idempotency_key?: string;
  } = {
    user_id: userId,
    title: `${ad.title.replace(/\s*\(Copy\)$/i, '')} (Copy)`,
    description: ad.description || '',
    image_url: ad.image_url || null,
    target_url: ad.target_url || '#',
    target_state: ad.target_state || null,
    ad_type: 'banner',
    is_active: false,
    approved: false,
  };

  const normalized = normalizeIdempotencyKey(idempotencyKey);
  if (normalized) {
    payload.idempotency_key = normalized;
  }

  return payload;
}

export function getBannerShareUrl(ad: Pick<BannerAdRecord, 'target_url'>, fallbackOrigin: string): string {
  const raw = (ad.target_url || '').trim();
  if (raw && raw !== '#' && /^https?:\/\//i.test(raw)) {
    return raw;
  }
  return fallbackOrigin;
}
