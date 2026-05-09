import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumTier {
  tier: 1 | 2 | 3;
  days: number;
  credits: number;
  label: string;
}

export interface PremiumSettings {
  enabled: boolean;
  freeAdDays: number;
  exchangeRate: number;
  autoConvertAds: boolean;
  tiers: PremiumTier[];
  loading: boolean;
}

const DEFAULTS: Omit<PremiumSettings, 'loading'> = {
  enabled: true,
  freeAdDays: 3,
  exchangeRate: 100,
  autoConvertAds: false,
  tiers: [
    { tier: 1, days: 7, credits: 50, label: 'Starter' },
    { tier: 2, days: 15, credits: 120, label: 'Growth' },
    { tier: 3, days: 30, credits: 250, label: 'Pro' },
  ],
};

export const usePremiumSettings = (): PremiumSettings => {
  const [state, setState] = useState<PremiumSettings>({ ...DEFAULTS, loading: true });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('key, value');
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      const num = (k: string, d: number) => parseInt(map[k] || '') || d;
      setState({
        loading: false,
        enabled: (map['premium_system_enabled'] ?? 'true') === 'true',
        freeAdDays: num('ad_duration_free_days', 3),
        exchangeRate: num('credit_exchange_rate', 100),
        autoConvertAds: (map['auto_convert_ads_to_tasks'] ?? 'false') === 'true',
        tiers: [
          { tier: 1, days: num('premium_tier1_days', 7), credits: num('premium_tier1_credits', 50), label: 'Starter' },
          { tier: 2, days: num('premium_tier2_days', 15), credits: num('premium_tier2_credits', 120), label: 'Growth' },
          { tier: 3, days: num('premium_tier3_days', 30), credits: num('premium_tier3_credits', 250), label: 'Pro' },
        ],
      });
    })();
  }, []);

  return state;
};
