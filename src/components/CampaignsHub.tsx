import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  BarChart2,
  Megaphone,
  Eye,
  MousePointerClick,
  Coins,
  Loader2,
  Percent,
  Radio,
  Pause,
  Play,
  Copy,
  Trash2,
  Share2,
  CalendarClock,
  Clock,
  Sparkles,
  Plus,
  Search,
  Settings2,
  MapPin,
  Upload,
  ExternalLink,
  Layers,
  PauseCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import CampaignAnalytics from "@/components/CampaignAnalytics";
import ExtendAdvertModal, { ExtendableAd } from "@/components/ExtendAdvertModal";
import { MarketingLinkGeneratorModal } from "@/components/MarketingLinkGeneratorModal";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useActivationStatus } from "@/hooks/useActivationStatus";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";
import {
  BannerAdRecord,
  BannerStatus,
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

export interface CampaignsHubProps {
  onNavigate?: (tab: string) => void;
  userCredits?: number;
  isAdmin?: boolean;
  isPremium?: boolean;
  adCostCredits?: number;
  maxAdDays?: number;
  initialCreating?: boolean;
  onCreatingChange?: (creating: boolean) => void;
  onCreditsUpdated?: (newCredits: number) => void;
  onAdsChanged?: () => void;
}

type BannerTabStatus = "all" | "active" | "inactive" | "expired";

const statusMeta: Record<BannerStatus, { label: string; cls: string }> = {
  active: { label: "Live", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  pending: { label: "Pending Review", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  paused: { label: "Paused", cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  expired: { label: "Expired", cls: "bg-muted text-muted-foreground border-border" },
};

const CampaignsHub: React.FC<CampaignsHubProps> = ({
  onNavigate,
  userCredits,
  isAdmin = false,
  isPremium = false,
  adCostCredits = 5,
  maxAdDays = 7,
  initialCreating = false,
  onCreatingChange,
  onCreditsUpdated,
  onAdsChanged,
}) => {
  const { isEnabled } = useFeatureToggles();
  const { requireActivation } = useActivationStatus();

  const [banners, setBanners] = useState<BannerAdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BannerTabStatus>("all");
  const [placementFilter, setPlacementFilter] = useState<"all" | "national" | "state">("all");
  const [search, setSearch] = useState("");
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(userCredits ?? 0);

  // Create form state & idempotency guards
  const [isCreating, setIsCreating] = useState<boolean>(initialCreating);
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const createInFlightRef = useRef(false);
  const createAttemptKeyRef = useRef<string | null>(
    initialCreating ? generateBannerIdempotencyKey("banner_hub") : null
  );
  const duplicatingIdRef = useRef<string | null>(null);
  const duplicateAttemptKeysRef = useRef<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newAd, setNewAd] = useState({
    title: "",
    description: "",
    image_url: "",
    target_url: "",
    target_state: "all",
    is_active: true,
    duration: "7",
  });

  // Manage / Edit modal state
  const [managingAd, setManagingAd] = useState<BannerAdRecord | null>(null);
  const [savingManage, setSavingManage] = useState(false);

  // Extend & Delete & Link Generator modals
  const [extendingAd, setExtendingAd] = useState<ExtendableAd | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerAdRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [linkGenOpen, setLinkGenOpen] = useState(false);

  useEffect(() => {
    if (typeof userCredits === "number") {
      setCredits(userCredits);
    }
  }, [userCredits]);

  useEffect(() => {
    setIsCreating(initialCreating);
    if (initialCreating) {
      if (!createAttemptKeyRef.current) {
        createAttemptKeyRef.current = generateBannerIdempotencyKey("banner_hub");
      }
      if (typeof window !== "undefined") {
        setTimeout(() => {
          document.getElementById("banner-create-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } else {
      createAttemptKeyRef.current = null;
    }
  }, [initialCreating]);

  const setCreatingState = (val: boolean) => {
    setIsCreating(val);
    onCreatingChange?.(val);
    if (val) {
      if (!createAttemptKeyRef.current) {
        createAttemptKeyRef.current = generateBannerIdempotencyKey("banner_hub");
      }
      if (typeof window !== "undefined") {
        setTimeout(() => {
          document.getElementById("banner-create-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    } else {
      createAttemptKeyRef.current = null;
    }
  };

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      const [{ data: profileRow }, { data: adsData, error }] = await Promise.all([
        supabase.from("profiles").select("credits").eq("user_id", uid).maybeSingle(),
        supabase
          .from("ads")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
      ]);

      if (typeof profileRow?.credits === "number") {
        setCredits(profileRow.credits);
        onCreditsUpdated?.(profileRow.credits);
      }

      if (error) {
        toast.error("Failed to load banner adverts");
        setLoading(false);
        return;
      }

      // Strictly keep banner adverts; exclude watch-to-earn / credit-task entries
      const onlyBanners = ((adsData || []) as BannerAdRecord[]).filter(isBannerAdvert);
      setBanners(onlyBanners);
    } catch {
      toast.error("Unable to load banner adverts");
    } finally {
      setLoading(false);
    }
  };

  const uploadBannerImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ad-images").upload(fileName, file, { upsert: true });
      if (error) {
        toast.error("Failed to upload banner image");
        return null;
      }
      const { data: { publicUrl } } = supabase.storage.from("ad-images").getPublicUrl(fileName);
      return publicUrl;
    } catch {
      toast.error("Image upload failed");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateBanner = async () => {
    if (createInFlightRef.current || creatingSubmitting) return;
    if (!requireActivation("create banner adverts")) return;
    if (!newAd.title.trim() || !newAd.target_url.trim()) {
      toast.error("Title and target URL are required");
      return;
    }
    const duration = parseInt(newAd.duration, 10) || 7;
    if (duration > maxAdDays && !isAdmin) {
      toast.error(`Your plan allows banner ads up to ${maxAdDays} days. Upgrade for longer campaigns.`);
      onNavigate?.("premium");
      return;
    }
    if (!isAdmin && credits < adCostCredits) {
      toast.error(`Not enough credits. Need ${adCostCredits}, have ${credits}`);
      return;
    }

    const attemptKey =
      createAttemptKeyRef.current ||
      (createAttemptKeyRef.current = generateBannerIdempotencyKey("banner_hub"));

    createInFlightRef.current = true;
    setCreatingSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + duration);

      const result = await createBannerAdIdempotent({
        idempotencyKey: attemptKey,
        title: newAd.title.trim(),
        description: newAd.description.trim() || "",
        image_url: newAd.image_url || null,
        target_url: newAd.target_url.trim(),
        target_state: newAd.target_state === "all" ? null : newAd.target_state,
        ad_type: "banner",
        duration_days: duration,
        is_active: isAdmin ? newAd.is_active : true,
        approved: isAdmin,
        expires_at: expiresAt.toISOString(),
        deduct_credits: !isAdmin,
        billing_mode: "standard",
      });

      if (!result.success || !result.ad) {
        if (typeof result.credits === "number") {
          setCredits(result.credits);
          onCreditsUpdated?.(result.credits);
        }
        toast.error(result.error || "Failed to create banner advert");
        return;
      }

      if (typeof result.credits === "number") {
        setCredits(result.credits);
        onCreditsUpdated?.(result.credits);
      } else if (!isAdmin && !result.alreadyExists) {
        const nextCredits = Math.max(0, credits - adCostCredits);
        await supabase.from("profiles").update({ credits: nextCredits }).eq("user_id", user.id);
        setCredits(nextCredits);
        onCreditsUpdated?.(nextCredits);
      }

      toast.success(
        result.alreadyExists
          ? "Banner advert already created — restored existing campaign."
          : "Banner advert created!"
      );
      createAttemptKeyRef.current = null;
      setNewAd({
        title: "",
        description: "",
        image_url: "",
        target_url: "",
        target_state: "all",
        is_active: true,
        duration: "7",
      });
      setCreatingState(false);
      await load();
      onAdsChanged?.();
    } finally {
      createInFlightRef.current = false;
      setCreatingSubmitting(false);
    }
  };

  const handleSaveManage = async () => {
    if (!managingAd) return;
    if (!managingAd.title.trim() || !managingAd.target_url.trim()) {
      toast.error("Title and target URL are required");
      return;
    }
    setSavingManage(true);
    try {
      const { error } = await supabase
        .from("ads")
        .update({
          title: managingAd.title.trim(),
          description: managingAd.description || "",
          image_url: managingAd.image_url || null,
          target_url: managingAd.target_url.trim(),
          target_state: managingAd.target_state || null,
          is_active: !!managingAd.is_active,
        })
        .eq("id", managingAd.id);

      if (error) {
        toast.error(error.message || "Failed to update banner advert");
        return;
      }
      toast.success("Banner advert updated");
      setManagingAd(null);
      await load();
      onAdsChanged?.();
    } finally {
      setSavingManage(false);
    }
  };

  const togglePause = async (ad: BannerAdRecord) => {
    const nextActive = !ad.is_active;
    const { error } = await supabase.from("ads").update({ is_active: nextActive }).eq("id", ad.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(nextActive ? "Banner advert resumed" : "Banner advert paused");
    setBanners((prev) => prev.map((b) => (b.id === ad.id ? { ...b, is_active: nextActive } : b)));
    onAdsChanged?.();
  };

  const duplicateBanner = async (ad: BannerAdRecord) => {
    if (duplicatingIdRef.current) return;
    const attemptKey =
      duplicateAttemptKeysRef.current[ad.id] ||
      (duplicateAttemptKeysRef.current[ad.id] = generateBannerIdempotencyKey(`dup_${ad.id.slice(0, 8)}`));

    duplicatingIdRef.current = ad.id;
    setDuplicatingId(ad.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const payload = buildDuplicateBannerPayload(ad, auth.user.id, attemptKey);
      const result = await createBannerAdIdempotent({
        idempotencyKey: attemptKey,
        title: payload.title,
        description: payload.description,
        image_url: payload.image_url,
        target_url: payload.target_url,
        target_state: payload.target_state,
        ad_type: "banner",
        duration_days: 7,
        is_active: false,
        approved: false,
        deduct_credits: false,
        allow_draft_url: true,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to duplicate banner");
        return;
      }

      delete duplicateAttemptKeysRef.current[ad.id];
      toast.success(
        result.alreadyExists
          ? "Banner duplicate already created — showing existing draft"
          : "Banner duplicated as a paused draft"
      );
      setStatusFilter("inactive");
      await load();
      onAdsChanged?.();
    } finally {
      duplicatingIdRef.current = null;
      setDuplicatingId(null);
    }
  };

  const shareBanner = async (ad: BannerAdRecord) => {
    const url = getBannerShareUrl(ad, window.location.origin);
    try {
      if (navigator.share) {
        await navigator.share({ title: ad.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Banner link copied to clipboard");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Banner link copied to clipboard");
      } catch {
        toast.error("Unable to copy link");
      }
    }
  };

  const confirmDeleteBanner = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("ads").delete().eq("id", deleteTarget.id);
      if (error) {
        toast.error(error.message || "Failed to delete banner advert");
        return;
      }
      toast.success("Banner advert deleted");
      setDeleteTarget(null);
      await load();
      onAdsChanged?.();
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => computeBannerStats(banners), [banners]);

  const visibleBanners = useMemo(
    () =>
      filterBannerAds(banners, {
        status: statusFilter,
        placement: placementFilter,
        search,
      }),
    [banners, statusFilter, placementFilter, search]
  );

  if (analyticsId) {
    return <CampaignAnalytics adId={analyticsId} onBack={() => setAnalyticsId(null)} />;
  }

  const overviewCards = [
    { icon: Layers, label: "Banners", value: stats.total.toLocaleString(), tint: "bg-orange-500/15 text-orange-600" },
    { icon: Radio, label: "Live", value: stats.active.toLocaleString(), tint: "bg-emerald-500/15 text-emerald-600" },
    { icon: PauseCircle, label: "Paused", value: stats.inactive.toLocaleString(), tint: "bg-amber-500/15 text-amber-600" },
    { icon: Eye, label: "Views", value: stats.totalImpressions.toLocaleString(), tint: "bg-blue-500/15 text-blue-600" },
    { icon: MousePointerClick, label: "Clicks", value: stats.totalClicks.toLocaleString(), tint: "bg-teal-500/15 text-teal-600" },
    { icon: Percent, label: "Avg CTR", value: `${stats.avgCtr}%`, tint: "bg-purple-500/15 text-purple-600" },
  ];

  return (
    <div className="space-y-5" data-testid="banner-ad-management">
      {/* 1. Header & Primary Actions */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur grid place-items-center shrink-0">
              <Megaphone className="h-5 w-5 text-white" />
            </span>
            <h2 className="text-xl font-black tracking-tight">Banner Ad Management</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/90">
            Create, monitor, and optimize your display banner adverts across the GGD publisher network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setCreatingState(!isCreating)}
            className="bg-white text-orange-600 hover:bg-white/95 font-black rounded-xl shadow-md text-xs h-9 px-3.5 flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {isCreating ? "Close Form" : "Create Banner Ad"}
          </Button>
          <Button
            onClick={() => setLinkGenOpen(true)}
            variant="outline"
            className="bg-white/15 hover:bg-white/25 text-white border-white/30 font-bold rounded-xl text-xs h-9 px-3.5"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Link Generator
          </Button>
        </div>
      </div>

      {/* 2. Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {overviewCards.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${item.tint}`}>
                <item.icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground leading-tight">
                {item.label}
              </span>
            </div>
            <p className="text-xl font-black mt-2 text-foreground tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      {/* 3. Create Banner Ad Form (Collapsible) */}
      {isCreating && (
        <Card id="banner-create-card" className="border-orange-500/30 shadow-md overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-500/10 to-red-500/5 border-b border-border/60">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-black">Create New Banner Advert</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAdmin
                    ? "Free for admins — banner publishes immediately."
                    : `Cost: ${adCostCredits} credits · Available balance: ${credits.toLocaleString()} credits`}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-orange-500/30 text-orange-600 bg-orange-500/10">
                <Coins className="h-3.5 w-3.5 mr-1" />
                {isAdmin ? "Admin Free" : `${adCostCredits} Credits`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="banner-title" className="text-xs font-bold">Banner Title *</Label>
                <Input
                  id="banner-title"
                  placeholder="e.g. 30% Off Lagos Weekend Sale"
                  value={newAd.title}
                  onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-target-url" className="text-xs font-bold">Destination URL *</Label>
                <Input
                  id="banner-target-url"
                  placeholder="https://yourbusiness.com/offer"
                  value={newAd.target_url}
                  onChange={(e) => setNewAd({ ...newAd, target_url: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-desc" className="text-xs font-bold">Ad Copy / Description (optional)</Label>
              <Textarea
                id="banner-desc"
                placeholder="Brief message shown alongside your banner advert..."
                value={newAd.description}
                onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-orange-500" /> Target Placement
                </Label>
                <Select value={newAd.target_state} onValueChange={(v) => setNewAd({ ...newAd, target_state: v })}>
                  <SelectTrigger>
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

              {(isEnabled("ad_duration_settings") || isAdmin) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Campaign Duration</Label>
                  <Select value={newAd.duration} onValueChange={(v) => setNewAd({ ...newAd, duration: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">7 Days</SelectItem>
                      {(isPremium || isAdmin) && <SelectItem value="14">14 Days</SelectItem>}
                      {(isPremium || isAdmin) && <SelectItem value="30">30 Days</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Banner Image</Label>
              <input
                type="file"
                id="hubNewAdImageUpload"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadBannerImage(file);
                  if (url) setNewAd((prev) => ({ ...prev, image_url: url }));
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-xs font-semibold"
                disabled={uploadingImage}
                onClick={() => document.getElementById("hubNewAdImageUpload")?.click()}
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploadingImage ? "Uploading banner image..." : newAd.image_url ? "Change Banner Image" : "Upload Banner Image"}
              </Button>
              {newAd.image_url && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img loading="lazy" src={newAd.image_url} alt="Banner preview" className="w-full max-h-48 object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    aria-label="Remove uploaded banner image"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setNewAd({ ...newAd, image_url: "" })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="new-banner-active"
                  checked={newAd.is_active}
                  onCheckedChange={(c) => setNewAd({ ...newAd, is_active: c })}
                />
                <Label htmlFor="new-banner-active" className="text-xs font-medium">
                  Start active once approved
                </Label>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleCreateBanner}
                disabled={creatingSubmitting || uploadingImage}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs h-10"
              >
                {creatingSubmitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                {creatingSubmitting
                  ? "Publishing..."
                  : `Publish Banner (${isAdmin ? "Free" : `${adCostCredits} credits`})`}
              </Button>
              <Button
                type="button"
                disabled={creatingSubmitting}
                onClick={() => setCreatingState(false)}
                variant="outline"
                className="flex-1 text-xs font-bold h-10"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Search & Status / Placement Filter Bar */}
      <Card className="border-border/60 shadow-2xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search banners by title, target URL, or state..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {(
                [
                  { id: "all", label: "All Placements" },
                  { id: "national", label: "National" },
                  { id: "state", label: "State-Targeted" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlacementFilter(p.id)}
                  className={`flex-shrink-0 px-3 h-10 rounded-xl text-xs font-bold border transition ${
                    placementFilter === p.id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as BannerTabStatus)}>
            <TabsList className="w-full grid grid-cols-4 h-11">
              <TabsTrigger value="all" className="text-xs sm:text-sm font-bold">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs sm:text-sm font-bold">
                Live ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs sm:text-sm font-bold">
                Paused ({stats.inactive})
              </TabsTrigger>
              <TabsTrigger value="expired" className="text-xs sm:text-sm font-bold">
                Expired ({stats.expired})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 5. Structured Banner Cards */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" />
          <p className="text-xs text-muted-foreground mt-2 font-medium">Loading banner adverts...</p>
        </div>
      ) : visibleBanners.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-12 text-center space-y-3">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="text-sm font-bold text-foreground">
                {search || statusFilter !== "all" || placementFilter !== "all"
                  ? "No banner adverts match your filters"
                  : "No banner adverts yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {banners.length === 0
                  ? "Create your first display banner advert to drive targeted traffic."
                  : "Try switching status tabs or clearing your search filter."}
              </p>
            </div>
            {banners.length === 0 && (
              <Button
                onClick={() => setCreatingState(true)}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create Banner Ad
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {visibleBanners.map((ad) => {
            const status = getBannerStatus(ad);
            const meta = statusMeta[status];
            const remaining = getBannerDaysLeft(ad);
            const ctr = computeBannerCtr(ad.impressions, ad.clicks);
            const isExpired = status === "expired";

            return (
              <Card
                key={ad.id}
                className={`overflow-hidden border rounded-2xl transition-all hover:shadow-md ${
                  isExpired ? "border-border/60 bg-card/80" : "border-border/80 bg-card"
                }`}
              >
                <CardContent className="p-3.5 sm:p-4 space-y-3.5">
                  {/* Card Top: Thumbnail + Title + Badges + Destination */}
                  <div className="flex flex-col sm:flex-row gap-3.5">
                    <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-border/60 flex items-center justify-center shrink-0">
                      {ad.image_url ? (
                        <img
                          src={ad.image_url}
                          alt={`${ad.title} banner creative`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-orange-500/70 gap-1">
                          <Megaphone className="h-7 w-7" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Banner Ad</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-foreground leading-snug break-words">
                          {ad.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          <Badge variant="outline" className={`text-[10px] font-bold ${meta.cls}`}>
                            {meta.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            <MapPin className="h-3 w-3 mr-1" />
                            {ad.target_state || "All Nigeria"}
                          </Badge>
                        </div>
                      </div>

                      {ad.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                        <a
                          href={getBannerShareUrl(ad, window.location.origin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-orange-600 hover:underline font-medium truncate max-w-xs"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{ad.target_url}</span>
                        </a>
                        <span>Created {new Date(ad.created_at).toLocaleDateString()}</span>
                        {remaining !== null && (
                          <span className={`inline-flex items-center gap-1 font-semibold ${remaining === 0 ? "text-red-500" : "text-foreground"}`}>
                            <CalendarClock className="h-3 w-3" />
                            {remaining === 0 ? "Ended" : `${remaining}d left`}
                          </span>
                        )}
                      </div>

                      {ad.rejection_reason && (
                        <div className="flex items-start gap-1.5 rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[11px] text-destructive">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{ad.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Strip */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 border border-border/50 px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-bold text-foreground tabular-nums">
                        {(ad.impressions || 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground hidden sm:inline">views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MousePointerClick className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-foreground tabular-nums">
                        {(ad.clicks || 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground hidden sm:inline">clicks</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <span className="font-bold text-foreground tabular-nums">{ctr}%</span>
                      <span className="text-muted-foreground hidden sm:inline">CTR</span>
                    </div>
                  </div>

                  {/* Consistent Actions Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                    {isExpired && (
                      <Button
                        size="sm"
                        className="h-9 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl"
                        onClick={() =>
                          setExtendingAd({
                            id: ad.id,
                            title: ad.title,
                            description: ad.description,
                            image_url: ad.image_url,
                            target_url: ad.target_url || "#",
                            expires_at: ad.expires_at,
                            is_active: ad.is_active,
                            budget_credits: ad.budget_credits,
                          })
                        }
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Extend
                      </Button>
                    )}

                    <Button
                      size="sm"
                      className="h-9 text-xs font-bold rounded-xl"
                      onClick={() => setAnalyticsId(ad.id)}
                    >
                      <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
                      Analytics
                    </Button>

                    {!isExpired && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs font-bold rounded-xl"
                        onClick={() => togglePause(ad)}
                      >
                        {ad.is_active ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-1.5 text-yellow-600" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={duplicatingId === ad.id}
                      className="h-9 text-xs font-bold rounded-xl"
                      onClick={() => duplicateBanner(ad)}
                    >
                      {duplicatingId === ad.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {duplicatingId === ad.id ? "Duplicating..." : "Duplicate"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs font-bold rounded-xl"
                      onClick={() => shareBanner(ad)}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                      Share
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs font-bold rounded-xl"
                      onClick={() => setManagingAd({ ...ad })}
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                      Manage
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Delete ${ad.title}`}
                      className="h-9 text-xs font-bold rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 ml-auto"
                      onClick={() => setDeleteTarget(ad)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manage / Edit Banner Advert Dialog */}
      <Dialog open={!!managingAd} onOpenChange={(open) => { if (!open) setManagingAd(null); }}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl p-5"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-black">Manage Banner Advert</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update creative assets, destination link, placement, or extend your campaign duration.
            </DialogDescription>
          </DialogHeader>

          {managingAd && (
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="manage-banner-title" className="text-xs font-bold">Title *</Label>
                <Input
                  id="manage-banner-title"
                  value={managingAd.title}
                  onChange={(e) => setManagingAd({ ...managingAd, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manage-banner-desc" className="text-xs font-bold">Description</Label>
                <Textarea
                  id="manage-banner-desc"
                  rows={2}
                  value={managingAd.description || ""}
                  onChange={(e) => setManagingAd({ ...managingAd, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manage-banner-url" className="text-xs font-bold">Target URL *</Label>
                <Input
                  id="manage-banner-url"
                  value={managingAd.target_url}
                  onChange={(e) => setManagingAd({ ...managingAd, target_url: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Target State</Label>
                <Select
                  value={managingAd.target_state || "all"}
                  onValueChange={(v) => setManagingAd({ ...managingAd, target_state: v === "all" ? null : v })}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label className="text-xs font-bold">Banner Creative</Label>
                <input
                  type="file"
                  id="manageBannerImageUpload"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadBannerImage(file);
                    if (url) setManagingAd((prev) => (prev ? { ...prev, image_url: url } : null));
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 text-xs font-semibold"
                  disabled={uploadingImage}
                  onClick={() => document.getElementById("manageBannerImageUpload")?.click()}
                >
                  {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {managingAd.image_url ? "Replace Banner Image" : "Upload Banner Image"}
                </Button>
                {managingAd.image_url && (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img loading="lazy" src={managingAd.image_url} alt="Banner creative" className="w-full max-h-44 object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label="Remove banner image"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setManagingAd({ ...managingAd, image_url: null })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="manage-banner-active"
                    checked={!!managingAd.is_active}
                    onCheckedChange={(c) => setManagingAd({ ...managingAd, is_active: c })}
                  />
                  <Label htmlFor="manage-banner-active" className="text-xs font-bold">
                    Active Status
                  </Label>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-bold"
                  onClick={() => {
                    const target = managingAd;
                    setManagingAd(null);
                    setExtendingAd({
                      id: target.id,
                      title: target.title,
                      description: target.description,
                      image_url: target.image_url,
                      target_url: target.target_url || "#",
                      expires_at: target.expires_at,
                      is_active: target.is_active,
                      budget_credits: target.budget_credits,
                    });
                  }}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" /> Extend Duration
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveManage}
                  disabled={savingManage || uploadingImage}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs h-10"
                >
                  {savingManage ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManagingAd(null)}
                  className="flex-1 text-xs font-bold h-10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
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
              {deleting ? "Deleting..." : "Delete Banner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Duration Modal */}
      <ExtendAdvertModal
        ad={extendingAd}
        open={!!extendingAd}
        onOpenChange={(open) => {
          if (!open) setExtendingAd(null);
        }}
        userCredits={credits}
        onCreditsUpdate={(newCredits) => {
          setCredits(newCredits);
          onCreditsUpdated?.(newCredits);
        }}
        onSuccess={(updatedAd) => {
          setBanners((prev) =>
            prev.map((row) =>
              row.id === updatedAd.id
                ? {
                    ...row,
                    expires_at: updatedAd.expires_at,
                    is_active: true,
                    budget_credits: updatedAd.budget_credits ?? row.budget_credits,
                  }
                : row
            )
          );
          load();
          onAdsChanged?.();
        }}
      />

      <MarketingLinkGeneratorModal open={linkGenOpen} onOpenChange={setLinkGenOpen} />
    </div>
  );
};

export default CampaignsHub;