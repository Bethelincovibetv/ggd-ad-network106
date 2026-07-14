import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'ggd_feature_toggles_v1';

let cache: Record<string, boolean> | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;
const listeners = new Set<(m: Record<string, boolean>) => void>();

const loadCached = (): Record<string, boolean> | null => {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) { cache = JSON.parse(raw); return cache; }
  } catch {}
  return null;
};

const fetchToggles = (): Promise<Record<string, boolean>> => {
  if (inflight) return inflight;
  inflight = Promise.resolve(
    supabase.from('feature_toggles').select('feature_key, is_enabled')
  ).then(({ data }) => {
    const map: Record<string, boolean> = {};
    (data || []).forEach((f: any) => { map[f.feature_key] = f.is_enabled; });
    cache = map;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
    listeners.forEach(l => l(map));
    return map;
  });
  return inflight;
};

export const useFeatureToggles = () => {
  const initial = loadCached();
  const [features, setFeatures] = useState<Record<string, boolean>>(initial || {});
  const [loading, setLoading] = useState(!initial);
  const [hydrated, setHydrated] = useState(!!initial);

  useEffect(() => {
    const onUpdate = (m: Record<string, boolean>) => {
      setFeatures(m);
      setLoading(false);
      setHydrated(true);
    };
    listeners.add(onUpdate);
    fetchToggles().then(onUpdate);
    return () => { listeners.delete(onUpdate); };
  }, []);

  // Before we have any data (no cache + no fetch response), default DISABLED
  // so admin-disabled features never flash on during the loading state.
  const isEnabled = (key: string) => {
    if (!hydrated && !initial) return false;
    return features[key] !== false;
  };

  return { features, isEnabled, loading };
};
