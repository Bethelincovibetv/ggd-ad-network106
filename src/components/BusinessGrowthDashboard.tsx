import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Rocket, TrendingUp, Users, Trophy, Loader2, ArrowRight, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface Props { onNavigate?: (tab: string) => void }

interface Tip { text: string; action?: string; tab?: string }

/** Intelligent Business Growth dashboard: score, health, growth + contextual advice. */
const BusinessGrowthDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(0);
  const [traffic, setTraffic] = useState({ views: 0, clicks: 0, prevViews: 0 });
  const [leads, setLeads] = useState(0);
  const [best, setBest] = useState<{ title: string; clicks: number; impressions: number } | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }

    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const prevSince = new Date(Date.now() - 14 * 864e5).toISOString();

    const [{ data: ads }, { data: profile }, { data: listings }, { data: bp }] = await Promise.all([
      supabase.from("ads").select("id,title,impressions,clicks,is_active,expires_at,created_at").eq("user_id", uid),
      supabase.from("profiles").select("business_name,business_description,business_logo_url,industry,state,whatsapp_number").eq("user_id", uid).maybeSingle(),
      supabase.from("business_listings").select("id,is_active").eq("user_id", uid),
      supabase.from("business_profiles").select("id,logo_url,hero_image_url,category_id").eq("user_id", uid).maybeSingle(),
    ]);

    const adIds = (ads || []).map(a => a.id);
    let views = 0, clicks = 0, prevViews = 0;
    if (adIds.length) {
      const { data: ev } = await supabase.from("ad_events").select("event_type,created_at").in("ad_id", adIds).gte("created_at", prevSince);
      (ev || []).forEach(e => {
        const recent = e.created_at >= since;
        if (e.event_type === "impression") recent ? views++ : prevViews++;
        else if (e.event_type === "click" && recent) clicks++;
      });
    }
    setTraffic({ views, clicks, prevViews });

    const { count: leadCount } = await supabase
      .from("p2p_messages").select("id", { count: "exact", head: true }).eq("receiver_id", uid).gte("created_at", since);
    setLeads(leadCount || 0);

    const now = Date.now();
    const live = (ads || []).filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at).getTime() > now));
    const top = [...(ads || [])].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
    setBest(top ? { title: top.title, clicks: top.clicks || 0, impressions: top.impressions || 0 } : null);

    // Campaign health: share of campaigns that are live and getting clicks
    const withClicks = (ads || []).filter(a => (a.clicks || 0) > 0).length;
    const h = ads?.length ? Math.round(((live.length * 0.5 + withClicks * 0.5) / ads.length) * 100) : 0;
    setHealth(Math.min(100, h));

    // Growth score
    let s = 0;
    if (profile?.business_name) s += 10;
    if (profile?.business_description) s += 10;
    if (profile?.business_logo_url || bp?.logo_url) s += 10;
    if (bp?.hero_image_url) s += 5;
    if (profile?.industry && profile?.state) s += 10;
    if (profile?.whatsapp_number) s += 5;
    if ((listings || []).length > 0) s += 15;
    if ((listings || []).length >= 3) s += 5;
    if ((ads || []).length > 0) s += 10;
    if (live.length > 0) s += 10;
    if (clicks > 0) s += 10;
    setScore(Math.min(100, s));

    const t: Tip[] = [];
    if (!profile?.business_name || !profile?.business_description) t.push({ text: "Complete your business profile so customers trust your page.", action: "Complete profile", tab: "business" });
    if (!(listings || []).length) t.push({ text: "Add your first product or service to your listing.", action: "Improve listing", tab: "business" });
    else if ((listings || []).length < 3) t.push({ text: "Add more products — businesses with 3+ listings get far more visits.", action: "Improve listing", tab: "business" });
    if (isEnabled("ads")) {
      if (!live.length) t.push({ text: "You have no live advert running. Create one to start getting traffic.", action: "Create advert", tab: "ads-create" });
      else if (views > 200 && clicks / Math.max(views, 1) < 0.02) t.push({ text: "Your advert gets views but few clicks — improve the headline with the AI assistant.", action: "Improve campaign", tab: "ads" });
      else if (views > prevViews && prevViews > 0) t.push({ text: "Traffic is trending up — add more budget to ride the momentum.", action: "Add budget", tab: "ads" });
    }
    if (isEnabled("syndicate") && isEnabled("business_tasks")) t.push({ text: "Promote your offer with verified Syndicate promoters.", action: "Launch Campaign", tab: "business-tasks" });
    setTips(t.slice(0, 4));
    setLoading(false);
  };

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" /></div>;

  const ctr = traffic.views ? ((traffic.clicks / traffic.views) * 100).toFixed(1) : "0.0";
  const growth = traffic.prevViews ? Math.round(((traffic.views - traffic.prevViews) / traffic.prevViews) * 100) : (traffic.views ? 100 : 0);

  return (
    <div className="space-y-4 pb-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-red-600 text-white">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <span className="h-14 w-14 rounded-2xl bg-white/20 grid place-items-center"><Rocket className="h-7 w-7" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold opacity-90">Business Growth Score</p>
              <p className="text-4xl font-black leading-none">{score}<span className="text-xl">/100</span></p>
            </div>
          </div>
          <Progress value={score} className="mt-4 h-3 bg-white/25" />
          <p className="mt-2 text-sm opacity-90">
            {score >= 80 ? "Excellent — keep your campaigns running." : score >= 50 ? "Good start. Finish the steps below to grow faster." : "Let's get your business set up for growth."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Activity} label="Campaign Health" value={`${health}%`} tone="from-blue-500 to-indigo-600" />
        <Stat icon={TrendingUp} label="Traffic Growth (7d)" value={`${growth > 0 ? "+" : ""}${growth}%`} tone="from-emerald-500 to-teal-600" />
        <Stat icon={Users} label="New Leads (7d)" value={String(leads)} tone="from-fuchsia-500 to-pink-600" />
        <Stat icon={Trophy} label="Click Rate (7d)" value={`${ctr}%`} tone="from-amber-500 to-orange-600" />
      </div>

      {best && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-black flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Best Performing Campaign</CardTitle></CardHeader>
          <CardContent>
            <p className="text-base font-bold truncate">{best.title}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-sm">{best.impressions} views</Badge>
              <Badge variant="secondary" className="text-sm">{best.clicks} clicks</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-black">Improvement Suggestions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tips.map((t, i) => (
              <div key={i} className="p-3 rounded-2xl border border-border bg-muted/30">
                <p className="text-sm font-medium">{t.text}</p>
                {t.action && (
                  <Button size="sm" onClick={() => t.tab && onNavigate?.(t.tab)}
                    className="mt-2 h-11 px-4 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    {t.action}<ArrowRight className="h-4 w-4 ml-1" />
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

const Stat = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4">
      <span className={`h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br ${tone} text-white mb-2`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-1">{label}</p>
    </CardContent>
  </Card>
);

export default BusinessGrowthDashboard;
