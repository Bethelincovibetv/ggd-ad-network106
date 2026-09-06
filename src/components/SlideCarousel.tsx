import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import defaultSlide from '@/assets/default-slider.jpg';

const SlideCarousel = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      // Fetch only explicitly configured slider advertisements from the dedicated 'slides' table.
      // Profile covers and business background images are NOT slider ads and are never displayed here.
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

  const handleSlideNavigation = (e: React.MouseEvent, rawUrl: string | null) => {
    if (!rawUrl) return;
    const url = rawUrl.trim();
    if (!url) return;

    // Check if it corresponds to an in-app feature tab
    const inAppTabs = ['directory', 'tasks', 'ads', 'campaigns', 'my-business', 'marketplace', 'feed', 'wallet', 'premium', 'guide', 'fund-credits'];
    const tabMatch = inAppTabs.find(t => t.toLowerCase() === url.toLowerCase());
    if (tabMatch) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('ggd-nav', { detail: tabMatch }));
      return;
    }

    // Check if it's an internal route path (e.g. /u/my-business or /listing/123)
    if (url.startsWith('/')) {
      e.preventDefault();
      navigate(url);
      return;
    }

    // External URL handling: ensure protocol exists
    const validHttpUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    window.open(validHttpUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${current * 100}%)` }}>
        {list.map(slide => {
          const isClickable = Boolean(slide.link_url);
          return (
            <div key={slide.id} className="min-w-full flex-shrink-0">
              <div
                onClick={(e) => isClickable ? handleSlideNavigation(e, slide.link_url) : undefined}
                className={`relative w-full block overflow-hidden rounded-xl ${isClickable ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
              >
                <img
                  loading="lazy"
                  src={slide.image_url}
                  alt={slide.title || 'Slide advertisement'}
                  className="w-full h-36 sm:h-44 object-cover rounded-xl"
                />
                {slide.title && slide.title !== 'GGD Ad Network' && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white">
                    <p className="text-xs sm:text-sm font-bold truncate">{slide.title}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SlideCarousel;
