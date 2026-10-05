import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Share2, 
  Copy, 
  Download, 
  Users, 
  Briefcase, 
  Sparkles, 
  Eye, 
  X, 
  UserPlus, 
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Percent,
  Megaphone,
  Edit,
  Upload,
  Trash2,
  Plus,
  Loader2,
  Save,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReferralsPage from "@/components/ReferralsPage";

interface PromotionalContentProps {
  initialTab?: string;
}

const PromotionalContent: React.FC<PromotionalContentProps> = ({ initialTab = 'referrals' }) => {
  const [activeSubTab, setActiveSubTab] = useState<string>('referrals');
  const [flyers, setFlyers] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [percentage, setPercentage] = useState('2');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Admin Management State
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingFlyer, setEditingFlyer] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlyer, setNewFlyer] = useState({ title: '', description: '', image_url: '', is_active: true });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingReplaceImage, setUploadingReplaceImage] = useState(false);

  useEffect(() => {
    if (initialTab === 'promo' || initialTab === 'flyers') {
      setActiveSubTab('flyers');
    } else if (initialTab === 'users' || initialTab === 'businesses') {
      setActiveSubTab('copy');
    } else {
      setActiveSubTab('referrals');
    }
  }, [initialTab]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let admin = false;
    if (user) {
      const [{ data: prof }, { data: setting }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('referral_code').eq('user_id', user.id).single(),
        supabase.from('app_settings').select('value').eq('key', 'referral_percentage').maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
      ]);
      if (prof?.referral_code) setReferralCode(prof.referral_code);
      if (setting?.value) setPercentage(setting.value);
      admin = (roles || []).some((r: any) => r.role === 'admin' || r.role === 'co_owner');
      setIsAdmin(admin);
    }

    let query = supabase.from('promotional_materials').select('*').order('created_at', { ascending: false });
    if (!admin) {
      query = query.eq('is_active', true) as any;
    }
    const { data: flyersData } = await query;
    setFlyers(flyersData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshFlyers = async () => {
    let query = supabase.from('promotional_materials').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
      query = query.eq('is_active', true) as any;
    }
    const { data } = await query;
    setFlyers(data || []);
  };

  const handleToggleFlyerActive = async (flyer: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextStatus = flyer.is_active === false ? true : false;
    const { error } = await supabase
      .from('promotional_materials')
      .update({ is_active: nextStatus })
      .eq('id', flyer.id);

    if (error) {
      toast.error('Failed to change flyer status: ' + error.message);
      return;
    }
    toast.success(nextStatus ? 'Flyer activated (LIVE)' : 'Flyer deactivated (PAUSED)');
    refreshFlyers();
  };

  const handleDeleteFlyer = async (flyerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this promotional flyer?')) return;
    const { error } = await supabase.from('promotional_materials').delete().eq('id', flyerId);
    if (error) {
      toast.error('Failed to delete flyer: ' + error.message);
      return;
    }
    toast.success('Promotional flyer deleted!');
    refreshFlyers();
  };

  const handleUploadNewFlyerImage = async (file: File) => {
    setUploadingImage(true);
    const fileName = `promos/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
      setNewFlyer(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Flyer image uploaded');
    } else {
      toast.error('Failed to upload flyer image');
    }
    setUploadingImage(false);
  };

  const handleUploadReplaceFlyerImage = async (file: File) => {
    setUploadingReplaceImage(true);
    const fileName = `promos/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
      setEditingFlyer((prev: any) => prev ? { ...prev, image_url: publicUrl } : prev);
      toast.success('Replacement flyer image uploaded!');
    } else {
      toast.error('Failed to upload replacement image');
    }
    setUploadingReplaceImage(false);
  };

  const handleCreateNewFlyer = async () => {
    if (!newFlyer.title.trim()) { toast.error('Enter flyer title'); return; }
    if (!newFlyer.image_url) { toast.error('Upload a flyer image'); return; }

    const { error } = await supabase.from('promotional_materials').insert({
      title: newFlyer.title.trim(),
      description: newFlyer.description.trim() || null,
      image_url: newFlyer.image_url,
      is_active: newFlyer.is_active,
      type: 'flyer',
      target_audience: 'users',
    });

    if (error) {
      toast.error('Failed to create flyer: ' + error.message);
      return;
    }

    toast.success('New promotional flyer added!');
    setNewFlyer({ title: '', description: '', image_url: '', is_active: true });
    setShowCreateModal(false);
    refreshFlyers();
  };

  const handleSaveEditFlyer = async () => {
    if (!editingFlyer) return;
    if (!editingFlyer.title?.trim()) { toast.error('Enter flyer title'); return; }

    const { error } = await supabase.from('promotional_materials').update({
      title: editingFlyer.title.trim(),
      description: editingFlyer.description || null,
      image_url: editingFlyer.image_url || null,
      is_active: editingFlyer.is_active !== false,
    }).eq('id', editingFlyer.id);

    if (error) {
      toast.error('Failed to update flyer: ' + error.message);
      return;
    }

    toast.success('Promotional flyer updated successfully!');
    setEditingFlyer(null);
    refreshFlyers();
  };

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : '';

  const downloadFlyer = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Flyer downloaded to your device!');
    } catch {
      toast.error('Failed to download flyer');
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const shareToWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareNative = (title: string, text: string) => {
    if (navigator.share) {
      navigator.share({ title, text, url: referralLink }).catch(() => {});
    } else {
      shareToWhatsApp(text);
    }
  };

  const shareCopies = {
    users: [
      {
        id: 'u1',
        title: 'Turn Social Media Into Daily Income',
        tag: 'For Social Media Users & Creators',
        text: `Hey! I just found GGD Ad Network — you can earn real money simply by sharing business ads on WhatsApp, Facebook, TikTok & Instagram!\n\n✅ 100% Free to join\n✅ Earn daily task rewards\n✅ Fast payouts straight to your account\n\n👉 Join with my link: ${referralLink}\n🔑 Referral Code: ${referralCode}`
      },
      {
        id: 'u2',
        title: 'Stop Scrolling For Free, Get Paid!',
        tag: 'WhatsApp Status / Stories',
        text: `Stop scrolling for free! With GGD Ad Network, your daily posts and status views earn you money.\n\n🎯 Easy tasks on mobile\n💵 Earn per verified task\n⚡ Trusted platform across Africa\n\nSign up in 30 seconds: ${referralLink}`
      },
      {
        id: 'u3',
        title: 'Syndicate Operator Program',
        tag: 'For Influencers & Group Admins',
        text: `Are you an admin of WhatsApp groups, Telegram channels, or have 500+ followers?\n\nJoin the GGD Ad Syndicate and get paid daily to distribute promotional campaigns for top businesses.\n\nApply now: ${referralLink}`
      }
    ],
    businesses: [
      {
        id: 'b1',
        title: 'Reach Thousands of Real African Customers',
        tag: 'For Business Owners & Brands',
        text: `Looking for real customers? GGD Ad Network connects your business with thousands of verified social media operators who share your ads across WhatsApp, Facebook, TikTok & Instagram.\n\n✅ Pay only for verified results\n✅ Proof of placement screenshots\n✅ Hyper-targeted state-by-state campaigns\n\nLaunch your first ad today: ${referralLink}`
      },
      {
        id: 'b2',
        title: 'Hyper-Local WhatsApp & Facebook Ads',
        tag: 'For Small Businesses & Merchants',
        text: `Put your products in front of buyers in your exact city or state!\n\nGGD Ad Network deploys real people to share your flyers and deals to active local WhatsApp groups and Facebook communities.\n\nGet started: ${referralLink}`
      }
    ]
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-foreground">Share & Earn Program</h1>
              <p className="text-xs text-muted-foreground">
                Grow your network, share promotional materials, and earn {percentage}% commission.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20 text-xs font-bold py-1 px-3 rounded-full">
            {percentage}% Lifetime Bonus
          </Badge>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full space-y-4">
        <TabsList className="w-full grid grid-cols-4 h-12 p-1 bg-muted/70 rounded-2xl">
          <TabsTrigger 
            value="referrals" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">My</span> Community
          </TabsTrigger>
          <TabsTrigger 
            value="copy" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span> Messages
          </TabsTrigger>
          <TabsTrigger 
            value="flyers" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Official</span> Flyers
          </TabsTrigger>
          <TabsTrigger 
            value="guide" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <HelpCircle className="h-4 w-4" />
            How It Works
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COMMUNITY & REFERRER (ReferralsPage) */}
        <TabsContent value="referrals" className="space-y-4 outline-none">
          <ReferralsPage onSelectTab={(tab) => setActiveSubTab(tab)} />
        </TabsContent>

        {/* TAB 2: PRE-WRITTEN SHARE MESSAGES */}
        <TabsContent value="copy" className="space-y-5 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Messages for Potential Earners & Creators
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                High-converting messages crafted for WhatsApp status, groups, and social chats.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              {shareCopies.users.map((c) => (
                <div 
                  key={c.id} 
                  className="p-4 rounded-xl border border-border bg-card space-y-3 hover:border-orange-500/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                    <Badge variant="secondary" className="text-[10px] font-semibold">{c.tag}</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground whitespace-pre-line leading-relaxed font-sans select-all">
                    {c.text}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => copyText(c.text, c.id)}
                      className="h-11 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted"
                    >
                      {copiedIndex === c.id ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" /> Copied!</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1.5" /> Copy Text</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => shareToWhatsApp(c.text)}
                      className="h-11 rounded-xl text-xs sm:text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    >
                      <Share2 className="h-4 w-4 mr-1.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Messages for Businesses & Advertisers
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Target business owners, merchants, and service providers who need promotion.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
              {shareCopies.businesses.map((c) => (
                <div 
                  key={c.id} 
                  className="p-4 rounded-xl border border-border bg-card space-y-3 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                    <Badge variant="secondary" className="text-[10px] font-semibold">{c.tag}</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground whitespace-pre-line leading-relaxed font-sans select-all">
                    {c.text}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => copyText(c.text, c.id)}
                      className="h-11 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted"
                    >
                      {copiedIndex === c.id ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" /> Copied!</>
                      ) : (
                        <><Copy className="h-4 w-4 mr-1.5" /> Copy Text</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => shareToWhatsApp(c.text)}
                      className="h-11 rounded-xl text-xs sm:text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    >
                      <Share2 className="h-4 w-4 mr-1.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MARKETING FLYERS */}
        <TabsContent value="flyers" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-500" />
                    Official Promotional Materials & Flyers
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download official banners to post on WhatsApp Status, Instagram Stories, and Facebook.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-semibold">
                    {flyers.length} {flyers.length === 1 ? 'Flyer' : 'Flyers'} Available
                  </Badge>
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      className="h-8 px-3 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-xs gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add New Flyer
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0">
              {/* Flyer Usage Guide */}
              <div className="p-3.5 mb-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-foreground space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-orange-600">
                  <Sparkles className="h-4 w-4" /> How to use these promotional materials:
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  1. Tap <strong>Download</strong> to save the flyer to your phone or computer.<br />
                  2. Upload it to your <strong>WhatsApp Status</strong>, <strong>Instagram Story</strong>, or <strong>Facebook Group</strong>.<br />
                  3. Include your personal referral link: <span className="font-mono font-semibold text-foreground select-all">{referralLink}</span> in the caption.
                </p>
              </div>

              {flyers.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-bold text-foreground">No promotional flyers available at this moment</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Check back soon or share the pre-written messages from the Share Messages tab!
                  </p>
                  {isAdmin && (
                    <Button 
                      size="sm" 
                      onClick={() => setShowCreateModal(true)}
                      className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Create First Flyer
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {flyers.map((f: any) => (
                    <Card key={f.id} className="overflow-hidden border border-border/80 hover:border-orange-500/40 transition-all flex flex-col justify-between shadow-sm relative">
                      <div>
                        {f.image_url ? (
                          <div 
                            className="relative cursor-pointer aspect-[4/3] overflow-hidden bg-muted group"
                            onClick={() => {
                              setPreviewImage(f.image_url);
                              setPreviewTitle(f.title || 'Promotional Flyer');
                            }}
                          >
                            <img 
                              loading="lazy"
                              src={f.image_url} 
                              alt={f.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white">
                                <Eye className="h-5 w-5" />
                              </span>
                              <span className="text-xs text-white font-bold">Tap to Preview</span>
                            </div>

                            {/* Admin Status Pill on Image */}
                            {isAdmin && (
                              <div className="absolute top-2 left-2 z-10">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-md ${
                                  f.is_active !== false 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-rose-600 text-white'
                                }`}>
                                  {f.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            No image preview
                          </div>
                        )}
                        <div className="p-3.5 space-y-1.5">
                          <h4 className="text-sm font-bold text-foreground truncate">{f.title || 'Official GGD Banner'}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {f.description || 'Promotional banner for social media distribution.'}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 pt-0 space-y-2">
                        {f.image_url && (
                          <Button 
                            size="sm" 
                            type="button"
                            onClick={() => downloadFlyer(f.image_url, f.title || 'GGD_Flyer')}
                            className="w-full h-10 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm flex items-center justify-center gap-2"
                          >
                            <Download className="h-4 w-4" /> Download Flyer
                          </Button>
                        )}

                        {/* Admin Action Deck on Card */}
                        {isAdmin && (
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1.5 bg-muted/20 p-2 rounded-xl">
                            <div className="flex items-center gap-1.5">
                              <Switch 
                                checked={f.is_active !== false} 
                                onCheckedChange={(e) => handleToggleFlyerActive(f)}
                                title={f.is_active !== false ? "Click to deactivate flyer" : "Click to activate flyer"}
                              />
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {f.is_active !== false ? 'Live' : 'Paused'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-semibold rounded-lg text-purple-700 border-purple-200 hover:bg-purple-50 gap-1"
                                onClick={() => setEditingFlyer({ ...f })}
                              >
                                <Edit className="h-3 w-3" /> Edit / Replace
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-rose-50 rounded-lg"
                                onClick={() => handleDeleteFlyer(f.id)}
                                title="Delete flyer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMIN EDIT FLYER MODAL */}
        <Dialog open={!!editingFlyer} onOpenChange={(open) => { if (!open) setEditingFlyer(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit className="h-4 w-4 text-purple-600" />
                Edit Promotional Flyer
              </DialogTitle>
            </DialogHeader>

            {editingFlyer && (
              <div className="space-y-3.5 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Flyer Title</Label>
                  <Input 
                    value={editingFlyer.title || ''} 
                    onChange={e => setEditingFlyer({ ...editingFlyer, title: e.target.value })} 
                    className="text-xs" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Description</Label>
                  <Textarea 
                    rows={3} 
                    value={editingFlyer.description || ''} 
                    onChange={e => setEditingFlyer({ ...editingFlyer, description: e.target.value })} 
                    className="text-xs" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Flyer Image & Replacement</Label>
                  {editingFlyer.image_url && (
                    <div className="rounded-xl overflow-hidden border border-border h-36 bg-black/5">
                      <img src={editingFlyer.image_url} alt="Flyer" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    id="promoReplaceInput" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadReplaceFlyerImage(f);
                    }} 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    disabled={uploadingReplaceImage}
                    className="w-full text-xs font-semibold gap-1.5"
                    onClick={() => document.getElementById('promoReplaceInput')?.click()}
                  >
                    {uploadingReplaceImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-purple-600" />
                    )}
                    {uploadingReplaceImage ? 'Uploading Replacement...' : 'Replace Flyer Image'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border">
                  <div>
                    <p className="text-xs font-bold text-foreground">Flyer Status</p>
                    <p className="text-[10px] text-muted-foreground">Make this flyer active and visible for user downloads</p>
                  </div>
                  <Switch 
                    checked={editingFlyer.is_active !== false} 
                    onCheckedChange={checked => setEditingFlyer({ ...editingFlyer, is_active: checked })} 
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setEditingFlyer(null)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveEditFlyer}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Save Flyer Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADMIN CREATE FLYER MODAL */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-600" />
                Add New Promotional Flyer
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Flyer Title *</Label>
                <Input 
                  placeholder="e.g. Syndicate Earnings WhatsApp Flyer"
                  value={newFlyer.title} 
                  onChange={e => setNewFlyer({ ...newFlyer, title: e.target.value })} 
                  className="text-xs" 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea 
                  placeholder="Instructions for promoters and users..."
                  rows={3} 
                  value={newFlyer.description} 
                  onChange={e => setNewFlyer({ ...newFlyer, description: e.target.value })} 
                  className="text-xs" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Flyer Image Banner *</Label>
                {newFlyer.image_url && (
                  <div className="rounded-xl overflow-hidden border border-border h-36 bg-black/5">
                    <img src={newFlyer.image_url} alt="New Flyer" className="w-full h-full object-cover" />
                  </div>
                )}
                <input 
                  type="file" 
                  id="newPromoFileInput" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadNewFlyerImage(f);
                  }} 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={uploadingImage}
                  className="w-full text-xs font-semibold gap-1.5"
                  onClick={() => document.getElementById('newPromoFileInput')?.click()}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-purple-600" />
                  )}
                  {uploadingImage ? 'Uploading Image...' : (newFlyer.image_url ? 'Change Image' : 'Upload Flyer Image')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl border">
                <div>
                  <p className="text-xs font-bold text-foreground">Make Active Immediately</p>
                  <p className="text-[10px] text-muted-foreground">Publish to all users right away</p>
                </div>
                <Switch 
                  checked={newFlyer.is_active} 
                  onCheckedChange={checked => setNewFlyer({ ...newFlyer, is_active: checked })} 
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleCreateNewFlyer}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Publish Flyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* TAB 4: HOW IT WORKS & FAQ */}
        <TabsContent value="guide" className="space-y-4 outline-none">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-orange-500" />
                Comprehensive Share & Earn Guide
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Understand the mechanics, attribution rules, and rewards of the GGD AD Network referral ecosystem.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    What is Share & Earn?
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Share & Earn is GGD AD Network’s native affiliate growth program. It allows any member—whether you're a business, a syndicate earner, or a general user—to earn continuous commission credits by recommending the platform to friends, creators, and local businesses.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    What Can You Share?
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You can share your unique referral link, your 6-digit referral code, pre-written high-converting WhatsApp messages, or high-definition promotional flyers designed specifically for WhatsApp Status and Instagram Stories.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    How Attribution Works
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When an invited user clicks your link, the URL parameter <code className="bg-muted px-1.5 py-0.5 rounded font-mono">?ref=CODE</code> automatically locks in your referral attribution. If they register manually, they can enter your referral code in the registration field. Once registered, their account is permanently linked to your community.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                    When & How Do You Earn?
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You earn a live <strong>{percentage}%</strong> commission bonus in GGD Credits whenever your referred users fund their wallet or earn credits through task completions. The credits are credited in real time to your Credit Wallet balance.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Where can you spend referral credits?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your referral credits function exactly like standard platform credits. You can use them to purchase banner advertising, broadcast campaigns across the network, unlock premium AI tools, or promote your verified business storefront!
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Full-screen Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm" 
          onClick={() => setPreviewImage(null)}
        >
          <div className="w-full max-w-2xl flex items-center justify-between pb-3 text-white" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold truncate">{previewTitle}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => downloadFlyer(previewImage, previewTitle)}
                className="h-9 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Download
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-9 w-9 text-white hover:bg-white/20 rounded-lg"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <img 
            loading="lazy" 
            src={previewImage} 
            alt={previewTitle} 
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
};

export default PromotionalContent;
