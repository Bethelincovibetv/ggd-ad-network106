import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Eye, BarChart3, Key, Copy, Code, LogOut, Upload, Loader2, ExternalLink, Crown, Wallet, MessageCircle, Shield, Briefcase, Users, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

import MobileFooterMenu from "@/components/MobileFooterMenu";
import NotificationBell from "@/components/NotificationBell";
import SlideCarousel from "@/components/SlideCarousel";
import TaskList from "@/components/TaskList";
import SupportPage from "@/components/SupportPage";
import InstallPrompt from "@/components/InstallPrompt";
import SideNavMenu from "@/components/SideNavMenu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import BusinessTaskCreator from "@/components/BusinessTaskCreator";
import SyndicateDashboard from "@/components/SyndicateDashboard";
import SyndicateWallet from "@/components/SyndicateWallet";
import TaskWalletFunding from "@/components/TaskWalletFunding";
import UpgradePage from "@/components/UpgradePage";
import PremiumUpgrade from "@/components/PremiumUpgrade";
import CreditFunding from "@/components/CreditFunding";
import CreditTransfer from "@/components/CreditTransfer";
import AboutPage from "@/components/AboutPage";
import SetupWizard from "@/components/SetupWizard";
import PromotionalContent from "@/components/PromotionalContent";
import AdminChatWidget from "@/components/AdminChatWidget";
import AdDisplayPreview from "@/components/AdDisplayPreview";
import MarketingAppsMarketplace from "@/components/MarketingAppsMarketplace";
import BusinessStorefront from "@/components/BusinessStorefront";
import BusinessDirectory from "@/components/BusinessDirectory";
import UserGuide from "@/components/UserGuide";
import ApiDocumentation from "@/components/ApiDocumentation";
import BusinessGuide from "@/components/BusinessGuide";
import SyndicateGuide from "@/components/SyndicateGuide";
import UserProfilePage from "@/components/UserProfilePage";
import LinkShortener from "@/components/LinkShortener";
import ggdLogo from '@/assets/ggd-logo.png';

interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  target_url: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  created_at: string;
  expires_at: string | null;
}

interface ApiKey {
  id: string;
  api_key: string;
  name: string;
  domain: string | null;
  is_active: boolean;
  requests_count: number;
  created_at: string;
}

interface DashboardProps {
  onLogout: () => void;
  userEmail: string;
}

const Dashboard = ({ onLogout, userEmail }: DashboardProps) => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAd, setNewAd] = useState({ title: '', description: '', image_url: '', target_url: '', is_active: true, duration: '7' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDomain, setNewKeyDomain] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isSyndicate, setIsSyndicate] = useState(false);
  const [credits, setCredits] = useState(0);
  const [adCostCredits, setAdCostCredits] = useState(5);
  const [activeTab, setActiveTab] = useState('ads');
  const { isEnabled } = useFeatureToggles();
  const [showWizard, setShowWizard] = useState(false);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => { initDashboard(); }, []);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const userRoles = (roles || []).map(r => r.role);
    setIsAdmin(userRoles.includes('admin'));
    setIsPremium(userRoles.includes('premium'));
    setIsBusiness(userRoles.includes('business'));
    setIsSyndicate(userRoles.includes('syndicate'));

    const { data: profile } = await supabase.from('profiles').select('credits, last_credit_date, referral_code').eq('user_id', user.id).single();
    const { data: settings } = await supabase.from('app_settings').select('*');
    
    const loginCreditsAmount = parseInt(settings?.find(s => s.key === 'login_credits')?.value || '10');
    const adCost = parseInt(settings?.find(s => s.key === 'ad_cost_credits')?.value || '5');
    setAdCostCredits(adCost);
    const waGroup = settings?.find(s => s.key === 'whatsapp_group_link')?.value || '';
    setWhatsappGroupLink(waGroup);

    // Check if first visit for wizard
    const wizardSeen = localStorage.getItem('ggd_wizard_seen');
    if (!wizardSeen) setShowWizard(true);

    if (profile) {
      if (!profile.referral_code) {
        const code = 'GGD' + Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id);
      }
      const today = new Date().toISOString().split('T')[0];
      if (profile.last_credit_date !== today && !userRoles.includes('admin')) {
        const newCredits = (profile.credits || 0) + loginCreditsAmount;
        await supabase.from('profiles').update({ credits: newCredits, last_credit_date: today }).eq('user_id', user.id);
        setCredits(newCredits);
        toast.success(`🎉 You earned ${loginCreditsAmount} credits for logging in today!`);
      } else {
        setCredits(profile.credits || 0);
      }
    }

    fetchAds();
    fetchApiKeys();
  };

  const fetchAds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('ads').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAds(data || []);
    setLoading(false);
  };

  const fetchApiKeys = async () => {
    const { data } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    setApiKeys(data || []);
  };

  const uploadAdImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('ad-images').upload(fileName, file, { upsert: true });
      if (error) { toast.error("Failed to upload image"); return null; }
      const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(fileName);
      return publicUrl;
    } catch {
      toast.error("Image upload failed");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNewAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAdImage(file);
    if (url) setNewAd(prev => ({ ...prev, image_url: url }));
  };

  const handleEditAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAdImage(file);
    if (url && editingAd) setEditingAd(prev => prev ? { ...prev, image_url: url } : null);
  };

  const createAd = async () => {
    if (!newAd.title.trim() || !newAd.target_url.trim()) { toast.error("Title and target URL are required"); return; }
    const duration = parseInt(newAd.duration);
    if (duration > 7 && !isPremium && !isAdmin) {
      toast.error("Upgrade to Premium for ads longer than 7 days!");
      setActiveTab('premium');
      return;
    }
    if (!isAdmin && credits < adCostCredits) { toast.error(`Not enough credits. Need ${adCostCredits}, have ${credits}`); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    const { error } = await supabase.from('ads').insert({
      user_id: user.id, title: newAd.title, description: newAd.description || '',
      image_url: newAd.image_url || null, target_url: newAd.target_url, is_active: newAd.is_active,
      expires_at: expiresAt.toISOString(),
    });
    if (error) { toast.error("Failed to create ad"); return; }
    if (!isAdmin) {
      const newCredits = credits - adCostCredits;
      await supabase.from('profiles').update({ credits: newCredits }).eq('user_id', user.id);
      setCredits(newCredits);
    }
    toast.success("Ad created!");
    setNewAd({ title: '', description: '', image_url: '', target_url: '', is_active: true, duration: '7' });
    setIsCreating(false);
    fetchAds();
  };

  const updateAd = async () => {
    if (!editingAd) return;
    const { error } = await supabase.from('ads').update({
      title: editingAd.title, description: editingAd.description, image_url: editingAd.image_url,
      target_url: editingAd.target_url, is_active: editingAd.is_active,
    }).eq('id', editingAd.id);
    if (error) { toast.error("Failed to update ad"); return; }
    toast.success("Ad updated!");
    setEditingAd(null);
    fetchAds();
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    await supabase.from('ads').delete().eq('id', id);
    toast.success("Ad deleted!");
    fetchAds();
  };

  const createApiKey = async () => {
    if (!isPremium && !isAdmin) { toast.error("Upgrade to Premium to create API keys"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('api_keys').insert({ user_id: user.id, name: newKeyName || 'Default', domain: newKeyDomain || null });
    if (error) { toast.error("Failed to create API key"); return; }
    toast.success("API key created!");
    setNewKeyName('');
    setNewKeyDomain('');
    fetchApiKeys();
  };

  const deleteApiKey = async (id: string) => {
    await supabase.from('api_keys').delete().eq('id', id);
    toast.success("API key deleted!");
    fetchApiKeys();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const getEmbedCode = (apiKey: string) => {
    return `<!-- GGD Ad Network -->
<div id="ggd-ad-container"></div>
<script>
(function() {
  var API_KEY = "${apiKey}";
  var API_URL = "${supabaseUrl}/functions/v1/serve-ads";
  var container = document.getElementById("ggd-ad-container");
  var ads = [], currentIndex = 0;
  function fetchAds() {
    fetch(API_URL + "?api_key=" + API_KEY)
      .then(function(r) { return r.json(); })
      .then(function(data) { if (data.ads && data.ads.length > 0) { ads = data.ads; displayAd(); } })
      .catch(function(e) { console.error("GGD:", e); });
  }
  function trackEvent(adId, type) {
    fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ad_id: adId, event_type: type, api_key: API_KEY, referrer: window.location.href })
    }).catch(function() {});
  }
  function displayAd() {
    if (!ads.length) return;
    var ad = ads[currentIndex];
    trackEvent(ad.id, "impression");
    var html = '<div style="max-width:100%;margin:10px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.12);font-family:system-ui,sans-serif;cursor:pointer;background:#fff" onclick="window.open(\\''+ad.target_url+'\\',\\'_blank\\')">';
    if (ad.image_url) html += '<img src="'+ad.image_url+'" style="width:100%;display:block" alt="'+ad.title+'">';
    if (ad.title) {
      html += '<div style="padding:10px 14px"><h3 style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a">'+ad.title+'</h3>';
      if (ad.description) html += '<p style="margin:4px 0 0;font-size:12px;color:#666">'+ad.description+'</p>';
      html += '</div>';
    }
    html += '<div style="background:#f9f9f9;padding:3px;text-align:center;font-size:9px;color:#bbb">Ad by GGD Network</div></div>';
    container.innerHTML = html;
    currentIndex = (currentIndex + 1) % ads.length;
  }
  fetchAds();
  setInterval(function() { displayAd(); }, 8000);
})();
</script>`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleUpgraded = () => { initDashboard(); };

  const isExpired = (ad: Ad) => ad.expires_at ? new Date(ad.expires_at) < new Date() : false;
  const daysLeft = (ad: Ad) => {
    if (!ad.expires_at) return null;
    const diff = new Date(ad.expires_at).getTime() - Date.now();
    return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 pb-20">
        <header className="bg-card/80 backdrop-blur border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={ggdLogo} alt="GGD" className="h-7 w-7 rounded-lg" />
              <h1 className="text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GGD Ad Network</h1>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-4">
          <SetupWizard onComplete={() => { setShowWizard(false); localStorage.setItem('ggd_wizard_seen', 'true'); }} onNavigate={setActiveTab} />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'ads':
        return (
          <div className="space-y-4">
            {isEnabled('slides') && <SlideCarousel />}
            
            {/* Ad Display Preview */}
            {isEnabled('ads') && <AdDisplayPreview />}

            <div className="grid grid-cols-3 gap-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <Wallet className="h-5 w-5 mx-auto mb-1 text-green-600" />
                  <div className="text-2xl font-bold text-foreground">{isAdmin ? '∞' : credits}</div>
                  <div className="text-xs text-muted-foreground">Credits</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <BarChart3 className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                  <div className="text-2xl font-bold text-foreground">{ads.length}</div>
                  <div className="text-xs text-muted-foreground">My Ads</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm cursor-pointer" onClick={() => setActiveTab('fund-credits')}>
                <CardContent className="p-3 text-center">
                  <Plus className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                  <div className="text-sm font-bold text-orange-600">Buy</div>
                  <div className="text-xs text-muted-foreground">Credits</div>
                </CardContent>
              </Card>
            </div>

            {/* WhatsApp Group */}
            {whatsappGroupLink && (
              <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer"
                onClick={() => window.open(whatsappGroupLink, '_blank')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm font-bold text-green-800">Join Our WhatsApp Group</p>
                    <p className="text-[10px] text-green-600">Get updates, tips & connect with the community</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Role Badges */}
            <div className="flex gap-2 flex-wrap">
              {isPremium && (
                <Card className="flex-1 min-w-0 border-yellow-200 bg-yellow-50">
                  <CardContent className="p-2 text-center">
                    <Crown className="h-4 w-4 mx-auto text-yellow-500" />
                    <p className="text-[10px] font-medium text-yellow-700 mt-1">Premium 👑</p>
                  </CardContent>
                </Card>
              )}
              {isBusiness && (
                <Card className="flex-1 min-w-0 border-blue-200 bg-blue-50">
                  <CardContent className="p-2 text-center">
                    <Briefcase className="h-4 w-4 mx-auto text-blue-600" />
                    <p className="text-[10px] font-medium text-blue-700 mt-1">Business</p>
                  </CardContent>
                </Card>
              )}
              {isSyndicate && (
                <Card className="flex-1 min-w-0 border-purple-200 bg-purple-50">
                  <CardContent className="p-2 text-center">
                    <Users className="h-4 w-4 mx-auto text-purple-600" />
                    <p className="text-[10px] font-medium text-purple-700 mt-1">Syndicate ✓</p>
                  </CardContent>
                </Card>
              )}
              {!isPremium && !isAdmin && (
                <Card className="flex-1 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 cursor-pointer" onClick={() => setActiveTab('premium')}>
                  <CardContent className="p-2 text-center">
                    <Crown className="h-4 w-4 mx-auto text-yellow-500" />
                    <p className="text-[10px] font-medium text-yellow-700 mt-1">Go Premium →</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* My Campaigns */}
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-foreground">My Campaigns</h2>
              <Button onClick={() => setIsCreating(true)} size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
                <Plus className="h-3 w-3 mr-1" />New Ad ({isAdmin ? 'Free' : `${adCostCredits}cr`})
              </Button>
            </div>

            {isCreating && (
              <Card className="border-orange-200">
                <CardContent className="p-4 space-y-3">
                  <Input placeholder="Ad Title *" value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} />
                  <Textarea placeholder="Description (optional)" value={newAd.description} onChange={e => setNewAd({ ...newAd, description: e.target.value })} rows={2} />
                  <Input placeholder="Target URL * (https://...)" value={newAd.target_url} onChange={e => setNewAd({ ...newAd, target_url: e.target.value })} />
                  <div>
                    <Label className="text-xs font-medium">Duration</Label>
                    <Select value={newAd.duration} onValueChange={v => setNewAd({ ...newAd, duration: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Day</SelectItem>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="7">7 Days</SelectItem>
                        {(isPremium || isAdmin) && <SelectItem value="14">14 Days</SelectItem>}
                        {(isPremium || isAdmin) && <SelectItem value="30">30 Days</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Banner Image</Label>
                    <input type="file" id="newAdImageUpload" accept="image/*" onChange={handleNewAdImageUpload} className="hidden" />
                    <Button variant="outline" className="w-full h-9 text-xs" disabled={uploadingImage}
                      onClick={() => document.getElementById('newAdImageUpload')?.click()}>
                      {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {uploadingImage ? 'Uploading...' : 'Upload Banner'}
                    </Button>
                    {newAd.image_url && (
                      <div className="relative">
                        <img src={newAd.image_url} alt="Banner preview" className="w-full rounded-lg" />
                        <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => setNewAd({ ...newAd, image_url: '' })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newAd.is_active} onCheckedChange={c => setNewAd({ ...newAd, is_active: c })} />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createAd} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
                      Create ({isAdmin ? 'Free' : `${adCostCredits} credits`})
                    </Button>
                    <Button onClick={() => setIsCreating(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {editingAd && (
              <Card className="border-blue-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Edit Ad</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input value={editingAd.title} onChange={e => setEditingAd({ ...editingAd, title: e.target.value })} />
                  <Textarea placeholder="Description" value={editingAd.description} onChange={e => setEditingAd({ ...editingAd, description: e.target.value })} rows={2} />
                  <Input value={editingAd.target_url} onChange={e => setEditingAd({ ...editingAd, target_url: e.target.value })} />
                  <input type="file" id="editAdImageUpload" accept="image/*" onChange={handleEditAdImageUpload} className="hidden" />
                  <Button variant="outline" className="w-full h-9 text-xs" disabled={uploadingImage}
                    onClick={() => document.getElementById('editAdImageUpload')?.click()}>
                    {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {editingAd.image_url ? 'Change Banner' : 'Upload Banner'}
                  </Button>
                  {editingAd.image_url && (
                    <div className="relative">
                      <img src={editingAd.image_url} alt="Banner" className="w-full rounded-lg" />
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => setEditingAd({ ...editingAd, image_url: null })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch checked={editingAd.is_active} onCheckedChange={c => setEditingAd({ ...editingAd, is_active: c })} />
                    <Label className="text-xs">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={updateAd} className="flex-1 text-xs">Update</Button>
                    <Button onClick={() => setEditingAd(null)} variant="outline" className="flex-1 text-xs">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {ads.map(ad => {
                const expired = isExpired(ad);
                const remaining = daysLeft(ad);
                return (
                  <Card key={ad.id} className={`overflow-hidden ${expired ? 'opacity-50 border-destructive/30' : ad.is_active ? 'border-green-200' : 'opacity-60'}`}>
                    <CardContent className="p-0">
                      {ad.image_url && <img src={ad.image_url} alt={ad.title} className="w-full" />}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-foreground">{ad.title}</h3>
                            {ad.description && <p className="text-xs text-muted-foreground mt-0.5">{ad.description}</p>}
                            <a href={ad.target_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-orange-600 hover:underline truncate block mt-1">{ad.target_url}</a>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingAd(ad)}><Edit className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAd(ad.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex gap-3 text-[11px] text-muted-foreground">
                            <span>👁️ {ad.impressions}</span><span>🖱️ {ad.clicks}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {expired ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>
                            ) : remaining !== null ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{remaining}d left</span>
                            ) : null}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ad.is_active && !expired ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                              {ad.is_active && !expired ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {ads.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No ads yet. Create your first campaign!</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'tasks':
        return isEnabled('tasks') ? <TaskList onCreditsUpdate={setCredits} credits={credits} /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'fund-credits':
        return isEnabled('credit_funding') ? <CreditFunding credits={credits} onCreditsUpdate={setCredits} /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'transfer':
        return isEnabled('credit_transfer') ? <CreditTransfer credits={credits} onCreditsUpdate={setCredits} isPremium={isPremium} /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'premium':
        return isEnabled('premium_upgrade') ? <PremiumUpgrade onUpgraded={handleUpgraded} credits={credits} isPremium={isPremium} /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'marketplace':
        return isEnabled('marketing_apps') ? <MarketingAppsMarketplace /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'promo':
        return isEnabled('promotional_content') ? <PromotionalContent /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'guide':
        if (isBusiness) return <BusinessGuide />;
        if (isSyndicate) return <SyndicateGuide />;
        return <UserGuide />;

      case 'user-guide':
        return <UserGuide />;

      case 'business-guide':
        return <BusinessGuide />;

      case 'syndicate-guide':
        return <SyndicateGuide />;

      case 'wizard':
        return <SetupWizard onComplete={() => setActiveTab('ads')} onNavigate={(tab) => { setActiveTab(tab); }} />;

      case 'about':
        return <AboutPage />;

      case 'business-tasks':
        return isEnabled('business_tasks') ? <BusinessTaskCreator /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'profile':
        return <UserProfilePage />;

      case 'smart-links':
        return <LinkShortener />;

      case 'my-business':
        return <BusinessStorefront />;

      case 'directory':
        return <BusinessDirectory isBusiness={isBusiness} />;

      case 'syndicate':
        return isEnabled('syndicate') ? <SyndicateDashboard /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'syndicate-wallet':
        return isEnabled('syndicate') ? <SyndicateWallet /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'task-wallet':
        return <TaskWalletFunding />;

      case 'upgrade':
        return <UpgradePage onUpgraded={handleUpgraded} credits={credits} />;

      case 'api-keys':
        return (
          <div className="space-y-4">
            {!isPremium && !isAdmin ? (
              <Card className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
                <CardContent className="p-6 text-center space-y-3">
                  <Crown className="h-10 w-10 mx-auto text-yellow-500" />
                  <h3 className="font-bold text-foreground">Premium Feature</h3>
                  <p className="text-sm text-muted-foreground">API keys and embed codes are available for Premium users.</p>
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white" onClick={() => setActiveTab('premium')}>
                    <Crown className="h-4 w-4 mr-2" />Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Generate API Key</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Input placeholder="Key name (e.g. My Blog)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="h-9 text-sm" />
                    <Input placeholder="Domain (optional)" value={newKeyDomain} onChange={e => setNewKeyDomain(e.target.value)} className="h-9 text-sm" />
                    <Button onClick={createApiKey} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
                      <Key className="h-4 w-4 mr-1" />Generate Key
                    </Button>
                  </CardContent>
                </Card>
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <Card key={key.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-xs">{key.name}</h3>
                            <code className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded block truncate">{key.api_key}</code>
                            {key.domain && <p className="text-[10px] text-muted-foreground mt-1">{key.domain}</p>}
                            <p className="text-[10px] text-muted-foreground">{key.requests_count} requests</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(key.api_key)}><Copy className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteApiKey(key.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Embed Code</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {apiKeys.length === 0 ? (
                      <p className="text-center py-6 text-sm text-muted-foreground">Create an API key first</p>
                    ) : (
                      apiKeys.map(key => (
                        <div key={key.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold text-xs">{key.name}</Label>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyToClipboard(getEmbedCode(key.api_key))}>
                              <Copy className="h-3 w-3 mr-1" />Copy
                            </Button>
                          </div>
                          <div className="bg-gray-950 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-[10px] text-green-400 whitespace-pre-wrap">{getEmbedCode(key.api_key)}</pre>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* API Documentation */}
                <ApiDocumentation />
              </>
            )}
          </div>
        );

      case 'support':
        return <SupportPage userEmail={userEmail} />;

      case 'admin':
        return null;

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-orange-50">
        <SideNavMenu
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isBusiness={isBusiness}
          isSyndicate={isSyndicate}
          isAdmin={isAdmin}
          isPremium={isPremium}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-border sticky top-0 z-40">
            <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="flex-shrink-0" />
                <img src={ggdLogo} alt="GGD" className="h-7 w-7 rounded-lg flex-shrink-0 md:hidden" />
                <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent truncate">
                  GGD Ad Network
                </h1>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isAdmin && <Shield className="h-4 w-4 text-red-500" />}
                {isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
                {isBusiness && <Briefcase className="h-4 w-4 text-blue-500" />}
                {isSyndicate && <Users className="h-4 w-4 text-purple-500" />}
                <NotificationBell />
                <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 sm:px-4 py-4 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
            {renderContent()}
          </main>

          <MobileFooterMenu activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} isBusiness={isBusiness} isSyndicate={isSyndicate} />
          <AdminChatWidget />
          <InstallPrompt />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
