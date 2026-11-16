import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
  Zap,
  Lock,
  ExternalLink,
  RefreshCw,
  ClipboardCheck,
  Megaphone,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { playRewardSound } from '@/lib/soundEffects';
import {
  dispatchActivationUpdated,
  fetchActivationSnapshot,
} from '@/hooks/useActivationStatus';

interface ActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string | null;
  feeAmount?: number;
  bonusCredits?: number;
  onActivated?: (newCredits?: number) => void;
}

const UNLOCKED_POWERS = [
  {
    icon: ClipboardCheck,
    title: 'Accept & Submit Credit Tasks',
    desc: 'Unlock unlimited daily social & status tasks for steady GGG & Naira rewards.',
  },
  {
    icon: Megaphone,
    title: 'Publish Posts & Ad Campaigns',
    desc: 'Share community posts, blog articles, banner adverts, and paid tasks.',
  },
  {
    icon: Users,
    title: 'Join Syndicate Campaigns',
    desc: 'Apply as a verified promoter and participate in high-paying brand jobs.',
  },
  {
    icon: Wallet,
    title: 'Request Naira Withdrawals',
    desc: 'Cash out approved earnings directly to your verified Nigerian bank account.',
  },
];

const ActivationModal: React.FC<ActivationModalProps> = ({
  open,
  onOpenChange,
  actionLabel,
  feeAmount = 1000,
  bonusCredits = 200,
  onActivated,
}) => {
  const [initiating, setInitiating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      stopPolling();
      setInitiating(false);
      setVerifying(false);
      setCheckoutUrl(null);
      setPaymentRef(null);
    }
    return () => stopPolling();
  }, [open]);

  const handleSuccess = async (newCredits?: number) => {
    stopPolling();
    setInitiating(false);
    setVerifying(false);
    try {
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
      });
      playRewardSound();
    } catch {
      // Optional feedback
    }

    await fetchActivationSnapshot(true);
    dispatchActivationUpdated({ activated: true, newCredits });
    toast.success(
      `🎉 Account Activated! +${bonusCredits.toLocaleString()} GGG Starter Credits added to your wallet!`
    );
    onActivated?.(newCredits);
    onOpenChange(false);
  };

  const verifyReference = async (ref: string, silent = false) => {
    if (!ref) return false;
    if (!silent) setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference: ref },
      });

      if (!error && data?.success) {
        await handleSuccess(data?.new_credits);
        return true;
      }

      if (!silent) {
        toast.info(
          'Payment not confirmed yet. Complete checkout in your Paystack tab and tap Verify again.'
        );
      }
      return false;
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.message || 'Could not verify payment right now.');
      }
      return false;
    } finally {
      if (!silent) setVerifying(false);
    }
  };

  const openCheckoutTab = (url: string) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleStartActivation = async () => {
    setInitiating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first to activate your account.');
        setInitiating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          amount: feeAmount,
          email: user.email,
          type: 'user_activation',
          metadata: {
            user_id: user.id,
            bonus_credits: bonusCredits,
            callback_url: window.location.origin,
          },
        },
      });

      if (error || !data?.authorization_url) {
        throw new Error(error?.message || data?.error || 'Could not initialize Paystack checkout');
      }

      setCheckoutUrl(data.authorization_url);
      setPaymentRef(data.reference);

      openCheckoutTab(data.authorization_url);
      toast.success('Paystack checkout opened — complete your ₦' + feeAmount.toLocaleString() + ' activation and return here.');

      stopPolling();
      pollRef.current = setInterval(async () => {
        await verifyReference(data.reference, true);
      }, 4500);

      timeoutRef.current = setTimeout(() => {
        stopPolling();
      }, 180000);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to launch Paystack activation checkout.');
    } finally {
      setInitiating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-orange-500/30 bg-[#0c0f16] text-white rounded-3xl shadow-2xl">
        {/* Top Glow Banner */}
        <div className="relative bg-gradient-to-br from-[#e67e22] via-orange-600 to-amber-700 px-5 pt-6 pb-5 overflow-hidden">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-12 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl pointer-events-none" />

          <div className="relative space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-black/30 hover:bg-black/30 text-amber-100 border border-white/25 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5">
                <Lock className="h-3 w-3 mr-1" />
                One-Time Account Activation
              </Badge>
              <Badge className="bg-emerald-500/25 hover:bg-emerald-500/25 text-emerald-100 border border-emerald-300/40 text-[10px] font-bold px-2.5 py-0.5">
                Instant Unlock
              </Badge>
            </div>

            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-amber-200 shrink-0" />
                Activate Account &amp; Claim Starter Pack
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-orange-50/90 leading-relaxed">
                {actionLabel
                  ? `Activate once to ${actionLabel} — and unlock every earning & promotion tool on GGD Ad Network.`
                  : 'Complete a one-time onboarding verification to protect genuine earners & advertisers and receive your instant GGG starter pack.'}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Fee vs Instant Bonus Strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                One-Time Activation Fee
              </p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">
                ₦{feeAmount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Lifetime verified access</p>
            </div>

            <div className="rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 to-amber-500/10 p-3.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Instant Starter Reward
              </p>
              <p className="text-2xl font-black text-amber-300 mt-1 tabular-nums">
                +{bonusCredits.toLocaleString()} GGG Credits
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Credited immediately after payment
              </p>
            </div>
          </div>

          {/* 4 Unlocked Powers */}
          <div className="rounded-2xl border border-white/10 bg-[#141923] p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              What You Unlock Immediately
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {UNLOCKED_POWERS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 p-2.5"
                  >
                    <div className="h-7 w-7 rounded-lg bg-[#e67e22]/20 border border-[#e67e22]/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-snug">{item.title}</p>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Paystack Checkout Helper Banner */}
          {checkoutUrl && paymentRef && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                  <span>Waiting for Paystack confirmation…</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300/80 truncate max-w-[130px]">
                  {paymentRef}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-amber-400/50 bg-black/30 hover:bg-black/50 text-xs font-bold text-amber-200 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Paystack Page
                </a>
                <Button
                  type="button"
                  size="sm"
                  disabled={verifying}
                  onClick={() => verifyReference(paymentRef, false)}
                  className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  I&apos;ve Paid — Verify Now
                </Button>
              </div>
            </div>
          )}

          {/* Primary CTA & Secondary Explore */}
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              onClick={handleStartActivation}
              disabled={initiating}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#e67e22] via-orange-500 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm shadow-lg shadow-orange-500/25 border-0"
            >
              {initiating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting to Paystack...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2 text-yellow-200" />
                  Pay ₦{feeAmount.toLocaleString()} &amp; Activate Now
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full h-9 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Continue Exploring First
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Secured by Paystack · Automated instant verification &amp; bonus credit</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivationModal;
