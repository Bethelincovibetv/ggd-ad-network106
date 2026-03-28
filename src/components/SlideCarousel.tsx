import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

const SlideCarousel = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase.from('slides').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setSlides(data || []));
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${current * 100}%)` }}>
        {slides.map(slide => (
          <div key={slide.id} className="min-w-full flex-shrink-0">
            <a href={slide.link_url || '#'} target={slide.link_url ? '_blank' : undefined} rel="noopener noreferrer">
              <img src={slide.image_url} alt={slide.title || 'Slide'} className="w-full h-36 object-cover rounded-xl" />
            </a>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideCarousel;
