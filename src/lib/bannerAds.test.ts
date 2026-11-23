import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBannerAdvert,
  getBannerStatus,
  computeBannerStats,
  filterBannerAds,
  buildDuplicateBannerPayload,
  computeBannerCtr,
  getBannerShareUrl,
  generateBannerIdempotencyKey,
  normalizeIdempotencyKey,
  resolveIdempotencyHeaders,
  isDuplicateIdempotencyError,
  isMissingSchemaColumnError,
  coalesceIdempotentRequest,
  type BannerAdRecord,
} from './bannerAds';

const NOW = new Date('2026-06-15T12:00:00.000Z').getTime();

const sampleAds: BannerAdRecord[] = [
  {
    id: 'ad-live-1',
    title: 'Lagos Fashion Mega Sale',
    description: '50% off Ankara & streetwear',
    image_url: 'https://cdn.example.com/banner1.png',
    target_url: 'https://shop.example.com/sale',
    is_active: true,
    approved: true,
    impressions: 1200,
    clicks: 60,
    created_at: '2026-06-10T10:00:00.000Z',
    expires_at: '2026-06-25T10:00:00.000Z',
    ad_type: 'banner',
    source: 'direct',
    target_state: 'Lagos',
    owner_email: 'merchant1@example.com',
  },
  {
    id: 'ad-paused-2',
    title: 'Abuja Real Estate Launch',
    description: 'Luxury apartments in Maitama',
    image_url: null,
    target_url: 'https://homes.example.com',
    is_active: false,
    approved: true,
    impressions: 400,
    clicks: 10,
    created_at: '2026-06-08T10:00:00.000Z',
    expires_at: '2026-06-28T10:00:00.000Z',
    ad_type: 'banner',
    source: 'api',
    owner_email: 'api@example.com',
  },
  {
    id: 'ad-pending-3',
    title: 'Kano Electronics Deal',
    target_url: 'https://tech.example.com',
    is_active: false,
    approved: false,
    impressions: 0,
    clicks: 0,
    created_at: '2026-06-14T10:00:00.000Z',
    expires_at: '2026-06-30T10:00:00.000Z',
    ad_type: 'banner',
    source: 'direct',
  },
  {
    id: 'ad-expired-4',
    title: 'May Promo Banner',
    target_url: 'https://promo.example.com',
    is_active: true,
    approved: true,
    impressions: 800,
    clicks: 24,
    created_at: '2026-05-01T10:00:00.000Z',
    expires_at: '2026-05-30T10:00:00.000Z',
    ad_type: 'banner',
    source: 'direct',
  },
  {
    id: 'watch-task-1',
    title: 'Watch Product Review & Earn',
    target_url: 'https://youtube.com/watch?v=abc123',
    youtube_url: 'https://youtube.com/watch?v=abc123',
    watch_duration_seconds: 30,
    reward_credits: 10,
    budget_credits: 500,
    is_active: true,
    approved: true,
    impressions: 9000,
    clicks: 450,
    created_at: '2026-06-12T10:00:00.000Z',
    ad_type: 'watch',
    source: 'direct',
  },
  {
    id: 'credit-task-2',
    title: 'Share Flyer Credit Task',
    target_url: 'https://example.com/share',
    reward_credits: 5,
    is_active: true,
    approved: true,
    impressions: 300,
    clicks: 30,
    created_at: '2026-06-13T10:00:00.000Z',
    ad_type: 'credit_task',
    source: 'direct',
  },
];

test('isBannerAdvert excludes watch-to-earn and credit-task records', () => {
  assert.equal(isBannerAdvert(sampleAds[0]), true);
  assert.equal(isBannerAdvert(sampleAds[1]), true);
  assert.equal(isBannerAdvert({ ad_type: '', title: 'Legacy Banner', target_url: 'https://a.com', created_at: '' }), true);
  assert.equal(isBannerAdvert(sampleAds[4]), false);
  assert.equal(isBannerAdvert(sampleAds[5]), false);
  assert.equal(isBannerAdvert({ ad_type: 'banner', youtube_url: 'https://youtu.be/xyz' }), false);
  assert.equal(isBannerAdvert({ ad_type: 'banner', reward_credits: 15 }), false);
  assert.equal(isBannerAdvert({ ad_type: 'banner', watch_duration_seconds: 20 }), false);
});

test('getBannerStatus derives expired, active, pending, rejected, and paused accurately', () => {
  assert.equal(getBannerStatus(sampleAds[0], NOW), 'active');
  assert.equal(getBannerStatus(sampleAds[1], NOW), 'paused');
  assert.equal(getBannerStatus(sampleAds[2], NOW), 'pending');
  assert.equal(getBannerStatus(sampleAds[3], NOW), 'expired');
  assert.equal(
    getBannerStatus({ ...sampleAds[2], rejection_reason: 'Broken URL' }, NOW),
    'rejected'
  );
});

test('computeBannerStats excludes credit/watch tasks from counts and totals', () => {
  const stats = computeBannerStats(sampleAds, NOW);
  assert.equal(stats.total, 4);
  assert.equal(stats.active, 1);
  assert.equal(stats.paused, 1);
  assert.equal(stats.pending, 1);
  assert.equal(stats.expired, 1);
  assert.equal(stats.inactive, 2);
  assert.equal(stats.api, 1);
  assert.equal(stats.direct, 3);
  assert.equal(stats.totalImpressions, 2400);
  assert.equal(stats.totalClicks, 94);
  assert.equal(stats.avgCtr, '3.9');
});

test('filterBannerAds filters by status, source, placement, and search while omitting tasks', () => {
  assert.equal(filterBannerAds(sampleAds, { status: 'all', nowMs: NOW }).length, 4);
  assert.equal(filterBannerAds(sampleAds, { status: 'active', nowMs: NOW }).length, 1);
  assert.equal(filterBannerAds(sampleAds, { status: 'inactive', nowMs: NOW }).length, 2);
  assert.equal(filterBannerAds(sampleAds, { source: 'api', nowMs: NOW }).length, 1);
  assert.equal(filterBannerAds(sampleAds, { placement: 'state', nowMs: NOW }).length, 1);
  assert.equal(filterBannerAds(sampleAds, { placement: 'national', nowMs: NOW }).length, 3);
  assert.equal(filterBannerAds(sampleAds, { search: 'watch', nowMs: NOW }).length, 0);
  assert.equal(filterBannerAds(sampleAds, { search: 'lagos', nowMs: NOW }).length, 1);
});

test('buildDuplicateBannerPayload creates clean banner-only draft payload', () => {
  const payload = buildDuplicateBannerPayload(sampleAds[0], 'user-99');
  assert.equal(payload.user_id, 'user-99');
  assert.equal(payload.title, 'Lagos Fashion Mega Sale (Copy)');
  assert.equal(payload.ad_type, 'banner');
  assert.equal(payload.is_active, false);
  assert.equal(payload.approved, false);
  assert.equal('reward_credits' in payload, false);
  assert.equal('youtube_url' in payload, false);

  const secondCopy = buildDuplicateBannerPayload({ ...sampleAds[0], title: payload.title }, 'user-99');
  assert.equal(secondCopy.title, 'Lagos Fashion Mega Sale (Copy)');
});

test('computeBannerCtr and getBannerShareUrl handle edge cases', () => {
  assert.equal(computeBannerCtr(0, 0), '0.0');
  assert.equal(computeBannerCtr(200, 5), '2.5');
  assert.equal(getBannerShareUrl({ target_url: 'https://ggd.ng/offer' }, 'https://ggd.ng'), 'https://ggd.ng/offer');
  assert.equal(getBannerShareUrl({ target_url: '#' }, 'https://ggd.ng'), 'https://ggd.ng');
});

test('generateBannerIdempotencyKey creates unique keys per attempt', () => {
  const k1 = generateBannerIdempotencyKey('banner');
  const k2 = generateBannerIdempotencyKey('banner');
  assert.ok(k1.startsWith('banner_'));
  assert.ok(k2.startsWith('banner_'));
  assert.notEqual(k1, k2);
  assert.ok(k1.length <= 128);
});

test('normalizeIdempotencyKey and resolveIdempotencyHeaders sanitize input', () => {
  assert.equal(normalizeIdempotencyKey('  key-123  '), 'key-123');
  assert.equal(normalizeIdempotencyKey('   '), null);
  assert.equal(normalizeIdempotencyKey(null), null);
  assert.equal(normalizeIdempotencyKey('x'.repeat(129)), null);
  assert.deepEqual(resolveIdempotencyHeaders('  abc-1  '), { 'Idempotency-Key': 'abc-1' });
  assert.deepEqual(resolveIdempotencyHeaders(''), {});
});

test('isDuplicateIdempotencyError and isMissingSchemaColumnError classify DB errors', () => {
  assert.equal(isDuplicateIdempotencyError({ code: '23505', message: 'duplicate key value' }), true);
  assert.equal(isDuplicateIdempotencyError({ status: 409, message: 'Conflict' }), true);
  assert.equal(isDuplicateIdempotencyError({ code: '42703', message: 'column does not exist' }), false);
  assert.equal(isMissingSchemaColumnError({ code: '42703', message: 'column does not exist' }), true);
  assert.equal(isMissingSchemaColumnError({ code: 'PGRST204', message: 'schema cache' }), true);
});

test('buildDuplicateBannerPayload optionally attaches idempotency_key', () => {
  const payload = buildDuplicateBannerPayload(sampleAds[0], 'user-99', 'dup-key-42');
  assert.equal(payload.idempotency_key, 'dup-key-42');
});

test('coalesceIdempotentRequest executes once for concurrent identical keys', async () => {
  const map = new Map<string, Promise<{ id: string }>>();
  let runs = 0;
  const factory = async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 10));
    return { id: `created-${runs}` };
  };

  const [a, b, c] = await Promise.all([
    coalesceIdempotentRequest(map, 'same-key', factory),
    coalesceIdempotentRequest(map, 'same-key', factory),
    coalesceIdempotentRequest(map, 'same-key', factory),
  ]);

  assert.equal(runs, 1);
  assert.deepEqual(a, { id: 'created-1' });
  assert.deepEqual(b, { id: 'created-1' });
  assert.deepEqual(c, { id: 'created-1' });
});

