import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isFeatureEnabled, FEATURE_REGISTRY_MAP } from '@/lib/featureRegistry';
import { safeStorage } from '@/utils/safeStorage';

const CACHE_KEY = 'ggd_feature_toggles_v2';
const LEGACY_CACHE_KEY = 'ggd_feature_toggles_v1';

let cache: Record<string, boolean> | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;
const listeners = new Set<(m: Record<string, boolean>) => void>();

// Clear stale v1 cache once so restored pages aren't hidden by old cached flags
try {
  if (typeof window !== 'undefined' && window.localStorage?.getItem(LEGACY_CACHE_KEY)) {
    window.localStorage.removeItem(LEGACY_CACHE_KEY);
  }
} catch {}

const loadCached = (): Record<string, boolean> | null => {
  if (cache) return cache;
  try {
    cache = safeStorage.getJSON<Record<string, boolean> | null>(CACHE_KEY, null);
    return cache;
  } catch {}
  return null;
};

export const getCachedFeatureToggles = (): Record<string, boolean> => {
  return loadCached() || {};
};

// Immediately pre-seed cache on module import to ensure zero-flash synchronous hydration
cache = loadCached();

const fetchToggles = (): Promise<Record<string, boolean>> => {
  if (inflight) return inflight;
  inflight = Promise.resolve(
    supabase.from('feature_toggles').select('feature_key, is_enabled')
  ).then(async ({ data, error }) => {
    const existing = loadCached() || {};
    if (!error && Array.isArray(data) && data.length > 0) {
      const fetchedMap: Record<string, boolean> = {};
      data.forEach((f: any) => {
        if (f && f.feature_key !== undefined) {
          fetchedMap[f.feature_key] = f.is_enabled;
        }
      });
      cache = { ...existing, ...fetchedMap };
      safeStorage.setJSON(CACHE_KEY, cache);
      listeners.forEach(l => l({ ...cache! }));
      inflight = null;
      return cache!;
    }

    // Fallback to server cache endpoint when visitor is anonymous and RLS returns []
    try {
      const resp = await fetch('/api/feature-toggles');
      if (resp.ok) {
        const payload = await resp.json();
        if (payload?.toggles && typeof payload.toggles === 'object' && Object.keys(payload.toggles).length > 0) {
          cache = { ...existing, ...payload.toggles };
          safeStorage.setJSON(CACHE_KEY, cache);
          listeners.forEach(l => l({ ...cache! }));
          inflight = null;
          return cache!;
        }
      }
    } catch {}

    inflight = null;
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
  safeStorage.setJSON(CACHE_KEY, cache);
  listeners.forEach(l => l({ ...cache! }));
};

export const setBatchFeatureTogglesLocally = (updates: Record<string, boolean>) => {
  if (!cache) cache = loadCached() || {};
  cache = { ...cache, ...updates };
  safeStorage.setJSON(CACHE_KEY, cache);
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

