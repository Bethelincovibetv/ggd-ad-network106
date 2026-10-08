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
  RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight, Flame, Store
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
  UserRedemptionRecord 
} from "@/services/redeemMarketplaceService";

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
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(propCredits ?? 0);
  const [offers, setOffers] = useState<RedeemOffer[]>([]);
  const [redeemedIds, setRedeemedIds] = useState<string[]>([]);
  const [userHistory, setUserHistory] = useState<UserRedemptionRecord[]>([]);
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

      const [offersList, { data: profile }] = await Promise.all([
        getRedeemOffers(),
        currentUser 
          ? supabase.from('profiles').select('credits').eq('user_id', currentUser.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setOffers(offersList.filter(o => o.is_active));

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

  const handleOpenRedeemModal = (offer: RedeemOffer) => {
    if (!user) {
      toast.info('Please sign in to redeem airtime and data with your credits.');
      return;
    }
    if (credits < offer.credit_cost) {
      toast.error(`Insufficient credit balance. You need ${offer.credit_cost} credits, but you have ${credits} credits.`);
      return;
    }
    setSelectedOfferForRedeem(offer);
    setIsConfirmOpen(true);
  };

  const handleConfirmRedeem = async () => {
    if (!user || !selectedOfferForRedeem) return;

    setRedeeming(true);
    try {
      const result = await redeemOfferWithCredits(user.id, selectedOfferForRedeem);
      
      // Update state
      setCredits(result.remainingCredits);
      if (onCreditsUpdated) onCreditsUpdated(result.remainingCredits);
      setRedeemedIds(prev => Array.from(new Set([...prev, selectedOfferForRedeem.id])));

      // Add to user history
      const newHistoryItem: UserRedemptionRecord = {
        id: `red_${Date.now()}`,
        offerId: selectedOfferForRedeem.id,
        offerTitle: selectedOfferForRedeem.title,
        type: selectedOfferForRedeem.type,
        network: selectedOfferForRedeem.network,
        creditCost: selectedOfferForRedeem.credit_cost,
        appLink: result.appLink,
        redeemedAt: new Date().toISOString(),
        userId: user.id,
      };
      setUserHistory(prev => [newHistoryItem, ...prev]);

      setIsConfirmOpen(false);
      setUnlockedOffer({ offer: selectedOfferForRedeem, appLink: result.appLink });
      setIsSuccessOpen(true);

      toast.success(`🎉 ${selectedOfferForRedeem.title} unlocked! Your redemption tool link is ready.`);
    } catch (err: any) {
      toast.error(err.message || 'Redemption failed. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Redemption link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const filteredOffers = offers.filter(o => {
    const matchesSearch = 
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.denomination && o.denomination.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.network.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || o.type === filterType;
    const matchesNetwork = filterNetwork === 'all' || o.network === filterNetwork;

    return matchesSearch && matchesType && matchesNetwork;
  });

  const myRedeemedOffers = offers.filter(o => redeemedIds.includes(o.id));

  return (
    <div className="space-y-6">
      {/* Hero Header with Live Wallet Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-zinc-900 to-neutral-950 text-white p-5 sm:p-7 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs font-bold gap-1.5 px-3 py-1">
                <Sparkles className="h-3 w-3" />
                Instant Credit Redemption
              </Badge>
              <Badge variant="outline" className="text-zinc-300 border-white/10 text-xs font-semibold">
                MTN • Airtel • Glo • 9mobile
              </Badge>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Airtime & Data Redeem Marketplace
            </h1>
            
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Use your earned credit wallet to purchase high-speed data bundles and airtime recharge tools. Once redeemed, your unique claim portal link unlocks instantly for immediate access!
            </p>
          </div>

          {/* Credits Balance Showcase Widget */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md min-w-[240px] shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Earned Credit Wallet
              </span>
              <Coins className="h-4 w-4 text-orange-400 animate-bounce" />
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {credits.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-orange-400">Credits</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Available to redeem for data & airtime
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate ? onNavigate('tasks') : window.location.assign('/?tab=tasks')}
                className="flex-1 bg-white/5 border-white/15 hover:bg-white/10 text-white text-[11px] h-8 font-bold rounded-xl"
              >
                Earn Credits
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMarketplaceData}
                disabled={loading}
                className="h-8 w-8 p-0 bg-white/5 border-white/15 hover:bg-white/10 text-white rounded-xl"
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
              <p className="font-bold text-white text-[11px]">Instant Tool Access</p>
              <p className="text-[10px] text-zinc-400">Unlocks on redemption</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 grid place-items-center text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Zero Cash Required</p>
              <p className="text-[10px] text-zinc-400">Pay with task credits</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Admin Verified</p>
              <p className="text-[10px] text-zinc-400">Direct telecom links</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 grid place-items-center text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Permanent Access</p>
              <p className="text-[10px] text-zinc-400">Saved in your account</p>
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

      {/* Network Filter Pills (When on store tab) */}
      {activeTab === 'store' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterNetwork('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterNetwork === 'all'
                ? 'bg-foreground text-background shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All Networks ({offers.length})
          </button>
          {(['mtn', 'airtel', 'glo', '9mobile'] as NetworkProvider[]).map((net) => {
            const count = offers.filter(o => o.network === net).length;
            const theme = NETWORK_THEMES[net];
            const isSelected = filterNetwork === net;
            return (
              <button
                key={net}
                onClick={() => setFilterNetwork(net)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all uppercase whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? `${theme.badgeBg} border shadow-xs font-black`
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>{net}</span>
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
                    className={`border transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-lg ${
                      isRedeemed
                        ? 'border-emerald-500/60 dark:border-emerald-500/40 bg-emerald-500/[0.02] ring-1 ring-emerald-500/20'
                        : theme.accentBorder
                    }`}
                  >
                    <div>
                      {/* Top Bar with Network Badge & Category */}
                      <div className="p-4 pb-3 flex items-start justify-between gap-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${theme.badgeBg}`}>
                            {theme.name.split(' ')[0]}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            offer.type === 'airtime'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          }`}>
                            {offer.type === 'airtime' ? 'Airtime Voucher' : 'Data Bundle'}
                          </span>
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

                    {/* Action Button Area */}
                    <div className="p-4 pt-2 border-t border-border/40 bg-muted/10">
                      {isRedeemed ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={offer.app_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all"
                          >
                            <span>Open Redemption Tool</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(offer.app_link)}
                            className="h-10 w-10 p-0 rounded-xl"
                            title="Copy link"
                          >
                            <Copy className="h-3.5 w-3.5 text-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleOpenRedeemModal(offer)}
                          disabled={!canAfford}
                          className={`w-full h-10 font-bold text-xs rounded-xl transition-all shadow-sm gap-1.5 ${
                            canAfford
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                              : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                          }`}
                        >
                          {canAfford ? (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              <span>Redeem for {offer.credit_cost} Credits</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                              <span>Need {offer.credit_cost} Credits (Have {credits})</span>
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
          {myRedeemedOffers.length === 0 ? (
            <div className="text-center p-14 bg-card rounded-2xl border border-border shadow-xs">
              <Lock className="h-10 w-10 text-orange-500/50 mx-auto mb-3" />
              <h3 className="text-base font-black text-foreground">No Redeemed Offers Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You haven't redeemed any airtime or data offers yet. Browse our marketplace and use your credit balance to unlock immediate access!
              </p>
              <Button
                onClick={() => setActiveTab('store')}
                className="mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white text-xs font-bold h-9 rounded-xl gap-1.5 shadow-sm"
              >
                <Store className="h-4 w-4" />
                Browse Store Packages
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground">
                  Your Unlocked Redemption Links ({myRedeemedOffers.length})
                </p>
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Permanent Access Unlocked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRedeemedOffers.map(offer => {
                  const theme = NETWORK_THEMES[offer.network] || NETWORK_THEMES.all;
                  return (
                    <Card key={offer.id} className="border border-emerald-500/40 shadow-sm overflow-hidden bg-card">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${theme.badgeBg}`}>
                                {offer.network}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {offer.type}
                              </span>
                            </div>
                            <h4 className="font-black text-sm text-foreground">{offer.title}</h4>
                            {offer.denomination && (
                              <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                                {offer.denomination}
                              </p>
                            )}
                          </div>

                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-black gap-1">
                            <Check className="h-3 w-3" /> UNLOCKED
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {offer.instructions || 'Click the button below to access your redemption tool and claim your package.'}
                        </p>

                        {/* Unlocked Link Box */}
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground block">
                            Direct Redemption URL:
                          </span>
                          <p className="font-mono text-[11px] text-foreground truncate select-all">
                            {offer.app_link}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={offer.app_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all"
                          >
                            <span>Open Redemption Portal</span>
                            <ArrowUpRight className="h-4 w-4" />
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
              <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Package:</span>
                  <span className="text-xs font-black text-foreground">{selectedOfferForRedeem.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Category:</span>
                  <span className="text-xs font-bold capitalize text-foreground">{selectedOfferForRedeem.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Network:</span>
                  <span className="text-xs font-black uppercase text-foreground">{selectedOfferForRedeem.network}</span>
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

      {/* UNLOCKED SUCCESS DIALOG MODAL */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-md rounded-2xl text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 grid place-items-center text-emerald-500 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              Redemption Successful!
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your airtime/data claim link is now unlocked and ready for you to access.
            </DialogDescription>
          </DialogHeader>

          {unlockedOffer && (
            <div className="space-y-4 py-2 text-left">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80">
                <p className="text-xs font-black text-foreground">{unlockedOffer.offer.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {unlockedOffer.offer.instructions || 'Click the button below to open your tool portal.'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Unlocked Tool URL:
                </span>
                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/30 flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold text-foreground truncate select-all">
                    {unlockedOffer.appLink}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyLink(unlockedOffer.appLink)}
                    className="h-8 px-2 rounded-lg text-xs font-bold gap-1 text-orange-600 hover:bg-orange-500/10"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={unlockedOffer.appLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white shadow-md transition-all"
                >
                  <span>Launch Tool / Claim Link</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <Button
                  variant="outline"
                  onClick={() => setIsSuccessOpen(false)}
                  className="h-11 rounded-xl text-xs font-bold"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditRedeemAirtime;
