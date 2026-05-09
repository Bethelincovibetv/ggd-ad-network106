import React, { useState, useEffect } from 'react';
import { Briefcase, Crown, Sparkles, CheckCircle, Users, Edit3, ArrowRight, User } from "lucide-react";
import CoOwnerUpgradeForm from "@/components/CoOwnerUpgradeForm";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface UpgradePageProps {
  onUpgraded: () => void;
  credits?: number;
  onNavigate?: (tab: string) => void;
}

const UpgradePage = ({ onUpgraded, credits = 0, onNavigate }: UpgradePageProps) => {
  const { isEnabled } = useFeatureToggles();
  const showCoOwner = isEnabled('co_owner_upgrade');
  const [hasBusinessName, setHasBusinessName] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { check(); }, []);

  const check = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('profiles').select('business_name').eq('user_id', user.id).single();
    setHasBusinessName(!!data?.business_name);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-5">
      {/* Hero — every user is a business */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-5 text-white relative overflow-hidden shadow-xl shadow-emerald-500/20">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-yellow-300/20 blur-2xl" />
        <Briefcase className="h-8 w-8 mb-2 drop-shadow-lg relative" />
        <h2 className="text-lg font-black relative">You're a Business ✅</h2>
        <p className="text-[11px] opacity-85 relative">
          Every registered user is a business. Update your business details to launch syndicate campaigns and reach more people.
        </p>
      </div>

      {/* Action cards */}
      <div className="space-y-3">
        <Button
          onClick={() => onNavigate?.('business-tasks')}
          className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 justify-between px-5"
        >
          <span className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Create Syndicate Campaign</span>
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => onNavigate?.('syndicate-join')}
          className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-500/25 justify-between px-5"
        >
          <span className="flex items-center gap-2"><Users className="h-5 w-5" />Join Syndicate & Earn ₦</span>
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => onNavigate?.('my-business')}
          variant="outline"
          className="w-full h-12 rounded-2xl text-sm font-medium justify-between px-5"
        >
          <span className="flex items-center gap-2"><Edit3 className="h-4 w-4" />View My Business Profile</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Business details form (always available — to update info) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-bold text-foreground">
            {hasBusinessName ? 'Update Business Details' : 'Set Up Your Business Details'}
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Add your business name, logo, contact, social links and more — required for syndicate campaigns.
        </p>
        <BusinessUpgradeForm onUpgraded={onUpgraded} />
      </div>

      {showCoOwner && (
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" /> Co-Owner Program
          </h3>
          <CoOwnerUpgradeForm onUpgraded={onUpgraded} credits={credits} />
        </div>
      )}
    </div>
  );
};

export default UpgradePage;
