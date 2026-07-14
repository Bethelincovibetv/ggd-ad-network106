import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, Coins, Calendar, MapPin } from 'lucide-react';

interface Props {
  adId: string;
  onBack: () => void;
}

const CampaignAnalytics: React.FC<Props> = ({ adId, onBack }) => {
  const [ad, setAd] = useState<any>(null);
  const [daily, setDaily] = useState<{ date: string; imp: number; clk: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: adRow } = await supabase.from('ads').select('*').eq('id', adId).maybeSingle();
      setAd(adRow);
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data: events } = await supabase
        .from('ad_events')
        .select('event_type, created_at')
        .eq('ad_id', adId)
        .gte('created_at', since)
        .order('created_at');
      const map: Record<string, { imp: number; clk: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        map[d] = { imp: 0, clk: 0 };
      }
      (events || []).forEach(e => {
        const d = new Date(e.created_at).toISOString().slice(0, 10);
        if (!map[d]) return;
        if (e.event_type === 'click') map[d].clk += 1;
        else map[d].imp += 1;
      });
      setDaily(Object.entries(map).map(([date, v]) => ({ date, ...v })));
      setLoading(false);
    })();
  }, [adId]);

  if (loading || !ad) {
    return <div className="p-6 text-sm text-muted-foreground">Loading campaign analytics…</div>;
  }

  const impressions = ad.impressions || 0;
  const clicks = ad.clicks || 0;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  const spend = ad.budget_credits ?? ad.reward_credits ?? 0;
  const expired = ad.expires_at && new Date(ad.expires_at) < new Date();
  const status = expired ? 'Expired' : ad.is_active ? 'Live' : 'Inactive';
  const maxDaily = Math.max(1, ...daily.map(d => d.imp));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to campaigns
      </Button>

      <Card className="overflow-hidden">
        <div className="flex gap-3 p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10">
          {ad.image_url && <img src={ad.image_url} alt={ad.title} className="h-20 w-20 rounded-xl object-cover" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black truncate">{ad.title}</h2>
              <Badge variant={expired ? 'destructive' : ad.is_active ? 'default' : 'secondary'} className="text-[10px]">
                {status}
              </Badge>
            </div>
            <a href={ad.target_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline break-all">
              {ad.target_url}
            </a>
            <div className="flex gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
              {ad.target_state && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.target_state}</span>}
              {ad.expires_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Ends {new Date(ad.expires_at).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Impressions', value: impressions.toLocaleString(), icon: Eye, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Clicks', value: clicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-500 bg-purple-500/10' },
          { label: 'CTR', value: `${ctr}%`, icon: TrendingUp, color: 'text-green-500 bg-green-500/10' },
          { label: 'Spend (cr)', value: spend, icon: Coins, color: 'text-orange-500 bg-orange-500/10' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">{s.label}</p>
              <p className="text-lg font-black">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Last 14 days · Impressions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {daily.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-gradient-to-t from-orange-500 to-orange-300 rounded-t transition-all"
                  style={{ height: `${(d.imp / maxDaily) * 100}%`, minHeight: d.imp ? 4 : 0 }}
                  title={`${d.date}: ${d.imp} views, ${d.clk} clicks`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
            <span>{daily[0]?.date.slice(5)}</span>
            <span>{daily[daily.length - 1]?.date.slice(5)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Daily breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Impressions</th>
                  <th className="text-right p-2">Clicks</th>
                  <th className="text-right p-2">CTR</th>
                </tr>
              </thead>
              <tbody>
                {[...daily].reverse().map(d => (
                  <tr key={d.date} className="border-t border-border/40">
                    <td className="p-2">{d.date}</td>
                    <td className="text-right p-2">{d.imp}</td>
                    <td className="text-right p-2">{d.clk}</td>
                    <td className="text-right p-2">{d.imp ? ((d.clk / d.imp) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignAnalytics;