import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save, Settings, Upload, Loader2, Image, Plus, Trash2, CreditCard, MessageCircle, Globe, Shield, Sparkles, Package, FileText, Copy, Check, Zap, LayoutTemplate, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GGD_MASTER_AUDIT_REPORT } from "@/data/auditReportText";
import { WEBSITE_TEMPLATES, getWebsiteTemplate } from "@/utils/websiteTemplates";

const SettingField = ({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
    <Input type={type} value={value} onChange={e => onChange(e.target.value)}
      className="h-10 rounded-xl bg-secondary/30 border-0 font-medium" placeholder={placeholder} inputMode={type === 'number' ? 'numeric' : undefined} />
  </div>
);

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', image_url: '', type: 'flyer', target_audience: 'users' });
  const [copiedReport, setCopiedReport] = useState(false);

  const copyAuditReport = async () => {
    try {
      await navigator.clipboard.writeText(GGD_MASTER_AUDIT_REPORT);
      setCopiedReport(true);
      toast.success('Master Audit & Blueprint copied to clipboard!');
      setTimeout(() => setCopiedReport(false), 3000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

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
    const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
    if (error) {
      console.error(`Failed to save setting ${key}:`, error);
      throw error;
    }
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAllSettings = async () => {
    setSavingAll(true);
    try {
      const keys = [
        'login_credits', 'ad_cost_credits', 'credit_exchange_rate', 'premium_upgrade_credits',
        'whatsapp_group_link', 'admin_whatsapp', 'admin_bio',
        'paystack_public_key', 'paystack_secret_key', 'vendor_wallet_bonus', 'directory_listing_cost',
        'premium_system_enabled', 'auto_convert_ads_to_tasks', 'referral_percentage',
        'premium_tier1_price', 'premium_tier2_price', 'premium_tier3_price',
        'premium_tier1_days', 'premium_tier2_days', 'premium_tier3_days',
        'premium_tier0_days', 'ad_duration_free_days', 'premium_business_contact',
        'syndicate_payout_percentage', 'landing_search_enabled', 'ad_display_template',
        'default_business_website_template',
        'auto_payout_enabled', 'max_auto_payout_amount', 'syndicate_withdraw_cooldown_hours'
      ];

      const upsertPayload = keys
        .filter(key => settings[key] !== undefined)
        .map(key => ({ key, value: String(settings[key]) }));

      if (upsertPayload.length > 0) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(upsertPayload, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success('All settings successfully saved to database!');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + (err.message || 'Unknown database error'));
    } finally {
      setSavingAll(false);
    }
  };

  const saveSection = async (keys: string[], sectionName: string) => {
    setSavingAll(true);
    try {
      const upsertPayload = keys
        .filter(key => settings[key] !== undefined)
        .map(key => ({ key, value: String(settings[key]) }));

      if (upsertPayload.length > 0) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(upsertPayload, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success(`${sectionName} changes saved successfully!`);
    } catch (err: any) {
      toast.error('Failed to save changes: ' + (err.message || 'Database error'));
    } finally {
      setSavingAll(false);
    }
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

  const field = (key: string) => ({ value: settings[key] || '', onChange: (v: string) => setSettings(p => ({ ...p, [key]: v })) });

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-gray-800 to-slate-900 p-5 text-white relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-6 w-6 text-orange-400 drop-shadow" />
            <h3 className="text-base font-black">Platform Settings</h3>
          </div>
          <p className="text-[11px] opacity-80">Configure pricing, keys, rates, and platform branding</p>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <Button
            onClick={saveAllSettings}
            disabled={savingAll}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md border-0"
          >
            {savingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                Saving to Database...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2 text-white" />
                Save All Changes
              </>
            )}
          </Button>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Credits & Pricing */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4" /><h4 className="text-sm font-bold">Credits & Pricing</h4>
        </div>
        <CardContent className="p-4 grid grid-cols-2 gap-3">
          <SettingField label="Credits/Login" {...field('login_credits')} type="number" />
          <SettingField label="Credits/Ad" {...field('ad_cost_credits')} type="number" />
          <SettingField label="₦ per Credit" {...field('credit_exchange_rate')} type="number" />
          <SettingField label="Premium Cost" {...field('premium_upgrade_credits')} type="number" />
          <div className="col-span-2">
            <SettingField label="Directory Cost (Credits)" {...field('directory_listing_cost')} type="number" placeholder="0 = free" />
          </div>
          <div className="col-span-2">
            <SettingField label="Referral % (earned from referred user's credits)" {...field('referral_percentage')} type="number" placeholder="2" />
          </div>
          <div className="col-span-2">
            <SettingField label="Syndicate Payout % (rest kept by admin)" {...field('syndicate_payout_percentage')} type="number" placeholder="70" />
          </div>
          <div className="col-span-2 flex items-center justify-between bg-secondary/30 rounded-xl p-3">
            <div>
              <Label className="text-xs font-semibold">Landing-page search bar</Label>
              <p className="text-[10px] text-muted-foreground">Show global search on the public landing page</p>
            </div>
            <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={settings.landing_search_enabled !== 'false'}
              onChange={e => setSettings(p => ({ ...p, landing_search_enabled: e.target.checked ? 'true' : 'false' }))} />
          </div>
          <div className="col-span-2 flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection([
                'login_credits', 'ad_cost_credits', 'credit_exchange_rate', 
                'premium_upgrade_credits', 'directory_listing_cost', 
                'referral_percentage', 'syndicate_payout_percentage', 'landing_search_enabled'
              ], 'Credits & Pricing')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Communication */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 flex items-center gap-2 text-white">
          <MessageCircle className="h-4 w-4" /><h4 className="text-sm font-bold">Communication</h4>
        </div>
        <CardContent className="p-4 space-y-3">
          <SettingField label="Admin WhatsApp" {...field('admin_whatsapp')} placeholder="+234..." />
          <SettingField label="WhatsApp Group Link" {...field('whatsapp_group_link')} placeholder="https://chat.whatsapp.com/..." />
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Admin Bio</Label>
            <Textarea value={settings.admin_bio || ''} onChange={e => setSettings(p => ({ ...p, admin_bio: e.target.value }))} rows={2} className="rounded-xl bg-secondary/30 border-0" />
          </div>
          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection(['admin_whatsapp', 'whatsapp_group_link', 'admin_bio'], 'Communication')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
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
              <img loading="lazy" src={settings.admin_logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-md border-2 border-white" />
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

      {/* Paystack & Auto Payouts */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /><h4 className="text-sm font-bold">Paystack & Automatic Syndicate Payouts</h4>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Phase 2 Secure</span>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <SettingField label="Paystack Public Key" {...field('paystack_public_key')} placeholder="pk_live_..." />
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paystack Secret Key</Label>
              <Input type="password" value={settings.paystack_secret_key || ''} onChange={e => setSettings(p => ({ ...p, paystack_secret_key: e.target.value }))}
                className="h-10 rounded-xl bg-secondary/30 border-0 font-medium" placeholder="sk_live_..." />
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-950/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-cyan-600" /> Automatic Syndicate Payouts
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Automatically transfer approved syndicate withdrawals directly via Paystack
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-cyan-600 rounded cursor-pointer"
                checked={settings.auto_payout_enabled === 'true'}
                onChange={e => setSettings(p => ({ ...p, auto_payout_enabled: e.target.checked ? 'true' : 'false' }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <SettingField label="Max Auto-Payout (₦)" {...field('max_auto_payout_amount')} type="number" placeholder="50000" />
              <SettingField label="Min Auto-Payout (₦)" {...field('min_auto_payout_amount')} type="number" placeholder="500" />
            </div>

            <div className="text-[10px] text-muted-foreground bg-background/80 rounded-lg p-2.5 space-y-1 border border-border/50">
              <p className="font-semibold text-foreground">💡 How Automatic Payouts Work:</p>
              <p>• When enabled, syndicate withdrawals ≤ the Max limit are instantly transferred using Paystack Transfers API.</p>
              <p>• If transfer encounters any issue, funds are safely restored to user credit balance.</p>
              <p>• Withdrawals above the Max limit or when disabled route safely to Admin Manual Review.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection([
                'paystack_public_key', 'paystack_secret_key', 'auto_payout_enabled', 
                'max_auto_payout_amount', 'min_auto_payout_amount'
              ], 'Paystack & Payouts')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Premium System */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 flex items-center gap-2 text-white">
          <Shield className="h-4 w-4" /><h4 className="text-sm font-bold">Premium System</h4>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
            <div>
              <Label className="text-xs font-semibold">Premium gating ON</Label>
              <p className="text-[10px] text-muted-foreground">Off = all users get all features free</p>
            </div>
            <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={settings.premium_system_enabled === 'true'}
              onChange={e => setSettings(p => ({ ...p, premium_system_enabled: e.target.checked ? 'true' : 'false' }))} />
          </div>
          <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
            <div>
              <Label className="text-xs font-semibold">Auto-convert API ads → tasks</Label>
              <p className="text-[10px] text-muted-foreground">New ads from API auto-spawn share tasks</p>
            </div>
            <input type="checkbox" className="h-5 w-5 accent-orange-500" checked={settings.auto_convert_ads_to_tasks === 'true'}
              onChange={e => setSettings(p => ({ ...p, auto_convert_ads_to_tasks: e.target.checked ? 'true' : 'false' }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <SettingField label="Free Premium — Ad Days (auto-given to every user)" {...field('premium_tier0_days')} type="number" placeholder="3" />
            </div>
            <SettingField label="Tier 1 Price ₦" {...field('premium_tier1_price')} type="number" placeholder="1000" />
            <SettingField label="Tier 1 Days" {...field('premium_tier1_days')} type="number" placeholder="3" />
            <SettingField label="Tier 2 Price ₦" {...field('premium_tier2_price')} type="number" placeholder="3000" />
            <SettingField label="Tier 2 Days" {...field('premium_tier2_days')} type="number" placeholder="15" />
            <SettingField label="Tier 3 Price ₦" {...field('premium_tier3_price')} type="number" placeholder="5000" />
            <SettingField label="Tier 3 Days" {...field('premium_tier3_days')} type="number" placeholder="30" />
            <div className="col-span-2">
              <SettingField label="Business Plan — Support Contact Link" {...field('premium_business_contact')} placeholder="https://wa.me/234..." />
              <p className="text-[10px] text-muted-foreground mt-1">All paid plans automatically expire after 1 month. Admin can subscribe any user from User Management.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection([
                'premium_system_enabled', 'auto_convert_ads_to_tasks', 'premium_tier0_days', 
                'premium_tier1_price', 'premium_tier1_days', 'premium_tier2_price', 
                'premium_tier2_days', 'premium_tier3_price', 'premium_tier3_days', 
                'premium_business_contact'
              ], 'Premium System')}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ad Display Template */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex items-center gap-2 text-white">
          <Image className="h-4 w-4" /><h4 className="text-sm font-bold">Ad Display Template</h4>
        </div>
        <CardContent className="p-4 space-y-2">
          <p className="text-[11px] text-muted-foreground">Choose the default look for banner ads shown across the app.</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'classic', label: 'Classic', desc: 'Compact clean card' },
              { key: 'creative', label: 'Creative', desc: 'Bold gradient overlay' },
              { key: 'interactive', label: 'Interactive', desc: 'Zoom hover + CTA' },
            ].map(t => {
              const active = (settings.ad_display_template || 'classic') === t.key;
              return (
                <button key={t.key} type="button"
                  onClick={() => setSettings(p => ({ ...p, ad_display_template: t.key }))}
                  className={`p-3 rounded-xl border-2 text-left transition ${active ? 'border-orange-500 bg-orange-500/10' : 'border-border bg-secondary/30'}`}>
                  <p className="text-xs font-black">{t.label}</p>
                  <p className="text-[9px] text-muted-foreground">{t.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection(['ad_display_template'], 'Ad Display')}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business Website Templates & Brand Harmony */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 p-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            <h4 className="text-sm font-bold">Business Website Templates & Brand Harmony</h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">Admin Controlled</span>
        </div>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Select the platform default template for merchant websites. All templates are designed with clean, light-mode palettes balanced with GGD Ad Network's visual identity (no harsh pitch-black backgrounds, crisp typography, and responsive sidebar navigation).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.values(WEBSITE_TEMPLATES).map(t => {
              const active = (settings.default_business_website_template || 'corporate-orange') === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettings(p => ({ ...p, default_business_website_template: t.id }))}
                  className={`p-3 rounded-xl border-2 text-left transition relative flex flex-col justify-between cursor-pointer ${
                    active ? 'border-orange-500 bg-orange-500/10 shadow-xs' : 'border-border bg-secondary/30 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.previewColor }} />
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.accentColor }} />
                      </div>
                      {active && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="capitalize">{t.tone}</span>
                    <span className="font-semibold text-slate-700">Light / Modern</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground">
              Current default: <span className="font-bold text-foreground">
                {WEBSITE_TEMPLATES[settings.default_business_website_template || 'corporate-orange']?.name || 'Corporate Orange (GGD Brand)'}
              </span>
            </p>
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection(['default_business_website_template'], 'Business Website Template')}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" /> Save Template as Platform Default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={saveAllSettings} 
        disabled={savingAll}
        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-12 rounded-xl shadow-lg font-bold text-sm"
      >
        {savingAll ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
            Saving Settings to Database...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save All Settings to Database
          </>
        )}
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
          {newPromo.image_url && <img loading="lazy" src={newPromo.image_url} alt="Preview" className="w-full rounded-xl" />}
          <Button onClick={addPromo} className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-xl h-10 shadow-md">
            <Plus className="h-4 w-4 mr-1" />Add Material
          </Button>

          {promos.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              {p.image_url && <img loading="lazy" src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shadow-sm" />}
              <p className="text-xs flex-1 text-foreground font-medium">{p.title}</p>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive rounded-lg" onClick={() => deletePromo(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Forensic Audit & GGD 2.0 Architectural Blueprint */}
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                Master Audit & GGD 2.0 Blueprint
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready to Copy
                </span>
              </h4>
              <p className="text-[11px] text-slate-300">Complete forensic architecture, schema maps & roadmap documentation.</p>
            </div>
          </div>
          <Button
            onClick={copyAuditReport}
            className="rounded-xl font-bold text-xs h-10 px-4 shadow-lg transition-all bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
          >
            {copiedReport ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-white" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                Copy Full Audit (1-Click)
              </>
            )}
          </Button>
        </div>
        <CardContent className="p-4">
          <div className="relative">
            <pre className="text-[11px] font-mono leading-relaxed bg-black/50 p-4 rounded-xl max-h-72 overflow-y-auto text-emerald-300/90 border border-white/5 whitespace-pre-wrap select-all">
              {GGD_MASTER_AUDIT_REPORT}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
