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
  const [wallet, setWallet] = useState<any>(null);
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

    const [walletRes, withdrawalsRes, profileRes] = await Promise.all([
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setWallet(walletRes.data);
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
    if (!wallet || wallet.balance < withdrawAmount) { toast.error("Insufficient balance"); return; }
    if (!bankForm.bank_name || !bankForm.account_number) { toast.error("Set bank details first"); return; }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error } = await supabase.from('withdrawal_requests').insert({
      user_id: user.id, amount: withdrawAmount,
      bank_name: bankForm.bank_name, account_number: bankForm.account_number, account_name: bankForm.account_name,
    });

    if (error) { toast.error("Failed to submit"); setSubmitting(false); return; }

    // Deduct from wallet
    await supabase.from('task_wallets').update({ balance: wallet.balance - withdrawAmount }).eq('user_id', user.id);

    toast.success("Withdrawal request submitted! Processed every Saturday.");
    setAmount('');
    setSubmitting(false);
    fetchData();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4 text-center">
          <Wallet className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-3xl font-bold text-green-700">₦{wallet?.balance || 0}</p>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Bank Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Bank Name</Label>
            <Input value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} className="mt-1" placeholder="e.g. GTBank" />
          </div>
          <div>
            <Label className="text-xs">Account Number</Label>
            <Input value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} className="mt-1" placeholder="0123456789" />
          </div>
          <div>
            <Label className="text-xs">Account Name</Label>
            <Input value={bankForm.account_name} onChange={e => setBankForm({...bankForm, account_name: e.target.value})} className="mt-1" placeholder="Your full name" />
          </div>
          <Button onClick={saveBankDetails} size="sm" className="w-full text-xs">Save Bank Details</Button>
        </CardContent>
      </Card>

      {/* Withdrawal */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Request Withdrawal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="number" placeholder="Amount (₦)" value={amount} onChange={e => setAmount(e.target.value)} />
          <p className="text-[10px] text-muted-foreground">Withdrawals are processed every Saturday</p>
          <Button onClick={requestWithdrawal} disabled={submitting} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowDownCircle className="h-4 w-4 mr-2" />}
            Request Withdrawal
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {withdrawals.length > 0 && (
        <>
          <h3 className="font-bold text-sm text-foreground">Withdrawal History</h3>
          <div className="space-y-2">
            {withdrawals.map(w => (
              <Card key={w.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">₦{w.amount}</p>
                    <p className="text-[10px] text-muted-foreground">{w.bank_name} - {w.account_number}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={
                    w.status === 'completed' ? 'bg-green-500' :
                    w.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                  }>
                    {w.status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
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
