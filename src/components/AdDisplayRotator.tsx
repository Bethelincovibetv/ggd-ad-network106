
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { AdRotatorAd } from "@/types/advert";
import defaultAdImg from "@/assets/default-ad.jpg";

interface AdDisplayRotatorProps {
  ads: AdRotatorAd[];
  onAdClick?: (ad: AdRotatorAd) => void;
  slotId?: string;
}

// Page-wide reservation so multiple rotator slots don't show duplicates
const PAGE_USED = new Set<string>();

const shuffle = <T,>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const AdDisplayRotator: React.FC<AdDisplayRotatorProps> = ({ ads, onAdClick, slotId }) => {
  const [queue, setQueue] = useState<AdRotatorAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentAd, setCurrentAd] = useState<AdRotatorAd | null>(null);

  // Filter to only show active, paid ads
  const activeAds = ads.filter(ad => 
    ad.isActive && 
    ad.isPaid && 
    ad.paymentStatus === 'paid' &&
    (!ad.endDate || new Date(ad.endDate) > new Date())
  );

  useEffect(() => {
    if (activeAds.length === 0) { setCurrentAd(null); return; }
    // Build a shuffled queue, preferring ads not already shown elsewhere on this page
    const fresh = activeAds.filter(a => !PAGE_USED.has(a.id));
    const pool = (fresh.length ? fresh : activeAds);
    const shuffled = shuffle(pool);
    if (slotId && shuffled[0]) PAGE_USED.add(shuffled[0].id);
    setQueue(shuffled);
    setCurrentAdIndex(0);
    return () => {
      if (slotId) shuffled.forEach(a => PAGE_USED.delete(a.id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads.length]);

  useEffect(() => {
    if (queue.length === 0) { setCurrentAd(null); return; }
    setCurrentAd(queue[currentAdIndex % queue.length]);
    if (queue.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % queue.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [queue, currentAdIndex]);

  const handleAdClick = (ad: AdRotatorAd) => {
    // Track click
    if (onAdClick) {
      onAdClick(ad);
    }
    
    // Open target URL
    window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
  };

  if (!currentAd) {
    return (
      <div className="max-w-sm mx-auto">
        <Card className="overflow-hidden cursor-pointer bg-white" onClick={() => window.open('/', '_self')}>
          <img src={defaultAdImg} alt="Promote your business on GGD Ad Network" className="w-full h-48 object-cover" loading="lazy" />
          <div className="p-4 space-y-2">
            <h3 className="font-bold text-base text-gray-800">Promote Your Business Here</h3>
            <p className="text-xs text-gray-600">Reach thousands daily on the GGD Ad Network. Create your first ad in seconds.</p>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg text-center font-medium text-sm">
              Get Started →
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-2 text-center border-t">
            <p className="text-xs text-gray-500">Sponsored · <span className="font-medium">GGD Ad Network</span></p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <Card 
        className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 bg-white"
        onClick={() => handleAdClick(currentAd)}
      >
        {currentAd.imageUrl && (
          <div className="relative">
            <img loading="lazy" 
              src={currentAd.imageUrl} 
              alt={currentAd.title}
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              HOT!
            </div>
          </div>
        )}
        
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-lg text-gray-800 line-clamp-2">
            {currentAd.title}
          </h3>
          
          <p className="text-gray-600 text-sm line-clamp-3">
            {currentAd.description}
          </p>
          
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg text-center font-medium hover:from-orange-600 hover:to-red-600 transition-colors">
            Learn More →
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-2 text-center border-t">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-medium">GGD AD NETWORK</span>
          </p>
        </div>
      </Card>
      
      {activeAds.length > 1 && (
        <div className="flex justify-center mt-3 space-x-2">
          {activeAds.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentAdIndex ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdDisplayRotator;
