import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Save, Settings, Upload, Loader2, Image, Plus, Trash2, CreditCard, 
  MessageCircle, Globe, Shield, Sparkles, Package, Zap, LayoutTemplate, 
  Palette, User, Award, Quote, CheckCircle2, Edit, X, Check, Eye, EyeOff, Play, Pause
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WEBSITE_TEMPLATES, getWebsiteTemplate } from "@/utils/websiteTemplates";
import defaultCeoFlyer from "@/assets/images/ceo_about_flyer_1789459834911.jpg";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { uploadImage, handleImageError, defaultAdImg } from "@/services/imageUploadService";

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
  const [uploadingCeoAvatar, setUploadingCeoAvatar] = useState(false);
  const [uploadingCeoFlyer, setUploadingCeoFlyer] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromo, setNewPromo] = useState({ title: '', description: '', image_url: '', type: 'flyer', target_audience: 'users', is_active: true });
  const [editingPromo, setEditingPromo] = useState<any | null>(null);
  const [uploadingPromoReplace, setUploadingPromoReplace] = useState(false);

  useEffect(() => { fetchSettings(); fetchPromos(); }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value; });

      // Also check Firestore admin_settings/about_page for about page config
      try {
        const fsDoc = await getDoc(doc(db, 'admin_settings', 'about_page'));
        if (fsDoc.exists()) {
          const fsData = fsDoc.data();
          Object.entries(fsData).forEach(([k, v]) => {
            if (map[k] === undefined && typeof v === 'string') {
              map[k] = v;
            }
          });
        }
      } catch (e) {
        // non-fatal
      }

      setSettings(map);
    } catch (err) {
      console.warn('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
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

    // Sync CEO & About page settings to Firestore for high durability
    if (key.startsWith('ceo_') || key === 'show_ceo_on_about_page') {
      try {
        await setDoc(doc(db, 'admin_settings', 'about_page'), {
          [key]: value,
          updated_at: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore about_page setting sync notice:', fsErr);
      }
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
        'auto_payout_enabled', 'max_auto_payout_amount', 'syndicate_withdraw_cooldown_hours',
        // Founder & CEO Profile Keys
        'show_ceo_on_about_page',
        'ceo_name', 'ceo_role', 'ceo_location', 'ceo_background', 'ceo_focus',
        'ceo_bio_1', 'ceo_bio_2', 'ceo_speech', 'ceo_avatar_url', 'ceo_flyer_url',
        'ceo_whatsapp', 'ceo_email'
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
    try {
      const publicUrl = await uploadImage(file, { folder: 'business-logos' });
      if (publicUrl) {
        await saveSetting('admin_logo_url', publicUrl);
        toast.success('Logo uploaded!');
      } else {
        toast.error('Logo upload failed');
      }
    } catch (err: any) {
      toast.error('Logo upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadCeoAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingCeoAvatar(true);
    try {
      const publicUrl = await uploadImage(file, { folder: 'business-logos' });
      if (publicUrl) {
        await saveSetting('ceo_avatar_url', publicUrl);
        toast.success('CEO Photo uploaded successfully!');
      } else {
        toast.error('Upload failed');
      }
    } catch (err: any) {
      toast.error('Failed to upload image: ' + err.message);
    } finally {
      setUploadingCeoAvatar(false);
    }
  };

  const uploadCeoFlyer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingCeoFlyer(true);
    try {
      const publicUrl = await uploadImage(file, { folder: 'slide-images' });
      if (publicUrl) {
        await saveSetting('ceo_flyer_url', publicUrl);
        toast.success('Executive Flyer uploaded successfully!');
      } else {
        toast.error('Upload failed');
      }
    } catch (err: any) {
      toast.error('Failed to upload flyer: ' + err.message);
    } finally {
      setUploadingCeoFlyer(false);
    }
  };

  const uploadPromoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const publicUrl = await uploadImage(file, { folder: 'slide-images' });
      if (publicUrl) {
        setNewPromo(prev => ({ ...prev, image_url: publicUrl }));
        toast.success('Promotional image ready!');
      }
    } catch {
      toast.error('Failed to process image');
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
    if (!confirm('Are you sure you want to delete this promotional flyer?')) return;
    await supabase.from('promotional_materials' as any).delete().eq('id', id);
    toast.success('Promotional flyer deleted!');
    fetchPromos();
  };

  const togglePromoActive = async (promo: any) => {
    const nextStatus = promo.is_active === false ? true : false;
    const { error } = await supabase.from('promotional_materials' as any).update({ is_active: nextStatus }).eq('id', promo.id);
    if (error) {
      toast.error('Failed to change status: ' + error.message);
      return;
    }
    toast.success(nextStatus ? 'Flyer activated (LIVE)' : 'Flyer deactivated (INACTIVE)');
    fetchPromos();
  };

  const uploadReplacePromoImage = async (file: File) => {
    setUploadingPromoReplace(true);
    const fileName = `promos/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
      setEditingPromo((prev: any) => prev ? { ...prev, image_url: publicUrl } : prev);
      toast.success('Replacement flyer image uploaded!');
    } else {
      toast.error('Failed to upload image: ' + error.message);
    }
    setUploadingPromoReplace(false);
  };

  const saveEditPromo = async () => {
    if (!editingPromo) return;
    if (!editingPromo.title?.trim()) { toast.error('Enter flyer title'); return; }
    const { error } = await supabase.from('promotional_materials' as any).update({
      title: editingPromo.title.trim(),
      description: editingPromo.description || null,
      image_url: editingPromo.image_url || null,
      is_active: editingPromo.is_active !== false,
      target_audience: editingPromo.target_audience || 'users',
      type: editingPromo.type || 'flyer',
    }).eq('id', editingPromo.id);

    if (error) {
      toast.error('Failed to update flyer: ' + error.message);
      return;
    }
    toast.success('Promotional flyer successfully updated!');
    setEditingPromo(null);
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
          <p className="text-[11px] opacity-80">Configure pricing, keys, rates, CEO profile, and platform branding</p>
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

      {/* FOUNDER & CEO PROFILE MANAGEMENT */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-200" />
            <h4 className="text-sm font-bold">Meet the Founder & CEO Profile Management</h4>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">About Page Feature</span>
        </div>
        <CardContent className="p-5 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Manage the official Founder & CEO profile displayed across the About Page, public executive address, and SEO Schema.org structured data indexing.
          </p>

          {/* MASTER VISIBILITY TOGGLE SWITCH */}
          <div className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
            settings.show_ceo_on_about_page === 'false'
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-orange-500/10 border-orange-500/30'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Public Visibility Control
                  </span>
                  {settings.show_ceo_on_about_page === 'false' ? (
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <EyeOff className="h-3 w-3" /> OFF • Hidden from About Page
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Eye className="h-3 w-3" /> LIVE • Visible on About Page
                    </span>
                  )}
                </div>
                <h5 className="text-sm font-bold text-foreground">
                  Display CEO Information & Executive Flyer on About Page
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Turn this switch <strong>OFF</strong> to completely conceal the Founder & CEO profile card, executive flyer banner, keynote message, and personal bio from the public About Page.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-xs font-bold text-muted-foreground">
                  {settings.show_ceo_on_about_page === 'false' ? 'Disabled' : 'Enabled'}
                </span>
                <Switch
                  checked={settings.show_ceo_on_about_page !== 'false'}
                  onCheckedChange={async (checked) => {
                    const val = checked ? 'true' : 'false';
                    setSettings(p => ({ ...p, show_ceo_on_about_page: val }));
                    try {
                      await saveSetting('show_ceo_on_about_page', val);
                      if (checked) {
                        toast.success('CEO Information switched ON (Visible on About Page)');
                      } else {
                        toast.success('CEO Information switched OFF (Hidden from About Page)');
                      }
                    } catch (err: any) {
                      toast.error('Failed to update CEO visibility: ' + (err.message || 'Error'));
                    }
                  }}
                  className="data-[state=checked]:bg-orange-600 cursor-pointer"
                />
              </div>
            </div>

            {settings.show_ceo_on_about_page === 'false' && (
              <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
                <span>Notice: CEO details are currently hidden from public visitors. You can still modify the profile below; your changes will be saved safely.</span>
              </div>
            )}
          </div>

          {/* Photo & Flyer Upload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/60">
            {/* CEO Avatar Photo */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Founder & CEO Photo / Portrait
              </Label>
              <input type="file" id="ceoAvatarUpload" accept="image/*" onChange={uploadCeoAvatar} className="hidden" />
              <div className="flex items-center gap-3">
                {settings.ceo_avatar_url ? (
                  <img
                    src={settings.ceo_avatar_url}
                    alt="CEO"
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-orange-500 shadow-md"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-orange-500/20 text-orange-600 flex items-center justify-center font-black text-xl border border-orange-500/30">
                    BC
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">
                    {settings.ceo_avatar_url ? "Photo Uploaded" : "Default Initials Portrait"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Upload high-res founder headshot</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingCeoAvatar}
                  onClick={() => document.getElementById('ceoAvatarUpload')?.click()}
                  className="rounded-xl text-xs gap-1 h-9"
                >
                  {uploadingCeoAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload Photo
                </Button>
              </div>
            </div>

            {/* CEO Executive Flyer */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Executive Keynote Flyer Graphic
              </Label>
              <input type="file" id="ceoFlyerUpload" accept="image/*" onChange={uploadCeoFlyer} className="hidden" />
              <div className="flex items-center gap-3">
                <img
                  src={settings.ceo_flyer_url || defaultCeoFlyer}
                  alt="Flyer"
                  className="h-16 w-28 rounded-xl object-cover ring-2 ring-orange-500/50 shadow-md bg-slate-900"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">About Speech Flyer</p>
                  <p className="text-[10px] text-muted-foreground">16:9 keynote announcement banner</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingCeoFlyer}
                  onClick={() => document.getElementById('ceoFlyerUpload')?.click()}
                  className="rounded-xl text-xs gap-1 h-9"
                >
                  {uploadingCeoFlyer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Change Flyer
                </Button>
              </div>
            </div>
          </div>

          {/* Core Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingField label="Founder Name" {...field('ceo_name')} placeholder="Bethel Chukwunyere" />
            <SettingField label="Role / Title" {...field('ceo_role')} placeholder="Founder & CEO" />
            <SettingField label="Location" {...field('ceo_location')} placeholder="Lagos, Nigeria" />
            <SettingField label="Founder WhatsApp" {...field('ceo_whatsapp')} placeholder="+234..." />
            <div className="col-span-1 sm:col-span-2">
              <SettingField label="Founder Email" {...field('ceo_email')} placeholder="contact@goodgiftdigital.com" />
            </div>
          </div>

          {/* Background & Strategic Focus */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Founder Background Summary
              </Label>
              <Input
                value={settings.ceo_background || ''}
                onChange={e => setSettings(p => ({ ...p, ceo_background: e.target.value }))}
                className="h-10 rounded-xl bg-secondary/30 border-0 font-medium text-xs"
                placeholder="Founder of Goodgift Digital, web developer, software product builder, and Mass Communication student at Miva Open University."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Key Strategic Focus
              </Label>
              <Input
                value={settings.ceo_focus || ''}
                onChange={e => setSettings(p => ({ ...p, ceo_focus: e.target.value }))}
                className="h-10 rounded-xl bg-secondary/30 border-0 font-medium text-xs"
                placeholder="Building AI-driven digital tools, automated ad platforms, and web solutions for African creators and businesses."
              />
            </div>
          </div>

          {/* 2-Paragraph Third-Person Bio */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Founder Bio - Paragraph 1 (Third-Person)
              </Label>
              <Textarea
                rows={3}
                value={settings.ceo_bio_1 || ''}
                onChange={e => setSettings(p => ({ ...p, ceo_bio_1: e.target.value }))}
                className="rounded-xl bg-secondary/30 border-0 text-xs leading-relaxed"
                placeholder="Bethel Chukwunyere is a visionary software product builder, full-stack web developer..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Founder Bio - Paragraph 2 (Third-Person)
              </Label>
              <Textarea
                rows={3}
                value={settings.ceo_bio_2 || ''}
                onChange={e => setSettings(p => ({ ...p, ceo_bio_2: e.target.value }))}
                className="rounded-xl bg-secondary/30 border-0 text-xs leading-relaxed"
                placeholder="Under his strategic direction, GGD Ad Network has pioneered a decentralized..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Founder's Keynote Speech / Message
              </Label>
              <Textarea
                rows={3}
                value={settings.ceo_speech || ''}
                onChange={e => setSettings(p => ({ ...p, ceo_speech: e.target.value }))}
                className="rounded-xl bg-secondary/30 border-0 text-xs leading-relaxed"
                placeholder="At GGD Ad Network, we believe every business deserves access to world-class advertising tools..."
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection([
                'show_ceo_on_about_page',
                'ceo_name', 'ceo_role', 'ceo_location', 'ceo_background', 'ceo_focus',
                'ceo_bio_1', 'ceo_bio_2', 'ceo_speech', 'ceo_avatar_url', 'ceo_flyer_url',
                'ceo_whatsapp', 'ceo_email'
              ], 'Founder & CEO Profile')}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" /> Save CEO Profile & Speech
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI & Media Services (Gemini & Pexels APIs) */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h4 className="text-sm font-bold">AI & Media APIs (Gemini & Pexels)</h4>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Platform Config</span>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gemini API Key (AI Blog & Ebook Generator)</Label>
              <Input
                type="password"
                value={settings.gemini_api_key || ''}
                onChange={e => setSettings(p => ({ ...p, gemini_api_key: e.target.value }))}
                className="h-10 rounded-xl bg-secondary/30 border-0 font-medium"
                placeholder="AIzaSy..."
              />
              <p className="text-[10px] text-muted-foreground">Powers the AI blog article creator, social copy assistant, and ebook generator.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pexels API Key (High-Res Stock Photos)</Label>
              <Input
                type="password"
                value={settings.pexels_api_key || ''}
                onChange={e => setSettings(p => ({ ...p, pexels_api_key: e.target.value }))}
                className="h-10 rounded-xl bg-secondary/30 border-0 font-medium"
                placeholder="Enter Pexels API Key..."
              />
              <p className="text-[10px] text-muted-foreground">Allows users and creators to search and insert free high-resolution feature photos directly into blogs and flyers.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={async () => {
                try {
                  await saveSection(['gemini_api_key', 'pexels_api_key'], 'AI & Media APIs');
                  // Also sync to server-side backend cache
                  await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      geminiApiKey: settings.gemini_api_key || '',
                      pexelsApiKey: settings.pexels_api_key || '',
                    })
                  });
                  toast.success('AI & Pexels API Keys synced to backend runtime!');
                } catch (e: any) {
                  toast.error('Failed to update API keys: ' + e.message);
                }
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" /> Save API Keys
            </Button>
          </div>
        </CardContent>
      </Card>

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
                <Label className="text-xs font-bold text-foreground">Automatic Syndicate Payouts</Label>
                <p className="text-[10px] text-muted-foreground">Automatically process withdrawals to promoters via Paystack Transfers API</p>
              </div>
              <input 
                type="checkbox" 
                className="h-5 w-5 accent-cyan-600" 
                checked={settings.auto_payout_enabled === 'true'}
                onChange={e => setSettings(p => ({ ...p, auto_payout_enabled: e.target.checked ? 'true' : 'false' }))} 
              />
            </div>

            {settings.auto_payout_enabled === 'true' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-cyan-200/50 dark:border-cyan-800/50">
                <SettingField 
                  label="Max Auto Payout Amount (₦)" 
                  {...field('max_auto_payout_amount')} 
                  type="number" 
                  placeholder="50000" 
                />
                <SettingField 
                  label="Withdrawal Cooldown (Hours)" 
                  {...field('syndicate_withdraw_cooldown_hours')} 
                  type="number" 
                  placeholder="24" 
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="button"
              size="sm"
              disabled={savingAll}
              onClick={() => saveSection([
                'paystack_public_key', 'paystack_secret_key', 
                'auto_payout_enabled', 'max_auto_payout_amount', 'syndicate_withdraw_cooldown_hours'
              ], 'Paystack & Auto Payouts')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-xs flex items-center gap-1.5"
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
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.swatchPrimary }} />
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.swatchSecondary }} />
                      </div>
                      {active && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.subtitle}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[9px] text-muted-foreground">
                    <span className="capitalize">{t.tag}</span>
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
        <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 p-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <h4 className="text-sm font-bold">Promotional Flyers & Marketing Materials</h4>
          </div>
          <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
            {promos.length} {promos.length === 1 ? 'Flyer' : 'Flyers'}
          </span>
        </div>
        <CardContent className="p-4 space-y-4">
          {/* Create New Flyer Form */}
          <div className="bg-secondary/30 p-3.5 rounded-xl space-y-3 border border-border/40">
            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-purple-600" /> Create New Promotional Flyer
            </h5>
            <Input 
              placeholder="Flyer title (e.g. Syndicate WhatsApp Status Flyer)" 
              value={newPromo.title} 
              onChange={e => setNewPromo(p => ({ ...p, title: e.target.value }))} 
              className="rounded-xl bg-background border text-xs" 
            />
            <Textarea 
              placeholder="Flyer description and instructions for users..." 
              rows={2} 
              value={newPromo.description} 
              onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} 
              className="rounded-xl bg-background border text-xs" 
            />
            <div className="flex items-center gap-2">
              <input type="file" id="promoImageUpload" accept="image/*" onChange={uploadPromoImage} className="hidden" />
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="flex-1 rounded-xl text-xs gap-1.5" 
                onClick={() => document.getElementById('promoImageUpload')?.click()}
              >
                <Upload className="h-3.5 w-3.5 text-purple-600" />
                {newPromo.image_url ? 'Change Selected Image' : 'Upload Flyer Image Banner'}
              </Button>
            </div>
            {newPromo.image_url && (
              <div className="relative rounded-xl overflow-hidden border border-border max-h-48 bg-black/5">
                <img loading="lazy" src={newPromo.image_url} alt="Preview" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => setNewPromo(p => ({ ...p, image_url: '' }))}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Button 
              type="button"
              onClick={addPromo} 
              className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-700 text-white rounded-xl h-10 shadow-md font-bold text-xs"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Promotional Material
            </Button>
          </div>

          {/* List of Existing Flyers */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Manage Existing Flyers ({promos.length})
            </h5>
            {promos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No promotional materials uploaded yet.</p>
            ) : (
              promos.map((p: any) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-xl shadow-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {p.image_url ? (
                      <img loading="lazy" src={p.image_url} alt={p.title} className="h-14 w-14 rounded-lg object-cover shadow-xs shrink-0 border" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Image className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-foreground truncate">{p.title}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          p.is_active !== false 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          {p.is_active !== false ? 'ACTIVE (LIVE)' : 'INACTIVE (PAUSED)'}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Deck */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {p.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                      <Switch 
                        checked={p.is_active !== false} 
                        onCheckedChange={() => togglePromoActive(p)} 
                        title="Toggle flyer activation status"
                      />
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 px-2.5 text-xs font-semibold rounded-lg gap-1 border-purple-200 hover:bg-purple-50 text-purple-700"
                      onClick={() => setEditingPromo({ ...p })}
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit / Replace
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:bg-rose-50 rounded-lg" 
                      onClick={() => deletePromo(p.id)}
                      title="Delete flyer permanently"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Flyer Dialog */}
      <Dialog open={!!editingPromo} onOpenChange={(open) => { if (!open) setEditingPromo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="h-4 w-4 text-purple-600" />
              Edit Promotional Flyer
            </DialogTitle>
          </DialogHeader>

          {editingPromo && (
            <div className="space-y-3.5 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Flyer Title</Label>
                <Input 
                  value={editingPromo.title || ''} 
                  onChange={e => setEditingPromo({ ...editingPromo, title: e.target.value })} 
                  className="text-xs" 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea 
                  rows={3} 
                  value={editingPromo.description || ''} 
                  onChange={e => setEditingPromo({ ...editingPromo, description: e.target.value })} 
                  className="text-xs" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Flyer Image & Replacement</Label>
                {editingPromo.image_url && (
                  <div className="rounded-xl overflow-hidden border border-border h-36 bg-black/5">
                    <img src={editingPromo.image_url} alt="Flyer" className="w-full h-full object-cover" />
                  </div>
                )}
                <input 
                  type="file" 
                  id="replacePromoImageInput" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) uploadReplacePromoImage(f);
                  }} 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={uploadingPromoReplace}
                  className="w-full text-xs font-semibold gap-1.5"
                  onClick={() => document.getElementById('replacePromoImageInput')?.click()}
                >
                  {uploadingPromoReplace ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-purple-600" />
                  )}
                  {uploadingPromoReplace ? 'Uploading Replacement...' : 'Replace Flyer Image'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border">
                <div>
                  <p className="text-xs font-bold text-foreground">Flyer Status</p>
                  <p className="text-[10px] text-muted-foreground">Make this flyer active and visible for user downloads</p>
                </div>
                <Switch 
                  checked={editingPromo.is_active !== false} 
                  onCheckedChange={checked => setEditingPromo({ ...editingPromo, is_active: checked })} 
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setEditingPromo(null)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={saveEditPromo}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save Flyer Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
