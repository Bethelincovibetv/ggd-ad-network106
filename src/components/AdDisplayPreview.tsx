import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import defaultAdImg from "@/assets/default-ad.jpg";
import { safeImageUrl, handleImageError } from "@/services/imageUploadService";
import { Sparkles, MousePointerClick, Megaphone, ExternalLink, ArrowRight } from "lucide-react";

export interface AdRecord {
  id?: string;
  title: string;
  description?: string;
  image_url?: string;
  target_url?: string;
  impressions?: number;
  clicks?: number;
}

const DEFAULT_AD: AdRecord = {
  id: 'default-ggd-ad',
  title: 'Promote Your Business',
  description: 'Reach thousands of verified shoppers & businesses on GGD Ad Network',
  image_url: defaultAdImg,
  target_url: '/',
};

const AdDisplayPreview: React.FC = () => {
  const [ads, setAds] = useState<AdRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [template, setTemplate] = useState<'classic' | 'creative' | 'interactive'>('classic');
  const [fade, setFade] = useState(true);
  const loggedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchAds = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(10);
      setAds((data && data.length > 0) ? data : [DEFAULT_AD]);
    };
    fetchAds();

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ad_display_template')
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value || 'classic') as any;
        if (['classic', 'creative', 'interactive'].includes(v)) setTemplate(v);
      });
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % ads.length);
        setFade(true);
      }, 350);
    }, 7000);
    return () => clearInterval(interval);
  }, [ads.length]);

  const ad = ads[currentIndex] || DEFAULT_AD;
  const currentImageUrl = safeImageUrl(ad.image_url, defaultAdImg);

  // Log impression once per ad per session
  useEffect(() => {
    if (!ad?.id || ad.id === 'default-ggd-ad') return;
    if (loggedImpressions.current.has(ad.id)) return;
    loggedImpressions.current.add(ad.id);

    supabase.from('ads').update({ impressions: (ad.impressions || 0) + 1 }).eq('id', ad.id).then(() => {});
    supabase.from('ad_events').insert({ ad_id: ad.id, event_type: 'impression' }).then(() => {});
  }, [ad?.id]);

  const handleAdClick = (e: React.MouseEvent) => {
    if (ad?.id && ad.id !== 'default-ggd-ad') {
      supabase.from('ads').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', ad.id).then(() => {});
      supabase.from('ad_events').insert({ ad_id: ad.id, event_type: 'click' }).then(() => {});
    }
  };

  if (ads.length === 0) return null;

  const targetUrl = ad.target_url || '/';
  const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');
  const wrapClass = `transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`;

  if (template === 'creative') {
    return (
      <Card className={`overflow-hidden border border-orange-500/30 bg-card shadow-lg hover:shadow-xl transition-all ${wrapClass}`}>
        <CardContent className="p-0">
          <a
            href={targetUrl}
            target={isExternal ? "_blank" : "_self"}
            rel="noopener noreferrer"
            onClick={handleAdClick}
            className="block group relative"
          >
            {/* Header Sponsored Badge */}
            <div className="px-3.5 py-2.5 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-border/60">
              <div className="flex items-center gap-1.5">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="h-2.5 w-2.5" /> SPONSORED BANNER ADVERT
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">· Verified Network Sponsor</span>
              </div>
              <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1 group-hover:underline">
                Explore <ExternalLink className="h-2.5 w-2.5" />
              </div>
            </div>

            {/* FULL BANNER ADVERT - Never cropped, fits all standard and custom dimensions */}
            <div className="w-full bg-slate-950/[0.03] dark:bg-black/30 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
              <img
                loading="lazy"
                src={currentImageUrl}
                alt={ad.title || 'Sponsored Banner Advert'}
                onError={handleImageError(defaultAdImg)}
                className="w-full h-auto max-h-[480px] object-contain block mx-auto rounded-lg group-hover:scale-[1.01] transition-transform duration-300"
              />
            </div>

            {/* Content & Action Bar */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-b from-transparent to-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/50">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm text-foreground truncate group-hover:text-orange-600 transition-colors">
                  {ad.title}
                </h3>
                {ad.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {ad.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex items-center">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                  Visit Sponsor <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </a>
        </CardContent>
      </Card>
    );
  }

  if (template === 'interactive') {
    return (
      <Card className={`overflow-hidden border border-orange-500/40 bg-card shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all ${wrapClass}`}>
        <CardContent className="p-0">
          <a
            href={targetUrl}
            target={isExternal ? "_blank" : "_self"}
            rel="noopener noreferrer"
            onClick={handleAdClick}
            className="block group"
          >
            {/* Top Interactive Banner Header */}
            <div className="px-3.5 py-2 flex items-center justify-between bg-muted/40 border-b border-border/60">
              <div className="flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                  Sponsored Banner
                </span>
              </div>
              <div className="h-6 w-6 rounded-full bg-orange-500/10 grid place-items-center">
                <MousePointerClick className="h-3.5 w-3.5 text-orange-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* FULL BANNER ADVERT - Never cropped */}
            <div className="w-full bg-slate-950/[0.03] dark:bg-black/30 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
              <img
                loading="lazy"
                src={currentImageUrl}
                alt={ad.title || 'Sponsored Banner'}
                onError={handleImageError(defaultAdImg)}
                className="w-full h-auto max-h-[480px] object-contain block mx-auto rounded-lg group-hover:scale-[1.01] transition-transform duration-500"
              />
            </div>

            <div className="p-3 bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 border-t border-border/50">
              <h3 className="font-black text-xs sm:text-sm text-foreground truncate">{ad.title}</h3>
              {ad.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{ad.description}</p>}
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-center text-[10px] text-white font-bold tracking-wide flex items-center justify-center gap-1">
              Tap to explore sponsor advert · GGD Ad Network <ArrowRight className="h-3 w-3" />
            </div>
          </a>
        </CardContent>
      </Card>
    );
  }

  // classic (default)
  return (
    <Card className={`overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all ${wrapClass}`}>
      <CardContent className="p-0">
        <a
          href={targetUrl}
          target={isExternal ? "_blank" : "_self"}
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="block group"
        >
          {/* Top Bar with clear Sponsorship Label */}
          <div className="px-3 py-1.5 flex items-center justify-between bg-muted/40 border-b border-border/50 text-[10px]">
            <span className="font-black uppercase tracking-wider text-orange-600 flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Sponsored Advert
            </span>
            <span className="text-muted-foreground font-medium">GGD Ad Network</span>
          </div>

          {/* FULL BANNER ADVERT - Never cropped, complete aspect ratio displayed cleanly */}
          <div className="w-full bg-slate-950/[0.03] dark:bg-black/30 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
            <img
              loading="lazy"
              src={currentImageUrl}
              alt={ad.title || 'Sponsored Banner Advert'}
              onError={handleImageError(defaultAdImg)}
              className="w-full h-auto max-h-[480px] object-contain block mx-auto rounded-lg group-hover:scale-[1.01] transition-transform"
            />
          </div>

          <div className="p-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-orange-600 transition-colors">
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {ad.description}
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 group-hover:underline">
              View Advert <ExternalLink className="h-3 w-3" />
            </div>
          </div>
          <div className="bg-muted/70 px-2 py-1 text-center text-[9px] text-muted-foreground border-t border-border/40">
            Official Advertisement · Verified on GGD Ad Network
          </div>
        </a>
      </CardContent>
    </Card>
  );
};

export default AdDisplayPreview;
