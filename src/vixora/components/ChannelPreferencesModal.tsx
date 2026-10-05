import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ChannelPreferences {
  channels: string[];
  niche: string;
  preferredVoice: string;
  preferredRatio: 'vertical' | 'horizontal' | 'square';
  subtitleStyle: 'mrbeast' | 'neon' | 'minimal' | 'cyberpunk' | 'gold';
  defaultCta: string;
  autoSfx: boolean;
  channelHandles: {
    youtube?: string;
    tiktok?: string;
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
  updatedAt?: string;
}

export const DEFAULT_CHANNEL_PREFERENCES: ChannelPreferences = {
  channels: ['youtube', 'tiktok', 'instagram', 'whatsapp'],
  niche: 'finance',
  preferredVoice: 'Kore',
  preferredRatio: 'vertical',
  subtitleStyle: 'mrbeast',
  defaultCta: 'Subscribe to my channel for daily viral breakdowns & link in bio!',
  autoSfx: true,
  channelHandles: {
    youtube: '',
    tiktok: '',
    instagram: '',
    whatsapp: '',
    facebook: ''
  }
};

export interface ChannelPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: 'light' | 'dark';
  onPreferencesUpdated?: (prefs: ChannelPreferences) => void;
}

export const ChannelPreferencesModal: React.FC<ChannelPreferencesModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  onPreferencesUpdated
}) => {
  const [preferences, setPreferences] = useState<ChannelPreferences>(DEFAULT_CHANNEL_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      // 1. Check local storage
      const saved = localStorage.getItem('vixora_user_preferences');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPreferences({
            ...DEFAULT_CHANNEL_PREFERENCES,
            ...parsed,
            channelHandles: {
              ...DEFAULT_CHANNEL_PREFERENCES.channelHandles,
              ...(parsed.channelHandles || {})
            }
          });
        } catch (e) {
          console.warn('Error parsing local channel preferences', e);
        }
      }

      // 2. Fetch authenticated Supabase user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, business_name, business_phone, business_website')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setUserProfile(profile);
          // If handles are empty, prefill with business phone/site
          setPreferences(prev => ({
            ...prev,
            channelHandles: {
              ...prev.channelHandles,
              whatsapp: prev.channelHandles?.whatsapp || profile.business_phone || '',
            }
          }));
        }
      }
    } catch (err) {
      console.warn('Could not load channel preferences:', err);
    }
  };

  const toggleChannel = (chId: string) => {
    setPreferences(prev => {
      const exists = prev.channels.includes(chId);
      const updated = exists ? prev.channels.filter(c => c !== chId) : [...prev.channels, chId];
      return { ...prev, channels: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = {
        ...preferences,
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('vixora_user_preferences', JSON.stringify(updated));

      // Also update creator user cache
      const rawUser = localStorage.getItem('ggd_creator_user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : {};
      localStorage.setItem('ggd_creator_user', JSON.stringify({
        ...parsedUser,
        niche: updated.niche,
        preferredVoice: updated.preferredVoice,
        aspectRatio: updated.preferredRatio
      }));

      // If user is authenticated, sync with Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          // Update profile preferences timestamp
          updated_at: new Date().toISOString()
        } as any).eq('user_id', user.id);
      }

      if (onPreferencesUpdated) {
        onPreferencesUpdated(updated);
      }

      toast.success('Channel preferences synchronized with GGD Ad Network!');
      onClose();
    } catch (err: any) {
      toast.error('Failed to save preferences: ' + (err?.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all animate-rise ${
          themeMode === 'light' 
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' 
            : 'bg-slate-900 border-white/10 text-white shadow-black/80'
        }`}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center text-white">
              <i className="fa-solid fa-tower-broadcast text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Channel & Distribution Preferences</h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/30">
                  GGD Profile Sync
                </span>
              </div>
              <p className={`text-[11px] font-medium ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Configure default target channels, AI niche, voice, and viral CTAs for video generation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              themeMode === 'light' 
                ? 'hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900' 
                : 'hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-left custom-scrollbar">
          
          {/* 1. TARGET CHANNELS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-share-nodes text-orange-500"></i> Target Content Channels
              </label>
              <span className={`text-[10px] ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                {preferences.channels.length} selected
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'youtube', label: 'YouTube Shorts', icon: 'fa-youtube', color: 'text-red-500 bg-red-500/10' },
                { id: 'tiktok', label: 'TikTok Shorts', icon: 'fa-tiktok', color: 'text-pink-500 bg-pink-500/10' },
                { id: 'instagram', label: 'Instagram Reels', icon: 'fa-instagram', color: 'text-purple-500 bg-purple-500/10' },
                { id: 'whatsapp', label: 'WhatsApp Status', icon: 'fa-whatsapp', color: 'text-emerald-500 bg-emerald-500/10' },
                { id: 'facebook', label: 'Facebook Reels', icon: 'fa-facebook', color: 'text-blue-500 bg-blue-500/10' },
                { id: 'telegram', label: 'Telegram Channel', icon: 'fa-telegram', color: 'text-sky-500 bg-sky-500/10' },
              ].map(ch => {
                const active = preferences.channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between text-xs font-bold cursor-pointer ${
                      active 
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-sm' 
                        : themeMode === 'light'
                        ? 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        : 'border-white/5 hover:bg-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${ch.color}`}>
                        <i className={`fa-brands ${ch.icon} text-xs`}></i>
                      </span>
                      <span className="truncate text-[11px]">{ch.label}</span>
                    </div>
                    {active && <i className="fa-solid fa-check text-orange-500 text-xs shrink-0 ml-1"></i>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CREATOR NICHE & DEFAULT VOICE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-bullseye text-orange-500"></i> Primary Content Niche
              </label>
              <select
                value={preferences.niche}
                onChange={(e) => setPreferences({ ...preferences, niche: e.target.value })}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  themeMode === 'light' 
                    ? 'bg-slate-50 border-slate-200 text-slate-900' 
                    : 'bg-slate-800 border-white/10 text-white'
                }`}
              >
                <option value="finance">💰 Wealth, Money & Investing</option>
                <option value="motivation">🔥 Motivation & Stoic Mindset</option>
                <option value="tech">⚡ AI, Tech & Future Insights</option>
                <option value="history">📜 Untold African History & Culture</option>
                <option value="health">🌿 Health, Fitness & Vitality</option>
                <option value="ecommerce">🛍️ Product Deals & Business Offers</option>
                <option value="entertainment">🎬 Entertainment & Nollywood</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-microphone text-orange-500"></i> Default Signature Voice
              </label>
              <select
                value={preferences.preferredVoice}
                onChange={(e) => setPreferences({ ...preferences, preferredVoice: e.target.value })}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  themeMode === 'light' 
                    ? 'bg-slate-50 border-slate-200 text-slate-900' 
                    : 'bg-slate-800 border-white/10 text-white'
                }`}
              >
                <option value="Kore">Kore (Flagship Vixora AI Voice)</option>
                <option value="Aoede">Aoede (Warm Storytelling)</option>
                <option value="Puck">Puck (Viral High Energy)</option>
                <option value="Charon">Charon (Deep Cinematic)</option>
                <option value="Fenrir">Fenrir (Bold Tech)</option>
                <option value="Chimamanda">Chimamanda (African Narrative)</option>
              </select>
            </div>
          </div>

          {/* 3. ASPECT RATIO & SUBTITLE STYLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-mobile-screen text-orange-500"></i> Default Video Ratio
              </label>
              <select
                value={preferences.preferredRatio}
                onChange={(e) => setPreferences({ ...preferences, preferredRatio: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  themeMode === 'light' 
                    ? 'bg-slate-50 border-slate-200 text-slate-900' 
                    : 'bg-slate-800 border-white/10 text-white'
                }`}
              >
                <option value="vertical">9:16 (Vertical Shorts / Reels / TikTok)</option>
                <option value="horizontal">16:9 (Widescreen Landscape / YouTube)</option>
                <option value="square">1:1 (Square Feed / Instagram)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-closed-captioning text-orange-500"></i> Caption & Subtitle Style
              </label>
              <select
                value={preferences.subtitleStyle}
                onChange={(e) => setPreferences({ ...preferences, subtitleStyle: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  themeMode === 'light' 
                    ? 'bg-slate-50 border-slate-200 text-slate-900' 
                    : 'bg-slate-800 border-white/10 text-white'
                }`}
              >
                <option value="mrbeast">⚡ MrBeast Viral Yellow & Red Glow</option>
                <option value="neon">💎 Neon Cyan Electric</option>
                <option value="minimal">✨ Minimalist Clean White</option>
                <option value="cyberpunk">👾 Cyberpunk Neon Violet</option>
                <option value="gold">👑 Cinematic Gold Foil</option>
              </select>
            </div>
          </div>

          {/* 4. DEFAULT CTA (CALL TO ACTION) */}
          <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-white/10">
            <label className="text-xs font-black uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-bullhorn text-orange-500"></i> Default Video Outro CTA
              </span>
              <span className={`text-[10px] ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Appended to generated scripts
              </span>
            </label>
            <input
              type="text"
              value={preferences.defaultCta}
              onChange={(e) => setPreferences({ ...preferences, defaultCta: e.target.value })}
              placeholder="e.g. Subscribe to my channel for daily gems & tap link in bio!"
              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                themeMode === 'light' 
                  ? 'bg-slate-50 border-slate-200 text-slate-900' 
                  : 'bg-slate-800 border-white/10 text-white'
              }`}
            />
          </div>

          {/* 5. CHANNEL HANDLES & URLS */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/10">
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-link text-orange-500"></i> Channel Links & Handles (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 text-xs">
                  <i className="fa-brands fa-youtube"></i>
                </span>
                <input
                  type="text"
                  value={preferences.channelHandles?.youtube || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    channelHandles: { ...preferences.channelHandles, youtube: e.target.value }
                  })}
                  placeholder="YouTube URL / @Handle"
                  className={`flex-1 p-2 rounded-xl border text-xs outline-none ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0 text-xs">
                  <i className="fa-brands fa-tiktok"></i>
                </span>
                <input
                  type="text"
                  value={preferences.channelHandles?.tiktok || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    channelHandles: { ...preferences.channelHandles, tiktok: e.target.value }
                  })}
                  placeholder="TikTok @Handle"
                  className={`flex-1 p-2 rounded-xl border text-xs outline-none ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 text-xs">
                  <i className="fa-brands fa-whatsapp"></i>
                </span>
                <input
                  type="text"
                  value={preferences.channelHandles?.whatsapp || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    channelHandles: { ...preferences.channelHandles, whatsapp: e.target.value }
                  })}
                  placeholder="WhatsApp Number / Link"
                  className={`flex-1 p-2 rounded-xl border text-xs outline-none ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 text-xs">
                  <i className="fa-brands fa-instagram"></i>
                </span>
                <input
                  type="text"
                  value={preferences.channelHandles?.instagram || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    channelHandles: { ...preferences.channelHandles, instagram: e.target.value }
                  })}
                  placeholder="Instagram @Handle"
                  className={`flex-1 p-2 rounded-xl border text-xs outline-none ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/10 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 6. AUTO-SFX SOUND EFFECT TOGGLE */}
          <div className="flex items-center justify-between p-3 rounded-2xl border bg-orange-500/5 border-orange-500/20">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-wand-magic-sparkles text-orange-500"></i> Auto-SFX Dynamic Audio Pops
              </p>
              <p className={`text-[10px] ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Automatically sync transition whooshes and bass drops on video scene cuts.
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoSfx}
              onChange={(e) => setPreferences({ ...preferences, autoSfx: e.target.checked })}
              className="h-4 w-4 accent-orange-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 bg-muted/20">
          <p className={`text-[10px] ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'} truncate hidden sm:block`}>
            Unified with your GGD Ad Network user profile.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                themeMode === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin text-xs"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-xs"></i> Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelPreferencesModal;
