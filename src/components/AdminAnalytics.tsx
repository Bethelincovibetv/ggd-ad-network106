import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Eye, MousePointerClick, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalImpressions: 0, totalClicks: 0, totalAds: 0, activeAds: 0 });
  const [topAds, setTopAds] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    const { data: allAds } = await supabase.from('ads').select('*');
    const ads = allAds || [];

    const totalImpressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
    const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);
    const activeAds = ads.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date())).length;

    setStats({ totalImpressions, totalClicks, totalAds: ads.length, activeAds });

    const sorted = [...ads].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 6);
    setTopAds(sorted.map(a => ({
      name: a.title.length > 15 ? a.title.slice(0, 15) + '…' : a.title,
      impressions: a.impressions || 0,
      clicks: a.clicks || 0,
    })));

    // Generate daily data from events
    const { data: events } = await supabase.from('ad_events').select('event_type, created_at').order('created_at', { ascending: true }).limit(1000);
    const dayMap: Record<string, { impressions: number; clicks: number }> = {};
    (events || []).forEach(e => {
      const day = e.created_at.split('T')[0];
      if (!dayMap[day]) dayMap[day] = { impressions: 0, clicks: 0 };
      if (e.event_type === 'impression') dayMap[day].impressions++;
      if (e.event_type === 'click') dayMap[day].clicks++;
    });
    const daily = Object.entries(dayMap).sort().slice(-14).map(([date, d]) => ({ date: date.slice(5), ...d }));
    setDailyData(daily);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const ctr = stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" />Network Analytics</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Eye, label: 'Impressions', value: stats.totalImpressions.toLocaleString(), color: 'text-blue-600' },
          { icon: MousePointerClick, label: 'Clicks', value: stats.totalClicks.toLocaleString(), color: 'text-green-600' },
          { icon: BarChart3, label: 'CTR', value: `${ctr}%`, color: 'text-orange-600' },
          { icon: TrendingUp, label: 'Active Ads', value: `${stats.activeAds}/${stats.totalAds}`, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <div className="text-lg font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dailyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Daily Performance (14 days)</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: 'hsl(var(--card))' }} />
                <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {topAds.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Top Performing Ads</CardTitle></CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAds} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="impressions" fill="#f97316" radius={[0, 4, 4, 0]} />
                <Bar dataKey="clicks" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalytics;
