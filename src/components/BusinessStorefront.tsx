import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save, Upload, Loader2, Globe, Phone, Facebook, Instagram, Send, ExternalLink, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BusinessStorefront = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase.from('business_profiles') as any).select('*').eq('user_id', user.id).single();
    setProfile(data);
    setLoading(false);
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
    setProfile((p: any) => ({ ...p, logo_url: publicUrl }));
    setUploading(false);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await (supabase.from('business_profiles') as any).update({
      business_name: profile.business_name,
      description: profile.description,
      whatsapp_link: profile.whatsapp_link,
      website_link: profile.website_link,
      logo_url: profile.logo_url,
      facebook_url: profile.facebook_url,
      instagram_url: profile.instagram_url,
      twitter_url: profile.twitter_url,
      tiktok_url: profile.tiktok_url,
      telegram_url: profile.telegram_url,
    }).eq('id', profile.id);
    if (error) toast.error("Save failed");
    else toast.success("Business profile updated! 🎉");
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="text-center py-8 text-muted-foreground">No business profile found.</div>;

  return (
    <div className="space-y-4">
      {/* Storefront Preview */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-6 text-center text-white">
          {profile.logo_url ? (
            <img src={profile.logo_url} alt={profile.business_name} className="h-20 w-20 rounded-2xl mx-auto mb-3 object-cover border-4 border-white/30 shadow-xl" />
          ) : (
            <div className="h-20 w-20 rounded-2xl mx-auto mb-3 bg-white/20 flex items-center justify-center">
              <Store className="h-10 w-10 text-white/80" />
            </div>
          )}
          <h2 className="text-xl font-black">{profile.business_name}</h2>
          {profile.description && <p className="text-sm text-white/80 mt-1">{profile.description}</p>}
        </div>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {profile.whatsapp_link && (
              <Button size="sm" variant="outline" className="text-xs gap-1 border-green-200 text-green-700" onClick={() => window.open(profile.whatsapp_link, '_blank')}>
                <Phone className="h-3 w-3" />WhatsApp
              </Button>
            )}
            {profile.website_link && (
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => window.open(profile.website_link, '_blank')}>
                <Globe className="h-3 w-3" />Website
              </Button>
            )}
            {profile.facebook_url && (
              <Button size="sm" variant="outline" className="text-xs gap-1 border-blue-200 text-blue-700" onClick={() => window.open(profile.facebook_url, '_blank')}>
                <Facebook className="h-3 w-3" />Facebook
              </Button>
            )}
            {profile.instagram_url && (
              <Button size="sm" variant="outline" className="text-xs gap-1 border-pink-200 text-pink-700" onClick={() => window.open(profile.instagram_url, '_blank')}>
                <Instagram className="h-3 w-3" />Instagram
              </Button>
            )}
            {profile.telegram_url && (
              <Button size="sm" variant="outline" className="text-xs gap-1 border-sky-200 text-sky-700" onClick={() => window.open(profile.telegram_url, '_blank')}>
                <Send className="h-3 w-3" />Telegram
              </Button>
            )}
            {profile.tiktok_url && (
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => window.open(profile.tiktok_url, '_blank')}>
                <ExternalLink className="h-3 w-3" />TikTok
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Edit Business Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Business Name</Label>
            <Input value={profile.business_name || ''} onChange={e => setProfile({ ...profile, business_name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={profile.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })} rows={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Logo</Label>
            <input type="file" id="storefrontLogoUpload" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="hidden" />
            <Button variant="outline" className="w-full mt-1 text-xs" disabled={uploading}
              onClick={() => document.getElementById('storefrontLogoUpload')?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </Button>
          </div>
          <div className="border-t pt-3 mt-2">
            <h4 className="text-xs font-bold text-foreground mb-2">🔗 Links & Social Media</h4>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input value={profile.whatsapp_link || ''} onChange={e => setProfile({ ...profile, whatsapp_link: e.target.value })} className="mt-1" placeholder="https://wa.me/..." />
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input value={profile.website_link || ''} onChange={e => setProfile({ ...profile, website_link: e.target.value })} className="mt-1" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Facebook</Label>
                <Input value={profile.facebook_url || ''} onChange={e => setProfile({ ...profile, facebook_url: e.target.value })} className="mt-1" placeholder="https://facebook.com/..." />
              </div>
              <div>
                <Label className="text-xs">Instagram</Label>
                <Input value={profile.instagram_url || ''} onChange={e => setProfile({ ...profile, instagram_url: e.target.value })} className="mt-1" placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label className="text-xs">TikTok</Label>
                <Input value={profile.tiktok_url || ''} onChange={e => setProfile({ ...profile, tiktok_url: e.target.value })} className="mt-1" placeholder="https://tiktok.com/@..." />
              </div>
              <div>
                <Label className="text-xs">Telegram</Label>
                <Input value={profile.telegram_url || ''} onChange={e => setProfile({ ...profile, telegram_url: e.target.value })} className="mt-1" placeholder="https://t.me/..." />
              </div>
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessStorefront;
