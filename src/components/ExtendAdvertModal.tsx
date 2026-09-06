import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Coins, CreditCard, Sparkles, CheckCircle2, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { playRewardSound } from "@/lib/soundEffects";

export interface ExtendableAd {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_url: string;
  expires_at?: string | null;
  is_active?: boolean | null;
  budget_credits?: number | null;
}

interface ExtendAdvertModalProps {
  ad: ExtendableAd | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userCredits: number;
  onSuccess: (updatedAd: ExtendableAd) => void;
  onCreditsUpdate?: (newCredits: number) => void;
}

const EXTENSION_PACKAGES = [
  { days: 3, credits: 300, naira: 3000, label: "3 Days", badge: null },
  { days: 7, credits: 600, naira: 6000, label: "7 Days", badge: "Most Popular" },
  { days: 14, credits: 1100, naira: 11000, label: "14 Days", badge: "Save 10%" },
  { days: 30, credits: 2200, naira: 22000, label: "30 Days", badge: "Best Value" },
];

export const ExtendAdvertModal: React.FC<ExtendAdvertModalProps> = ({
  ad,
  open,
  onOpenChange,
  userCredits,
  onSuccess,
  onCreditsUpdate,
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'paystack'>('credits');
  const [processing, setProcessing] = useState(false);

  if (!ad) return null;

  const currentPkg = EXTENSION_PACKAGES.find(p => p.days === selectedDays) || EXTENSION_PACKAGES[1];
  const hasEnoughCredits = userCredits >= currentPkg.credits;

  const handleExtend = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to extend your campaign.");
        setProcessing(false);
        return;
      }

      if (paymentMethod === 'credits') {
        if (!hasEnoughCredits) {
          toast.error(`Insufficient credits. You need ${currentPkg.credits} credits but have ${userCredits}.`);
          setProcessing(false);
          return;
        }

        // Deduct credits from user profile
        const newCredits = Math.max(0, userCredits - currentPkg.credits);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('user_id', user.id);

        if (profileError) {
          throw new Error(profileError.message || "Failed to deduct credits.");
        }

        // Calculate new expiration date (always from right now)
        const newExpiresAt = new Date(Date.now() + currentPkg.days * 86400000).toISOString();
        const newBudget = (ad.budget_credits || 0) + currentPkg.credits;

        // Update the existing ad record
        const { error: adError } = await supabase
          .from('ads')
          .update({
            expires_at: newExpiresAt,
            is_active: true,
            budget_credits: newBudget,
          })
          .eq('id', ad.id);

        if (adError) {
          throw new Error(adError.message || "Failed to update campaign expiration.");
        }

        // Notify user with audio & visual celebration
        playRewardSound();
        toast.success(`🎉 Campaign "${ad.title}" extended by ${currentPkg.days} days!`);

        const updatedAd: ExtendableAd = {
          ...ad,
          expires_at: newExpiresAt,
          is_active: true,
          budget_credits: newBudget,
        };

        onCreditsUpdate?.(newCredits);
        onSuccess(updatedAd);
        onOpenChange(false);
      } else {
        // Paystack flow for direct cash renewal
        const { data: initData, error: initError } = await supabase.functions.invoke('paystack-init', {
          body: {
            amount: currentPkg.naira,
            purpose: `Extend Advert: ${ad.title} (${currentPkg.days} days)`,
            metadata: {
              ad_id: ad.id,
              days: currentPkg.days,
              type: 'ad_extension'
            }
          }
        });

        if (initError || !initData?.authorization_url) {
          // Fallback or message
          toast.info("Paystack gateway initialized. If redirection does not occur, please use wallet credits.");
          if (initData?.authorization_url) {
            window.location.href = initData.authorization_url;
          }
        } else {
          window.location.href = initData.authorization_url;
        }
      }
    } catch (err: any) {
      console.error("Ad extension failed:", err);
      toast.error(err.message || "Failed to extend campaign. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-5 max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">Extend Advert Campaign</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Keep your existing campaign active without recreating it from scratch.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Existing Advert Summary Card */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
          <div className="flex gap-3 items-center">
            {ad.image_url ? (
              <img
                src={ad.image_url}
                alt={ad.title}
                className="w-16 h-16 rounded-lg object-cover border border-border/60 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold text-xs shrink-0">
                AD
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-sm text-foreground truncate">{ad.title}</h4>
                <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 font-semibold">
                  Expired
                </Badge>
              </div>
              {ad.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ad.description}</p>
              )}
              <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium truncate mt-1 flex items-center gap-1">
                <ExternalLink className="h-3 w-3 inline" /> {ad.target_url}
              </p>
            </div>
          </div>
        </div>

        {/* Extension Duration Packages */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Choose Extension Duration
          </Label>
          <div className="grid grid-cols-2 gap-2.5">
            {EXTENSION_PACKAGES.map(pkg => {
              const selected = selectedDays === pkg.days;
              return (
                <button
                  key={pkg.days}
                  type="button"
                  onClick={() => setSelectedDays(pkg.days)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    selected
                      ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  {pkg.badge && (
                    <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-xs">
                      {pkg.badge}
                    </span>
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{pkg.label}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />}
                    </div>
                    <p className="text-xs font-black text-orange-600 dark:text-orange-400 mt-1">
                      {pkg.credits.toLocaleString()} Credits
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    or ₦{pkg.naira.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-2.5">
          <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
            Payment Method
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('credits')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                paymentMethod === 'credits'
                  ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <Coins className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">Wallet Credits</p>
                <p className="text-[11px] text-muted-foreground">Balance: {userCredits.toLocaleString()}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('paystack')}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                paymentMethod === 'paystack'
                  ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <CreditCard className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground">Paystack Card</p>
                <p className="text-[11px] text-muted-foreground">Debit / Bank / USSD</p>
              </div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={handleExtend}
            disabled={processing || (paymentMethod === 'credits' && !hasEnoughCredits)}
            className="w-full h-11 text-sm font-bold rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing Extension...
              </>
            ) : paymentMethod === 'credits' && !hasEnoughCredits ? (
              `Insufficient Credits (${userCredits}/${currentPkg.credits})`
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Confirm & Extend for {currentPkg.days} Days
              </>
            )}
          </Button>

          {paymentMethod === 'credits' && !hasEnoughCredits && (
            <p className="text-center text-[11px] text-orange-600 dark:text-orange-400 mt-2 font-medium">
              Tip: Switch to Paystack or complete daily tasks to top up your wallet credits.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendAdvertModal;
