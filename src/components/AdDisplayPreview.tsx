import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import defaultAdImg from "@/assets/default-ad.jpg";
import { Sparkles, MousePointerClick } from "lucide-react";

const DEFAULT_AD = {
  title: 'Promote Your Business',
  description: 'Reach thousands on GGD Ad Network',
  image_url: defaultAdImg,
  target_url: '/',
};

const AdDisplayPreview = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [template, setTemplate] = useState<'classic' | 'creative' | 'interactive'>('classic');
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from('ads').select('*').eq('is_active', true).or(`expires_at.is.null,expires_at.gt.${now}`).limit(10);
      setAds((data && data.length > 0) ? data : [DEFAULT_AD]);
    };
    fetchAds();
    supabase.from('app_settings').select('value').eq('key', 'ad_display_template').maybeSingle().then(({ data }) => {
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
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[currentIndex];

  const wrapClass = `transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`;

  if (template === 'creative') {
    return (
      <Card className={`overflow-hidden border-0 shadow-lg ${wrapClass}`}>
        <CardContent className="p-0">
          <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="block relative">
            {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-40 object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />Sponsored
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <h3 className="font-black text-sm drop-shadow">{ad.title}</h3>
              {ad.description && <p className="text-[10px] opacity-90 line-clamp-1">{ad.description}</p>}
              <div className="mt-1.5 inline-block bg-white text-orange-600 text-[10px] font-black px-3 py-1 rounded-full">Learn More →</div>
            </div>
          </a>
        </CardContent>
      </Card>
    );
  }

  if (template === 'interactive') {
    return (
      <Card className={`overflow-hidden border-orange-500/30 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all ${wrapClass}`}>
        <CardContent className="p-0">
          <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="block group">
            <div className="relative overflow-hidden">
              {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-700" />}
              <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 grid place-items-center shadow">
                <MousePointerClick className="h-3.5 w-3.5 text-orange-600" />
              </div>
            </div>
            <div className="p-2.5 bg-gradient-to-r from-orange-50 to-red-50">
              <h3 className="font-black text-xs text-foreground">{ad.title}</h3>
              {ad.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{ad.description}</p>}
            </div>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-2 py-1 text-center text-[9px] text-white font-bold">
              Tap to explore · GGD Ad Network
            </div>
          </a>
        </CardContent>
      </Card>
    );
  }

  // classic (default)
  return (
    <Card className={`overflow-hidden border-border ${wrapClass}`}>
      <CardContent className="p-0">
        <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="block">
          {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full" />}
          <div className="p-2">
            <h3 className="font-semibold text-xs text-foreground">{ad.title}</h3>
            {ad.description && <p className="text-[10px] text-muted-foreground">{ad.description}</p>}
          </div>
          <div className="bg-muted px-2 py-0.5 text-center text-[9px] text-muted-foreground">Ad by GGD Network</div>
        </a>
      </CardContent>
    </Card>
  );
};

export default AdDisplayPreview;
