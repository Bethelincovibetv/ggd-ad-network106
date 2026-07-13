import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import defaultSlide from '@/assets/default-slider.jpg';

const SlideCarousel = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    (async () => {
      const [slidesRes, bizRes] = await Promise.all([
        supabase.from('slides').select('*').eq('is_active', true).order('sort_order'),
        (supabase.from('business_profiles') as any)
          .select('id, business_name, hero_image_url, user_id')
          .not('hero_image_url', 'is', null)
          .eq('is_directory_listed', true)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);
      const bizSlides = (bizRes.data || []).map((b: any) => ({
        id: `biz-${b.id}`,
        image_url: b.hero_image_url,
        title: b.business_name,
        link_url: `/user/${b.user_id}`,
      }));
      setSlides([...(slidesRes.data || []), ...bizSlides]);
    })();
  }, []);

  const list = slides.length > 0 ? slides : [{ id: 'default', image_url: defaultSlide, link_url: null, title: 'GGD Ad Network' }];

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % list.length), 4000);
    return () => clearInterval(t);
  }, [list.length]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${current * 100}%)` }}>
        {list.map(slide => (
          <div key={slide.id} className="min-w-full flex-shrink-0">
            {slide.link_url ? (
              <a href={slide.link_url} target="_blank" rel="noopener noreferrer">
                <img src={slide.image_url} alt={slide.title || 'Slide'} className="w-full h-36 object-cover rounded-xl" />
              </a>
            ) : (
              <img src={slide.image_url} alt={slide.title || 'Slide'} className="w-full h-36 object-cover rounded-xl" />
            )}
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {list.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideCarousel;
