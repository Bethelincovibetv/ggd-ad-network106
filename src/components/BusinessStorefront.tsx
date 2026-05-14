import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, Loader2, Globe, Phone, Facebook, Instagram, Send, ExternalLink, Store, Plus, Trash2, Crown, MessageCircle, ShoppingBag, Copy, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

const BusinessStorefront = () => {
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newListing, setNewListing] = useState({ title: '', description: '', price: '', image_url: '' });
  const [addingListing, setAddingListing] = useState(false);
  const [uploadingListingImg, setUploadingListingImg] = useState(false);
  const [generatingHero, setGeneratingHero] = useState(false);
  const { isEnabled } = useFeatureToggles();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [profRes, catRes, listRes] = await Promise.all([
      (supabase.from('business_profiles') as any).select('*').eq('user_id', user.id).single(),
      (supabase.from('business_categories') as any).select('*').eq('is_active', true).order('sort_order'),
      (supabase.from('business_listings') as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setProfile(profRes.data);
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
    else toast.success("Business profile updated! 🎉");
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
      price: parseFloat(newListing.price) || 0,
      image_url: newListing.image_url || null,
    });
    if (error) { toast.error("Failed to add listing"); return; }
    toast.success("Listing added! 🎉");
    setNewListing({ title: '', description: '', price: '', image_url: '' });
    setAddingListing(false);
    fetchAll();
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    await (supabase.from('business_listings') as any).delete().eq('id', id);
    toast.success("Listing deleted");
    fetchAll();
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

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
        <TabsTrigger value="listings" className="text-xs">Listings</TabsTrigger>
        {isEnabled('paystack_payments') && <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>}
      </TabsList>

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
          const siteUrl = `${window.location.origin}/user/${profile.user_id}`;
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
              <input type="file" accept="image/*" capture="environment" className="hidden"
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
          <h3 className="text-sm font-bold text-foreground">My Products & Services</h3>
          <Button size="sm" onClick={() => setAddingListing(true)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
            <Plus className="h-3 w-3 mr-1" />Add Listing
          </Button>
        </div>

        {addingListing && (
          <Card className="border-orange-200">
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Product/Service name *" value={newListing.title} onChange={e => setNewListing({ ...newListing, title: e.target.value })} />
              <Textarea placeholder="Description" value={newListing.description} onChange={e => setNewListing({ ...newListing, description: e.target.value })} rows={2} />
              <Input placeholder="Price (₦)" type="number" value={newListing.price} onChange={e => setNewListing({ ...newListing, price: e.target.value })} />
              <input type="file" id="listingImgUpload" accept="image/*" onChange={e => e.target.files?.[0] && uploadListingImage(e.target.files[0])} className="hidden" />
              <Button variant="outline" className="w-full text-xs" disabled={uploadingListingImg}
                onClick={() => document.getElementById('listingImgUpload')?.click()}>
                {uploadingListingImg ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload Image
              </Button>
              {newListing.image_url && <img src={newListing.image_url} alt="Preview" className="w-full rounded-lg" />}
              <div className="flex gap-2">
                <Button onClick={addListing} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">Add Listing</Button>
                <Button onClick={() => setAddingListing(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
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

        {listings.map(l => (
          <Card key={l.id} className={l.is_featured ? 'border-yellow-300' : ''}>
            <CardContent className="p-3">
              <div className="flex gap-3">
                {l.image_url && <img src={l.image_url} alt={l.title} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-foreground">{l.title}</h4>
                      {l.is_featured && <Badge className="bg-yellow-400 text-yellow-900 text-[8px]"><Crown className="h-2 w-2 mr-0.5" />Featured</Badge>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteListing(l.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {l.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{l.description}</p>}
                  <div className="flex items-center justify-between mt-1">
                    {l.price > 0 && <span className="text-xs font-bold text-orange-600">₦{Number(l.price).toLocaleString()}</span>}
                    {!l.is_featured && (
                      <Button size="sm" variant="outline" className="h-6 text-[9px] gap-1" onClick={() => featureListing(l)}>
                        <Crown className="h-2.5 w-2.5" />Feature (10cr)
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

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
