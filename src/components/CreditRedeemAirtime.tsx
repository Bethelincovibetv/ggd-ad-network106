import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Smartphone, Wifi, Coins, Sparkles, ShieldCheck, ArrowRight, 
  ExternalLink, Copy, Check, Clock, Search, Lock, Unlock, 
  RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight, Flame, Store,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  RedeemOffer, 
  RedeemType, 
  NetworkProvider, 
  NETWORK_THEMES,
  getRedeemOffers, 
  getUserRedeemedOfferIds, 
  redeemOfferWithCredits,
  getUserRedemptionHistory,
  getGlobalRewardLogo,
  UserRedemptionRecord 
} from "@/services/redeemMarketplaceService";
import { NetworkLogo, GGDRewardBrandBadge } from "@/components/telecom/TelecomLogos";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { RedeemFallingAnimation } from "@/components/RedeemFallingAnimation";
import { playRedeemSound } from "@/utils/redeemSound";

interface CreditRedeemAirtimeProps {
  currentCredits?: number;
  onCreditsUpdated?: (newCredits: number) => void;
  onNavigate?: (tab: string) => void;
}

export const CreditRedeemAirtime: React.FC<CreditRedeemAirtimeProps> = ({
  currentCredits: propCredits,
  onCreditsUpdated,
  onNavigate,
}) => {
  const { isEnabled } = useFeatureToggles();
  const isRedeemEnabled = isEnabled('airtime_redeem');

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(propCredits ?? 0);
  const [offers, setOffers] = useState<RedeemOffer[]>([]);
  const [redeemedIds, setRedeemedIds] = useState<string[]>([]);
  const [userHistory, setUserHistory] = useState<UserRedemptionRecord[]>([]);
  const [globalRewardLogo, setGlobalRewardLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'store' | 'my-items'>('store');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmation modal state
  const [selectedOfferForRedeem, setSelectedOfferForRedeem] = useState<RedeemOffer | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [redeeming, setRedeeming] = useState<boolean>(false);

  // Success unlocked modal state
  const [unlockedOffer, setUnlockedOffer] = useState<{ offer: RedeemOffer; appLink: string } | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (propCredits !== undefined) {
      setCredits(propCredits);
    }
  }, [propCredits]);

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user || null;
      setUser(currentUser);

      const [offersList, { data: profile }, rewardLogo] = await Promise.all([
        getRedeemOffers(),
        currentUser 
          ? supabase.from('profiles').select('credits').eq('user_id', currentUser.id).maybeSingle()
          : Promise.resolve({ data: null }),
        getGlobalRewardLogo(),
      ]);

      // Only show active offers to regular users
      setOffers(offersList.filter(o => o.is_active));
      setGlobalRewardLogo(rewardLogo);

      if (profile && profile.credits !== undefined) {
        const c = Number(profile.credits) || 0;
        setCredits(c);
        if (onCreditsUpdated) onCreditsUpdated(c);
      }

      if (currentUser) {
        const [ids, history] = await Promise.all([
          getUserRedeemedOfferIds(currentUser.id),
          getUserRedemptionHistory(currentUser.id),
        ]);
        setRedeemedIds(ids);
        setUserHistory(history);
      }
    } catch (err) {
      console.error('Error fetching marketplace data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRedeem = (offer: RedeemOffer) => {
    if (!user) {
      toast.error('Please log in to redeem airtime & data packages.');
      return;
    }

    if (credits < offer.credit_cost) {
      toast.error(`Insufficient credits! You need ${offer.credit_cost} credits, but only have ${credits} credits.`);
      return;
    }

    setSelectedOfferForRedeem(offer);
    setIsConfirmOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!selectedOfferForRedeem || !user) return;

    setRedeeming(true);
    try {
      const res = await redeemOfferWithCredits(user.id, selectedOfferForRedeem);

      if (res.success) {
        // Update local state immediately
        const newCredits = res.remainingCredits;
        setCredits(newCredits);
        if (onCreditsUpdated) onCreditsUpdated(newCredits);

        setRedeemedIds(prev => Array.from(new Set([...prev, selectedOfferForRedeem.id])));

        // Add to history
        const newRecord: UserRedemptionRecord = {
          id: `red_${Date.now()}`,
          offerId: selectedOfferForRedeem.id,
          offerTitle: selectedOfferForRedeem.title,
          type: selectedOfferForRedeem.type,
          network: selectedOfferForRedeem.network,
          creditCost: selectedOfferForRedeem.credit_cost,
          appLink: res.appLink,
          redeemedAt: new Date().toISOString(),
          userId: user.id,
        };
        setUserHistory(prev => [newRecord, ...prev]);

        setIsConfirmOpen(false);
        setUnlockedOffer({ offer: selectedOfferForRedeem, appLink: res.appLink });
        setIsSuccessOpen(true);

        toast.success(`🎉 Successfully unlocked ${selectedOfferForRedeem.title}!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete redemption. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Redemption tool link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // If redemption feature is switched off from feature toggles by admin
  if (!isRedeemEnabled) {
    return (
      <div className="p-8 sm:p-12 text-center max-w-xl mx-auto my-6 bg-card rounded-3xl border border-border/80 shadow-md">
        <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-foreground">
          Airtime & Data Redemption Paused
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          The Airtime & Data Redeem Marketplace is currently paused by platform administration for scheduled maintenance or catalog restocking.
        </p>
        <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground text-left space-y-1.5">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Your Credits Are 100% Safe
          </p>
          <p>
            You currently have <span className="font-black text-orange-600 dark:text-orange-400">{credits.toLocaleString()} credits</span> in your account. You can continue earning credits via tasks and community activities.
          </p>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
          {onNavigate && (
            <Button
              onClick={() => onNavigate('tasks')}
              className="w-full sm:w-auto h-10 px-5 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white rounded-xl shadow-xs"
            >
              Earn More Credits
            </Button>
          )}
          {onNavigate && (
            <Button
              variant="outline"
              onClick={() => onNavigate('ads')}
              className="w-full sm:w-auto h-10 px-5 text-xs font-semibold rounded-xl"
            >
              Back to Home
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Filtered store offers
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.denomination && offer.denomination.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' || offer.type === filterType;
    const matchesNetwork = filterNetwork === 'all' || offer.network === filterNetwork;

    return matchesSearch && matchesType && matchesNetwork;
  });

  // Filtered redeemed items
  const redeemedOffersList = offers.filter(offer => redeemedIds.includes(offer.id));

  return (
    <div className="space-y-6">
      {/* Hero Header with Wallet Balance & GGD Reward Branding */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-zinc-900 to-neutral-900 text-white p-5 sm:p-7 border border-white/10 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Brand & Title */}
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <GGDRewardBrandBadge customLogoUrl={globalRewardLogo} size="md" />
              <Badge className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 shadow-sm">
                Instant Top-Up
              </Badge>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Airtime & Mobile Data Marketplace
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Use your earned wallet credits to redeem instant 30-day mobile data bundles and talktime airtime vouchers for MTN, Airtel, Glo, and 9mobile.
            </p>
          </div>

          {/* Credits Balance Card */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shrink-0 shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Coins className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Available Credits
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {credits.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-orange-400">Credits</span>
              </div>
            </div>

            <div className="ml-2 pl-2 border-l border-white/10 flex flex-col gap-1">
              {onNavigate && (
                <Button
                  size="sm"
                  onClick={() => onNavigate('tasks')}
                  className="h-7 text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 border border-white/10"
                >
                  Earn More
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMarketplaceData}
                disabled={loading}
                className="h-7 w-7 p-0 bg-white/5 border-white/15 hover:bg-white/10 text-white rounded-lg mx-auto"
                title="Refresh credits"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-orange-500/10 grid place-items-center text-orange-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Instant Link Unlocked</p>
              <p className="text-[10px] text-zinc-400">Immediate access upon redeem</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 grid place-items-center text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Zero Naira Cost</p>
              <p className="text-[10px] text-zinc-400">Pay with task credits</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">GGD Verified Voucher</p>
              <p className="text-[10px] text-zinc-400">Authentic telco portals</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 grid place-items-center text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Saved in Account</p>
              <p className="text-[10px] text-zinc-400">Always accessible</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Main Tabs */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'store' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('store')}
            className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 transition-all ${
              activeTab === 'store'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Browse Offers ({offers.length})</span>
          </Button>

          <Button
            variant={activeTab === 'my-items' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('my-items')}
            className={`h-9 px-4 rounded-xl font-bold text-xs gap-1.5 transition-all ${
              activeTab === 'my-items'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Unlock className="h-4 w-4" />
            <span>My Redeemed Offers ({redeemedIds.length})</span>
          </Button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
            <Input
              placeholder="Search data or airtime..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-9 rounded-xl text-xs"
            />
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
          </select>
        </div>
      </div>

      {/* Network Filter Pills with Authentic Telecom Logos (When on store tab) */}
      {activeTab === 'store' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterNetwork('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterNetwork === 'all'
                ? 'bg-foreground text-background shadow-xs font-black'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>All Networks ({offers.length})</span>
          </button>
          {(['mtn', 'airtel', 'glo', '9mobile'] as NetworkProvider[]).map((net) => {
            const count = offers.filter(o => o.network === net).length;
            const theme = NETWORK_THEMES[net];
            const isSelected = filterNetwork === net;
            return (
              <button
                key={net}
                onClick={() => setFilterNetwork(net)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all uppercase whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? `${theme.badgeBg} border shadow-xs font-black ring-1 ring-orange-500/30`
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                }`}
              >
                <NetworkLogo network={net} size="sm" />
                <span>{theme.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB 1: BROWSE OFFERS MARKETPLACE */}
      {activeTab === 'store' && (
        <>
          {loading ? (
            <div className="p-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-muted-foreground">Loading airtime & data packages...</p>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center p-12 bg-card rounded-2xl border border-border shadow-xs">
              <Smartphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-sm font-black text-foreground">No Offers Match Your Criteria</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Try clearing your search or switching to another telecom network.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterNetwork('all'); }}
                className="mt-3 text-xs font-bold rounded-xl"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map((offer) => {
                const theme = NETWORK_THEMES[offer.network] || NETWORK_THEMES.all;
                const isRedeemed = redeemedIds.includes(offer.id);
                const canAfford = credits >= offer.credit_cost;

                return (
                  <Card
                    key={offer.id}
                    className={`border transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-lg relative ${
                      isRedeemed
                        ? 'border-emerald-500/60 dark:border-emerald-500/40 bg-emerald-500/[0.02] ring-1 ring-emerald-500/20'
                        : theme.accentBorder
                    }`}
                  >
                    <div>
                      {/* Top Bar with Real Network Logo, GGD Reward Badge & Price */}
                      <div className="p-4 pb-3 flex items-start justify-between gap-2 border-b border-border/50 bg-muted/15">
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

                        {/* Price Badge */}
                        <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-xs font-black gap-1">
                          <Coins className="h-3 w-3 text-orange-500" />
                          {offer.credit_cost} Credits
                        </Badge>
                      </div>

                      {/* Content Area */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-black text-sm text-foreground line-clamp-1">
                            {offer.title}
                          </h3>
                          {offer.denomination && (
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                              {offer.denomination}
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {offer.description}
                        </p>

                        {/* Lock / Unlock State Display */}
                        {isRedeemed ? (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Unlocked & Ready to Claim
                              </span>
                              <Badge className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0">
                                ACTIVE
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {offer.instructions || 'Click the button below to open your direct redemption tool.'}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-orange-500 shrink-0" />
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              Redemption link unlocks automatically once redeemed with {offer.credit_cost} credits.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-4 pt-0">
                      {isRedeemed ? (
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={offer.app_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
                          >
                            <span>Open Tool</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(offer.app_link)}
                            className="h-10 text-xs font-bold rounded-xl gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Link</span>
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleStartRedeem(offer)}
                          disabled={!canAfford}
                          className={`w-full h-10 rounded-xl font-bold text-xs gap-1.5 shadow-sm transition-all ${
                            canAfford
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? (
                            <>
                              <Unlock className="h-3.5 w-3.5" />
                              <span>Redeem for {offer.credit_cost} Credits</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              <span>Need {offer.credit_cost - credits} More Credits</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: MY REDEEMED OFFERS */}
      {activeTab === 'my-items' && (
        <div className="space-y-4">
          {redeemedOffersList.length === 0 ? (
            <div className="text-center p-12 bg-card rounded-2xl border border-border shadow-xs space-y-3">
              <div className="h-12 w-12 rounded-full bg-orange-500/10 grid place-items-center text-orange-500 mx-auto">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-black text-foreground">
                No Redeemed Airtime or Data Offers Yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once you redeem offers using your credit wallet, your unlocked links and tools will always be saved here for quick access.
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab('store')}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-9 rounded-xl"
              >
                Browse Available Packages
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground">
                  You have unlocked <span className="text-foreground font-black">{redeemedOffersList.length}</span> airtime & data tools.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {redeemedOffersList.map((offer) => {
                  const theme = NETWORK_THEMES[offer.network] || NETWORK_THEMES.all;
                  return (
                    <Card
                      key={offer.id}
                      className="border-emerald-500/40 bg-emerald-500/[0.02] rounded-2xl p-4 flex flex-col justify-between shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <NetworkLogo network={offer.network} size="sm" />
                            <span className="text-xs font-black uppercase text-foreground">
                              {theme.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              Unlocked
                            </span>
                          </div>
                          <GGDRewardBrandBadge 
                            customLogoUrl={offer.reward_logo_url || globalRewardLogo} 
                            size="sm" 
                            showText={false} 
                          />
                        </div>

                        <div>
                          <h4 className="font-black text-sm text-foreground">{offer.title}</h4>
                          {offer.denomination && (
                            <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                              {offer.denomination}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {offer.instructions || offer.description}
                          </p>
                        </div>

                        {/* Direct link box */}
                        <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-[11px] truncate select-all text-foreground">
                            {offer.app_link}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/40">
                        <a
                          href={offer.app_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <span>Launch Tool</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(offer.app_link)}
                          className="h-10 px-3 rounded-xl text-xs font-bold gap-1"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Coins className="h-4 w-4 text-orange-500" />
              Confirm Credit Redemption
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review your redemption details below. Your credits will be deducted from your wallet to unlock this offer.
            </DialogDescription>
          </DialogHeader>

          {selectedOfferForRedeem && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <NetworkLogo network={selectedOfferForRedeem.network} size="sm" />
                    <span className="text-xs font-black uppercase text-foreground">
                      {NETWORK_THEMES[selectedOfferForRedeem.network]?.name || selectedOfferForRedeem.network}
                    </span>
                  </div>
                  <GGDRewardBrandBadge 
                    customLogoUrl={selectedOfferForRedeem.reward_logo_url || globalRewardLogo} 
                    size="sm" 
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-xs text-muted-foreground font-medium">Package:</span>
                  <span className="text-xs font-black text-foreground">{selectedOfferForRedeem.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Category:</span>
                  <span className="text-xs font-bold capitalize text-foreground">{selectedOfferForRedeem.type}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-bold">Cost in Credits:</span>
                  <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                    {selectedOfferForRedeem.credit_cost} Credits
                  </span>
                </div>
              </div>

              {/* Wallet Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                <div>
                  <span className="text-[11px] text-muted-foreground block font-medium">Current Balance:</span>
                  <span className="text-sm font-black text-foreground">{credits} Credits</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block font-medium">Balance After:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {credits - selectedOfferForRedeem.credit_cost} Credits
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upon confirming, your redemption link will immediately unlock and be added to your account permanently.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              className="text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRedeem}
              disabled={redeeming}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-bold text-xs rounded-xl gap-1.5 shadow-md"
            >
              {redeeming ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Redeeming...
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  Confirm & Unlock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL-SCREEN FALLING REDEEM ANIMATION & RICH AUDIO EFFECT */}
      {unlockedOffer && (
        <RedeemFallingAnimation
          isOpen={isSuccessOpen}
          onClose={() => setIsSuccessOpen(false)}
          offer={unlockedOffer.offer}
          appLink={unlockedOffer.appLink}
          globalRewardLogo={globalRewardLogo}
          userRemainingCredits={credits}
        />
      )}
    </div>
  );
};

export default CreditRedeemAirtime;
