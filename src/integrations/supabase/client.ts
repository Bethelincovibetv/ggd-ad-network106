import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

// Default to live project credentials if env vars are unset during deployment (e.g. Vercel builds)
export const DEFAULT_SUPABASE_PROJECT_ID = "sdgxpquruczhkpyhjaxn";
export const DEFAULT_SUPABASE_URL = "https://sdgxpquruczhkpyhjaxn.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVydWN6aGtweWhqYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20";

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

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const getSafeStorage = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    return brokeredPreviewStorage() || window.localStorage;
  } catch {
    return undefined;
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: getSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});
