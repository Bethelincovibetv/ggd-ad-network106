import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  Wallet,
  History,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Copy,
  Coins,
  Search,
  Sparkles,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  verifyRecipient,
  executeTransfer,
  getTransferHistory,
  VerifiedRecipient,
  TransferRecord,
} from "@/services/transferService";

interface CreditTransferProps {
  credits: number;
  onCreditsUpdate: (credits: number) => void;
  isPremium: boolean;
}

type TransferStep = 'recipient' | 'amount' | 'review' | 'success';

const CreditTransfer = ({ credits, onCreditsUpdate, isPremium }: CreditTransferProps) => {
  // Step State
  const [step, setStep] = useState<TransferStep>('recipient');

  // Input & Verification State
  const [recipientInput, setRecipientInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedRecipient, setVerifiedRecipient] = useState<VerifiedRecipient | null>(null);
  const [verificationConfirmed, setVerificationConfirmed] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Amount State
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(100);

  // Execution & Receipt State
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    transferId: string;
    amount: number;
    recipient: VerifiedRecipient;
    timestamp: string;
    newBalance: number;
  } | null>(null);

  // History & User State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Channel ref for cleanup
  const channelRef = useRef<any>(null);

  // Fetch exchange rate and current user
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user && isMounted) {
        setCurrentUserId(authData.user.id);
        loadHistory(authData.user.id);
        setupRealtimeSubscription(authData.user.id);
      }

      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'credit_exchange_rate')
        .maybeSingle();

      const rate = parseInt(setting?.value || '100', 10);
      if (rate > 0 && isMounted) setExchangeRate(rate);
    })();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const loadHistory = async (uid: string) => {
    setLoadingHistory(true);
    const records = await getTransferHistory(uid);
    setHistory(records);
    setLoadingHistory(false);
  };

  const setupRealtimeSubscription = (uid: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`wallet-transfers-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transfers',
        },
        async (payload) => {
          const newRow = payload.new as any;
          if (newRow.sender_id === uid || newRow.receiver_id === uid) {
            // Reload history to get enriched profile info
            const updated = await getTransferHistory(uid);
            setHistory(updated);

            // If we are the receiver, fetch latest balance from profile
            if (newRow.receiver_id === uid) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('credits')
                .eq('user_id', uid)
                .maybeSingle();
              if (prof && typeof prof.credits === 'number') {
                onCreditsUpdate(prof.credits);
                toast.success(`You received ${newRow.amount} GGG credits!`);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const updatedProf = payload.new as any;
          if (updatedProf && typeof updatedProf.credits === 'number') {
            onCreditsUpdate(updatedProf.credits);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  // Recipient Verification Handler
  const handleVerify = async () => {
    if (!recipientInput.trim()) {
      setVerificationError('Enter an email, username, or referral code.');
      return;
    }

    setVerifying(true);
    setVerificationError(null);
    setVerifiedRecipient(null);
    setVerificationConfirmed(false);

    const result = await verifyRecipient(recipientInput, currentUserId || undefined);

    setVerifying(false);
    if (!result.success || !result.recipient) {
      setVerificationError(result.error || 'Recipient not found');
      return;
    }

    setVerifiedRecipient(result.recipient);
  };

  // Confirm Recipient and move to Amount step
  const handleConfirmRecipient = () => {
    if (!verifiedRecipient) return;
    setVerificationConfirmed(true);
    setStep('amount');
  };

  // Cancel Recipient and reset
  const handleCancelRecipient = () => {
    setVerifiedRecipient(null);
    setVerificationConfirmed(false);
    setVerificationError(null);
    setStep('recipient');
  };

  // Amount change with validation
  const parsedAmount = parseInt(amount, 10) || 0;
  const remainingBalance = credits - parsedAmount;
  const nairaEquivalent = parsedAmount * exchangeRate;

  const handleProceedToReview = () => {
    if (parsedAmount <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }
    if (parsedAmount > credits) {
      toast.error(`Insufficient balance. You only have ${credits} credits.`);
      return;
    }
    setStep('review');
  };

  // Execute Transfer
  const handleExecuteTransfer = async () => {
    if (!verifiedRecipient) return;
    if (parsedAmount <= 0 || parsedAmount > credits) {
      toast.error('Invalid transfer amount.');
      return;
    }

    setSubmitting(true);
    const result = await executeTransfer(verifiedRecipient, parsedAmount);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Transfer failed. Please try again.');
      return;
    }

    // Success! Update local state
    if (result.newBalance !== undefined) {
      onCreditsUpdate(result.newBalance);
    } else {
      onCreditsUpdate(credits - parsedAmount);
    }

    setLastReceipt({
      transferId: result.transferId || `tx-${Date.now()}`,
      amount: parsedAmount,
      recipient: verifiedRecipient,
      timestamp: result.timestamp || new Date().toISOString(),
      newBalance: result.newBalance ?? (credits - parsedAmount),
    });

    toast.success(`Successfully sent ${parsedAmount} credits to ${verifiedRecipient.displayName}!`);
    setStep('success');

    // Refresh history
    if (currentUserId) {
      loadHistory(currentUserId);
    }
  };

  const handleResetFlow = () => {
    setStep('recipient');
    setRecipientInput('');
    setVerifiedRecipient(null);
    setVerificationConfirmed(false);
    setVerificationError(null);
    setAmount('');
    setLastReceipt(null);
  };

  const copyReceiptDetails = () => {
    if (!lastReceipt) return;
    const text = `GGD Transfer Receipt\nRef: ${lastReceipt.transferId}\nRecipient: ${lastReceipt.recipient.displayName} (${lastReceipt.recipient.username})\nAmount: ${lastReceipt.amount} GGG Credits (≈ ₦${(lastReceipt.amount * exchangeRate).toLocaleString()})\nDate: ${new Date(lastReceipt.timestamp).toLocaleString()}\nStatus: Completed ✓`;
    navigator.clipboard.writeText(text);
    toast.success('Transfer receipt copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      {/* Wallet Balance Summary Card */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Available Transferable Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{credits.toLocaleString()}</span>
                <span className="text-xs font-semibold text-muted-foreground">credits</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] bg-orange-500/5 text-orange-600 border-orange-200">
            ₦{exchangeRate}/credit
          </Badge>
        </div>

        {isPremium && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Premium Verified: P2P credit transfers are instant and 100% free of platform surcharge.</span>
          </div>
        )}
      </div>

      {/* Main Interactive Transfer Card */}
      <Card className="border-border/80 shadow-md overflow-hidden">
        {/* Step Indicator Header */}
        <div className="bg-muted/40 px-4 py-2.5 border-b border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
              step === 'recipient' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>1</span>
            <span className={step === 'recipient' ? 'font-bold text-foreground' : 'text-muted-foreground'}>Recipient</span>

            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />

            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
              step === 'amount' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>2</span>
            <span className={step === 'amount' ? 'font-bold text-foreground' : 'text-muted-foreground'}>Amount</span>

            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />

            <span className={`flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
              step === 'review' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
            }`}>3</span>
            <span className={step === 'review' ? 'font-bold text-foreground' : 'text-muted-foreground'}>Confirm</span>
          </div>

          {step !== 'recipient' && step !== 'success' && (
            <button
              onClick={handleCancelRecipient}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        <CardContent className="p-4 space-y-4">
          {/* STEP 1: RECIPIENT VERIFICATION */}
          {step === 'recipient' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="recipient-input" className="text-xs font-semibold text-foreground">
                  Step 1: Enter Recipient Identifier
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Search by GGD email, username/slug, or referral code.
                </p>

                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recipient-input"
                      value={recipientInput}
                      onChange={(e) => {
                        setRecipientInput(e.target.value);
                        setVerificationError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerify();
                        }
                      }}
                      placeholder="e.g. bethelgoodgift3@gmail.com or @goodgift"
                      className="pl-9 h-11 text-sm rounded-xl"
                      disabled={verifying}
                    />
                  </div>
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || !recipientInput.trim()}
                    className="h-11 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        Verify
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Verification Error */}
              {verificationError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              {/* Verified Recipient Card */}
              {verifiedRecipient && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Recipient Found
                    </span>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-600">
                      {verifiedRecipient.accountStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border/60">
                    <Avatar className="h-12 w-12 border-2 border-emerald-500/30">
                      <AvatarImage src={verifiedRecipient.avatarUrl || undefined} alt={verifiedRecipient.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-base">
                        {verifiedRecipient.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-foreground truncate">{verifiedRecipient.displayName}</h4>
                      <p className="text-xs font-semibold text-emerald-600">{verifiedRecipient.username}</p>
                      {verifiedRecipient.memberSince && (
                        <p className="text-[10px] text-muted-foreground">Member since {verifiedRecipient.memberSince}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-medium text-foreground text-center pt-1">
                    Is this the person you want to send credits to?
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={handleCancelRecipient}
                      className="h-10 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmRecipient}
                      className="h-10 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                    >
                      Confirm Recipient <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: AMOUNT ENTRY */}
          {step === 'amount' && verifiedRecipient && (
            <div className="space-y-4">
              {/* Compact Recipient Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={verifiedRecipient.avatarUrl || undefined} />
                    <AvatarFallback className="bg-orange-500 text-white text-xs font-bold">
                      {verifiedRecipient.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{verifiedRecipient.displayName}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold">{verifiedRecipient.username}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep('recipient')}
                  className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  Change
                </Button>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount-input" className="text-xs font-semibold text-foreground">
                    Step 2: Enter Credits Amount
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Balance: <span className="font-bold text-foreground">{credits} cr</span>
                  </span>
                </div>

                <div className="relative">
                  <Input
                    id="amount-input"
                    type="number"
                    min="1"
                    max={credits}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="h-14 text-2xl font-black rounded-xl pr-16"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-muted-foreground pointer-events-none">
                    Credits
                  </div>
                </div>

                {/* Naira Preview */}
                {parsedAmount > 0 && (
                  <p className="text-xs font-medium text-muted-foreground flex items-center justify-between px-1">
                    <span>≈ ₦{nairaEquivalent.toLocaleString()} NGN</span>
                    <span className={remainingBalance < 0 ? 'text-destructive font-bold' : 'text-emerald-600 font-medium'}>
                      Remaining after: {remainingBalance.toLocaleString()} cr
                    </span>
                  </p>
                )}

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] font-bold text-muted-foreground mr-1 uppercase">Quick:</span>
                  {[10, 25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      disabled={preset > credits}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                        amount === String(preset)
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : preset > credits
                          ? 'opacity-40 cursor-not-allowed bg-muted/40 border-transparent text-muted-foreground'
                          : 'bg-secondary/70 hover:bg-secondary border-border/50 text-foreground'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(String(credits))}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border-orange-200"
                  >
                    Max ({credits})
                  </button>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('recipient')}
                  className="h-11 rounded-xl text-xs font-semibold"
                >
                  Back
                </Button>
                <Button
                  onClick={handleProceedToReview}
                  disabled={parsedAmount <= 0 || parsedAmount > credits}
                  className="h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20"
                >
                  Review Transfer <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CONFIRM */}
          {step === 'review' && verifiedRecipient && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transfer Review</p>
                <h3 className="text-xl font-black text-foreground mt-0.5">Confirm Details</h3>
              </div>

              {/* Review Summary Breakdown */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3">
                {/* Recipient info */}
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Recipient</span>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">{verifiedRecipient.displayName}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold">{verifiedRecipient.username}</p>
                  </div>
                </div>

                {/* Amount info */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Transfer Amount</span>
                  <div className="text-right">
                    <span className="text-base font-black text-foreground">{parsedAmount.toLocaleString()} credits</span>
                    <p className="text-[10px] text-muted-foreground">≈ ₦{nairaEquivalent.toLocaleString()}</p>
                  </div>
                </div>

                {/* Transfer Fee */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Transfer Fee</span>
                  <span className="font-semibold text-emerald-600">Free (0 credits)</span>
                </div>

                {/* Total deduction */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs font-bold text-foreground">Total Deduction</span>
                  <span className="text-base font-black text-orange-600">{parsedAmount.toLocaleString()} credits</span>
                </div>

                {/* Remaining balance */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 text-muted-foreground">
                  <span>Remaining Balance</span>
                  <span className="font-bold text-foreground">{remainingBalance.toLocaleString()} credits</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => setStep('amount')}
                  disabled={submitting}
                  className="h-12 rounded-xl text-xs font-semibold"
                >
                  Edit Amount
                </Button>
                <Button
                  onClick={handleExecuteTransfer}
                  disabled={submitting}
                  className="h-12 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white shadow-lg shadow-orange-500/25"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Confirm & Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS RECEIPT */}
          {step === 'success' && lastReceipt && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px] font-bold">
                  Transfer Successful
                </Badge>
                <h3 className="text-2xl font-black text-foreground mt-2">
                  {lastReceipt.amount.toLocaleString()} Credits Sent
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Transferred to <span className="font-bold text-foreground">{lastReceipt.recipient.displayName}</span> ({lastReceipt.recipient.username})
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference ID:</span>
                  <span className="font-mono text-[11px] font-semibold truncate max-w-[180px]">{lastReceipt.transferId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span>{new Date(lastReceipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value in NGN:</span>
                  <span className="font-semibold">≈ ₦{(lastReceipt.amount * exchangeRate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="font-bold text-foreground">Updated Balance:</span>
                  <span className="font-black text-foreground">{lastReceipt.newBalance.toLocaleString()} credits</span>
                </div>
              </div>

              {/* Receipt Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={copyReceiptDetails}
                  className="h-11 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Receipt
                </Button>
                <Button
                  onClick={handleResetFlow}
                  className="h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white"
                >
                  New Transfer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Realtime Transaction History */}
      <Card className="border-border/80 shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Recent Transfer History</h4>
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live updates
          </span>
        </div>

        <CardContent className="p-3">
          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> Loading transfers...
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent transfers yet. Verified transfers will appear here in realtime.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((record) => {
                const isSent = record.direction === 'sent';
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSent
                            ? 'bg-orange-500/10 text-orange-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {isSent ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {isSent ? `To: ${record.counterpartyName}` : `From: ${record.counterpartyName}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(record.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <span
                        className={`text-xs font-black ${
                          isSent ? 'text-foreground' : 'text-emerald-600'
                        }`}
                      >
                        {isSent ? '-' : '+'}{record.amount.toLocaleString()} cr
                      </span>
                      <p className="text-[10px] font-semibold text-emerald-600">✓ Completed</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditTransfer;
