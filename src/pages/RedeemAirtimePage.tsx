import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone, ShieldCheck, HelpCircle } from "lucide-react";
import CreditRedeemAirtime from "@/components/CreditRedeemAirtime";
import MetaTags from "@/components/MetaTags";
import { supabase } from "@/integrations/supabase/client";

const RedeemAirtimePage: React.FC = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('credits')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) {
            setCredits(Number(data.credits) || 0);
          }
        }
      } catch (err) {
        console.error('Error fetching user credits:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MetaTags
        title="Redeem Credits for Instant Airtime — GGD VTU Portal"
        description="Convert your credit wallet balance into instant mobile recharge on MTN, Airtel, Glo, and 9mobile via Sabuss VTU gateway."
        canonicalUrl="/redeem"
      />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate('/');
              }}
              className="h-9 px-3 rounded-xl text-xs font-bold gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-orange-500" />
              <span className="text-xs sm:text-sm font-black text-foreground">
                Airtime & Credit Redemption
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/?tab=wallet')}
            className="text-xs font-bold rounded-xl border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
          >
            Open Wallet Hub
          </Button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-3 sm:p-6 max-w-5xl w-full mx-auto pb-24">
        <CreditRedeemAirtime
          currentCredits={credits}
          onCreditsUpdated={(newCredits) => setCredits(newCredits)}
        />
      </main>
    </div>
  );
};

export default RedeemAirtimePage;
