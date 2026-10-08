import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Smartphone, Wifi, Plus, Trash2, Edit3, ExternalLink, RefreshCw, 
  Search, ShieldCheck, CheckCircle2, Clock, Coins, Sparkles, 
  Layers, Lock, Eye, Check, AlertCircle, ArrowUpRight, Upload, Image as ImageIcon,
  Power, PowerOff, Palette, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { 
  RedeemOffer, 
  RedeemType, 
  NetworkProvider, 
  NETWORK_THEMES,
  getRedeemOffers, 
  createRedeemOffer, 
  updateRedeemOffer, 
  deleteRedeemOffer, 
  toggleOfferActive,
  getAllPlatformRedemptions,
  UserRedemptionRecord,
  seedDefaultRedeemOffers,
  getGlobalRewardLogo,
  setGlobalRewardLogo,
  uploadRewardImage
} from "@/services/redeemMarketplaceService";
import { NetworkLogo, GGDRewardBrandBadge } from "@/components/telecom/TelecomLogos";
import { supabase } from "@/integrations/supabase/client";
import { setFeatureToggleLocally } from "@/hooks/useFeatureToggles";
import ggdLogo from '@/assets/ggd-logo.png';

export const AdminRedeemManager: React.FC = () => {
  const [offers, setOffers] = useState<RedeemOffer[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemptionRecord[]>([]);
  const [globalRewardLogo, setGlobalRewardLogoState] = useState<string | null>(null);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean>(true);
  const [togglingMaster, setTogglingMaster] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingOfferImg, setUploadingOfferImg] = useState(false);

  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'branding' | 'logs'>('manage');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const offerImgFileInputRef = useRef<HTMLInputElement>(null);
  const editImgFileInputRef = useRef<HTMLInputElement>(null);

  // Form state for creating new offer
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    app_link: '',
    image_url: '',
    reward_logo_url: '',
    credit_cost: 5,
    sort_order: 1,
    type: 'data' as RedeemType,
    network: 'mtn' as NetworkProvider,
    denomination: '1GB',
    instructions: 'Enter your phone number in the portal to receive instant top-up.',
    is_active: true,
  });

  // Edit modal state
  const [editingOffer, setEditingOffer] = useState<RedeemOffer | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
    checkMasterToggle();
  }, []);

  const checkMasterToggle = async () => {
    try {
      const { data } = await supabase
        .from('feature_toggles')
        .select('is_enabled')
        .eq('feature_key', 'airtime_redeem')
        .maybeSingle();

      if (data && data.is_enabled !== undefined) {
        setIsFeatureEnabled(data.is_enabled);
      }
    } catch (err) {
      console.warn('Error reading feature toggle:', err);
    }
  };

  const handleToggleMasterFeature = async () => {
    setTogglingMaster(true);
    const nextState = !isFeatureEnabled;
    setIsFeatureEnabled(nextState);
    setFeatureToggleLocally('airtime_redeem', nextState);
    setFeatureToggleLocally('nav_airtime_redeem', nextState);

    try {
      // Upsert/update both airtime_redeem and nav_airtime_redeem
      await Promise.all([
        supabase.from('feature_toggles').upsert({
          feature_key: 'airtime_redeem',
          feature_name: 'Airtime & Data Redeem Marketplace',
          is_enabled: nextState,
          description: 'Master toggle for the Airtime & Data Redeem Marketplace.',
        }, { onConflict: 'feature_key' }),
        supabase.from('feature_toggles').upsert({
          feature_key: 'nav_airtime_redeem',
          feature_name: 'Menu: Redeem Airtime & Data Button',
          is_enabled: nextState,
          description: 'Show or hide Redeem Airtime & Data button on navigation menus',
        }, { onConflict: 'feature_key' }),
      ]);

      toast.success(nextState 
        ? '✅ Airtime & Data Marketplace is now ACTIVE for users' 
        : '⏸️ Airtime & Data Marketplace is now PAUSED (hidden from users)');
    } catch (err: any) {
      toast.error('Failed to update feature toggle in database: ' + err.message);
    } finally {
      setTogglingMaster(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersList, logsList, rewardLogo] = await Promise.all([
        getRedeemOffers(),
        getAllPlatformRedemptions(),
        getGlobalRewardLogo(),
      ]);
      setOffers(offersList);
      setRedemptions(logsList);
      setGlobalRewardLogoState(rewardLogo);
    } catch (err: any) {
      toast.error('Failed to load marketplace data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffer.title.trim()) {
      toast.error('Offer title is required');
      return;
    }
    if (!newOffer.app_link.trim()) {
      toast.error('Redemption tool link is required');
      return;
    }
    if (newOffer.credit_cost < 1) {
      toast.error('Credit cost must be at least 1 credit');
      return;
    }

    setSaving(true);
    try {
      await createRedeemOffer({
        title: newOffer.title.trim(),
        description: newOffer.description.trim() || `${newOffer.denomination} ${newOffer.type === 'airtime' ? 'Airtime Voucher' : 'Data Topup'} on ${NETWORK_THEMES[newOffer.network].name}. Instant access after redemption.`,
        app_link: newOffer.app_link.trim(),
        image_url: newOffer.image_url.trim() || undefined,
        reward_logo_url: newOffer.reward_logo_url.trim() || undefined,
        credit_cost: Number(newOffer.credit_cost),
        sort_order: Number(newOffer.sort_order) || offers.length + 1,
        type: newOffer.type,
        network: newOffer.network,
        denomination: newOffer.denomination.trim(),
        instructions: newOffer.instructions.trim(),
        is_active: newOffer.is_active,
      });

      toast.success('🎉 Redeem Offer created successfully!');
      setNewOffer({
        title: '',
        description: '',
        app_link: '',
        image_url: '',
        reward_logo_url: '',
        credit_cost: 5,
        sort_order: offers.length + 2,
        type: 'data',
        network: 'mtn',
        denomination: '1GB',
        instructions: 'Enter your phone number in the portal to receive instant top-up.',
        is_active: true,
      });
      await loadData();
      setActiveTab('manage');
    } catch (err: any) {
      toast.error(err.message || 'Error creating redeem offer');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (offer: RedeemOffer) => {
    setEditingOffer({ ...offer });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOffer) return;
    if (!editingOffer.title.trim() || !editingOffer.app_link.trim()) {
      toast.error('Title and redemption link are required');
      return;
    }

    setSavingEdit(true);
    try {
      await updateRedeemOffer(editingOffer.id, {
        title: editingOffer.title.trim(),
        description: editingOffer.description.trim(),
        app_link: editingOffer.app_link.trim(),
        image_url: editingOffer.image_url?.trim() || undefined,
        reward_logo_url: editingOffer.reward_logo_url?.trim() || undefined,
        credit_cost: Number(editingOffer.credit_cost) || 1,
        sort_order: Number(editingOffer.sort_order) || 1,
        type: editingOffer.type,
        network: editingOffer.network,
        denomination: editingOffer.denomination,
        instructions: editingOffer.instructions,
        is_active: editingOffer.is_active,
      });

      toast.success('Offer updated successfully!');
      setIsEditOpen(false);
      setEditingOffer(null);
      await loadData();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (offer: RedeemOffer) => {
    if (!window.confirm(`Are you sure you want to delete "${offer.title}"?`)) return;
    try {
      await deleteRedeemOffer(offer.id);
      toast.success('Offer deleted');
      await loadData();
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // Instant 1-click active/inactive toggle
  const handleToggleOfferActive = async (offer: RedeemOffer) => {
    const nextState = !offer.is_active;
    // Optimistic UI update
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: nextState } : o));

    try {
      await toggleOfferActive(offer.id, nextState);
      toast.success(nextState ? `✅ "${offer.title}" activated` : `⏸️ "${offer.title}" deactivated`);
    } catch (err) {
      toast.error('Failed to update offer status');
      await loadData();
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Reset/load default high-volume airtime & data offers?')) return;
    setLoading(true);
    try {
      await seedDefaultRedeemOffers();
      toast.success('Default offers seeded successfully!');
      await loadData();
    } catch (err: any) {
      toast.error('Seed failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reward Logo Upload Handler
  const handleUploadRewardLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const publicUrl = await uploadRewardImage(file);
      await setGlobalRewardLogo(publicUrl);
      setGlobalRewardLogoState(publicUrl);
      toast.success('🎨 GGD Reward Logo uploaded and saved successfully!');
    } catch (err: any) {
      toast.error('Failed to upload reward logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleResetRewardLogo = async () => {
    try {
      await setGlobalRewardLogo('');
      setGlobalRewardLogoState(null);
      toast.success('Reward logo reset to default official GGD crest');
    } catch (err) {
      toast.error('Failed to reset logo');
    }
  };

  // Filtered offers
  const filteredOffers = offers.filter(o => {
    const matchesSearch = 
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.denomination && o.denomination.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.network.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || o.type === filterType;
    const matchesNetwork = filterNetwork === 'all' || o.network === filterNetwork;
    const matchesStatus = 
      filterStatus === 'all' 
        ? true 
        : filterStatus === 'active' 
          ? o.is_active 
          : !o.is_active;

    return matchesSearch && matchesType && matchesNetwork && matchesStatus;
  });

  const activeCount = offers.filter(o => o.is_active).length;
  const inactiveCount = offers.filter(o => !o.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Master Feature Toggle & Stats */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-zinc-900 to-neutral-900 text-white p-5 sm:p-7 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 shadow-sm">
                Admin Marketplace Control
              </Badge>
              <GGDRewardBrandBadge customLogoUrl={globalRewardLogo} size="sm" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
              <Smartphone className="h-6 w-6 text-orange-400" />
              Airtime & Data Redeem Marketplace
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mt-1 leading-relaxed">
              Create, activate/deactivate, and manage redeemable airtime and mobile data offers. Users spend their task credits to unlock your redemption tools and links.
            </p>
          </div>

          {/* Master Feature Toggle Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shrink-0 flex flex-col gap-2 min-w-[260px] shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isFeatureEnabled ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                )}
                <span className="text-xs font-black text-white">
                  Redeem Feature Status
                </span>
              </div>
              <Switch
                checked={isFeatureEnabled}
                onCheckedChange={handleToggleMasterFeature}
                disabled={togglingMaster}
              />
            </div>

            <p className="text-[11px] text-zinc-300">
              {isFeatureEnabled ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Visible to users across platform
                </span>
              ) : (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <PowerOff className="h-3 w-3" /> Currently switched off & paused
                </span>
              )}
            </p>
            <p className="text-[10px] text-zinc-400">
              When switched off, the feature toggle hides the menu links and pauses user redemptions.
            </p>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-zinc-400">Total Offers</p>
            <p className="text-xl font-black text-white mt-0.5">{offers.length}</p>
            <span className="text-[10px] text-zinc-400">{activeCount} active · {inactiveCount} paused</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-zinc-400">Total Redemptions</p>
            <p className="text-xl font-black text-orange-400 mt-0.5">{redemptions.length}</p>
            <span className="text-[10px] text-zinc-400">Users who unlocked links</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-zinc-400">Networks Supported</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">4 Telcos</p>
            <span className="text-[10px] text-zinc-400">MTN · Airtel · Glo · 9mobile</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[10px] uppercase font-bold text-zinc-400">Credits Deducted</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {redemptions.reduce((acc, r) => acc + (r.creditCost || 0), 0)} cr
            </p>
            <span className="text-[10px] text-zinc-400">Spent from user balances</span>
          </div>
        </div>
      </div>

      {/* Feature Disabled Notice Banner (if switched off) */}
      {!isFeatureEnabled && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black text-amber-900 dark:text-amber-200">
              Redemption Feature Is Currently Disabled in Feature Toggles
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Users cannot browse or redeem airtime & data packages right now. Use the toggle switch above or go to the <strong>Feature Toggles</strong> module to turn it back on at any time.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            variant={activeTab === 'manage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('manage')}
            className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Manage Offers ({offers.length})</span>
          </Button>

          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('create')}
            className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Offer</span>
          </Button>

          <Button
            variant={activeTab === 'branding' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('branding')}
            className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 ${
              activeTab === 'branding'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Reward Branding & Logo</span>
          </Button>

          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('logs')}
            className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Redemptions Log ({redemptions.length})</span>
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-9 px-3 rounded-xl text-xs font-semibold gap-1 text-muted-foreground"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* TAB 1: MANAGE OFFERS (Active/Inactive Toggle & Real Telecom Logos) */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="border border-border/80 shadow-xs">
            <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                <Input
                  placeholder="Search by title, network, or denomination..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">All Status ({offers.length})</option>
                  <option value="active">🟢 Active Only ({activeCount})</option>
                  <option value="inactive">⏸️ Paused / Inactive ({inactiveCount})</option>
                </select>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="airtime">📱 Airtime Only</option>
                  <option value="data">🌐 Data Only</option>
                </select>

                {/* Network Filter */}
                <select
                  value={filterNetwork}
                  onChange={e => setFilterNetwork(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">All Networks</option>
                  <option value="mtn">MTN Nigeria</option>
                  <option value="airtel">Airtel Nigeria</option>
                  <option value="glo">Glo (Globacom)</option>
                  <option value="9mobile">9mobile</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaults}
                  className="h-10 text-xs font-semibold rounded-xl text-muted-foreground whitespace-nowrap"
                  title="Reset to default airtime & data packages"
                >
                  Reset Defaults
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Listings Grid */}
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-muted-foreground">Loading marketplace listings...</p>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center p-12 bg-card rounded-2xl border border-border shadow-xs">
              <Smartphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-black text-foreground">No Redeem Offers Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || filterType !== 'all' || filterNetwork !== 'all' || filterStatus !== 'all'
                  ? 'No offers match your search filters.'
                  : 'Get started by creating your first airtime or data redeem offer.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('create')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add First Offer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSeedDefaults}
                  className="font-bold text-xs h-9 rounded-xl"
                >
                  Load 6 Default Offers
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map(offer => {
                const theme = NETWORK_THEMES[offer.network] || NETWORK_THEMES.all;
                return (
                  <Card 
                    key={offer.id} 
                    className={`border transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-md ${
                      offer.is_active 
                        ? 'border-border/80 bg-card' 
                        : 'border-dashed border-border/80 bg-muted/20 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Card Header with Real Telecom Logo & GGD Reward Badge */}
                      <div className="p-4 pb-3 flex items-start justify-between gap-2 border-b border-border/40 bg-muted/15">
                        <div className="flex items-center gap-2.5">
                          {/* Real Authentic Telecom Logo */}
                          <NetworkLogo network={offer.network} size="md" />

                          <div className="flex flex-col">
                            <span className="text-xs font-black tracking-tight text-foreground">
                              {theme.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                offer.type === 'airtime' 
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' 
                                  : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                              }`}>
                                {offer.type === 'airtime' ? 'Airtime' : 'Data'}
                              </span>
                              <GGDRewardBrandBadge 
                                customLogoUrl={offer.reward_logo_url || globalRewardLogo} 
                                size="sm" 
                                showText={false} 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-xs font-black gap-1">
                            <Coins className="h-3 w-3 text-orange-500" />
                            {offer.credit_cost} Credits
                          </Badge>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-foreground line-clamp-1">
                              {offer.title}
                            </h4>
                            {offer.denomination && (
                              <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                                {offer.denomination}
                              </p>
                            )}
                          </div>

                          {/* Active / Inactive status badge */}
                          <Badge
                            className={`text-[9px] font-black uppercase shrink-0 ${
                              offer.is_active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                            }`}
                          >
                            {offer.is_active ? 'ACTIVE' : 'PAUSED'}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {offer.description}
                        </p>

                        {/* Unlocked Link Box */}
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3 text-orange-500" />
                              Redemption Tool Link
                            </span>
                            <a
                              href={offer.app_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 hover:underline flex items-center gap-0.5"
                            >
                              <span>Test Link</span>
                              <ArrowUpRight className="h-2.5 w-2.5" />
                            </a>
                          </div>
                          <p className="text-[11px] font-mono text-foreground truncate select-all">
                            {offer.app_link}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: 1-Click Activate/Deactivate Switch + Edit/Delete */}
                    <div className="p-3 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2">
                      {/* Active Toggle Switch */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => handleToggleOfferActive(offer)}
                        />
                        <span className={`text-[11px] font-bold ${
                          offer.is_active 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-muted-foreground'
                        }`}>
                          {offer.is_active ? 'Offer Active' : 'Deactivated'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(offer)}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                          title="Edit Offer"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(offer)}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/10 text-red-600"
                          title="Delete Offer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CREATE OFFER */}
      {activeTab === 'create' && (
        <Card className="border border-border/80 shadow-xs max-w-3xl mx-auto">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Plus className="h-4 w-4 text-orange-500" />
              Create Airtime or Data Redeem Offer
            </CardTitle>
            <CardDescription className="text-xs">
              Add a new package for users to redeem with their task credit wallet. Unlocks the redemption link upon confirmation.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Type and Network Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Category *</Label>
                  <select
                    value={newOffer.type}
                    onChange={e => setNewOffer(p => ({ ...p, type: e.target.value as RedeemType }))}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                  >
                    <option value="data">🌐 Mobile Data Top-Up</option>
                    <option value="airtime">📱 Mobile Airtime Recharge</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Telecom Network *</Label>
                  <div className="flex items-center gap-2">
                    <select
                      value={newOffer.network}
                      onChange={e => setNewOffer(p => ({ ...p, network: e.target.value as NetworkProvider }))}
                      className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="mtn">MTN Nigeria</option>
                      <option value="airtel">Airtel Nigeria</option>
                      <option value="glo">Glo (Globacom)</option>
                      <option value="9mobile">9mobile</option>
                      <option value="all">Multi-Network / All</option>
                    </select>
                    {/* Live Preview of Real Telecom Logo */}
                    <NetworkLogo network={newOffer.network} size="md" />
                  </div>
                </div>
              </div>

              {/* Title & Denomination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold">Offer Title *</Label>
                  <Input
                    placeholder="e.g. MTN 1GB SME Direct Data or Airtel ₦1,000 Airtime"
                    value={newOffer.title}
                    onChange={e => setNewOffer(p => ({ ...p, title: e.target.value }))}
                    className="text-xs sm:text-sm h-10 rounded-xl font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Denomination Badge</Label>
                  <Input
                    placeholder="e.g. 1GB or ₦1,000"
                    value={newOffer.denomination}
                    onChange={e => setNewOffer(p => ({ ...p, denomination: e.target.value }))}
                    className="text-xs sm:text-sm h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Credit Cost, Sort Order & Active Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Credit Cost *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newOffer.credit_cost}
                    onChange={e => setNewOffer(p => ({ ...p, credit_cost: Number(e.target.value) || 1 }))}
                    className="text-xs sm:text-sm h-10 rounded-xl font-bold text-orange-600 dark:text-orange-400"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">Credits deducted from user balance</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Sort Order</Label>
                  <Input
                    type="number"
                    value={newOffer.sort_order}
                    onChange={e => setNewOffer(p => ({ ...p, sort_order: Number(e.target.value) || 1 }))}
                    className="text-xs sm:text-sm h-10 rounded-xl"
                  />
                </div>

                {/* Instant Activate / Deactivate Switch */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Initial Status</Label>
                    <p className="text-[10px] text-muted-foreground">
                      {newOffer.is_active ? 'Active on publish' : 'Save as paused/draft'}
                    </p>
                  </div>
                  <Switch
                    checked={newOffer.is_active}
                    onCheckedChange={checked => setNewOffer(p => ({ ...p, is_active: checked }))}
                  />
                </div>
              </div>

              {/* CRITICAL: Redemption Tool Link */}
              <div className="space-y-1.5 p-4 rounded-xl border-2 border-orange-500/30 bg-orange-500/5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-orange-500" />
                    <span>Redemption Link / Tool Access URL *</span>
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30 font-bold">
                    Unlocked Only After Redemption
                  </Badge>
                </div>
                <Input
                  type="url"
                  placeholder="https://topup.mtn.ng or your custom claim tool URL"
                  value={newOffer.app_link}
                  onChange={e => setNewOffer(p => ({ ...p, app_link: e.target.value }))}
                  className="font-semibold text-xs sm:text-sm h-10 rounded-xl bg-background border-orange-500/40"
                  required
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter the exact URL, top-up portal, or voucher claim page. 
                  Users who have <strong>not redeemed</strong> this offer cannot see or access this link.
                </p>
              </div>

              {/* Description & Claim Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Description / Package Details</Label>
                  <Textarea
                    placeholder="e.g. Instant 30-day data top-up valid for all MTN SIMs. High-speed 4G/5G."
                    value={newOffer.description}
                    onChange={e => setNewOffer(p => ({ ...p, description: e.target.value }))}
                    className="text-xs resize-none h-20 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Claim Instructions for User</Label>
                  <Textarea
                    placeholder="e.g. Once unlocked, click open to enter your mobile number and recharge instantly."
                    value={newOffer.instructions}
                    onChange={e => setNewOffer(p => ({ ...p, instructions: e.target.value }))}
                    className="text-xs resize-none h-20 rounded-xl"
                  />
                </div>
              </div>

              {/* Custom Image or Custom Reward Logo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Custom Reward Logo or Thumbnail URL (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://... (Leave empty to use official network logo + GGD branding)"
                    value={newOffer.reward_logo_url}
                    onChange={e => setNewOffer(p => ({ ...p, reward_logo_url: e.target.value }))}
                    className="text-xs h-10 rounded-xl flex-1"
                  />
                  <input
                    type="file"
                    ref={offerImgFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingOfferImg(true);
                      try {
                        const url = await uploadRewardImage(file);
                        setNewOffer(p => ({ ...p, reward_logo_url: url }));
                        toast.success('Thumbnail uploaded!');
                      } catch {
                        toast.error('Upload failed');
                      } finally {
                        setUploadingOfferImg(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => offerImgFileInputRef.current?.click()}
                    disabled={uploadingOfferImg}
                    className="h-10 text-xs font-semibold rounded-xl gap-1"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload</span>
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('manage')}
                  className="h-10 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-md gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create & Publish Offer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: REWARD BRANDING & LOGO UPLOAD (Admin can upload reward logo) */}
      {activeTab === 'branding' && (
        <Card className="border border-border/80 shadow-xs max-w-3xl mx-auto">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Palette className="h-4 w-4 text-orange-500" />
              GGD Reward Branding & Custom Logo Manager
            </CardTitle>
            <CardDescription className="text-xs">
              Upload your official reward badge logo to be stamped across every airtime & data reward voucher on the platform.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Live Voucher Preview Card */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Live Voucher Branding Preview</Label>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-neutral-900 border border-white/10 text-white shadow-md flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <NetworkLogo network="mtn" size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400">MTN Nigeria</span>
                      <GGDRewardBrandBadge customLogoUrl={globalRewardLogo} size="sm" />
                    </div>
                    <p className="text-sm font-black text-white mt-0.5">1GB Direct SME High-Speed Data</p>
                    <p className="text-[11px] text-zinc-400">GGD Verified Reward Voucher</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Badge className="bg-orange-500 text-white font-black text-xs">
                    5 Credits
                  </Badge>
                </div>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/70 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-foreground">Upload Platform Reward Logo</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports PNG, JPG, SVG, WebP with transparent background recommended.
                  </p>
                </div>

                {globalRewardLogo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetRewardLogo}
                    className="text-xs font-bold text-red-600 rounded-xl"
                  >
                    Reset to Default GGD Logo
                  </Button>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={logoFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleUploadRewardLogo}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="h-11 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white shadow-sm gap-2"
                >
                  {uploadingLogo ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading Logo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Logo from Device
                    </>
                  )}
                </Button>

                {/* Direct URL input */}
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Or paste image URL..."
                    value={globalRewardLogo || ''}
                    onChange={e => setGlobalRewardLogoState(e.target.value)}
                    className="h-11 text-xs rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!globalRewardLogo) return;
                      await setGlobalRewardLogo(globalRewardLogo);
                      toast.success('Reward Logo URL saved!');
                    }}
                    className="h-11 text-xs font-bold rounded-xl"
                  >
                    Save URL
                  </Button>
                </div>
              </div>

              {/* Presets */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-muted-foreground block mb-2">QUICK PRESETS:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetRewardLogo}
                    className="text-xs font-semibold rounded-xl h-8 gap-1.5"
                  >
                    <img src={ggdLogo} alt="GGD" className="h-4 w-4 object-contain rounded-full" />
                    <span>Official GGD Brand Crest</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: REDEMPTIONS AUDIT LOG */}
      {activeTab === 'logs' && (
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  All Platform Redemptions Audit Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical log of every airtime and data package redeemed by platform users using their credit wallet.
                </CardDescription>
              </div>
              <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-xs font-bold">
                {redemptions.length} Completed Transactions
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {redemptions.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="h-9 w-9 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">No User Redemptions Yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When users redeem airtime or data packages in the marketplace, their records appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-bold">
                      <th className="p-3 pl-4">Date / Time</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Offer Redeemed</th>
                      <th className="p-3">Network</th>
                      <th className="p-3">Credits Deducted</th>
                      <th className="p-3 pr-4 text-right">Unlocked Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map(r => (
                      <tr key={r.id} className="border-b border-border/40 hover:bg-muted/15 transition-colors">
                        <td className="p-3 pl-4 text-muted-foreground whitespace-nowrap">
                          {new Date(r.redeemedAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {r.userEmail || r.userId.slice(0, 8)}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          {r.offerTitle}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <NetworkLogo network={r.network} size="sm" />
                            <span className="uppercase font-bold">{r.network}</span>
                          </div>
                        </td>
                        <td className="p-3 font-black text-orange-600 dark:text-orange-400">
                          {r.creditCost} cr
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <a
                            href={r.appLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 hover:underline font-semibold"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* EDIT OFFER MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-orange-500" />
              Edit Redeem Offer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify offer pricing, status, network, and redemption links.
            </DialogDescription>
          </DialogHeader>

          {editingOffer && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Category</Label>
                  <select
                    value={editingOffer.type}
                    onChange={e => setEditingOffer(p => p ? ({ ...p, type: e.target.value as RedeemType }) : null)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold"
                  >
                    <option value="data">Data Bundle</option>
                    <option value="airtime">Airtime Voucher</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Telecom Network</Label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editingOffer.network}
                      onChange={e => setEditingOffer(p => p ? ({ ...p, network: e.target.value as NetworkProvider }) : null)}
                      className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold"
                    >
                      <option value="mtn">MTN Nigeria</option>
                      <option value="airtel">Airtel Nigeria</option>
                      <option value="glo">Glo (Globacom)</option>
                      <option value="9mobile">9mobile</option>
                      <option value="all">Multi-Network</option>
                    </select>
                    <NetworkLogo network={editingOffer.network} size="sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Title *</Label>
                <Input
                  value={editingOffer.title}
                  onChange={e => setEditingOffer(p => p ? ({ ...p, title: e.target.value }) : null)}
                  className="text-xs h-9 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Denomination</Label>
                  <Input
                    value={editingOffer.denomination || ''}
                    onChange={e => setEditingOffer(p => p ? ({ ...p, denomination: e.target.value }) : null)}
                    className="text-xs h-9 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Credit Cost *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingOffer.credit_cost}
                    onChange={e => setEditingOffer(p => p ? ({ ...p, credit_cost: Number(e.target.value) || 1 }) : null)}
                    className="text-xs h-9 rounded-xl font-bold text-orange-600"
                  />
                </div>
              </div>

              {/* Status Switch inside Edit Modal */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Listing Active</Label>
                  <p className="text-[10px] text-muted-foreground">
                    {editingOffer.is_active ? 'Active and visible in marketplace' : 'Paused / Hidden from regular users'}
                  </p>
                </div>
                <Switch
                  checked={editingOffer.is_active}
                  onCheckedChange={checked => setEditingOffer(p => p ? ({ ...p, is_active: checked }) : null)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-orange-600">Redemption Tool / Claim URL *</Label>
                <Input
                  type="url"
                  value={editingOffer.app_link}
                  onChange={e => setEditingOffer(p => p ? ({ ...p, app_link: e.target.value }) : null)}
                  className="text-xs h-9 rounded-xl border-orange-500/40"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  value={editingOffer.description}
                  onChange={e => setEditingOffer(p => p ? ({ ...p, description: e.target.value }) : null)}
                  className="text-xs h-16 rounded-xl resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Instructions for User</Label>
                <Textarea
                  value={editingOffer.instructions || ''}
                  onChange={e => setEditingOffer(p => p ? ({ ...p, instructions: e.target.value }) : null)}
                  className="text-xs h-16 rounded-xl resize-none"
                />
              </div>

              {/* Custom Offer Image/Logo URL */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Custom Reward Logo or Thumbnail URL (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingOffer.reward_logo_url || ''}
                    onChange={e => setEditingOffer(p => p ? ({ ...p, reward_logo_url: e.target.value }) : null)}
                    placeholder="https://..."
                    className="text-xs h-9 rounded-xl flex-1"
                  />
                  <input
                    type="file"
                    ref={editImgFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadRewardImage(file);
                        setEditingOffer(p => p ? ({ ...p, reward_logo_url: url }) : null);
                        toast.success('Thumbnail uploaded!');
                      } catch {
                        toast.error('Upload failed');
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editImgFileInputRef.current?.click()}
                    className="h-9 text-xs font-semibold rounded-xl gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Upload</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
              className="text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRedeemManager;
