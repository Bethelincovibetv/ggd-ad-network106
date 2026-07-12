import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MousePointer, Coins, Wallet, TrendingUp, Activity, ArrowRight, Plus, Megaphone, ListChecks, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [bannerCampaigns, setBannerCampaigns] = useState<any[]>([]);
  const [taskCampaigns, setTaskCampaigns] = useState<any[]>([]);
  const [syndicateCampaigns, setSyndicateCampaigns] = useState<any[]>([]);
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

    setBannerCampaigns(ads.map((a: any) => ({
      id: a.id, title: a.title,
      metric1: { label: 'Views', value: a.impressions || 0 },
      metric2: { label: 'Clicks', value: a.clicks || 0 },
      active: a.is_active,
    })));
    setTaskCampaigns(tasks.map((t: any) => ({
      id: t.id, title: t.title,
      metric1: { label: 'Done', value: `${t.completions_count || 0}/${t.max_completions || '∞'}` },
      metric2: { label: 'Reward', value: `${t.reward_credits} cr` },
      active: t.is_active,
    })));
    setSyndicateCampaigns(synd.map((s: any) => ({
      id: s.id, title: s.title,
      metric1: { label: 'Slots', value: s.max_syndicates || 0 },
      metric2: { label: 'Cost', value: `₦${Number(s.total_cost || 0).toLocaleString()}` },
      active: s.status === 'active',
    })));

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

  const renderList = (items: any[], emptyMsg: string, accentBg: string, accentText: string) => (
    loading ? (
      <p className="text-xs text-muted-foreground py-3 text-center">Loading…</p>
    ) : items.length === 0 ? (
      <p className="text-xs text-muted-foreground py-4 text-center">{emptyMsg}</p>
    ) : (
      <div className="space-y-2">
        {items.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-foreground truncate">{c.title}</p>
                {c.active ? <span className="text-[8px] font-bold text-green-600">●</span> : <span className="text-[8px] text-muted-foreground">○</span>}
              </div>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{c.metric1.label}: <b className={accentText}>{c.metric1.value}</b></span>
                <span className="text-[10px] text-muted-foreground">{c.metric2.label}: <b className={accentText}>{c.metric2.value}</b></span>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </div>
        ))}
      </div>
    )
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

      {/* Campaign performance */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <h2 className="text-sm font-black flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-orange-500" />Campaign Performance
          </h2>
          <Tabs defaultValue="banner">
            <TabsList className={`w-full grid ${isEnabled('tasks') ? 'grid-cols-3' : 'grid-cols-2'} h-9 mb-3`}>
              <TabsTrigger value="banner" className="text-[10px] gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                <Megaphone className="h-3 w-3" />Banner Ads
              </TabsTrigger>
              {isEnabled('tasks') && (
                <TabsTrigger value="task" className="text-[10px] gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white">
                  <ListChecks className="h-3 w-3" />Normal Tasks
                </TabsTrigger>
              )}
              <TabsTrigger value="syndicate" className="text-[10px] gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white">
                <Users className="h-3 w-3" />Syndicate
              </TabsTrigger>
            </TabsList>
            <TabsContent value="banner" className="mt-0">
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="ghost" className="text-xs h-7 text-blue-600" onClick={() => onNavigate('ads-create')}>
                  <Plus className="h-3 w-3 mr-1" />New Banner
                </Button>
              </div>
              {renderList(bannerCampaigns, 'No banner ad campaigns yet. Create your first banner!', 'bg-blue-500/20', 'text-blue-600')}
            </TabsContent>
            {isEnabled('tasks') && (
              <TabsContent value="task" className="mt-0">
                <div className="flex justify-end mb-2">
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-orange-600" onClick={() => onNavigate('tasks')}>
                    <Plus className="h-3 w-3 mr-1" />New Task
                  </Button>
                </div>
                {renderList(taskCampaigns, 'No normal task campaigns yet.', 'bg-orange-500/20', 'text-orange-600')}
              </TabsContent>
            )}
            <TabsContent value="syndicate" className="mt-0">
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="ghost" className="text-xs h-7 text-purple-600" onClick={() => onNavigate('business-tasks')}>
                  <Plus className="h-3 w-3 mr-1" />New Syndicate
                </Button>
              </div>
              {renderList(syndicateCampaigns, 'No syndicate campaigns yet.', 'bg-purple-500/20', 'text-purple-600')}
            </TabsContent>
          </Tabs>
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