import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminMarketingApps = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [newApp, setNewApp] = useState({ title: '', description: '', app_link: '', image_url: '', is_free: true, credit_cost: 0 });

  useEffect(() => { fetchApps(); }, []);

  const fetchApps = async () => {
    const { data } = await supabase.from('marketing_apps').select('*').order('sort_order');
    setApps(data || []);
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `apps/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
      setNewApp(prev => ({ ...prev, image_url: publicUrl }));
    }
  };

  const addApp = async () => {
    if (!newApp.title || !newApp.app_link) { toast.error('Title and link required'); return; }
    await supabase.from('marketing_apps').insert(newApp);
    toast.success('App added!');
    setNewApp({ title: '', description: '', app_link: '', image_url: '', is_free: true, credit_cost: 0 });
    fetchApps();
  };

  const deleteApp = async (id: string) => {
    await supabase.from('marketing_apps').delete().eq('id', id);
    toast.success('Deleted!');
    fetchApps();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('marketing_apps').update({ is_active: !isActive }).eq('id', id);
    fetchApps();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Add Marketing App</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="App title" value={newApp.title} onChange={e => setNewApp(p => ({ ...p, title: e.target.value }))} />
          <Textarea placeholder="Description" rows={2} value={newApp.description} onChange={e => setNewApp(p => ({ ...p, description: e.target.value }))} />
          <Input placeholder="App link (URL)" value={newApp.app_link} onChange={e => setNewApp(p => ({ ...p, app_link: e.target.value }))} />
          <div className="flex items-center gap-2">
            <Switch checked={newApp.is_free} onCheckedChange={c => setNewApp(p => ({ ...p, is_free: c }))} />
            <Label className="text-xs">{newApp.is_free ? 'Free' : 'Paid'}</Label>
          </div>
          {!newApp.is_free && (
            <Input type="number" placeholder="Credit cost" value={newApp.credit_cost} onChange={e => setNewApp(p => ({ ...p, credit_cost: parseInt(e.target.value) || 0 }))} />
          )}
          <input type="file" id="appImageUpload" accept="image/*" onChange={uploadImage} className="hidden" />
          <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById('appImageUpload')?.click()}>
            <Upload className="h-4 w-4 mr-1" />{newApp.image_url ? 'Change Image' : 'Upload Image'}
          </Button>
          {newApp.image_url && <img src={newApp.image_url} alt="Preview" className="w-full rounded-lg h-20 object-cover" />}
          <Button onClick={addApp} className="w-full"><Plus className="h-4 w-4 mr-1" />Add App</Button>
        </CardContent>
      </Card>
      {apps.map(app => (
        <Card key={app.id}>
          <CardContent className="p-3 flex items-center gap-3">
            {app.image_url && <img src={app.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{app.title}</p>
              <p className="text-[10px] text-muted-foreground">{app.is_free ? 'Free' : `${app.credit_cost} credits`}</p>
            </div>
            <div className="flex gap-1">
              <Switch checked={app.is_active} onCheckedChange={() => toggleActive(app.id, app.is_active)} />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteApp(app.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminMarketingApps;
