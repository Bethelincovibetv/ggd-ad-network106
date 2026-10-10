import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Camera, User, Mail, Lock, Shield, Crown, Briefcase, Users, Wallet, Video, Share2, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { uploadImageFile } from '@/services/imageUploadService';

const UserProfilePage = () => {
  const { isEnabled } = useFeatureToggles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Creator & Channel Preferences state
  const [creatorNiche, setCreatorNiche] = useState('finance');
  const [preferredVoice, setPreferredVoice] = useState('Kore');
  const [preferredRatio, setPreferredRatio] = useState('vertical');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['whatsapp', 'tiktok', 'youtube']);
  const [autoSfx, setAutoSfx] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setAuthUser(user);

    const [{ data: p }, { data: r }, { data: w }, { data: cats }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id),
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('business_categories').select('id,name').eq('is_active', true).order('sort_order'),
    ]);
    setProfile(p);
    setCategories((cats as any) || []);
    setRoles((r || []).map(x => x.role));
    setWallet(w);
    setDisplayName(p?.display_name || '');
    setBusinessName(p?.business_name || '');
    setBusinessDescription(p?.business_description || '');
    setBusinessCategory(p?.business_category || '');
    setBusinessLocation(p?.business_location || '');
    setBusinessPhone(p?.business_phone || '');
    setBusinessWebsite(p?.business_website || '');
    setNewEmail(user.email || '');

    // Load creator channel preferences from localStorage & profile metadata
    try {
      const savedVixora = localStorage.getItem('vixora_user_preferences');
      if (savedVixora) {
        const parsed = JSON.parse(savedVixora);
        if (parsed.niche) setCreatorNiche(parsed.niche);
        if (parsed.preferredVoice) setPreferredVoice(parsed.preferredVoice);
        if (parsed.preferredRatio) setPreferredRatio(parsed.preferredRatio);
        if (Array.isArray(parsed.channels)) setSelectedChannels(parsed.channels);
        if (typeof parsed.autoSfx === 'boolean') setAutoSfx(parsed.autoSfx);
      }
    } catch (e) {
      // Non-blocking
    }

    setLoading(false);
  };

  const toggleChannel = (chId: string) => {
    setSelectedChannels(prev => 
      prev.includes(chId) ? prev.filter(c => c !== chId) : [...prev, chId]
    );
  };

  const saveCreatorPreferences = async () => {
    setSaving(true);
    try {
      const payload = {
        niche: creatorNiche,
        preferredVoice,
        preferredRatio,
        channels: selectedChannels,
        autoSfx,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('vixora_user_preferences', JSON.stringify(payload));
      
      const existing = localStorage.getItem('ggd_creator_user');
      const existingUser = existing ? JSON.parse(existing) : {};
      localStorage.setItem('ggd_creator_user', JSON.stringify({
        ...existingUser,
        fullName: displayName || authUser?.email?.split('@')[0] || 'GGD Creator',
        email: authUser?.email,
        niche: creatorNiche,
        preferredVoice,
        aspectRatio: preferredRatio
      }));

      toast.success('Creator channel and video preferences saved!');
    } catch (err: any) {
      toast.error('Error saving creator preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!authUser) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploading(true);
    try {
      const publicUrl = await uploadImageFile(file, 'avatars');
      if (!publicUrl) {
        toast.error('Upload failed. Please try again.');
        setUploading(false);
        return;
      }

      // Unified: profile picture == business logo everywhere
      const { error: upErr } = await supabase.from('profiles').upsert({
        user_id: authUser.id,
        email: authUser.email,
        avatar_url: publicUrl,
        business_logo_url: publicUrl,
      }, { onConflict: 'user_id' });

      if (upErr) {
        console.warn('Notice saving photo to profiles:', upErr);
      }

      // Mirror to business_profiles (insert if missing)
      try {
        const { data: existingBP } = await (supabase.from('business_profiles') as any)
          .select('id').eq('user_id', authUser.id).maybeSingle();
        if (existingBP?.id) {
          await (supabase.from('business_profiles') as any).update({ logo_url: publicUrl }).eq('id', existingBP.id);
        } else {
          await (supabase.from('business_profiles') as any).insert({
            user_id: authUser.id,
            business_name: profile?.business_name || profile?.display_name || authUser.email?.split('@')[0] || 'My Business',
            logo_url: publicUrl,
          });
        }
      } catch (bpErr) {
        console.warn('Notice mirroring to business_profiles:', bpErr);
      }

      // Mirror to syndicate_profiles for single unified identity across the platform
      try {
        await supabase.from('syndicate_profiles').update({ avatar_url: publicUrl }).eq('user_id', authUser.id);
      } catch {
        // Ignore if user has no syndicate profile
      }

      setProfile((prev: any) => ({
        ...prev,
        avatar_url: publicUrl,
        business_logo_url: publicUrl,
      }));

      toast.success('Profile picture updated successfully!');
      load();
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error('Failed to update photo: ' + (err.message || 'Upload error'));
    } finally {
      setUploading(false);
    }
  };

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

  const saveProfile = async () => {
    if (!authUser) return;
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    const slugBase = slugify(businessName || displayName);
    const slug = slugBase ? `${slugBase}-${authUser.id.slice(0, 6)}` : null;
    const bn = businessName.trim().slice(0, 120) || null;
    const bd = businessDescription.trim().slice(0, 1000) || null;
    const bp = businessPhone.trim().slice(0, 30) || null;
    const bl = businessLocation.trim().slice(0, 120) || null;
    const bw = businessWebsite.trim().slice(0, 200) || null;
    const bc = businessCategory.trim().slice(0, 80) || null;

    const { error } = await supabase.from('profiles').upsert({
      user_id: authUser.id,
      email: authUser.email,
      display_name: displayName.trim().slice(0, 100),
      business_name: bn,
      business_description: bd,
      business_category: bc,
      business_location: bl,
      business_phone: bp,
      business_website: bw,
      business_slug: slug,
    }, { onConflict: 'user_id' });

    // Mirror shared business fields into business_profiles so both views show the same data
    if (bn) {
      const sharedLogo = profile?.business_logo_url || profile?.avatar_url || null;
      const { data: existingBP } = await (supabase.from('business_profiles') as any)
        .select('id').eq('user_id', authUser.id).maybeSingle();
      const bpPayload: any = {
        business_name: bn,
        description: bd,
        phone_number: bp,
        address: bl,
        website_link: bw,
        logo_url: sharedLogo,
      };
      if (existingBP?.id) {
        await (supabase.from('business_profiles') as any).update(bpPayload).eq('id', existingBP.id);
      } else {
        await (supabase.from('business_profiles') as any).insert({ ...bpPayload, user_id: authUser.id });
      }
    }

    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Profile saved');
    load();
  };

  const changeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Invalid email'); return; }
    if (newEmail === authUser?.email) { toast.error('Same as current email'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim().toLowerCase() },
      { emailRedirectTo: `${window.location.origin}` }
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Confirmation links sent. Check both inboxes to complete change.');
  };

  const changePassword = async () => {
    if (!currentPassword) { toast.error('Enter current password'); return; }
    if (newPassword.length < 8) { toast.error('New password must be 8+ characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    // Re-verify current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: authUser.email, password: currentPassword,
    });
    if (signInErr) { setSaving(false); toast.error('Current password is incorrect'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated');
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>;
  }

  const initials = (displayName || authUser?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Hero */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white relative">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-white text-orange-600 text-xl font-black">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white text-orange-600 grid place-items-center shadow-lg active:scale-95 transition"
                aria-label="Change profile picture"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black truncate">{displayName || 'Add your name'}</p>
              <p className="text-xs opacity-90 truncate">{authUser?.email}</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {roles.includes('admin') && <Badge className="bg-white/20 text-white text-[9px] gap-0.5"><Shield className="h-2.5 w-2.5" />Admin</Badge>}
                {roles.includes('premium') && <Badge className="bg-white/20 text-white text-[9px] gap-0.5"><Crown className="h-2.5 w-2.5" />Premium</Badge>}
                {roles.includes('business') && <Badge className="bg-white/20 text-white text-[9px] gap-0.5"><Briefcase className="h-2.5 w-2.5" />Business</Badge>}
                {roles.includes('syndicate') && <Badge className="bg-white/20 text-white text-[9px] gap-0.5"><Users className="h-2.5 w-2.5" />Syndicate</Badge>}
                {roles.length === 0 && <Badge className="bg-white/20 text-white text-[9px]">User</Badge>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur border border-white/20">
              <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90">Naira Task Wallet</p>
              <p className="text-xl font-black mt-0.5">₦{Number(wallet?.balance || 0).toLocaleString()}</p>
              <p className="text-[9px] opacity-75">Funded: ₦{Number(wallet?.total_funded || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur border border-white/20">
              <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90">GGG Credits</p>
              <p className="text-xl font-black mt-0.5">{profile?.credits ?? 0} <span className="text-xs font-normal opacity-80">cr</span></p>
              <p className="text-[9px] opacity-75">In-app currency</p>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="profile" className="text-xs"><User className="h-3.5 w-3.5 mr-1" />Profile</TabsTrigger>
          <TabsTrigger value="creator" className="text-xs"><Video className="h-3.5 w-3.5 mr-1 text-orange-500" />Creator Channels</TabsTrigger>
          <TabsTrigger value="email" className="text-xs"><Mail className="h-3.5 w-3.5 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="password" className="text-xs"><Lock className="h-3.5 w-3.5 mr-1" />Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Personal information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Display name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={100} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Business name</Label>
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)} maxLength={120} className="mt-1" placeholder="Your business or brand" />
              </div>
              <div>
                <Label className="text-xs">Business description</Label>
                <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} maxLength={1000} rows={3}
                  placeholder="What you do, products, services, what makes you unique…"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs" />
                <p className="text-[10px] text-muted-foreground mt-1">Used to auto-generate your professional public site & SEO description.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={businessCategory || undefined} onValueChange={setBusinessCategory}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {categories.map(c => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
                      {businessCategory && !categories.find(c => c.name === businessCategory) && (
                        <SelectItem value={businessCategory}>{businessCategory}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={businessLocation} onChange={e => setBusinessLocation(e.target.value)} maxLength={120} className="mt-1" placeholder="City, State" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Phone / WhatsApp</Label>
                  <Input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} maxLength={30} className="mt-1" placeholder="+234…" />
                </div>
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input value={businessWebsite} onChange={e => setBusinessWebsite(e.target.value)} maxLength={200} className="mt-1" placeholder="https://" />
                </div>
              </div>
              {profile?.business_slug && (
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Your professional site</p>
                  <a href={`/b/${profile.business_slug}`} target="_blank" rel="noreferrer" className="text-xs break-all text-orange-600 hover:underline font-semibold">
                    {`${window.location.origin}/b/${profile.business_slug}`}
                  </a>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Referral code</p>
                  <p className="font-mono font-semibold">{profile?.referral_code || 'N/A'}</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Joined</p>
                  <p className="font-semibold">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save changes
              </Button>
            </CardContent>
          </Card>

          {/* Referral share card */}
          {profile?.referral_code && isEnabled('referral_system') && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><Users className="h-4 w-4 text-orange-500" />Refer & earn</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Share your link — earn credits when friends join.</p>
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-3">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Your link</p>
                  <p className="text-xs font-mono break-all mt-1">{`${window.location.origin}?ref=${profile.referral_code}`}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?ref=${profile.referral_code}`); toast.success('Link copied!'); }}>
                    Copy link
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white" onClick={() => {
                    const url = `${window.location.origin}?ref=${profile.referral_code}`;
                    const text = `Join GGD Ad Network and earn — ${url}`;
                    if (navigator.share) navigator.share({ title: 'Join me', text, url }); else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}>
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CREATOR & CHANNEL PREFERENCES TAB */}
        <TabsContent value="creator" className="space-y-4">
          <Card className="border shadow-md rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-orange-500" /> Creator Channel & Distribution Settings
                </span>
                <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 text-[10px] uppercase font-black">
                  Vixora Studio Sync
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PUBLISHING CHANNELS */}
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span>Target Content Distribution Channels</span>
                  <span className="text-[10px] text-muted-foreground">Select where you publish</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp Status & Groups', icon: 'fa-whatsapp', color: 'text-emerald-500 bg-emerald-500/10' },
                    { id: 'tiktok', label: 'TikTok Shorts', icon: 'fa-tiktok', color: 'text-pink-500 bg-pink-500/10' },
                    { id: 'youtube', label: 'YouTube Shorts', icon: 'fa-youtube', color: 'text-red-500 bg-red-500/10' },
                    { id: 'instagram', label: 'Instagram Reels', icon: 'fa-instagram', color: 'text-purple-500 bg-purple-500/10' },
                    { id: 'facebook', label: 'Facebook Reels & Pages', icon: 'fa-facebook', color: 'text-blue-500 bg-blue-500/10' },
                    { id: 'telegram', label: 'Telegram Broadcast', icon: 'fa-telegram', color: 'text-sky-500 bg-sky-500/10' },
                  ].map(ch => {
                    const active = selectedChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs font-bold cursor-pointer ${
                          active 
                            ? 'border-orange-500 bg-orange-500/10 text-foreground shadow-sm' 
                            : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${ch.color}`}>
                            <i className={`fa-brands ${ch.icon} text-xs`}></i>
                          </span>
                          <span className="truncate text-[11px]">{ch.label}</span>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 text-orange-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CREATOR NICHE */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold">Default Creator Niche</Label>
                <Select value={creatorNiche} onValueChange={setCreatorNiche}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Select primary niche" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="finance">💰 Wealth, Money & Investing</SelectItem>
                    <SelectItem value="motivation">🔥 Motivation, Stoic & Mindset</SelectItem>
                    <SelectItem value="tech">⚡ AI, Future Tech & Breakdowns</SelectItem>
                    <SelectItem value="history">📜 Untold African History & Culture</SelectItem>
                    <SelectItem value="health">🌿 Health, Energy & Vitality</SelectItem>
                    <SelectItem value="ecommerce">🛍️ Product Deals & Business Offers</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Vixora AI will automatically adapt script tones, hooks, and visual search terms to this niche.</p>
              </div>

              {/* DEFAULT VOICE & ASPECT RATIO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Preferred AI Video Voice</Label>
                  <Select value={preferredVoice} onValueChange={setPreferredVoice}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="Kore">Kore (Vixora Signature Flagship AI)</SelectItem>
                      <SelectItem value="Aoede">Aoede (Warm Storytelling)</SelectItem>
                      <SelectItem value="Puck">Puck (Viral High-Energy)</SelectItem>
                      <SelectItem value="Charon">Charon (Deep Cinematic)</SelectItem>
                      <SelectItem value="Fenrir">Fenrir (Bold Tech)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Default Video Ratio</Label>
                  <Select value={preferredRatio} onValueChange={setPreferredRatio}>
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue placeholder="Select ratio" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="vertical">9:16 (Vertical Shorts / Reels / TikTok)</SelectItem>
                      <SelectItem value="horizontal">16:9 (Widescreen Landscape)</SelectItem>
                      <SelectItem value="square">1:1 (Square Feed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AUTO-SFX TOGGLE */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                <div>
                  <p className="text-xs font-bold text-foreground">Auto-SFX Sound Effects</p>
                  <p className="text-[10px] text-muted-foreground">Automatically add transition whooshes and audio pops to video scenes</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSfx}
                  onChange={(e) => setAutoSfx(e.target.checked)}
                  className="h-4 w-4 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              <Button
                onClick={saveCreatorPreferences}
                disabled={saving}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Save Creator & Channel Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Change email</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-800">
                We'll send a confirmation link to your <strong>new</strong> email. Your email will only update after you click that link.
              </div>
              <div>
                <Label className="text-xs">Current email</Label>
                <Input value={authUser?.email || ''} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <Label className="text-xs">New email</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={changeEmail} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Send confirmation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="space-y-3">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Change password</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Current password</Label>
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1" autoComplete="current-password" />
              </div>
              <div>
                <Label className="text-xs">New password (8+ characters)</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" autoComplete="new-password" />
              </div>
              <div>
                <Label className="text-xs">Confirm new password</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" autoComplete="new-password" />
              </div>
              <Button onClick={changePassword} disabled={saving} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Update password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfilePage;
