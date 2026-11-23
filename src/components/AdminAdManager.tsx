import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Trash2,
  Pause,
  Play,
  Globe,
  Monitor,
  RefreshCw,
  Check,
  X,
  MapPin,
  Image as ImageIcon,
  CalendarPlus,
  Minimize2,
  Maximize2,
  ExternalLink,
  Megaphone,
  BarChart2,
  Copy,
  Share2,
  Settings2,
  Eye,
  MousePointerClick,
  Percent,
  Loader2,
  Save,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { notifyAdOrBusinessStatusPush } from "@/services/pushNotificationService";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";
import {
  BannerAdRecord,
  BannerSourceFilter,
  BannerStatusFilter,
  buildDuplicateBannerPayload,
  computeBannerCtr,
  computeBannerStats,
  filterBannerAds,
  generateBannerIdempotencyKey,
  getBannerDaysLeft,
  getBannerShareUrl,
  getBannerStatus,
  isBannerAdvert,
} from "@/lib/bannerAds";
import { createBannerAdIdempotent } from "@/services/bannerAdService";

export type Ad = BannerAdRecord;

interface AdminAdManagerProps {
  initialAdId?: string;
  onNavigateSyndicate?: (ad: Ad) => void;
}

interface DailyPoint {
  date: string;
  impressions: number;
  clicks: number;
}

const statusBadgeMap: Record<string, { label: string; cls: string }> = {
  active: { label: 'Live', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  pending: { label: 'Pending', cls: 'bg-orange-500/15 text-orange-600 border-orange-500/30' },
  paused: { label: 'Paused', cls: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  rejected: { label: 'Rejected', cls: 'bg-destructive/15 text-destructive border-destructive/30' },
  expired: { label: 'Expired', cls: 'bg-muted text-muted-foreground border-border' },
};

const AdminAdManager: React.FC<AdminAdManagerProps> = ({ initialAdId, onNavigateSyndicate }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BannerStatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<BannerSourceFilter>('all');

  // Manage modal state
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetUrl, setEditTargetUrl] = useState('');
  const [editTargetState, setEditTargetState] = useState('all');
  const [savingEdits, setSavingEdits] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [extendDays, setExtendDays] = useState('7');
  const [extending, setExtending] = useState(false);

  // Analytics modal state
  const [analyticsAd, setAnalyticsAd] = useState<Ad | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyPoint[]>([]);

  // Delete confirmation & UI toggles
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const duplicatingIdRef = useRef<string | null>(null);
  const duplicateAttemptKeysRef = useRef<Record<string, string>>({});

  const openManageModal = (ad: Ad) => {
    setSelectedAd(ad);
    setEditTitle(ad.title || '');
    setEditDescription(ad.description || '');
    setEditTargetUrl(ad.target_url || '');
    setEditTargetState(ad.target_state || 'all');
    setRejectReason('');
  };

  const openAnalyticsModal = async (ad: Ad) => {
    setAnalyticsAd(ad);
    setAnalyticsLoading(true);
    try {
      const since = new Date(Date.now() - 13 * 86400000).toISOString();
      const { data: events } = await supabase
        .from('ad_events')
        .select('event_type, created_at')
        .eq('ad_id', ad.id)
        .gte('created_at', since)
        .order('created_at');

      const map: Record<string, { impressions: number; clicks: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        map[key] = { impressions: 0, clicks: 0 };
      }

      (events || []).forEach((ev: any) => {
        const key = new Date(ev.created_at).toISOString().slice(0, 10);
        if (!map[key]) return;
        if (ev.event_type === 'click') map[key].clicks += 1;
        else map[key].impressions += 1;
      });

      setDailyStats(Object.entries(map).map(([date, val]) => ({ date, ...val })));
    } catch {
      setDailyStats([]);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAds = async () => {
    setLoading(true);
    const { data: adsData, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load banner adverts');
      setLoading(false);
      return;
    }

    // Strictly exclude credit tasks & watch-to-earn tasks from Banner Ad Management
    const bannerRows = (adsData || []).filter(isBannerAdvert);

    const userIds = [...new Set(bannerRows.map((a) => a.user_id).filter(Boolean))];
    const profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);

      profiles?.forEach((p) => {
        profileMap[p.user_id] = p.email || 'Unknown';
      });
    }

    const { data: apiKeys } = await supabase.from('api_keys').select('user_id');
    const apiUserIds = new Set((apiKeys || []).map((k) => k.user_id));

    const enrichedBanners: Ad[] = bannerRows.map((ad) => ({
      ...ad,
      owner_email: profileMap[ad.user_id] || 'Unknown',
      source: apiUserIds.has(ad.user_id) ? 'api' : 'direct',
    }));

    setAds(enrichedBanners);
    setLoading(false);
  };

  const handledInitialAdIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (!initialAdId || ads.length === 0 || handledInitialAdIdRef.current === initialAdId) return;
    const match = ads.find((a) => a.id === initialAdId);
    if (match) {
      handledInitialAdIdRef.current = initialAdId;
      setStatusFilter('all');
      openManageModal(match);
    }
  }, [initialAdId, ads]);

  const saveBannerEdits = async () => {
    if (!selectedAd) return;
    if (!editTitle.trim() || !editTargetUrl.trim()) {
      toast.error('Banner title and target URL are required');
      return;
    }
    setSavingEdits(true);
    const nextState = editTargetState === 'all' ? null : editTargetState;
    const { error } = await supabase
      .from('ads')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        target_url: editTargetUrl.trim(),
        target_state: nextState,
      })
      .eq('id', selectedAd.id);

    setSavingEdits(false);
    if (error) {
      toast.error('Failed to update banner advert');
      return;
    }
    toast.success('Banner advert details saved');
    const updated: Ad = {
      ...selectedAd,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      target_url: editTargetUrl.trim(),
      target_state: nextState,
    };
    setSelectedAd(updated);
    setAds((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const extendAdDuration = async () => {
    if (!selectedAd) return;
    const days = parseInt(extendDays, 10);
    if (!days || days < 1) {
      toast.error('Enter a valid number of days');
      return;
    }
    setExtending(true);
    const base =
      selectedAd.expires_at && new Date(selectedAd.expires_at) > new Date()
        ? new Date(selectedAd.expires_at)
        : new Date();
    base.setDate(base.getDate() + days);
    const newExpiry = base.toISOString();
    const { error } = await supabase
      .from('ads')
      .update({ expires_at: newExpiry, is_active: true })
      .eq('id', selectedAd.id);
    setExtending(false);
    if (error) {
      toast.error('Failed to extend duration');
      return;
    }
    toast.success(`Extended by ${days} day${days > 1 ? 's' : ''}`);
    if (selectedAd.user_id) {
      notifyAdOrBusinessStatusPush({
        userId: selectedAd.user_id,
        entityType: 'ad',
        itemTitle: selectedAd.title || 'Banner Advert',
        statusLabel: 'Extended',
        details: `Your banner advert "${selectedAd.title || 'Campaign'}" was extended by ${days} day${days > 1 ? 's' : ''}.`,
        url: '/?tab=campaigns',
      }).catch(() => {});
    }
    setSelectedAd({ ...selectedAd, expires_at: newExpiry, is_active: true });
    fetchAds();
  };

  const toggleAdStatus = async (ad: Ad) => {
    const newStatus = !ad.is_active;
    const { error } = await supabase.from('ads').update({ is_active: newStatus }).eq('id', ad.id);

    if (error) {
      toast.error('Failed to update banner status');
      return;
    }
    toast.success(newStatus ? 'Banner advert resumed' : 'Banner advert paused');
    if (ad.user_id) {
      notifyAdOrBusinessStatusPush({
        userId: ad.user_id,
        entityType: 'ad',
        itemTitle: ad.title || 'Banner Advert',
        statusLabel: newStatus ? 'Resumed & Live' : 'Paused',
        details: newStatus
          ? `Your banner advert "${ad.title || 'Campaign'}" is now active and serving impressions.`
          : `Your banner advert "${ad.title || 'Campaign'}" has been paused.`,
        url: '/?tab=campaigns',
        urgent: !newStatus,
      }).catch(() => {});
    }
    setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: newStatus } : a)));
    if (selectedAd?.id === ad.id) {
      setSelectedAd({ ...selectedAd, is_active: newStatus });
    }
  };

  const approveAd = async (ad: Ad) => {
    const { error } = await supabase
      .from('ads')
      .update({ approved: true, is_active: true, rejection_reason: null })
      .eq('id', ad.id);
    if (error) {
      toast.error('Approve failed');
      return;
    }
    toast.success('Banner advert approved & live');
    if (ad.user_id) {
      notifyAdOrBusinessStatusPush({
        userId: ad.user_id,
        entityType: 'ad',
        itemTitle: ad.title || 'Banner Advert',
        statusLabel: 'Approved & Live',
        details: `Great news! Your banner advert "${ad.title || 'Campaign'}" has been approved and is now live across GGD Ad Network.`,
        url: '/?tab=campaigns',
      }).catch(() => {});
    }
    setAds((prev) =>
      prev.map((a) => (a.id === ad.id ? { ...a, approved: true, is_active: true, rejection_reason: null } : a))
    );
    if (selectedAd?.id === ad.id) {
      setSelectedAd({ ...selectedAd, approved: true, is_active: true, rejection_reason: null });
    }
  };

  const rejectAd = async (ad: Ad, reason: string) => {
    if (!reason.trim()) {
      toast.error('Provide a reason');
      return;
    }
    const { error } = await supabase
      .from('ads')
      .update({ approved: false, is_active: false, rejection_reason: reason.trim() })
      .eq('id', ad.id);
    if (error) {
      toast.error('Reject failed');
      return;
    }
    toast.success('Banner advert rejected');
    if (ad.user_id) {
      notifyAdOrBusinessStatusPush({
        userId: ad.user_id,
        entityType: 'ad',
        itemTitle: ad.title || 'Banner Advert',
        statusLabel: 'Rejected',
        details: `Your banner advert "${ad.title || 'Campaign'}" was rejected: ${reason.trim()}`,
        url: '/?tab=campaigns',
        urgent: true,
      }).catch(() => {});
    }
    setAds((prev) =>
      prev.map((a) =>
        a.id === ad.id ? { ...a, approved: false, is_active: false, rejection_reason: reason.trim() } : a
      )
    );
    setRejectReason('');
    if (selectedAd?.id === ad.id) setSelectedAd(null);
  };

  const duplicateBanner = async (ad: Ad) => {
    if (duplicatingIdRef.current) return;
    const { data: auth } = await supabase.auth.getUser();
    const ownerId = ad.user_id || auth.user?.id;
    if (!ownerId) {
      toast.error('Missing owner ID for duplication');
      return;
    }

    const attemptKey =
      duplicateAttemptKeysRef.current[ad.id] ||
      (duplicateAttemptKeysRef.current[ad.id] = generateBannerIdempotencyKey(`admin_dup_${ad.id.slice(0, 8)}`));

    duplicatingIdRef.current = ad.id;
    setDuplicatingId(ad.id);
    try {
      const payload = buildDuplicateBannerPayload(ad, ownerId, attemptKey);
      const result = await createBannerAdIdempotent({
        idempotencyKey: attemptKey,
        title: payload.title,
        description: payload.description,
        image_url: payload.image_url,
        target_url: payload.target_url,
        target_state: payload.target_state,
        ad_type: 'banner',
        duration_days: 7,
        is_active: false,
        approved: false,
        deduct_credits: false,
        allow_draft_url: true,
        owner_user_id: ownerId,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to duplicate banner advert');
        return;
      }

      delete duplicateAttemptKeysRef.current[ad.id];
      toast.success(
        result.alreadyExists
          ? 'Duplicate draft already created — showing existing banner'
          : 'Banner advert duplicated as pending draft'
      );
      await fetchAds();
    } finally {
      duplicatingIdRef.current = null;
      setDuplicatingId(null);
    }
  };

  const shareBanner = async (ad: Ad) => {
    const url = getBannerShareUrl(ad, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Banner destination link copied');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const confirmDeleteBanner = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('ads').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete banner advert');
      return;
    }
    toast.success('Banner advert deleted');
    setAds((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    if (selectedAd?.id === deleteTarget.id) setSelectedAd(null);
    if (analyticsAd?.id === deleteTarget.id) setAnalyticsAd(null);
    setDeleteTarget(null);
  };

  const stats = useMemo(() => computeBannerStats(ads), [ads]);

  const filtered = useMemo(
    () =>
      filterBannerAds(ads, {
        status: statusFilter,
        source: sourceFilter,
        search,
      }),
    [ads, statusFilter, sourceFilter, search]
  );

  const filterTabs: { id: BannerStatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Banners', count: stats.total },
    { id: 'pending', label: 'Pending', count: stats.pending },
    { id: 'active', label: 'Live', count: stats.active },
    { id: 'paused', label: 'Paused', count: stats.paused },
    { id: 'expired', label: 'Expired', count: stats.expired },
    { id: 'rejected', label: 'Rejected', count: stats.rejected },
  ];

  // Minimized Condensed Bar
  if (isMinimized) {
    return (
      <div className="w-full rounded-2xl bg-card border border-border p-3.5 shadow-md flex items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">Banner Ad Management (Minimized)</h2>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{stats.total} banners</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">{stats.active} live</span>
              {stats.pending > 0 && (
                <>
                  <span>•</span>
                  <span className="text-orange-500 font-bold">{stats.pending} pending</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="rounded-xl h-9 px-3 gap-1.5 text-xs font-bold shrink-0 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Expand Manager</span>
        </Button>
      </div>
    );
  }

  const maxDailyImp = Math.max(1, ...dailyStats.map((d) => d.impressions));

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden" data-testid="admin-banner-ad-manager">
      {/* 1. Top Control Header */}
      <div className="flex items-center justify-between gap-2 bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black truncate">Banner Ad Management</h2>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Moderate, analyze, and manage display banner adverts across the network
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAds}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs rounded-xl font-semibold"
            title="Refresh Banner Adverts"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl border border-border/60 hover:bg-secondary"
            title="Minimize Banner Ad Manager"
          >
            <Minimize2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Minimize</span>
          </Button>
        </div>
      </div>

      {/* 2. Summary Metrics Strip (Banner Adverts Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: 'Total Banners', value: stats.total.toLocaleString(), color: 'bg-primary/10 text-primary border-primary/20' },
          { label: 'Live', value: stats.active.toLocaleString(), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
          { label: 'Pending', value: stats.pending.toLocaleString(), color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
          { label: 'Paused', value: stats.paused.toLocaleString(), color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
          { label: 'Expired', value: stats.expired.toLocaleString(), color: 'bg-red-500/10 text-red-500 border-red-500/20' },
          { label: 'Total Views', value: stats.totalImpressions.toLocaleString(), color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
          { label: 'Total Clicks', value: stats.totalClicks.toLocaleString(), color: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
          { label: 'Avg CTR', value: `${stats.avgCtr}%`, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-2.5 text-center border ${s.color}`}>
            <p className="text-base sm:text-lg font-black tabular-nums">{s.value}</p>
            <p className="text-[10px] font-semibold opacity-90 truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 3. Search, Status & Source Filter Bar */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 space-y-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search banners by title, owner email, target URL, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-background text-xs sm:text-sm border-border/80"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: `All Sources (${stats.total})` },
                { id: 'direct', label: `Direct (${stats.direct})` },
                { id: 'api', label: `API (${stats.api})` },
              ] as const
            ).map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setSourceFilter(src.id)}
                className={`flex-shrink-0 px-3 h-10 rounded-xl text-xs font-bold border transition ${
                  sourceFilter === src.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {filterTabs.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Banner Adverts Content Area: Mobile Cards vs Desktop Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
          <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-xs font-medium">Loading banner adverts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-card rounded-2xl border border-dashed border-border/80 p-6 space-y-2">
          <Megaphone className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-bold text-foreground">
            {search ? 'No matching banner adverts found' : 'No banner adverts in this group'}
          </p>
          <p className="text-xs text-muted-foreground">
            Try switching status or source filters, or clearing your search keywords.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden w-full min-w-0">
            {filtered.map((ad) => {
              const status = getBannerStatus(ad);
              const badge = statusBadgeMap[status];
              const daysLeft = getBannerDaysLeft(ad);
              const ctr = computeBannerCtr(ad.impressions, ad.clicks);

              return (
                <div
                  key={ad.id}
                  className="rounded-2xl border border-border/90 bg-card p-3.5 shadow-sm space-y-3 w-full max-w-full min-w-0 overflow-hidden"
                >
                  <div className="flex items-start gap-3 min-w-0 w-full">
                    {ad.image_url ? (
                      <div className="w-16 h-16 aspect-square rounded-xl overflow-hidden border border-border shrink-0 bg-muted">
                        <img
                          loading="lazy"
                          src={ad.image_url}
                          alt={ad.title || ''}
                          className="h-full w-full object-cover object-center block"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 aspect-square rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                        <ImageIcon className="h-6 w-6 opacity-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </Badge>
                        <Badge variant={ad.source === 'api' ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0.5 shrink-0">
                          {ad.source === 'api' ? 'API' : 'Direct'}
                        </Badge>
                      </div>
                      <h3 className="text-xs font-bold text-foreground line-clamp-2 [overflow-wrap:anywhere]">{ad.title}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">{ad.owner_email}</p>
                    </div>
                  </div>

                  {/* Stats & Metadata Strip */}
                  <div className="grid grid-cols-4 gap-1.5 py-1.5 px-2 bg-muted/40 rounded-xl text-[10px] text-muted-foreground font-medium tabular-nums">
                    <div className="truncate">
                      <span className="text-foreground font-bold">{(ad.impressions || 0).toLocaleString()}</span> views
                    </div>
                    <div className="truncate">
                      <span className="text-foreground font-bold">{(ad.clicks || 0).toLocaleString()}</span> clicks
                    </div>
                    <div className="truncate">
                      <span className="text-foreground font-bold">{ctr}%</span> CTR
                    </div>
                    <div className="truncate text-right">
                      {daysLeft === null ? (
                        <span>No expiry</span>
                      ) : daysLeft === 0 ? (
                        <span className="text-red-500 font-bold">Ended</span>
                      ) : (
                        <span>{daysLeft}d left</span>
                      )}
                    </div>
                  </div>

                  {/* Consistent Actions Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/60 w-full min-w-0">
                    {status === 'pending' && (
                      <Button
                        size="sm"
                        className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                        onClick={() => approveAd(ad)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs rounded-xl font-bold"
                      onClick={() => openAnalyticsModal(ad)}
                    >
                      <BarChart2 className="h-3.5 w-3.5 mr-1" /> Analytics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs rounded-xl font-bold"
                      onClick={() => toggleAdStatus(ad)}
                    >
                      {ad.is_active ? (
                        <><Pause className="h-3.5 w-3.5 mr-1 text-yellow-600" /> Pause</>
                      ) : (
                        <><Play className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Resume</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={duplicatingId === ad.id}
                      className="h-8 px-2.5 text-xs rounded-xl font-bold"
                      onClick={() => duplicateBanner(ad)}
                    >
                      {duplicatingId === ad.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1" />
                      )}
                      {duplicatingId === ad.id ? 'Duplicating...' : 'Duplicate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs rounded-xl font-bold"
                      onClick={() => shareBanner(ad)}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs rounded-xl font-bold"
                      onClick={() => openManageModal(ad)}
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Delete ${ad.title}`}
                      className="h-8 px-2.5 text-xs text-destructive border-destructive/30 rounded-xl font-bold ml-auto"
                      onClick={() => setDeleteTarget(ad)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-bold">Banner Advert</TableHead>
                    <TableHead className="text-xs font-bold">Source & Placement</TableHead>
                    <TableHead className="text-xs font-bold">Performance</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ad) => {
                    const status = getBannerStatus(ad);
                    const badge = statusBadgeMap[status];
                    const daysLeft = getBannerDaysLeft(ad);
                    const ctr = computeBannerCtr(ad.impressions, ad.clicks);

                    return (
                      <TableRow key={ad.id} className="hover:bg-muted/20">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            {ad.image_url ? (
                              <img
                                loading="lazy"
                                src={ad.image_url}
                                alt={ad.title}
                                className="h-12 w-16 rounded-xl object-cover border border-border shrink-0 bg-muted"
                              />
                            ) : (
                              <div className="h-12 w-16 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                                <ImageIcon className="h-5 w-5 opacity-40" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold truncate max-w-[230px] text-foreground">{ad.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[230px]">{ad.owner_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={ad.source === 'api' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                              {ad.source === 'api' ? <Globe className="h-3 w-3 mr-1" /> : <Monitor className="h-3 w-3 mr-1" />}
                              {ad.source === 'api' ? 'API' : 'Direct'}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {ad.target_state || 'All Nigeria'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-[11px] text-muted-foreground font-medium space-y-0.5 tabular-nums">
                            <p><span className="text-foreground font-bold">{(ad.impressions || 0).toLocaleString()}</span> views</p>
                            <p><span className="text-foreground font-bold">{(ad.clicks || 0).toLocaleString()}</span> clicks ({ctr}% CTR)</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={`text-[10px] w-fit font-bold ${badge.cls}`}>
                              {badge.label}
                            </Badge>
                            {daysLeft !== null && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  daysLeft === 0 ? 'text-red-500' : daysLeft <= 2 ? 'text-orange-500' : 'text-muted-foreground'
                                }`}
                              >
                                {daysLeft === 0 ? 'Ended' : `Expires in ${daysLeft}d`}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 rounded-xl"
                                onClick={() => approveAd(ad)}
                                aria-label={`Approve ${ad.title}`}
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                              onClick={() => openAnalyticsModal(ad)}
                              aria-label={`Analytics for ${ad.title}`}
                              title="Analytics"
                            >
                              <BarChart2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                              onClick={() => toggleAdStatus(ad)}
                              aria-label={`${ad.is_active ? 'Pause' : 'Resume'} ${ad.title}`}
                              title={ad.is_active ? 'Pause' : 'Resume'}
                            >
                              {ad.is_active ? <Pause className="h-4 w-4 text-yellow-600" /> : <Play className="h-4 w-4 text-emerald-600" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={duplicatingId === ad.id}
                              className="h-8 w-8 rounded-xl"
                              onClick={() => duplicateBanner(ad)}
                              aria-label={`Duplicate ${ad.title}`}
                              title="Duplicate"
                            >
                              {duplicatingId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                              onClick={() => shareBanner(ad)}
                              aria-label={`Share ${ad.title}`}
                              title="Share"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl"
                              onClick={() => openManageModal(ad)}
                              aria-label={`Manage ${ad.title}`}
                              title="Manage"
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive rounded-xl"
                              onClick={() => setDeleteTarget(ad)}
                              aria-label={`Delete ${ad.title}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Banner Analytics Dialog */}
      <Dialog open={!!analyticsAd} onOpenChange={(open) => !open && setAnalyticsAd(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl p-5">
          <DialogHeader className="pb-2 border-b border-border/80">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-orange-500" />
              Banner Performance Analytics
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {analyticsAd?.title}
            </DialogDescription>
          </DialogHeader>

          {analyticsAd && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                  <Eye className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground tabular-nums">
                    {(analyticsAd.impressions || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Views</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                  <MousePointerClick className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground tabular-nums">
                    {(analyticsAd.clicks || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Clicks</p>
                </div>
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                  <Percent className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-lg font-black text-foreground tabular-nums">
                    {computeBannerCtr(analyticsAd.impressions, analyticsAd.clicks)}%
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">CTR</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">Last 14 Days Activity</p>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Placement: {analyticsAd.target_state || 'All Nigeria'}
                  </span>
                </div>

                {analyticsLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-orange-500" />
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {dailyStats.map((pt) => (
                      <div key={pt.date} className="grid grid-cols-[74px_1fr_auto] items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground font-medium tabular-nums">{pt.date.slice(5)}</span>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                            style={{ width: `${Math.max(pt.impressions > 0 ? 6 : 0, (pt.impressions / maxDailyImp) * 100)}%` }}
                          />
                        </div>
                        <span className="text-foreground font-semibold tabular-nums">
                          {pt.impressions}v · {pt.clicks}c
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Banner Manage & Moderation Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={(open) => !open && setSelectedAd(null)}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl p-4 sm:p-6 border-border bg-card shadow-2xl"
        >
          <DialogHeader className="pb-2 border-b border-border/80">
            <DialogTitle className="text-base sm:text-lg font-bold">Manage Banner Advert</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review banner creative, update placement or destination URL, and apply moderation actions
            </DialogDescription>
          </DialogHeader>

          {selectedAd && (
            <div className="space-y-4 pt-2 min-w-0">
              {selectedAd.image_url && (
                <div className="w-full aspect-[16/10] max-h-52 rounded-2xl overflow-hidden border border-border shadow-sm bg-muted">
                  <img
                    loading="lazy"
                    src={selectedAd.image_url}
                    alt={selectedAd.title}
                    className="w-full h-full object-cover object-center block"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Editable Banner Fields */}
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
                <div className="space-y-1">
                  <Label htmlFor="admin-edit-title" className="text-[11px] font-bold">Banner Title *</Label>
                  <Input
                    id="admin-edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-card"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-edit-desc" className="text-[11px] font-bold">Description</Label>
                  <Textarea
                    id="admin-edit-desc"
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="text-xs rounded-xl bg-card"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-edit-url" className="text-[11px] font-bold">Target Destination URL *</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="admin-edit-url"
                      value={editTargetUrl}
                      onChange={(e) => setEditTargetUrl(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-card flex-1"
                    />
                    <a
                      href={getBannerShareUrl({ target_url: editTargetUrl }, window.location.origin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted shrink-0"
                      title="Open Target URL"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Target Placement State</Label>
                  <Select value={editTargetState} onValueChange={setEditTargetState}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All Nigeria (National)</SelectItem>
                      {NIGERIAN_STATES.map((st) => (
                        <SelectItem key={st} value={st}>{st}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={saveBannerEdits}
                  disabled={savingEdits}
                  className="w-full h-9 text-xs font-bold rounded-xl"
                >
                  {savingEdits ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Banner Changes
                </Button>
              </div>

              {selectedAd.rejection_reason && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                  <p className="font-bold">Rejection Note:</p>
                  <p>{selectedAd.rejection_reason}</p>
                </div>
              )}

              {/* Detail Matrix */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Owner Email</p>
                  <p className="font-bold truncate text-foreground">{selectedAd.owner_email}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Traffic Source</p>
                  <p className="font-bold text-foreground">{selectedAd.source === 'api' ? 'API Integration' : 'Direct Portal'}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Views</p>
                  <p className="font-bold text-foreground">{(selectedAd.impressions || 0).toLocaleString()}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Clicks (CTR)</p>
                  <p className="font-bold text-foreground">
                    {(selectedAd.clicks || 0).toLocaleString()} ({computeBannerCtr(selectedAd.impressions, selectedAd.clicks)}%)
                  </p>
                </div>
              </div>

              {/* Duration Extension Section */}
              <div className="bg-muted/40 rounded-2xl p-3 border border-border/50 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-purple-600" />
                  Extend Banner Duration
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-card"
                    placeholder="Days (e.g. 7)"
                  />
                  <Button
                    size="sm"
                    className="text-xs rounded-xl px-4 font-bold bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={extendAdDuration}
                    disabled={extending}
                  >
                    {extending ? 'Saving...' : 'Extend'}
                  </Button>
                </div>
                {selectedAd.expires_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Current Expiry: {new Date(selectedAd.expires_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {!selectedAd.approved && !selectedAd.rejection_reason && (
                  <Button
                    size="sm"
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 col-span-2"
                    onClick={() => approveAd(selectedAd)}
                  >
                    <Check className="h-4 w-4 mr-1.5" /> Approve & Launch Banner
                  </Button>
                )}

                <Button
                  size="sm"
                  variant={selectedAd.is_active ? 'secondary' : 'default'}
                  className="text-xs font-bold rounded-xl h-10"
                  onClick={() => toggleAdStatus(selectedAd)}
                >
                  {selectedAd.is_active ? (
                    <><Pause className="h-3.5 w-3.5 mr-1.5 text-yellow-600" /> Pause Banner</>
                  ) : (
                    <><Play className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Resume Banner</>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold rounded-xl h-10"
                  onClick={() => duplicateBanner(selectedAd)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold rounded-xl h-10"
                  onClick={() => shareBanner(selectedAd)}
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Link
                </Button>

                {onNavigateSyndicate && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold border-purple-500/30 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl h-10"
                    onClick={() => {
                      onNavigateSyndicate(selectedAd);
                      setSelectedAd(null);
                    }}
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Syndicate
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="destructive"
                  className={`text-xs font-bold rounded-xl h-10 ${onNavigateSyndicate ? 'col-span-2' : ''}`}
                  onClick={() => setDeleteTarget(selectedAd)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Banner
                </Button>
              </div>

              {/* Reject Reason Form (if pending) */}
              {!selectedAd.approved && !selectedAd.rejection_reason && (
                <div className="space-y-2 pt-3 border-t border-border/80">
                  <p className="text-xs font-bold text-destructive">Reject with Reason</p>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="State reason for rejection (e.g. low quality creative, broken target URL)..."
                    rows={2}
                    className="text-xs rounded-xl bg-card"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl h-9"
                    onClick={() => rejectAd(selectedAd, rejectReason)}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" /> Confirm Rejection
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner Advert?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={confirmDeleteBanner}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Banner'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAdManager;
