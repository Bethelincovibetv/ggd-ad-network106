import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureToggles = () => {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      const { data } = await supabase.from('feature_toggles').select('feature_key, is_enabled');
      const map: Record<string, boolean> = {};
      (data || []).forEach(f => { map[f.feature_key] = f.is_enabled; });
      setFeatures(map);
      setLoading(false);
    };
    fetchFeatures();
  }, []);

  const isEnabled = (key: string) => features[key] !== false; // default true if not found

  return { features, isEnabled, loading };
};
