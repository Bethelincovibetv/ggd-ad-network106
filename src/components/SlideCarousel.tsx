import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import defaultSlide from '@/assets/default-slider.jpg';

const SlideCarousel = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('slides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (!error && data) {
        setSlides(data);
      }
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
                <img loading="lazy" src={slide.image_url} alt={slide.title || 'Slide'} className="w-full h-36 object-cover rounded-xl" />
              </a>
            ) : (
              <img loading="lazy" src={slide.image_url} alt={slide.title || 'Slide'} className="w-full h-36 object-cover rounded-xl" />
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
