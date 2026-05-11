import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MousePointer, Coins, Wallet, TrendingUp, Activity, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HomeDashboardProps {
  credits: number;
  isAdmin: boolean;
  onNavigate: (tab: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ credits, isAdmin, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ impressions: 0, clicks: 0, shareClicks: 0, spent: 0 });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [adsRes, tasksRes, sharesRes, walletRes] = await Promise.all([
        supabase.from('ads').select('id,title,impressions,clicks,is_active,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('id,title,completions_count,max_completions,is_active,created_at,reward_credits').eq('creator_id', user.id).order('created_at', { ascending: false }),
        supabase.from('task_share_links').select('id,clicks,task_id,created_at').eq('sharer_user_id', user.id),
        supabase.from('task_wallets').select('total_spent,balance').eq('user_id', user.id).maybeSingle(),
      ]);

      const ads = adsRes.data || [];
      const tasks = tasksRes.data || [];
      const shares = sharesRes.data || [];

      const impressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
      const clicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
      const shareClicks = shares.reduce((s, sh) => s + (sh.clicks || 0), 0);
      const spent = Number(walletRes.data?.total_spent || 0);

      setStats({ impressions, clicks, shareClicks, spent });

      const camp = [
        ...ads.map((a: any) => ({
          kind: 'Ad', id: a.id, title: a.title,
          metric1: { label: 'Views', value: a.impressions || 0 },
          metric2: { label: 'Clicks', value: a.clicks || 0 },
          active: a.is_active,
        })),
        ...tasks.map((t: any) => ({
          kind: 'Task', id: t.id, title: t.title,
          metric1: { label: 'Done', value: `${t.completions_count || 0}/${t.max_completions || '∞'}` },
          metric2: { label: 'Reward', value: t.reward_credits },
          active: t.is_active,
        })),
      ].slice(0, 8);
      setCampaigns(camp);

      const act = [
        ...shares.slice(0, 5).map((s: any) => ({ ts: s.created_at, text: `🔗 Generated share link · ${s.clicks || 0} clicks` })),
        ...tasks.slice(0, 5).map((t: any) => ({ ts: t.created_at, text: `📢 Created task: ${t.title}` })),
        ...ads.slice(0, 5).map((a: any) => ({ ts: a.created_at, text: `🖼️ Created ad: ${a.title}` })),
      ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 8);
      setActivity(act);

      setLoading(false);
    };
    load();
  }, []);

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

      {/* Campaign performance */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />Campaign Performance
            </h2>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-orange-600" onClick={() => onNavigate('ads-create')}>
              <Plus className="h-3 w-3 mr-1" />New
            </Button>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground py-3 text-center">Loading…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No campaigns yet. Create your first one!</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={`${c.kind}-${c.id}`} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.kind === 'Ad' ? 'bg-blue-500/20 text-blue-600' : 'bg-orange-500/20 text-orange-600'}`}>{c.kind}</span>
                      <p className="text-xs font-semibold text-foreground truncate">{c.title}</p>
                      {c.active ? <span className="text-[8px] font-bold text-green-600">●</span> : <span className="text-[8px] text-muted-foreground">○</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{c.metric1.label}: <b className="text-foreground">{c.metric1.value}</b></span>
                      <span className="text-[10px] text-muted-foreground">{c.metric2.label}: <b className="text-foreground">{c.metric2.value}</b></span>
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <h2 className="text-sm font-black flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-purple-500" />Recent Activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No activity yet</p>
          ) : (
            <ul className="space-y-1.5">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-foreground">{a.text}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{new Date(a.ts).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeDashboard;