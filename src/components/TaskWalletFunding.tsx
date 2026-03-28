import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus, MessageCircle, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = '2348131107416';

const TaskWalletFunding = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paystackKey, setPaystackKey] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [walletRes, settingsRes] = await Promise.all([
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'paystack_public_key').maybeSingle(),
    ]);

    if (!walletRes.data) {
      await supabase.from('task_wallets').insert({ user_id: user.id });
      const { data } = await supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle();
      setWallet(data);
    } else {
      setWallet(walletRes.data);
    }

    if (settingsRes.data?.value) setPaystackKey(settingsRes.data.value);
    setLoading(false);
  };

  const fundViaWhatsApp = () => {
    const msg = encodeURIComponent(`Hello! I want to fund my GGD Task Wallet. My user ID is associated with my account. Please process my funding.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  const fundViaPaystack = () => {
    if (!paystackKey) {
      toast.info("Paystack not yet configured. Please contact admin via WhatsApp to fund.");
      fundViaWhatsApp();
      return;
    }
    toast.info("Paystack integration coming soon! Contact admin via WhatsApp for now.");
    fundViaWhatsApp();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6 text-center">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-green-600" />
          <p className="text-xs text-muted-foreground">Task Wallet Balance</p>
          <p className="text-4xl font-bold text-green-700">₦{wallet?.balance || 0}</p>
          <div className="grid grid-cols-2 gap-4 mt-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total Funded</p>
              <p className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                <ArrowUp className="h-3 w-3 text-green-500" />₦{wallet?.total_funded || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                <ArrowDown className="h-3 w-3 text-red-500" />₦{wallet?.total_spent || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fund Wallet</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={fundViaPaystack} className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Fund via Paystack
          </Button>
          <Button onClick={fundViaWhatsApp} variant="outline" className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" />Fund via WhatsApp (Manual)
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Contact admin to manually add funds. Paystack auto-funding coming soon!
          </p>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-3">
          <h4 className="font-bold text-xs text-orange-800 mb-1">💡 How it works</h4>
          <ul className="text-[10px] text-orange-700 space-y-0.5 list-disc list-inside">
            <li>Fund your Task Wallet to create tasks for syndicates</li>
            <li>When you create a task, the cost is deducted from your wallet</li>
            <li>Syndicates get paid when you approve their proof</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskWalletFunding;
