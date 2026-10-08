import { supabase } from "@/integrations/supabase/client";

export type RedeemType = 'airtime' | 'data';
export type NetworkProvider = 'mtn' | 'airtel' | 'glo' | '9mobile' | 'all';

export interface RedeemOffer {
  id: string;
  title: string;
  description: string;
  app_link: string; // The URL/tool user accesses upon redeeming
  image_url?: string;
  credit_cost: number;
  is_free?: boolean;
  is_active: boolean;
  sort_order: number;
  type: RedeemType;
  network: NetworkProvider;
  denomination?: string; // e.g. "1GB", "2GB", "₦500", "₦1,000"
  instructions?: string;
  created_at?: string;
}

export interface UserRedemptionRecord {
  id: string;
  offerId: string;
  offerTitle: string;
  type: RedeemType;
  network: NetworkProvider;
  creditCost: number;
  appLink: string;
  redeemedAt: string;
  userId: string;
  userEmail?: string;
}

const REDEEM_PLACEMENT_KEY = 'airtime_data_redeem';
const REDEEM_META_SETTINGS_KEY = 'airtime_data_redeem_meta';
const REDEEM_LOGS_SETTINGS_KEY = 'airtime_data_redeem_logs';

export const NETWORK_THEMES: Record<NetworkProvider, {
  name: string;
  gradient: string;
  badgeBg: string;
  badgeText: string;
  accentBorder: string;
  lightBg: string;
  color: string;
}> = {
  mtn: {
    name: 'MTN Nigeria',
    gradient: 'from-amber-400 via-yellow-400 to-amber-500',
    badgeBg: 'bg-amber-400/20 text-amber-800 dark:text-amber-300 border-amber-400/40',
    badgeText: 'text-amber-950 dark:text-amber-200',
    accentBorder: 'hover:border-amber-400/60',
    lightBg: 'bg-amber-500/10',
    color: '#FFCC00',
  },
  airtel: {
    name: 'Airtel Nigeria',
    gradient: 'from-red-500 via-rose-500 to-red-600',
    badgeBg: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40',
    badgeText: 'text-red-700 dark:text-red-200',
    accentBorder: 'hover:border-red-500/60',
    lightBg: 'bg-red-500/10',
    color: '#E60000',
  },
  glo: {
    name: 'Glo (Globacom)',
    gradient: 'from-emerald-500 via-green-500 to-teal-600',
    badgeBg: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    accentBorder: 'hover:border-emerald-500/60',
    lightBg: 'bg-emerald-500/10',
    color: '#00A859',
  },
  '9mobile': {
    name: '9mobile',
    gradient: 'from-teal-600 via-emerald-600 to-emerald-700',
    badgeBg: 'bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-500/40',
    badgeText: 'text-teal-800 dark:text-teal-200',
    accentBorder: 'hover:border-teal-500/60',
    lightBg: 'bg-teal-500/10',
    color: '#00693E',
  },
  all: {
    name: 'Multi-Network',
    gradient: 'from-purple-500 via-indigo-500 to-blue-600',
    badgeBg: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/40',
    badgeText: 'text-indigo-800 dark:text-indigo-200',
    accentBorder: 'hover:border-indigo-500/60',
    lightBg: 'bg-indigo-500/10',
    color: '#6366F1',
  },
};

// Seed initial marketplace offers
export const DEFAULT_REDEEM_OFFERS: RedeemOffer[] = [
  {
    id: 'seed-mtn-data-1gb',
    title: 'MTN 1GB Direct SME Data',
    description: 'Instant 30-day high-speed data for all MTN lines. Unlock to claim via instant recharge portal.',
    app_link: 'https://topup.mtn.ng',
    credit_cost: 5,
    is_active: true,
    sort_order: 1,
    type: 'data',
    network: 'mtn',
    denomination: '1GB Data',
    instructions: 'Enter your phone number in the portal to receive instant top-up within seconds.',
  },
  {
    id: 'seed-mtn-airtime-500',
    title: 'MTN ₦500 Talktime Recharge',
    description: 'Instant ₦500 airtime credit voucher. Redeem with wallet credits to access claim tool.',
    app_link: 'https://topup.mtn.ng',
    credit_cost: 5,
    is_active: true,
    sort_order: 2,
    type: 'airtime',
    network: 'mtn',
    denomination: '₦500 Airtime',
    instructions: 'Access your instant airtime dispensing portal using the unlocked button.',
  },
  {
    id: 'seed-airtel-data-2gb',
    title: 'Airtel 2.5GB Super Speed Data',
    description: 'Generous 30-day data bundle for browsing, streaming, and work. Valid on all Airtel SIMs.',
    app_link: 'https://airtel.com.ng/recharge',
    credit_cost: 10,
    is_active: true,
    sort_order: 3,
    type: 'data',
    network: 'airtel',
    denomination: '2.5GB Data',
    instructions: 'Redeem now and click the claim portal to input your Airtel number.',
  },
  {
    id: 'seed-airtel-airtime-1000',
    title: 'Airtel ₦1,000 Instant Airtime Voucher',
    description: 'Redeem 10 wallet credits to access your ₦1,000 Airtel recharge dispenser & direct voucher.',
    app_link: 'https://airtel.com.ng/recharge',
    credit_cost: 10,
    is_active: true,
    sort_order: 4,
    type: 'airtime',
    network: 'airtel',
    denomination: '₦1,000 Airtime',
    instructions: 'Follow the unlocked link to submit your mobile number for instant disbursement.',
  },
  {
    id: 'seed-glo-data-2gb',
    title: 'Glo 2GB Super Fast Data',
    description: 'Reliable Glo data bundle with 30-day validity. Instant claim tool unlocked upon redemption.',
    app_link: 'https://hsi.glo.com',
    credit_cost: 8,
    is_active: true,
    sort_order: 5,
    type: 'data',
    network: 'glo',
    denomination: '2GB Data',
    instructions: 'Use the redeemed tool link to enter your Glo SIM number.',
  },
  {
    id: 'seed-9mobile-airtime-500',
    title: '9mobile ₦500 Quick Airtime',
    description: 'Redeem 5 credits to unlock direct 9mobile airtime top-up tool and activation voucher.',
    app_link: 'https://9mobile.com.ng',
    credit_cost: 5,
    is_active: true,
    sort_order: 6,
    type: 'airtime',
    network: '9mobile',
    denomination: '₦500 Airtime',
    instructions: 'Click the unlocked tool link to disburse your 9mobile airtime.',
  },
];

// Helper to get local backup offers
function getLocalFallbackOffers(): RedeemOffer[] {
  try {
    const raw = localStorage.getItem('ggd_redeem_offers');
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_REDEEM_OFFERS;
}

function saveLocalFallbackOffers(offers: RedeemOffer[]) {
  try {
    localStorage.setItem('ggd_redeem_offers', JSON.stringify(offers));
  } catch {}
}

/**
 * Fetch all redeem offers from Supabase marketing_apps with placement 'airtime_data_redeem'
 * merged with metadata from app_settings
 */
export async function getRedeemOffers(): Promise<RedeemOffer[]> {
  try {
    const [appsRes, placementsRes, metaRes] = await Promise.all([
      supabase
        .from('marketing_apps')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'marketing_apps_placements')
        .maybeSingle(),
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', REDEEM_META_SETTINGS_KEY)
        .maybeSingle(),
    ]);

    let placementsMap: Record<string, string[]> = {};
    if (placementsRes.data?.value) {
      try {
        placementsMap = JSON.parse(placementsRes.data.value);
      } catch {}
    }

    let metaMap: Record<string, any> = {};
    if (metaRes.data?.value) {
      try {
        metaMap = JSON.parse(metaRes.data.value);
      } catch {}
    }

    const allApps = appsRes.data || [];
    const matchedOffers: RedeemOffer[] = [];

    allApps.forEach(app => {
      const placements = placementsMap[app.id] || [];
      if (placements.includes(REDEEM_PLACEMENT_KEY) || placements.includes('airtime_redeem') || placements.includes('data_redeem')) {
        const meta = metaMap[app.id] || {};
        matchedOffers.push({
          id: app.id,
          title: app.title,
          description: app.description || '',
          app_link: app.app_link,
          image_url: app.image_url || undefined,
          credit_cost: Number(app.credit_cost) || 0,
          is_free: app.is_free ?? false,
          is_active: app.is_active ?? true,
          sort_order: Number(app.sort_order) || 0,
          type: (meta.type as RedeemType) || (app.title.toLowerCase().includes('airtime') ? 'airtime' : 'data'),
          network: (meta.network as NetworkProvider) || detectNetworkFromTitle(app.title),
          denomination: meta.denomination || extractDenomination(app.title),
          instructions: meta.instructions || 'Click the unlocked button to open your redemption link.',
          created_at: app.created_at,
        });
      }
    });

    if (matchedOffers.length > 0) {
      saveLocalFallbackOffers(matchedOffers);
      return matchedOffers;
    }

    // If none found in DB yet, auto-seed defaults into DB
    const seeded = await seedDefaultRedeemOffers();
    if (seeded.length > 0) return seeded;
  } catch (err) {
    console.warn('Error loading redeem offers from database, using cached/defaults:', err);
  }

  return getLocalFallbackOffers();
}

/**
 * Seed default redeem offers into Supabase marketing_apps & app_settings
 */
export async function seedDefaultRedeemOffers(): Promise<RedeemOffer[]> {
  const created: RedeemOffer[] = [];
  try {
    const [placementsRes, metaRes] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'marketing_apps_placements').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', REDEEM_META_SETTINGS_KEY).maybeSingle(),
    ]);

    let placementsMap: Record<string, string[]> = {};
    if (placementsRes.data?.value) {
      try { placementsMap = JSON.parse(placementsRes.data.value); } catch {}
    }

    let metaMap: Record<string, any> = {};
    if (metaRes.data?.value) {
      try { metaMap = JSON.parse(metaRes.data.value); } catch {}
    }

    for (const def of DEFAULT_REDEEM_OFFERS) {
      const { data, error } = await supabase
        .from('marketing_apps')
        .insert({
          title: def.title,
          description: def.description,
          app_link: def.app_link,
          image_url: def.image_url || null,
          is_free: false,
          credit_cost: def.credit_cost,
          sort_order: def.sort_order,
          is_active: true,
        })
        .select('id, created_at')
        .single();

      if (!error && data?.id) {
        placementsMap[data.id] = [REDEEM_PLACEMENT_KEY];
        metaMap[data.id] = {
          type: def.type,
          network: def.network,
          denomination: def.denomination,
          instructions: def.instructions,
        };
        created.push({
          ...def,
          id: data.id,
          created_at: data.created_at,
        });
      }
    }

    if (created.length > 0) {
      await Promise.all([
        supabase.from('app_settings').upsert({
          key: 'marketing_apps_placements',
          value: JSON.stringify(placementsMap),
        }, { onConflict: 'key' }),
        supabase.from('app_settings').upsert({
          key: REDEEM_META_SETTINGS_KEY,
          value: JSON.stringify(metaMap),
        }, { onConflict: 'key' }),
      ]);
      saveLocalFallbackOffers(created);
      return created;
    }
  } catch (err) {
    console.warn('Could not auto-seed redeem offers to Supabase:', err);
  }

  saveLocalFallbackOffers(DEFAULT_REDEEM_OFFERS);
  return DEFAULT_REDEEM_OFFERS;
}

/**
 * Create a new Airtime or Data Redeem Offer
 */
export async function createRedeemOffer(offerData: Omit<RedeemOffer, 'id' | 'created_at'>): Promise<RedeemOffer> {
  // 1. Insert into marketing_apps
  const { data, error } = await supabase
    .from('marketing_apps')
    .insert({
      title: offerData.title.trim(),
      description: offerData.description.trim() || null,
      app_link: offerData.app_link.trim(),
      image_url: offerData.image_url || null,
      is_free: false,
      credit_cost: Number(offerData.credit_cost) || 0,
      sort_order: Number(offerData.sort_order) || 0,
      is_active: offerData.is_active ?? true,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create redeem offer');
  }

  const offerId = data.id;

  // 2. Update placements to airtime_data_redeem (so marketing app doesn't show it!)
  const [placementsRes, metaRes] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'marketing_apps_placements').maybeSingle(),
    supabase.from('app_settings').select('value').eq('key', REDEEM_META_SETTINGS_KEY).maybeSingle(),
  ]);

  let placementsMap: Record<string, string[]> = {};
  if (placementsRes.data?.value) {
    try { placementsMap = JSON.parse(placementsRes.data.value); } catch {}
  }
  placementsMap[offerId] = [REDEEM_PLACEMENT_KEY];

  let metaMap: Record<string, any> = {};
  if (metaRes.data?.value) {
    try { metaMap = JSON.parse(metaRes.data.value); } catch {}
  }
  metaMap[offerId] = {
    type: offerData.type,
    network: offerData.network,
    denomination: offerData.denomination || '',
    instructions: offerData.instructions || '',
  };

  await Promise.all([
    supabase.from('app_settings').upsert({
      key: 'marketing_apps_placements',
      value: JSON.stringify(placementsMap),
    }, { onConflict: 'key' }),
    supabase.from('app_settings').upsert({
      key: REDEEM_META_SETTINGS_KEY,
      value: JSON.stringify(metaMap),
    }, { onConflict: 'key' }),
  ]);

  const newOffer: RedeemOffer = {
    ...offerData,
    id: offerId,
    created_at: data.created_at,
  };

  const cached = getLocalFallbackOffers();
  saveLocalFallbackOffers([newOffer, ...cached]);

  return newOffer;
}

/**
 * Update an existing Redeem Offer
 */
export async function updateRedeemOffer(
  id: string,
  updates: Partial<Omit<RedeemOffer, 'id' | 'created_at'>>
): Promise<void> {
  const marketingUpdates: Record<string, any> = {};
  if (updates.title !== undefined) marketingUpdates.title = updates.title.trim();
  if (updates.description !== undefined) marketingUpdates.description = updates.description.trim();
  if (updates.app_link !== undefined) marketingUpdates.app_link = updates.app_link.trim();
  if (updates.image_url !== undefined) marketingUpdates.image_url = updates.image_url || null;
  if (updates.credit_cost !== undefined) marketingUpdates.credit_cost = Number(updates.credit_cost);
  if (updates.sort_order !== undefined) marketingUpdates.sort_order = Number(updates.sort_order);
  if (updates.is_active !== undefined) marketingUpdates.is_active = updates.is_active;

  if (Object.keys(marketingUpdates).length > 0) {
    const { error } = await supabase
      .from('marketing_apps')
      .update(marketingUpdates)
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // Update meta in app_settings
  if (updates.type || updates.network || updates.denomination !== undefined || updates.instructions !== undefined) {
    const metaRes = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', REDEEM_META_SETTINGS_KEY)
      .maybeSingle();

    let metaMap: Record<string, any> = {};
    if (metaRes.data?.value) {
      try { metaMap = JSON.parse(metaRes.data.value); } catch {}
    }

    metaMap[id] = {
      ...(metaMap[id] || {}),
      ...(updates.type ? { type: updates.type } : {}),
      ...(updates.network ? { network: updates.network } : {}),
      ...(updates.denomination !== undefined ? { denomination: updates.denomination } : {}),
      ...(updates.instructions !== undefined ? { instructions: updates.instructions } : {}),
    };

    await supabase.from('app_settings').upsert({
      key: REDEEM_META_SETTINGS_KEY,
      value: JSON.stringify(metaMap),
    }, { onConflict: 'key' });
  }

  // Update local cache
  const cached = getLocalFallbackOffers().map(o => o.id === id ? { ...o, ...updates } : o);
  saveLocalFallbackOffers(cached);
}

/**
 * Delete a Redeem Offer
 */
export async function deleteRedeemOffer(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_apps').delete().eq('id', id);
  if (error) throw new Error(error.message);

  const [placementsRes, metaRes] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'marketing_apps_placements').maybeSingle(),
    supabase.from('app_settings').select('value').eq('key', REDEEM_META_SETTINGS_KEY).maybeSingle(),
  ]);

  if (placementsRes.data?.value) {
    try {
      const map = JSON.parse(placementsRes.data.value);
      delete map[id];
      await supabase.from('app_settings').upsert({
        key: 'marketing_apps_placements',
        value: JSON.stringify(map),
      }, { onConflict: 'key' });
    } catch {}
  }

  if (metaRes.data?.value) {
    try {
      const meta = JSON.parse(metaRes.data.value);
      delete meta[id];
      await supabase.from('app_settings').upsert({
        key: REDEEM_META_SETTINGS_KEY,
        value: JSON.stringify(meta),
      }, { onConflict: 'key' });
    } catch {}
  }

  const cached = getLocalFallbackOffers().filter(o => o.id !== id);
  saveLocalFallbackOffers(cached);
}

/**
 * Fetch redeemed offer IDs for a specific user
 */
export async function getUserRedeemedOfferIds(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('user_app_redemptions')
      .select('app_id')
      .eq('user_id', userId);

    const fromDb = (data || []).map(r => r.app_id);
    
    // Also check local storage for instant responsiveness
    try {
      const local = JSON.parse(localStorage.getItem(`ggd_redeemed_${userId}`) || '[]');
      return Array.from(new Set([...fromDb, ...local]));
    } catch {
      return fromDb;
    }
  } catch (err) {
    console.error('Error fetching user redemptions:', err);
    try {
      return JSON.parse(localStorage.getItem(`ggd_redeemed_${userId}`) || '[]');
    } catch {
      return [];
    }
  }
}

/**
 * Redeem an Airtime or Data Offer with User Wallet Credits
 */
export async function redeemOfferWithCredits(
  userId: string,
  offer: RedeemOffer
): Promise<{ success: boolean; appLink: string; remainingCredits: number }> {
  // 1. Fetch current user profile credits
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('credits, email')
    .eq('user_id', userId)
    .single();

  if (profileErr || !profile) {
    throw new Error('User account not found');
  }

  const currentCredits = Number(profile.credits) || 0;
  if (currentCredits < offer.credit_cost) {
    throw new Error(`Insufficient credits! This offer requires ${offer.credit_cost} credits, but you have ${currentCredits} credits.`);
  }

  const remainingCredits = currentCredits - offer.credit_cost;

  // 2. Deduct credits from user profile
  const { error: deductErr } = await supabase
    .from('profiles')
    .update({ credits: remainingCredits })
    .eq('user_id', userId);

  if (deductErr) {
    throw new Error('Failed to deduct credits: ' + deductErr.message);
  }

  // 3. Insert record in user_app_redemptions
  await supabase
    .from('user_app_redemptions')
    .insert({
      user_id: userId,
      app_id: offer.id,
    });

  // 4. Record detailed redemption log in app_settings (for admin & user audit)
  try {
    const logItem: UserRedemptionRecord = {
      id: `red_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      offerId: offer.id,
      offerTitle: offer.title,
      type: offer.type,
      network: offer.network,
      creditCost: offer.credit_cost,
      appLink: offer.app_link,
      redeemedAt: new Date().toISOString(),
      userId,
      userEmail: profile.email || undefined,
    };

    // Update local storage
    const localUserList = JSON.parse(localStorage.getItem(`ggd_redeemed_${userId}`) || '[]');
    if (!localUserList.includes(offer.id)) {
      localUserList.push(offer.id);
      localStorage.setItem(`ggd_redeemed_${userId}`, JSON.stringify(localUserList));
    }

    const localHistory = JSON.parse(localStorage.getItem(`ggd_redeem_history_${userId}`) || '[]');
    localStorage.setItem(`ggd_redeem_history_${userId}`, JSON.stringify([logItem, ...localHistory]));

    // Also push to platform logs in app_settings if possible
    const currentLogsRes = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', REDEEM_LOGS_SETTINGS_KEY)
      .maybeSingle();

    let logs: UserRedemptionRecord[] = [];
    if (currentLogsRes.data?.value) {
      try { logs = JSON.parse(currentLogsRes.data.value); } catch {}
    }
    logs.unshift(logItem);
    if (logs.length > 200) logs = logs.slice(0, 200);

    await supabase.from('app_settings').upsert({
      key: REDEEM_LOGS_SETTINGS_KEY,
      value: JSON.stringify(logs),
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('Notice: Log saving completed with local sync:', err);
  }

  return {
    success: true,
    appLink: offer.app_link,
    remainingCredits,
  };
}

/**
 * Fetch all platform redemptions (for Admin audit)
 */
export async function getAllPlatformRedemptions(): Promise<UserRedemptionRecord[]> {
  try {
    const res = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', REDEEM_LOGS_SETTINGS_KEY)
      .maybeSingle();

    if (res.data?.value) {
      return JSON.parse(res.data.value);
    }
  } catch (err) {
    console.warn('Could not load all platform redemptions:', err);
  }
  return [];
}

/**
 * Fetch redemption history for a specific user
 */
export async function getUserRedemptionHistory(userId: string): Promise<UserRedemptionRecord[]> {
  try {
    const res = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', REDEEM_LOGS_SETTINGS_KEY)
      .maybeSingle();

    if (res.data?.value) {
      const all: UserRedemptionRecord[] = JSON.parse(res.data.value);
      const userList = all.filter(item => item.userId === userId);
      if (userList.length > 0) return userList;
    }
  } catch {}

  try {
    return JSON.parse(localStorage.getItem(`ggd_redeem_history_${userId}`) || '[]');
  } catch {
    return [];
  }
}

// Helpers
function detectNetworkFromTitle(title: string): NetworkProvider {
  const lower = title.toLowerCase();
  if (lower.includes('mtn')) return 'mtn';
  if (lower.includes('airtel')) return 'airtel';
  if (lower.includes('glo')) return 'glo';
  if (lower.includes('9mobile') || lower.includes('etisalat')) return '9mobile';
  return 'all';
}

function extractDenomination(title: string): string {
  const match = title.match(/(\d+(?:\.\d+)?\s*(?:GB|MB|TB))|(?:₦|N)(\d+(?:,\d+)?)/i);
  return match ? match[0] : '';
}
