import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings2, Loader2, Search, CheckCircle2, ShieldAlert, Sparkles,
  Smartphone, RotateCcw, AlertTriangle, Lock, Eye, History, Check, X
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
  FEATURE_LEGACY_ALIASES,
  FEATURE_NAV_KEYS,
  getRelatedFeatureKeys,
  isFeatureEnabled,
} from "@/lib/featureRegistry";
import { Menu, Layers } from "lucide-react";

interface FeatureRow {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  description: string | null;
}

interface AdminFeatureTogglesProps {
  initialSearch?: string;
  initialTab?: 'features' | 'menus';
}

const AdminFeatureToggles: React.FC<AdminFeatureTogglesProps> = ({
  initialSearch,
  initialTab,
}) => {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch || '');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedMenuSection, setSelectedMenuSection] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'features' | 'menus'>(initialTab || 'features');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>('');
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [whatsappPositioning, setWhatsappPositioning] = useState<boolean>(false);
  const [savingWhatsappToggle, setSavingWhatsappToggle] = useState(false);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setSelectedGroup('All');
      setSelectedMenuSection('All');
    }
  }, [initialSearch]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    checkAdminAndFetch();
    const syncHandler = (e: any) => {
      const enabled = e?.detail?.enabled;
      if (typeof enabled === 'boolean') {
        setWhatsappPositioning(enabled);
      }
    };
    window.addEventListener('ggd-whatsapp-positioning-changed', syncHandler);
    return () => window.removeEventListener('ggd-whatsapp-positioning-changed', syncHandler);
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
    if (savingWhatsappToggle) return;
    const val = checked ? 'true' : 'false';
    const previousState = whatsappPositioning;

    // Optimistically update toggle state
    setWhatsappPositioning(checked);
    setSavingWhatsappToggle(true);

    const getValidToken = async (forceRefresh = false): Promise<string | null> => {
      if (forceRefresh) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        return refreshed?.session?.access_token || null;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : 0;
      const isNearExpiry = expiresAtMs > 0 && expiresAtMs < Date.now() + 60_000;
      if (!session?.access_token || isNearExpiry) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session?.access_token) {
          return refreshed.session.access_token;
        }
      }
      return session?.access_token || getLocalSession()?.access_token || null;
    };

    try {
      let token = await getValidToken(false);
      if (!token) {
        throw new Error('Active session token missing. Please sign in as administrator.');
      }

      // 1. Authoritative server function call verifying admin role from session token
      let resp = await fetch('/api/admin/settings/landing_whatsapp_positioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: checked }),
      });

      // Retry once with refreshed token if session just expired
      if (resp.status === 401) {
        const freshToken = await getValidToken(true);
        if (freshToken) {
          resp = await fetch('/api/admin/settings/landing_whatsapp_positioning', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${freshToken}`,
            },
            body: JSON.stringify({ enabled: checked }),
          });
        }
      }

      const data = await resp.json().catch(() => ({ success: false, error: 'Server communication error' }));

      if (!resp.ok || data.success !== true) {
        throw new Error(data.error || 'Server rejected setting change');
      }

      // 2. Only write to localStorage after confirmed save
      try {
        localStorage.setItem('landing_whatsapp_positioning', val);
      } catch {}

      window.dispatchEvent(new CustomEvent('ggd-whatsapp-positioning-changed', { detail: { enabled: checked } }));

      toast.success(checked 
        ? 'Enable WhatsApp Promoter Positioning: ON' 
        : 'Enable WhatsApp Promoter Positioning: OFF'
      );
    } catch (err: any) {
      // Revert toggle state, show error toast, do not write to localStorage
      setWhatsappPositioning(previousState);
      toast.error('Failed to change setting: ' + (err.message || 'Permission denied'));
    } finally {
      setSavingWhatsappToggle(false);
    }
  };

  const getDeduplicatedMasterDefinitions = () => {
    const map = new Map<string, { key: string; label: string; description: string; defaultState: boolean }>();
    FEATURE_REGISTRY.forEach(t => {
      map.set(t.key, { key: t.key, label: t.label, description: t.description, defaultState: t.defaultState });
    });
    MENU_TOGGLE_REGISTRY.forEach(m => {
      if (!map.has(m.key)) {
        map.set(m.key, { key: m.key, label: m.label, description: m.description, defaultState: m.defaultState });
      }
    });
    return Array.from(map.values());
  };

  const fetchFeatures = async () => {
    try {
      const { data } = await supabase
        .from('feature_toggles')
        .select('*')
        .order('feature_name');

      let currentFeatures: FeatureRow[] = (data as FeatureRow[]) || [];
      const existingKeys = new Set(currentFeatures.map(f => f.feature_key));

      // Build deduplicated defaults from FEATURE_REGISTRY and MENU_TOGGLE_REGISTRY
      const allMasterDefinitions = getDeduplicatedMasterDefinitions();

      const missingToggles = allMasterDefinitions
        .filter(t => !existingKeys.has(t.key))
        .map(t => ({
          feature_key: t.key,
          feature_name: t.label,
          description: t.description,
          is_enabled: t.defaultState,
        }));

      if (missingToggles.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('feature_toggles')
          .upsert(missingToggles, { onConflict: 'feature_key' })
          .select('*');

        if (!insertError && inserted) {
          const insertedKeys = new Set((inserted as FeatureRow[]).map(r => r.feature_key));
          currentFeatures = [
            ...currentFeatures.filter(r => !insertedKeys.has(r.feature_key)),
            ...(inserted as FeatureRow[]),
          ];
        }
      }

      setFeatures(currentFeatures);
    } catch (err) {
      // Offline fallback using deduplicated FEATURE_REGISTRY and MENU_TOGGLE_REGISTRY
      const allMasterDefinitions = getDeduplicatedMasterDefinitions();
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
      await supabase.from('admin_audit_logs' as any).insert({
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

    const relatedKeys = getRelatedFeatureKeys(feature.feature_key);
    const protectedDef = relatedKeys.map(k => FEATURE_REGISTRY_MAP[k]).find(d => d && !d.canDisable);
    if (protectedDef) {
      toast.info(`${protectedDef.label} is a protected core system feature and cannot be disabled.`);
      return;
    }

    const nextState = !feature.is_enabled;
    const previousFeatures = features;

    // Collect canonical + legacy aliases + associated nav keys when turning ON
    const navKeysToRestore = nextState
      ? relatedKeys.flatMap(k => FEATURE_NAV_KEYS[k] || [])
      : [];
    const allAffectedKeys = Array.from(new Set([...relatedKeys, ...navKeysToRestore]));

    // Special parity: nav_feed <-> community_feed, nav_airtime_redeem <-> credit_airtime_redeem
    if (nextState) {
      if (feature.feature_key === 'nav_feed') allAffectedKeys.push('community_feed', 'community');
      if (feature.feature_key === 'nav_credit_tasks' || feature.feature_key === 'nav_social_tasks') {
        allAffectedKeys.push('credit_tasks', 'tasks');
      }
      if (feature.feature_key === 'nav_airtime_redeem') {
        allAffectedKeys.push('credit_airtime_redeem', 'airtime_redeem');
      }
    }

    const uniqueKeys = Array.from(new Set(allAffectedKeys));
    const localBatch: Record<string, boolean> = {};
    uniqueKeys.forEach(k => {
      localBatch[k] = nextState;
    });

    // Optimistic state update
    setFeatures(prev => {
      const existingSet = new Set(prev.map(f => f.feature_key));
      const updated = prev.map(f =>
        uniqueKeys.includes(f.feature_key) ? { ...f, is_enabled: nextState } : f
      );
      uniqueKeys.forEach(k => {
        if (!existingSet.has(k)) {
          const reg = FEATURE_REGISTRY_MAP[k] || MENU_TOGGLE_MAP[k];
          updated.push({
            id: k,
            feature_key: k,
            feature_name: reg?.label || feature.feature_name,
            is_enabled: nextState,
            description: reg?.description || feature.description,
          });
        }
      });
      return updated;
    });

    const rowsToUpsert = uniqueKeys.map(k => {
      const reg = FEATURE_REGISTRY_MAP[k] || MENU_TOGGLE_MAP[k];
      return {
        feature_key: k,
        feature_name: reg?.label || feature.feature_name,
        is_enabled: nextState,
        description: reg?.description || feature.description,
      };
    });

    try {
      const { error } = await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      if (error) {
        throw error;
      }

      setBatchFeatureTogglesLocally(localBatch);
      await logToggleChange(feature.feature_key, nextState);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success(`${feature.feature_name}: ${nextState ? 'Enabled' : 'Disabled'}`);
    } catch (err: any) {
      setFeatures(previousFeatures);
      toast.error(`Failed to save ${feature.feature_name}: ${err?.message || 'Permission denied'}`);
    }
  };

  // One-click restore for Community, Tasks, and Redeem Airtime & Data pages + menu items
  const restoreCoreCommunityTasksAirtime = async () => {
    if (!isAdmin) {
      toast.error("Unauthorized: Admin privileges required.");
      return;
    }

    setApplyingPreset(true);
    const previousFeatures = features;
    const keysToEnable = [
      'community_feed', 'community', 'nav_feed',
      'credit_tasks', 'tasks', 'nav_credit_tasks', 'nav_social_tasks',
      'credit_airtime_redeem', 'airtime_redeem', 'nav_airtime_redeem',
      'credit_wallet', 'task_wallet',
    ];

    const batchUpdates: Record<string, boolean> = {};
    keysToEnable.forEach(k => {
      batchUpdates[k] = true;
    });

    const rowsToUpsert = keysToEnable.map(k => {
      const reg = FEATURE_REGISTRY_MAP[k] || MENU_TOGGLE_MAP[k];
      return {
        feature_key: k,
        feature_name: reg?.label || k,
        is_enabled: true,
        description: reg?.description || 'Restored core user page and navigation item',
      };
    });

    try {
      const { error } = await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      if (error) throw error;

      setFeatures(prev => {
        const existingSet = new Set(prev.map(f => f.feature_key));
        const next = prev.map(f => (batchUpdates[f.feature_key] ? { ...f, is_enabled: true } : f));
        rowsToUpsert.forEach(r => {
          if (!existingSet.has(r.feature_key)) {
            next.push({ id: r.feature_key, ...r });
          }
        });
        return next;
      });
      setBatchFeatureTogglesLocally(batchUpdates);

      await logToggleChange('RESTORE_COMMUNITY_TASKS_AIRTIME', true);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success("Community Page, Task Page & Redeem Airtime Page restored and enabled!");
    } catch (err: any) {
      setFeatures(previousFeatures);
      toast.error("Failed restoring pages: " + (err?.message || 'Permission denied'));
    } finally {
      setApplyingPreset(false);
    }
  };

  // Batch toggle all menu navigation items
  const setAllMenusState = async (enableAll: boolean) => {
    if (!isAdmin) {
      toast.error("Unauthorized: Admin privileges required.");
      return;
    }
    setApplyingPreset(true);
    const previousFeatures = features;
    try {
      const updates: Record<string, boolean> = {};
      MENU_TOGGLE_REGISTRY.forEach(m => {
        updates[m.key] = enableAll;
      });

      const rowsToUpsert = MENU_TOGGLE_REGISTRY.map(m => ({
        feature_key: m.key,
        feature_name: m.label,
        is_enabled: enableAll,
        description: m.description,
      }));

      const { error } = await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      if (error) throw error;

      setFeatures(prev =>
        prev.map(f => {
          if (updates[f.feature_key] !== undefined) {
            return { ...f, is_enabled: enableAll };
          }
          return f;
        })
      );
      setBatchFeatureTogglesLocally(updates);

      await logToggleChange(`PRESET_SET_ALL_MENUS_${enableAll ? 'ON' : 'OFF'}`, enableAll);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success(enableAll ? "All menu navigation items shown." : "All menu navigation items hidden.");
    } catch (err: any) {
      setFeatures(previousFeatures);
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
    const previousFeatures = features;
    try {
      const updates: Record<string, boolean> = { ...WHATSAPP_SYNDICATE_FOCUS_PRESET };
      // Propagate preset states to legacy aliases too so stale legacy keys don't conflict
      Object.entries(WHATSAPP_SYNDICATE_FOCUS_PRESET).forEach(([canonical, enabled]) => {
        (FEATURE_LEGACY_ALIASES[canonical] || []).forEach(alias => {
          updates[alias] = enabled;
        });
      });

      // Persist each toggle to database
      const rowsToUpsert = Object.entries(updates).map(([k, v]) => ({
        feature_key: k,
        feature_name: FEATURE_REGISTRY_MAP[k]?.label || MENU_TOGGLE_MAP[k]?.label || k,
        is_enabled: v,
        description: FEATURE_REGISTRY_MAP[k]?.description || MENU_TOGGLE_MAP[k]?.description || null,
      }));

      const { error } = await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      if (error) throw error;

      setFeatures(prev =>
        prev.map(f => {
          if (updates[f.feature_key] !== undefined) {
            return { ...f, is_enabled: updates[f.feature_key] };
          }
          return f;
        })
      );
      setBatchFeatureTogglesLocally(updates);

      // Audit log the preset activation
      await logToggleChange('PRESET_WHATSAPP_SYNDICATE_FOCUS', true);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});

      toast.success("WhatsApp Syndicate Focus preset applied successfully! All secondary features hidden.");
    } catch (err: any) {
      setFeatures(previousFeatures);
      toast.error("Failed to apply preset completely: " + err.message);
    } finally {
      setApplyingPreset(false);
    }
  };

  // Reset all toggles to Default (All ON including menu items & legacy aliases)
  const resetToAllOn = async () => {
    if (!isAdmin) {
      toast.error("Unauthorized: Admin privileges required.");
      return;
    }

    setApplyingPreset(true);
    const previousFeatures = features;
    try {
      const allOnMap: Record<string, boolean> = {};
      const rowMap = new Map<string, { feature_key: string; feature_name: string; is_enabled: boolean; description: string | null }>();

      FEATURE_REGISTRY.forEach(f => {
        allOnMap[f.key] = true;
        rowMap.set(f.key, {
          feature_key: f.key,
          feature_name: f.label,
          is_enabled: true,
          description: f.description,
        });
        (FEATURE_LEGACY_ALIASES[f.key] || []).forEach(alias => {
          allOnMap[alias] = true;
          if (!rowMap.has(alias)) {
            rowMap.set(alias, {
              feature_key: alias,
              feature_name: f.label,
              is_enabled: true,
              description: f.description,
            });
          }
        });
      });

      MENU_TOGGLE_REGISTRY.forEach(m => {
        allOnMap[m.key] = true;
        if (!rowMap.has(m.key)) {
          rowMap.set(m.key, {
            feature_key: m.key,
            feature_name: m.label,
            is_enabled: true,
            description: m.description,
          });
        }
      });

      const rowsToUpsert = Array.from(rowMap.values());

      const { error } = await supabase
        .from('feature_toggles')
        .upsert(rowsToUpsert, { onConflict: 'feature_key' });

      if (error) throw error;

      setFeatures(prev => {
        const existingSet = new Set(prev.map(f => f.feature_key));
        const next = prev.map(f => ({ ...f, is_enabled: true }));
        rowsToUpsert.forEach(r => {
          if (!existingSet.has(r.feature_key)) {
            next.push({ id: r.feature_key, ...r });
          }
        });
        return next;
      });
      setBatchFeatureTogglesLocally(allOnMap);

      await logToggleChange('PRESET_RESET_ALL_ON', true);
      fetch('/api/admin/invalidate-feature-cache', { method: 'POST' }).catch(() => {});
      toast.success("All features and menu items have been enabled across the platform.");
    } catch (err: any) {
      setFeatures(previousFeatures);
      toast.error("Failed to reset toggles: " + err.message);
    } finally {
      setApplyingPreset(false);
    }
  };

  const liveToggleMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    features.forEach(f => {
      map[f.feature_key] = f.is_enabled;
    });
    return map;
  }, [features]);

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

  const groups: (FeatureGroup | 'Menu Navigation' | 'All')[] = [
    'All',
    'Menu Navigation',
    'Syndicate & Channels',
    'Ads & Banners',
    'Credit & Tasks Economy',
    'Business & Storefronts',
    'Community & Messaging',
    'AI & Automation',
    'Marketplace & Growth',
    'Core System',
  ];

  const normalizedQuery = search.trim().toLowerCase();

  const filteredFeatures = FEATURE_REGISTRY.filter(def => {
    const matchesSearch =
      !normalizedQuery ||
      def.label.toLowerCase().includes(normalizedQuery) ||
      def.key.toLowerCase().includes(normalizedQuery) ||
      def.description.toLowerCase().includes(normalizedQuery) ||
      def.group.toLowerCase().includes(normalizedQuery) ||
      (def.routes || []).some(r => r.toLowerCase().includes(normalizedQuery)) ||
      (def.keywords || []).some(k => k.toLowerCase().includes(normalizedQuery));

    const matchesGroup = selectedGroup === 'All' || def.group === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  const getFeatureState = (key: string): boolean => {
    return isFeatureEnabled(key, liveToggleMap);
  };

  const anyCoreRestorableOff =
    !getFeatureState('community_feed') ||
    !getFeatureState('nav_feed') ||
    !getFeatureState('credit_tasks') ||
    !getFeatureState('nav_credit_tasks') ||
    !getFeatureState('credit_airtime_redeem') ||
    !getFeatureState('nav_airtime_redeem');

  const menuSections: (MenuSection | 'All')[] = [
    'All',
    'Main Navigation',
    'Work & Growth',
    'Discover & Market',
    'Help & Account',
  ];

  const filteredMenuToggles = MENU_TOGGLE_REGISTRY.filter(m => {
    const matchesSearch =
      !normalizedQuery ||
      m.label.toLowerCase().includes(normalizedQuery) ||
      m.key.toLowerCase().includes(normalizedQuery) ||
      m.description.toLowerCase().includes(normalizedQuery) ||
      m.navTabId.toLowerCase().includes(normalizedQuery) ||
      m.section.toLowerCase().includes(normalizedQuery);

    const matchesSection = selectedMenuSection === 'All' || m.section === selectedMenuSection;

    return matchesSearch && matchesSection;
  });

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
                  onClick={restoreCoreCommunityTasksAirtime}
                  disabled={applyingPreset}
                  variant={anyCoreRestorableOff ? 'default' : 'outline'}
                  className={`h-9 px-3 text-xs font-bold rounded-xl gap-1.5 cursor-pointer ${
                    anyCoreRestorableOff
                      ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                      : 'border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Restore Community, Tasks & Airtime
                </Button>
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
        <div className="pt-4 flex items-center gap-2 border-b border-border/40 pb-3 flex-wrap">
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
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'features' ? "Search features, routes, or keywords..." : "Search menu items or tabs..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs rounded-xl bg-muted/40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md cursor-pointer"
                aria-label="Clear feature search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
        {anyCoreRestorableOff && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">
                  One or more restored user pages are currently switched OFF
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Community Page, Task Page, or Redeem Airtime & Data (or their menu links) are disabled. Click restore to turn all three back on immediately.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={restoreCoreCommunityTasksAirtime}
              disabled={applyingPreset}
              className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              Restore All Three Now
            </Button>
          </div>
        )}

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
                    disabled={savingWhatsappToggle}
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
              {filteredFeatures.length === 0 && (
                <div className="col-span-full py-10 text-center space-y-2 rounded-2xl border border-dashed border-border bg-muted/20">
                  <Search className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs font-bold text-foreground">No matching feature toggle found</p>
                  <p className="text-[11px] text-muted-foreground">
                    Try clearing your search or checking the Menu Navigation Items tab.
                  </p>
                  {search && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSearch('')}
                      className="h-8 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Clear search filter
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Menu Navigation Items Section rendered directly on main view */}
            {(selectedGroup === 'All' || selectedGroup === 'Menu Navigation') && (
              <div className="pt-6 border-t border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                      <Menu className="h-4 w-4 text-orange-500" />
                      Menu Navigation Item Toggles ({MENU_TOGGLE_REGISTRY.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show or hide individual navigation items across sidebars, headers, and footers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAllMenusState(true)}
                      disabled={applyingPreset}
                      className="h-8 text-xs font-bold rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                    >
                      Show All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAllMenusState(false)}
                      disabled={applyingPreset}
                      className="h-8 text-xs font-bold rounded-lg border-border text-muted-foreground hover:bg-muted"
                    >
                      Hide All
                    </Button>
                  </div>
                </div>

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
              </div>
            )}
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
            {filteredMenuToggles.length === 0 && (
              <div className="col-span-full py-10 text-center space-y-2 rounded-2xl border border-dashed border-border bg-muted/20">
                <Search className="h-6 w-6 text-muted-foreground/50 mx-auto" />
                <p className="text-xs font-bold text-foreground">No matching menu toggle found</p>
                {search && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearch('')}
                    className="h-8 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Clear search filter
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminFeatureToggles;
