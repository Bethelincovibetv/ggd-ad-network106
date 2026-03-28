import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Sparkles, CreditCard, Users, Globe, Zap, CheckCircle, Rocket } from "lucide-react";

interface SetupWizardProps {
  onComplete: () => void;
  onNavigate: (tab: string) => void;
}

const SetupWizard = ({ onComplete, onNavigate }: SetupWizardProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Sparkles, color: 'from-orange-500 to-red-600',
      title: 'Welcome to GGD Ad Network! 🎉',
      description: 'Your all-in-one platform for creating, distributing, and monetizing ads across social media.',
      details: [
        'Create ad campaigns that reach thousands',
        'Earn credits by completing simple tasks',
        'Upgrade to Premium for powerful features',
        'Join as a Syndicate operator and earn money',
      ],
    },
    {
      icon: CreditCard, color: 'from-green-500 to-emerald-600',
      title: 'Your Credit Wallet 💰',
      description: 'Credits are your currency on GGD. Here\'s how to earn and use them:',
      details: [
        'Earn 10 free credits every day just by logging in',
        'Complete tasks to earn bonus credits',
        'Refer friends to earn referral credits',
        'Buy credits instantly with Paystack',
        'Use credits to create ads, upgrade, and more',
      ],
      action: { label: 'Buy Credits Now', tab: 'fund-credits' },
    },
    {
      icon: Globe, color: 'from-blue-500 to-indigo-600',
      title: 'Create Your First Ad 📢',
      description: 'It takes less than 2 minutes to launch your first campaign:',
      details: [
        'Upload your ad banner image',
        'Set your target URL and description',
        'Choose campaign duration (1-30 days)',
        'Pay with credits and go live instantly',
        'Track impressions and clicks in real-time',
      ],
      action: { label: 'Create an Ad', tab: 'ads' },
    },
    {
      icon: Users, color: 'from-purple-500 to-pink-600',
      title: 'Grow Your Business 🚀',
      description: 'Upgrade your account to unlock powerful features:',
      details: [
        'Business: Create syndicate tasks, fund campaigns',
        'Syndicate: Perform tasks and earn real money',
        'Premium: API keys, 30-day ads, credit vendor',
        'Vendor: Sell credits to other users for profit',
      ],
      action: { label: 'Upgrade Account', tab: 'upgrade' },
    },
    {
      icon: Rocket, color: 'from-orange-500 to-red-600',
      title: 'You\'re All Set! 🎯',
      description: 'You\'re ready to start using GGD Ad Network. Here\'s what to do next:',
      details: [
        '✅ Create your first ad campaign',
        '✅ Complete tasks to earn credits',
        '✅ Invite friends with your referral code',
        '✅ Join our WhatsApp group for updates',
        '✅ Explore the Marketing Apps marketplace',
      ],
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-muted'}`} />
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-r ${current.color} p-6 text-center text-white`}>
          <Icon className="h-12 w-12 mx-auto mb-3 animate-pulse" />
          <h2 className="text-xl font-bold">{current.title}</h2>
          <p className="text-sm mt-2 opacity-90">{current.description}</p>
        </div>
        <CardContent className="p-5 space-y-4">
          <ul className="space-y-2">
            {current.details.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                {d}
              </li>
            ))}
          </ul>

          {current.action && (
            <Button onClick={() => { onNavigate(current.action!.tab); onComplete(); }}
              className={`w-full bg-gradient-to-r ${current.color} text-white`}>
              {current.action.label} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-1" />Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={onComplete} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <Sparkles className="h-4 w-4 mr-1" />Get Started!
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Step {step + 1} of {steps.length}
      </p>
    </div>
  );
};

export default SetupWizard;
