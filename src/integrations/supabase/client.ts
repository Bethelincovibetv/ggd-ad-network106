import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

// These are public Supabase project identifiers and anon credentials, not service-role secrets.
export const DEFAULT_SUPABASE_PROJECT_ID = "sdgxpquruczhkpyhjaxn";
export const DEFAULT_SUPABASE_URL = "https://sdgxpquruczhkpyhjaxn.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdGd4cHF1cnVjemhra3B5aGpheG4iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3ODc0MDkxMiwiZXhwIjoyMDk0MzE2OTEyfQ.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20";

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const rawUrl = (typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes("placeholder"))
  ? envUrl
  : DEFAULT_SUPABASE_URL;

const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const rawKey = (typeof envKey === 'string' && envKey.trim() && !envKey.includes("placeholder"))
  ? envKey
  : DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_URL = rawUrl.trim();
export const SUPABASE_PUBLISHABLE_KEY = rawKey.trim().replace(/\s+/g, '');
export const SUPABASE_PROJECT_ID = (import.meta.env.VITE_SUPABASE_PROJECT_ID && !import.meta.env.VITE_SUPABASE_PROJECT_ID.includes("placeholder"))
  ? import.meta.env.VITE_SUPABASE_PROJECT_ID
  : DEFAULT_SUPABASE_PROJECT_ID;

const getSafeStorage = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    return brokeredPreviewStorage() || window.localStorage;
  } catch {
    return undefined;
  }
};

/** Preserve real Supabase responses and failures; never simulate database success. */
export const reliableSupabaseFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const onExternalAbort = () => controller.abort(init?.signal?.reason);
  if (init?.signal?.aborted) onExternalAbort();
  else init?.signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    init?.signal?.removeEventListener('abort', onExternalAbort);
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: getSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: reliableSupabaseFetch,
  },
});
