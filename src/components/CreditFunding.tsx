import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CreditCard, Loader2, Zap, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
        toast.success('Payment page opened! Complete payment and return here.');
        // Poll for verification
        const checkInterval = setInterval(async () => {
          const { data: verifyData } = await supabase.functions.invoke('paystack-verify', {
            body: { reference: data.reference },
          });
          if (verifyData?.success) {
            clearInterval(checkInterval);
            const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
            if (profile) onCreditsUpdate(profile.credits);
            toast.success(`🎉 ${creditsToGet} credits added!`);
            setAmount('');
            setLoading(false);
          }
        }, 5000);
        setTimeout(() => { clearInterval(checkInterval); setLoading(false); }, 120000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6 text-center">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-green-600" />
          <p className="text-xs text-muted-foreground">Credit Balance</p>
          <p className="text-4xl font-bold text-green-700">{credits}</p>
          <p className="text-[10px] text-muted-foreground mt-1">₦{exchangeRate} = 1 Credit</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />Buy Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map(q => (
              <Button key={q.value} variant={amount === String(q.value) ? "default" : "outline"} size="sm"
                className="text-xs" onClick={() => setAmount(String(q.value))}>
                {q.label}
              </Button>
            ))}
          </div>
          <Input type="number" placeholder={`Enter amount (min ₦${exchangeRate})`}
            value={amount} onChange={e => setAmount(e.target.value)} />
          {creditsToGet > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">You'll get</p>
              <p className="text-2xl font-bold text-green-700">{creditsToGet} Credits</p>
            </div>
          )}
          <Button onClick={handlePay} disabled={loading || !creditsToGet} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {loading ? 'Processing...' : `Pay ₦${amount || 0} via Paystack`}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-3">
          <h4 className="font-bold text-xs text-orange-800 mb-1">💡 What credits can do</h4>
          <ul className="text-[10px] text-orange-700 space-y-0.5 list-disc list-inside">
            <li>Create ad campaigns on GGD Network</li>
            <li>Upgrade to Premium for API access</li>
            <li>Redeem marketing apps & tools</li>
            <li>Transfer credits to other users</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditFunding;
