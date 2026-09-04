import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowDownCircle, Clock, CheckCircle, Loader2, ShieldCheck, KeyRound, Zap, AlertTriangle, XCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";
import { POPULAR_NIGERIAN_BANKS, findBankCode } from "@/utils/nigerianBanks";

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const SyndicateWallet = () => {
  const [credits, setCredits] = useState<number>(0);
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [cooldownHours, setCooldownHours] = useState<number>(48);
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState<boolean>(false);
  const [maxAutoPayout, setMaxAutoPayout] = useState<number>(50000);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '', bank_code: '' });
  const [withdrawPin, setWithdrawPin] = useState('');
  const [bankPin, setBankPin] = useState('');
  const [newWithdrawPin, setNewWithdrawPin] = useState('');
  const [newBankPin, setNewBankPin] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, withdrawalsRes, profileRes, rateRes, cdRes, autoRes, maxAutoRes] = await Promise.all([
      supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle(),
      supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'syndicate_withdraw_cooldown_hours').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'auto_payout_enabled').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'max_auto_payout_amount').maybeSingle(),
    ]);

    setCredits(Number(profRes.data?.credits || 0));
    const r = parseInt(rateRes.data?.value || '') || 100;
    setExchangeRate(r);
    const cd = parseInt(cdRes.data?.value || '') || 48;
    setCooldownHours(cd);
    setAutoPayoutEnabled((autoRes.data?.value || 'false').toLowerCase() === 'true');
    setMaxAutoPayout(parseInt(maxAutoRes.data?.value || '50000') || 50000);
    setWithdrawals(withdrawalsRes.data || []);
    const profileData = profileRes.data as (typeof profileRes.data & { bank_code?: string }) | null;
    if (profileData) {
      setProfile(profileData);
      const bCode = profileData.bank_code || findBankCode(profileData.bank_name || '') || '';
      setBankForm({
        bank_name: profileData.bank_name || '',
        account_number: profileData.account_number || '',
        account_name: profileData.account_name || '',
        bank_code: bCode,
      });
    }
    setLoading(false);
  };

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const found = POPULAR_NIGERIAN_BANKS.find(b => b.code === selectedCode);
    if (found) {
      setBankForm(prev => ({
        ...prev,
        bank_name: found.name,
        bank_code: found.code,
      }));
    }
  };

  const saveBankDetails = async () => {
    if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
      toast.error("All bank details required"); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If account already saved and bank PIN exists, require it
    if (profile?.account_number && profile?.bank_pin_hash) {
      if (!bankPin) { toast.error("Enter your Bank-Change PIN"); return; }
      const hash = await sha256Hex(bankPin);
      if (hash !== profile.bank_pin_hash) { toast.error("Incorrect Bank PIN"); return; }
    }

    const resolvedCode = bankForm.bank_code || findBankCode(bankForm.bank_name) || null;

    const changed =
      bankForm.bank_name !== (profile?.bank_name || '') ||
      bankForm.account_number !== (profile?.account_number || '') ||
      bankForm.account_name !== (profile?.account_name || '');

    await supabase.from('syndicate_profiles').update({
      bank_name: bankForm.bank_name,
      account_number: bankForm.account_number,
      account_name: bankForm.account_name,
      bank_code: resolvedCode,
      ...(changed ? {
        bank_changed_at: new Date().toISOString(),
        paystack_recipient_code: null,
        paystack_recipient_status: 'unverified',
      } : {}),
    } as any).eq('user_id', user.id);

    toast.success("Bank details saved!");
    if (changed) toast.info(`Withdrawals locked for ${cooldownHours}h after a bank change.`);
    setBankPin('');
    fetchData();
  };

  const saveWithdrawPin = async () => {
    if (newWithdrawPin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const hash = await sha256Hex(newWithdrawPin);
    await supabase.from('syndicate_profiles').update({ withdraw_pin_hash: hash } as any).eq('user_id', user.id);
    toast.success("Withdrawal PIN saved");
    setNewWithdrawPin('');
    fetchData();
  };

  const saveBankPin = async () => {
    if (newBankPin.length < 4) { toast.error("PIN must be at least 4 digits"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const hash = await sha256Hex(newBankPin);
    await supabase.from('syndicate_profiles').update({ bank_pin_hash: hash } as any).eq('user_id', user.id);
    toast.success("Bank-change PIN saved");
    setNewBankPin('');
    fetchData();
  };

  const requestWithdrawal = async () => {
    if (profile?.wallet_frozen) { toast.error("Your wallet is frozen by admin. Contact support."); return; }
    if (profile?.is_suspended) { toast.error("Account suspended. Withdrawals are disabled."); return; }
    if (profile?.bank_changed_at) {
      const hoursSince = (Date.now() - new Date(profile.bank_changed_at).getTime()) / 36e5;
      if (hoursSince < cooldownHours) {
        const remaining = Math.ceil(cooldownHours - hoursSince);
        toast.error(`Bank changed recently. Try again in ${remaining}h.`);
        return;
      }
    }
    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount <= 0) { toast.error("Enter valid amount"); return; }
    const creditsNeeded = Math.ceil(withdrawAmount / exchangeRate);
    if (credits < creditsNeeded) { toast.error(`Need ${creditsNeeded} GGG credits, you have ${credits}`); return; }
    if (!bankForm.bank_name || !bankForm.account_number) { toast.error("Set bank details first"); return; }

    if (!profile?.withdraw_pin_hash) {
      toast.error("Set your Withdrawal PIN below before requesting a withdrawal");
      return;
    }
    if (!withdrawPin) { toast.error("Enter your Withdrawal PIN"); return; }
    const hash = await sha256Hex(withdrawPin);

    const resolvedCode = bankForm.bank_code || findBankCode(bankForm.bank_name) || null;

    setSubmitting(true);
    try {
      const { data, error } = await callRpc('request_syndicate_withdrawal', {
        p_amount: withdrawAmount,
        p_bank_name: bankForm.bank_name,
        p_account_number: bankForm.account_number,
        p_account_name: bankForm.account_name,
        p_pin_hash: hash,
        p_bank_code: resolvedCode,
      });

      if (error) throw error;
      const res = data as any;
      if (res && !res.success) {
        throw new Error(res.error || 'Failed to submit withdrawal');
      }

      setAmount('');
      setWithdrawPin('');

      // If auto-payout was triggered, invoke edge function in background
      if (res.payout_mode === 'automatic' && res.request_id) {
        toast.success(`⚡ Auto-payout initiated! ₦${withdrawAmount.toLocaleString()} is being sent via Paystack.`);
        supabase.functions.invoke('process-syndicate-payout', {
          body: { withdrawal_id: res.request_id },
        }).then(({ data: payoutRes, error: payoutErr }) => {
          if (payoutErr) console.warn('Background auto-payout notice:', payoutErr);
          if (payoutRes?.status === 'completed') {
            toast.success("🎉 Payout settled! Transferred directly to your bank.");
          }
          fetchData();
        }).catch(err => {
          console.warn('Auto-payout background call error:', err);
          fetchData();
        });
      } else {
        toast.success(`Submitted! ${res?.credits_held || creditsNeeded} GGG credits held (≈₦${withdrawAmount.toLocaleString()}). Awaiting admin review.`);
      }

      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {profile?.wallet_frozen && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 text-xs p-3 text-center font-semibold">
          🧊 Wallet frozen by admin — withdrawals are disabled.
        </div>
      )}
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
              <p className="text-[11px] opacity-90">Success Rate</p>
              <p className="text-lg font-bold">
                {(() => {
                  const a = Number(profile?.approved_count || 0);
                  const r = Number(profile?.rejected_count || 0);
                  const t = a + r;
                  return t === 0 ? '—' : `${Math.round((a / t) * 100)}%`;
                })()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="border-2">
        <CardHeader className="pb-3"><CardTitle className="text-lg font-bold">🏦 Official Bank Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Select Bank</Label>
            <div className="mt-1.5 space-y-2">
              <select
                aria-label="Select Bank"
                value={bankForm.bank_code || findBankCode(bankForm.bank_name) || ''}
                onChange={handleBankSelect}
                className="w-full h-12 text-sm rounded-xl border border-input bg-background px-3 font-medium focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Choose from Nigerian Banks --</option>
                {POPULAR_NIGERIAN_BANKS.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
              <Input
                value={bankForm.bank_name}
                onChange={e => setBankForm({ ...bankForm, bank_name: e.target.value, bank_code: findBankCode(e.target.value) || '' })}
                className="h-10 text-sm"
                placeholder="Or type custom bank name"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">Account Number</Label>
            <Input value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} className="mt-1.5 h-12 text-base" placeholder="0123456789 (10 digits)" inputMode="numeric" maxLength={10} />
          </div>
          <div>
            <Label className="text-sm font-semibold">Account Name</Label>
            <Input value={bankForm.account_name} onChange={e => setBankForm({...bankForm, account_name: e.target.value})} className="mt-1.5 h-12 text-base" placeholder="Full name matching your bank account" />
          </div>
          {profile?.account_number && profile?.bank_pin_hash && (
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1"><KeyRound className="h-4 w-4" /> Bank-Change PIN</Label>
              <Input type="password" inputMode="numeric" value={bankPin} onChange={e => setBankPin(e.target.value)} className="mt-1.5 h-12 text-base" placeholder="Enter PIN to change bank details" />
            </div>
          )}
          <Button onClick={saveBankDetails} className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
            Save Bank Details
          </Button>
          <p className="text-xs text-muted-foreground text-center">Your bank information is securely used for automatic and manual payouts.</p>
        </CardContent>
      </Card>

      {/* Security PINs */}
      <Card className="border-2 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-orange-600" /> Security PINs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">{profile?.withdraw_pin_hash ? 'Change' : 'Set'} Withdrawal PIN</Label>
            <div className="flex gap-2 mt-1.5">
              <Input type="password" inputMode="numeric" value={newWithdrawPin} onChange={e => setNewWithdrawPin(e.target.value)} className="h-12 text-base" placeholder="4+ digits" />
              <Button onClick={saveWithdrawPin} className="h-12 px-4 font-bold rounded-xl bg-orange-600 text-white">Save</Button>
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">{profile?.bank_pin_hash ? 'Change' : 'Set'} Bank-Change PIN</Label>
            <div className="flex gap-2 mt-1.5">
              <Input type="password" inputMode="numeric" value={newBankPin} onChange={e => setNewBankPin(e.target.value)} className="h-12 text-base" placeholder="4+ digits" />
              <Button onClick={saveBankPin} className="h-12 px-4 font-bold rounded-xl bg-orange-600 text-white">Save</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">PINs protect your withdrawals and bank-detail changes. Keep them secret.</p>
        </CardContent>
      </Card>

      {/* Withdrawal */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">💸 Request Withdrawal</CardTitle>
            {autoPayoutEnabled && (
              <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                <Zap className="h-3 w-3 mr-1 text-cyan-600" /> Paystack Auto-Payout Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="number" inputMode="numeric" placeholder="Amount (₦)" className="h-14 text-xl font-bold text-center" value={amount} onChange={e => setAmount(e.target.value)} />
          {profile?.withdraw_pin_hash ? (
            <Input type="password" inputMode="numeric" placeholder="Withdrawal PIN" className="h-12 text-base text-center" value={withdrawPin} onChange={e => setWithdrawPin(e.target.value)} />
          ) : (
            <div className="rounded-xl border border-orange-300 bg-orange-50 text-orange-800 text-xs p-3 text-center">
              ⚠️ You must set a Withdrawal PIN above before you can request a withdrawal.
            </div>
          )}
          {parseInt(amount) > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              ≈ <strong>{Math.ceil(parseInt(amount) / exchangeRate)} GGG credits</strong> will be deducted
            </p>
          )}

          {autoPayoutEnabled && parseInt(amount) > 0 && parseInt(amount) <= maxAutoPayout && (
            <div className="text-[11px] bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 p-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800 flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-600 flex-shrink-0" />
              <span>Qualifies for instant automatic transfer to your bank account via Paystack.</span>
            </div>
          )}

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
            {withdrawals.map(w => {
              const isCompleted = w.status === 'completed';
              const isProcessing = w.status === 'processing';
              const isPendingAuto = w.status === 'pending_automatic';
              const isFailed = w.status === 'failed';
              const isRejected = w.status === 'rejected';

              return (
                <Card key={w.id} className="border shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-foreground">₦{Number(w.amount).toLocaleString()}</p>
                        {w.payout_mode === 'automatic' && (
                          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 text-[9px] border-0">
                            <Zap className="h-2.5 w-2.5 mr-0.5" /> Auto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                      {w.failure_reason && (
                        <p className="text-[10px] text-red-600 font-medium">Credits restored: {w.failure_reason}</p>
                      )}
                    </div>

                    <Badge className={`text-xs px-3 py-1.5 font-bold flex items-center gap-1 ${
                      isCompleted ? 'bg-emerald-600 text-white' :
                      isProcessing ? 'bg-cyan-600 text-white' :
                      isPendingAuto ? 'bg-blue-600 text-white' :
                      isFailed || isRejected ? 'bg-red-600 text-white' :
                      'bg-amber-500 text-white'
                    }`}>
                      {isCompleted ? <CheckCircle className="h-3.5 w-3.5" /> :
                       isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                       isFailed ? <AlertTriangle className="h-3.5 w-3.5" /> :
                       isRejected ? <XCircle className="h-3.5 w-3.5" /> :
                       <Clock className="h-3.5 w-3.5" />}
                      {isCompleted ? 'Paid' :
                       isProcessing ? 'Processing' :
                       isPendingAuto ? 'Queued Auto' :
                       isFailed ? 'Failed (Refunded)' :
                       isRejected ? 'Rejected' : 'Pending'}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SyndicateWallet;
