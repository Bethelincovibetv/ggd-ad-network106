import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, Send, Coins, TrendingUp, Banknote, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreditFunding from "@/components/CreditFunding";
import CreditTransfer from "@/components/CreditTransfer";

interface WalletHubProps {
  credits: number;
  onCreditsUpdate: (c: number) => void;
  isPremium: boolean;
}

const WalletHub = ({ credits, onCreditsUpdate, isPremium }: WalletHubProps) => {
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'buy' | 'transfer'>('buy');
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    // Load exchange rate
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'credit_exchange_rate')
        .maybeSingle();

      const v = parseInt(data?.value || '', 10);
      if (v > 0 && isMounted) setExchangeRate(v);

      // Subscribe to real-time profile credit updates
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user && isMounted) {
        const uid = authData.user.id;
        const channel = supabase
          .channel(`wallet-hub-balance-${uid}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              const updated = payload.new as any;
              if (updated && typeof updated.credits === 'number') {
                onCreditsUpdate(updated.credits);
              }
            }
          )
          .subscribe();

        channelRef.current = channel;
      }
    })();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [onCreditsUpdate]);

  const nairaEquivalent = credits * exchangeRate;

  return (
    <div className="space-y-4">
      {/* Hero balance card */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white relative overflow-hidden shadow-xl shadow-orange-500/20">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">GGD Digital Wallet</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-medium">
              <TrendingUp className="h-3.5 w-3.5 opacity-90" />
              <span>Realtime Balance</span>
            </div>
          </div>

          <div className="mt-4 bg-white/15 backdrop-blur rounded-2xl p-4">
            <div className="flex items-center gap-1.5 opacity-80">
              <Coins className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Available GGG Credits</span>
            </div>
            <p className="text-4xl font-black mt-1 tracking-tight">{credits.toLocaleString()}</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15">
              <p className="text-xs opacity-95 flex items-center gap-1 font-semibold">
                <Banknote className="h-3.5 w-3.5" /> ≈ ₦{nairaEquivalent.toLocaleString()} NGN
              </p>
              <span className="text-[10px] opacity-75">₦{exchangeRate} / credit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 rounded-2xl bg-secondary/80 p-1">
          <TabsTrigger
            value="buy"
            className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Fund Credits
          </TabsTrigger>
          <TabsTrigger
            value="transfer"
            className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <Send className="h-3.5 w-3.5" />
            Transfer Credits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-4">
          <CreditFunding credits={credits} onCreditsUpdate={onCreditsUpdate} />
        </TabsContent>

        <TabsContent value="transfer" className="mt-4">
          <CreditTransfer credits={credits} onCreditsUpdate={onCreditsUpdate} isPremium={isPremium} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalletHub;
