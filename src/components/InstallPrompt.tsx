import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('ggd-install-dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ggd-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-4">
      <button onClick={dismiss} className="absolute top-2 right-2"><X className="h-4 w-4" /></button>
      <div className="flex items-center gap-3">
        <Download className="h-8 w-8 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-sm">Install GGD Ad Network</p>
          <p className="text-[11px] opacity-90">Get the full app experience on your device</p>
        </div>
        <Button onClick={install} size="sm" className="bg-white text-orange-600 hover:bg-gray-100 text-xs font-bold">
          Install
        </Button>
      </div>
    </div>
  );
};

export default InstallPrompt;
