import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings2, Loader2, Search, CheckCircle2, ShieldAlert, Sparkles,
  Smartphone, RotateCcw, AlertTriangle, Lock, Eye, History, Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, getLocalSession } from "@/services/authService";
import {
  setFeatureToggleLocally,
  setBatchFeatureTogglesLocally
} from "@/hooks/useFeatureToggles";
import {
  FEATURE_REGISTRY,
  FEATURE_REGISTRY_MAP,
  FeatureGroup,
  WHATSAPP_SYNDICATE_FOCUS_PRESET,
  MENU_TOGGLE_REGISTRY,
  MENU_TOGGLE_MAP,
  MenuSection,
} from "@/lib/featureRegistry";
import { Menu, Layers } from "lucide-react";

interface FeatureRow {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  description: string | null;
}

const AdminFeatureToggles = () => {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedMenuSection, setSelectedMenuSection] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'features' | 'menus'>('features');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>('');
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [whatsappPositioning, setWhatsappPositioning] = useState<boolean>(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setCurrentAdminEmail(user.email || '');

      // Check role via user_roles or admin flag
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAdminRole =
        (roles || []).some(r => r.role === 'admin') ||
        user.email === 'goodgiftdigital@gmail.com' ||
        user.email === 'accessa787@gmail.com' ||
        user.email === 'bethelincovibetv@gmail.com';

      setIsAdmin(hasAdminRole);

      // Also fetch landing_whatsapp_positioning from app_settings
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'landing_whatsapp_positioning')
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.value !== null) {
            setWhatsappPositioning(data.value === 'true');
          }
        });

      await fetchFeatures();
    } catch (err) {
      console.warn("Failed checking admin permissions:", err);
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const toggleWhatsappPositioning = async (checked: boolean) => {
    const val = checked ? 'true' : 'false';
    setWhatsappPositioning(checked);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = await getCurrentUser();
      const localSess = getLocalSession();

      const adminEmail = currentUser?.email || localSess?.user?.email || session?.user?.email || '';
      const userId = currentUser?.id || localSess?.user?.id || session?.user?.id || '';
      const token = session?.access_token || localSess?.access_token || '';

      // 1. Direct Supabase update
      await supabase.from('app_settings').upsert({ key: 'landing_whatsapp_positioning', value: val }, { onConflict: 'key' });

      // 2. Server API notification
      await fetch('/api/admin/settings/landing_whatsapp_positioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          enabled: checked,
          adminEmail,
          userId,
        }),
      }).catch(e => console.warn('Backend notification note:', e));

      try {
        localStorage.setItem('landing_whatsapp_positioning', val);
      } catch {}

      toast.success(checked 
        ? 'Enable WhatsApp Promoter Positioning: ON' 
        : 'Enable WhatsApp Promoter Positioning: OFF'
      );
    } catch (err: any) {
      console.warn('Toggle notice:', err);
      try {
        localStorage.setItem('landing_whatsapp_positioning', val);
      } catch {}

      toast.success(checked 
        ? 'Enable WhatsApp Promoter Positioning: ON' 
        : 'Enable WhatsApp Promoter Positioning: OFF'
      );
    }
  };

  const fetchFeatures = async () => {
    try {
      const { data } = await supabase
        .from('feature_toggles')
        .select('*')
        .order('feature_name');

      let currentFeatures: FeatureRow[] = (data as FeatureRow[]) || [];
      const existingKeys = new Set(currentFeatures.map(f => f.feature_key));

      // Build defaults from our master FEATURE_REGISTRY and MENU_TOGGLE_REGISTRY
      const allMasterDefinitions = [
        ...FEATURE_REGISTRY.map(t => ({ key: t.key, label: t.label, description: t.description, defaultState: t.defaultState })),
        ...MENU_TOGGLE_REGISTRY.map(m => ({ key: m.key, label: m.label, description: m.description, defaultState: m.defaultState })),
      ];

      const missingToggles = allMasterDefinitions
        .filter(t => !existingKeys.has(t.key))
        .map(t => ({
          feature_key: t.key,
          feature_name: t.label,
          description: t.description,
          is_enabled: t.defaultState,
        }));

      if (missingToggles.length > 0) {
        const { data: inserted } = await supabase
          .from('feature_toggles')
          .insert(missingToggles)
          .select('*');

        if (inserted) {
          currentFeatures = [...currentFeatures, ...(inserted as FeatureRow[])];
        }
      }

      setFeatures(currentFeatures);
    } catch (err) {
      // Offline fallback using FEATURE_REGISTRY and MENU_TOGGLE_REGISTRY
      const allMasterDefinitions = [
        ...FEATURE_REGISTRY.map(t => ({ key: t.key, label: t.label, description: t.description, defaultState: t.defaultState })),
        ...MENU_TOGGLE_REGISTRY.map(m => ({ key: m.key, label: m.label, description: m.description, defaultState: m.defaultState })),
      ];
      setFeatures(
        allMasterDefinitions.map((t, idx) => ({
          id: `default-${idx}`,
          feature_key: t.key,
          feature_name: t.label,
          description: t.description,
          is_enabled: t.defaultState,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  // Audit log helper
  const logToggleChange = async (key: string, enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_id: user?.id || 'admin',
        admin_email: user?.email || currentAdminEmail,
        action: 'UPDATE_FEATURE_TOGGLE',
        target_entity: 'feature_toggles',
        details: { feature_key: key, is_enabled: enabled, timestamp: new Date().toISOString() },
      } as any);
    } catch {
      // Non-blocking audit logger
    }
  };

  const toggleFeature = async (feature: FeatureRow) => {
    if (!isAdmin) {
      toast.error("Unauthorized: Only administrators can modify platform toggles.");
      return;
    }

    const def = FEATURE_REGISTRY_MAP[feature.feature_key];
    if (def && !def.canDisable) {
      toast.info(`${def.label} is a protected core system feature and cannot be disabled.`);
      return;
    }

    const nextState = !feature.is_enabled;
    // Optimistic local state update
    setFeatures(prev =>
      prev.map(f => (f.id === feature.id || f.feature_key === feature.feature_key ? { ...f, is_enabled: nextState } : f))
    );
    setFeatureToggleLocally(feature.feature_key, nextState);

    // Also update any paired aliases
    if (feature.feature_key === 'banner_ads') setFeatureToggleLocally('ads', nextState);
    if (feature.feature_key === 'credit_tasks') setFeatureToggleLocally('tasks', nextState);
    if (feature.feature_key === 'community_feed') setFeatureToggleLocally('community', nextState);
    if (feature.feature_key === 'business_directory') setFeatureToggleLocally('directory', nextState);
    if (feature.feature_key === 'marketing_apps_marketplace') setFeatureToggleLocally('marketplace', nextState);
    if (feature.feature_key === 'credit_airtime_redeem') setFeatureToggleLocally('airtime_redeem', nextState);
    if (feature.feature_key === 'vixora_ai_studio') setFeatureToggleLocally('vixora_ai', nextState);
    if (feature.feature_key === 'chat_and_calls') setFeatureToggleLocally('p2p_chat', nextState);
    if (feature.feature_key === 'premium_vip_upgrade') setFeatureToggleLocally('premium_upgrade', nextState);
    if (feature.feature_key === 'save_favorite') setFeatureToggleLocally('favorites', nextState);
    if (feature.feature_key === 'wallet_transfer') setFeatureToggleLocally('credit_transfer', nextState);
    if (feature.feature_key === 'credit_wallet') setFeatureToggleLocally('task_wallet', nextState);

    try {
      await supabase
        .from('feature_toggles')
        .upsert(
          {
            feature_key: feature.feature_key,
            feature_name: feature.feature_name,
            is_enabled: nextState,
            description: feature.description,
          },
          { onConflict: 'feature_key' }
        );

      await logToggleChange(feature.feature_key, nextState);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success(`${feature.feature_name}: ${nextState ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error("Could not persist setting to remote database, saved locally.");
    }
  };

  // Batch toggle all menu navigation items
  const setAllMenusState = async (enableAll: boolean) => {
    if (!isAdmin) {
      toast.error("Unauthorized: Admin privileges required.");
      return;
    }
    setApplyingPreset(true);
    try {
      const updates: Record<string, boolean> = {};
      MENU_TOGGLE_REGISTRY.forEach(m => {
        updates[m.key] = enableAll;
      });

      setFeatures(prev =>
        prev.map(f => {
          if (updates[f.feature_key] !== undefined) {
            return { ...f, is_enabled: enableAll };
          }
          return f;
        })
      );
      setBatchFeatureTogglesLocally(updates);

      const rowsToUpsert = MENU_TOGGLE_REGISTRY.map(m => ({
        feature_key: m.key,
        feature_name: m.label,
        is_enabled: enableAll,
        description: m.description,
      }));

      await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      await logToggleChange(`PRESET_SET_ALL_MENUS_${enableAll ? 'ON' : 'OFF'}`, enableAll);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success(enableAll ? "All menu navigation items shown." : "All menu navigation items hidden.");
    } catch (err: any) {
      toast.error("Failed updating menu toggles: " + err.message);
    } finally {
      setApplyingPreset(false);
    }
  };

  // Apply "WhatsApp Syndicate Focus" Preset
  const applyWhatsAppSyndicateFocus = async () => {
    if (!isAdmin) {
      toast.error("Unauthorized: Admin privileges required.");
      return;
    }

    setApplyingPreset(true);
    try {
      const updates = { ...WHATSAPP_SYNDICATE_FOCUS_PRESET };

      // Update state locally first
      setFeatures(prev =>
        prev.map(f => {
          if (updates[f.feature_key] !== undefined) {
            return { ...f, is_enabled: updates[f.feature_key] };
          }
          return f;
        })
      );
      setBatchFeatureTogglesLocally(updates);

      // Persist each toggle to database
      const rowsToUpsert = Object.entries(updates).map(([k, v]) => ({
        feature_key: k,
        feature_name: FEATURE_REGISTRY_MAP[k]?.label || k,
        is_enabled: v,
        description: FEATURE_REGISTRY_MAP[k]?.description || null,
      }));

      await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      // Audit log the preset activation
      await logToggleChange('PRESET_WHATSAPP_SYNDICATE_FOCUS', true);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});

      toast.success("WhatsApp Syndicate Focus preset applied successfully! All secondary features hidden.");
    } catch (err: any) {
      toast.error("Failed to apply preset completely: " + err.message);
    } finally {
      setApplyingPreset(false);
    }
  };

  // Reset all toggles to Default (All ON)
  const resetToAllOn = async () => {
    if (!isAdmin) {
      toast.error("Unauthorized: Admin privileges required.");
      return;
    }

    setApplyingPreset(true);
    try {
      const allOnMap: Record<string, boolean> = {};
      FEATURE_REGISTRY.forEach(f => {
        allOnMap[f.key] = true;
      });

      setFeatures(prev => prev.map(f => ({ ...f, is_enabled: true })));
      setBatchFeatureTogglesLocally(allOnMap);

      const rowsToUpsert = FEATURE_REGISTRY.map(f => ({
        feature_key: f.key,
        feature_name: f.label,
        is_enabled: true,
        description: f.description,
      }));

      await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      await logToggleChange('PRESET_RESET_ALL_ON', true);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success("All features have been enabled across the platform.");
    } catch (err: any) {
      toast.error("Failed to reset toggles: " + err.message);
    } finally {
      setApplyingPreset(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-7 w-7 animate-spin mx-auto text-orange-500" />
        <p className="text-xs text-muted-foreground mt-3 font-semibold animate-pulse">Loading feature registry & toggles...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="p-8 text-center space-y-3">
          <ShieldAlert className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-base text-foreground">Access Restricted</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Feature toggle configuration requires elevated administrative authorization. Please sign in with an authorized administrator account.
          </p>
        </CardContent>
      </Card>
    );
  }

  const groups: (FeatureGroup | 'All')[] = [
    'All',
    'Syndicate & Channels',
    'Ads & Banners',
    'Credit & Tasks Economy',
    'Business & Storefronts',
    'Community & Messaging',
    'AI & Automation',
    'Marketplace & Growth',
    'Core System',
  ];

  const filteredFeatures = FEATURE_REGISTRY.filter(def => {
    const row = features.find(f => f.feature_key === def.key);
    const matchesSearch =
      !search ||
      def.label.toLowerCase().includes(search.toLowerCase()) ||
      def.key.toLowerCase().includes(search.toLowerCase()) ||
      def.description.toLowerCase().includes(search.toLowerCase());

    const matchesGroup = selectedGroup === 'All' || def.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  const getFeatureState = (key: string): boolean => {
    const row = features.find(f => f.feature_key === key);
    if (row) return row.is_enabled;
    const def = FEATURE_REGISTRY_MAP[key];
    return def ? def.defaultState : true;
  };

  const menuSections: (MenuSection | 'All')[] = [
    'All',
    'Main Navigation',
    'Work & Growth',
    'Discover & Market',
    'Help & Account',
  ];

  const filteredMenuToggles = MENU_TOGGLE_REGISTRY.filter(m => {
    const matchesSearch =
      !search ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());

    const matchesSection = selectedMenuSection === 'All' || m.section === selectedMenuSection;

    return matchesSearch && matchesSection;
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600">
                <Settings2 className="h-5 w-5" />
              </span>
              <CardTitle className="text-lg font-black text-foreground">
                Feature Toggles & Engine Controls
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                Zero-Flash Registry
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1 leading-relaxed">
              When a toggle is <strong>OFF</strong>, that capability or menu item is hidden platform-wide.
            </CardDescription>
          </div>

          {/* Preset Buttons & Quick Tabs */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activeTab === 'features' ? (
              <>
                <Button
                  size="sm"
                  onClick={applyWhatsAppSyndicateFocus}
                  disabled={applyingPreset}
                  className="h-9 px-3.5 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-sm gap-1.5 cursor-pointer"
                >
                  <Smartphone className="h-4 w-4" />
                  WhatsApp Syndicate Focus
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={resetToAllOn}
                  disabled={applyingPreset}
                  className="h-9 px-3 text-xs font-bold rounded-xl border-border text-foreground hover:bg-muted gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset All (Turn ON)
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => setAllMenusState(true)}
                  disabled={applyingPreset}
                  className="h-9 px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  Show All Menus
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAllMenusState(false)}
                  disabled={applyingPreset}
                  className="h-9 px-3 text-xs font-bold rounded-xl border-border text-foreground hover:bg-muted gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Hide All Menus
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Master Dual Navigation Mode Switcher */}
        <div className="pt-4 flex items-center gap-2 border-b border-border/40 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'features'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            <Layers className="h-4 w-4" />
            Platform Features ({FEATURE_REGISTRY.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('menus')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'menus'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            }`}
          >
            <Menu className="h-4 w-4" />
            Menu Navigation Items ({MENU_TOGGLE_REGISTRY.length})
          </button>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'features' ? "Search features..." : "Search menu items..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {activeTab === 'features'
              ? groups.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGroup(g)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                      selectedGroup === g
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {g}
                  </button>
                ))
              : menuSections.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedMenuSection(s)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                      selectedMenuSection === s
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {activeTab === 'features' ? (
          <>
            {/* Preset Explanation Callout */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-start gap-3 text-xs">
              <Smartphone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">WhatsApp Syndicate Focus Preset</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Activates the strict single-purpose mode: disables banner ads, credit tasks, video watch-to-earn, business directory, storefronts, community feed, AI tools, and restricts Syndicate distribution to WhatsApp (Status, Group, Channel). Escrow, wallet funding, payouts, and referrals remain live.
                </p>
              </div>
            </div>

            {/* Landing Page WhatsApp Promoter Positioning Setting */}
            <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
              whatsappPositioning
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-secondary/40 border-border/60'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Hero Positioning Setting
                    </span>
                    {whatsappPositioning ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3" /> LIVE • WhatsApp Promoter Focus
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-secondary text-muted-foreground border border-border px-2 py-0.5 rounded-full text-[10px] font-bold">
                        OFF • Default General Copy
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-bold text-foreground">
                    Enable WhatsApp Promoter Positioning
                  </h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When enabled, replaces the landing page hero headline with <em>"Get customers messaging you on WhatsApp."</em>, subheadline with promoter team copy, badge with <em>"WhatsApp Promotion Team"</em>, CTA with <em>"Start my campaign"</em>, and SEO metadata. Key: <code>app_settings.landing_whatsapp_positioning</code> (Default OFF).
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-xs font-bold text-muted-foreground">
                    {whatsappPositioning ? 'Enabled' : 'Disabled'}
                  </span>
                  <Switch
                    checked={whatsappPositioning}
                    onCheckedChange={toggleWhatsappPositioning}
                    className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFeatures.map(def => {
                const isEnabled = getFeatureState(def.key);
                const isProtected = !def.canDisable;

                return (
                  <div
                    key={def.key}
                    className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      isEnabled
                        ? 'bg-card border-border/80 shadow-xs'
                        : 'bg-muted/20 border-dashed border-border/50 opacity-75'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Label
                          className={`text-xs font-bold text-foreground ${
                            isProtected ? 'cursor-default' : 'cursor-pointer'
                          }`}
                          onClick={() => !isProtected && toggleFeature({
                            id: def.key,
                            feature_key: def.key,
                            feature_name: def.label,
                            is_enabled: isEnabled,
                            description: def.description,
                          })}
                        >
                          {def.label}
                        </Label>

                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase">
                          {def.group}
                        </span>

                        {isProtected && (
                          <span className="text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Locked Core
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {def.description}
                      </p>

                      {def.routes && def.routes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">Routes:</span>
                          {def.routes.slice(0, 3).map(r => (
                            <code key={r} className="text-[10px] px-1 rounded bg-muted font-mono text-muted-foreground">
                              {r}
                            </code>
                          ))}
                          {def.routes.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{def.routes.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <Switch
                        checked={isEnabled}
                        disabled={isProtected}
                        onCheckedChange={() =>
                          toggleFeature({
                            id: def.key,
                            feature_key: def.key,
                            feature_name: def.label,
                            is_enabled: isEnabled,
                            description: def.description,
                          })
                        }
                        className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Menu Navigation Toggles Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredMenuToggles.map(menu => {
              const isEnabled = getFeatureState(menu.key);

              return (
                <div
                  key={menu.key}
                  className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                    isEnabled
                      ? 'bg-card border-border/80 shadow-xs'
                      : 'bg-muted/20 border-dashed border-border/50 opacity-75'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Label
                        className="text-xs font-bold text-foreground cursor-pointer"
                        onClick={() =>
                          toggleFeature({
                            id: menu.key,
                            feature_key: menu.key,
                            feature_name: menu.label,
                            is_enabled: isEnabled,
                            description: menu.description,
                          })
                        }
                      >
                        {menu.label}
                      </Label>

                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-600 uppercase">
                        {menu.section}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {menu.description}
                    </p>

                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>Target tab:</span>
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-foreground">
                        {menu.navTabId}
                      </code>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() =>
                        toggleFeature({
                          id: menu.key,
                          feature_key: menu.key,
                          feature_name: menu.label,
                          is_enabled: isEnabled,
                          description: menu.description,
                        })
                      }
                      className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminFeatureToggles;
