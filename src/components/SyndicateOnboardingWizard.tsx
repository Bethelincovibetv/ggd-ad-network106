import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, CheckCircle, Award, Briefcase, Wallet, Building2, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { POPULAR_NIGERIAN_BANKS, findBankCode } from "@/utils/nigerianBanks";
import { resolveBankAccountPaystack, registerPaystackSubaccount } from "@/utils/paystackBank";

interface Props {
  initialBank?: { bank_name?: string; account_number?: string; account_name?: string };
  onComplete: () => void;
}

const SyndicateOnboardingWizard = ({ initialBank, onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [bank, setBank] = useState({
    bank_name: initialBank?.bank_name || '',
    account_number: initialBank?.account_number || '',
    account_name: initialBank?.account_name || '',
  });

  useEffect(() => {
    // If bank is already filled, this user is already activated - bypass wizard immediately
    if (initialBank?.bank_name && initialBank?.account_number) {
      try {
        localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
      } catch {}
      onComplete();
    }
  }, [initialBank, onComplete]);

  // Handle resolving account name via Paystack
  const triggerResolve = async (bankCode: string, bankName: string, accNum: string) => {
    if (!bankCode || accNum.length !== 10) {
      setBank(prev => ({ ...prev, account_name: '' }));
      return;
    }
    setResolving(true);
    try {
      const res = await resolveBankAccountPaystack(accNum, bankCode, bankName);
      if (res.success && res.account_name) {
        setBank(prev => ({ ...prev, account_name: res.account_name || '' }));
        toast.success(`Account verified: ${res.account_name}`);
      } else {
        setBank(prev => ({ ...prev, account_name: '' }));
        toast.error(res.error || 'Could not verify account name with Paystack');
      }
    } catch (err: any) {
      setBank(prev => ({ ...prev, account_name: '' }));
      toast.error(err.message || 'Failed to verify account');
    } finally {
      setResolving(false);
    }
  };

  const slides = [
    {
      icon: Award, color: 'from-purple-600 to-pink-600',
      title: "Welcome, Syndicate! 🎉",
      desc: "Your application was approved. You can now earn real cash by completing tasks for businesses.",
      bullets: [
        "Pick paid tasks from your dashboard",
        "Submit proof to get approved",
        "Earnings land in your wallet automatically",
      ],
    },
    {
      icon: Briefcase, color: 'from-blue-600 to-indigo-600',
      title: "How Tasks Work 📋",
      desc: "When you accept a task, you have 24 hours to complete it before it returns to the pool.",
      bullets: [
        "Tap 'Find Me a Task' or 'Accept Task'",
        "Follow instructions, take a screenshot",
        "Upload your proof to get reviewed & paid",
      ],
    },
    {
      icon: Wallet, color: 'from-green-600 to-emerald-600',
      title: "Your Earnings Wallet 💰",
      desc: "Every approved task adds Naira to your wallet. Withdraw to your bank every Saturday.",
      bullets: [
        "View your balance any time",
        "Track withdrawal history",
        "Bank transfer in 1-3 business days",
      ],
    },
    {
      icon: Building2, color: 'from-orange-500 to-red-600',
      title: "Save Your Bank Account 🏦",
      desc: "Select your bank and enter your account number. Paystack will automatically verify your real registered account name.",
      bullets: [],
    },
  ];

  const current = slides[step];
  const Icon = current.icon;
  const isFinal = step === slides.length - 1;

  const finishAndSave = async () => {
    if (isFinal) {
      if (!bank.bank_name || !bank.account_number || bank.account_number.length !== 10) {
        toast.error("Please select a bank and enter a valid 10-digit account number");
        return;
      }
      if (!bank.account_name) {
        toast.error("Please wait for Paystack to verify your account name");
        return;
      }

      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }

      const resolvedCode = selectedBankCode || findBankCode(bank.bank_name) || '';

      const { error } = await supabase.from('syndicate_profiles').update({
        bank_name: bank.bank_name,
        bank_code: resolvedCode,
        account_number: bank.account_number,
        account_name: bank.account_name,
        bank_verified_name: bank.account_name,
        is_bank_locked: true,
        bank_verified_at: new Date().toISOString(),
      } as any).eq('user_id', user.id);

      // Register Paystack Subaccount
      await registerPaystackSubaccount(
        user.id,
        resolvedCode,
        bank.bank_name,
        bank.account_number,
        bank.account_name
      );

      setSaving(false);
      if (error) { toast.error("Could not save bank details"); return; }
      toast.success("Bank details verified & locked! You're ready to earn.");
      try {
        localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
        if (user?.id) localStorage.setItem(`ggd_syndicate_wizard_seen_${user.id}`, 'true');
      } catch {}
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const skip = async () => {
    try {
      localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) localStorage.setItem(`ggd_syndicate_wizard_seen_${user.id}`, 'true');
    } catch {}
    onComplete();
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto p-1">
      <div className="flex gap-1.5">
        {slides.map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-muted'}`} />
        ))}
      </div>

      <Card className="overflow-hidden shadow-xl border-2">
        <div className={`bg-gradient-to-br ${current.color} p-7 text-center text-white relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="h-20 w-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Icon className="h-11 w-11 text-white" />
            </div>
            <h2 className="text-2xl font-black">{current.title}</h2>
            <p className="text-base mt-3 opacity-95 leading-relaxed">{current.desc}</p>
          </div>
        </div>

        <CardContent className="p-5 space-y-5">
          {current.bullets.length > 0 && (
            <ul className="space-y-3">
              {current.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-base text-foreground leading-snug">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {isFinal && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Select Nigerian Bank *</Label>
                <select
                  aria-label="Select Bank"
                  value={selectedBankCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const found = POPULAR_NIGERIAN_BANKS.find(b => b.code === code);
                    setSelectedBankCode(code);
                    const newBankName = found?.name || '';
                    setBank(prev => ({ ...prev, bank_name: newBankName }));
                    if (code && bank.account_number.length === 10) {
                      triggerResolve(code, newBankName, bank.account_number);
                    }
                  }}
                  className="mt-1.5 w-full h-12 text-sm rounded-xl border border-input bg-background px-3 font-semibold focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Choose Nigerian Bank --</option>
                  {POPULAR_NIGERIAN_BANKS.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm font-semibold">10-Digit NUBAN Account Number *</Label>
                <div className="relative mt-1.5">
                  <Input
                    className="h-12 text-base font-mono font-bold tracking-wider"
                    placeholder="0123456789"
                    inputMode="numeric"
                    maxLength={10}
                    value={bank.account_number}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setBank(prev => ({ ...prev, account_number: val }));
                      if (val.length === 10 && selectedBankCode) {
                        triggerResolve(selectedBankCode, bank.bank_name, val);
                      } else {
                        setBank(prev => ({ ...prev, account_name: '' }));
                      }
                    }}
                  />
                  {resolving && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying with Paystack...
                    </div>
                  )}
                </div>
              </div>

              {/* Paystack Verification Display */}
              {bank.account_name ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Paystack Verified Name</p>
                    <p className="text-sm font-black">{bank.account_name}</p>
                  </div>
                </div>
              ) : selectedBankCode && bank.account_number.length === 10 && !resolving ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => triggerResolve(selectedBankCode, bank.bank_name, bank.account_number)}
                  className="w-full text-xs font-semibold h-9 rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Verify Bank Account Name
                </Button>
              ) : null}
            </div>
          )}

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}
                className="flex-1 h-12 text-base font-semibold rounded-xl border-2">
                <ArrowLeft className="h-5 w-5 mr-1" />Back
              </Button>
            )}
            <Button
              onClick={finishAndSave}
              disabled={saving || (isFinal && (!bank.bank_name || bank.account_number.length !== 10 || !bank.account_name))}
              className={`flex-1 h-12 text-base font-bold bg-gradient-to-r ${current.color} text-white rounded-xl shadow-md`}
            >
              {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : isFinal ? <Sparkles className="h-5 w-5 mr-2" /> : null}
              {isFinal ? 'Verify, Lock & Finish' : 'Next'}
              {!isFinal && <ArrowRight className="h-5 w-5 ml-1" />}
            </Button>
          </div>

          <button onClick={skip} className="w-full text-sm text-muted-foreground hover:underline">
            Skip walkthrough
          </button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground font-medium">
        Step {step + 1} of {slides.length}
      </p>
    </div>
  );
};

export default SyndicateOnboardingWizard;
