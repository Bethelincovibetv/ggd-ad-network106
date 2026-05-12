import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, MessageCircle, ArrowUp, ArrowDown, Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = '2348131107416';

const TaskWalletFunding = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [showWa, setShowWa] = useState(false);
  const [waNote, setWaNote] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle();
    if (!data) {
      await supabase.from('task_wallets').insert({ user_id: user.id });
      const { data: nw } = await supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle();
      setWallet(nw);
    } else { setWallet(data); }
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
    if (!nairaAmount || nairaAmount < 500) { toast.error('Minimum amount is ₦500'); return; }
    setPaying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: { amount: nairaAmount, email: user.email, type: 'task_wallet_funding', metadata: { callback_url: window.location.origin } },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        toast.success('Checkout opened — complete and return.');
        const checkInterval = setInterval(async () => {
          const { data: verifyData } = await supabase.functions.invoke('paystack-verify', { body: { reference: data.reference } });
          if (verifyData?.success) {
            clearInterval(checkInterval);
            fetchData();
            toast.success(`🎉 ₦${nairaAmount} added to your wallet!`);
            setAmount('');
            setPaying(false);
          }
        }, 5000);
        setTimeout(() => { clearInterval(checkInterval); setPaying(false); }, 120000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
      setPaying(false);
    }
  };

  const sendWhatsApp = (text: string) => {
    const msg = encodeURIComponent(text);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    setShowWa(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Pro orange hero */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 opacity-80 text-[11px] uppercase tracking-wider font-semibold">
            <Wallet className="h-4 w-4" />Naira Wallet
          </div>
          <p className="text-4xl font-black mt-1">₦{Number(wallet?.balance || 0).toLocaleString()}</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/15 backdrop-blur rounded-xl p-2.5">
              <p className="text-[10px] opacity-80">Total Funded</p>
              <p className="text-sm font-bold flex items-center gap-1"><ArrowUp className="h-3 w-3" />₦{Number(wallet?.total_funded || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-2.5">
              <p className="text-[10px] opacity-80">Total Spent</p>
              <p className="text-sm font-bold flex items-center gap-1"><ArrowDown className="h-3 w-3" />₦{Number(wallet?.total_spent || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-md rounded-2xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">Top up Naira Wallet</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(q => (
              <Button key={q.value} variant={amount === String(q.value) ? "default" : "outline"} size="sm"
                className={amount === String(q.value) ? "text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white border-0" : "text-xs"}
                onClick={() => setAmount(String(q.value))}>{q.label}</Button>
            ))}
          </div>
          <Input type="number" placeholder="Enter amount (min ₦500)" value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl" />
          {parseInt(amount) > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-xs text-orange-700 font-semibold">You'll add</p>
              <p className="text-2xl font-black text-orange-700">₦{Number(amount).toLocaleString()}</p>
            </div>
          )}
          <Button onClick={fundViaPaystack} disabled={paying || !amount}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl h-11 shadow-lg shadow-orange-500/30 font-bold">
            {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {paying ? 'Processing...' : `Continue ₦${amount || 0}`}
          </Button>
          <Button onClick={() => { setWaNote(`Hello! I want to fund my GGD Naira Wallet with ₦${amount || '___'}.`); setShowWa(true); }}
            variant="outline" className="w-full rounded-xl border-orange-300 text-orange-700 hover:bg-orange-50">
            <MessageCircle className="h-4 w-4 mr-2" />Manual Top-up via WhatsApp
          </Button>
        </CardContent>
      </Card>

      {showWa && (
        <Card className="border-orange-300 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-sm">Customise your message</h4>
            <textarea
              value={waNote}
              onChange={e => setWaNote(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-orange-200 bg-orange-50/40 p-2 text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={() => sendWhatsApp(waNote)} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl">
                <MessageCircle className="h-4 w-4 mr-1" />Send to WhatsApp
              </Button>
              <Button variant="outline" onClick={() => setShowWa(false)} className="rounded-xl">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-200 bg-gradient-to-br from-orange-50/60 to-red-50/40 rounded-2xl">
        <CardContent className="p-3">
          <h4 className="font-bold text-xs text-orange-800 mb-1">💡 How the Naira Wallet works</h4>
          <ul className="text-[11px] text-orange-700 space-y-0.5 list-disc list-inside">
            <li>Top up to launch syndicate and paid-task campaigns</li>
            <li>Costs are deducted automatically when tasks are created</li>
            <li>Workers get paid out only after you approve their proof</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskWalletFunding;
