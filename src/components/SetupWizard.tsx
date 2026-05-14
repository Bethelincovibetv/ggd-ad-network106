import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Sparkles, CreditCard, Users, Globe, CheckCircle, Rocket, Megaphone, Briefcase, Wallet, Gift, Share2, Award, PlayCircle } from "lucide-react";

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
      description: 'Your all-in-one platform for creating, distributing, and earning from ads across social media.',
      details: [
        'Create ad campaigns that reach thousands of Nigerians',
        'Earn credits by completing easy tasks daily',
        'Upgrade to Premium for powerful business tools',
        'Join as a Syndicate operator and earn real cash',
      ],
    },
    {
      icon: CreditCard, color: 'from-green-500 to-emerald-600',
      title: 'Your Credit Wallet 💰',
      description: 'Credits are your currency on GGD. Earn them or top up instantly.',
      details: [
        'Get free credits every day just by logging in',
        'Complete tasks to earn bonus credits',
        'Refer friends and earn a percentage of theirs',
        'Buy credits instantly with Paystack',
        'Spend credits on ads, upgrades and more',
      ],
      action: { label: 'Buy Credits Now', tab: 'fund-credits' },
    },
    {
      icon: Megaphone, color: 'from-blue-500 to-indigo-600',
      title: 'Create Your First Ad 📢',
      description: 'It takes less than 2 minutes to launch your first campaign.',
      details: [
        'Upload your banner image or YouTube watch ad',
        'Choose target state (or all of Nigeria)',
        'Set duration, budget and target URL',
        'Submit for fast admin verification',
        'Track impressions and clicks in real-time',
      ],
      action: { label: 'Create an Ad', tab: 'ads' },
    },
    {
      icon: PlayCircle, color: 'from-red-500 to-pink-600',
      title: 'Watch & Earn 🎬',
      description: 'Earn credits by watching short YouTube ads from advertisers.',
      details: [
        'Open the Watch & Earn section on the home tab',
        'Watch the video for the required duration',
        'Get rewarded with credits automatically',
        'One reward per ad — try a new one each day',
      ],
      action: { label: 'Start Watching', tab: 'ads' },
    },
    {
      icon: Briefcase, color: 'from-amber-500 to-orange-600',
      title: 'Tasks: Earn Credits 🎯',
      description: 'Complete simple share tasks and post tasks to earn credits.',
      details: [
        'Browse the Tasks tab for available jobs',
        'Share an ad, post a flyer, or take a screenshot',
        'Submit your proof for quick approval',
        'Earn credits straight to your wallet',
      ],
      action: { label: 'Browse Tasks', tab: 'tasks' },
    },
    {
      icon: Users, color: 'from-purple-500 to-pink-600',
      title: 'Become a Syndicate 💼',
      description: 'Approved syndicates perform paid social media tasks for businesses.',
      details: [
        'Apply once — admin reviews your profile',
        'Pick paid tasks (WhatsApp, IG, X, TikTok and more)',
        'Submit proof and get paid in cash (₦)',
        'Withdraw earnings to your bank every Saturday',
      ],
      action: { label: 'Apply Now', tab: 'syndicate-join' },
    },
    {
      icon: Globe, color: 'from-cyan-500 to-blue-600',
      title: 'Business Storefront 🏪',
      description: 'Showcase your business with its own page on the directory.',
      details: [
        'Upload logo & cover image from your gallery',
        'List your products & services',
        'Get reviews and reach customers in your state',
        'Create syndicate campaigns to grow faster',
      ],
      action: { label: 'Setup Storefront', tab: 'my-business' },
    },
    {
      icon: Share2, color: 'from-pink-500 to-rose-600',
      title: 'Refer & Earn 🎁',
      description: 'Invite friends with your unique referral code and earn forever.',
      details: [
        'Share your referral link from the Referrals tab',
        'Earn a % every time they buy credits',
        'Track all your earnings in one place',
      ],
      action: { label: 'Get My Link', tab: 'referrals' },
    },
    {
      icon: Award, color: 'from-yellow-500 to-orange-600',
      title: 'Upgrade to Premium ⭐',
      description: 'Unlock powerful features for serious advertisers.',
      details: [
        'API Keys for programmatic ad serving',
        'Longer 30-day ad campaigns',
        'Become a credit vendor and resell',
        'Priority placement and analytics',
      ],
      action: { label: 'Upgrade Account', tab: 'upgrade' },
    },
    {
      icon: Rocket, color: 'from-orange-500 to-red-600',
      title: 'You\'re All Set! 🎯',
      description: 'You\'re ready to go. Pick your next action below or explore freely.',
      details: [
        '✅ Create your first ad campaign',
        '✅ Complete tasks to earn credits',
        '✅ Invite friends with your referral code',
        '✅ Apply to become a Syndicate',
        '✅ Setup your business storefront',
      ],
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-muted'}`} />
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
            <h2 className="text-2xl font-black leading-tight">{current.title}</h2>
            <p className="text-base mt-3 opacity-95 leading-relaxed">{current.description}</p>
          </div>
        </div>
        <CardContent className="p-5 space-y-5">
          <ul className="space-y-3">
            {current.details.map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-base text-foreground leading-snug">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>

          {current.action && (
            <Button onClick={() => { onNavigate(current.action!.tab); onComplete(); }}
              className={`w-full h-14 text-base font-bold bg-gradient-to-r ${current.color} text-white rounded-xl shadow-lg hover:shadow-xl transition-all`}>
              {current.action.label} <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          )}

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12 text-base font-semibold rounded-xl border-2">
                <ArrowLeft className="h-5 w-5 mr-1" />Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow-md">
                Next <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            ) : (
              <Button onClick={onComplete} className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-md">
                <Sparkles className="h-5 w-5 mr-1" />Get Started!
              </Button>
            )}
          </div>

          <button onClick={onComplete} className="w-full text-sm text-muted-foreground underline-offset-2 hover:underline">
            Skip walkthrough
          </button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground font-medium">
        Step {step + 1} of {steps.length}
      </p>
    </div>
  );
};

export default SetupWizard;
