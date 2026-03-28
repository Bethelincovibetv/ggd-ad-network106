import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const AdDisplayPreview = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    supabase.from('ads').select('*').eq('is_active', true).limit(5)
      .then(({ data }) => setAds(data || []));
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[currentIndex];

  return (
    <Card className="overflow-hidden border-border">
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
