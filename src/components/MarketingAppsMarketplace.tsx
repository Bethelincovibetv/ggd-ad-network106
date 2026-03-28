import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Gift, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MarketingAppsMarketplace = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [redeemed, setRedeemed] = useState<string[]>([]);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: appsData } = await supabase.from('marketing_apps').select('*').eq('is_active', true).order('sort_order');
    setApps(appsData || []);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: redemptions } = await supabase.from('user_app_redemptions').select('app_id').eq('user_id', user.id);
      setRedeemed((redemptions || []).map(r => r.app_id));
      const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
      if (profile) setCredits(profile.credits);
    }
  };

  const redeemApp = async (app: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!app.is_free && credits < app.credit_cost) {
      toast.error(`Need ${app.credit_cost} credits. You have ${credits}.`);
      return;
    }
    if (!app.is_free) {
      await supabase.from('profiles').update({ credits: credits - app.credit_cost }).eq('user_id', user.id);
      setCredits(credits - app.credit_cost);
    }
    await supabase.from('user_app_redemptions').insert({ user_id: user.id, app_id: app.id });
    setRedeemed([...redeemed, app.id]);
    toast.success('🎉 Redeemed! Opening app...');
    window.open(app.app_link, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground">Marketing Apps</h2>
        <p className="text-xs text-muted-foreground">AI-powered tools to grow your business</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {apps.map(app => {
          const isRedeemed = redeemed.includes(app.id);
          return (
            <Card key={app.id} className="overflow-hidden">
              {app.image_url && <img src={app.image_url} alt={app.title} className="w-full h-24 object-cover" />}
              <CardContent className="p-3 space-y-2">
                <h3 className="text-xs font-bold text-foreground">{app.title}</h3>
                {app.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{app.description}</p>}
                {isRedeemed ? (
                  <Button size="sm" className="w-full text-[10px] h-7 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    onClick={() => window.open(app.app_link, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" />Open App
                  </Button>
                ) : app.is_free ? (
                  <Button size="sm" className="w-full text-[10px] h-7" onClick={() => redeemApp(app)}>
                    <Gift className="h-3 w-3 mr-1" />Redeem Free
                  </Button>
                ) : (
                  <Button size="sm" className="w-full text-[10px] h-7 bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                    onClick={() => redeemApp(app)}>
                    <Lock className="h-3 w-3 mr-1" />{app.credit_cost} Credits
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {apps.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No marketing apps available yet.</p>
        </div>
      )}
    </div>
  );
};

export default MarketingAppsMarketplace;
