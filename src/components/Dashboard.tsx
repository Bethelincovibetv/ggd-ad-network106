import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Eye, BarChart3, Key, Copy, Code, LogOut, Upload, Loader2, ExternalLink, Crown, Wallet, MessageCircle, Shield, Briefcase, Users, Store, ArrowRight, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

import MobileFooterMenu from "@/components/MobileFooterMenu";
import NotificationBell from "@/components/NotificationBell";
import BusinessGrowthDashboard from "@/components/BusinessGrowthDashboard";
import SlideCarousel from "@/components/SlideCarousel";
import TaskList from "@/components/TaskList";
import SupportPage from "@/components/SupportPage";
import InstallPrompt from "@/components/InstallPrompt";
import SideNavMenu from "@/components/SideNavMenu";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BusinessTaskCreator from "@/components/BusinessTaskCreator";
import SyndicateDashboard from "@/components/SyndicateDashboard";
import SyndicateWallet from "@/components/SyndicateWallet";
import UpgradePage from "@/components/UpgradePage";
import PremiumUpgrade from "@/components/PremiumUpgrade";
import CreditFunding from "@/components/CreditFunding";
import CreditTransfer from "@/components/CreditTransfer";
import WalletHub from "@/components/WalletHub";
import SyndicateApplicationForm from "@/components/SyndicateApplicationForm";
import AboutPage from "@/components/AboutPage";
import SetupWizard from "@/components/SetupWizard";
import PromotionalContent from "@/components/PromotionalContent";
import PremiumRenewalBanner from "@/components/PremiumRenewalBanner";

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
import ReferralsPage from "@/components/ReferralsPage";
import CampaignAnalytics from "@/components/CampaignAnalytics";
import SyndicatePayouts from "@/components/SyndicatePayouts";
import GGDInbox from "@/components/GGDInbox";
import CampaignsHub from "@/components/CampaignsHub";
import CreateFab from "@/components/CreateFab";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, RefreshCw } from "lucide-react";

import { usePremiumSettings } from "@/hooks/usePremiumSettings";
import ggdLogo from '@/assets/ggd-logo.png';
import GlobalSearchBar from "@/components/GlobalSearchBar";
import HomeDashboard from "@/components/HomeDashboard";
import BusinessProfileWizard from "@/components/BusinessProfileWizard";
import CommunityFeed from "@/components/CommunityFeed";

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

const AvatarMenuButton = ({ avatarUrl, displayName, email }: { avatarUrl: string | null; displayName: string; email: string }) => {
  const { toggleSidebar } = useSidebar();
  const initial = (displayName || email || 'U').trim().charAt(0).toUpperCase();
  return (
    <button
      onClick={toggleSidebar}
      aria-label="Open menu"
      className="rounded-full ring-2 ring-orange-500/30 hover:ring-orange-500 transition-all"
    >
      <Avatar className="h-8 w-8">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || 'User'} /> : null}
        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
          {initial}
        </AvatarFallback>
      </Avatar>
    </button>
  );
};

const Dashboard = ({ onLogout, userEmail }: DashboardProps) => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [republishFrom, setRepublishFrom] = useState<{ approved: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAd, setNewAd] = useState({ title: '', description: '', image_url: '', target_url: '', is_active: true, duration: '7' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDomain, setNewKeyDomain] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [currentTier, setCurrentTier] = useState<number>(0);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isSyndicate, setIsSyndicate] = useState(false);
  const [credits, setCredits] = useState(0);
  const [adCostCredits, setAdCostCredits] = useState(5);
  const [activeTab, setActiveTab] = useState('ads');
  const [adsFilter, setAdsFilter] = useState<'active' | 'expired' | 'inactive'>('active');
  const [analyticsAdId, setAnalyticsAdId] = useState<string | null>(null);
  const scrollToBannerForm = () => {
    setTimeout(() => {
      document.getElementById('banner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };
  const startCreateAd = () => { setIsCreating(true); scrollToBannerForm(); };
  const handleTabChange = (tab: string) => {
    if (tab === 'ads-create') {
      setActiveTab('campaigns');
      startCreateAd();
      return;
    }
    setActiveTab(tab);
  };
  const { isEnabled } = useFeatureToggles();
  const [showWizard, setShowWizard] = useState(false);
  const [profileSetupComplete, setProfileSetupComplete] = useState<boolean | null>(null);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const premium = usePremiumSettings();
  // Premium subscription is considered active if not expired
  const subscriptionActive = !premiumExpiresAt || new Date(premiumExpiresAt) > new Date();
  const effectiveTier = subscriptionActive ? currentTier : 0;
  const maxAdDays = (premium.tiers.find(t => t.tier === effectiveTier)?.days) || premium.freeAdDays;
  // Effective premium (paid): master toggle off, admin, or active paid tier (1-4)
  const effectivePremium = !premium.enabled || isAdmin || (subscriptionActive && currentTier >= 1);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => { initDashboard(); }, []);

  useEffect(() => {
    const handler = (e: any) => { if (e?.detail) handleTabChange(e.detail); };
    window.addEventListener('ggd-nav', handler);
    return () => window.removeEventListener('ggd-nav', handler);
  }, []);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase.from('user_roles').select('role, premium_tier, premium_expires_at').eq('user_id', user.id);
    const userRoles = (roles || []).map(r => r.role);
    setIsAdmin(userRoles.includes('admin'));
    setIsPremium(userRoles.includes('premium'));
    const premRow: any = (roles || []).find((r: any) => r.role === 'premium');
    if (premRow) {
      setCurrentTier(premRow.premium_tier ?? 0);
      setPremiumExpiresAt(premRow.premium_expires_at ?? null);
    }
    // Every registered user is a business by default
    setIsBusiness(true);
    setIsSyndicate(userRoles.includes('syndicate'));

    const { data: profile } = await supabase.from('profiles').select('credits, last_credit_date, referral_code, avatar_url, display_name, business_name, profile_setup_complete, login_bonus_credits').eq('user_id', user.id).single();
    // Admins and existing complete profiles bypass the wizard.
    setProfileSetupComplete(userRoles.includes('admin') ? true : !!(profile as any)?.profile_setup_complete);
    const { data: settings } = await supabase.from('app_settings').select('*');
    
    const loginCreditsAmount = parseInt(settings?.find(s => s.key === 'login_credits')?.value || '10');
    const adCost = parseInt(settings?.find(s => s.key === 'ad_cost_credits')?.value || '5');
    setAdCostCredits(adCost);
    const waGroup = settings?.find(s => s.key === 'whatsapp_group_link')?.value || '';
    setWhatsappGroupLink(waGroup);

    // The mandatory business setup replaces the old optional onboarding wizard.
    setShowWizard(false);

    if (profile) {
      setAvatarUrl(profile.avatar_url || null);
      setDisplayName(profile.display_name || profile.business_name || user.email || '');
      if (!profile.referral_code) {
        const code = 'GGD' + Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('profiles').update({ referral_code: code }).eq('user_id', user.id);
      }
      const currentCredits = profile.credits || 0;
      // Only grant free daily credits if user has 0 credits (like Lovable credits system)
      // Credits don't stack - user must use them before getting more
      if (currentCredits === 0 && profile.last_credit_date !== new Date().toISOString().split('T')[0] && !userRoles.includes('admin')) {
        const newCredits = loginCreditsAmount;
        const today = new Date().toISOString().split('T')[0];
        const newLoginBonus = Number((profile as any).login_bonus_credits || 0) + newCredits;
        await supabase.from('profiles').update({ credits: newCredits, last_credit_date: today, login_bonus_credits: newLoginBonus } as any).eq('user_id', user.id);
        setCredits(newCredits);
        toast.success(`🎉 You received ${loginCreditsAmount} free credits! (Bonus credits cannot be used to fund syndicate tasks.)`);
      } else {
        setCredits(currentCredits);
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
    if (duration > maxAdDays && !isAdmin) {
      toast.error(`Your plan allows ads up to ${maxAdDays} days. Upgrade for longer campaigns.`);
      setActiveTab('premium');
      return;
    }
    if (!isAdmin && credits < adCostCredits) { toast.error(`Not enough credits. Need ${adCostCredits}, have ${credits}`); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Republished campaigns go live immediately once paid — they were
    // already reviewed during their first run.
    const goLiveNow = !!republishFrom?.approved;

    const { error } = await supabase.from('ads').insert({
      user_id: user.id, title: newAd.title, description: newAd.description || '',
      image_url: newAd.image_url || null, target_url: newAd.target_url,
      is_active: isAdmin || goLiveNow, approved: isAdmin || goLiveNow,
      expires_at: expiresAt.toISOString(),
    });
    if (error) { toast.error("Failed to create ad"); return; }
    if (!isAdmin) {
      const newCredits = credits - adCostCredits;
      await supabase.from('profiles').update({ credits: newCredits }).eq('user_id', user.id);
      setCredits(newCredits);
    }
    toast.success(goLiveNow ? "Campaign republished and live!" : "Ad created!");
    setNewAd({ title: '', description: '', image_url: '', target_url: '', is_active: true, duration: '7' });
    setRepublishFrom(null);
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

  const republishAd = (ad: Ad) => {
    setEditingAd(null);
    setRepublishFrom({ approved: (ad as any).approved !== false });
    setNewAd({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      target_url: ad.target_url,
      is_active: true,
      duration: String(Math.min(7, maxAdDays)),
    });
    setIsCreating(true);
    toast.info("Details loaded — pick a new duration and pay; the campaign goes live immediately.");
    scrollToBannerForm();
  };

  const convertAdToTask = async (ad: Ad) => {
    const { error } = await supabase.from('tasks').insert({
      title: `Share: ${ad.title}`,
      description: ad.description || `Share this ad and earn credits!`,
      reward_credits: 5,
      task_type: 'share',
      share_url: ad.target_url,
    });
    if (error) { toast.error("Failed to convert ad to task"); return; }
    toast.success("Ad converted to task! Users can now earn credits by sharing it.");
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
    if (ad.image_url) html += '<img loading="lazy" src="'+ad.image_url+'" style="width:100%;display:block" alt="'+ad.title+'">';
    if (ad.title) {
      html += '<div style="padding:10px 14px"><h3 style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a">'+ad.title+'</h3>';
      if (ad.description) html += '<p style="margin:4px 0 0;font-size:12px;color:#666">'+ad.description+'</p>';
      html += '</div>';
    }
    html += '<div style="background:#f9f9f9;padding:3px;text-align:center;font-size:9px;color:#bbb">Ad by GGD AD NETWORK</div></div>';
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

  // MANDATORY: business profile setup must be completed before any other UI is shown.
  if (profileSetupComplete === false) {
    return <BusinessProfileWizard onComplete={() => { setProfileSetupComplete(true); setShowWizard(false); localStorage.setItem('ggd_wizard_seen', 'true'); initDashboard(); }} />;
  }

  if (showWizard && profileSetupComplete !== true) {
    // Allow admin to switch off the wizard
    if (!isEnabled('setup_wizard')) {
      // Skip wizard entirely
    } else {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 pb-20">
        <header className="bg-card/80 backdrop-blur border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img loading="lazy" src={ggdLogo} alt="GGD" className="h-7 w-7 rounded-lg" />
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
  }

  const renderContent = () => {
    const disabled = <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;
    switch (activeTab) {
      case 'ads':
        if (analyticsAdId) {
          return <CampaignAnalytics adId={analyticsAdId} onBack={() => setAnalyticsAdId(null)} />;
        }
        return (
          <div className="space-y-4">
            {/* Slider directly under the search bar */}
            {isEnabled('slides') && <SlideCarousel />}

            <HomeDashboard credits={credits} isAdmin={isAdmin} onNavigate={handleTabChange} />

            {/* Ad Display Preview */}
            {isEnabled('ads') && <AdDisplayPreview />}
          </div>
        );

      case 'advertising':
      case 'campaigns':
        if (!isEnabled('nav_campaigns') && !isEnabled('ads')) {
          return <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;
        }
        if (analyticsAdId) {
          return <CampaignAnalytics adId={analyticsAdId} onBack={() => setAnalyticsAdId(null)} />;
        }
        return (
          <div className="space-y-4">
            <CampaignsHub onNavigate={handleTabChange} />

            {isEnabled('ads') && (<>
            {/* My Campaigns - compact pro-style */}
            <div className="flex justify-between items-center pt-1">
              <h2 className="text-base font-black text-foreground">My Campaigns</h2>
            </div>

            {/* Category filter tabs — default Active */}
            {ads.length > 0 && (
              <Tabs value={adsFilter} onValueChange={v => setAdsFilter(v as any)}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="active" className="text-xs">
                    Active ({ads.filter(a => a.is_active && !isExpired(a)).length})
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs">
                    Expired ({ads.filter(a => isExpired(a)).length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs">
                    Inactive ({ads.filter(a => !a.is_active && !isExpired(a)).length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {isCreating && (
              <Card id="banner-form" className="border-orange-200">
                <CardContent className="p-3 -mb-2">
                  <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-2.5 text-xs text-orange-800">
                    <strong>Banner ad cost:</strong> {isAdmin ? 'Free for admins' : `${adCostCredits} credits per day`} · You'll be charged based on duration selected.
                  </div>
                </CardContent>
              </Card>
            )}
            {isCreating && (
              <Card className="border-orange-200">
                <CardContent className="p-4 space-y-3">
                  <Input placeholder="Ad Title *" value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} />
                  <Textarea placeholder="Description (optional)" value={newAd.description} onChange={e => setNewAd({ ...newAd, description: e.target.value })} rows={2} />
                  <Input placeholder="Target URL * (https://...)" value={newAd.target_url} onChange={e => setNewAd({ ...newAd, target_url: e.target.value })} />
                  {(isEnabled('ad_duration_settings') || isAdmin) && (
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
                  )}
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
                        <img loading="lazy" src={newAd.image_url} alt="Banner preview" className="w-full rounded-lg" />
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
                      <img loading="lazy" src={editingAd.image_url} alt="Banner" className="w-full rounded-lg" />
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

            <div className="space-y-2.5">
              {ads
                .filter(ad => {
                  const exp = isExpired(ad);
                  if (adsFilter === 'expired') return exp;
                  if (adsFilter === 'active') return ad.is_active && !exp;
                  return !ad.is_active && !exp;
                })
                .map(ad => {
                const expired = isExpired(ad);
                const remaining = daysLeft(ad);
                const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
                return (
                  <Card key={ad.id} className={`overflow-hidden border rounded-2xl transition-all hover:shadow-md ${expired ? 'opacity-60 border-destructive/30' : 'border-border/50'}`}>
                    <CardContent className="p-2.5">
                      <div className="flex gap-3 items-center">
                        <div className="h-14 w-14 rounded-xl overflow-hidden bg-gradient-to-br from-orange-100 to-yellow-100 flex-shrink-0 flex items-center justify-center">
                          {ad.image_url ? (
                            <img loading="lazy" src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" />
                          ) : (
                            <Megaphone className="h-6 w-6 text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-[13px] text-foreground truncate">{ad.title}</h3>
                            {expired ? (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 shrink-0">EXPIRED</span>
                            ) : ad.is_active ? (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 shrink-0">LIVE</span>
                            ) : (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">OFF</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{ad.target_url}</p>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setEditingAd(ad)}><Edit className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-destructive" onClick={() => deleteAd(ad.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-border/30 flex items-center justify-between gap-2">
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span><b className="text-foreground">{ad.impressions}</b> views</span>
                          <span><b className="text-blue-500">{ad.clicks}</b> clicks</span>
                          <span><b className="text-purple-500">{ctr}%</b> CTR</span>
                          {remaining !== null && <span><b className="text-orange-500">{remaining}d</b> left</span>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] rounded-full border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
                          onClick={() => setAnalyticsAdId(ad.id)}
                        >
                          <BarChart2 className="h-3 w-3 mr-1" /> Analytics
                        </Button>
                      </div>

                      {!premium.autoConvertAds && isEnabled('tasks') && (
                        <>
                        <Button size="sm" variant="ghost" className="w-full mt-2 text-[11px] h-7 text-orange-500 hover:bg-orange-500/10 rounded-xl"
                          onClick={() => convertAdToTask(ad)}>
                          <ArrowRight className="h-3 w-3 mr-1" />Convert to Earn-Task
                        </Button>
                        </>
                      )}

                      {expired && (
                        <Button size="sm" className="w-full mt-2 text-[11px] h-8 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold"
                          onClick={() => republishAd(ad)}>
                          <RefreshCw className="h-3 w-3 mr-1" />Republish Campaign
                        </Button>
                      )}
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
            </>)}
          </div>
        );

      case 'tasks':
        return isEnabled('tasks') ? <TaskList onCreditsUpdate={setCredits} credits={credits} onNavigate={handleTabChange} /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'fund-credits':
      case 'transfer':
      case 'task-wallet':
      case 'wallet':
        return <WalletHub credits={credits} onCreditsUpdate={setCredits} isPremium={isPremium} initialTab={activeTab === 'transfer' ? 'transfer' : 'buy'} />;

      case 'premium':
        return isEnabled('premium_upgrade') ? <PremiumUpgrade onUpgraded={handleUpgraded} credits={credits} isPremium={isPremium} /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'marketplace':
        return isEnabled('marketing_apps') && isEnabled('marketplace') ? <MarketingAppsMarketplace /> : disabled;

      case 'share-earn':
      case 'promo':
      case 'referrals':
        return isEnabled('promotional_content') || isEnabled('referral_system')
          ? <PromotionalContent initialTab={activeTab === 'promo' ? 'flyers' : (activeTab === 'referrals' ? 'referrals' : 'referrals')} />
          : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'guide':
      case 'user-guide':
      case 'business-guide':
      case 'syndicate-guide':
        return isEnabled('quick_guide') || isEnabled('nav_guide') ? <UserGuide /> : disabled;

      case 'wizard':
        return isEnabled('setup_wizard')
          ? <SetupWizard onComplete={() => setActiveTab('ads')} onNavigate={(tab) => { setActiveTab(tab); }} />
          : disabled;

      case 'about':
        return isEnabled('nav_about') ? <AboutPage /> : disabled;

      case 'business-tasks':
        return isEnabled('business_tasks') ? <BusinessTaskCreator /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'profile':
        return isEnabled('nav_profile') || isAdmin ? <UserProfilePage /> : disabled;

      case 'smart-links':
        return isEnabled('link_shortener') ? <LinkShortener /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'business':
      case 'my-business':
        return isEnabled('nav_my_business') ? <BusinessStorefront /> : disabled;

      case 'inbox':
        return isEnabled('p2p_chat') ? <GGDInbox /> : <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;

      case 'directory':
        return isEnabled('directory') ? <BusinessDirectory isBusiness={isBusiness} /> : disabled;

      case 'syndicate':
        if (!isEnabled('syndicate')) return <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;
        if (!isSyndicate && !isAdmin) return <SyndicateApplicationForm onApplied={() => initDashboard()} />;
        return <SyndicateDashboard onNavigate={handleTabChange} />;

      case 'syndicate-join':
        return isEnabled('syndicate') ? <SyndicateApplicationForm onApplied={() => initDashboard()} /> : disabled;

      case 'syndicate-wallet':
        if (!isEnabled('syndicate')) return <div className="text-center py-8 text-muted-foreground">This feature is currently disabled.</div>;
        if (!isSyndicate && !isAdmin) return <SyndicateApplicationForm onApplied={() => initDashboard()} />;
        return <SyndicateWallet />;

      case 'upgrade':
        return isEnabled('premium_upgrade') || isEnabled('co_owner_upgrade')
          ? <UpgradePage onUpgraded={handleUpgraded} credits={credits} onNavigate={setActiveTab} />
          : disabled;

      case 'api-keys':
        return !isEnabled('api_keys') ? disabled : (
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

      case 'feed':
        return isEnabled('community') ? <CommunityFeed onNavigate={handleTabChange} /> : disabled;

      case 'growth':
        return <BusinessGrowthDashboard onNavigate={handleTabChange} />;

      case 'syndicate-payouts':
        return isEnabled('syndicate') && isEnabled('business_pays_syndicate') ? <SyndicatePayouts /> : disabled;

      case 'support':
        return <SupportPage userEmail={userEmail} onNavigate={handleTabChange} />;

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
          onTabChange={handleTabChange}
          isBusiness={isBusiness}
          isSyndicate={isSyndicate}
          isAdmin={isAdmin}
          isPremium={isPremium}
          onLogout={handleLogout}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-border sticky top-0 z-40">
            <div className="px-3 sm:px-4 py-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SidebarTrigger className="flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md hover:shadow-lg hover:from-orange-600 hover:to-red-700 [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-white" />
                  <img loading="lazy" src={ggdLogo} alt="GGD" className="h-7 w-7 rounded-lg flex-shrink-0 md:hidden" />
                  <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent truncate">
                    GGD AD NETWORK
                  </h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && <Shield className="h-4 w-4 text-red-500" />}
                  {isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
                  {isBusiness && <Briefcase className="h-4 w-4 text-blue-500" />}
                  {isSyndicate && <Users className="h-4 w-4 text-purple-500" />}
                  <NotificationBell />
                  <AvatarMenuButton avatarUrl={avatarUrl} displayName={displayName} email={userEmail} />
                </div>
              </div>
              {activeTab !== 'feed' && <GlobalSearchBar />}
            </div>
          </header>

          <main className="flex-1 px-3 sm:px-4 py-4 pb-40 md:pb-24 max-w-5xl w-full mx-auto">
            {isPremium && (
              <PremiumRenewalBanner
                expiresAt={premiumExpiresAt}
                currentTier={currentTier}
                onRenew={async () => {
                  const { error } = await supabase.rpc('self_upgrade_premium', { _tier: currentTier });
                  if (error) { toast.error(error.message || 'Renewal failed'); return; }
                  toast.success('🎉 Subscription renewed for another month!');
                  initDashboard();
                }}
                onUpgrade={() => handleTabChange('premium')}
              />
            )}
            {renderContent()}
          </main>

          <MobileFooterMenu activeTab={activeTab} onTabChange={handleTabChange} isAdmin={isAdmin} isBusiness={isBusiness} isSyndicate={isSyndicate} />
          <CreateFab onNavigate={handleTabChange} />
          <InstallPrompt />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
