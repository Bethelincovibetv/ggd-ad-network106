import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Download, X, Share, Sparkles, Smartphone, ShieldCheck, CheckCircle2, ChevronRight, Minus, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { playNotificationChime } from "@/utils/audio";

const SNOOZE_KEY = 'ggd-install-snooze-until';
const INSTALLED_KEY = 'ggd_pwa_installed';
const DISMISSED_KEY = 'ggd-install-dismissed-permanent';
const MINIMIZED_KEY = 'ggd-install-minimized';
const SNOOZE_HOURS = 72; // If dismissed, snooze for 3 days

export const isAppInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Explicitly recorded install in localStorage
  if (localStorage.getItem(INSTALLED_KEY) === 'true') {
    return true;
  }

  // 2. Display mode checks (Desktop PWA, Android Chrome PWA, Edge PWA)
  const isDisplayStandalone = 
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches;

  if (isDisplayStandalone) {
    localStorage.setItem(INSTALLED_KEY, 'true');
    return true;
  }

  // 3. iOS WebKit standalone flag
  // @ts-ignore
  if (window.navigator?.standalone === true) {
    localStorage.setItem(INSTALLED_KEY, 'true');
    return true;
  }

  // 4. Android TWA / app wrapper referrer
  if (typeof document !== 'undefined' && document.referrer?.includes('android-app://')) {
    localStorage.setItem(INSTALLED_KEY, 'true');
    return true;
  }

  return false;
};

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
};

export const triggerAppInstall = () => {
  if (typeof window !== 'undefined') {
    if (isAppInstalled()) {
      toast.success("GGD Ad Network is already installed on your device! 🚀", {
        description: "You're running the best app experience."
      });
      return;
    }
    window.dispatchEvent(new CustomEvent('ggd-trigger-install'));
  }
};

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(MINIMIZED_KEY) === 'true';
  });
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isInstalledState, setIsInstalledState] = useState<boolean>(() => isAppInstalled());
  const hasTriggeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If already installed, never attach listeners or show prompts
    if (isAppInstalled()) {
      setIsInstalledState(true);
      setShowPrompt(false);
      return;
    }

    const checkPromptNeeded = () => {
      if (isAppInstalled()) return false;
      if (localStorage.getItem(DISMISSED_KEY) === 'true') return false;
      if (sessionStorage.getItem('ggd_install_session_dismissed') === 'true') return false;
      const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      const snoozed = snoozeUntil && Date.now() < snoozeUntil;
      return !snoozed;
    };

    const handler = (e: Event) => {
      e.preventDefault();
      if (isAppInstalled()) return;
      setDeferredPrompt(e);
      if (checkPromptNeeded() && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setShowPrompt(true);
      }
    };

    const handleCustomTrigger = () => {
      localStorage.removeItem(DISMISSED_KEY);
      sessionStorage.removeItem('ggd_install_session_dismissed');
      localStorage.removeItem(MINIMIZED_KEY);
      setIsMinimized(false);
      if (isAppInstalled()) {
        setIsInstalledState(true);
        setShowPrompt(false);
        return;
      }
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
      localStorage.setItem(INSTALLED_KEY, 'true');
      setIsInstalledState(true);
      setShowPrompt(false);
      setShowIosHelp(false);
      setIsMinimized(false);
      localStorage.removeItem(MINIMIZED_KEY);
      setDeferredPrompt(null);
      playNotificationChime();
      toast.success("🎉 GGD Ad Network App installed successfully! Welcome to the standalone experience.");
    };

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(INSTALLED_KEY, 'true');
        setIsInstalledState(true);
        setShowPrompt(false);
        setShowIosHelp(false);
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('ggd-trigger-install', handleCustomTrigger);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (!hasTriggeredRef.current && checkPromptNeeded()) {
      hasTriggeredRef.current = true;
      timerRef.current = setTimeout(() => {
        if (checkPromptNeeded()) {
          setShowPrompt(true);
        }
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('ggd-trigger-install', handleCustomTrigger);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isAppInstalled()) {
      setIsInstalledState(true);
      setShowPrompt(false);
      return;
    }

    if (isIOS()) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) {
      toast.info("Tap the browser menu (⋮) in the top-right and select 'Install App' or 'Add to Home Screen'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, 'true');
        setIsInstalledState(true);
        setShowPrompt(false);
        setShowIosHelp(false);
        setIsMinimized(false);
        localStorage.removeItem(MINIMIZED_KEY);
        toast.success("Installing GGD Ad Network app...");
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("Install prompt error:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosHelp(false);
    setIsMinimized(false);
    sessionStorage.setItem('ggd_install_session_dismissed', 'true');
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_HOURS * 3600 * 1000));
    localStorage.setItem(DISMISSED_KEY, 'true');
    localStorage.removeItem(MINIMIZED_KEY);
  };

  const handleMinimize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsMinimized(true);
    localStorage.setItem(MINIMIZED_KEY, 'true');
  };

  const handleRestore = () => {
    setIsMinimized(false);
    localStorage.removeItem(MINIMIZED_KEY);
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
              className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black shadow-lg shadow-orange-500/25 cursor-pointer"
            >
              Got It!
            </Button>
          </div>
        </div>
      )}

      {/* Minimized Floating Pill Mode */}
      {isMinimized ? (
        <aside
          aria-label="Minimized install prompt"
          className="fixed bottom-20 sm:bottom-6 right-3 z-40 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-1.5 bg-neutral-950/95 border border-orange-500/60 rounded-full py-1.5 pl-2.5 pr-1.5 shadow-xl backdrop-blur-md text-white text-xs font-bold hover:border-orange-400 transition-all">
            <button
              onClick={handleRestore}
              className="flex items-center gap-2 hover:text-orange-300 transition-colors"
              title="Expand Install Banner"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-[10px] animate-pulse">
                <Download className="h-3 w-3" />
              </div>
              <span>Install App</span>
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
      ) : (
        /* Floating Bottom App Installation Banner */
        <aside
          aria-label="Install GGD Ad Network App"
          className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 rounded-3xl bg-neutral-950/95 text-white border-2 border-orange-500/70 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_4px_16px_rgba(234,88,12,0.35)] backdrop-blur-xl animate-in slide-in-from-bottom-6 duration-200"
        >
          {/* Minimize & Close Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Minimize install banner"
              title="Minimize banner"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Dismiss install prompt"
              title="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

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
            <div className="flex-1 min-w-0 pr-12">
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
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/30 gap-1.5 flex-1 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                  {isIOS() ? 'Install on iPhone' : 'Install App Now'}
                </Button>

                <button
                  type="button"
                  onClick={handleMinimize}
                  className="text-[11px] font-semibold text-orange-300 hover:text-orange-200 px-2 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
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
      )}
    </>
  );
};

export default InstallPrompt;
