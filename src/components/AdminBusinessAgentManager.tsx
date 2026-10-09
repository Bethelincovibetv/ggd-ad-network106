import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Sparkles, ShieldCheck, Settings, CheckCircle2, AlertTriangle, 
  RefreshCw, Play, Package, Store, ArrowRight, UserCheck, Key, Zap
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles, setFeatureToggleLocally } from "@/hooks/useFeatureToggles";
import VixoraBusinessAiAgentModal from "@/components/business/VixoraBusinessAiAgentModal";
import vixoraAgentAvatar from "@/assets/images/vixora_agent_avatar_1786108775324.jpg";

export const AdminBusinessAgentManager: React.FC = () => {
  const { isEnabled, features } = useFeatureToggles();
  const [agentActive, setAgentActive] = useState<boolean>(true);
  const [navButtonActive, setNavButtonActive] = useState<boolean>(true);
  const [vixoraAiStudioActive, setVixoraAiStudioActive] = useState<boolean>(true);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAgentActive(isEnabled('vixora_business_agent'));
    setNavButtonActive(isEnabled('nav_business_ai_agent'));
    setVixoraAiStudioActive(isEnabled('vixora_ai'));
  }, [features]);

  const toggleBusinessAgent = async (nextState: boolean) => {
    setAgentActive(nextState);
    setFeatureToggleLocally('vixora_business_agent', nextState);
    try {
      const { error } = await supabase
        .from('feature_toggles')
        .update({ is_enabled: nextState })
        .eq('feature_key', 'vixora_business_agent');

      if (error) {
        await supabase.from('feature_toggles').upsert({
          feature_key: 'vixora_business_agent',
          feature_name: 'Vixora AI Business Agent',
          description: 'AI business copilot for merchants and store owners. Helps businesses manage their profile, create and update products and services, inspect analytics, and automate operations. Works independently even when Vixora AI Studio is switched off.',
          is_enabled: nextState
        }, { onConflict: 'feature_key' });
      }

      toast.success(`Vixora Business AI Agent ${nextState ? 'Enabled' : 'Disabled'}`);
    } catch (e: any) {
      toast.error('Failed to update toggle: ' + e.message);
    }
  };

  const toggleNavButton = async (nextState: boolean) => {
    setNavButtonActive(nextState);
    setFeatureToggleLocally('nav_business_ai_agent', nextState);
    try {
      await supabase
        .from('feature_toggles')
        .upsert({
          feature_key: 'nav_business_ai_agent',
          feature_name: 'Menu: Business AI Agent Button',
          description: 'Show or hide the Business AI Agent buttons in business dashboards and storefronts.',
          is_enabled: nextState
        }, { onConflict: 'feature_key' });

      toast.success(`Business AI Agent Navigation ${nextState ? 'Visible' : 'Hidden'}`);
    } catch (e: any) {
      toast.error('Failed to update nav toggle: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Overview */}
      <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-gradient-to-br from-violet-950 via-slate-900 to-purple-950 text-white">
        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={vixoraAgentAvatar}
                alt="Vixora Agent"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-4 ring-violet-500/30 shadow-xl"
              />
              <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-slate-950 ${agentActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Vixora Business AI Agent Management
                </h2>
                <Badge className={agentActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs' : 'bg-red-500/20 text-red-300 border-red-500/30 text-xs'}>
                  {agentActive ? 'ACTIVE & OPERATIONAL' : 'DISABLED BY ADMIN'}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  Autonomous Engine
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-violet-200/80 max-w-2xl leading-relaxed">
                Autonomous AI business copilot that helps merchants create products, publish professional services, update catalog pricing, synchronize business profiles, and generate promotional graphics.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-violet-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Independent Toggle Isolation (Unaffected if Vixora Video Studio is Off)
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  Direct Database Execution (business_listings & business_profiles)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
            <Button
              size="lg"
              onClick={() => setTestModalOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-xl gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" /> Launch Agent Sandbox
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Control Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Toggle & Permissions Control */}
        <Card className="border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="h-4 w-4 text-violet-600" />
              Agent Master Toggle & Permission Status
            </CardTitle>
            <CardDescription className="text-xs">
              Configure operational availability and storefront visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Master Agent Toggle */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Vixora Business AI Agent Master Toggle
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Controls the AI copilot in user dashboards, storefronts, and chat tools.
                </p>
              </div>
              <Switch
                checked={agentActive}
                onCheckedChange={toggleBusinessAgent}
                className="data-[state=checked]:bg-violet-600 cursor-pointer"
              />
            </div>

            {/* Nav Launcher Toggle */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Storefront & Dashboard Copilot Launcher
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Display quick launcher buttons and banner chip in merchant interfaces.
                </p>
              </div>
              <Switch
                checked={navButtonActive}
                onCheckedChange={toggleNavButton}
                className="data-[state=checked]:bg-violet-600 cursor-pointer"
              />
            </div>

            {/* Architecture Independence Verification */}
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Feature Toggle Isolation Check
                </span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {vixoraAiStudioActive ? 'Studio: Active' : 'Studio: Disabled'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Notice: When the <strong>Vixora AI Creator Studio</strong> (video generation) is switched off in Feature Toggles, this Business AI Agent remains <strong>100% operational</strong> for merchants. It is only disabled when its own toggle above is turned off.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Capabilities & Live Tools Matrix */}
        <Card className="border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Automated Business Agent Capabilities
            </CardTitle>
            <CardDescription className="text-xs">
              Actions the Business AI Agent can perform autonomously on behalf of users.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {[
              {
                title: "Create Products & Services",
                desc: "Parses titles, pricing in Naira (₦), and descriptions, then inserts records into business_listings.",
                icon: Package,
                badge: "Active",
                color: "text-emerald-500 bg-emerald-500/10"
              },
              {
                title: "Update Catalog & Pricing",
                desc: "Finds products by name or ID and updates price, active status, or details in real time.",
                icon: Store,
                badge: "Active",
                color: "text-blue-500 bg-blue-500/10"
              },
              {
                title: "Synchronize Business Profile",
                desc: "Updates business name, phone/WhatsApp, physical address, and store description.",
                icon: UserCheck,
                badge: "Active",
                color: "text-purple-500 bg-purple-500/10"
              },
              {
                title: "Generate Marketing Flyers",
                desc: "Draws 1080x1350 Instagram/WhatsApp promotional flyers with prices, branding, and WhatsApp CTA.",
                icon: Sparkles,
                badge: "Active",
                color: "text-orange-500 bg-orange-500/10"
              }
            ].map((cap, i) => (
              <div key={i} className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${cap.color}`}>
                  <cap.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate">{cap.title}</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      {cap.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cap.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Interactive Modal Sandbox for Admin testing */}
      <VixoraBusinessAiAgentModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        initialPrompt="What products are currently in my store?"
      />
    </div>
  );
};

export default AdminBusinessAgentManager;
