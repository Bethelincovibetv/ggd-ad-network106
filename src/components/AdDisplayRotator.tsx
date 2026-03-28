
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { AdRotatorAd } from "@/types/advert";

interface AdDisplayRotatorProps {
  ads: AdRotatorAd[];
  onAdClick?: (ad: AdRotatorAd) => void;
}

const AdDisplayRotator: React.FC<AdDisplayRotatorProps> = ({ ads, onAdClick }) => {
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
    if (activeAds.length === 0) {
      setCurrentAd(null);
      return;
    }

    setCurrentAd(activeAds[currentAdIndex]);

    if (activeAds.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % activeAds.length);
      }, 8000); // Rotate every 8 seconds

      return () => clearInterval(interval);
    }
  }, [activeAds, currentAdIndex]);

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
      <Card className="p-8 text-center bg-gray-50">
        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No active ads to display</p>
        <p className="text-sm text-gray-500 mt-1">Ads will appear here when campaigns are active</p>
      </Card>
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
            <img 
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
            Powered by <span className="font-medium">GGD Ad Network</span>
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
