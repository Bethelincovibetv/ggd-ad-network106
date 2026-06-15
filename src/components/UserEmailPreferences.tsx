import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const UserEmailPreferences = () => {
  const [types, setTypes] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; setUid(user.id);
    const { data: t } = await supabase.from('email_activity_types').select('*').eq('is_enabled', true).order('category').order('label');
    setTypes(t || []);
    const { data: p } = await supabase.from('user_email_preferences').select('activity_key,opted_in').eq('user_id', user.id);
    const map: Record<string, boolean> = {};
    (t || []).forEach(x => { map[x.activity_key] = x.default_opt_in; });
    (p || []).forEach(x => { map[x.activity_key] = x.opted_in; });
    setPrefs(map);
  })(); }, []);

  const toggle = async (key: string) => {
    if (!uid) return;
    const next = !prefs[key];
    setPrefs(p => ({ ...p, [key]: next }));
    await supabase.from('user_email_preferences').upsert({ user_id: uid, activity_key: key, opted_in: next }, { onConflict: 'user_id,activity_key' });
    toast.success('Preference saved');
  };

  const cats: Record<string, string> = { core: 'Core notifications', engagement: 'Engagement', all: 'Other activity' };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" />Email notifications</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">Choose which activities you'd like to receive emails for. You can change this anytime.</CardContent>
      </Card>
      {Object.entries(cats).map(([cat, label]) => (
        <Card key={cat}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {types.filter(t => t.category === cat).map(t => (
              <div key={t.activity_key} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.label}</div>
                  {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                </div>
                <Switch checked={!!prefs[t.activity_key]} onCheckedChange={() => toggle(t.activity_key)} />
              </div>
            ))}
            {types.filter(t => t.category === cat).length === 0 && <div className="text-xs text-muted-foreground text-center py-2">None available</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserEmailPreferences;