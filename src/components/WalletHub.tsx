import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard, Send, Coins, TrendingUp, Banknote, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreditFunding from "@/components/CreditFunding";
import CreditTransfer from "@/components/CreditTransfer";
import TaskWalletFunding from "@/components/TaskWalletFunding";

interface WalletHubProps {
  credits: number;
  onCreditsUpdate: (c: number) => void;
  isPremium: boolean;
  initialTab?: 'task-wallet' | 'buy' | 'transfer';
}

const WalletHub = ({ credits, onCreditsUpdate, isPremium, initialTab = 'task-wallet' }: WalletHubProps) => {
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'task-wallet' | 'buy' | 'transfer'>(initialTab);
  const [taskWallet, setTaskWallet] = useState<any>(null);
  const channelRef = useRef<any>(null);
  const walletChannelRef = useRef<any>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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

      // Load task wallet and subscribe to real-time updates
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user && isMounted) {
        const uid = authData.user.id;

        // Fetch task wallet
        const { data: wData } = await supabase
          .from('task_wallets')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();
        if (isMounted && wData) {
          setTaskWallet(wData);
        }

        // Real-time task wallet changes
        const wChannel = supabase
          .channel(`wallet-hub-naira-${uid}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_wallets',
              filter: `user_id=eq.${uid}`,
            },
            (payload) => {
              if (payload.new && isMounted) {
                setTaskWallet(payload.new);
              }
            }
          )
          .subscribe();
        walletChannelRef.current = wChannel;

        // Subscribe to real-time profile credit updates
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
      if (walletChannelRef.current) {
        supabase.removeChannel(walletChannelRef.current);
      }
    };
  }, [onCreditsUpdate]);

  const nairaEquivalent = credits * exchangeRate;

  return (
    <div className="space-y-4">
      {/* Hero dual balance card */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white relative overflow-hidden shadow-xl shadow-orange-500/20">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">GGD Digital Wallets</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-medium">
              <TrendingUp className="h-3.5 w-3.5 opacity-90" />
              <span>Realtime Synced</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {/* Naira Task Wallet */}
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between opacity-90">
                <div className="flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Task Wallet (Naira)</span>
                </div>
                <span className="text-[10px] bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded-full font-bold">₦ CASH</span>
              </div>
              <p className="text-3xl font-black mt-2 tracking-tight">₦{Number(taskWallet?.balance || 0).toLocaleString()}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15 text-[11px] opacity-90">
                <span>Total Funded</span>
                <span className="font-semibold">₦{Number(taskWallet?.total_funded || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Credits Wallet */}
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between opacity-90">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">GGG Credits</span>
                </div>
                <span className="text-[10px] bg-orange-400/40 text-orange-100 px-2 py-0.5 rounded-full font-bold">IN-APP</span>
              </div>
              <p className="text-3xl font-black mt-2 tracking-tight">{credits.toLocaleString()} <span className="text-sm font-normal opacity-80">cr</span></p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15 text-[11px] opacity-90">
                <span>Est. Value</span>
                <span className="font-semibold">≈ ₦{nairaEquivalent.toLocaleString()} NGN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl bg-secondary/80 p-1">
          <TabsTrigger
            value="task-wallet"
            className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <Banknote className="h-3.5 w-3.5" />
            Naira Wallet (₦)
          </TabsTrigger>
          <TabsTrigger
            value="buy"
            className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Buy Credits
          </TabsTrigger>
          <TabsTrigger
            value="transfer"
            className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <Send className="h-3.5 w-3.5" />
            Transfer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="task-wallet" className="mt-4">
          <TaskWalletFunding />
        </TabsContent>

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
