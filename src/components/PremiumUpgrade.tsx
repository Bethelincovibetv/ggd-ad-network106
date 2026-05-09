import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Check, Zap, Loader2, Star, Rocket, Gem, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePremiumSettings } from "@/hooks/usePremiumSettings";

interface PremiumUpgradeProps {
  onUpgraded: () => void;
  credits: number;
  isPremium: boolean;
}

const TIER_META = [
  { tier: 1 as const, label: 'Starter', icon: Star, gradient: 'from-blue-500 to-cyan-500', perks: ['Longer ad campaigns', 'Standard support'] },
  { tier: 2 as const, label: 'Growth', icon: Rocket, gradient: 'from-purple-500 to-pink-500', perks: ['Extended ad duration', 'API key access', 'Priority support'], popular: true },
  { tier: 3 as const, label: 'Pro', icon: Gem, gradient: 'from-amber-500 to-orange-600', perks: ['Maximum ad duration (30 days)', 'Unlimited API keys', 'VIP support', 'Premium badge'] },
];

const PremiumUpgrade: React.FC<PremiumUpgradeProps> = ({ onUpgraded, credits, isPremium }) => {
  const settings = usePremiumSettings();
  const [loading, setLoading] = useState<string>('');
  const [currentTier, setCurrentTier] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('premium_tier').eq('user_id', user.id).eq('role', 'premium').maybeSingle();
      if (data?.premium_tier) setCurrentTier(data.premium_tier);
    })();
  }, [isPremium]);

  if (settings.loading) return null;

  // Master toggle OFF: everyone gets all features free
  if (!settings.enabled) {
    return (
      <Card className="border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="p-6 text-center space-y-3">
          <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-full w-fit mx-auto">
            <Crown className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold">All Premium Features Are Free! 🎉</h3>
          <p className="text-sm text-muted-foreground">
            The admin has disabled premium gating. Every user enjoys 30-day ads, API keys, and all premium features at no cost.
          </p>
        </CardContent>
      </Card>
    );
  }

  const upgradeWithCredits = async (tier: 1 | 2 | 3) => {
    const tierData = settings.tiers.find(t => t.tier === tier)!;
    if (credits < tierData.credits) {
      toast.error(`You need ${tierData.credits} credits but have ${credits}.`);
      return;
    }
    setLoading(`tier${tier}`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Deduct credits first
      const { error: debitErr } = await supabase.from('profiles').update({ credits: credits - tierData.credits }).eq('user_id', user.id);
      if (debitErr) throw debitErr;

      // Use SECURITY DEFINER RPC so the user can grant themselves premium
      const { error: rpcErr } = await supabase.rpc('self_upgrade_premium', { _tier: tier });
      if (rpcErr) {
        // Refund on failure
        await supabase.from('profiles').update({ credits }).eq('user_id', user.id);
        throw rpcErr;
      }

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `👑 ${tierData.label} Activated!`,
        message: `You can now create ads up to ${tierData.days} days and access premium features.`,
        type: 'upgrade',
      });

      toast.success(`🎉 ${tierData.label} tier activated!`);
      onUpgraded();
    } catch (err: any) {
      toast.error(err.message || 'Upgrade failed');
    } finally {
      setLoading('');
    }
  };

  const upgradeWithPaystack = async (tier: 1 | 2 | 3) => {
    const tierData = settings.tiers.find(t => t.tier === tier)!;
    const naira = tierData.credits * settings.exchangeRate;
    setLoading(`tier${tier}_pay`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: { amount: naira, email: user.email, type: 'premium_upgrade', metadata: { tier, callback_url: window.location.origin } },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        toast.success('Complete payment in Paystack tab to activate.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment init failed');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-600 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <Crown className="h-7 w-7 mb-2 drop-shadow" />
        <h2 className="text-lg font-black">Choose Your Premium Tier</h2>
        <p className="text-[11px] opacity-90 mt-0.5">
          Free users can run {settings.freeAdDays}-day ads. Upgrade for longer campaigns and pro features.
        </p>
        {currentTier && (
          <div className="mt-3 inline-flex items-center gap-1 bg-white/20 backdrop-blur rounded-full px-3 py-1">
            <Check className="h-3 w-3" />
            <span className="text-[11px] font-bold">Current: Tier {currentTier}</span>
          </div>
        )}
      </div>

      {/* Tier cards */}
      <div className="space-y-3">
        {TIER_META.map(meta => {
          const tierData = settings.tiers.find(t => t.tier === meta.tier)!;
          const Icon = meta.icon;
          const isCurrent = currentTier === meta.tier;
          const naira = tierData.credits * settings.exchangeRate;
          return (
            <Card key={meta.tier} className={`overflow-hidden border-2 ${isCurrent ? 'border-green-400 ring-2 ring-green-400/30' : meta.popular ? 'border-purple-400' : 'border-border/40'}`}>
              {meta.popular && !isCurrent && (
                <div className={`bg-gradient-to-r ${meta.gradient} p-1.5 text-center`}>
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">⭐ Most Popular</span>
                </div>
              )}
              {isCurrent && (
                <div className="bg-green-500 p-1.5 text-center">
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">✓ Active Plan</span>
                </div>
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black">{meta.label}</h3>
                      <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full">Tier {meta.tier}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Up to {tierData.days}-day ad campaigns</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">{tierData.credits}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-semibold">credits</p>
                  </div>
                </div>

                <ul className="space-y-1">
                  {meta.perks.map(p => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-foreground">
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />{p}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      onClick={() => upgradeWithCredits(meta.tier)}
                      disabled={!!loading || credits < tierData.credits}
                      className={`bg-gradient-to-r ${meta.gradient} text-white text-xs h-10 rounded-xl font-bold shadow-md`}
                    >
                      {loading === `tier${meta.tier}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Zap className="h-3.5 w-3.5 mr-1" />Use Credits</>}
                    </Button>
                    <Button
                      onClick={() => upgradeWithPaystack(meta.tier)}
                      disabled={!!loading}
                      variant="outline"
                      className="text-xs h-10 rounded-xl font-semibold border-2"
                    >
                      {loading === `tier${meta.tier}_pay` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CreditCard className="h-3.5 w-3.5 mr-1" />₦{naira.toLocaleString()}</>}
                    </Button>
                  </div>
                )}
                {credits < tierData.credits && !isCurrent && (
                  <p className="text-[10px] text-orange-500 font-medium flex items-center gap-1">
                    <Lock className="h-3 w-3" />Need {tierData.credits - credits} more credits
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Free users get {settings.freeAdDays}-day ads. Admin can disable premium gating from settings.
      </p>
    </div>
  );
};

export default PremiumUpgrade;
