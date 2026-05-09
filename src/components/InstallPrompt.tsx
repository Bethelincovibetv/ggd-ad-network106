import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

const SNOOZE_KEY = 'ggd-install-snooze-until';
const SNOOZE_HOURS = 12; // Re-prompt every 12h until installed

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // @ts-ignore iOS
    window.navigator.standalone === true
  );
};

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed

    const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    const snoozed = snoozeUntil && Date.now() < snoozeUntil;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!snoozed) setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari has no beforeinstallprompt — show manual instructions
    if (isIOS() && !snoozed) {
      const t = setTimeout(() => setShowPrompt(true), 4000);
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler); };
    }

    // If event already fired and not snoozed, force show after a tick
    if (!snoozed) {
      const t = setTimeout(() => { if (!isStandalone()) setShowPrompt(prev => prev || !!deferredPrompt); }, 1500);
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler); };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (isIOS()) { setShowIosHelp(true); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const snooze = () => {
    setShowPrompt(false);
    setShowIosHelp(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_HOURS * 3600 * 1000));
  };

  if (!showPrompt) return null;

  if (showIosHelp) {
    return (
      <div className="fixed bottom-16 left-4 right-4 z-50 bg-card border-2 border-orange-400 rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 max-w-md mx-auto">
        <button onClick={snooze} className="absolute top-2 right-2 text-muted-foreground"><X className="h-4 w-4" /></button>
        <p className="font-bold text-sm mb-2">Install on iPhone / iPad</p>
        <ol className="text-xs space-y-1.5 text-muted-foreground list-decimal list-inside">
          <li>Tap the <Share className="inline h-3.5 w-3.5 mx-0.5" /> Share icon in Safari</li>
          <li>Scroll and tap <strong>Add to Home Screen</strong></li>
          <li>Tap <strong>Add</strong> in the top right</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 max-w-md mx-auto">
      <button onClick={snooze} aria-label="Snooze" className="absolute top-2 right-2"><X className="h-4 w-4" /></button>
      <div className="flex items-center gap-3">
        <Download className="h-8 w-8 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm">Install GGD Ad Network</p>
          <p className="text-[11px] opacity-90">Faster, works offline, like a real app</p>
        </div>
        <Button onClick={install} size="sm" className="bg-white text-orange-600 hover:bg-gray-100 text-xs font-bold">
          Install
        </Button>
      </div>
    </div>
  );
};

export default InstallPrompt;
