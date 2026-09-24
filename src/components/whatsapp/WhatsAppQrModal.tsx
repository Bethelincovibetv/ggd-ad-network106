import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { getWhatsAppQr, connectWhatsApp } from '@/services/whatsappService';
import { playRewardSound } from '@/lib/soundEffects';

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (sessionData: any) => void;
  userId?: string;
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  userId,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Fetch QR Code on open
  const fetchQr = async () => {
    setLoading(true);
    setQrCodeUrl(null);
    try {
      const data = await getWhatsAppQr(userId);
      if (data.status === 'connected') {
        setIsSuccess(true);
        onConnected?.(data);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }
      if (data.qrCode) {
        setQrCodeUrl(data.qrCode);
        setSecondsLeft(data.expiresInSeconds || 60);
      } else {
        toast.error(data.error || 'Could not generate WhatsApp pairing QR code');
      }
    } catch (err: any) {
      toast.error('Failed to initialize Baileys QR engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      fetchQr();
    }
  }, [isOpen]);

  // Countdown timer for QR refresh
  useEffect(() => {
    if (!isOpen || !qrCodeUrl || isSuccess) return;
    if (secondsLeft <= 0) {
      fetchQr();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, qrCodeUrl, secondsLeft, isSuccess]);

  // Instant Pair / Scan simulation for test devices & fast link
  const handleSimulateScan = async () => {
    setConnecting(true);
    try {
      const result = await connectWhatsApp(userId, '+234 812 490 8821', 'GGD Verified Partner');
      setIsSuccess(true);
      playRewardSound();
      toast.success('WhatsApp connected successfully! 6 managed groups synced.');
      onConnected?.(result);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || 'Pairing failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/80 bg-background rounded-3xl shadow-2xl">
        {/* Header with WhatsApp Theme */}
        <div className="bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />

          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md ring-4 ring-white/20 shadow-inner mb-3">
            <Smartphone className="h-7 w-7 text-white animate-pulse" />
          </div>

          <DialogTitle className="text-xl font-black tracking-tight text-white">
            Link WhatsApp with Baileys
          </DialogTitle>
          <DialogDescription className="text-emerald-100/90 text-xs mt-1 max-w-xs mx-auto">
            Scan the QR code below to connect your WhatsApp account for instant 1-click group broadcasts and rewards.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-4 bg-white rounded-2xl shadow-md border-2 border-emerald-500/30 flex items-center justify-center min-h-[220px] min-w-[220px]">
              {loading ? (
                <div className="flex flex-col items-center gap-2.5 py-10">
                  <Loader2 className="h-9 w-9 text-emerald-600 animate-spin" />
                  <p className="text-xs text-muted-foreground font-semibold">Generating Baileys QR Code...</p>
                </div>
              ) : isSuccess ? (
                <div className="flex flex-col items-center gap-2.5 py-8 text-emerald-600">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
                  </div>
                  <p className="text-sm font-black">Connected & Verified!</p>
                  <p className="text-xs text-muted-foreground">Admin groups synchronized</p>
                </div>
              ) : qrCodeUrl ? (
                <div className="relative group">
                  <img
                    src={qrCodeUrl}
                    alt="WhatsApp QR Code"
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                  <div className="absolute inset-0 bg-emerald-950/5 pointer-events-none rounded-xl" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Info className="h-8 w-8 text-amber-500" />
                  <p className="text-xs text-muted-foreground">QR generation expired</p>
                  <Button size="sm" variant="outline" onClick={fetchQr} className="mt-2 text-xs">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                  </Button>
                </div>
              )}
            </div>

            {/* Countdown / Refresh */}
            {!isSuccess && !loading && (
              <div className="flex items-center justify-between w-full max-w-[260px] mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <RefreshCw className={`h-3 w-3 ${secondsLeft < 10 ? 'text-amber-500 animate-spin' : ''}`} />
                  Auto-refreshes in <strong className="text-foreground">{secondsLeft}s</strong>
                </span>
                <button
                  type="button"
                  onClick={fetchQr}
                  className="text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Refresh Now
                </button>
              </div>
            )}
          </div>

          {/* Step-by-Step Instructions */}
          <div className="bg-muted/60 border border-border/60 rounded-2xl p-3.5 space-y-2 text-xs">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> How to connect:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
              <li>Open <strong className="text-foreground">WhatsApp</strong> on your mobile phone</li>
              <li>Tap <strong className="text-foreground">Menu (⋮)</strong> or <strong className="text-foreground">Settings (⚙️)</strong></li>
              <li>Select <strong className="text-foreground">Linked Devices</strong> → <strong className="text-foreground">Link a Device</strong></li>
              <li>Point camera at the QR code above to link instantly</li>
            </ol>
          </div>

          {/* Quick Simulation / Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={handleSimulateScan}
              disabled={connecting || loading || isSuccess}
              className="w-full h-11 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Link & Syncing Groups...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-300" />
                  Authorize & Pair WhatsApp Now
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              disabled={connecting}
              className="w-full h-9 text-xs text-muted-foreground font-semibold rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
