import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save, Settings, Upload, Loader2, Image, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', image_url: '', type: 'flyer', target_audience: 'users' });

  useEffect(() => { fetchSettings(); fetchPromos(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*');
    const map: Record<string, string> = {};
    data?.forEach(s => { map[s.key] = s.value; });
    setSettings(map);
    setLoading(false);
  };

  const fetchPromos = async () => {
    const { data } = await supabase.from('promotional_materials' as any).select('*').order('created_at', { ascending: false });
    setPromos(data || []);
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase.from('app_settings').select('key').eq('key', key).maybeSingle();
    if (existing) {
      await supabase.from('app_settings').update({ value }).eq('key', key);
    } else {
      await supabase.from('app_settings').insert({ key, value });
    }
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAllSettings = async () => {
    const keys = ['login_credits', 'ad_cost_credits', 'credit_exchange_rate', 'premium_upgrade_credits', 
      'vendor_upgrade_credits', 'whatsapp_group_link', 'admin_whatsapp', 'admin_bio',
      'paystack_public_key', 'paystack_secret_key'];
    for (const key of keys) {
      if (settings[key] !== undefined) await saveSetting(key, settings[key]);
    }
    toast.success('Settings saved!');
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `admin/logo_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
      await saveSetting('admin_logo_url', publicUrl);
      toast.success('Logo uploaded!');
    }
    setUploading(false);
  };

  const uploadPromoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `promos/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
      setNewPromo(prev => ({ ...prev, image_url: publicUrl }));
    }
  };

  const addPromo = async () => {
    if (!newPromo.title.trim()) { toast.error('Enter title'); return; }
    await supabase.from('promotional_materials' as any).insert(newPromo);
    toast.success('Promotional material added!');
    setNewPromo({ title: '', description: '', image_url: '', type: 'flyer', target_audience: 'users' });
    fetchPromos();
  };

  const deletePromo = async (id: string) => {
    await supabase.from('promotional_materials' as any).delete().eq('id', id);
    toast.success('Deleted!');
    fetchPromos();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Settings className="h-4 w-4" />Platform Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Credits per Login</Label>
              <Input type="number" value={settings.login_credits || '10'} onChange={e => setSettings(p => ({ ...p, login_credits: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Credits per Ad</Label>
              <Input type="number" value={settings.ad_cost_credits || '5'} onChange={e => setSettings(p => ({ ...p, ad_cost_credits: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">₦ per 1 Credit</Label>
              <Input type="number" value={settings.credit_exchange_rate || '100'} onChange={e => setSettings(p => ({ ...p, credit_exchange_rate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Premium Cost (Credits)</Label>
              <Input type="number" value={settings.premium_upgrade_credits || '50'} onChange={e => setSettings(p => ({ ...p, premium_upgrade_credits: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Vendor Cost (Credits)</Label>
              <Input type="number" value={settings.vendor_upgrade_credits || '100'} onChange={e => setSettings(p => ({ ...p, vendor_upgrade_credits: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Admin WhatsApp</Label>
              <Input value={settings.admin_whatsapp || ''} onChange={e => setSettings(p => ({ ...p, admin_whatsapp: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">WhatsApp Group Link</Label>
            <Input value={settings.whatsapp_group_link || ''} onChange={e => setSettings(p => ({ ...p, whatsapp_group_link: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Admin Bio / Description</Label>
            <Textarea value={settings.admin_bio || ''} onChange={e => setSettings(p => ({ ...p, admin_bio: e.target.value }))} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Admin Logo</Label>
            <input type="file" id="adminLogoUpload" accept="image/*" onChange={uploadLogo} className="hidden" />
            <div className="flex items-center gap-2 mt-1">
              {settings.admin_logo_url && <img src={settings.admin_logo_url} alt="Logo" className="h-10 w-10 rounded-full object-cover" />}
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('adminLogoUpload')?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload
              </Button>
            </div>
          </div>
          <div className="col-span-2 border-t pt-3 mt-2">
            <h4 className="text-xs font-bold text-foreground mb-2">💳 Paystack Integration</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs">Paystack Public Key</Label>
                <Input value={settings.paystack_public_key || ''} onChange={e => setSettings(p => ({ ...p, paystack_public_key: e.target.value }))} placeholder="pk_live_..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Paystack Secret Key</Label>
                <Input type="password" value={settings.paystack_secret_key || ''} onChange={e => setSettings(p => ({ ...p, paystack_secret_key: e.target.value }))} placeholder="sk_live_..." className="mt-1" />
              </div>
            </div>
          </div>
          <Button onClick={saveAllSettings} className="w-full"><Save className="h-4 w-4 mr-1" />Save All Settings</Button>
        </CardContent>
      </Card>

      {/* Promotional Materials Manager */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Image className="h-4 w-4" />Promotional Materials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Flyer title" value={newPromo.title} onChange={e => setNewPromo(p => ({ ...p, title: e.target.value }))} />
          <Textarea placeholder="Description" rows={2} value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} />
          <input type="file" id="promoImageUpload" accept="image/*" onChange={uploadPromoImage} className="hidden" />
          <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById('promoImageUpload')?.click()}>
            <Upload className="h-4 w-4 mr-1" />{newPromo.image_url ? 'Change Image' : 'Upload Image'}
          </Button>
          {newPromo.image_url && <img src={newPromo.image_url} alt="Preview" className="w-full rounded-lg" />}
          <Button onClick={addPromo} className="w-full"><Plus className="h-4 w-4 mr-1" />Add Material</Button>

          {promos.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
              <p className="text-xs flex-1 text-foreground">{p.title}</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deletePromo(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
