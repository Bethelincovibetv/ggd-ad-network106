import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload,
  Loader2,
  Save,
  Building2,
  Store,
  MapPin,
  Phone,
  Globe,
  Share2,
  MessageCircle,
  Users,
  Facebook,
  Instagram,
  Send,
  ExternalLink,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface BusinessProfileSectionProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  categories: any[];
  onSaved: () => void;
}

export const BusinessProfileSection: React.FC<BusinessProfileSectionProps> = ({
  profile,
  setProfile,
  categories,
  onSaved,
}) => {
  const { isEnabled } = useFeatureToggles();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingHero, setGeneratingHero] = useState(false);

  // Upload Business Logo / Primary Identity (Unified across profiles & syndicates)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to upload photos");
        return;
      }

      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      // Unified: profile picture == business logo everywhere
      setProfile((prev: any) => ({ ...prev, logo_url: publicUrl }));

      // 1. Sync to profiles
      await supabase.from('profiles').update({
        business_logo_url: publicUrl,
        avatar_url: publicUrl,
      }).eq('user_id', user.id);

      // 2. Sync to business_profiles
      if (profile?.id) {
        await (supabase.from('business_profiles') as any)
          .update({ logo_url: publicUrl })
          .eq('id', profile.id);
      }

      // 3. Mirror to syndicate_profiles for single unified identity
      try {
        await supabase.from('syndicate_profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      } catch {
        // User may not be a syndicate
      }

      toast.success("Business profile photo updated! ✨");
    } catch (err: any) {
      toast.error("Logo upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploadingLogo(false);
    }
  };

  // Upload Hero/Cover Banner (Separate business visual asset - NOT a slider advert)
  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHero(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split('.').pop();
      const path = `${user.id}/hero-${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      setProfile((prev: any) => ({ ...prev, hero_image_url: publicUrl }));

      if (profile?.id) {
        await (supabase.from('business_profiles') as any)
          .update({ hero_image_url: publicUrl })
          .eq('id', profile.id);
      }

      toast.success("Cover banner updated! 🎨");
    } catch (err: any) {
      toast.error("Banner upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.business_name?.trim()) {
      toast.error("Business name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        business_name: profile.business_name.trim().slice(0, 120),
        description: profile.description?.trim().slice(0, 1000) || null,
        category_id: profile.category_id || null,
        phone_number: profile.phone_number?.trim() || null,
        address: profile.address?.trim() || null,
        whatsapp_link: profile.whatsapp_link?.trim() || null,
        whatsapp_group_link: profile.whatsapp_group_link?.trim() || null,
        website_link: profile.website_link?.trim() || null,
        facebook_url: profile.facebook_url?.trim() || null,
        instagram_url: profile.instagram_url?.trim() || null,
        twitter_url: profile.twitter_url?.trim() || null,
        tiktok_url: profile.tiktok_url?.trim() || null,
        telegram_url: profile.telegram_url?.trim() || null,
        paystack_public_key: profile.paystack_public_key?.trim() || null,
        logo_url: profile.logo_url || null,
        hero_image_url: profile.hero_image_url || null,
      };

      // 1. Update business_profiles
      if (profile.id) {
        const { error: bpErr } = await (supabase.from('business_profiles') as any)
          .update(payload)
          .eq('id', profile.id);
        if (bpErr) throw bpErr;
      }

      // 2. Mirror shared business fields to profiles table for cross-platform synchronization
      const categoryObj = categories.find(c => c.id === profile.category_id);
      await supabase.from('profiles').update({
        business_name: payload.business_name,
        business_description: payload.description,
        business_phone: payload.phone_number,
        business_location: payload.address,
        business_website: payload.website_link,
        business_category: categoryObj?.name || null,
        business_logo_url: payload.logo_url,
      }).eq('user_id', user.id);

      toast.success("Business profile saved successfully! 🎉");
      onSaved();
    } catch (err: any) {
      toast.error("Failed to save profile: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Identity Card */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            Visual Identity & Branding
          </CardTitle>
          <CardDescription className="text-xs">
            Manage your official business logo and storefront cover banner. Your logo serves as your primary business identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Cover Banner Upload */}
          <div>
            <Label className="text-xs font-bold text-foreground block mb-1.5">
              Storefront Cover Banner
            </Label>
            <div className="relative rounded-2xl overflow-hidden border border-border/70 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 h-36 sm:h-44 group">
              {profile?.hero_image_url ? (
                <img
                  src={profile.hero_image_url}
                  alt="Cover banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/80 p-4 text-center">
                  <ImageIcon className="h-8 w-8 mb-1 opacity-70" />
                  <p className="text-xs font-bold">No custom cover banner set</p>
                  <p className="text-[10px] opacity-80">Add a wide background banner to personalize your public storefront</p>
                </div>
              )}

              {/* Upload Cover Action Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroUpload}
                    disabled={uploadingHero}
                    className="hidden"
                  />
                  <div className="bg-white text-gray-900 font-bold text-xs px-3 py-2 rounded-xl shadow-lg hover:bg-white/90 flex items-center gap-1.5">
                    {uploadingHero ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {profile?.hero_image_url ? 'Change Banner' : 'Upload Banner'}
                  </div>
                </label>
              </div>

              <div className="absolute bottom-2 right-2">
                <label className="cursor-pointer sm:hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroUpload}
                    disabled={uploadingHero}
                    className="hidden"
                  />
                  <div className="bg-black/60 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg backdrop-blur flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Change
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Logo / Avatar Identity */}
          <div className="flex items-center gap-4 pt-2">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-orange-500/40 bg-muted shrink-0 shadow-md">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.business_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-500 text-white font-black text-xl">
                  {profile?.business_name ? profile.business_name.slice(0, 2).toUpperCase() : 'GB'}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground">Business Logo / Profile Photo</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Appears on all your listings, public storefront, and search directory.
              </p>
              <div className="mt-2.5">
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    className="h-9 text-xs font-bold gap-1.5 rounded-xl border-border/80 pointer-events-none"
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        {profile?.logo_url ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Business Information */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-black">Business Details</CardTitle>
          <CardDescription className="text-xs">
            Core information displayed to customers browsing your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          <div>
            <Label className="text-xs font-bold text-foreground">Official Business Name *</Label>
            <Input
              value={profile?.business_name || ''}
              onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              placeholder="e.g., Apex Tech Solutions, Glow Beauty Emporium"
              className="mt-1 h-11 text-sm font-semibold"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-foreground">Industry / Category</Label>
            <Select
              value={profile?.category_id || ''}
              onValueChange={(val) => setProfile({ ...profile, category_id: val })}
            >
              <SelectTrigger className="mt-1 h-11 text-sm">
                <SelectValue placeholder="Select your industry category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-bold text-foreground">About / Business Description</Label>
            <Textarea
              value={profile?.description || ''}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              placeholder="Describe what your business does, your experience, mission, and why customers should choose you..."
              rows={3}
              className="mt-1 text-xs leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 text-orange-500" />
                Phone Number
              </Label>
              <Input
                value={profile?.phone_number || ''}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                placeholder="+234 801 234 5678"
                className="mt-1 h-11 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-orange-500" />
                Physical Address / Location
              </Label>
              <Input
                value={profile?.address || ''}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Lagos, Nigeria"
                className="mt-1 h-11 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Online & Social Channels */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Share2 className="h-4 w-4 text-orange-500" />
            Contact Channels & Social Media
          </CardTitle>
          <CardDescription className="text-xs">
            Connect your WhatsApp and social channels so customers can chat with you instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                WhatsApp Contact Link or Number
              </Label>
              <Input
                value={profile?.whatsapp_link || ''}
                onChange={(e) => setProfile({ ...profile, whatsapp_link: e.target.value })}
                placeholder="https://wa.me/2348012345678 or phone number"
                className="mt-1 h-10 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-green-700" />
                WhatsApp Community / Group Link
              </Label>
              <Input
                value={profile?.whatsapp_group_link || ''}
                onChange={(e) => setProfile({ ...profile, whatsapp_group_link: e.target.value })}
                placeholder="https://chat.whatsapp.com/..."
                className="mt-1 h-10 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                Website URL
              </Label>
              <Input
                value={profile?.website_link || ''}
                onChange={(e) => setProfile({ ...profile, website_link: e.target.value })}
                placeholder="https://mybusiness.com"
                className="mt-1 h-10 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-600" />
                Facebook Page
              </Label>
              <Input
                value={profile?.facebook_url || ''}
                onChange={(e) => setProfile({ ...profile, facebook_url: e.target.value })}
                placeholder="https://facebook.com/yourbusiness"
                className="mt-1 h-10 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5 text-pink-600" />
                Instagram Profile
              </Label>
              <Input
                value={profile?.instagram_url || ''}
                onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })}
                placeholder="https://instagram.com/yourbusiness"
                className="mt-1 h-10 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-foreground" />
                TikTok Handle / Link
              </Label>
              <Input
                value={profile?.tiktok_url || ''}
                onChange={(e) => setProfile({ ...profile, tiktok_url: e.target.value })}
                placeholder="https://tiktok.com/@yourbusiness"
                className="mt-1 h-10 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-sky-500" />
                Telegram Channel / Chat
              </Label>
              <Input
                value={profile?.telegram_url || ''}
                onChange={(e) => setProfile({ ...profile, telegram_url: e.target.value })}
                placeholder="https://t.me/yourbusiness"
                className="mt-1 h-10 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paystack Payment Setup (if enabled) */}
      {isEnabled('paystack_payments') && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Paystack Online Checkout
            </CardTitle>
            <CardDescription className="text-xs">
              Direct checkout integration to accept card, transfer, and USSD payments from customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div>
              <Label className="text-xs font-bold text-foreground">Paystack Public Key</Label>
              <Input
                value={profile?.paystack_public_key || ''}
                onChange={(e) => setProfile({ ...profile, paystack_public_key: e.target.value })}
                placeholder="pk_live_..."
                className="mt-1 h-10 font-mono text-xs"
              />
            </div>
            {profile?.paystack_enabled ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Payments enabled and verified for your storefront
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Enter your live public key from your Paystack dashboard.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sticky Save Bar */}
      <div className="sticky bottom-4 z-20 pt-2">
        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full h-12 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-sm shadow-xl shadow-orange-500/20 rounded-2xl transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Business Profile Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BusinessProfileSection;
