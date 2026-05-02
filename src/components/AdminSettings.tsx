import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save, Settings, Upload, Loader2, Image, Plus, Trash2, CreditCard, MessageCircle, Globe, Shield, Sparkles } from "lucide-react";
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
    if (existing) { await supabase.from('app_settings').update({ value }).eq('key', key); }
    else { await supabase.from('app_settings').insert({ key, value }); }
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  const saveAllSettings = async () => {
    const keys = ['login_credits', 'ad_cost_credits', 'credit_exchange_rate', 'premium_upgrade_credits',
      'vendor_upgrade_credits', 'whatsapp_group_link', 'admin_whatsapp', 'admin_bio',
      'paystack_public_key', 'paystack_secret_key', 'vendor_wallet_bonus', 'directory_listing_cost'];
    for (const key of keys) { if (settings[key] !== undefined) await saveSetting(key, settings[key]); }
    toast.success('All settings saved!');
  };
  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
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
    const file = e.target.files?.[0]; if (!file) return;
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

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>;

  const SettingField = ({ label, settingKey, type = 'text', placeholder = '' }: { label: string; settingKey: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input type={type} value={settings[settingKey] || ''} onChange={e => setSettings(p => ({ ...p, [settingKey]: e.target.value }))}
        className="h-10 rounded-xl bg-secondary/30 border-0 font-medium" placeholder={placeholder} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <Settings className="h-8 w-8 mb-2 drop-shadow-lg" />
        <h3 className="text-base font-black relative">Platform Settings</h3>
        <p className="text-[11px] opacity-80 relative">Configure pricing, keys, and branding</p>
      </div>

      {/* Credits & Pricing */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4" /><h4 className="text-sm font-bold">Credits & Pricing</h4>
        </div>
        <CardContent className="p-4 grid grid-cols-2 gap-3">
          <SettingField label="Credits/Login" settingKey="login_credits" type="number" />
          <SettingField label="Credits/Ad" settingKey="ad_cost_credits" type="number" />
          <SettingField label="₦ per Credit" settingKey="credit_exchange_rate" type="number" />
          <SettingField label="Premium Cost" settingKey="premium_upgrade_credits" type="number" />
          <SettingField label="Vendor Cost" settingKey="vendor_upgrade_credits" type="number" />
          <SettingField label="Vendor Bonus ₦" settingKey="vendor_wallet_bonus" type="number" placeholder="0" />
          <div className="col-span-2">
            <SettingField label="Directory Cost (Credits)" settingKey="directory_listing_cost" type="number" placeholder="0 = free" />
          </div>
        </CardContent>
      </Card>

      {/* Communication */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex items-center gap-2 text-white">
          <MessageCircle className="h-4 w-4" /><h4 className="text-sm font-bold">Communication</h4>
        </div>
        <CardContent className="p-4 space-y-3">
          <SettingField label="Admin WhatsApp" settingKey="admin_whatsapp" placeholder="+234..." />
          <SettingField label="WhatsApp Group Link" settingKey="whatsapp_group_link" placeholder="https://chat.whatsapp.com/..." />
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Admin Bio</Label>
            <Textarea value={settings.admin_bio || ''} onChange={e => setSettings(p => ({ ...p, admin_bio: e.target.value }))} rows={2} className="rounded-xl bg-secondary/30 border-0" />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-3 flex items-center gap-2 text-white">
          <Globe className="h-4 w-4" /><h4 className="text-sm font-bold">Branding</h4>
        </div>
        <CardContent className="p-4">
          <input type="file" id="adminLogoUpload" accept="image/*" onChange={uploadLogo} className="hidden" />
          <div className="flex items-center gap-4">
            {settings.admin_logo_url ? (
              <img src={settings.admin_logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-md border-2 border-white" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-secondary flex items-center justify-center"><Image className="h-6 w-6 text-muted-foreground" /></div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Platform Logo</p>
              <p className="text-[10px] text-muted-foreground">Upload your brand logo</p>
            </div>
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById('adminLogoUpload')?.click()} className="rounded-xl">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Paystack */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 flex items-center gap-2 text-white">
          <CreditCard className="h-4 w-4" /><h4 className="text-sm font-bold">Payment Integration</h4>
        </div>
        <CardContent className="p-4 space-y-3">
          <SettingField label="Paystack Public Key" settingKey="paystack_public_key" placeholder="pk_live_..." />
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paystack Secret Key</Label>
            <Input type="password" value={settings.paystack_secret_key || ''} onChange={e => setSettings(p => ({ ...p, paystack_secret_key: e.target.value }))}
              className="h-10 rounded-xl bg-secondary/30 border-0 font-medium" placeholder="sk_live_..." />
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveAllSettings} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white h-12 rounded-xl shadow-lg font-bold text-sm">
        <Save className="h-4 w-4 mr-2" />Save All Settings
      </Button>

      {/* Promo Materials */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 p-3 flex items-center gap-2 text-white">
          <Image className="h-4 w-4" /><h4 className="text-sm font-bold">Promotional Materials</h4>
        </div>
        <CardContent className="p-4 space-y-3">
          <Input placeholder="Flyer title" value={newPromo.title} onChange={e => setNewPromo(p => ({ ...p, title: e.target.value }))} className="rounded-xl bg-secondary/30 border-0" />
          <Textarea placeholder="Description" rows={2} value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} className="rounded-xl bg-secondary/30 border-0" />
          <input type="file" id="promoImageUpload" accept="image/*" onChange={uploadPromoImage} className="hidden" />
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => document.getElementById('promoImageUpload')?.click()}>
            <Upload className="h-4 w-4 mr-1" />{newPromo.image_url ? 'Change Image' : 'Upload Image'}
          </Button>
          {newPromo.image_url && <img src={newPromo.image_url} alt="Preview" className="w-full rounded-xl" />}
          <Button onClick={addPromo} className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-xl h-10 shadow-md">
            <Plus className="h-4 w-4 mr-1" />Add Material
          </Button>

          {promos.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shadow-sm" />}
              <p className="text-xs flex-1 text-foreground font-medium">{p.title}</p>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive rounded-lg" onClick={() => deletePromo(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
