import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Gift, Lock, Sparkles, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MarketingAppsMarketplaceProps {
  pagePlacement?: 'marketplace' | 'landing' | 'dashboard' | 'directory';
  onRequireAuth?: () => void;
  title?: string;
  subtitle?: string;
  maxDisplay?: number;
}

const MarketingAppsMarketplace: React.FC<MarketingAppsMarketplaceProps> = ({
  pagePlacement = 'marketplace',
  onRequireAuth,
  title,
  subtitle,
  maxDisplay,
}) => {
  const [apps, setApps] = useState<any[]>([]);
  const [redeemed, setRedeemed] = useState<string[]>([]);
  const [credits, setCredits] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [pagePlacement]);

  const fetchData = async () => {
    setLoading(true);
    const [appsRes, placementsRes] = await Promise.all([
      supabase.from('marketing_apps').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('app_settings').select('value').eq('key', 'marketing_apps_placements').maybeSingle(),
    ]);

    let placementsMap: Record<string, string[]> = {};
    if (placementsRes.data?.value) {
      try {
        placementsMap = JSON.parse(placementsRes.data.value);
      } catch {
        placementsMap = {};
      }
    }

    const allApps = appsRes.data || [];

    // Filter apps based on pagePlacement
    const filteredApps = allApps.filter(app => {
      const appPlacements = placementsMap[app.id] || ['marketplace', 'landing'];
      if (pagePlacement === 'marketplace') {
        return appPlacements.includes('marketplace') || appPlacements.includes('all');
      }
      return appPlacements.includes(pagePlacement) || appPlacements.includes('all');
    });

    setApps(maxDisplay ? filteredApps.slice(0, maxDisplay) : filteredApps);

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user || null);
    if (user) {
      const { data: redemptions } = await supabase.from('user_app_redemptions').select('app_id').eq('user_id', user.id);
      setRedeemed((redemptions || []).map(r => r.app_id));
      const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
      if (profile) setCredits(profile.credits || 0);
    }
    setLoading(false);
  };

  const handleAppClick = async (app: any) => {
    // If free, anyone can open immediately!
    if (app.is_free) {
      window.open(app.app_link, '_blank');
      return;
    }

    // If paid, user must be logged in
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        toast.info('Please sign in to unlock this premium marketing app.');
      }
      return;
    }

    // Already redeemed?
    if (redeemed.includes(app.id)) {
      window.open(app.app_link, '_blank');
      return;
    }

    // Check credits
    if (credits < app.credit_cost) {
      toast.error(`Need ${app.credit_cost} credits to unlock. You have ${credits} credits.`);
      return;
    }

    // Deduct credits and redeem
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: credits - app.credit_cost })
      .eq('user_id', currentUser.id);

    if (creditError) {
      toast.error('Failed to deduct credits');
      return;
    }

    await supabase.from('user_app_redemptions').insert({
      user_id: currentUser.id,
      app_id: app.id,
    });

    setCredits(prev => prev - app.credit_cost);
    setRedeemed(prev => [...prev, app.id]);
    toast.success('🎉 App unlocked successfully!');
    window.open(app.app_link, '_blank');
  };

  if (loading) {
    return null;
  }

  if (apps.length === 0 && pagePlacement !== 'marketplace') {
    return null;
  }

  const headingText = title || (pagePlacement === 'marketplace' ? 'Marketing Apps Marketplace' : 'Featured Growth & Marketing Apps');
  const subText = subtitle || (pagePlacement === 'marketplace' ? 'AI-powered commercial tools and marketing apps to accelerate your business growth' : 'Accelerate your commercial reach with verified marketing tools and applications');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 grid place-items-center shadow-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-black text-foreground">{headingText}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subText}</p>
        </div>
        {pagePlacement === 'marketplace' && currentUser && (
          <Badge variant="outline" className="self-start sm:self-auto text-xs px-3 py-1 font-bold border-orange-500/30 text-orange-600">
            Available Credits: {credits}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map(app => {
          const isRedeemed = redeemed.includes(app.id);
          return (
            <Card
              key={app.id}
              className="overflow-hidden border shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group bg-card"
            >
              <div>
                <div className="relative h-36 bg-gradient-to-br from-purple-600/30 via-indigo-600/20 to-neutral-900 overflow-hidden">
                  {app.image_url ? (
                    <img
                      loading="lazy"
                      src={app.image_url}
                      alt={app.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-600/30">
                      <Sparkles className="h-10 w-10 text-indigo-400 opacity-60" />
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    <Badge className={app.is_free ? 'bg-emerald-500 text-white font-bold text-[10px] shadow' : 'bg-purple-600 text-white font-bold text-[10px] shadow'}>
                      {app.is_free ? 'FREE TOOL' : `${app.credit_cost} CREDITS`}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-2">
                  <h3 className="text-sm font-black text-foreground group-hover:text-orange-500 transition-colors truncate">
                    {app.title}
                  </h3>
                  {app.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {app.description}
                    </p>
                  )}
                </CardContent>
              </div>

              <div className="p-4 pt-0">
                {isRedeemed ? (
                  <Button
                    size="sm"
                    className="w-full text-xs h-9 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl gap-1.5 shadow"
                    onClick={() => handleAppClick(app)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open App <Check className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                ) : app.is_free ? (
                  <Button
                    size="sm"
                    className="w-full text-xs h-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl gap-1.5 shadow"
                    onClick={() => handleAppClick(app)}
                  >
                    <Gift className="h-3.5 w-3.5" /> Launch Free App <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full text-xs h-9 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl gap-1.5 shadow"
                    onClick={() => handleAppClick(app)}
                  >
                    <Lock className="h-3.5 w-3.5" /> Unlock with {app.credit_cost} Credits
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {apps.length === 0 && pagePlacement === 'marketplace' && (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-bold text-foreground">No Marketing Apps Published Yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new AI and promotional applications.</p>
        </div>
      )}
    </div>
  );
};

export default MarketingAppsMarketplace;
