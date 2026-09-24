import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Copy,
  Check,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getWhatsAppQr,
  getWhatsAppStatus,
  generateWhatsAppPairingCode,
  verifyWhatsAppPairingCode,
  connectWhatsApp,
} from '@/services/whatsappService';
import { playRewardSound } from '@/lib/soundEffects';

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (sessionData: any) => void;
  userId?: string;
  initialPhoneNumber?: string;
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  userId,
  initialPhoneNumber = '',
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'qr'>('code');
  const [loading, setLoading] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Pairing code states
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>(initialPhoneNumber || '+234 ');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState<boolean>(false);
  const [codeExpiresIn, setCodeExpiresIn] = useState<number>(180);

  // 1. Generate Direct Pairing Code (No Camera / No QR required)
  const handleGenerateCode = async () => {
    if (!phoneNumberInput || phoneNumberInput.trim().length < 8) {
      toast.error('Please enter a valid WhatsApp mobile number (e.g. +234 812 345 6789)');
      return;
    }

    setLoading(true);
    try {
      const data = await generateWhatsAppPairingCode(userId, phoneNumberInput.trim());
      if (data.status === 'connected') {
        setIsSuccess(true);
        onConnected?.(data);
        setTimeout(() => onClose(), 1200);
        return;
      }
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
        setCodeExpiresIn(data.expiresInSeconds || 180);
        toast.success(`Pairing code ${data.pairingCode} generated! Copy and enter in WhatsApp.`);
      } else {
        toast.error(data.error || 'Could not generate WhatsApp pairing code');
      }
    } catch (err: any) {
      toast.error('Failed to request pairing code from Baileys engine');
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Pairing Code Linking
  const handleConfirmPairing = async () => {
    setConnecting(true);
    try {
      const result = await verifyWhatsAppPairingCode(userId, pairingCode || undefined, phoneNumberInput);
      setIsSuccess(true);
      playRewardSound();
      toast.success('🎉 WhatsApp connected successfully! 6 managed groups synced.');
      onConnected?.(result);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      toast.error(err?.message || 'Verification failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  // 3. Fetch QR Code on QR tab open
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

  // Initial load
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setCodeCopied(false);
      if (!pairingCode) {
        handleGenerateCode();
      }
    }
  }, [isOpen]);

  // Real-time status poll while modal is open to automatically detect connection
  useEffect(() => {
    if (!isOpen || isSuccess) return;
    const pollInterval = setInterval(async () => {
      try {
        const statusData = await getWhatsAppStatus(userId);
        if (statusData.status === 'connected' || statusData.connected) {
          setIsSuccess(true);
          playRewardSound();
          toast.success('🎉 WhatsApp connected successfully via Baileys engine!');
          onConnected?.(statusData);
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } catch (e) {
        // quiet poll
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [isOpen, isSuccess, userId, onConnected, onClose]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!isOpen || !pairingCode || isSuccess) return;
    if (codeExpiresIn <= 0) {
      setPairingCode(null);
      return;
    }
    const timer = setInterval(() => {
      setCodeExpiresIn((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, pairingCode, codeExpiresIn, isSuccess]);

  // Copy code helper
  const copyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace(/-/g, ''));
    setCodeCopied(true);
    toast.success('Pairing code copied to clipboard!');
    setTimeout(() => setCodeCopied(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/80 bg-background rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-emerald-400/20 rounded-full blur-lg pointer-events-none" />

          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md ring-4 ring-white/20 shadow-inner mb-3">
            <Smartphone className="h-7 w-7 text-white animate-pulse" />
          </div>

          <DialogTitle className="text-xl font-black tracking-tight text-white">
            Link WhatsApp Account
          </DialogTitle>
          <DialogDescription className="text-emerald-100/90 text-xs mt-1 max-w-xs mx-auto">
            Connect your WhatsApp to automatically broadcast promotional campaigns to managed groups and earn credits.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5">
          {/* Pairing Method Selector Tabs */}
          <Tabs value={activeTab} onValueChange={(val: any) => {
            setActiveTab(val);
            if (val === 'qr' && !qrCodeUrl) fetchQr();
          }}>
            <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-muted/80 rounded-xl mb-4">
              <TabsTrigger value="code" className="rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-background shadow-sm">
                <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                Phone Pairing Code
              </TabsTrigger>
              <TabsTrigger value="qr" className="rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-background shadow-sm">
                <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                Scan QR Code
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Direct Number Pairing Code (No Camera / No QR) */}
            <TabsContent value="code" className="space-y-4 m-0">
              {isSuccess ? (
                <div className="flex flex-col items-center gap-2.5 py-8 text-emerald-600 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <CheckCircle2 className="h-9 w-9 text-emerald-600 animate-bounce" />
                  </div>
                  <p className="text-base font-black">WhatsApp Connected & Verified!</p>
                  <p className="text-xs text-muted-foreground">Admin groups synchronized for instant broadcasts.</p>
                </div>
              ) : (
                <>
                  {/* Phone Input / Refresh */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>WhatsApp Mobile Number</span>
                      <span className="text-[10px] text-muted-foreground font-normal">With country code (+234)</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        placeholder="+234 812 345 6789"
                        className="h-10 text-xs font-semibold rounded-xl bg-muted/40"
                      />
                      <Button
                        type="button"
                        onClick={handleGenerateCode}
                        disabled={loading}
                        className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shrink-0"
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Get Code'}
                      </Button>
                    </div>
                  </div>

                  {/* Generated Pairing Code Display */}
                  {pairingCode ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-2 border-emerald-500/40 text-center space-y-3 shadow-inner">
                      <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        Your WhatsApp Pairing Code
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-3xl sm:text-4xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 font-mono py-1 px-4 bg-background/80 rounded-xl border border-emerald-500/30 shadow-sm">
                          {pairingCode}
                        </div>
                        <Button
                          size="sm"
                          onClick={copyPairingCode}
                          className="h-11 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shrink-0"
                        >
                          {codeCopied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Code expires in <strong className="text-foreground">{codeExpiresIn}s</strong></span>
                      </div>
                    </div>
                  ) : null}

                  {/* Instructions */}
                  <div className="bg-muted/60 border border-border/60 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> How to pair on your phone:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                      <li>Open <strong className="text-foreground">WhatsApp</strong> on your phone</li>
                      <li>Tap <strong className="text-foreground">Menu (⋮)</strong> or <strong className="text-foreground">Settings (⚙️)</strong></li>
                      <li>Select <strong className="text-foreground">Linked Devices</strong> → <strong className="text-foreground">Link a Device</strong></li>
                      <li>Tap <strong className="text-foreground">"Link with phone number instead"</strong> at the bottom</li>
                      <li>Enter the 8-digit code shown above</li>
                    </ol>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={handleConfirmPairing}
                      disabled={connecting || loading || isSuccess}
                      className="w-full h-11 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Linking Device & Syncing Groups...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 text-amber-300" />
                          Confirm Link & Activate WhatsApp
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
                </>
              )}
            </TabsContent>

            {/* TAB 2: Scan QR Code */}
            <TabsContent value="qr" className="space-y-4 m-0">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative p-4 bg-white rounded-2xl shadow-md border-2 border-emerald-500/30 flex items-center justify-center min-h-[200px] min-w-[200px]">
                  {loading ? (
                    <div className="flex flex-col items-center gap-2.5 py-8">
                      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                      <p className="text-xs text-muted-foreground font-semibold">Generating Baileys QR Code...</p>
                    </div>
                  ) : isSuccess ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-emerald-600">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
                      <p className="text-xs font-black">Connected & Verified!</p>
                    </div>
                  ) : qrCodeUrl ? (
                    <div className="relative group">
                      <img
                        src={qrCodeUrl}
                        alt="WhatsApp QR Code"
                        className="w-44 h-44 rounded-xl object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <Info className="h-7 w-7 text-amber-500" />
                      <p className="text-xs text-muted-foreground">QR code expired</p>
                      <Button size="sm" variant="outline" onClick={fetchQr} className="mt-1 text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" /> Reload
                      </Button>
                    </div>
                  )}
                </div>

                {!isSuccess && !loading && (
                  <div className="flex items-center justify-between w-full max-w-[240px] mt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <RefreshCw className={`h-3 w-3 ${secondsLeft < 10 ? 'text-amber-500 animate-spin' : ''}`} />
                      Auto-refreshes in <strong className="text-foreground">{secondsLeft}s</strong>
                    </span>
                    <button
                      type="button"
                      onClick={fetchQr}
                      className="text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-muted/60 border border-border/60 rounded-2xl p-3 space-y-1 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Point camera at QR:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground text-[11px]">
                  <li>Open WhatsApp → Linked Devices</li>
                  <li>Tap "Link a Device" and scan this QR code</li>
                </ol>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleConfirmPairing}
                  disabled={connecting || loading || isSuccess}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authorize & Connect Now'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-8 text-xs text-muted-foreground rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

