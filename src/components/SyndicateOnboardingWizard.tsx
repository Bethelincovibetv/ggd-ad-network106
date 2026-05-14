import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, CheckCircle, Award, Briefcase, Wallet, Upload, Building2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  initialBank?: { bank_name?: string; account_number?: string; account_name?: string };
  onComplete: () => void;
}

const SyndicateOnboardingWizard = ({ initialBank, onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState({
    bank_name: initialBank?.bank_name || '',
    account_number: initialBank?.account_number || '',
    account_name: initialBank?.account_name || '',
  });

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
      desc: "Add your bank details now so you can withdraw whenever you want.",
      bullets: [],
    },
  ];

  const current = slides[step];
  const Icon = current.icon;
  const isFinal = step === slides.length - 1;

  const finishAndSave = async () => {
    if (isFinal) {
      if (!bank.bank_name || !bank.account_number || !bank.account_name) {
        toast.error("Please fill all bank details");
        return;
      }
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const { error } = await supabase.from('syndicate_profiles').update({
        bank_name: bank.bank_name,
        account_number: bank.account_number,
        account_name: bank.account_name,
      }).eq('user_id', user.id);
      setSaving(false);
      if (error) { toast.error("Could not save bank details"); return; }
      toast.success("Bank details saved! You're ready to earn.");
      localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const skip = () => {
    localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
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
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Bank Name</Label>
                <Input className="h-12 text-base mt-1.5" placeholder="e.g. GTBank" value={bank.bank_name}
                  onChange={e => setBank({ ...bank, bank_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm font-semibold">Account Number</Label>
                <Input className="h-12 text-base mt-1.5" placeholder="0123456789" inputMode="numeric"
                  value={bank.account_number}
                  onChange={e => setBank({ ...bank, account_number: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm font-semibold">Account Name</Label>
                <Input className="h-12 text-base mt-1.5" placeholder="Your full name" value={bank.account_name}
                  onChange={e => setBank({ ...bank, account_name: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}
                className="flex-1 h-12 text-base font-semibold rounded-xl border-2">
                <ArrowLeft className="h-5 w-5 mr-1" />Back
              </Button>
            )}
            <Button onClick={finishAndSave} disabled={saving}
              className={`flex-1 h-12 text-base font-bold bg-gradient-to-r ${current.color} text-white rounded-xl shadow-md`}>
              {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : isFinal ? <Sparkles className="h-5 w-5 mr-2" /> : null}
              {isFinal ? 'Save & Finish' : 'Next'}
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
