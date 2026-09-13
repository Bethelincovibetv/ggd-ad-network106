import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Wallet,
  Clock,
  CheckCircle,
  Loader2,
  Zap,
  AlertTriangle,
  Lock,
  RefreshCw,
  Building2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Copy,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  KeyRound,
  Shield,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { POPULAR_NIGERIAN_BANKS, fetchNigerianBanks, findBankCode, NigerianBank } from "@/utils/nigerianBanks";
import {
  resolveBankAccountPaystack,
  registerPaystackSubaccount,
  directUpdateSyndicateSubaccountWithPin,
  hashSecurityPin,
  verifySecurityPin
} from "@/utils/paystackBank";
import { notifyAdminsOfApprovalRequired } from "@/services/adminNotificationHelper";

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
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [reVerifyingName, setReVerifyingName] = useState(false);

  // Bank directory
  const [bankList, setBankList] = useState<NigerianBank[]>(POPULAR_NIGERIAN_BANKS);

  // Initial Bank Setup State
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [selectedBankName, setSelectedBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [resolvingName, setResolvingName] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState(false);

  // Direct Sub-Account Update (PIN-Gated) State
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directBankCode, setDirectBankCode] = useState('');
  const [directBankName, setDirectBankName] = useState('');
  const [directAccountNumber, setDirectAccountNumber] = useState('');
  const [directAccountNameInput, setDirectAccountNameInput] = useState('');
  const [directResolving, setDirectResolving] = useState(false);
  const [directVerifiedName, setDirectVerifiedName] = useState<string | null>(null);
  const [directPin, setDirectPin] = useState('');
  const [directConfirmPin, setDirectConfirmPin] = useState('');
  const [showDirectPin, setShowDirectPin] = useState(false);
  const [updatingDirectSubaccount, setUpdatingDirectSubaccount] = useState(false);

  // Security PIN Management State
  const [showPinManagementModal, setShowPinManagementModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Bank Change Request State (Fallback)
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeBankCode, setChangeBankCode] = useState('');
  const [changeBankName, setChangeBankName] = useState('');
  const [changeAccountNumber, setChangeAccountNumber] = useState('');
  const [changeAccountNameInput, setChangeAccountNameInput] = useState('');
  const [changeResolving, setChangeResolving] = useState(false);
  const [changeVerifiedName, setChangeVerifiedName] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);
  const [pendingChangeRequest, setPendingChangeRequest] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchNigerianBanks().then(list => {
      if (list && list.length > 0) {
        setBankList(list);
      }
    });
  }, []);

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

  // Resolve account name via Paystack with official NUBAN verification
  const handleResolveInitialBank = async (bankCode: string, bankName: string, accNum: string, overrideName?: string) => {
    if (!bankCode || !accNum || accNum.trim().length !== 10) {
      setVerifiedName(null);
      return;
    }

    setResolvingName(true);
    try {
      const res = await resolveBankAccountPaystack(accNum, bankCode, bankName, overrideName || accountNameInput);
      if (res.success && res.account_name) {
        setVerifiedName(res.account_name);
        setAccountNameInput(res.account_name);
        toast.success(`NUBAN Account Verified: ${res.account_name}`);
      } else {
        setVerifiedName(null);
        if (res.error) {
          toast.error(res.error);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Could not verify bank account with Paystack");
      setVerifiedName(null);
    } finally {
      setResolvingName(false);
    }
  };

  // Re-verify existing locked bank account name with Paystack in 1-click
  const handleReVerifyExistingBank = async () => {
    if (!profile?.account_number || !profile?.bank_name) return;
    setReVerifyingName(true);
    try {
      const code = findBankCode(profile.bank_name) || '';
      const res = await resolveBankAccountPaystack(profile.account_number, code, profile.bank_name);
      if (res.success && res.account_name) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('syndicate_profiles').update({
            account_name: res.account_name,
          } as any).eq('user_id', user.id);
          toast.success(`Official Paystack Verified Name Updated: ${res.account_name}`);
          fetchData();
        }
      } else {
        toast.error(res.error || 'Could not verify account name with Paystack.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify account name with Paystack.');
    } finally {
      setReVerifyingName(false);
    }
  };

  // Save Initial Verified Bank Account & Lock
  const handleSaveInitialBank = async () => {
    if (!selectedBankName || !accountNumber || accountNumber.length !== 10) {
      toast.error("Please select a bank and enter a valid 10-digit account number");
      return;
    }
    const finalAccountName = verifiedName || accountNameInput;
    if (!finalAccountName || !finalAccountName.trim()) {
      toast.error("Please verify account number with Paystack or enter registered account name");
      return;
    }

    setSavingBank(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const resolvedCode = selectedBankCode || findBankCode(selectedBankName) || '';

      // Direct clean upsert on existing syndicate_profiles columns
      const { error: upsertErr } = await supabase
        .from('syndicate_profiles')
        .upsert({
          user_id: user.id,
          bank_name: selectedBankName.trim(),
          account_number: accountNumber.trim(),
          account_name: finalAccountName.trim().toUpperCase(),
          is_bank_locked: true,
          bank_changed_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' });

      if (upsertErr) throw upsertErr;

      // Automatically register and sync Paystack Subaccount
      try {
        await registerPaystackSubaccount(
          user.id,
          resolvedCode,
          selectedBankName.trim(),
          accountNumber.trim(),
          finalAccountName.trim().toUpperCase()
        );
      } catch (subErr) {
        console.warn('Subaccount register notice:', subErr);
      }

      toast.success("Bank account successfully verified and locked for direct payouts!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank account");
    } finally {
      setSavingBank(false);
    }
  };

  const hasPinSet = Boolean(profile?.bank_pin_hash || profile?.withdraw_pin_hash);

  // Resolve bank account for Direct Sub-Account Update
  const handleResolveDirectBank = async (bankCode: string, bankName: string, accNum: string, overrideName?: string) => {
    if (!bankCode || !accNum || accNum.trim().length !== 10) {
      setDirectVerifiedName(null);
      return;
    }

    setDirectResolving(true);
    try {
      const res = await resolveBankAccountPaystack(accNum, bankCode, bankName, overrideName || directAccountNameInput);
      if (res.success && res.account_name) {
        setDirectVerifiedName(res.account_name);
        setDirectAccountNameInput(res.account_name);
        toast.success(`NUBAN Account Verified: ${res.account_name}`);
      } else {
        setDirectVerifiedName(null);
        if (res.error) {
          toast.error(res.error);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Could not verify bank account with Paystack");
      setDirectVerifiedName(null);
    } finally {
      setDirectResolving(false);
    }
  };

  // Execute Direct Paystack Sub-Account Update with PIN Gating
  const handleDirectSubaccountUpdate = async () => {
    if (!directBankName || !directAccountNumber || directAccountNumber.length !== 10) {
      toast.error("Select new bank and enter a valid 10-digit account number");
      return;
    }
    const finalName = directVerifiedName || directAccountNameInput;
    if (!finalName || !finalName.trim()) {
      toast.error("Please verify the account name with Paystack first");
      return;
    }

    if (!directPin || directPin.trim().length < 4) {
      toast.error("Please enter your 4-digit Security PIN to authorize this update");
      return;
    }

    if (!hasPinSet) {
      if (directPin !== directConfirmPin) {
        toast.error("PIN confirmation does not match. Please re-enter.");
        return;
      }
    }

    setUpdatingDirectSubaccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const resolvedCode = directBankCode || findBankCode(directBankName) || '';

      const res = await directUpdateSyndicateSubaccountWithPin({
        userId: user.id,
        bankCode: resolvedCode,
        bankName: directBankName.trim(),
        accountNumber: directAccountNumber.trim(),
        accountName: finalName.trim().toUpperCase(),
        pin: directPin.trim(),
        subaccountCode: profile?.paystack_subaccount_code,
        subaccountId: profile?.paystack_subaccount_id,
      });

      if (!res.success) {
        toast.error(res.error || "Sub-account update failed");
        return;
      }

      toast.success("⚡ Paystack Sub-Account & Bank Details updated successfully via PIN authorization!");
      setShowDirectModal(false);
      setDirectAccountNumber('');
      setDirectBankName('');
      setDirectBankCode('');
      setDirectVerifiedName(null);
      setDirectAccountNameInput('');
      setDirectPin('');
      setDirectConfirmPin('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update subaccount");
    } finally {
      setUpdatingDirectSubaccount(false);
    }
  };

  // Manage / Update Security PIN
  const handleSaveOrUpdatePin = async () => {
    if (newPinInput.length < 4) {
      toast.error("New PIN must be at least 4 digits");
      return;
    }
    if (newPinInput !== confirmNewPinInput) {
      toast.error("New PIN and confirmation do not match");
      return;
    }

    setSavingPin(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const storedHash = profile?.bank_pin_hash || profile?.withdraw_pin_hash;
      if (storedHash) {
        if (!currentPinInput) {
          toast.error("Please enter your current Security PIN to change it");
          setSavingPin(false);
          return;
        }
        const isValid = await verifySecurityPin(currentPinInput, storedHash);
        if (!isValid) {
          toast.error("Current PIN is incorrect");
          setSavingPin(false);
          return;
        }
      }

      const newHash = await hashSecurityPin(newPinInput);
      const { error: upErr } = await supabase
        .from('syndicate_profiles')
        .update({
          bank_pin_hash: newHash,
          withdraw_pin_hash: newHash,
        } as any)
        .eq('user_id', user.id);

      if (upErr) throw upErr;

      toast.success("Security PIN saved successfully!");
      setShowPinManagementModal(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmNewPinInput('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Security PIN");
    } finally {
      setSavingPin(false);
    }
  };

  // Resolve account for Change Request
  const handleResolveChangeBank = async (bankCode: string, bankName: string, accNum: string, overrideName?: string) => {
    if (!bankCode || !accNum || accNum.trim().length !== 10) {
      setChangeVerifiedName(null);
      return;
    }

    setChangeResolving(true);
    try {
      const res = await resolveBankAccountPaystack(accNum, bankCode, bankName, overrideName || changeAccountNameInput);
      if (res.success && res.account_name) {
        setChangeVerifiedName(res.account_name);
        setChangeAccountNameInput(res.account_name);
        toast.success(`NUBAN Account Verified: ${res.account_name}`);
      } else {
        setChangeVerifiedName(null);
        if (res.error) {
          toast.error(res.error);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Could not verify bank account with Paystack");
      setChangeVerifiedName(null);
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
    const finalChangeName = changeVerifiedName || changeAccountNameInput;
    if (!finalChangeName || !finalChangeName.trim()) {
      toast.error("New bank account name must be verified first");
      return;
    }

    setSubmittingChange(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insErr } = await supabase
        .from('syndicate_bank_change_requests')
        .insert({
          user_id: user.id,
          current_bank_name: profile?.bank_name || null,
          current_account_number: profile?.account_number || null,
          current_account_name: profile?.account_name || null,
          requested_bank_name: changeBankName.trim(),
          requested_account_number: changeAccountNumber.trim(),
          requested_account_name: finalChangeName.trim().toUpperCase(),
          reason: changeReason ? changeReason.trim() : null,
          admin_notes: changeReason ? `Promoter note: ${changeReason.trim()}` : null,
          status: 'pending',
        } as any);

      if (insErr) throw insErr;

      // Notify Admins in database
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
      </div>
    );
  }

  const isBankConfigured = Boolean(profile?.account_number && profile?.bank_name);
  const isFallbackName = profile?.account_name && (profile.account_name.includes('PROMOTER (') || profile.account_name.includes('CO-OWNER ('));

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
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden bg-card">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="font-bold text-sm">Official Syndicate Payout Bank Account</h3>
              <p className="text-[10px] text-slate-300">Verified NUBAN identity for automated Paystack transfers</p>
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
            <div className="space-y-4">
              <div className="bg-secondary/40 rounded-2xl p-4 border border-border/60 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground block">Bank Name</span>
                    <p className="text-base font-bold text-foreground mt-0.5">{profile?.bank_name}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                    <CheckCircle className="h-3 w-3 mr-1" /> Paystack Verified
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">NUBAN Account Number</span>
                    <p className="text-base font-mono font-bold text-foreground mt-0.5 tracking-wider">
                      {showFullAccount ? profile?.account_number : maskAccountNumber(profile?.account_number)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowFullAccount(!showFullAccount)}
                    >
                      {showFullAccount ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                      {showFullAccount ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (profile?.account_number) {
                          navigator.clipboard.writeText(profile.account_number);
                          toast.success('Account number copied to clipboard');
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Official Registered Account Name</span>
                    {isFallbackName && (
                      <Badge variant="outline" className="text-[9px] font-bold text-amber-600 border-amber-300 bg-amber-50">
                        Action Required
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className="text-base font-black text-foreground uppercase tracking-wide">
                      {profile?.account_name || '—'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reVerifyingName}
                      onClick={handleReVerifyExistingBank}
                      className="h-7 px-2.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 shrink-0"
                    >
                      {reVerifyingName ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                      {isFallbackName ? 'Verify NUBAN Name' : 'Refresh Name'}
                    </Button>
                  </div>
                </div>

                {profile?.paystack_subaccount_code && (
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Paystack Sub-Account</span>
                      <p className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 mt-0.5">{profile.paystack_subaccount_code}</p>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      <Check className="h-3 w-3 mr-1" /> Active for Direct Payouts
                    </Badge>
                  </div>
                )}

                {/* Security PIN Status */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4 text-purple-600" />
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Account Security PIN</span>
                      <p className="text-xs font-bold text-foreground">
                        {hasPinSet ? '4-Digit Security PIN Configured' : 'PIN Not Configured Yet'}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50"
                    onClick={() => {
                      setCurrentPinInput('');
                      setNewPinInput('');
                      setConfirmNewPinInput('');
                      setShowPinManagementModal(true);
                    }}
                  >
                    <KeyRound className="h-3 w-3 mr-1" />
                    {hasPinSet ? 'Change PIN' : 'Set PIN'}
                  </Button>
                </div>
              </div>

              {/* Settlement Info Box */}
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-purple-600" /> Automated Direct Team Settlement
                </p>
                <p className="text-[11px] text-muted-foreground">
                  When tasks and campaigns are approved, your earnings are automatically calculated and paid directly to this locked Paystack bank account.
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

              {/* Direct Sub-Account Update Trigger (PIN Gated) */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => {
                    setDirectBankCode('');
                    setDirectBankName('');
                    setDirectAccountNumber('');
                    setDirectAccountNameInput('');
                    setDirectVerifiedName(null);
                    setDirectPin('');
                    setDirectConfirmPin('');
                    setShowDirectModal(true);
                  }}
                  className="w-full h-12 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <Zap className="h-4 w-4 text-yellow-300" />
                  Direct Update Sub-Account & Bank (Instant with PIN)
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Update your payout sub-account directly using your 4-digit PIN. Instant execution via API without admin approval delay.
                </p>
              </div>
            </div>
          ) : (
            /* INITIAL BANK VERIFICATION & SETUP FORM */
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground">Select Nigerian Bank</Label>
                <select
                  aria-label="Select Bank"
                  value={selectedBankCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const found = bankList.find(b => b.code === code);
                    setSelectedBankCode(code);
                    setSelectedBankName(found?.name || '');
                    if (code && accountNumber.length === 10) {
                      handleResolveInitialBank(code, found?.name || '', accountNumber);
                    }
                  }}
                  className="mt-1.5 w-full h-12 text-sm rounded-xl border border-input bg-background px-3 font-semibold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Choose Nigerian Bank --</option>
                  {bankList.map(b => (
                    <option key={`${b.code}-${b.name}`} value={b.code}>{b.name}</option>
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
                    placeholder="e.g. 0123456789"
                    className="h-12 text-base font-mono font-bold tracking-wider"
                  />
                  {resolvingName && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-purple-600 font-semibold bg-background/80 px-2 py-1 rounded">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying with Paystack...
                    </div>
                  )}
                </div>
              </div>

              {/* Paystack Resolution Result Display */}
              {verifiedName ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3 animate-in fade-in">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Paystack Verified Account Name</p>
                    <p className="text-sm font-black text-foreground">{verifiedName}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-bold text-foreground">Account Holder Name</Label>
                  <div className="relative mt-1.5">
                    <Input
                      type="text"
                      value={accountNameInput}
                      onChange={(e) => setAccountNameInput(e.target.value)}
                      placeholder="Account name as registered on bank"
                      className="h-11 text-sm font-semibold"
                    />
                  </div>
                </div>
              )}

              {selectedBankCode && accountNumber.length === 10 && !verifiedName && !resolvingName && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveInitialBank(selectedBankCode, selectedBankName, accountNumber)}
                  className="w-full text-xs font-semibold h-9 rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Re-Verify NUBAN with Paystack
                </Button>
              )}

              <Button
                disabled={!selectedBankCode || accountNumber.length !== 10 || !(verifiedName || accountNameInput) || savingBank}
                onClick={handleSaveInitialBank}
                className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:opacity-95"
              >
                {savingBank ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                Save & Lock Verified Bank Details
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Account name is verified live via Paystack's NUBAN network. Once saved, details are locked for safe payouts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Direct Sub-Account Update Modal (PIN Gated) */}
      <Dialog open={showDirectModal} onOpenChange={setShowDirectModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card">
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 p-5 text-white">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Zap className="h-5 w-5 text-yellow-300" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-white">Direct Sub-Account Update</DialogTitle>
                <DialogDescription className="text-xs text-purple-100 mt-0.5">
                  Authorize with your Security PIN for instant execution
                </DialogDescription>
              </div>
            </div>

            {profile?.paystack_subaccount_code && (
              <div className="mt-3 bg-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs border border-white/10">
                <span className="text-[10px] text-purple-200 uppercase font-semibold">Current Sub-Account ID</span>
                <span className="font-mono font-bold text-white">{profile.paystack_subaccount_code}</span>
              </div>
            )}
          </div>

          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <Label className="text-xs font-bold text-foreground">Select Nigerian Bank</Label>
              <select
                aria-label="Select Direct Bank"
                value={directBankCode}
                onChange={(e) => {
                  const code = e.target.value;
                  const found = bankList.find(b => b.code === code);
                  setDirectBankCode(code);
                  setDirectBankName(found?.name || '');
                  if (code && directAccountNumber.length === 10) {
                    handleResolveDirectBank(code, found?.name || '', directAccountNumber);
                  }
                }}
                className="mt-1.5 w-full h-11 text-xs rounded-xl border border-input bg-background px-3 font-semibold focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Choose Nigerian Bank --</option>
                {bankList.map(b => (
                  <option key={`direct-${b.code}-${b.name}`} value={b.code}>{b.name}</option>
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
                  value={directAccountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDirectAccountNumber(val);
                    if (val.length === 10 && directBankCode) {
                      handleResolveDirectBank(directBankCode, directBankName, val);
                    } else {
                      setDirectVerifiedName(null);
                    }
                  }}
                  placeholder="e.g. 0123456789"
                  className="h-11 text-sm font-mono font-bold tracking-wider"
                />
                {directResolving && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-purple-600 font-semibold bg-background/80 px-2 py-1 rounded">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                  </div>
                )}
              </div>
            </div>

            {directVerifiedName ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Paystack Verified Name</p>
                  <p className="text-xs font-black text-foreground">{directVerifiedName}</p>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-bold text-foreground">Account Holder Name</Label>
                <Input
                  type="text"
                  value={directAccountNameInput}
                  onChange={(e) => setDirectAccountNameInput(e.target.value)}
                  placeholder="Official name on bank account"
                  className="mt-1 h-10 text-xs font-semibold"
                />
              </div>
            )}

            {/* Security PIN Authorization Gating */}
            <div className="pt-2 border-t border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-foreground">
                    {hasPinSet ? 'Enter 4-Digit Security PIN' : 'Create 4-Digit Security PIN'}
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {hasPinSet
                      ? 'Required to authorize direct sub-account update without admin delay'
                      : 'This PIN will protect your payout account against unauthorized changes'}
                  </p>
                </div>
              </div>

              <div className="relative">
                <Input
                  type={showDirectPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={directPin}
                  onChange={(e) => setDirectPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="h-11 text-center font-mono text-lg tracking-widest font-bold pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowDirectPin(!showDirectPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showDirectPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {!hasPinSet && (
                <div>
                  <Label className="text-xs font-bold text-foreground">Confirm Security PIN</Label>
                  <Input
                    type={showDirectPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={directConfirmPin}
                    onChange={(e) => setDirectConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="mt-1 h-11 text-center font-mono text-lg tracking-widest font-bold"
                  />
                </div>
              )}
            </div>

            <Button
              disabled={
                !directBankCode ||
                directAccountNumber.length !== 10 ||
                !(directVerifiedName || directAccountNameInput) ||
                directPin.length < 4 ||
                (!hasPinSet && directPin !== directConfirmPin) ||
                updatingDirectSubaccount
              }
              onClick={handleDirectSubaccountUpdate}
              className="w-full h-12 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all active:scale-[0.99]"
            >
              {updatingDirectSubaccount ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2 text-yellow-300" />
              )}
              Authorize & Update Sub-Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security PIN Setup / Management Modal */}
      <Dialog open={showPinManagementModal} onOpenChange={setShowPinManagementModal}>
        <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                {hasPinSet ? 'Change Security PIN' : 'Set Security PIN'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Protects payout sub-account and withdrawal actions
              </DialogDescription>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {hasPinSet && (
              <div>
                <Label className="text-xs font-bold text-foreground">Current 4-Digit PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="mt-1 h-11 text-center font-mono text-lg tracking-widest font-bold"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-foreground">
                {hasPinSet ? 'New 4-Digit PIN' : 'Enter 4-Digit PIN'}
              </Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="mt-1 h-11 text-center font-mono text-lg tracking-widest font-bold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">Confirm 4-Digit PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmNewPinInput}
                onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="mt-1 h-11 text-center font-mono text-lg tracking-widest font-bold"
              />
            </div>

            <Button
              disabled={
                newPinInput.length < 4 ||
                newPinInput !== confirmNewPinInput ||
                (hasPinSet && !currentPinInput) ||
                savingPin
              }
              onClick={handleSaveOrUpdatePin}
              className="w-full h-11 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
            >
              {savingPin ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Save Security PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout History */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Payout History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No payout requests yet. Earnings will appear here once tasks are settled.
            </div>
          ) : (
            <div className="space-y-2.5">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="p-3 rounded-xl border border-border/60 bg-secondary/20 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-sm text-foreground">₦{Number(w.amount).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {w.bank_name} • {maskAccountNumber(w.account_number)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    className={
                      w.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-600 border-emerald-300'
                        : w.status === 'rejected'
                        ? 'bg-red-500/20 text-red-600 border-red-300'
                        : 'bg-amber-500/20 text-amber-600 border-amber-300'
                    }
                  >
                    {w.status === 'completed' ? 'Paid' : w.status === 'rejected' ? 'Rejected' : 'Processing'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SyndicateWallet;
