import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Eye, MousePointer, Coins, Wallet, TrendingUp, Activity, Zap, Radio, CheckCircle2, Percent, Trophy, Signal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WatchVideoAds from "@/components/WatchVideoAd";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface HomeDashboardProps {
  credits: number;
  isAdmin: boolean;
  onNavigate: (tab: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ credits, isAdmin, onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ impressions: 0, clicks: 0, shareClicks: 0, spent: 0 });
  const [insights, setInsights] = useState({
    todayViews: 0, todayClicks: 0, running: 0, completed: 0,
    reach: 0, traffic: 0, top: null as null | { title: string; impressions: number; clicks: number },
  });
  const [activity, setActivity] = useState<any[]>([]);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [adsRes, tasksRes, syndRes, sharesRes, walletRes] = await Promise.all([
      supabase.from('ads').select('id,title,impressions,clicks,is_active,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('id,title,completions_count,max_completions,is_active,created_at,reward_credits').eq('creator_id', user.id).order('created_at', { ascending: false }),
      supabase.from('syndicate_tasks').select('id,title,status,max_syndicates,cost_per_syndicate,total_cost,created_at').eq('business_user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('task_share_links').select('id,clicks,task_id,created_at').eq('sharer_user_id', user.id),
      supabase.from('task_wallets').select('total_spent,balance').eq('user_id', user.id).maybeSingle(),
    ]);

    const ads = adsRes.data || [];
    const tasks = tasksRes.data || [];
    const synd = syndRes.data || [];
    const shares = sharesRes.data || [];

    const impressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
    const clicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
    const shareClicks = shares.reduce((s, sh) => s + (sh.clicks || 0), 0);
    const spent = Number(walletRes.data?.total_spent || 0);

    setStats({ impressions, clicks, shareClicks, spent });

    // ---- Today's performance (from ad_events) ----
    const since = new Date(); since.setHours(0, 0, 0, 0);
    let todayViews = 0, todayClicks = 0;
    const adIds = ads.map((a: any) => a.id);
    if (adIds.length) {
      const { data: ev } = await supabase
        .from('ad_events')
        .select('event_type')
        .in('ad_id', adIds)
        .gte('created_at', since.toISOString());
      (ev || []).forEach((e: any) => {
        if (e.event_type === 'click') todayClicks++; else todayViews++;
      });
    }

    const running =
      ads.filter((a: any) => a.is_active).length +
      (isEnabled('tasks') ? tasks.filter((t: any) => t.is_active).length : 0) +
      (isEnabled('syndicate') ? synd.filter((s: any) => s.status === 'active').length : 0);
    const completed =
      ads.filter((a: any) => !a.is_active).length +
      (isEnabled('tasks') ? tasks.filter((t: any) => !t.is_active || (t.max_completions && (t.completions_count || 0) >= t.max_completions)).length : 0) +
      (isEnabled('syndicate') ? synd.filter((s: any) => s.status === 'completed').length : 0);

    const top = [...ads].sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0))[0];

    setInsights({
      todayViews, todayClicks, running, completed,
      reach: impressions,
      traffic: clicks + shareClicks,
      top: top ? { title: top.title, impressions: top.impressions || 0, clicks: top.clicks || 0 } : null,
    });

    const act = [
      ...shares.slice(0, 5).map((s: any) => ({ ts: s.created_at, text: `🔗 Generated share link · ${s.clicks || 0} clicks` })),
      ...tasks.slice(0, 5).map((t: any) => ({ ts: t.created_at, text: `📢 Created task: ${t.title}` })),
      ...ads.slice(0, 5).map((a: any) => ({ ts: a.created_at, text: `🖼️ Created ad: ${a.title}` })),
      ...synd.slice(0, 5).map((s: any) => ({ ts: s.created_at, text: `👥 Syndicate campaign: ${s.title}` })),
    ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 8);
    setActivity(act);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // Live activity updates via realtime channels
    const channel = supabase
      .channel('home-live-activity')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'syndicate_tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_share_links' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const ctr = insights.reach > 0 ? ((stats.clicks / insights.reach) * 100).toFixed(1) : '0.0';

  const Metric = ({ icon: Icon, label, value, tint }: any) => (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5">
      <div className="flex items-center gap-2">
        <span className={`h-9 w-9 rounded-xl grid place-items-center ${tint}`}><Icon className="h-[18px] w-[18px]" /></span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-black mt-2 text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Eye className="h-5 w-5 opacity-80" />
              <span className="text-[10px] opacity-80 font-bold uppercase">Views</span>
            </div>
            <p className="text-2xl font-black mt-2">{stats.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <MousePointer className="h-5 w-5 opacity-80" />
              <span className="text-[10px] opacity-80 font-bold uppercase">Clicks</span>
            </div>
            <p className="text-2xl font-black mt-2">{(stats.clicks + stats.shareClicks).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Coins className="h-5 w-5 opacity-80" />
              <span className="text-[10px] opacity-80 font-bold uppercase">Spent</span>
            </div>
            <p className="text-2xl font-black mt-2">{stats.spent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg cursor-pointer" onClick={() => onNavigate('wallet')}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 opacity-80" />
              <span className="text-[10px] opacity-80 font-bold uppercase">Credits</span>
            </div>
            <p className="text-2xl font-black mt-2">{isAdmin ? '∞' : credits.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Watch & Earn (YouTube ads) */}
      <WatchVideoAds />

      {/* Professional analytics dashboard */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />Performance Analytics
            </h2>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{loading ? 'Loading…' : 'Live'}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric icon={Zap} label="Views Today" value={insights.todayViews.toLocaleString()} tint="bg-blue-500/15 text-blue-600" />
            <Metric icon={MousePointer} label="Clicks Today" value={insights.todayClicks.toLocaleString()} tint="bg-emerald-500/15 text-emerald-600" />
            <Metric icon={Percent} label="CTR" value={`${ctr}%`} tint="bg-purple-500/15 text-purple-600" />
            <Metric icon={Radio} label="Running" value={insights.running.toLocaleString()} tint="bg-orange-500/15 text-orange-600" />
            <Metric icon={CheckCircle2} label="Completed" value={insights.completed.toLocaleString()} tint="bg-teal-500/15 text-teal-600" />
            <Metric icon={Eye} label="Total Reach" value={insights.reach.toLocaleString()} tint="bg-indigo-500/15 text-indigo-600" />
            <Metric icon={Signal} label="Traffic Delivered" value={insights.traffic.toLocaleString()} tint="bg-pink-500/15 text-pink-600" />
            <Metric icon={Coins} label="Credits Spent" value={stats.spent.toLocaleString()} tint="bg-amber-500/15 text-amber-600" />
          </div>

          <div className="mt-3 rounded-2xl border border-border/60 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-orange-500" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Top Performing Campaign</span>
            </div>
            {insights.top ? (
              <>
                <p className="text-base font-black text-foreground truncate">{insights.top.title}</p>
                <p className="text-xs text-muted-foreground font-semibold">
                  {insights.top.impressions.toLocaleString()} views · {insights.top.clicks.toLocaleString()} clicks
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No campaign data yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live activity feed — collapsed, gated by toggle */}
      {isEnabled('live_activity') && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <details className="group">
              <summary className="cursor-pointer list-none p-4 flex items-center justify-between">
                <h2 className="text-sm font-black flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <Activity className="h-4 w-4 text-purple-500" />Live Activity
                  <span className="text-[10px] text-muted-foreground font-normal">({activity.length})</span>
                </h2>
                <span className="text-[10px] text-muted-foreground group-open:hidden">Tap to open ▾</span>
                <span className="text-[10px] text-muted-foreground hidden group-open:inline">Tap to close ▴</span>
              </summary>
              <div className="px-4 pb-4">
                {activity.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Waiting for live events…</p>
                ) : (
                  <ul className="space-y-1.5">
                    {activity.map((a, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 text-xs animate-fade-in">
                        <span className="text-foreground">{a.text}</span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(a.ts).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomeDashboard;