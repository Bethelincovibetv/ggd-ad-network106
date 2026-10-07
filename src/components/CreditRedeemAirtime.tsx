import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Zap, CheckCircle2, Clock, AlertCircle, RefreshCw, 
  Coins, Sparkles, ShieldCheck, ArrowRight, Copy, Check, 
  History, Smartphone, Signal, Info, ChevronRight, Lock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NetworkOption {
  id: string;
  name: string;
  planId: string;
  color: string;
  bgGradient: string;
  textColor: string;
  prefix: string[];
}

const NETWORKS: NetworkOption[] = [
  {
    id: 'mtn',
    name: 'MTN Nigeria',
    planId: '1',
    color: '#FFCC00',
    bgGradient: 'from-amber-400 to-yellow-500',
    textColor: 'text-amber-950',
    prefix: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
  },
  {
    id: 'airtel',
    name: 'Airtel Nigeria',
    planId: '4',
    color: '#FF0000',
    bgGradient: 'from-red-600 to-rose-600',
    textColor: 'text-white',
    prefix: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0907', '0912'],
  },
  {
    id: 'glo',
    name: 'Glo (Globacom)',
    planId: '2',
    color: '#00A859',
    bgGradient: 'from-emerald-600 to-green-600',
    textColor: 'text-white',
    prefix: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
  },
  {
    id: '9mobile',
    name: '9mobile (Etisalat)',
    planId: '3',
    color: '#00693E',
    bgGradient: 'from-teal-700 to-emerald-800',
    textColor: 'text-white',
    prefix: ['0809', '0817', '0818', '0909', '0908'],
  },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

interface CreditRedeemAirtimeProps {
  currentCredits?: number;
  onCreditsUpdated?: (newCredits: number) => void;
}

export const CreditRedeemAirtime: React.FC<CreditRedeemAirtimeProps> = ({
  currentCredits: propCredits,
  onCreditsUpdated,
}) => {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(propCredits ?? 0);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('mtn');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [transactionPin, setTransactionPin] = useState<string>('0000');
  const [loading, setLoading] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [minAmount, setMinAmount] = useState<number>(100);
  const [maxAmount, setMaxAmount] = useState<number>(10000);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [lastSuccessReceipt, setLastSuccessReceipt] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // 1. Load User & Config
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        setUser(authData.user);
        // Load user profile credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits, email, phone')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (profile) {
          const c = Number(profile.credits) || 0;
          setCredits(c);
          if (profile.phone && !phoneNumber) {
            setPhoneNumber(profile.phone);
            autoDetectNetwork(profile.phone);
          }
        }

        // Fetch user history from backend
        fetchUserHistory(authData.user.id);
      }

      // Fetch public API config
      const res = await fetch('/api/airtime/config');
      if (res.ok) {
        const conf = await res.json();
        if (conf.success) {
          setExchangeRate(conf.exchangeRate || 100);
          setMinAmount(conf.minAmount || 100);
          setMaxAmount(conf.maxAmount || 10000);
          setIsActive(conf.isActive !== false);
        }
      }
    } catch (err) {
      console.error('Initial airtime data error:', err);
    }
  };

  const fetchUserHistory = async (userId: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/airtime/user-history/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.redemptions)) {
          setHistory(data.redemptions);
        }
      }
    } catch (err) {
      console.error('Error loading airtime history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Auto detect network from Nigerian phone prefix
  const autoDetectNetwork = (phoneVal: string) => {
    const clean = phoneVal.replace(/\D/g, '');
    let prefix = clean.slice(0, 4);
    if (clean.startsWith('234')) {
      prefix = '0' + clean.slice(3, 6);
    }
    for (const net of NETWORKS) {
      if (net.prefix.includes(prefix)) {
        setSelectedNetwork(net.id);
        break;
      }
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhoneNumber(val);
    autoDetectNetwork(val);
  };

  // Effective amount and credits required
  const effectiveAmount = customAmount ? Number(customAmount) : amount;
  const requiredCredits = Math.max(1, Math.ceil(effectiveAmount / (exchangeRate || 100)));
  const hasEnoughCredits = credits >= requiredCredits;
  const activeNetObj = NETWORKS.find(n => n.id === selectedNetwork) || NETWORKS[0];

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    toast.success('Transaction Reference copied!');
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleRedeemAirtime = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to redeem airtime');
      return;
    }

    if (!isActive) {
      toast.error('Airtime redemption is currently in maintenance. Please check back shortly.');
      return;
    }

    if (effectiveAmount < minAmount || effectiveAmount > maxAmount) {
      toast.error(`Airtime amount must be between ₦${minAmount.toLocaleString()} and ₦${maxAmount.toLocaleString()}`);
      return;
    }

    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      cleanPhone = '0' + cleanPhone.slice(3);
    }

    if (cleanPhone.length !== 11) {
      toast.error('Please enter a valid 11-digit Nigerian phone number (e.g. 08011223344)');
      return;
    }

    if (!hasEnoughCredits) {
      toast.error(`Insufficient credit balance. You need ${requiredCredits} credits for ₦${effectiveAmount.toLocaleString()} airtime.`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        userEmail: user.email,
        network: activeNetObj.id,
        planId: activeNetObj.planId,
        phoneNumber: cleanPhone,
        amountNgn: effectiveAmount,
        pin: transactionPin || '0000',
      };

      const res = await fetch('/api/airtime/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(result.message || '🎉 Airtime recharge successful!');
        setLastSuccessReceipt(result);
        if (typeof result.newCreditsBalance === 'number') {
          setCredits(result.newCreditsBalance);
          onCreditsUpdated?.(result.newCreditsBalance);
        }
        // Refresh history
        fetchUserHistory(user.id);
      } else {
        // Handle error codes: 800 (failed), 900 (reversed), 400 (pending)
        if (result.statusCode === '800' || result.status === 'failed') {
          toast.error(`Airtime dispatch failed: ${result.error || result.message}. Your credits have been retained.`);
        } else if (result.statusCode === '900' || result.status === 'reversed') {
          toast.error(`Transaction was reversed: ${result.error || result.message}. Credits refunded.`);
        } else if (result.statusCode === '400' || result.status === 'pending') {
          toast.info(`⏳ ${result.message || 'Airtime request is pending on the provider queue.'}`);
        } else {
          toast.error(result.error || 'Failed to complete airtime recharge');
        }

        if (typeof result.newCreditsBalance === 'number') {
          setCredits(result.newCreditsBalance);
          onCreditsUpdated?.(result.newCreditsBalance);
        }
        fetchUserHistory(user.id);
      }
    } catch (err: any) {
      console.error('Airtime redeem submission error:', err);
      toast.error('Network error during airtime processing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Banner & Wallet Status Card */}
      <Card className="overflow-hidden border-border/80 shadow-md rounded-3xl bg-card">
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 p-5 sm:p-6 text-white relative">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 grid place-items-center shadow-md">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight">Redeem Credits for Airtime</h1>
                  <Badge className="bg-white/25 text-white border-0 text-[10px] font-extrabold rounded-full px-2 py-0.5">
                    Sabuss VTU Instant
                  </Badge>
                </div>
                <p className="text-xs text-white/90 mt-0.5">
                  Convert your earned credit wallet directly into instant mobile recharge on all Nigerian networks.
                </p>
              </div>
            </div>

            {/* Live Balance Pill */}
            <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20 flex items-center justify-between sm:justify-start gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-white/80 tracking-wider">Your Credit Wallet</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-amber-300">{credits.toLocaleString()}</span>
                  <span className="text-xs font-bold text-white/90">Credits</span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/20 hidden sm:block" />
              <div>
                <p className="text-[10px] uppercase font-bold text-white/80 tracking-wider">Airtime Value</p>
                <p className="text-sm sm:text-base font-black text-white mt-0.5">
                  ≈ ₦{(credits * exchangeRate).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informational feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-muted/20 text-xs">
          <div className="p-3 flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-foreground">Instant VTU Delivery</p>
              <p className="text-[10px] text-muted-foreground">Recharge arrives within 3-10 seconds</p>
            </div>
          </div>
          <div className="p-3 flex items-center gap-2.5">
            <Coins className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <p className="font-bold text-foreground">Rate: 1 Cr = ₦{exchangeRate}</p>
              <p className="text-[10px] text-muted-foreground">Min ₦{minAmount} · Max ₦{maxAmount.toLocaleString()}</p>
            </div>
          </div>
          <div className="p-3 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0" />
            <div>
              <p className="font-bold text-foreground">100% Refund Protection</p>
              <p className="text-[10px] text-muted-foreground">Instant refund if network fails or reverses</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Form & Success Receipt Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Redemption Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
            <CardHeader className="p-4 sm:p-5 border-b border-border/60 pb-3">
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                <Signal className="h-4 w-4 text-orange-500" />
                Select Network & Top-Up Details
              </CardTitle>
              <CardDescription className="text-xs">
                Choose network, enter 11-digit mobile number, and select amount to recharge.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-5">
              <form onSubmit={handleRedeemAirtime} className="space-y-5">
                {/* 1. Network Operator Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>1. Select Network Operator</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      Active: {activeNetObj.name}
                    </span>
                  </Label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {NETWORKS.map((net) => {
                      const isSel = selectedNetwork === net.id;
                      return (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => setSelectedNetwork(net.id)}
                          className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center relative overflow-hidden ${
                            isSel
                              ? 'border-orange-500 bg-orange-500/10 shadow-md ring-2 ring-orange-500/30'
                              : 'border-border/80 bg-muted/30 hover:border-orange-500/50 hover:bg-muted/60'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${net.bgGradient} grid place-items-center text-white font-black text-xs shadow-sm`}>
                            {net.name.charAt(0)}
                          </div>
                          <p className="text-xs font-black text-foreground">{net.name}</p>
                          <span className="text-[9px] text-muted-foreground font-semibold">Plan #{net.planId}</span>
                          {isSel && (
                            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-orange-500 text-white grid place-items-center">
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Phone Number Input */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>2. Recipient Phone Number</span>
                    <span className="text-[10px] font-semibold text-orange-600">Auto-network detected</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g. 08011223344"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      maxLength={14}
                      className="pl-10 h-12 rounded-2xl bg-muted/20 border-border/80 text-sm font-bold tracking-wide focus:border-orange-500"
                      required
                    />
                    {phoneNumber.length >= 4 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Badge className={`text-[10px] font-bold border-0 bg-gradient-to-r ${activeNetObj.bgGradient} text-white`}>
                          {activeNetObj.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Supports all Nigerian lines (MTN, Airtel, Glo, 9mobile).
                  </p>
                </div>

                {/* 3. Recharge Amount Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    3. Choose Airtime Amount (₦)
                  </Label>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {QUICK_AMOUNTS.map((amt) => {
                      const isSel = amount === amt && !customAmount;
                      const neededCr = Math.ceil(amt / exchangeRate);
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setAmount(amt);
                            setCustomAmount('');
                          }}
                          className={`p-2.5 rounded-2xl border transition-all text-center cursor-pointer ${
                            isSel
                              ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white border-transparent font-black shadow-md'
                              : 'bg-card border-border/80 hover:border-orange-500/50 hover:bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-xs font-black">₦{amt.toLocaleString()}</p>
                          <p className={`text-[9px] mt-0.5 ${isSel ? 'text-amber-200' : 'text-muted-foreground'}`}>
                            {neededCr} Cr
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="pt-1">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        ₦
                      </span>
                      <Input
                        type="number"
                        min={minAmount}
                        max={maxAmount}
                        placeholder={`Or enter custom amount (₦${minAmount} - ₦${maxAmount.toLocaleString()})`}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="pl-8 h-11 rounded-2xl bg-muted/20 border-border/80 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Security Transaction PIN (Default: 0000) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pin" className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      4. Transaction PIN
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Default: 0000</span>
                  </div>
                  <Input
                    id="pin"
                    type="password"
                    maxLength={6}
                    value={transactionPin}
                    onChange={(e) => setTransactionPin(e.target.value)}
                    placeholder="Enter 4-digit PIN (default: 0000)"
                    className="h-11 rounded-2xl bg-muted/20 border-border/80 text-xs font-bold tracking-widest text-center"
                  />
                </div>

                {/* Summary Box Before Dispatch */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-orange-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Recharge Airtime:</span>
                    <span className="text-foreground font-black text-sm">₦{effectiveAmount.toLocaleString()} ({activeNetObj.name})</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Credits To Deduct:</span>
                    <span className="text-orange-600 font-black text-base">-{requiredCredits} Credits</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">Wallet Balance After:</span>
                    <span className={`font-bold ${hasEnoughCredits ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {hasEnoughCredits ? `${credits - requiredCredits} Credits` : 'Insufficient Credits'}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !hasEnoughCredits || !phoneNumber || !isActive}
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Connecting to Sabuss VTU Gateway…
                    </>
                  ) : !hasEnoughCredits ? (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Need {requiredCredits - credits} More Credits
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2 fill-current" />
                      Recharge ₦{effectiveAmount.toLocaleString()} Airtime Now
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Success Receipt & Guide Card */}
        <div className="space-y-4">
          {/* Last Success Receipt Card */}
          {lastSuccessReceipt && (
            <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-md rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-emerald-600 p-4 text-white text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-1" />
                <h3 className="font-black text-sm sm:text-base">Airtime Dispatched!</h3>
                <p className="text-[11px] text-emerald-100">Delivered via Sabuss Network</p>
              </div>
              <CardContent className="p-4 space-y-2.5 text-xs font-medium">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-black text-foreground">₦{lastSuccessReceipt.amountNgn?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-bold text-foreground">{lastSuccessReceipt.phoneNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Network:</span>
                  <span className="font-bold uppercase text-foreground">{lastSuccessReceipt.network}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Credits Spent:</span>
                  <span className="font-bold text-orange-600">-{lastSuccessReceipt.creditsDeducted} Cr</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Reference:</span>
                  <button
                    onClick={() => handleCopyRef(lastSuccessReceipt.reference)}
                    className="font-mono text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {lastSuccessReceipt.reference?.slice(0, 14)}...
                    {copiedRef === lastSuccessReceipt.reference ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* How It Works & Support Card */}
          <Card className="border-border/80 shadow-xs rounded-3xl overflow-hidden bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <CardTitle className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <Info className="h-4 w-4 text-orange-500" />
                Airtime Redemption FAQ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div>
                <p className="font-bold text-foreground">How are credits deducted?</p>
                <p className="text-[11px]">1 Credit = ₦{exchangeRate} worth of mobile airtime. For ₦500 airtime, only 5 credits are debited from your wallet.</p>
              </div>
              <div>
                <p className="font-bold text-foreground">What if the network fails?</p>
                <p className="text-[11px]">The Sabuss VTU gateway reports real-time error codes (200, 400, 800, 900). Any failed or reversed recharge is automatically refunded back to your credit balance immediately.</p>
              </div>
              <div>
                <p className="font-bold text-foreground">Can I recharge any number?</p>
                <p className="text-[11px]">Yes! You can recharge your own phone number or send airtime directly to friends, family, and customers across all Nigerian networks.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real-time Redemption History Section */}
      <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-black">Your Airtime Redemption History</CardTitle>
                <CardDescription className="text-xs">Real-time Cloud SQL audit log of all your mobile airtime recharges</CardDescription>
              </div>
            </div>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUserHistory(user.id)}
                className="h-8 text-xs font-bold rounded-xl gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="h-6 w-6 text-orange-500 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-semibold">Loading redemption history…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Smartphone className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No airtime redemptions yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Once you redeem credits for airtime, your transactions, Sabuss status codes, and delivery logs will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 border-b border-border/70 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3.5">Date</th>
                    <th className="text-left p-3.5">Network</th>
                    <th className="text-left p-3.5">Recipient</th>
                    <th className="text-right p-3.5">Amount (₦)</th>
                    <th className="text-right p-3.5">Credits</th>
                    <th className="text-center p-3.5">Status</th>
                    <th className="text-right p-3.5">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {history.map((item) => {
                    const isSuccess = item.status === 'success' || item.apiStatusCode === '200';
                    const isPending = item.status === 'pending' || item.apiStatusCode === '400';
                    const isFailed = item.status === 'failed' || item.apiStatusCode === '800';
                    const isReversed = item.status === 'reversed' || item.apiStatusCode === '900';

                    return (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold uppercase text-foreground">
                            {item.network}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold font-mono text-foreground">
                          {item.phoneNumber}
                        </td>
                        <td className="p-3.5 text-right font-black text-foreground">
                          ₦{Number(item.amountNgn).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-bold text-orange-600">
                          -{item.creditsDeducted} Cr
                        </td>
                        <td className="p-3.5 text-center">
                          {isSuccess && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> 200 Success
                            </Badge>
                          )}
                          {isPending && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3 mr-1" /> 400 Pending
                            </Badge>
                          )}
                          {isFailed && (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <AlertCircle className="h-3 w-3 mr-1" /> 800 Failed
                            </Badge>
                          )}
                          {isReversed && (
                            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <RefreshCw className="h-3 w-3 mr-1" /> 900 Reversed
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono text-[10px]">
                          <button
                            onClick={() => handleCopyRef(item.reference)}
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-bold"
                            title="Copy Reference"
                          >
                            {item.reference.slice(0, 10)}...
                            {copiedRef === item.reference ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditRedeemAirtime;
