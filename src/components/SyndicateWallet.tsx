import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownCircle, Clock, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SyndicateWallet = () => {
  const [credits, setCredits] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, withdrawalsRes, profileRes, rateRes] = await Promise.all([
      supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle(),
      supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
    ]);

    setCredits(Number(profRes.data?.credits || 0));
    const r = parseInt(rateRes.data?.value || '') || 100;
    setExchangeRate(r);
    setWithdrawals(withdrawalsRes.data || []);
    if (profileRes.data) {
      setProfile(profileRes.data);
      setBankForm({
        bank_name: profileRes.data.bank_name || '',
        account_number: profileRes.data.account_number || '',
        account_name: profileRes.data.account_name || '',
      });
    }
    setLoading(false);
  };

  const saveBankDetails = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
      toast.error("All bank details required"); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('syndicate_profiles').update({
      bank_name: bankForm.bank_name,
      account_number: bankForm.account_number,
      account_name: bankForm.account_name,
    }).eq('user_id', user.id);

    toast.success("Bank details saved!");
  };

  const requestWithdrawal = async () => {
    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount <= 0) { toast.error("Enter valid amount"); return; }
    const creditsNeeded = Math.ceil(withdrawAmount / exchangeRate);
    if (credits < creditsNeeded) { toast.error(`Need ${creditsNeeded} GGG credits, you have ${credits}`); return; }
    if (!bankForm.bank_name || !bankForm.account_number) { toast.error("Set bank details first"); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error } = await supabase.from('withdrawal_requests').insert({
      user_id: user.id, amount: withdrawAmount,
      bank_name: bankForm.bank_name, account_number: bankForm.account_number, account_name: bankForm.account_name,
    });

    if (error) { toast.error("Failed to submit"); setSubmitting(false); return; }

    // Deduct equivalent GGG credits
    await supabase.from('profiles').update({ credits: credits - creditsNeeded }).eq('user_id', user.id);

    toast.success(`Submitted! ${creditsNeeded} GGG credits held (≈₦${withdrawAmount}). Processed every Saturday.`);
    setAmount('');
    setSubmitting(false);
    fetchData();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white shadow-xl overflow-hidden relative">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <CardContent className="p-6 text-center relative">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-white" />
          <p className="text-sm uppercase tracking-wider opacity-90 font-semibold">GGG Credits</p>
          <p className="text-5xl font-black mt-1">{credits.toLocaleString()}</p>
          <p className="text-sm opacity-90 mt-1">≈ ₦{(credits * exchangeRate).toLocaleString()} <span className="opacity-70 text-xs">(₦{exchangeRate}/credit)</span></p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/15 backdrop-blur rounded-xl p-3">
              <p className="text-[11px] opacity-90">Tasks Done</p>
              <p className="text-lg font-bold">{profile?.tasks_completed || 0}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-3">
              <p className="text-[11px] opacity-90">Withdrawals</p>
              <p className="text-lg font-bold">{withdrawals.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="border-2">
        <CardHeader className="pb-3"><CardTitle className="text-lg font-bold">🏦 Bank Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Bank Name</Label>
            <Input value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} className="mt-1.5 h-12 text-base" placeholder="e.g. GTBank" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Account Number</Label>
            <Input value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} className="mt-1.5 h-12 text-base" placeholder="0123456789" inputMode="numeric" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Account Name</Label>
            <Input value={bankForm.account_name} onChange={e => setBankForm({...bankForm, account_name: e.target.value})} className="mt-1.5 h-12 text-base" placeholder="Your full name" />
          </div>
          <Button onClick={saveBankDetails} className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
            Save Bank Details
          </Button>
        </CardContent>
      </Card>

      {/* Withdrawal */}
      <Card className="border-2">
        <CardHeader className="pb-3"><CardTitle className="text-lg font-bold">💸 Request Withdrawal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="number" inputMode="numeric" placeholder="Amount (₦)" className="h-14 text-xl font-bold text-center" value={amount} onChange={e => setAmount(e.target.value)} />
          {parseInt(amount) > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              ≈ <strong>{Math.ceil(parseInt(amount) / exchangeRate)} GGG credits</strong> will be deducted
            </p>
          )}
          <p className="text-sm text-muted-foreground text-center">Withdrawals are processed every Saturday</p>
          <Button onClick={requestWithdrawal} disabled={submitting} className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-base font-bold rounded-xl shadow-lg">
            {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <ArrowDownCircle className="h-5 w-5 mr-2" />}
            Request Withdrawal
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {withdrawals.length > 0 && (
        <>
          <h3 className="font-bold text-lg text-foreground">📜 Withdrawal History</h3>
          <div className="space-y-3">
            {withdrawals.map(w => (
              <Card key={w.id} className="border">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">₦{Number(w.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={`text-sm px-3 py-1.5 ${
                    w.status === 'completed' ? 'bg-green-500' :
                    w.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}>
                    {w.status === 'completed' ? <CheckCircle className="h-4 w-4 mr-1" /> : <Clock className="h-4 w-4 mr-1" />}
                    {w.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SyndicateWallet;
