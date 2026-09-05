import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Eye,
  MousePointerClick,
  TrendingUp,
  Coins,
  Calendar,
  MapPin,
  ExternalLink,
  Copy,
  Pause,
  Play,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  adId: string;
  onBack: () => void;
}

const CampaignAnalytics: React.FC<Props> = ({ adId, onBack }) => {
  const [ad, setAd] = useState<any>(null);
  const [daily, setDaily] = useState<{ date: string; imp: number; clk: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const channelRef = useRef<any>(null);

  const fetchAdAndEvents = async () => {
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

    (events || []).forEach((e) => {
      const d = new Date(e.created_at).toISOString().slice(0, 10);
      if (!map[d]) return;
      if (e.event_type === 'click') map[d].clk += 1;
      else map[d].imp += 1;
    });

    setDaily(Object.entries(map).map(([date, v]) => ({ date, ...v })));
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    fetchAdAndEvents();

    // Setup Realtime subscription on this ad and its events
    const channel = supabase
      .channel(`ad-analytics-${adId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ads',
          filter: `id=eq.${adId}`,
        },
        (payload) => {
          if (!isMounted) return;
          setAd((prev: any) => ({ ...prev, ...(payload.new as any) }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ad_events',
          filter: `ad_id=eq.${adId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const ev = payload.new as any;
          const today = new Date().toISOString().slice(0, 10);

          setDaily((prev) =>
            prev.map((d) => {
              if (d.date === today) {
                return {
                  ...d,
                  imp: ev.event_type === 'click' ? d.imp : d.imp + 1,
                  clk: ev.event_type === 'click' ? d.clk + 1 : d.clk,
                };
              }
              return d;
            })
          );

          setAd((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              impressions: ev.event_type === 'click' ? prev.impressions : (prev.impressions || 0) + 1,
              clicks: ev.event_type === 'click' ? (prev.clicks || 0) + 1 : prev.clicks,
            };
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [adId]);

  const handleToggleActive = async () => {
    if (!ad || toggling) return;
    setToggling(true);
    const nextStatus = !ad.is_active;

    const { error } = await supabase
      .from('ads')
      .update({ is_active: nextStatus })
      .eq('id', ad.id);

    setToggling(false);
    if (error) {
      toast.error('Failed to update campaign status');
      return;
    }

    setAd((prev: any) => ({ ...prev, is_active: nextStatus }));
    toast.success(nextStatus ? 'Campaign resumed and live!' : 'Campaign paused.');
  };

  const copyAdUrl = () => {
    if (!ad?.target_url) return;
    navigator.clipboard.writeText(ad.target_url);
    toast.success('Campaign destination URL copied!');
  };

  if (loading || !ad) {
    return <div className="p-6 text-sm text-muted-foreground">Loading campaign analytics…</div>;
  }

  const impressions = ad.impressions || 0;
  const clicks = ad.clicks || 0;
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
  const spend = ad.budget_credits ?? ad.reward_credits ?? 0;
  const expired = ad.expires_at && new Date(ad.expires_at) < new Date();
  const status = expired ? 'Expired' : ad.is_active ? 'Live' : 'Paused';
  const maxDaily = Math.max(1, ...daily.map((d) => d.imp));

  return (
    <div className="space-y-4">
      {/* Back and Live Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </Button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Realtime Ad Stream
        </div>
      </div>

      {/* Campaign Info Card */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10">
          {ad.image_url ? (
            <img
              loading="lazy"
              src={ad.image_url}
              alt={ad.title}
              className="h-24 w-full sm:w-28 rounded-xl object-cover border border-border/50"
            />
          ) : (
            <div className="h-24 w-full sm:w-28 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 font-black text-xl">
              AD
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black truncate text-foreground">{ad.title}</h2>
                <Badge
                  variant={expired ? 'destructive' : ad.is_active ? 'default' : 'secondary'}
                  className={`text-[10px] font-bold ${
                    ad.is_active && !expired ? 'bg-emerald-600 text-white' : ''
                  }`}
                >
                  {status}
                </Badge>
              </div>

              {ad.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ad.description}</p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <a
                  href={ad.target_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline truncate flex items-center gap-1 font-medium hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  {ad.target_url}
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyAdUrl}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="Copy destination link"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 flex-wrap gap-2">
              <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap">
                {ad.target_state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-orange-500" />
                    {ad.target_state}
                  </span>
                )}
                {ad.expires_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-blue-500" />
                    Ends {new Date(ad.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {!expired && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleActive}
                  disabled={toggling}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  {ad.is_active ? (
                    <>
                      <Pause className="h-3.5 w-3.5 text-amber-600" /> Pause Campaign
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 text-emerald-600" /> Resume Campaign
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Impressions', value: impressions.toLocaleString(), icon: Eye, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Total Clicks', value: clicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-500 bg-purple-500/10' },
          { label: 'CTR', value: `${ctr}%`, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Budget (credits)', value: spend.toLocaleString(), icon: Coins, color: 'text-orange-500 bg-orange-500/10' },
        ].map((s) => (
          <Card key={s.label} className="border-border/70 shadow-sm">
            <CardContent className="p-3.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-foreground mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 14 Days Visual Impression Chart */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-orange-500" /> 14-Day Traffic & Engagement Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-36 pt-4">
            {daily.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-gradient-to-t from-orange-500 to-red-400 rounded-t transition-all hover:brightness-110"
                  style={{ height: `${(d.imp / maxDaily) * 100}%`, minHeight: d.imp ? 6 : 2 }}
                />
                <span className="text-[8px] text-muted-foreground truncate w-full text-center hidden sm:block">
                  {d.date.slice(8)}
                </span>

                {/* Tooltip on hover */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border text-[10px] p-1 rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                  {d.imp} views · {d.clk} clicks
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2 border-t border-border/40 pt-2">
            <span>{daily[0]?.date}</span>
            <span>{daily[daily.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 sticky top-0 border-b border-border/60">
                <tr>
                  <th className="text-left p-2.5 font-bold text-muted-foreground">Date</th>
                  <th className="text-right p-2.5 font-bold text-muted-foreground">Impressions</th>
                  <th className="text-right p-2.5 font-bold text-muted-foreground">Clicks</th>
                  <th className="text-right p-2.5 font-bold text-muted-foreground">CTR</th>
                </tr>
              </thead>
              <tbody>
                {[...daily].reverse().map((d) => (
                  <tr key={d.date} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2.5 font-medium text-foreground">{d.date}</td>
                    <td className="text-right p-2.5">{d.imp.toLocaleString()}</td>
                    <td className="text-right p-2.5 font-semibold text-emerald-600">{d.clk.toLocaleString()}</td>
                    <td className="text-right p-2.5 text-muted-foreground">
                      {d.imp ? ((d.clk / d.imp) * 100).toFixed(1) : '0.0'}%
                    </td>
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
