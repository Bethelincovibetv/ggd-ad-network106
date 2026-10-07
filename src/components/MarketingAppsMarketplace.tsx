import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Gift, Lock, Sparkles, Check, ArrowRight, Link2, Grid, Wand2, Video, Mic, ScrollText, Music, Flame, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LinkShortener from "@/components/LinkShortener";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { VIXORA_TOOLS_REGISTRY, VixoraToolEntry } from "@/vixora/services/vixoraToolsRegistry";

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
  const navigate = useNavigate();
  const { isEnabled } = useFeatureToggles();
  const [activeMarketTab, setActiveMarketTab] = useState<'apps' | 'vixora_tools' | 'link_shortener'>('apps');
  const [vixoraSearch, setVixoraSearch] = useState('');
  const [vixoraCategory, setVixoraCategory] = useState('all');
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
        <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/60 rounded-xl border border-border/60">
          <button
            onClick={() => setActiveMarketTab('apps')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeMarketTab === 'apps'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Marketing Apps ({apps.length})</span>
          </button>
          {isEnabled('vixora_ai') && isEnabled('vixora_tools') && (
            <button
              onClick={() => setActiveMarketTab('vixora_tools')}
              className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMarketTab === 'vixora_tools'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Vixora AI Studio & Tools</span>
              <Badge className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0 animate-pulse">HOT</Badge>
            </button>
          )}
          <button
            onClick={() => setActiveMarketTab('link_shortener')}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

      {/* When Vixora Tools tab is active on Marketing page */}
      {pagePlacement === 'marketplace' && activeMarketTab === 'vixora_tools' && isEnabled('vixora_ai') && isEnabled('vixora_tools') && (
        <div className="space-y-4 pt-1">
          {/* Vixora Hero Launch Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-purple-800 p-6 text-white shadow-xl relative overflow-hidden border border-orange-400/30">
            <div className="relative z-10 space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  GGD Marketing & AI Video Suite
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-neutral-950">
                  12+ Built-in Tools
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Vixora AI Creator Studio — Automated Video, Voice & Growth Engine
              </h3>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                Produce high-retention viral shorts, AI voiceover narrations with natural accents, YouTube scripts, stock video sequencer timelines, and promotional flyers directly on GGD.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  onClick={() => navigate('/vixora')}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 mr-1.5 text-orange-500" />
                  Open Full Vixora AI Studio
                </Button>
                <Button
                  onClick={() => navigate('/autopilot')}
                  variant="outline"
                  className="bg-black/30 border-white/30 text-white hover:bg-black/50 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                  1-Click Video Autopilot
                </Button>
                <Button
                  onClick={() => navigate('/voiceover')}
                  variant="outline"
                  className="bg-black/30 border-white/30 text-white hover:bg-black/50 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5 mr-1.5 text-cyan-300" />
                  Voiceover Studio
                </Button>
              </div>
            </div>
          </div>

          {/* Search & Category Filter for Vixora Tools */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/40 rounded-2xl border border-border/50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={vixoraSearch}
                onChange={e => setVixoraSearch(e.target.value)}
                placeholder="Search AI tools (e.g. video, script, voice)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-background border border-border outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Tools' },
                { id: 'video', label: 'Video & Scripting' },
                { id: 'voice', label: 'AI Voice & Audio' },
                { id: 'growth', label: 'Growth & SEO' },
                { id: 'creative', label: 'Creative Assets' },
                { id: 'mentorship', label: 'Mentorship' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setVixoraCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                    vixoraCategory === cat.id
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VIXORA_TOOLS_REGISTRY.filter(tool => {
              const matchesCat = vixoraCategory === 'all' || tool.category === vixoraCategory;
              const q = vixoraSearch.toLowerCase().trim();
              if (!q) return matchesCat;
              return matchesCat && (
                tool.name.toLowerCase().includes(q) ||
                tool.shortDescription.toLowerCase().includes(q) ||
                tool.keywords.some(k => k.toLowerCase().includes(q))
              );
            }).map(tool => (
              <Card
                key={tool.id}
                className="overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group bg-card hover:border-orange-500/50"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white text-base shadow shrink-0`}>
                      <i className={`fa-solid ${tool.icon}`}></i>
                    </div>
                    {tool.badge && (
                      <Badge className="bg-orange-500/15 border border-orange-500/30 text-orange-600 font-bold text-[9px]">
                        {tool.badge}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-foreground group-hover:text-orange-500 transition-colors">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {tool.shortDescription}
                    </p>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (tool.actionType === 'chat_command') {
                        navigate(`/vixora?tab=studio&chat=open&prompt=${encodeURIComponent(tool.suggestedPrompt || `Help me with ${tool.name}`)}`);
                      } else if (tool.actionType === 'live_voice') {
                        navigate('/vixora?tab=studio&voice=start');
                      } else if (tool.targetTab) {
                        navigate(`/${tool.targetTab === 'more' ? 'growth' : tool.targetTab}`);
                      } else {
                        navigate('/vixora');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer"
                  >
                    <span>{tool.actionType === 'chat_command' ? 'Invoke in AI Chat' : tool.actionType === 'live_voice' ? 'Start Voice Call' : 'Launch Studio'}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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
