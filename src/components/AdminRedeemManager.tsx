import React, { useState, useEffect } from 'react';
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
  Layers, Lock, Eye, Check, AlertCircle, ArrowUpRight
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
  getAllPlatformRedemptions,
  UserRedemptionRecord,
  seedDefaultRedeemOffers
} from "@/services/redeemMarketplaceService";
import { supabase } from "@/integrations/supabase/client";

export const AdminRedeemManager: React.FC = () => {
  const [offers, setOffers] = useState<RedeemOffer[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'logs'>('manage');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for creating new offer
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    app_link: '',
    image_url: '',
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
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersList, logsList] = await Promise.all([
        getRedeemOffers(),
        getAllPlatformRedemptions(),
      ]);
      setOffers(offersList);
      setRedemptions(logsList);
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

  const handleToggleActive = async (offer: RedeemOffer) => {
    try {
      await updateRedeemOffer(offer.id, { is_active: !offer.is_active });
      toast.success(offer.is_active ? 'Offer deactivated' : 'Offer activated');
      await loadData();
    } catch (err: any) {
      toast.error('Status update failed');
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

  // Filtered offers
  const filteredOffers = offers.filter(o => {
    const matchesSearch = 
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.denomination && o.denomination.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.network.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || o.type === filterType;
    const matchesNetwork = filterNetwork === 'all' || o.network === filterNetwork;

    return matchesSearch && matchesType && matchesNetwork;
  });

  // Stats calculation
  const totalOffers = offers.length;
  const airtimeCount = offers.filter(o => o.type === 'airtime').length;
  const dataCount = offers.filter(o => o.type === 'data').length;
  const totalRedemptionsCount = redemptions.length;
  const totalCreditsRedeemed = redemptions.reduce((acc, r) => acc + (r.creditCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 sm:p-7 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-bold gap-1.5 px-2.5 py-0.5">
                <Sparkles className="h-3 w-3" />
                Credit Wallet Marketplace
              </Badge>
              <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs font-semibold">
                Admin Manager
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              Airtime & Data Redeem Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl mt-1">
              Create and manage data bundles and airtime packages that users purchase with their earned wallet credits. Configure the direct claim link or tool URL that immediately unlocks upon redemption.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-9 font-semibold gap-1.5 rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('create')}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs h-9 font-bold gap-1.5 rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4" />
              New Redeem Offer
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] text-zinc-400 font-medium">Total Listings</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalOffers}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {airtimeCount} Airtime • {dataCount} Data
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] text-amber-300/80 font-medium">Total Redemptions</p>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{totalRedemptionsCount}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Unlocked user items</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-[11px] text-orange-300/80 font-medium">Credits Redeemed</p>
            <p className="text-xl sm:text-2xl font-black text-orange-400 mt-0.5">{totalCreditsRedeemed.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Debited from wallets</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
            <p className="text-[11px] text-emerald-300/80 font-medium">Database Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">Connected & Synced</span>
            </div>
            <button
              onClick={handleSeedDefaults}
              className="text-[10px] text-zinc-400 hover:text-white underline text-left mt-1"
            >
              Reload Default Packages
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'manage' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('manage')}
          className={`h-9 rounded-xl font-bold text-xs gap-1.5 ${
            activeTab === 'manage' 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
              : 'text-muted-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Manage Listings ({offers.length})</span>
        </Button>
        <Button
          variant={activeTab === 'create' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('create')}
          className={`h-9 rounded-xl font-bold text-xs gap-1.5 ${
            activeTab === 'create' 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
              : 'text-muted-foreground'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Create New Listing</span>
        </Button>
        <Button
          variant={activeTab === 'logs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('logs')}
          className={`h-9 rounded-xl font-bold text-xs gap-1.5 ${
            activeTab === 'logs' 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' 
              : 'text-muted-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>User Redemptions Audit ({redemptions.length})</span>
        </Button>
      </div>

      {/* TAB 1: CREATE NEW OFFER */}
      {activeTab === 'create' && (
        <Card className="border border-border/80 shadow-md">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Create Airtime or Data Redeem Offer
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Follow the marketing app creation flow. This listing is connected to the database but will strictly appear in the Airtime & Data Redeem marketplace.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-orange-500/30 text-orange-600">
                Wallet Credit Gated
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Category & Network selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Category Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewOffer(p => ({
                          ...p, 
                          type: 'data',
                          denomination: '1GB',
                          title: p.title ? p.title.replace('Airtime', 'Data') : 'MTN 1GB SME Data',
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all ${
                        newOffer.type === 'data'
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Wifi className="h-4 w-4 text-indigo-500" />
                      <span>Data Bundle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewOffer(p => ({
                          ...p, 
                          type: 'airtime',
                          denomination: '₦500',
                          title: p.title ? p.title.replace('Data', 'Airtime') : 'MTN ₦500 Airtime Recharge',
                        }));
                      }}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all ${
                        newOffer.type === 'airtime'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                          : 'border-border hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <Smartphone className="h-4 w-4 text-amber-500" />
                      <span>Airtime Recharge</span>
                    </button>
                  </div>
                </div>

                {/* Network Provider */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Telecom Network *</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['mtn', 'airtel', 'glo', '9mobile'] as NetworkProvider[]).map((net) => {
                      const theme = NETWORK_THEMES[net];
                      const isSelected = newOffer.network === net;
                      return (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setNewOffer(p => ({ ...p, network: net }))}
                          className={`p-2 rounded-xl border text-center text-xs font-black transition-all capitalize ${
                            isSelected
                              ? `${theme.badgeBg} border-current ring-2 ring-current/20 shadow-xs font-black`
                              : 'border-border hover:bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {net}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Title & Denomination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold">Offer Title *</Label>
                  <Input
                    placeholder="e.g. MTN 1GB 30-Day SME Data or Airtel ₦1,000 Airtime"
                    value={newOffer.title}
                    onChange={e => setNewOffer(p => ({ ...p, title: e.target.value }))}
                    className="font-medium text-xs sm:text-sm h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Value / Denomination *</Label>
                  <Input
                    placeholder="e.g. 1GB, 2.5GB, ₦500, ₦1,000"
                    value={newOffer.denomination}
                    onChange={e => setNewOffer(p => ({ ...p, denomination: e.target.value }))}
                    className="font-medium text-xs sm:text-sm h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Credit Cost & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    <span>Price in Wallet Credits *</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Debited on redeem</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={newOffer.credit_cost}
                      onChange={e => setNewOffer(p => ({ ...p, credit_cost: Number(e.target.value) || 0 }))}
                      className="font-bold text-xs sm:text-sm h-10 rounded-xl pl-8"
                      required
                    />
                    <Coins className="h-4 w-4 text-orange-500 absolute left-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Display Sort Order</Label>
                  <Input
                    type="number"
                    value={newOffer.sort_order}
                    onChange={e => setNewOffer(p => ({ ...p, sort_order: Number(e.target.value) || 1 }))}
                    className="text-xs sm:text-sm h-10 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Listing Active</Label>
                    <p className="text-[10px] text-muted-foreground">Visible in marketplace</p>
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
                  placeholder="https://topup.mtn.ng or https://wa.me/... or your custom claim tool URL"
                  value={newOffer.app_link}
                  onChange={e => setNewOffer(p => ({ ...p, app_link: e.target.value }))}
                  className="font-semibold text-xs sm:text-sm h-10 rounded-xl bg-background border-orange-500/40"
                  required
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter the exact URL, tool link, WhatsApp redemption portal, or voucher claim page. 
                  Users who have <strong>not redeemed</strong> this offer cannot see or access this link. Once they spend their credit balance to redeem, this link is immediately unlocked for them!
                </p>
              </div>

              {/* Description & Delivery instructions */}
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

              {/* Optional Custom Image URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Custom Image / Banner URL (Optional)</Label>
                <Input
                  placeholder="https://... (Leave empty to use official network branded card)"
                  value={newOffer.image_url}
                  onChange={e => setNewOffer(p => ({ ...p, image_url: e.target.value }))}
                  className="text-xs h-10 rounded-xl"
                />
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
                      Saving to Database...
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

      {/* TAB 2: MANAGE OFFERS */}
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

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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
                  <option value="mtn">MTN</option>
                  <option value="airtel">Airtel</option>
                  <option value="glo">Glo</option>
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
                {searchQuery || filterType !== 'all' || filterNetwork !== 'all'
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
                      offer.is_active ? 'border-border/80' : 'border-dashed border-border opacity-70 bg-muted/20'
                    }`}
                  >
                    <div>
                      {/* Card Header with Network & Type */}
                      <div className="p-4 pb-3 flex items-start justify-between gap-2 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wide border ${theme.badgeBg}`}>
                            {theme.name.split(' ')[0]}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            offer.type === 'airtime' 
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' 
                              : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          }`}>
                            {offer.type === 'airtime' ? 'Airtime' : 'Data'}
                          </span>
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
                        <div>
                          <h4 className="font-black text-sm text-foreground line-clamp-1">
                            {offer.title}
                          </h4>
                          {offer.denomination && (
                            <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                              {offer.denomination}
                            </p>
                          )}
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

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-muted/30 border-t border-border/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => handleToggleActive(offer)}
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {offer.is_active ? 'Active' : 'Paused'}
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

      {/* TAB 3: PLATFORM USER REDEMPTIONS AUDIT LOG */}
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
                      <th className="p-3">Credits Spent</th>
                      <th className="p-3">Redemption Link</th>
                      <th className="p-3 pr-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {redemptions.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 pl-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(item.redeemedAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {item.userEmail || item.userId.substring(0, 8) + '...'}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          {item.offerTitle}
                        </td>
                        <td className="p-3">
                          <span className="capitalize font-bold text-[11px] px-2 py-0.5 rounded-md bg-muted">
                            {item.network}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-orange-600 dark:text-orange-400">
                            {item.creditCost} Credits
                          </span>
                        </td>
                        <td className="p-3 max-w-[200px]">
                          <a
                            href={item.appLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:underline flex items-center gap-1 font-mono text-[11px] truncate"
                          >
                            <span className="truncate">{item.appLink}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </a>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <Check className="h-2.5 w-2.5" /> Unlocked
                          </span>
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

      {/* EDIT OFFER DIALOG MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-orange-500" />
              Edit Redeem Offer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update offer details, credit cost, and the secret redemption URL.
            </DialogDescription>
          </DialogHeader>

          {editingOffer && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Category</Label>
                  <select
                    value={editingOffer.type}
                    onChange={e => setEditingOffer({ ...editingOffer, type: e.target.value as RedeemType })}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold"
                  >
                    <option value="data">Data Bundle</option>
                    <option value="airtime">Airtime Recharge</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Network</Label>
                  <select
                    value={editingOffer.network}
                    onChange={e => setEditingOffer({ ...editingOffer, network: e.target.value as NetworkProvider })}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold capitalize"
                  >
                    <option value="mtn">MTN</option>
                    <option value="airtel">Airtel</option>
                    <option value="glo">Glo</option>
                    <option value="9mobile">9mobile</option>
                    <option value="all">Multi-Network</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Offer Title *</Label>
                <Input
                  value={editingOffer.title}
                  onChange={e => setEditingOffer({ ...editingOffer, title: e.target.value })}
                  className="text-xs font-medium h-10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Denomination / Value</Label>
                  <Input
                    value={editingOffer.denomination || ''}
                    onChange={e => setEditingOffer({ ...editingOffer, denomination: e.target.value })}
                    className="text-xs font-medium h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Price in Credits *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingOffer.credit_cost}
                    onChange={e => setEditingOffer({ ...editingOffer, credit_cost: Number(e.target.value) || 1 })}
                    className="text-xs font-bold h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-xl border border-orange-500/30 bg-orange-500/5">
                <Label className="text-xs font-black flex items-center gap-1.5 text-foreground">
                  <Lock className="h-3 w-3 text-orange-500" />
                  Redemption Link / Tool URL *
                </Label>
                <Input
                  type="url"
                  value={editingOffer.app_link}
                  onChange={e => setEditingOffer({ ...editingOffer, app_link: e.target.value })}
                  className="text-xs font-medium h-10 rounded-xl bg-background"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  This link is unlocked and visible to users once they redeem using their credit wallet.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  value={editingOffer.description}
                  onChange={e => setEditingOffer({ ...editingOffer, description: e.target.value })}
                  className="text-xs resize-none h-16 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Instructions</Label>
                <Textarea
                  value={editingOffer.instructions || ''}
                  onChange={e => setEditingOffer({ ...editingOffer, instructions: e.target.value })}
                  className="text-xs resize-none h-16 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                <span className="text-xs font-bold">Offer Active Status</span>
                <Switch
                  checked={editingOffer.is_active}
                  onCheckedChange={checked => setEditingOffer({ ...editingOffer, is_active: checked })}
                />
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
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl"
            >
              {savingEdit ? 'Saving...' : 'Update Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRedeemManager;
