import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, CreditCard, Send, Coins, TrendingUp, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CreditFunding from "@/components/CreditFunding";
import CreditTransfer from "@/components/CreditTransfer";
import TaskWalletFunding from "@/components/TaskWalletFunding";

interface WalletHubProps {
  credits: number;
  onCreditsUpdate: (c: number) => void;
  isPremium: boolean;
}

const WalletHub = ({ credits, onCreditsUpdate, isPremium }: WalletHubProps) => {
  const [nairaBalance, setNairaBalance] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('task_wallets').select('balance').eq('user_id', user.id).maybeSingle();
      setNairaBalance(Number(data?.balance || 0));
    })();
  }, []);

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
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">My Wallet</span>
            </div>
            <TrendingUp className="h-4 w-4 opacity-70" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
              <div className="flex items-center gap-1.5 opacity-80">
                <Coins className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Credits</span>
              </div>
              <p className="text-2xl font-black mt-1">{credits.toLocaleString()}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
              <div className="flex items-center gap-1.5 opacity-80">
                <Banknote className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Naira</span>
              </div>
              <p className="text-2xl font-black mt-1">₦{nairaBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl bg-secondary/80 p-1">
          <TabsTrigger value="buy" className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold">
            <CreditCard className="h-3.5 w-3.5" />Buy
          </TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold">
            <Send className="h-3.5 w-3.5" />Transfer
          </TabsTrigger>
          <TabsTrigger value="naira" className="text-xs gap-1.5 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold">
            <Banknote className="h-3.5 w-3.5" />Naira
          </TabsTrigger>
        </TabsList>
        <TabsContent value="buy" className="mt-4">
          <CreditFunding credits={credits} onCreditsUpdate={onCreditsUpdate} />
        </TabsContent>
        <TabsContent value="transfer" className="mt-4">
          <CreditTransfer credits={credits} onCreditsUpdate={onCreditsUpdate} isPremium={isPremium} />
        </TabsContent>
        <TabsContent value="naira" className="mt-4">
          <TaskWalletFunding />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WalletHub;
