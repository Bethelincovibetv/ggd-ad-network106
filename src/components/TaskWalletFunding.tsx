import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus, MessageCircle, ArrowUp, ArrowDown, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = '2348131107416';

const TaskWalletFunding = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle();

    if (!data) {
      await supabase.from('task_wallets').insert({ user_id: user.id });
      const { data: newWallet } = await supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle();
      setWallet(newWallet);
    } else {
      setWallet(data);
    }
    setLoading(false);
  };

  const quickAmounts = [
    { label: '₦1,000', value: 1000 },
    { label: '₦2,000', value: 2000 },
    { label: '₦5,000', value: 5000 },
    { label: '₦10,000', value: 10000 },
  ];

  const fundViaPaystack = async () => {
    const nairaAmount = parseInt(amount);
    if (!nairaAmount || nairaAmount < 500) {
      toast.error('Minimum amount is ₦500');
      return;
    }
    setPaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          amount: nairaAmount,
          email: user.email,
          type: 'task_wallet_funding',
          metadata: { callback_url: window.location.origin },
        },
      });

      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        toast.success('Payment page opened! Complete payment and return here.');
        
        const checkInterval = setInterval(async () => {
          const { data: verifyData } = await supabase.functions.invoke('paystack-verify', {
            body: { reference: data.reference },
          });
          if (verifyData?.success) {
            clearInterval(checkInterval);
            fetchData();
            toast.success(`🎉 ₦${nairaAmount} added to your task wallet!`);
            setAmount('');
            setPaying(false);
          }
        }, 5000);
        setTimeout(() => { clearInterval(checkInterval); setPaying(false); }, 120000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
      setPaying(false);
    }
  };

  const fundViaWhatsApp = () => {
    const msg = encodeURIComponent(`Hello! I want to fund my GGD Task Wallet. My user ID is associated with my account. Please process my funding of ₦${amount || '___'}.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fund Task Wallet</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(q => (
              <Button key={q.value} variant={amount === String(q.value) ? "default" : "outline"} size="sm"
                className="text-xs" onClick={() => setAmount(String(q.value))}>
                {q.label}
              </Button>
            ))}
          </div>
          <Input type="number" placeholder="Enter amount (min ₦500)" value={amount} onChange={e => setAmount(e.target.value)} />
          {parseInt(amount) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">You'll add</p>
              <p className="text-2xl font-bold text-green-700">₦{amount}</p>
              <p className="text-[10px] text-green-500">to your task wallet</p>
            </div>
          )}
          <Button onClick={fundViaPaystack} disabled={paying || !amount} className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white">
            {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {paying ? 'Processing...' : `Pay ₦${amount || 0} via Paystack`}
          </Button>
          <Button onClick={fundViaWhatsApp} variant="outline" className="w-full">
            <MessageCircle className="h-4 w-4 mr-2" />Fund via WhatsApp (Manual)
          </Button>
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
