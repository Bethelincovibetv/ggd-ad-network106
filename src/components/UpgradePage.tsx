import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Crown, Sparkles, CheckCircle } from "lucide-react";
import BusinessUpgradeForm from "@/components/BusinessUpgradeForm";
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
  const [isBusiness, setIsBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBusinessStatus();
  }, []);

  const checkBusinessStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('profiles').select('business_name').eq('user_id', user.id).single();
    setIsBusiness(!!data?.business_name);
    setLoading(false);
  };

  if (loading) return null;

  // If already a business, show a status card and direct to task creation
  if (isBusiness) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-5 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <CheckCircle className="h-8 w-8 mb-2 drop-shadow-lg relative" />
          <h2 className="text-lg font-black relative">You're a Business! ✅</h2>
          <p className="text-[11px] opacity-80 relative">Your business account is active. Create syndicate task campaigns to reach more people.</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => onNavigate?.('business-tasks')}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25"
          >
            <Briefcase className="h-5 w-5 mr-2" />
            Create Syndicate Task Campaign
          </Button>
          <Button
            onClick={() => onNavigate?.('my-business')}
            variant="outline"
            className="w-full h-12 rounded-2xl text-sm font-medium"
          >
            View My Business Profile
          </Button>
        </div>

        {showCoOwner && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" /> Co-Owner Program
            </h3>
            <CoOwnerUpgradeForm onUpgraded={onUpgraded} credits={credits} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-yellow-300/15 blur-2xl" />
        <Sparkles className="h-8 w-8 mb-2 drop-shadow-lg relative" />
        <h2 className="text-lg font-black relative">Upgrade Your Account</h2>
        <p className="text-[11px] opacity-80 relative">Unlock powerful features and start earning</p>
        <div className={`grid ${showCoOwner ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-4 relative`}>
          <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
            <Briefcase className="h-4 w-4 mx-auto mb-1 opacity-80" />
            <p className="text-[10px] font-bold">Business</p>
            <p className="text-[9px] opacity-70">Create tasks</p>
          </div>
          {showCoOwner && (
            <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
              <Crown className="h-4 w-4 mx-auto mb-1 opacity-80" />
              <p className="text-[10px] font-bold">Co-Owner</p>
              <p className="text-[9px] opacity-70">Revenue share</p>
            </div>
          )}
        </div>
      </div>

      {showCoOwner ? (
        <Tabs defaultValue="business">
          <TabsList className="w-full grid grid-cols-2 h-11 rounded-xl bg-secondary/80 p-1">
            <TabsTrigger value="business" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">
              <Briefcase className="h-3.5 w-3.5" />Business
            </TabsTrigger>
            <TabsTrigger value="coowner" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">
              <Crown className="h-3.5 w-3.5" />Co-Owner
            </TabsTrigger>
          </TabsList>
          <TabsContent value="business">
            <BusinessUpgradeForm onUpgraded={onUpgraded} />
          </TabsContent>
          <TabsContent value="coowner">
            <CoOwnerUpgradeForm onUpgraded={onUpgraded} credits={credits} />
          </TabsContent>
        </Tabs>
      ) : (
        <BusinessUpgradeForm onUpgraded={onUpgraded} />
      )}
    </div>
  );
};

export default UpgradePage;
