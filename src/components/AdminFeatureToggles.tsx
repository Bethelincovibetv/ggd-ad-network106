import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2, Loader2, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setFeatureToggleLocally } from "@/hooks/useFeatureToggles";

interface Feature {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  description: string | null;
}

const DEFAULT_SYSTEM_TOGGLES = [
  // Platform Features
  { feature_key: 'tasks', feature_name: 'Credit Tasks System', description: 'Credit task economy & reward tasks. If switched off, buttons are hidden while maintaining background tasks.', is_enabled: true },
  { feature_key: 'community', feature_name: 'Community Feed', description: 'Social feed and discussions', is_enabled: true },
  { feature_key: 'ads', feature_name: 'Banner Advertisements', description: 'Display and creation of banner advertisements', is_enabled: true },
  { feature_key: 'syndicate', feature_name: 'Syndicate Network', description: 'Paid promoter network and promoter tasks', is_enabled: true },
  { feature_key: 'business_tasks', feature_name: 'Syndicate Campaigns', description: 'Business paid syndicate campaigns', is_enabled: true },
  { feature_key: 'p2p_chat', feature_name: 'P2P & Admin Chat', description: 'Direct messaging and user-to-user chat', is_enabled: true },
  { feature_key: 'referral_system', feature_name: 'Referral System', description: 'Referral tracking and commission rewards', is_enabled: true },
  { feature_key: 'promotional_content', feature_name: 'Promotional Content', description: 'Shareable promotional banners and links', is_enabled: true },
  { feature_key: 'marketplace', feature_name: 'Marketing Marketplace', description: 'Tools and marketing applications', is_enabled: true },
  { feature_key: 'directory', feature_name: 'Business Directory', description: 'Verified business listing directory', is_enabled: true },
  { feature_key: 'premium_upgrade', feature_name: 'VIP Membership', description: 'Premium subscription upgrades', is_enabled: true },
  { feature_key: 'api_keys', feature_name: 'Developer API Keys', description: 'External API access credentials', is_enabled: true },
  { feature_key: 'quick_guide', feature_name: 'User Guide', description: 'Interactive platform instructions', is_enabled: true },

  // Create Menu
  { feature_key: 'create_credit_task', feature_name: 'Create: Credit Task', description: 'Quick action to create a credit task', is_enabled: true },
  { feature_key: 'create_banner_ad', feature_name: 'Create: Banner Ad', description: 'Quick action to create a banner advertisement', is_enabled: true },
  { feature_key: 'create_syndicate_campaign', feature_name: 'Create: Syndicate Campaign', description: 'Quick action to launch a syndicate campaign', is_enabled: true },
  { feature_key: 'create_post', feature_name: 'Create: Community Post', description: 'Quick action to write a community post', is_enabled: true },

  // Navigation Menu
  { feature_key: 'nav_credit_tasks', feature_name: 'Menu: Credit Tasks Button', description: 'Hide or show the Credit Tasks button on side nav, top nav, and mobile footer menu without disabling the underlying task system', is_enabled: true },
  { feature_key: 'nav_home', feature_name: 'Menu: Home Button', description: 'Show or hide Home button on menus', is_enabled: true },
  { feature_key: 'nav_campaigns', feature_name: 'Menu: Banner Ads Button', description: 'Show or hide Banner Ads button on menus', is_enabled: true },
  { feature_key: 'nav_wallet', feature_name: 'Menu: Wallet Button', description: 'Show or hide Wallet button on menus', is_enabled: true },
  { feature_key: 'nav_inbox', feature_name: 'Menu: Inbox Button', description: 'Show or hide Inbox button on menus', is_enabled: true },
  { feature_key: 'nav_profile', feature_name: 'Menu: Profile Button', description: 'Show or hide Profile button on menus', is_enabled: true },
  { feature_key: 'nav_my_business', feature_name: 'Menu: My Business Button', description: 'Show or hide My Business button on menus', is_enabled: true },
  { feature_key: 'nav_guide', feature_name: 'Menu: User Guide Button', description: 'Show or hide User Guide button on menus', is_enabled: true },
  { feature_key: 'nav_about', feature_name: 'Menu: About Button', description: 'Show or hide About GGD button on menus', is_enabled: true },
];

const AdminFeatureToggles = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchFeatures(); }, []);

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase.from('feature_toggles').select('*').order('feature_name');
      let currentFeatures: Feature[] = (data as Feature[]) || [];

      // Check if any default toggles are missing from the database
      const existingKeys = new Set(currentFeatures.map(f => f.feature_key));
      const missingToggles = DEFAULT_SYSTEM_TOGGLES.filter(t => !existingKeys.has(t.feature_key));

      if (missingToggles.length > 0) {
        const { data: inserted } = await supabase.from('feature_toggles').insert(missingToggles).select('*');
        if (inserted) {
          currentFeatures = [...currentFeatures, ...(inserted as Feature[])];
        }
      }

      setFeatures(currentFeatures);
    } catch {
      // Fallback in case of temporary network issue
      setFeatures(DEFAULT_SYSTEM_TOGGLES.map((t, idx) => ({ ...t, id: `default-${idx}` })));
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (feature: Feature) => {
    const nextState = !feature.is_enabled;
    // Immediate optimistic local update
    setFeatures(prev => prev.map(f => f.id === feature.id ? { ...f, is_enabled: nextState } : f));
    setFeatureToggleLocally(feature.feature_key, nextState);

    try {
      const { error } = await supabase
        .from('feature_toggles')
        .update({ is_enabled: nextState })
        .eq('feature_key', feature.feature_key);

      if (error) {
        // Retry with id if key match failed
        await supabase.from('feature_toggles').update({ is_enabled: nextState }).eq('id', feature.id);
      }

      toast.success(`${feature.feature_name}: ${nextState ? 'Enabled' : 'Disabled'}`);
    } catch {
      toast.error("Failed to persist toggle setting to database");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p className="text-xs text-muted-foreground mt-2">Loading feature toggles...</p>
      </div>
    );
  }

  const groupOf = (key: string) =>
    key.startsWith('nav_') ? 'Navigation Menu'
      : key.startsWith('create_') ? 'Create Menu'
      : 'Platform Features';

  const groups = ['Navigation Menu', 'Platform Features', 'Create Menu'];

  const filteredFeatures = features.filter(f =>
    !search ||
    f.feature_name.toLowerCase().includes(search.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(search.toLowerCase())) ||
    f.feature_key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />Feature Toggles
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Enable or disable platform features, navigation buttons, and quick actions in real time.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search toggles..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs rounded-xl bg-muted/30"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        {groups.map(g => {
          const items = filteredFeatures.filter(f => groupOf(f.feature_key) === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                  {g}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {items.filter(i => i.is_enabled).length}/{items.length} enabled
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {items.map(f => (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                      f.is_enabled
                        ? 'bg-card border-border/80 shadow-xs'
                        : 'bg-muted/20 border-dashed border-border/40 opacity-75'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs font-bold text-foreground cursor-pointer" onClick={() => toggleFeature(f)}>
                          {f.feature_name}
                        </Label>
                        {f.feature_key === 'nav_credit_tasks' && (
                          <span className="text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded-md">
                            Target Toggle
                          </span>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {f.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={f.is_enabled}
                      onCheckedChange={() => toggleFeature(f)}
                      className="shrink-0 data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminFeatureToggles;
