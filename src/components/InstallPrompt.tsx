import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, X, Share, Sparkles, Smartphone, ShieldCheck, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { playNotificationChime } from "@/utils/audio";

const SNOOZE_KEY = 'ggd-install-snooze-until';
const SNOOZE_HOURS = 6; // Prompt every 6h if dismissed, to ensure mobile users install

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // @ts-ignore iOS WebKit standalone flag
    window.navigator.standalone === true
  );
};

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
};

export const triggerAppInstall = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ggd-trigger-install'));
  }
};

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isInstalledState, setIsInstalledState] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalledState(true);
      return;
    }

    const checkPromptNeeded = () => {
      const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      const snoozed = snoozeUntil && Date.now() < snoozeUntil;
      return !snoozed && !isStandalone();
    };

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (checkPromptNeeded()) {
        setShowPrompt(true);
      }
    };

    const handleCustomTrigger = () => {
      if (isIOS()) {
        setShowIosHelp(true);
        setShowPrompt(true);
      } else if (deferredPrompt) {
        setShowPrompt(true);
      } else {
        toast.info("If your browser doesn't prompt automatically, tap the menu (⋮) and choose 'Install App' or 'Add to Home Screen'.");
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalledState(true);
      setShowPrompt(false);
      playNotificationChime();
      toast.success("🎉 GGD Ad Network App installed successfully! Welcome to the standalone experience.");
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('ggd-trigger-install', handleCustomTrigger);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check: if on mobile, display after 2.5 seconds if not snoozed
    const t = setTimeout(() => {
      if (checkPromptNeeded()) {
        setShowPrompt(true);
      }
    }, 2500);

    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('ggd-trigger-install', handleCustomTrigger);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIOS()) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback instructions if browser already intercepted
      toast.info("Tap the browser menu (⋮) in the top-right and select 'Install App' or 'Add to Home Screen'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        toast.success("Installing GGD Ad Network app...");
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("Install prompt error:", err);
    }
  };

  const snooze = () => {
    setShowPrompt(false);
    setShowIosHelp(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_HOURS * 3600 * 1000));
  };

  if (isInstalledState || !showPrompt) return null;

  return (
    <>
      {/* iOS Step-by-Step Instructions Modal */}
      {showIosHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-card border-2 border-orange-500/80 p-6 shadow-2xl relative text-card-foreground">
            <button
              onClick={() => setShowIosHelp(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/30">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-base leading-tight">Install on iPhone & iPad</h3>
                <p className="text-xs text-muted-foreground">Add to Home Screen in 3 seconds</p>
              </div>
            </div>

            <div className="space-y-3 my-4 bg-muted/40 p-3.5 rounded-2xl border border-border/60 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">1</div>
                <p className="leading-snug pt-0.5">
                  Tap the <Share className="inline h-3.5 w-3.5 mx-1 text-blue-500 font-bold" /> <strong>Share</strong> button at the bottom of Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">2</div>
                <p className="leading-snug pt-0.5">
                  Scroll down and tap <strong>"Add to Home Screen"</strong> (with the ➕ icon).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">3</div>
                <p className="leading-snug pt-0.5">
                  Tap <strong>"Add"</strong> in the top right corner. Done!
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowIosHelp(false)}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black shadow-lg shadow-orange-500/25"
            >
              Got It!
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom App Installation Banner */}
      <aside
        aria-label="Install GGD Ad Network App"
        className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 rounded-3xl bg-neutral-950/95 text-white border-2 border-orange-500/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_4px_16px_rgba(234,88,12,0.35)] backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-300"
      >
        <button
          onClick={snooze}
          className="absolute top-3 right-3 p-1 rounded-full text-neutral-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 p-0.5 shadow-lg shadow-orange-500/40 flex items-center justify-center">
              <img src="/favicon.png" alt="GGD Logo" className="h-10 w-10 object-contain rounded-xl" />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-neutral-950">
              PWA
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-black text-white tracking-tight">
                Install GGD Ad Network
              </h4>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                <Sparkles className="h-2.5 w-2.5" /> Faster & Offline
              </span>
            </div>

            <p className="text-xs text-neutral-300 mt-1 leading-snug">
              Instant task updates, smooth navigation & direct home screen access.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/30 gap-1.5 flex-1"
              >
                <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                {isIOS() ? 'Install on iPhone' : 'Install App Now'}
              </Button>

              <button
                type="button"
                onClick={snooze}
                className="text-[11px] font-medium text-neutral-400 hover:text-white px-2 py-1.5 rounded-lg"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default InstallPrompt;
