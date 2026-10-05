import { supabase } from '@/integrations/supabase/client';

let cachedAdminGeminiKey = '';
let cachedAdminPexelsKey = '';
let cachedAdminFishAudioKey = '';
let isFetchingConfig = false;

export async function resolveAdminAiApiKey(): Promise<string> {
  if (cachedAdminGeminiKey && cachedAdminGeminiKey.trim().length > 8 && !cachedAdminGeminiKey.startsWith('AIzaSy...')) {
    return cachedAdminGeminiKey.trim();
  }

  // 1. Try local environment variables
  const envKey = 
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (process as any).env?.GEMINI_API_KEY || 
    (process as any).env?.API_KEY || 
    '';
  if (envKey && envKey.trim().length > 8 && !envKey.startsWith('AIzaSy...')) {
    cachedAdminGeminiKey = envKey.trim();
    return cachedAdminGeminiKey;
  }

  // 2. Try fetching from server live-key endpoint
  try {
    const res = await fetch('/api/vixora/ai/live-key');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.apiKey && data.apiKey.trim().length > 8 && !data.apiKey.startsWith('AIzaSy...')) {
        cachedAdminGeminiKey = data.apiKey.trim();
        return cachedAdminGeminiKey;
      }
    }
  } catch {}

  // 3. Query Supabase app_settings (configured by Admin in Admin Portal)
  if (!isFetchingConfig) {
    isFetchingConfig = true;
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['gemini_api_key', 'admin_gemini_key', 'google_ai_key', 'ai_api_key', 'pexels_api_key', 'fish_audio_api_key']);

      if (data && Array.isArray(data)) {
        data.forEach((r: any) => {
          if ((r.key === 'gemini_api_key' || r.key === 'admin_gemini_key' || r.key === 'google_ai_key' || r.key === 'ai_api_key') && r.value && r.value.trim().length > 8 && !r.value.startsWith('AIzaSy...')) {
            cachedAdminGeminiKey = r.value.trim();
          }
          if (r.key === 'pexels_api_key' && r.value) {
            cachedAdminPexelsKey = r.value.trim();
          }
          if (r.key === 'fish_audio_api_key' && r.value) {
            cachedAdminFishAudioKey = r.value.trim();
          }
        });
      }
    } catch (err) {
      console.warn('Notice loading app_settings from Supabase:', err);
    } finally {
      isFetchingConfig = false;
    }
  }

  return cachedAdminGeminiKey;
}

export function setCachedAdminGeminiKey(key: string) {
  if (key && key.trim().length > 8 && !key.startsWith('AIzaSy...')) {
    cachedAdminGeminiKey = key.trim();
  }
}

export function getCachedAdminGeminiKey(): string {
  return cachedAdminGeminiKey;
}
