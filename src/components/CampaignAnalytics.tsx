import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Sparkles,
  Users,
  MessageCircle,
  Share2,
  BarChart3,
  Flame,
  Check,
  Globe,
  Store,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  Zap,
  Plus,
  Pencil,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  adId: string;
  onBack: () => void;
}

export const CampaignAnalytics: React.FC<Props> = ({ adId, onBack }) => {
  const [ad, setAd] = useState<any>(null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [daily, setDaily] = useState<{ date: string; imp: number; clk: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [activeChartMetric, setActiveChartMetric] = useState<'both' | 'imp' | 'clk'>('both');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedGroupLink, setCopiedGroupLink] = useState(false);
  const [isEditingWaGroup, setIsEditingWaGroup] = useState(false);
  const [waGroupInput, setWaGroupInput] = useState('');
  const [savingWaGroup, setSavingWaGroup] = useState(false);
  const channelRef = useRef<any>(null);

  const fetchAdAndEvents = async () => {
    try {
      const { data: adRow } = await supabase.from('ads').select('*').eq('id', adId).maybeSingle();
      setAd(adRow);

      if (adRow?.user_id) {
        const { data: bProfile } = await supabase
          .from('business_profiles')
          .select('business_name, whatsapp_group_link, whatsapp_link, phone_number, business_slug, logo_url')
          .eq('user_id', adRow.user_id)
          .maybeSingle();
        setBusinessProfile(bProfile);
      }

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
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchAdAndEvents();

    const channelName = `ad-analytics-${adId}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
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

    const { error } = await supabase.from('ads').update({ is_active: nextStatus }).eq('id', ad.id);

    setToggling(false);
    if (error) {
      toast.error('Failed to update campaign status');
      return;
    }

    setAd((prev: any) => ({ ...prev, is_active: nextStatus }));
    toast.success(nextStatus ? '🎉 Campaign resumed and live on network!' : '⏸️ Campaign paused.');
  };

  const copyAdUrl = () => {
    if (!ad?.target_url) return;
    navigator.clipboard.writeText(ad.target_url);
    setCopiedLink(true);
    toast.success('Campaign destination URL copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyWhatsAppGroup = () => {
    if (!businessProfile?.whatsapp_group_link) return;
    navigator.clipboard.writeText(businessProfile.whatsapp_group_link);
    setCopiedGroupLink(true);
    toast.success('WhatsApp Community link copied!');
    setTimeout(() => setCopiedGroupLink(false), 2000);
  };

  const handleSaveWaGroup = async () => {
    if (!ad?.user_id) return;
    setSavingWaGroup(true);
    try {
      const cleanUrl = waGroupInput.trim();
      const { error } = await supabase
        .from('business_profiles')
        .update({ whatsapp_group_link: cleanUrl || null })
        .eq('user_id', ad.user_id);

      if (error) throw error;
      setBusinessProfile((prev: any) => ({ ...prev, whatsapp_group_link: cleanUrl || null }));
      setIsEditingWaGroup(false);
      toast.success(cleanUrl ? '🎉 WhatsApp Group Link saved! Customers can now join your community.' : 'WhatsApp Group link removed.');
    } catch (err: any) {
      toast.error('Failed to save WhatsApp group: ' + err.message);
    } finally {
      setSavingWaGroup(false);
    }
  };

  const exportReport = () => {
    if (!ad || daily.length === 0) return;
    const header = 'Date,Impressions,Clicks,CTR(%)\n';
    const rows = daily
      .map((d) => `${d.date},${d.imp},${d.clk},${d.imp ? ((d.clk / d.imp) * 100).toFixed(2) : '0.00'}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-analytics-${ad.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics CSV report downloaded!');
  };

  if (loading || !ad) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading campaign intelligence…</p>
      </div>
    );
  }

  const impressions = ad.impressions || 0;
  const clicks = ad.clicks || 0;
  const ctrNumber = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const ctr = ctrNumber.toFixed(2);
  const budget = ad.budget_credits ?? ad.reward_credits ?? 0;
  const expired = ad.expires_at && new Date(ad.expires_at) < new Date();
  const status = expired ? 'Expired' : ad.is_active ? 'Active & Live' : 'Paused';
  const maxDailyImp = Math.max(1, ...daily.map((d) => d.imp));
  const maxDailyClk = Math.max(1, ...daily.map((d) => d.clk));
  const totalDailyImp = daily.reduce((acc, curr) => acc + curr.imp, 0);
  const totalDailyClk = daily.reduce((acc, curr) => acc + curr.clk, 0);
  const avgDailyImp = Math.round(totalDailyImp / 14);

  // Performance Rating calculation
  const getPerformanceBadge = () => {
    if (ctrNumber >= 4.0) return { label: '🔥 High Performance (Top 5%)', color: 'bg-emerald-500 text-white' };
    if (ctrNumber >= 2.0) return { label: '⚡ Strong CTR (Above Average)', color: 'bg-blue-600 text-white' };
    if (ctrNumber >= 0.8) return { label: '📈 Optimal Traffic Stream', color: 'bg-amber-600 text-white' };
    return { label: '🚀 Active Broad Distribution', color: 'bg-muted text-foreground' };
  };

  const perfBadge = getPerformanceBadge();

  // WhatsApp group link for direct customer acquisition
  const waGroupLink = businessProfile?.whatsapp_group_link || (ad.target_url?.includes('chat.whatsapp.com') ? ad.target_url : null);
  const waPhone = (businessProfile?.phone_number || '').replace(/[^\d]/g, '');
  const directWaChat = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(
        `Hello ${businessProfile?.business_name || ''}! I saw your Banner Ad '${ad.title}' on GGD Ad Network and would like to learn more.`
      )}`
    : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Header & Telemetry Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/80 backdrop-blur border border-border/80 p-3.5 sm:p-4 rounded-3xl shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-xs font-bold rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Campaigns</span>
          </Button>
          <span className="text-muted-foreground text-xs hidden sm:inline">•</span>
          <span className="text-xs font-black text-foreground hidden sm:inline truncate max-w-[200px]">
            {ad.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Live Stream Synced</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportReport}
            className="h-8 text-xs font-bold rounded-xl gap-1.5 border-border/80 hover:bg-muted"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Main Campaign Hero Intelligence Card */}
      <Card className="overflow-hidden border-border/80 shadow-md rounded-3xl bg-card">
        <div className="relative bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-purple-500/10 p-4 sm:p-6 border-b border-border/60">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* Banner Creative Display */}
            <div className="relative shrink-0 w-full md:w-56 aspect-[16/9] md:aspect-[4/3] rounded-2xl overflow-hidden border-2 border-border/80 bg-muted shadow-sm group">
              {ad.image_url ? (
                <img
                  loading="lazy"
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 flex flex-col items-center justify-center text-white p-3 text-center">
                  <Flame className="h-8 w-8 mb-1 opacity-90 animate-bounce" />
                  <span className="font-black text-sm uppercase tracking-wider">Banner Advert</span>
                </div>
              )}
              <div className="absolute top-2 left-2 z-10">
                <Badge
                  className={`text-[9px] font-black uppercase tracking-wider border-0 shadow-md ${
                    expired
                      ? 'bg-rose-600 text-white'
                      : ad.is_active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {status}
                </Badge>
              </div>
            </div>

            {/* Campaign Metadata & Controls */}
            <div className="min-w-0 flex-1 space-y-3 w-full">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-snug">
                      {ad.title}
                    </h1>
                    <Badge variant="outline" className={`text-[10px] font-extrabold border-0 ${perfBadge.color}`}>
                      {perfBadge.label}
                    </Badge>
                  </div>
                  {ad.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {ad.description}
                    </p>
                  )}
                </div>

                {!expired && (
                  <Button
                    size="sm"
                    variant={ad.is_active ? 'outline' : 'default'}
                    onClick={handleToggleActive}
                    disabled={toggling}
                    className={`h-9 px-4 text-xs font-bold rounded-xl gap-2 shadow-xs shrink-0 ${
                      ad.is_active
                        ? 'border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {ad.is_active ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> Pause Campaign
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Resume Campaign
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Destination URL & Copy Bar */}
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-background/80 border border-border/80 flex-wrap sm:flex-nowrap">
                <Globe className="h-4 w-4 text-blue-500 shrink-0 ml-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Destination URL
                  </p>
                  <a
                    href={ad.target_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                  >
                    {ad.target_url}
                  </a>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyAdUrl}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1 hover:bg-muted"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(ad.target_url, '_blank')}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground"
                    title="Visit Destination"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Geo & Schedule Badges */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                {ad.target_state ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    Target: {ad.target_state}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                    Target: Nationwide (All States)
                  </span>
                )}

                {ad.expires_at && (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                    Expires: {new Date(ad.expires_at).toLocaleDateString()}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 font-medium">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  Budget: {budget.toLocaleString()} Credits
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER CONVERSION & WHATSAPP COMMUNITY CHANNELS SECTION */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-t border-border/60">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-green-600 text-white grid place-items-center shrink-0 shadow-md">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-foreground">
                      Customer WhatsApp Community & Direct Connect
                    </h3>
                    <Badge className="bg-green-600 text-white border-0 text-[9px] font-bold px-2 py-0.2">
                      High Conversion Channel
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect ad viewers directly into your WhatsApp group for rapid customer conversion and recurring sales.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {waGroupLink ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => window.open(waGroupLink, '_blank')}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm flex-1 sm:flex-none cursor-pointer"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Join WhatsApp Group</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyWhatsAppGroup}
                      className="border-green-600/30 text-green-700 dark:text-green-400 hover:bg-green-500/10 font-bold text-xs h-9 px-3 rounded-xl gap-1.5 cursor-pointer"
                      title="Copy Group Link"
                    >
                      {copiedGroupLink ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedGroupLink ? 'Copied' : 'Copy'}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setWaGroupInput(businessProfile?.whatsapp_group_link || '');
                        setIsEditingWaGroup(!isEditingWaGroup);
                      }}
                      className="text-xs font-bold h-9 px-2.5 rounded-xl gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit WhatsApp Group Link"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit Link</span>
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {directWaChat && (
                      <Button
                        size="sm"
                        onClick={() => window.open(directWaChat, '_blank')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5 shadow-sm cursor-pointer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>Direct Chat</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setWaGroupInput(businessProfile?.whatsapp_group_link || '');
                        setIsEditingWaGroup(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3.5 rounded-xl gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add WhatsApp Group</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Inline WhatsApp Group Link Editor */}
            {isEditingWaGroup && (
              <div className="p-3.5 rounded-2xl bg-background/95 border border-green-500/30 shadow-md space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-green-600" />
                    Enter Business WhatsApp Group Invite Link
                  </span>
                  <button
                    onClick={() => setIsEditingWaGroup(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://chat.whatsapp.com/..."
                    value={waGroupInput}
                    onChange={(e) => setWaGroupInput(e.target.value)}
                    className="h-10 rounded-xl text-xs font-medium bg-muted/30 border-border/80"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveWaGroup}
                    disabled={savingWaGroup}
                    className="h-10 px-4 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white shrink-0"
                  >
                    {savingWaGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Save Group
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Viewers of this advert across publisher networks and GGD can instantly tap to join your official customer group.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* METRIC STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Impressions */}
        <Card className="border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden relative group hover:border-blue-500/50 transition-colors">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                Total Impressions
              </span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 grid place-items-center">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight">{impressions.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span className="text-blue-600 font-bold">~{avgDailyImp}/day</span> velocity
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Total Clicks */}
        <Card className="border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden relative group hover:border-purple-500/50 transition-colors">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                Engaged Clicks
              </span>
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 grid place-items-center">
                <MousePointerClick className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight">{clicks.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span className="text-purple-600 font-bold">{totalDailyClk}</span> in past 14 days
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Click-Through Rate */}
        <Card className="border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden relative group hover:border-emerald-500/50 transition-colors">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                Click-Through Rate (CTR)
              </span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight">{ctr}%</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-bold">
              <Sparkles className="h-3 w-3" />
              {ctrNumber >= 2 ? 'Above platform average' : 'Normal benchmark'}
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Campaign Efficiency */}
        <Card className="border-border/80 shadow-xs rounded-2xl bg-card overflow-hidden relative group hover:border-orange-500/50 transition-colors">
          <div className="h-1 bg-gradient-to-r from-orange-500 to-red-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                Efficiency Index
              </span>
              <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-600 grid place-items-center">
                <Zap className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight">
              {clicks > 0 ? `${(budget / clicks).toFixed(1)} cr/clk` : 'Active'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Coins className="h-3 w-3 text-amber-500" />
              {budget.toLocaleString()} credits spent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* INTERACTIVE 14-DAY TRAFFIC & ENGAGEMENT TREND */}
      <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
        <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                14-Day Traffic & Engagement Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time daily impression delivery and click interaction analytics.
              </p>
            </div>

            {/* Metric Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveChartMetric('both')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeChartMetric === 'both' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Metrics
              </button>
              <button
                type="button"
                onClick={() => setActiveChartMetric('imp')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeChartMetric === 'imp' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Views ({totalDailyImp})
              </button>
              <button
                type="button"
                onClick={() => setActiveChartMetric('clk')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeChartMetric === 'clk' ? 'bg-purple-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Clicks ({totalDailyClk})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="flex items-end gap-1.5 sm:gap-2 h-48 pt-6 pb-2">
            {daily.map((d) => {
              const impHeight = (d.imp / maxDailyImp) * 100;
              const clkHeight = (d.clk / maxDailyClk) * 100;

              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  {/* Floating Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border/80 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-20">
                    <p className="font-bold text-foreground">{new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                    <p className="text-blue-500 font-bold">👁️ {d.imp} views</p>
                    <p className="text-purple-500 font-bold">🖱️ {d.clk} clicks</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-0.5 h-full">
                    {(activeChartMetric === 'both' || activeChartMetric === 'imp') && (
                      <div
                        className="w-full max-w-[18px] bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${Math.max(4, impHeight)}%` }}
                      />
                    )}
                    {(activeChartMetric === 'both' || activeChartMetric === 'clk') && (
                      <div
                        className="w-full max-w-[18px] bg-gradient-to-t from-purple-600 to-pink-500 rounded-t-md transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${Math.max(4, clkHeight)}%` }}
                      />
                    )}
                  </div>

                  <span className="text-[9px] font-semibold text-muted-foreground truncate w-full text-center mt-1">
                    {d.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground mt-2 border-t border-border/60 pt-3 flex-wrap gap-2">
            <div className="flex items-center gap-4 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600 inline-block" /> Impressions
              </span>
              <span className="flex items-center gap-1.5 text-purple-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-600 inline-block" /> Clicks
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Period: {daily[0]?.date} → {daily[daily.length - 1]?.date}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DAILY TELEMETRY BREAKDOWN TABLE */}
      <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Daily Telemetry Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exact day-by-day conversion stats and click delivery logs.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportReport}
              className="text-xs font-bold h-8 rounded-xl"
            >
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/70 sticky top-0 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3.5">Date</th>
                  <th className="text-right p-3.5">Impressions</th>
                  <th className="text-right p-3.5">Clicks</th>
                  <th className="text-right p-3.5">Daily CTR</th>
                  <th className="text-right p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {[...daily].reverse().map((d) => (
                  <tr key={d.date} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3.5 font-bold text-foreground">
                      {new Date(d.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="text-right p-3.5 text-blue-600 font-bold">{d.imp.toLocaleString()}</td>
                    <td className="text-right p-3.5 font-black text-purple-600">{d.clk.toLocaleString()}</td>
                    <td className="text-right p-3.5 font-bold text-emerald-600">
                      {d.imp ? ((d.clk / d.imp) * 100).toFixed(2) : '0.00'}%
                    </td>
                    <td className="text-right p-3.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Logged
                      </span>
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
