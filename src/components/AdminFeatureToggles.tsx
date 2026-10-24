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
import {
  setFeatureToggleLocally,
  setBatchFeatureTogglesLocally
} from "@/hooks/useFeatureToggles";
import {
  FEATURE_REGISTRY,
  FEATURE_REGISTRY_MAP,
  FeatureGroup,
  WHATSAPP_SYNDICATE_FOCUS_PRESET,
} from "@/lib/featureRegistry";

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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>('');
  const [applyingPreset, setApplyingPreset] = useState(false);

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
        user.email === 'accessa787@gmail.com';

      setIsAdmin(hasAdminRole);
      await fetchFeatures();
    } catch (err) {
      console.warn("Failed checking admin permissions:", err);
      setIsAdmin(false);
      setLoading(false);
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

      // Build defaults from our master FEATURE_REGISTRY
      const missingToggles = FEATURE_REGISTRY
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
      // Offline fallback using FEATURE_REGISTRY
      setFeatures(
        FEATURE_REGISTRY.map((t, idx) => ({
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
              When a toggle is <strong>OFF</strong>, that feature is completely invisible platform-wide: menus, routes, buttons, dashboard cards, guides, FAQ, search, notifications, and AI answers.
            </CardDescription>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search features by name, key, or copy..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {groups.map(g => (
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
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
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
      </CardContent>
    </Card>
  );
};

export default AdminFeatureToggles;
