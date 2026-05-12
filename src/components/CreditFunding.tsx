import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import gggCoin from '@/assets/ggg-credit.png';

interface CreditFundingProps {
  credits: number;
  onCreditsUpdate: (credits: number) => void;
}

const CreditFunding = ({ credits, onCreditsUpdate }: CreditFundingProps) => {
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle()
      .then(({ data }) => { if (data?.value) setExchangeRate(parseInt(data.value)); });
  }, []);

  const creditsToGet = amount ? Math.floor(parseInt(amount) / exchangeRate) : 0;

  const quickAmounts = [
    { label: '₦500', value: 500 },
    { label: '₦1,000', value: 1000 },
    { label: '₦2,000', value: 2000 },
    { label: '₦5,000', value: 5000 },
  ];

  const handlePay = async () => {
    const nairaAmount = parseInt(amount);
    if (!nairaAmount || nairaAmount < exchangeRate) {
      toast.error(`Minimum amount is ₦${exchangeRate}`);
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          amount: nairaAmount,
          email: user.email,
          type: 'credit_purchase',
          metadata: {
            credits_amount: creditsToGet,
            callback_url: window.location.origin,
          },
        },
      });

      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        toast.success('Checkout opened — complete and return.');
        const checkInterval = setInterval(async () => {
          const { data: verifyData } = await supabase.functions.invoke('paystack-verify', {
            body: { reference: data.reference },
          });
          if (verifyData?.success) {
            clearInterval(checkInterval);
            const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
            if (profile) onCreditsUpdate(profile.credits);
            toast.success(`🎉 ${creditsToGet} GGG credits added!`);
            setAmount('');
            setLoading(false);
          }
        }, 5000);
        setTimeout(() => { clearInterval(checkInterval); setLoading(false); }, 120000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pro hero balance */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <img src={gggCoin} alt="GGG" className="h-16 w-16 drop-shadow-lg" />
          <div>
            <p className="text-[11px] uppercase tracking-wider opacity-80 font-semibold">Goodgift Digital · GGG</p>
            <p className="text-4xl font-black leading-tight">{credits.toLocaleString()}</p>
            <p className="text-[11px] opacity-80">₦{exchangeRate} = 1 GGG credit</p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-md rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
            <CreditCard className="h-4 w-4" />Top up GGG Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(q => (
              <Button key={q.value} variant={amount === String(q.value) ? "default" : "outline"} size="sm"
                className={amount === String(q.value) ? "text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white border-0" : "text-xs"}
                onClick={() => setAmount(String(q.value))}>
                {q.label}
              </Button>
            ))}
          </div>
          <Input type="number" placeholder={`Enter amount (min ₦${exchangeRate})`}
            value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl" />
          {creditsToGet > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-xs text-orange-700 font-semibold">You'll receive</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <img src={gggCoin} alt="GGG" className="h-7 w-7" />
                <p className="text-2xl font-black text-orange-700">{creditsToGet} GGG</p>
              </div>
            </div>
          )}
          <Button onClick={handlePay} disabled={loading || !creditsToGet}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl h-11 shadow-lg shadow-orange-500/30 font-bold">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? 'Processing...' : `Continue ₦${amount || 0}`}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-gradient-to-br from-orange-50/60 to-red-50/40 rounded-2xl">
        <CardContent className="p-3">
          <h4 className="font-bold text-xs text-orange-800 mb-1">💡 What GGG credits unlock</h4>
          <ul className="text-[11px] text-orange-700 space-y-0.5 list-disc list-inside">
            <li>Launch banner ad campaigns on the GGD network</li>
            <li>Create syndicate campaigns and pay-per-task offers</li>
            <li>List your business in the GGD Directory</li>
            <li>Send credits to friends and team members</li>
            <li>Redeem premium tools, slides and marketing apps</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditFunding;
