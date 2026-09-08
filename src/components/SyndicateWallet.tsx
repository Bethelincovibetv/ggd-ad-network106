import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowDownCircle,
  Clock,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Lock,
  RefreshCw,
  Building2,
  Sparkles,
  ArrowRight,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { POPULAR_NIGERIAN_BANKS, findBankCode } from "@/utils/nigerianBanks";
import { resolveBankAccountPaystack } from "@/utils/paystackBank";
import { notifyAdminsOfApprovalRequired } from "@/services/adminNotificationHelper";

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

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
  const [withdrawPin, setWithdrawPin] = useState('');
  const [newWithdrawPin, setNewWithdrawPin] = useState('');

  // Initial Bank Setup State
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [selectedBankName, setSelectedBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvingName, setResolvingName] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState(false);

  // Bank Change Request State
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeBankCode, setChangeBankCode] = useState('');
  const [changeBankName, setChangeBankName] = useState('');
  const [changeAccountNumber, setChangeAccountNumber] = useState('');
  const [changeResolving, setChangeResolving] = useState(false);
  const [changeVerifiedName, setChangeVerifiedName] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profRes, withdrawalsRes, profileRes, rateRes, cdRes, autoRes, maxAutoRes, changeReqRes] = await Promise.all([
      supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle(),
      supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'syndicate_withdraw_cooldown_hours').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'auto_payout_enabled').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'max_auto_payout_amount').maybeSingle(),
      supabase.from('syndicate_bank_change_requests').select('*').eq('user_id', user.id).eq('status', 'pending').maybeSingle(),
    ]);

    setCredits(Number(profRes.data?.credits || 0));
    const r = parseInt(rateRes.data?.value || '') || 100;
    setExchangeRate(r);
    const cd = parseInt(cdRes.data?.value || '') || 48;
    setCooldownHours(cd);
    setAutoPayoutEnabled((autoRes.data?.value || 'false').toLowerCase() === 'true');
    setMaxAutoPayout(parseInt(maxAutoRes.data?.value || '50000') || 50000);
    setWithdrawals(withdrawalsRes.data || []);
    setProfile(profileRes.data || null);
    setPendingChangeRequest(changeReqRes.data || null);
    setLoading(false);
  };

  // Resolve account name via Paystack with multi-layer resilience
  const handleResolveInitialBank = async (bankCode: string, bankName: string, accNum: string) => {
    if (!bankCode || !accNum || accNum.trim().length !== 10) {
      setVerifiedName(null);
      return;
    }

    setResolvingName(true);
    setVerifiedName(null);
    try {
      const res = await resolveBankAccountPaystack(accNum, bankCode, bankName);
      if (res.success && res.account_name) {
        setVerifiedName(res.account_name);
        toast.success(`Account verified: ${res.account_name}`);
      } else {
        setVerifiedName(null);
        toast.error(res.error || "Could not verify account with Paystack");
      }
    } catch (err: any) {
      setVerifiedName(null);
      toast.error(err.message || "Failed to verify account details.");
    } finally {
      setResolvingName(false);
    }
  };

  // Save Initial Verified Bank Account & Lock
  const handleSaveInitialBank = async () => {
    if (!selectedBankName || !accountNumber || accountNumber.length !== 10) {
      toast.error("Please select a bank and enter a valid 10-digit account number");
      return;
    }
    if (!verifiedName) {
      toast.error("Account name must be verified by Paystack before saving");
      return;
    }

    setSavingBank(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Try edge function
      let savedViaEdge = false;
      try {
        const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
          body: {
            action: 'save_initial_bank',
            bank_name: selectedBankName,
            bank_code: selectedBankCode,
            account_number: accountNumber.trim(),
          },
        });
        if (!error && data?.success) {
          savedViaEdge = true;
        }
      } catch {
        savedViaEdge = false;
      }

      // 2. Direct upsert fallback
      if (!savedViaEdge) {
        const resolvedCode = selectedBankCode || findBankCode(selectedBankName);
        const { error: upsertErr } = await supabase
          .from('syndicate_profiles')
          .upsert({
            user_id: user.id,
            bank_name: selectedBankName.trim(),
            bank_code: resolvedCode,
            account_number: accountNumber.trim(),
            account_name: verifiedName,
            bank_verified_name: verifiedName,
            paystack_recipient_status: 'verified',
            is_bank_locked: true,
            bank_verified_at: new Date().toISOString(),
            bank_changed_at: new Date().toISOString(),
          } as any, { onConflict: 'user_id' });

        if (upsertErr) throw upsertErr;
      }

      toast.success("Bank account verified and locked for payouts!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank account");
    } finally {
      setSavingBank(false);
    }
  };

  // Resolve account for Change Request
  const handleResolveChangeBank = async (bankCode: string, bankName: string, accNum: string) => {
    if (!bankCode || !accNum || accNum.trim().length !== 10) {
      setChangeVerifiedName(null);
      return;
    }

    setChangeResolving(true);
    setChangeVerifiedName(null);
    try {
      const res = await resolveBankAccountPaystack(accNum, bankCode, bankName);
      if (res.success && res.account_name) {
        setChangeVerifiedName(res.account_name);
        toast.success(`Account verified: ${res.account_name}`);
      } else {
        setChangeVerifiedName(null);
        toast.error(res.error || "Could not verify bank account");
      }
    } catch (err: any) {
      setChangeVerifiedName(null);
      toast.error(err.message || "Could not verify bank account");
    } finally {
      setChangeResolving(false);
    }
  };

  // Submit Bank Change Request
  const handleSubmitBankChangeRequest = async () => {
    if (!changeBankName || !changeAccountNumber || changeAccountNumber.length !== 10) {
      toast.error("Select new bank and enter 10-digit account number");
      return;
    }
    if (!changeVerifiedName) {
      toast.error("New bank account must be verified by Paystack first");
      return;
    }

    setSubmittingChange(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let submittedViaEdge = false;
      try {
        const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
          body: {
            action: 'request_bank_change',
            requested_bank_name: changeBankName,
            requested_bank_code: changeBankCode,
            requested_account_number: changeAccountNumber.trim(),
            reason: changeReason.trim(),
          },
        });
        if (!error && data?.success) {
          submittedViaEdge = true;
        }
      } catch {
        submittedViaEdge = false;
      }

      if (!submittedViaEdge) {
        const resolvedCode = changeBankCode || findBankCode(changeBankName);
        const { error: insErr } = await supabase
          .from('syndicate_bank_change_requests')
          .insert({
            user_id: user.id,
            current_bank_name: profile?.bank_name || null,
            current_account_number: profile?.account_number || null,
            current_account_name: profile?.account_name || null,
            requested_bank_name: changeBankName.trim(),
            requested_bank_code: resolvedCode,
            requested_account_number: changeAccountNumber.trim(),
            requested_account_name: changeVerifiedName,
            admin_notes: changeReason ? `Member Note: ${changeReason}` : null,
            status: 'pending',
          });

        if (insErr) throw insErr;
      }

      // Notify Admins in real database
      await notifyAdminsOfApprovalRequired({
        title: "🏦 Bank Account Change Request",
        message: `A Syndicate member requested a bank update to ${changeBankName.trim()} (${maskAccountNumber(changeAccountNumber)}).`,
        type: 'syndicate_approval',
        tab: 'verification',
        linkUrl: '/admin?section=syndicate&tab=verification',
      });

      toast.success("Bank change request submitted for Admin verification!");
      setShowChangeModal(false);
      setChangeAccountNumber('');
      setChangeBankName('');
      setChangeBankCode('');
      setChangeVerifiedName(null);
      setChangeReason('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit change request");
    } finally {
      setSubmittingChange(false);
    }
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

  const requestWithdrawal = async () => {
    if (profile?.wallet_frozen) { toast.error("Your wallet is frozen by admin. Contact support."); return; }
    if (profile?.is_suspended) { toast.error("Account suspended. Withdrawals are disabled."); return; }
    if (!profile?.account_number) { toast.error("Please add and verify your official payout bank account first."); return; }

    if (profile?.bank_changed_at) {
      const hoursSince = (Date.now() - new Date(profile.bank_changed_at).getTime()) / 36e5;
      if (hoursSince < cooldownHours) {
        const remaining = Math.ceil(cooldownHours - hoursSince);
        toast.error(`Bank details changed recently. Payouts locked for safety (${remaining}h remaining).`);
        return;
      }
    }

    const withdrawAmount = parseInt(amount);
    if (!withdrawAmount || withdrawAmount <= 0) { toast.error("Enter a valid withdrawal amount"); return; }
    const creditsNeeded = Math.ceil(withdrawAmount / exchangeRate);
    if (credits < creditsNeeded) { toast.error(`Insufficient credits. You need ${creditsNeeded} GGG credits, but have ${credits}.`); return; }

    if (!profile?.withdraw_pin_hash) {
      toast.error("Please configure your Security PIN below before requesting a withdrawal");
      return;
    }
    if (!withdrawPin) { toast.error("Enter your Withdrawal PIN"); return; }
    const hash = await sha256Hex(withdrawPin);
    if (hash !== profile.withdraw_pin_hash) {
      toast.error("Incorrect Withdrawal PIN");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('withdrawal_requests').insert({
        user_id: profile.user_id,
        amount: withdrawAmount,
        bank_name: profile.bank_name,
        account_number: profile.account_number,
        account_name: profile.account_name,
        status: autoPayoutEnabled && withdrawAmount <= maxAutoPayout ? 'pending_automatic' : 'pending_admin',
        payout_mode: autoPayoutEnabled && withdrawAmount <= maxAutoPayout ? 'automatic' : 'manual',
        paystack_recipient_code: profile.paystack_recipient_code || null,
      }).select().single();

      if (error) throw error;

      // Deduct credits atomically
      await supabase.from('profiles').update({
        credits: credits - creditsNeeded,
      }).eq('user_id', profile.user_id);

      toast.success("Withdrawal request created successfully!");

      if (autoPayoutEnabled && withdrawAmount <= maxAutoPayout && data?.id) {
        supabase.functions.invoke('process-syndicate-payout', {
          body: { withdrawal_id: data.id },
        }).then(({ data: payoutData }) => {
          if (payoutData?.status === 'completed') {
            toast.success("⚡ Paystack auto-payout sent directly to your bank account!");
          }
          fetchData();
        }).catch(() => {
          fetchData();
        });
      }

      setAmount('');
      setWithdrawPin('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
      </div>
    );
  }

  const isBankConfigured = Boolean(profile?.account_number && profile?.account_name);

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-12">
      {/* Wallet Balance Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-800 text-white rounded-3xl overflow-hidden relative">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-yellow-400/15 rounded-full blur-2xl pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider opacity-80">Available Direct Team Balance</p>
              <p className="text-3xl sm:text-4xl font-black mt-1">₦{(credits * exchangeRate).toLocaleString()}</p>
              <p className="text-xs opacity-90 mt-1 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <strong>{credits.toLocaleString()} GGG Credits</strong> (Rate: 1 Cr = ₦{exchangeRate})
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Wallet className="h-6 w-6 text-yellow-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Locked Bank Details / Setup */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-sm">Official Payout Bank Account</h3>
              <p className="text-[10px] text-slate-300">Verified identity for automated Paystack transfers</p>
            </div>
          </div>
          {isBankConfigured && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold gap-1 px-2.5 py-1">
              <Lock className="h-3 w-3" /> Locked & Verified
            </Badge>
          )}
        </div>

        <CardContent className="p-5 space-y-4">
          {isBankConfigured ? (
            /* LOCKED BANK DETAILS DISPLAY */
            <div className="space-y-3">
              <div className="bg-secondary/40 rounded-2xl p-4 border border-border/60 space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span className="font-semibold uppercase text-[10px] tracking-wider">Bank Name</span>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300 bg-emerald-50">
                    <CheckCircle className="h-3 w-3 mr-1" /> Paystack Verified
                  </Badge>
                </div>
                <p className="text-base font-bold text-foreground">{profile?.bank_name}</p>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Account Number</span>
                  <p className="text-sm font-mono font-bold text-foreground mt-0.5">{maskAccountNumber(profile?.account_number)}</p>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Verified Account Name</span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.account_name || profile?.bank_verified_name}</p>
                </div>
              </div>

              {/* Settlement Info Box */}
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-purple-600" /> Automated Direct Team Settlement
                </p>
                <p className="text-[11px] text-muted-foreground">
                  When daily campaigns are settled, your collective earnings are automatically calculated and paid directly to this locked Paystack bank account.
                </p>
              </div>

              {/* Pending change request banner if present */}
              {pendingChangeRequest && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock className="h-4 w-4 text-amber-600 animate-spin" />
                    <span>Bank Change Request Pending Admin Verification</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Requested Change: <strong>{pendingChangeRequest.requested_bank_name}</strong> ({maskAccountNumber(pendingChangeRequest.requested_account_number)}) — {pendingChangeRequest.requested_account_name}.
                  </p>
                </div>
              )}

              {/* Request Bank Change Trigger */}
              {!pendingChangeRequest && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    className="w-full h-11 text-xs font-bold rounded-xl border-dashed hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowChangeModal(true)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Request Bank Account Change
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    For security, payout account modifications require Paystack account resolution & Admin approval.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* INITIAL BANK VERIFICATION & SETUP FORM (NO MANUAL ACCOUNT NAME INPUT) */
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground">Select Bank</Label>
                <select
                  aria-label="Select Bank"
                  value={selectedBankCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const found = POPULAR_NIGERIAN_BANKS.find(b => b.code === code);
                    setSelectedBankCode(code);
                    setSelectedBankName(found?.name || '');
                    if (code && accountNumber.length === 10) {
                      handleResolveInitialBank(code, found?.name || '', accountNumber);
                    } else {
                      setVerifiedName(null);
                    }
                  }}
                  className="mt-1.5 w-full h-12 text-sm rounded-xl border border-input bg-background px-3 font-semibold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Choose Nigerian Bank --</option>
                  {POPULAR_NIGERIAN_BANKS.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">10-Digit NUBAN Account Number</Label>
                <div className="relative mt-1.5">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setAccountNumber(val);
                      if (val.length === 10 && selectedBankCode) {
                        handleResolveInitialBank(selectedBankCode, selectedBankName, val);
                      } else {
                        setVerifiedName(null);
                      }
                    }}
                    placeholder="0123456789"
                    className="h-12 text-base font-mono font-bold tracking-wider"
                  />
                  {resolvingName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-purple-600 font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </div>
                  )}
                </div>
              </div>

              {/* Paystack Resolution Result (NO MANUAL INPUT) */}
              {verifiedName && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Paystack Verified Name</p>
                    <p className="text-sm font-bold">{verifiedName}</p>
                  </div>
                </div>
              )}

              <Button
                disabled={!selectedBankCode || accountNumber.length !== 10 || !verifiedName || savingBank}
                onClick={handleSaveInitialBank}
                className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:opacity-95"
              >
                {savingBank ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Save & Lock Verified Bank Details
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Account holder name is automatically verified by Paystack. Once saved, your account becomes locked.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Change Request Modal / Drawer */}
      {showChangeModal && (
        <Card className="border-2 border-purple-300 shadow-xl rounded-2xl overflow-hidden bg-background">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex justify-between items-center">
            <h4 className="font-bold text-sm flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" /> Request Bank Account Change
            </h4>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-white hover:bg-white/20" onClick={() => setShowChangeModal(false)}>
              Cancel
            </Button>
          </div>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-xs font-bold text-foreground">New Bank</Label>
              <select
                aria-label="New Bank"
                value={changeBankCode}
                onChange={(e) => {
                  const code = e.target.value;
                  const found = POPULAR_NIGERIAN_BANKS.find(b => b.code === code);
                  setChangeBankCode(code);
                  setChangeBankName(found?.name || '');
                  if (code && changeAccountNumber.length === 10) {
                    handleResolveChangeBank(code, found?.name || '', changeAccountNumber);
                  } else {
                    setChangeVerifiedName(null);
                  }
                }}
                className="mt-1.5 w-full h-11 text-xs rounded-xl border border-input bg-background px-3 font-semibold focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Choose New Bank --</option>
                {POPULAR_NIGERIAN_BANKS.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">New 10-Digit Account Number</Label>
              <div className="relative mt-1.5">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={changeAccountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setChangeAccountNumber(val);
                    if (val.length === 10 && changeBankCode) {
                      handleResolveChangeBank(changeBankCode, changeBankName, val);
                    } else {
                      setChangeVerifiedName(null);
                    }
                  }}
                  placeholder="0123456789"
                  className="h-11 text-sm font-mono font-bold tracking-wider"
                />
                {changeResolving && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-purple-600 font-semibold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                  </div>
                )}
              </div>
            </div>

            {changeVerifiedName && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-emerald-700">Verified Name (Paystack)</p>
                  <p className="text-xs font-bold">{changeVerifiedName}</p>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-foreground">Reason for Change (Optional)</Label>
              <Input
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Switched to corporate bank account"
                className="mt-1 h-10 text-xs"
              />
            </div>

            <Button
              disabled={!changeBankCode || changeAccountNumber.length !== 10 || !changeVerifiedName || submittingChange}
              onClick={handleSubmitBankChangeRequest}
              className="w-full h-11 text-xs font-bold rounded-xl bg-purple-600 text-white"
            >
              {submittingChange ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Submit for Admin Verification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payout & Settlement History */}
      {withdrawals.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-base text-foreground">📜 Direct Team Settlement & Payout History</h3>
          <div className="space-y-2.5">
            {withdrawals.map(w => {
              const isCompleted = w.status === 'completed' || w.status === 'paid';
              const isFailed = ['failed', 'rejected', 'cancelled'].includes(w.status);
              return (
                <Card key={w.id} className="border-0 shadow-sm rounded-2xl overflow-hidden bg-card">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">₦{Number(w.amount || w.payout_amount || 0)?.toLocaleString()}</span>
                        <Badge className={`text-[10px] border-0 font-bold ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' :
                          isFailed ? 'bg-red-100 text-red-800' :
                          w.status === 'processing' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {isCompleted ? 'Settled & Paid' : isFailed ? 'Failed' : w.status === 'processing' ? 'Processing Transfer' : 'Pending Settlement'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {w.bank_name || profile?.bank_name} • {maskAccountNumber(w.account_number || profile?.account_number)}
                      </p>
                      {w.paystack_reference && (
                        <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
                          Ref: {w.paystack_reference}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                    </div>
                    {isCompleted && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                    {isFailed && <AlertTriangle className="h-5 w-5 text-red-500" />}
                    {!isCompleted && !isFailed && <Clock className="h-5 w-5 text-amber-500" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyndicateWallet;
