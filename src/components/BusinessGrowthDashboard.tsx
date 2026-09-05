import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  TrendingUp,
  Users,
  Trophy,
  Loader2,
  ArrowRight,
  Activity,
  Megaphone,
  CheckSquare,
  Share2,
  Store,
  Sparkles,
  CheckCircle2,
  Building2,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface Props {
  onNavigate?: (tab: string) => void;
}

interface Tip {
  text: string;
  action?: string;
  tab?: string;
}

/** Business Management & Growth Control Center */
const BusinessGrowthDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(0);
  const [traffic, setTraffic] = useState({ views: 0, clicks: 0, prevViews: 0 });
  const [leads, setLeads] = useState(0);
  const [best, setBest] = useState<{ title: string; clicks: number; impressions: number } | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [counts, setCounts] = useState({
    activeAds: 0,
    activeTasks: 0,
    activeListings: 0,
    syndicateCampaigns: 0,
  });
  const [profileData, setProfileData] = useState<{
    businessName?: string;
    hasLogo: boolean;
    hasDesc: boolean;
    hasContact: boolean;
    businessSlug?: string;
  }>({
    hasLogo: false,
    hasDesc: false,
    hasContact: false,
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }

    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const prevSince = new Date(Date.now() - 14 * 864e5).toISOString();

    const [
      { data: ads },
      { data: profile },
      { data: listings },
      { data: bp },
      { data: tasks },
      { data: synTasks },
    ] = await Promise.all([
      supabase.from("ads").select("id,title,impressions,clicks,is_active,expires_at,created_at").eq("user_id", uid),
      supabase.from("profiles").select("business_name,business_description,business_logo_url,industry,state,whatsapp_number,business_slug").eq("user_id", uid).maybeSingle(),
      supabase.from("business_listings").select("id,is_active").eq("user_id", uid),
      supabase.from("business_profiles").select("id,logo_url,hero_image_url,category_id").eq("user_id", uid).maybeSingle(),
      supabase.from("tasks").select("id,is_active").eq("creator_id", uid),
      supabase.from("syndicate_tasks").select("id,status").eq("business_user_id", uid),
    ]);

    const adIds = (ads || []).map((a) => a.id);
    let views = 0, clicks = 0, prevViews = 0;
    if (adIds.length) {
      const { data: ev } = await supabase
        .from("ad_events")
        .select("event_type,created_at")
        .in("ad_id", adIds)
        .gte("created_at", prevSince);

      (ev || []).forEach((e) => {
        const recent = e.created_at >= since;
        if (e.event_type === "impression") recent ? views++ : prevViews++;
        else if (e.event_type === "click" && recent) clicks++;
      });
    }
    setTraffic({ views, clicks, prevViews });

    const { count: leadCount } = await supabase
      .from("p2p_messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", uid)
      .gte("created_at", since);
    setLeads(leadCount || 0);

    const now = Date.now();
    const liveAds = (ads || []).filter((a) => a.is_active && (!a.expires_at || new Date(a.expires_at).getTime() > now));
    const liveTasks = (tasks || []).filter((t) => t.is_active);
    const liveListings = (listings || []).filter((l) => l.is_active);
    const liveSyn = (synTasks || []).filter((s) => s.status === "active");

    setCounts({
      activeAds: liveAds.length,
      activeTasks: liveTasks.length,
      activeListings: liveListings.length,
      syndicateCampaigns: liveSyn.length,
    });

    setProfileData({
      businessName: profile?.business_name || undefined,
      hasLogo: !!(profile?.business_logo_url || bp?.logo_url),
      hasDesc: !!profile?.business_description,
      hasContact: !!profile?.whatsapp_number,
      businessSlug: profile?.business_slug || undefined,
    });

    const top = [...(ads || [])].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
    setBest(top ? { title: top.title, clicks: top.clicks || 0, impressions: top.impressions || 0 } : null);

    // Campaign health: share of campaigns that are live and getting clicks
    const withClicks = (ads || []).filter((a) => (a.clicks || 0) > 0).length;
    const h = ads?.length ? Math.round(((liveAds.length * 0.5 + withClicks * 0.5) / ads.length) * 100) : 0;
    setHealth(Math.min(100, h));

    // Growth score
    let s = 0;
    if (profile?.business_name) s += 15;
    if (profile?.business_description) s += 15;
    if (profile?.business_logo_url || bp?.logo_url) s += 15;
    if (profile?.whatsapp_number) s += 10;
    if ((listings || []).length > 0) s += 15;
    if ((listings || []).length >= 3) s += 10;
    if (liveAds.length > 0) s += 10;
    if (clicks > 0) s += 10;
    setScore(Math.min(100, s));

    const t: Tip[] = [];
    if (!profile?.business_name || !profile?.business_description) {
      t.push({ text: "Complete your business profile so customers trust your brand.", action: "Complete Profile", tab: "business" });
    }
    if (!(listings || []).length) {
      t.push({ text: "Add your first product or service listing to receive customer orders.", action: "Add Listing", tab: "business" });
    } else if ((listings || []).length < 3) {
      t.push({ text: "Add more products — businesses with 3+ listings get 4x more customer inquiries.", action: "Add Products", tab: "business" });
    }
    if (isEnabled("ads")) {
      if (!liveAds.length) {
        t.push({ text: "You have no active Banner Advert. Create one to drive instant traffic to your store.", action: "Create Advert", tab: "ads-create" });
      } else if (views > 200 && clicks / Math.max(views, 1) < 0.02) {
        t.push({ text: "Your advert has good reach but low CTR. Use the AI Assistant to rewrite the headline.", action: "Optimize Campaign", tab: "ads" });
      }
    }
    if (isEnabled("syndicate") && isEnabled("business_tasks") && !liveSyn.length) {
      t.push({ text: "Mobilize verified WhatsApp promoters to distribute your business offers across thousands of status views.", action: "Launch Syndicate Campaign", tab: "business-tasks" });
    }
    setTips(t.slice(0, 4));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" />
      </div>
    );
  }

  const ctr = traffic.views ? ((traffic.clicks / traffic.views) * 100).toFixed(1) : "0.0";
  const growth = traffic.prevViews
    ? Math.round(((traffic.views - traffic.prevViews) / traffic.prevViews) * 100)
    : traffic.views ? 100 : 0;

  return (
    <div className="space-y-4 pb-6">
      {/* Hero Control Center Header */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white shadow-xl shadow-orange-500/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
                <Rocket className="h-7 w-7 text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-85">
                  Business Management Control Center
                </p>
                <h2 className="text-2xl font-black leading-tight truncate">
                  {profileData.businessName || "My Business"}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold opacity-80 uppercase">Growth Score</span>
              <p className="text-3xl font-black leading-none">{score}<span className="text-lg opacity-80">/100</span></p>
            </div>
          </div>

          <Progress value={score} className="mt-4 h-2.5 bg-white/25" />

          {/* Profile completeness checklist chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
            <span className="opacity-80 font-medium">Readiness:</span>
            <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${profileData.hasLogo ? "bg-white/20 text-white" : "bg-black/20 text-white/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> Logo
            </span>
            <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${profileData.hasDesc ? "bg-white/20 text-white" : "bg-black/20 text-white/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> Description
            </span>
            <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${profileData.hasContact ? "bg-white/20 text-white" : "bg-black/20 text-white/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> WhatsApp Contact
            </span>
            <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${counts.activeListings > 0 ? "bg-white/20 text-white" : "bg-black/20 text-white/70"}`}>
              <CheckCircle2 className="h-3 w-3" /> {counts.activeListings} Listings
            </span>
          </div>
        </CardContent>
      </Card>

      {/* QUICK LAUNCH GRID (4 PRIMARY PILLARS) */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-500" /> Commercial Launch & Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Button 1: Create Banner Ad */}
            <button
              onClick={() => onNavigate?.("ads-create")}
              className="p-3 rounded-2xl border border-border/70 bg-card hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Create Banner Ad</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{counts.activeAds} live ads</p>
              </div>
            </button>

            {/* Button 2: Create Credit Task */}
            <button
              onClick={() => onNavigate?.("tasks-create")}
              className="p-3 rounded-2xl border border-border/70 bg-card hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Create Credit Task</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{counts.activeTasks} live tasks</p>
              </div>
            </button>

            {/* Button 3: Launch Syndicate Campaign */}
            <button
              onClick={() => onNavigate?.("business-tasks")}
              className="p-3 rounded-2xl border border-border/70 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Syndicate Campaign</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{counts.syndicateCampaigns} active</p>
              </div>
            </button>

            {/* Button 4: Manage Storefront & Listings */}
            <button
              onClick={() => onNavigate?.("business")}
              className="p-3 rounded-2xl border border-border/70 bg-card hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left flex flex-col justify-between h-28 group"
            >
              <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Store & Directory</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{counts.activeListings} products</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Live Traffic & Performance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat icon={Activity} label="Campaign Health" value={`${health}%`} tone="from-blue-500 to-indigo-600" />
        <Stat
          icon={TrendingUp}
          label="Traffic Growth (7d)"
          value={`${growth > 0 ? "+" : ""}${growth}%`}
          tone="from-emerald-500 to-teal-600"
        />
        <Stat icon={Users} label="New Inquiries (7d)" value={String(leads)} tone="from-fuchsia-500 to-pink-600" />
        <Stat icon={Trophy} label="Click Rate (7d)" value={`${ctr}%`} tone="from-amber-500 to-orange-600" />
      </div>

      {/* Best Campaign Spotlight */}
      {best && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Performing Promotion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground truncate">{best.title}</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {best.impressions.toLocaleString()} views
                  </Badge>
                  <Badge variant="secondary" className="text-xs text-emerald-600 font-semibold">
                    {best.clicks.toLocaleString()} clicks
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigate?.("campaigns")}
                className="text-xs font-semibold"
              >
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actionable Growth Recommendations */}
      {tips.length > 0 && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Actionable Growth Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {tips.map((t, i) => (
              <div key={i} className="p-3 rounded-2xl border border-border/70 bg-muted/30 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-foreground leading-relaxed flex-1">{t.text}</p>
                {t.action && (
                  <Button
                    size="sm"
                    onClick={() => t.tab && onNavigate?.(t.tab)}
                    className="h-9 px-3 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white flex-shrink-0 shadow-sm"
                  >
                    {t.action} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: string;
}) => (
  <Card className="border-border/70 shadow-sm">
    <CardContent className="p-3.5">
      <span className={`h-8 w-8 rounded-xl grid place-items-center bg-gradient-to-br ${tone} text-white mb-2`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xl font-black leading-none text-foreground">{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground mt-1">{label}</p>
    </CardContent>
  </Card>
);

export default BusinessGrowthDashboard;
