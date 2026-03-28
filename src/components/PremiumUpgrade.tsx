import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Check, Zap, Key, CreditCard, Store, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PremiumUpgradeProps {
  onUpgraded: () => void;
  credits: number;
  isPremium: boolean;
}

const PremiumUpgrade = ({ onUpgraded, credits, isPremium }: PremiumUpgradeProps) => {
  const [premiumCost, setPremiumCost] = useState(50);
  const [vendorCost, setVendorCost] = useState(100);
  const [exchangeRate, setExchangeRate] = useState(100);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    supabase.from('app_settings').select('*').then(({ data }) => {
      data?.forEach(s => {
        if (s.key === 'premium_upgrade_credits') setPremiumCost(parseInt(s.value));
        if (s.key === 'vendor_upgrade_credits') setVendorCost(parseInt(s.value));
        if (s.key === 'credit_exchange_rate') setExchangeRate(parseInt(s.value));
      });
    });
  }, []);

  const upgradeWithCredits = async (type: 'premium' | 'vendor') => {
    const cost = type === 'premium' ? premiumCost : vendorCost;
    if (credits < cost) {
      toast.error(`Need ${cost} credits. You have ${credits}.`);
      return;
    }
    setLoading(type);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Deduct credits
      await supabase.from('profiles').update({ credits: credits - cost }).eq('user_id', user.id);
      
      // Add role
      const { data: existing } = await supabase.from('user_roles')
        .select('*').eq('user_id', user.id).eq('role', 'premium').maybeSingle();
      if (!existing) {
        await supabase.from('user_roles').insert({ user_id: user.id, role: 'premium' as any });
      }

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: type === 'premium' ? '👑 Premium Activated!' : '🏪 Vendor Activated!',
        message: type === 'premium' 
          ? 'You now have access to API keys, 30-day ads, and more!'
          : 'You can now sell credits to other users!',
        type: 'upgrade',
      });

      toast.success(`🎉 ${type === 'premium' ? 'Premium' : 'Vendor'} upgrade successful!`);
      onUpgraded();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading('');
    }
  };

  const upgradeWithPaystack = async (type: 'premium' | 'vendor') => {
    const cost = type === 'premium' ? premiumCost : vendorCost;
    const nairaAmount = cost * exchangeRate;
    setLoading(type + '_pay');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          amount: nairaAmount, email: user.email,
          type: type === 'premium' ? 'premium_upgrade' : 'vendor_upgrade',
          metadata: { callback_url: window.location.origin },
        },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        toast.success('Complete payment in Paystack to activate!');
        const checkInterval = setInterval(async () => {
          const { data: v } = await supabase.functions.invoke('paystack-verify', { body: { reference: data.reference } });
          if (v?.success) { clearInterval(checkInterval); setLoading(''); onUpgraded(); }
        }, 5000);
        setTimeout(() => { clearInterval(checkInterval); setLoading(''); }, 120000);
      }
    } catch (err: any) {
      toast.error(err.message);
      setLoading('');
    }
  };

  if (isPremium) {
    return (
      <Card className="border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardContent className="p-6 text-center space-y-3">
          <div className="p-3 bg-yellow-100 rounded-full w-fit mx-auto">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-foreground">You're Premium! 👑</h3>
          <p className="text-sm text-muted-foreground">You have access to all premium features including API keys, 30-day ads, and credit vendor.</p>
          <div className="grid grid-cols-2 gap-2">
            {['API Keys', '30-Day Ads', 'Credit Vendor', 'Priority Support'].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg p-2">
                <Check className="h-3 w-3" />{f}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Premium Plan */}
      <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-2 text-center">
          <span className="text-xs font-bold text-white">⭐ MOST POPULAR</span>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="text-center">
            <Crown className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
            <h3 className="text-xl font-bold text-foreground">Premium</h3>
            <p className="text-3xl font-black text-yellow-600 mt-1">{premiumCost} <span className="text-sm font-normal">credits</span></p>
            <p className="text-xs text-muted-foreground">or ₦{premiumCost * exchangeRate} via Paystack</p>
          </div>
          <ul className="space-y-2">
            {[
              { icon: Key, text: 'Create API keys for ad integration' },
              { icon: Zap, text: '30-day ad campaign duration' },
              { icon: Crown, text: 'Premium badge on profile' },
              { icon: CreditCard, text: 'Priority support' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <f.icon className="h-4 w-4 text-yellow-500" />{f.text}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Button onClick={() => upgradeWithCredits('premium')} disabled={!!loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
              {loading === 'premium' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Upgrade with {premiumCost} Credits
            </Button>
            <Button onClick={() => upgradeWithPaystack('premium')} variant="outline" disabled={!!loading} className="w-full">
              {loading === 'premium_pay' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay ₦{premiumCost * exchangeRate} via Paystack
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Plan */}
      <Card className="border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-5 space-y-4">
          <div className="text-center">
            <Store className="h-10 w-10 mx-auto text-purple-500 mb-2" />
            <h3 className="text-xl font-bold text-foreground">Credit Vendor</h3>
            <p className="text-3xl font-black text-purple-600 mt-1">{vendorCost} <span className="text-sm font-normal">credits</span></p>
            <p className="text-xs text-muted-foreground">or ₦{vendorCost * exchangeRate} via Paystack</p>
          </div>
          <ul className="space-y-2">
            {[
              { text: 'Everything in Premium' },
              { text: 'Sell credits to other users' },
              { text: 'Credit vendor badge' },
              { text: 'Bulk credit purchasing' },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-purple-500" />{f.text}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Button onClick={() => upgradeWithCredits('vendor')} disabled={!!loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              {loading === 'vendor' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
              Upgrade with {vendorCost} Credits
            </Button>
            <Button onClick={() => upgradeWithPaystack('vendor')} variant="outline" disabled={!!loading} className="w-full">
              {loading === 'vendor_pay' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay ₦{vendorCost * exchangeRate} via Paystack
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumUpgrade;
