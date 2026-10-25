import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled, FEATURE_REGISTRY_MAP } from '@/lib/featureRegistry';

const CACHE_KEY = 'ggd_feature_toggles_v1';

let cache: Record<string, boolean> | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;
const listeners = new Set<(m: Record<string, boolean>) => void>();

const loadCached = (): Record<string, boolean> | null => {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) {
      cache = JSON.parse(raw);
      return cache;
    }
  } catch {}
  return null;
};

// Immediately pre-seed cache on module import to ensure zero-flash synchronous hydration
cache = loadCached();

const fetchToggles = (): Promise<Record<string, boolean>> => {
  if (inflight) return inflight;
  inflight = Promise.resolve(
    supabase.from('feature_toggles').select('feature_key, is_enabled')
  ).then(({ data, error }) => {
    inflight = null;
    const existing = loadCached() || {};
    if (!error && Array.isArray(data)) {
      const fetchedMap: Record<string, boolean> = {};
      data.forEach((f: any) => {
        if (f && f.feature_key !== undefined) {
          fetchedMap[f.feature_key] = f.is_enabled;
        }
      });
      // Safe merge: preserve existing keys, overwrite with remote states
      cache = { ...existing, ...fetchedMap };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch {}
      listeners.forEach(l => l({ ...cache! }));
      return cache!;
    }
    // On network error or bad payload: keep existing cached state intact without resetting to empty
    cache = existing;
    return existing;
  }).catch(() => {
    inflight = null;
    const existing = loadCached() || {};
    cache = existing;
    return existing;
  });
  return inflight;
};

export const setFeatureToggleLocally = (key: string, enabled: boolean) => {
  if (!cache) cache = loadCached() || {};
  cache[key] = enabled;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach(l => l({ ...cache! }));
};

export const setBatchFeatureTogglesLocally = (updates: Record<string, boolean>) => {
  if (!cache) cache = loadCached() || {};
  cache = { ...cache, ...updates };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach(l => l({ ...cache! }));
};

export const useFeatureToggles = () => {
  const initial = loadCached();
  const [features, setFeatures] = useState<Record<string, boolean>>(() => initial || {});
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    const onUpdate = (m: Record<string, boolean>) => {
      setFeatures(m);
      setLoading(false);
    };
    listeners.add(onUpdate);
    fetchToggles().then(onUpdate);
    return () => { listeners.delete(onUpdate); };
  }, []);

  const isEnabled = (key: string): boolean => {
    const def = FEATURE_REGISTRY_MAP[key];
    if (def && !def.canDisable) {
      return true; // Protected core system features cannot be disabled
    }
    return isFeatureEnabled(key, features);
  };

  return { features, isEnabled, loading };
};

