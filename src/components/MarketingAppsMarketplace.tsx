import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Gift, Lock, Sparkles, Check, ArrowRight, Link2, Grid, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LinkShortener from "@/components/LinkShortener";

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
  const [activeMarketTab, setActiveMarketTab] = useState<'apps' | 'link_shortener'>('apps');
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

  const headingText = title || (pagePlacement === 'marketplace' ? 'Marketing Apps & Growth Tools' : 'Featured Growth & Marketing Apps');
  const subText = subtitle || (pagePlacement === 'marketplace' ? 'AI-powered commercial tools, WhatsApp link shorteners, and marketing apps to accelerate your business growth' : 'Accelerate your commercial reach with verified marketing tools and applications');

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

      {/* Tabs navigation for Marketplace Page */}
      {pagePlacement === 'marketplace' && (
        <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl border border-border/60">
          <button
            onClick={() => setActiveMarketTab('apps')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeMarketTab === 'apps'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Marketing Apps ({apps.length})</span>
          </button>
          <button
            onClick={() => setActiveMarketTab('link_shortener')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeMarketTab === 'link_shortener'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Short Link & WhatsApp Generator</span>
            <Badge className="bg-amber-400 text-neutral-950 text-[9px] font-black px-1.5 py-0">FREE</Badge>
          </button>
        </div>
      )}

      {/* When Link Shortener tab is active */}
      {pagePlacement === 'marketplace' && activeMarketTab === 'link_shortener' && (
        <div className="pt-1">
          <LinkShortener />
        </div>
      )}

      {/* When Apps tab is active */}
      {(pagePlacement !== 'marketplace' || activeMarketTab === 'apps') && (
        <>
          {/* Quick Highlight for Short Link Tool on Apps Tab */}
          {pagePlacement === 'marketplace' && (
            <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-pink-500/10 border border-orange-500/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow shrink-0">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                    Short Link & WhatsApp Click-to-Chat Generator
                    <Badge className="bg-emerald-500 text-white text-[9px] font-bold">BUILT-IN</Badge>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Create clean tracked short URLs, direct WhatsApp links, and monitor live click analytics instantly.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveMarketTab('link_shortener')}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold rounded-xl h-8 px-3.5 shrink-0 hover:from-orange-600 hover:to-red-700 shadow"
              >
                Launch Shortener <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}

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
        </>
      )}
    </div>
  );
};

export default MarketingAppsMarketplace;
