import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Sparkles, X, Gift, CheckCircle2, ShieldCheck, Zap, Minus, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { registerPushNotification } from "@/services/pushNotificationService";
import { supabase } from "@/integrations/supabase/client";
import { playMoneyTransferSound, playNotificationChime } from "@/utils/audio";

const NOTIF_SNOOZE_KEY = 'ggd-notif-prompt-snooze-until';
const NOTIF_DISMISSED_KEY = 'ggd-notif-prompt-dismissed-permanent';
const NOTIF_MINIMIZED_KEY = 'ggd-notif-prompt-minimized';
const SNOOZE_HOURS = 72; // Don't annoy user for 3 days if dismissed
const BONUS_CREDITS = 50;

export const triggerPushNotificationPrompt = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ggd-trigger-notif-prompt'));
  }
};

interface PushNotificationPromptProps {
  userId?: string;
  onCreditReward?: (creditsAdded: number) => void;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  userId: propUserId,
  onCreditReward,
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(NOTIF_MINIMIZED_KEY) === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(propUserId);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Check if notifications are supported and permitted
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      setPermissionGranted(true);
      return;
    }

    if (Notification.permission === 'denied') {
      // Browser strictly blocked; do not show intrusive banner
      return;
    }

    // Resolve user id if not provided
    const resolveUser = async () => {
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      }
    };
    resolveUser();

    const checkShouldShow = () => {
      const isPermanentlyDismissed = localStorage.getItem(NOTIF_DISMISSED_KEY) === 'true';
      if (isPermanentlyDismissed) return false;

      const isSessionDismissed = sessionStorage.getItem('ggd_push_session_dismissed') === 'true';
      if (isSessionDismissed) return false;

      const snoozeUntil = Number(localStorage.getItem(NOTIF_SNOOZE_KEY) || 0);
      const isSnoozed = snoozeUntil && Date.now() < snoozeUntil;
      const alreadyAccepted = localStorage.getItem('ggd_push_registered') === 'true';
      return !isSnoozed && !alreadyAccepted && Notification.permission === 'default';
    };

    if (!hasTriggeredRef.current && checkShouldShow()) {
      hasTriggeredRef.current = true;
      timerRef.current = setTimeout(() => {
        if (checkShouldShow()) {
          setShowPrompt(true);
        }
      }, 3500);
    }

    const handleCustomPromptTrigger = () => {
      localStorage.removeItem(NOTIF_DISMISSED_KEY);
      sessionStorage.removeItem('ggd_push_session_dismissed');
      localStorage.removeItem(NOTIF_MINIMIZED_KEY);
      setIsMinimized(false);
      setShowPrompt(true);
    };

    window.addEventListener('ggd-trigger-notif-prompt', handleCustomPromptTrigger);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('ggd-trigger-notif-prompt', handleCustomPromptTrigger);
    };
  }, []); // Run once on mount to avoid continuous re-trigger loops

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      let uid = currentUserId;
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) uid = user.id;
      }

      const res = await registerPushNotification(uid);
      if (res.success) {
        setPermissionGranted(true);
        setShowPrompt(false);
        setIsMinimized(false);
        localStorage.removeItem(NOTIF_MINIMIZED_KEY);
        playMoneyTransferSound();

        // Award bonus credits if authenticated
        if (uid) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('credits')
              .eq('user_id', uid)
              .maybeSingle();

            if (profile) {
              const newBal = (profile.credits || 0) + BONUS_CREDITS;
              await supabase
                .from('profiles')
                .update({ 
                  credits: newBal,
                  has_push_enabled: true 
                } as any)
                .eq('user_id', uid);

              try {
                await supabase.from('credit_transactions').insert({
                  user_id: uid,
                  amount: BONUS_CREDITS,
                  type: 'bonus',
                  description: '🎁 Push Notification Opt-in Bonus (+50 Credits)',
                });
              } catch {}
            }
          } catch (err) {
            console.warn('Bonus credit attribution note:', err);
          }
        }

        if (onCreditReward) {
          onCreditReward(BONUS_CREDITS);
        }

        toast.success(`🎉 Push Notifications Enabled! You received +${BONUS_CREDITS} Free Credits!`, {
          duration: 5000,
        });
      } else {
        if (res.error?.includes('denied')) {
          toast.error("Notification permission was denied. You can enable it in your browser settings anytime.");
          handleDismiss();
        } else {
          toast.error(res.error || "Could not enable push notifications");
        }
      }
    } catch (error: any) {
      console.error("Push prompt error:", error);
      toast.error(error?.message || "Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsMinimized(false);
    sessionStorage.setItem('ggd_push_session_dismissed', 'true');
    localStorage.setItem(NOTIF_SNOOZE_KEY, String(Date.now() + SNOOZE_HOURS * 3600 * 1000));
    localStorage.setItem(NOTIF_DISMISSED_KEY, 'true');
    localStorage.removeItem(NOTIF_MINIMIZED_KEY);
  };

  const handleMinimize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMinimized(true);
    localStorage.setItem(NOTIF_MINIMIZED_KEY, 'true');
  };

  const handleRestore = () => {
    setIsMinimized(false);
    localStorage.removeItem(NOTIF_MINIMIZED_KEY);
  };

  if (permissionGranted || !showPrompt) return null;

  // Minimized state: Small, non-intrusive floating pill that never seizes or blocks the screen
  if (isMinimized) {
    return (
      <aside
        aria-label="Minimized notification badge"
        className="fixed top-20 right-3 z-40 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center gap-1.5 bg-neutral-950/95 border border-amber-500/60 rounded-full py-1.5 pl-2.5 pr-1.5 shadow-xl backdrop-blur-md text-white text-xs font-bold hover:border-amber-400 transition-all">
          <button
            onClick={handleRestore}
            className="flex items-center gap-2 hover:text-amber-300 transition-colors"
            title="Expand Notification Prompt"
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-[10px] animate-pulse">
              <Bell className="h-3 w-3" />
            </div>
            <span>Claim +50 Credits</span>
            <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Dismiss completely"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Notification Permission Prompt"
      className="fixed top-20 sm:top-24 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 rounded-3xl bg-neutral-950/95 text-white border-2 border-amber-500/80 p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_4px_20px_rgba(245,158,11,0.35)] backdrop-blur-xl animate-in slide-in-from-top-6 duration-200"
    >
      {/* Minimize and Close Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <button
          onClick={handleMinimize}
          className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Minimize notification prompt"
          title="Minimize notification"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Dismiss notification prompt"
          title="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-start gap-3.5">
        {/* Animated 3D Bell Badge */}
        <div className="relative flex-shrink-0">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 animate-pulse">
            <Bell className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-neutral-950 flex items-center gap-0.5">
            +50 <Gift className="h-2 w-2" />
          </span>
        </div>

        {/* Text Copy */}
        <div className="flex-1 min-w-0 pr-12">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-black text-white tracking-tight">
              Get Free Credits & Real-Time Alerts
            </h4>
          </div>

          <p className="text-xs text-neutral-300 mt-1 leading-snug">
            Turn on notifications to get instant alerts for high-earning tasks, credit transfers & daily contact gain files. <strong className="text-amber-300">Claim +50 Credits instantly!</strong>
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3.5">
            <Button
              onClick={handleEnableNotifications}
              disabled={loading}
              size="sm"
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-orange-500/30 gap-1.5 flex-1 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  Allow & Claim +50 Credits
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={handleMinimize}
              className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
            >
              Minimise
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] font-medium text-neutral-400 hover:text-white px-2 py-1.5 rounded-lg"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default PushNotificationPrompt;

