import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, Loader2, Globe, ExternalLink, Store, Plus, Trash2, Crown, ShoppingBag, Copy, Share2, Sparkles, Pencil, Eye, TrendingUp, Package, Megaphone, Mail, Users, Zap, BarChart3, Wallet, Link2, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import CollapsibleCampaigns from "@/components/CollapsibleCampaigns";

const BusinessStorefront = () => {
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newListing, setNewListing] = useState<any>({ title: '', description: '', long_description: '', price: '', image_url: '', video_url: '', listing_type: 'product' });
  const [addingListing, setAddingListing] = useState(false);
  const [uploadingListingImg, setUploadingListingImg] = useState(false);
  const [generatingHero, setGeneratingHero] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editListing, setEditListing] = useState<any>(null);
  const [savingListing, setSavingListing] = useState(false);
  const { isEnabled } = useFeatureToggles();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [profRes, catRes, listRes, slugRes] = await Promise.all([
      (supabase.from('business_profiles') as any).select('*').eq('user_id', user.id).single(),
      (supabase.from('business_categories') as any).select('*').eq('is_active', true).order('sort_order'),
      (supabase.from('business_listings') as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('business_slug').eq('user_id', user.id).maybeSingle(),
    ]);
    setProfile({ ...(profRes.data || {}), business_slug: (slugRes as any)?.data?.business_slug });
    setCategories(catRes.data || []);
    setListings(listRes.data || []);
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
    // Unified: business logo == user avatar
    await supabase.from('profiles').update({
      business_logo_url: publicUrl,
      avatar_url: publicUrl,
    }).eq('user_id', user.id);
    setUploading(false);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase.from('business_profiles') as any).update({
      business_name: profile.business_name,
      description: profile.description,
      whatsapp_link: profile.whatsapp_link,
      whatsapp_group_link: profile.whatsapp_group_link,
      website_link: profile.website_link,
      logo_url: profile.logo_url,
      facebook_url: profile.facebook_url,
      instagram_url: profile.instagram_url,
      twitter_url: profile.twitter_url,
      tiktok_url: profile.tiktok_url,
      telegram_url: profile.telegram_url,
      category_id: profile.category_id || null,
      phone_number: profile.phone_number,
      address: profile.address,
      paystack_public_key: profile.paystack_public_key,
    }).eq('id', profile.id);
    // Mirror shared fields back into profiles so the user profile page stays in sync
    if (user) {
      await supabase.from('profiles').update({
        business_name: profile.business_name || null,
        business_description: profile.description || null,
        business_phone: profile.phone_number || null,
        business_location: profile.address || null,
        business_website: profile.website_link || null,
        business_logo_url: profile.logo_url || null,
      }).eq('user_id', user.id);
    }
    if (error) toast.error("Save failed");
    else { toast.success("Business profile updated! 🎉"); fetchAll(); }
    setSaving(false);
  };

  const uploadListingImage = async (file: File) => {
    setUploadingListingImg(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingListingImg(false); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/listing_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploadingListingImg(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
    setNewListing(prev => ({ ...prev, image_url: publicUrl }));
    setUploadingListingImg(false);
  };

  const addListing = async () => {
    if (!newListing.title.trim()) { toast.error("Title is required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) return;
    const { error } = await (supabase.from('business_listings') as any).insert({
      business_profile_id: profile.id,
      user_id: user.id,
      title: newListing.title,
      description: newListing.description || null,
      long_description: newListing.long_description || null,
      video_url: newListing.video_url || null,
      listing_type: newListing.listing_type || 'product',
      price: parseFloat(newListing.price) || 0,
      image_url: newListing.image_url || null,
    });
    if (error) { toast.error("Failed to add listing"); return; }
    toast.success("Listing added! 🎉");
    setNewListing({ title: '', description: '', long_description: '', price: '', image_url: '', video_url: '', listing_type: 'product' });
    setAddingListing(false);
    fetchAll();
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await (supabase.from('business_listings') as any).delete().eq('id', id);
    toast.success("Listing deleted");
    fetchAll();
  };

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setEditListing({
      title: l.title || '',
      description: l.description || '',
      long_description: l.long_description || '',
      video_url: l.video_url || '',
      listing_type: l.listing_type || 'product',
      price: l.price?.toString() || '',
      image_url: l.image_url || '',
    });
  };

  const saveEditListing = async () => {
    if (!editingId || !editListing) return;
    if (!editListing.title.trim()) { toast.error("Title is required"); return; }
    setSavingListing(true);
    const { error } = await (supabase.from('business_listings') as any).update({
      title: editListing.title,
      description: editListing.description || null,
      long_description: editListing.long_description || null,
      video_url: editListing.video_url || null,
      listing_type: editListing.listing_type || 'product',
      price: parseFloat(editListing.price) || 0,
      image_url: editListing.image_url || null,
    }).eq('id', editingId);
    setSavingListing(false);
    if (error) { toast.error("Save failed"); return; }
    toast.success("Listing updated! ✨");
    setEditingId(null);
    setEditListing(null);
    fetchAll();
  };

  const uploadEditListingImage = async (file: File) => {
    setUploadingListingImg(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingListingImg(false); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/listing_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploadingListingImg(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
    setEditListing((p: any) => ({ ...p, image_url: publicUrl }));
    setUploadingListingImg(false);
  };

  const featureListing = async (listing: any) => {
    const cost = 10;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
    if (!prof || prof.credits < cost) { toast.error(`Need ${cost} credits to feature a listing`); return; }
    await supabase.from('profiles').update({ credits: prof.credits - cost }).eq('user_id', user.id);
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + 7);
    await (supabase.from('business_listings') as any).update({ is_featured: true, featured_until: featuredUntil.toISOString() }).eq('id', listing.id);
    toast.success("Listing featured for 7 days! ⭐");
    fetchAll();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!profile) return <div className="text-center py-8 text-muted-foreground">No business profile found.</div>;

  const slug = profile.business_slug;
  const siteUrl = slug
    ? `${window.location.origin}/b/${slug}`
    : profile.user_id ? `${window.location.origin}/user/${profile.user_id}` : '';
  const featuredCount = listings.filter((l: any) => l.is_featured).length;
  const productCount = listings.filter((l: any) => (l.listing_type || 'product') === 'product').length;
  const serviceCount = listings.filter((l: any) => l.listing_type === 'service').length;

  const scrollToTools = () => document.getElementById('bm-tools')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="w-full grid grid-cols-4 h-11">
        <TabsTrigger value="overview" className="text-xs font-semibold">Overview</TabsTrigger>
        <TabsTrigger value="profile" className="text-xs font-semibold">Profile</TabsTrigger>
        <TabsTrigger value="listings" className="text-xs font-semibold">Listings</TabsTrigger>
        {isEnabled('paystack_payments') ? <TabsTrigger value="payments" className="text-xs font-semibold">Pay</TabsTrigger> : <TabsTrigger value="tools" className="text-xs font-semibold">Tools</TabsTrigger>}
      </TabsList>

      {/* Overview Tab — Business Dashboard */}
      <TabsContent value="overview" className="space-y-4">
        {/* Hero card with business identity */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white relative">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="flex items-center gap-4 relative">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt={profile.business_name} className="h-16 w-16 rounded-2xl object-cover border-4 border-white/40 shadow-lg" />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Store className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black truncate">{profile.business_name || 'Your Business'}</p>
                <p className="text-[11px] opacity-90 truncate">{profile.description || 'Complete your profile to shine'}</p>
              </div>
            </div>
            {siteUrl && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Button size="sm" className="h-10 bg-white text-orange-600 hover:bg-white/90 font-bold text-xs" onClick={() => window.open(siteUrl, '_blank')}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Visit
                </Button>
                <Button size="sm" className="h-10 bg-white/20 text-white hover:bg-white/30 font-bold text-xs backdrop-blur" onClick={() => { navigator.clipboard.writeText(siteUrl); toast.success('Link copied!'); }}>
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy
                </Button>
                <Button size="sm" className="h-10 bg-white/20 text-white hover:bg-white/30 font-bold text-xs backdrop-blur" onClick={() => {
                  const text = `Check out my business: ${profile.business_name} — ${siteUrl}`;
                  if ((navigator as any).share) (navigator as any).share({ title: profile.business_name, text, url: siteUrl });
                  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}>
                  <Share2 className="h-3.5 w-3.5 mr-1" />Share
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto text-blue-600 mb-1" />
              <p className="text-lg font-black text-foreground">{productCount}</p>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold">Products</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-3 text-center">
              <Zap className="h-5 w-5 mx-auto text-purple-600 mb-1" />
              <p className="text-lg font-black text-foreground">{serviceCount}</p>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold">Services</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border-yellow-400/40">
            <CardContent className="p-3 text-center">
              <Crown className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
              <p className="text-lg font-black text-foreground">{featuredCount}</p>
              <p className="text-[9px] uppercase text-muted-foreground font-semibold">Featured</p>
            </CardContent>
          </Card>
        </div>

        {/* Business Tools Grid — all in one place */}
        <Card id="bm-tools">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-orange-500" />Business Tools</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {[
              { icon: Megaphone, label: 'Create Ad', color: 'from-orange-500 to-red-500', tab: 'ads-create' },
              { icon: Package, label: 'Add Listing', color: 'from-blue-500 to-cyan-500', action: () => { setAddingListing(true); const el = document.querySelector('[value="listings"]') as HTMLElement; el?.click(); } },
              { icon: Mail, label: 'Email Campaign', color: 'from-purple-500 to-pink-500', tab: 'email-campaigns' },
              { icon: Users, label: 'Lead Pages', color: 'from-emerald-500 to-teal-500', tab: 'email-capture' },
              ...(isEnabled('link_shortener') ? [{ icon: Link2, label: 'Smart Links', color: 'from-cyan-500 to-blue-500', tab: 'smart-links' }] : []),
              { icon: BarChart3, label: 'Analytics', color: 'from-indigo-500 to-blue-500', tab: 'ads' },
              { icon: Wallet, label: 'Wallet', color: 'from-amber-500 to-orange-500', tab: 'wallet' },
              ...(isEnabled('syndicate') && isEnabled('business_pays_syndicate') ? [{ icon: HandCoins, label: 'Pay Crew', color: 'from-green-500 to-emerald-600', tab: 'syndicate-payouts' }] : []),
            ].map((t: any, i) => (
              <button
                key={i}
                onClick={() => {
                  if (t.action) t.action();
                  else window.dispatchEvent(new CustomEvent('ggd-nav', { detail: t.tab }));
                }}
                className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted border border-border/50 hover:border-orange-400 active:scale-95 transition"
              >
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${t.color} grid place-items-center shadow-lg`}>
                  <t.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-foreground text-center leading-tight">{t.label}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Campaign Performance — collapsible accordion (space-optimized) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CollapsibleCampaigns />
          </CardContent>
        </Card>

        {/* Recent listings preview */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Recent Listings</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => (document.querySelector('[value="listings"]') as HTMLElement)?.click()}>
              View all →
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {listings.length === 0 ? (
              <div className="text-center py-6">
                <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Add your first product or service</p>
                <Button size="sm" className="h-10 px-6 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold" onClick={() => { setAddingListing(true); (document.querySelector('[value="listings"]') as HTMLElement)?.click(); }}>
                  <Plus className="h-4 w-4 mr-1" />Add Listing
                </Button>
              </div>
            ) : (
              listings.slice(0, 3).map((l: any) => (
                <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  {l.image_url ? <img src={l.image_url} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{l.title}</p>
                    {l.price > 0 && <p className="text-[10px] text-orange-600 font-semibold">₦{Number(l.price).toLocaleString()}</p>}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { startEdit(l); (document.querySelector('[value="listings"]') as HTMLElement)?.click(); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Profile Tab */}
      <TabsContent value="profile" className="space-y-4">
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
        </Card>

        {/* Your public site */}
        {profile.user_id && (() => {
          const slug = profile.business_slug;
          const siteUrl = slug
            ? `${window.location.origin}/b/${slug}`
            : `${window.location.origin}/user/${profile.user_id}`;
          return (
            <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-red-500/5">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-orange-600" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your website</p>
                </div>
                <p className="text-xs font-mono break-all text-orange-600">{siteUrl}</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => window.open(siteUrl, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" />Visit
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-8" onClick={() => { navigator.clipboard.writeText(siteUrl); toast.success('Link copied!'); }}>
                    <Copy className="h-3 w-3 mr-1" />Copy
                  </Button>
                  <Button size="sm" className="text-[10px] h-8 bg-gradient-to-r from-orange-500 to-red-600 text-white" onClick={() => {
                    const text = `Check out my business: ${profile.business_name} — ${siteUrl}`;
                    if ((navigator as any).share) (navigator as any).share({ title: profile.business_name, text, url: siteUrl });
                    else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}>
                    <Share2 className="h-3 w-3 mr-1" />Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Cover Image: Upload from phone, AI generator (toggleable) */}
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Site Cover Image</p>
            </div>
            {profile.hero_image_url && <img src={profile.hero_image_url} alt="Hero" className="w-full h-24 object-cover rounded-lg" />}
            <p className="text-[11px] text-muted-foreground">Upload your own cover photo from your phone, or generate one with AI.</p>

            {/* Upload from phone */}
            <label className="flex items-center justify-center gap-2 h-9 rounded-md border border-dashed border-purple-300 cursor-pointer hover:bg-purple-50 transition text-xs">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span>{profile.hero_image_url ? 'Replace cover image' : 'Upload cover image from phone'}</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setUploading(true);
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) { setUploading(false); return; }
                  const ext = file.name.split('.').pop();
                  const path = `${user.id}/hero_${Date.now()}.${ext}`;
                  const { error } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true });
                  if (error) { setUploading(false); toast.error('Upload failed'); return; }
                  const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(path);
                  await (supabase.from('business_profiles') as any).update({ hero_image_url: publicUrl }).eq('user_id', user.id);
                  setProfile((p: any) => ({ ...p, hero_image_url: publicUrl }));
                  setUploading(false);
                  toast.success('Cover image uploaded!');
                }} />
            </label>

            {isEnabled('ai_hero_generator') && (
              <Button size="sm" disabled={generatingHero} className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                onClick={async () => {
                  setGeneratingHero(true);
                  const cat = categories.find(c => c.id === profile.category_id)?.name;
                  const { data, error } = await supabase.functions.invoke('generate-business-hero', {
                    body: { businessName: profile.business_name, category: cat, description: profile.description },
                  });
                  setGeneratingHero(false);
                  if (error || (data as any)?.error) { toast.error('Generation failed'); return; }
                  setProfile((p: any) => ({ ...p, hero_image_url: (data as any).url }));
                  toast.success('AI hero banner generated! ✨');
                }}>
                {generatingHero ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                {profile.hero_image_url ? 'Regenerate with AI' : 'Generate with AI'}
              </Button>
            )}
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
              <Label className="text-xs">Category</Label>
              <Select value={profile.category_id || ''} onValueChange={v => setProfile({ ...profile, category_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={profile.description || ''} onChange={e => setProfile({ ...profile, description: e.target.value })} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone Number</Label>
              <Input value={profile.phone_number || ''} onChange={e => setProfile({ ...profile, phone_number: e.target.value })} className="mt-1" placeholder="+234..." />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={profile.address || ''} onChange={e => setProfile({ ...profile, address: e.target.value })} className="mt-1" placeholder="Business address" />
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
                  <Label className="text-xs">WhatsApp Group</Label>
                  <Input value={profile.whatsapp_group_link || ''} onChange={e => setProfile({ ...profile, whatsapp_group_link: e.target.value })} className="mt-1" placeholder="https://chat.whatsapp.com/..." />
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
      </TabsContent>

      {/* Listings Tab */}
      <TabsContent value="listings" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-foreground">My Products & Services</h3>
          <Button onClick={() => { setAddingListing(true); setEditingId(null); }} className="h-11 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-lg">
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </div>

        {addingListing && (
          <Card className="border-orange-200">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">New Listing</p>
              <Select value={newListing.listing_type} onValueChange={(v: string) => setNewListing({ ...newListing, listing_type: v })}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
              <Input className="h-11" placeholder="Product/Service name *" value={newListing.title} onChange={e => setNewListing({ ...newListing, title: e.target.value })} />
              <Textarea placeholder="Short description (shown on card)" value={newListing.description} onChange={e => setNewListing({ ...newListing, description: e.target.value })} rows={2} />
              <Textarea placeholder="Full details (shown on product page)" value={newListing.long_description} onChange={e => setNewListing({ ...newListing, long_description: e.target.value })} rows={4} />
              <Input className="h-11" placeholder="Price (₦)" type="number" value={newListing.price} onChange={e => setNewListing({ ...newListing, price: e.target.value })} />
              <div>
                <Label className="text-xs">Video URL (YouTube link or direct .mp4)</Label>
                <Input className="h-11 mt-1" placeholder="https://youtube.com/watch?v=... or https://.../video.mp4" value={newListing.video_url} onChange={e => setNewListing({ ...newListing, video_url: e.target.value })} />
              </div>
              <input type="file" id="listingImgUpload" accept="image/*" onChange={e => e.target.files?.[0] && uploadListingImage(e.target.files[0])} className="hidden" />
              <Button variant="outline" className="w-full h-11 text-xs font-bold" disabled={uploadingListingImg}
                onClick={() => document.getElementById('listingImgUpload')?.click()}>
                {uploadingListingImg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Image
              </Button>
              {newListing.image_url && <img src={newListing.image_url} alt="Preview" className="w-full rounded-lg" />}
              <div className="flex gap-2">
                <Button onClick={addListing} className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-lg">Save Listing</Button>
                <Button onClick={() => setAddingListing(false)} variant="outline" className="flex-1 h-12 font-bold">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {listings.length === 0 && !addingListing && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No listings yet. Add your products & services!</p>
          </div>
        )}

        {listings.map(l => editingId === l.id ? (
          <Card key={l.id} className="border-blue-300 ring-2 ring-blue-200">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Editing Listing</p>
              <Select value={editListing.listing_type} onValueChange={(v: string) => setEditListing({ ...editListing, listing_type: v })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
              <Input className="h-11" placeholder="Title *" value={editListing.title} onChange={e => setEditListing({ ...editListing, title: e.target.value })} />
              <Textarea placeholder="Short description" value={editListing.description} onChange={e => setEditListing({ ...editListing, description: e.target.value })} rows={2} />
              <Textarea placeholder="Full details" value={editListing.long_description} onChange={e => setEditListing({ ...editListing, long_description: e.target.value })} rows={4} />
              <Input className="h-11" placeholder="Price (₦)" type="number" value={editListing.price} onChange={e => setEditListing({ ...editListing, price: e.target.value })} />
              <Input className="h-11" placeholder="Video URL (optional)" value={editListing.video_url} onChange={e => setEditListing({ ...editListing, video_url: e.target.value })} />
              <input type="file" id={`editImg_${l.id}`} accept="image/*" onChange={e => e.target.files?.[0] && uploadEditListingImage(e.target.files[0])} className="hidden" />
              <Button variant="outline" className="w-full h-11 text-xs font-bold" disabled={uploadingListingImg}
                onClick={() => document.getElementById(`editImg_${l.id}`)?.click()}>
                {uploadingListingImg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {editListing.image_url ? 'Replace Image' : 'Upload Image'}
              </Button>
              {editListing.image_url && <img src={editListing.image_url} alt="Preview" className="w-full rounded-lg" />}
              <div className="flex gap-2">
                <Button onClick={saveEditListing} disabled={savingListing} className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg">
                  {savingListing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
                <Button onClick={() => { setEditingId(null); setEditListing(null); }} variant="outline" className="flex-1 h-12 font-bold">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card key={l.id} className={l.is_featured ? 'border-yellow-300 bg-gradient-to-br from-yellow-50/50 to-transparent' : ''}>
            <CardContent className="p-3">
              <div className="flex gap-3">
                {l.image_url ? (
                  <img src={l.image_url} alt={l.title} className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-muted grid place-items-center flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{l.title}</h4>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5">{l.listing_type === 'service' ? 'Service' : 'Product'}</Badge>
                        {l.is_featured && <Badge className="bg-yellow-400 text-yellow-900 text-[9px] h-4 px-1.5"><Crown className="h-2.5 w-2.5 mr-0.5" />Featured</Badge>}
                      </div>
                    </div>
                  </div>
                  {l.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{l.description}</p>}
                  {l.price > 0 && <p className="text-sm font-black text-orange-600 mt-1">₦{Number(l.price).toLocaleString()}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                <Button size="sm" variant="outline" className="h-10 text-[11px] font-bold" onClick={() => startEdit(l)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
                {!l.is_featured ? (
                  <Button size="sm" variant="outline" className="h-10 text-[11px] font-bold border-yellow-400 text-yellow-700 hover:bg-yellow-50" onClick={() => featureListing(l)}>
                    <Crown className="h-3.5 w-3.5 mr-1" />Feature
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-10 text-[11px] font-bold" disabled>
                    <Crown className="h-3.5 w-3.5 mr-1" />Active
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-10 text-[11px] font-bold text-destructive hover:bg-destructive/10" onClick={() => deleteListing(l.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* Tools Tab (when payments feature off) */}
      {!isEnabled('paystack_payments') && (
        <TabsContent value="tools" className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">All Business Tools</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { icon: Megaphone, label: 'Create Advert', color: 'from-orange-500 to-red-500', tab: 'ads-create' },
                { icon: Mail, label: 'Email Campaigns', color: 'from-purple-500 to-pink-500', tab: 'email-campaigns' },
                { icon: Users, label: 'Lead Capture Pages', color: 'from-emerald-500 to-teal-500', tab: 'email-capture' },
                ...(isEnabled('link_shortener') ? [{ icon: Link2, label: 'Smart Links', color: 'from-cyan-500 to-blue-500', tab: 'smart-links' }] : []),
                { icon: BarChart3, label: 'Analytics', color: 'from-indigo-500 to-blue-500', tab: 'ads' },
                { icon: Wallet, label: 'My Wallet', color: 'from-amber-500 to-orange-500', tab: 'wallet' },
                { icon: Globe, label: 'Visit My Site', color: 'from-emerald-500 to-teal-500', action: () => siteUrl && window.open(siteUrl, '_blank') },
              ].map((t: any, i) => (
                <button key={i}
                  onClick={() => t.action ? t.action() : window.dispatchEvent(new CustomEvent('ggd-nav', { detail: t.tab }))}
                  className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/50 hover:border-orange-400 active:scale-95 transition">
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${t.color} grid place-items-center shadow-md flex-shrink-0`}>
                    <t.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xs font-bold text-foreground text-left">{t.label}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* Payments Tab */}
      {isEnabled('paystack_payments') && (
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />Paystack Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Enter your Paystack public key to receive payments directly.</p>
              <div>
                <Label className="text-xs">Paystack Public Key</Label>
                <Input
                  value={profile.paystack_public_key || ''}
                  onChange={e => setProfile({ ...profile, paystack_public_key: e.target.value })}
                  className="mt-1 font-mono text-xs"
                  placeholder="pk_live_..."
                />
              </div>
              {profile.paystack_enabled ? (
                <Badge className="bg-green-100 text-green-700">✅ Payments Enabled by Admin</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-700">⏳ Pending Admin Approval</Badge>
              )}
              <Button onClick={saveProfile} disabled={saving} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Paystack Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default BusinessStorefront;
