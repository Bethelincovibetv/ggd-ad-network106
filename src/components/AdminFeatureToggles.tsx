import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Feature {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  description: string | null;
}

const AdminFeatureToggles = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFeatures(); }, []);

  const fetchFeatures = async () => {
    const { data } = await supabase.from('feature_toggles').select('*').order('feature_name');
    setFeatures((data as Feature[]) || []);
    setLoading(false);
  };

  const toggleFeature = async (id: string, currentState: boolean) => {
    await supabase.from('feature_toggles').update({ is_enabled: !currentState }).eq('id', id);
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, is_enabled: !currentState } : f));
    toast.success(`Feature ${!currentState ? 'enabled' : 'disabled'}`);
  };

  if (loading) return <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  const groupOf = (key: string) =>
    key.startsWith('nav_') ? 'Navigation Menu'
      : key.startsWith('create_') ? 'Create Menu'
      : 'Platform Features';
  const groups = ['Platform Features', 'Create Menu', 'Navigation Menu'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />Feature Toggles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map(g => {
          const items = features.filter(f => groupOf(f.feature_key) === g);
          if (items.length === 0) return null;
          return (
            <div key={g} className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">{g}</p>
              {items.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-2 bg-muted/30 rounded-lg">
                  <div className="min-w-0">
                    <Label className="text-xs font-medium">{f.feature_name}</Label>
                    {f.description && <p className="text-[10px] text-muted-foreground">{f.description}</p>}
                  </div>
                  <Switch checked={f.is_enabled} onCheckedChange={() => toggleFeature(f.id, f.is_enabled)} />
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AdminFeatureToggles;
