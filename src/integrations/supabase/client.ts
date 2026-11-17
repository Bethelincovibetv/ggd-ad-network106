import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

// These are publishable client credentials. Authorization is enforced by Supabase Auth and RLS.
export const DEFAULT_SUPABASE_PROJECT_ID = "sdgxpquruczhkpyhjaxn";
export const DEFAULT_SUPABASE_URL = "https://sdgxpquruczhkpyhjaxn.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVyuczhkpyhjaxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20";

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

// Never manufacture successful database responses. Network, timeout, and API errors
// must reach the caller so the UI cannot report an operation that was not persisted.
const supabaseFetch: typeof fetch = (input, init) => fetch(input, init);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: getSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: supabaseFetch,
  },
});
