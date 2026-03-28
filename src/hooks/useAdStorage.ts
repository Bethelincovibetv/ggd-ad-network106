
import { useState, useEffect } from 'react';
import { AdRotatorAd } from '@/types/advert';

const ADS_STORAGE_KEY = 'ggd_ads';

export const useAdStorage = () => {
  const [ads, setAds] = useState<AdRotatorAd[]>([]);

  // Load ads from localStorage on component mount
  useEffect(() => {
    const loadAds = () => {
      try {
        const storedAds = localStorage.getItem(ADS_STORAGE_KEY);
        if (storedAds) {
          const parsedAds: AdRotatorAd[] = JSON.parse(storedAds);
          
          // Filter out expired ads
          const activeAds = parsedAds.filter(ad => {
            if (!ad.endDate) return true;
            const endDate = new Date(ad.endDate);
            const now = new Date();
            return endDate > now;
          });
          
          // Update localStorage if we removed expired ads
          if (activeAds.length !== parsedAds.length) {
            localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(activeAds));
          }
          
          setAds(activeAds);
        }
      } catch (error) {
        console.error('Error loading ads from localStorage:', error);
        setAds([]);
      }
    };

    loadAds();
  }, []);

  // Save ads to localStorage whenever ads change
  useEffect(() => {
    try {
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
    } catch (error) {
      console.error('Error saving ads to localStorage:', error);
    }
  }, [ads]);

  // Function to add a new ad
  const addAd = (ad: AdRotatorAd) => {
    setAds(prev => [...prev, ad]);
  };

  // Function to update an existing ad
  const updateAd = (updatedAd: AdRotatorAd) => {
    setAds(prev => prev.map(ad => ad.id === updatedAd.id ? updatedAd : ad));
  };

  // Function to delete an ad
  const deleteAd = (id: string) => {
    setAds(prev => prev.filter(ad => ad.id !== id));
  };

  // Function to manually clean up expired ads
  const cleanupExpiredAds = () => {
    const now = new Date();
    setAds(prev => prev.filter(ad => {
      if (!ad.endDate) return true;
      const endDate = new Date(ad.endDate);
      return endDate > now;
    }));
  };

  return {
    ads,
    addAd,
    updateAd,
    deleteAd,
    cleanupExpiredAds
  };
};
