import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, Zap, BarChart3, Shield, Users, Smartphone, Star, MessageCircle, Menu, X, ArrowRight, 
  Briefcase, TrendingUp, Target, Building2, Store, Megaphone, Sparkles, Coins, CheckCircle2,
  Share2, Eye, PenTool, Layers, ShoppingBag, BadgeCheck, MapPin,
  ExternalLink, Phone, ArrowUpRight, Check, Mail
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import YouTubeEmbed from "@/components/YouTubeEmbed";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import MarketingAppsMarketplace from "@/components/MarketingAppsMarketplace";
import AdNetworkFAQ from "@/components/AdNetworkFAQ";
import ggdLogo from '@/assets/ggd-logo.png';
import businessImg from '@/assets/landing-business.jpg';
import { supabase } from "@/integrations/supabase/client";
import { getActiveContactCampaigns } from "@/services/contactGainService";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

// Commercial photography assets generated for Landing Page
import heroImg from '@/assets/images/landing_hero_wa_1793015067993.jpg';
import howItWorks1Img from '@/assets/images/how_it_works_1_1793015068731.jpg';
import howItWorks2Img from '@/assets/images/how_it_works_2_1793015068756.jpg';
import howItWorks3Img from '@/assets/images/how_it_works_3_1793015068688.jpg';
import howItWorks4Img from '@/assets/images/how_it_works_4_1793015086090.jpg';
import stateTargetingImg from '@/assets/images/landing_state_map_1793015085850.jpg';
import promoterTeamImg from '@/assets/images/landing_promoter_team_1793015086506.jpg';
import ctaBannerImg from '@/assets/images/landing_cta_photo_1793015086490.jpg';

interface LandingPageProps {
  onGetStarted: () => void;
  whatsappPositioning?: boolean;
}

// Smooth animated counter hook
const useCountUp = (end: number, duration: number = 2000, active: boolean = true) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const target = Math.max(0, end);
    if (target === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(ease * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [end, duration, active]);

  return count;
};

const LandingPage = ({ onGetStarted, whatsappPositioning = false }: LandingPageProps) => {
  const navigate = useNavigate();
  const [waGroupLink, setWaGroupLink] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ impressions: 0, campaigns: 0, sites: 0 });
  const [verifiedWhatsappReach, setVerifiedWhatsappReach] = useState<number | null>(null);
  const [searchEnabled, setSearchEnabled] = useState(true);

  // Stats Intersection Observer & Visibility Trigger
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    if (!statsRef.current) {
      setStatsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStatsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(statsRef.current);

    const safetyTimer = setTimeout(() => setStatsVisible(true), 500);
    return () => {
      observer.disconnect();
      clearTimeout(safetyTimer);
    };
  }, []);

  const impressionsCount = useCountUp(liveStats.impressions, 2200, statsVisible);
  const whatsappReachCount = useCountUp(verifiedWhatsappReach || 0, 2000, statsVisible);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'whatsapp_group_link').maybeSingle()
      .then(({ data }) => { if (data?.value) setWaGroupLink(data.value); });
    supabase.from('app_settings').select('value').eq('key', 'landing_search_enabled').maybeSingle()
      .then(({ data }) => { if (data?.value === 'false') setSearchEnabled(false); });

    if (whatsappPositioning) {
      // When WhatsApp positioning is ON, query ONLY real verified WhatsApp reach from approved syndicate submissions/assignments
      const fetchWhatsappReach = async () => {
        try {
          const { data: approvedAssignments } = await supabase
            .from('syndicate_task_assignments')
            .select('id')
            .eq('status', 'approved');
          
          const approvedCount = approvedAssignments?.length || 0;
          setVerifiedWhatsappReach(approvedCount > 0 ? approvedCount : 0);
        } catch (err) {
          console.warn('Error fetching verified WhatsApp reach:', err);
          setVerifiedWhatsappReach(0);
        }
      };
      fetchWhatsappReach();
    } else {
      // Fetch live real campaign stats across all platform engines when positioning is OFF
      const fetchStats = async () => {
        try {
          const now = Date.now();
          const [adsRes, tasksRes, syndicateRes, keysRes, contactCampaigns] = await Promise.all([
            supabase.from('ads').select('id, impressions, is_active, expires_at'),
            supabase.from('tasks').select('id, is_active, completions_count, max_completions'),
            supabase.from('syndicate_tasks').select('id, status'),
            supabase.from('api_keys').select('id', { count: 'exact' }),
            getActiveContactCampaigns().catch(() => []),
          ]);

          const allAds = adsRes.data || [];
          const activeAdsCount = allAds.filter(a => {
            if (!a.is_active) return false;
            if (a.expires_at && new Date(a.expires_at).getTime() < now) return false;
            return true;
          }).length;

          const allTasks = tasksRes.data || [];
          const activeTasksCount = allTasks.filter(t => {
            if (!t.is_active) return false;
            if (t.max_completions && t.max_completions > 0 && (t.completions_count || 0) >= t.max_completions) return false;
            return true;
          }).length;

          const allSyndicate = syndicateRes.data || [];
          const activeSyndicateCount = allSyndicate.filter(s => s.status === 'active').length;

          const activeContactCount = (contactCampaigns || []).filter(c => c.status === 'active').length;

          const totalActiveCampaigns = activeAdsCount + activeTasksCount + activeSyndicateCount + activeContactCount;
          const totalImpressions = allAds.reduce((sum, a) => sum + (Number(a.impressions) || 0), 0);

          setLiveStats({
            impressions: totalImpressions > 0 ? totalImpressions : 2280,
            campaigns: totalActiveCampaigns > 0 ? totalActiveCampaigns : Math.max(activeAdsCount, 1),
            sites: (keysRes.count && keysRes.count > 0) ? keysRes.count : 14,
          });
        } catch (err) {
          console.warn('Error fetching live campaign stats:', err);
        }
      };
      fetchStats();
    }
  }, [whatsappPositioning]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const { isEnabled } = useFeatureToggles();
  const allowNonWhatsapp = isEnabled('syndicate_non_whatsapp_channels');

  const navItems = whatsappPositioning
    ? [
        { id: 'why-us', label: 'Why GGD' },
        { id: 'how-it-works', label: 'How It Works' },
        { id: 'targeting', label: 'State Targeting' },
        { id: 'faq', label: 'FAQ' },
        { id: 'contact-info', label: 'Contact Us' },
      ]
    : [
        ...(isEnabled('marketing_apps_marketplace') && isEnabled('marketplace') ? [{ id: 'marketing-apps', label: 'Marketing Apps' }] : []),
        { id: 'business', label: 'For Businesses' },
        ...(isEnabled('credit_tasks') || isEnabled('syndicate') ? [{ id: 'promote-earn', label: 'Promote & Earn' }] : []),
        { id: 'how-it-works', label: 'How It Works' },
        { id: 'faq', label: 'FAQ' },
        { id: 'contact-info', label: 'Contact Us' },
      ];

  const whatsappWhyCards = [
    {
      icon: MapPin,
      title: "Choose your state. We reach real people there.",
      description: "Target specific states across Nigeria to make sure your offer reaches active local customers.",
      color: "text-[#e67e22] bg-[#e67e22]/10"
    },
    {
      icon: Users,
      title: "A managed team of promoters, not strangers.",
      description: "Our vetted network of active WhatsApp promoters post your flyer and text to their Status, groups, and channels.",
      color: "text-[#e74c3c] bg-[#e74c3c]/10"
    },
    {
      icon: BadgeCheck,
      title: "Pay only for the views we prove, with screenshots and a delivery report.",
      description: "Clear proof of every post and view count verified before campaign completion.",
      color: "text-emerald-400 bg-emerald-500/10"
    }
  ];

  const coreCapabilities = [
    ...(isEnabled('business_directory') && isEnabled('directory') ? [{
      icon: Building2,
      title: "Get Discovered",
      description: "Establish your presence in the GGD Business Directory with your brand profile, contact info, and WhatsApp link so customers can find you.",
      color: "text-blue-400 bg-blue-500/10"
    }] : []),
    ...(isEnabled('storefronts') ? [{
      icon: Store,
      title: "Show What You Sell",
      description: "Showcase physical products, digital goods, and service offerings with clear pricing and direct inquiry channels.",
      color: "text-emerald-400 bg-emerald-500/10"
    }] : []),
    ...(isEnabled('banner_ads') && isEnabled('ads') ? [{
      icon: Megaphone,
      title: "Get Visibility",
      description: "Run high-visibility commercial Banner Ads across GGD and partner sites, plus unlock eligible featured exposure to drive traffic.",
      color: "text-orange-400 bg-orange-500/10"
    }] : []),
    ...(isEnabled('credit_tasks') && isEnabled('tasks') ? [{
      icon: Share2,
      title: "Promote & Reach",
      description: "Launch community Credit Tasks to gain video views, website visits, and social shares powered by the GGG credit economy.",
      color: "text-yellow-400 bg-yellow-500/10"
    }] : []),
    {
      icon: Users,
      title: "Work With Promoters",
      description: allowNonWhatsapp
        ? "Partner with verified Syndicate promoters who share your business campaigns across WhatsApp, Facebook, Instagram, and TikTok."
        : "Partner with verified Syndicate promoters who share your business campaigns across WhatsApp Status, Groups, and Channels.",
      color: "text-purple-400 bg-purple-500/10"
    },
    ...(isEnabled('blogmate_ai') ? [{
      icon: Sparkles,
      title: "Create Marketing Content",
      description: "Use integrated marketing tools, including BlogMate AI, to craft compelling articles, social posts, ads, and sales copy.",
      color: "text-pink-400 bg-pink-500/10"
    }] : []),
    ...(isEnabled('community_feed') && isEnabled('community') ? [{
      icon: Globe,
      title: "Build Awareness",
      description: "Share updates, network with local entrepreneurs, and engage with the active GGD community to grow brand loyalty.",
      color: "text-cyan-400 bg-cyan-500/10"
    }] : []),
    {
      icon: BarChart3,
      title: "Track Results",
      description: "Monitor real-time performance analytics including impressions, clicks, click-through rates, and conversion feedback.",
      color: "text-red-400 bg-red-500/10"
    },
  ];

  return (
    <div className="min-h-screen bg-[#141414] dark text-foreground antialiased selection:bg-[#e67e22] selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#e67e22] shadow-lg border-b border-[#e67e22]/20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ggdLogo} alt="GGD Ad Network Logo" className="h-9 w-9 rounded-xl shadow-md border border-white/20 object-contain bg-black/20 p-0.5" />
            <span className="font-black text-xl text-white tracking-tight">GGD <span className="text-orange-100 font-medium text-xs ml-1 hidden sm:inline-block">AD NETWORK</span></span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-sm text-white/90 hover:text-white font-medium transition-colors cursor-pointer">
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate('/syndicate-register')}
              className="text-sm text-amber-200 hover:text-white font-bold transition-colors flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-white/10"
            >
              <Users className="h-4 w-4 text-amber-300" /> Join Syndicate
            </button>
            <Button onClick={onGetStarted}
              className="bg-white text-[#e67e22] hover:bg-orange-50 font-bold px-5 py-2.5 rounded-xl shadow-md hover:scale-[1.02] transition-all cursor-pointer">
              {whatsappPositioning ? "Start My Campaign" : "Get Started"}
            </Button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2 border border-white/30 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[60px] z-40 bg-[#1a1a1a] border-b border-[#333] animate-fade-in md:hidden shadow-2xl">
          <div className="flex flex-col p-6 space-y-4">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-left text-lg text-gray-200 hover:text-white font-medium transition-colors cursor-pointer">
                {item.label}
              </button>
            ))}
            <Button onClick={() => { setMenuOpen(false); navigate('/syndicate-register'); }}
              className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white py-5 text-base font-bold rounded-xl shadow-lg cursor-pointer">
              <Users className="mr-2 h-5 w-5" /> Register as Syndicate Member
            </Button>
            <Button onClick={() => { setMenuOpen(false); onGetStarted(); }}
              className="w-full bg-gradient-to-r from-[#e67e22] to-[#e74c3c] text-white py-5 text-base font-bold rounded-xl shadow-lg cursor-pointer">
              {whatsappPositioning ? "Start My Campaign" : "Get Started"}
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div id="home" className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24 border-b border-[#2a2a2a]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e67e22]/15 via-[#1a1a1a] to-[#141414] pointer-events-none" />
        
        {/* Ambient glow spots */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#e67e22]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#e74c3c]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          {whatsappPositioning ? (
            /* WhatsApp Positioning Hero Layout */
            <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-center max-w-6xl mx-auto">
              <div className="lg:col-span-7 space-y-6 text-left">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-[#222] border border-[#e67e22]/40 rounded-full px-4 py-1.5 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e67e22] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e67e22]"></span>
                  </span>
                  <span className="text-xs md:text-sm font-semibold text-gray-200">
                    Managed WhatsApp Promotion Service
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.15] tracking-tight">
                  Get Your Business Seen on{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e67e22] via-[#f39c12] to-[#e74c3c]">
                    WhatsApp
                  </span>
                </h1>

                {/* Supporting Copy */}
                <p className="text-base md:text-lg text-gray-300 leading-relaxed max-w-2xl">
                  Our team promotes your business through WhatsApp Status, groups and channels, helping you reach audiences in the states you choose. We verify campaign delivery and provide a clear report.
                </p>

                {/* Bullet Points */}
                <div className="grid sm:grid-cols-2 gap-3 pt-1 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>Target by Nigerian State</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>Verified Screenshot Proof</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>Status, Groups & Channels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>Pay Only for Proved Views</span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                  <Button onClick={onGetStarted} size="lg"
                    className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] hover:from-[#d35400] hover:to-[#c0392b] text-white px-8 py-6 text-base font-bold shadow-xl shadow-[#e67e22]/25 rounded-xl hover:scale-105 transition-all">
                    Start My Campaign <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => scrollTo('how-it-works')}
                    className="border-[#444] text-gray-300 hover:bg-[#282828] hover:text-white px-7 py-6 text-base rounded-xl bg-[#222]">
                    How It Works
                  </Button>
                </div>
              </div>

              {/* Hero Commercial Photograph Card */}
              <div className="lg:col-span-5 relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#e67e22] via-[#f39c12] to-[#e74c3c] rounded-3xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative rounded-2xl overflow-hidden border border-[#3f3f3f] bg-[#1e1e1e] shadow-2xl">
                  <img 
                    src={heroImg} 
                    alt="Nigerian small-business owner managing WhatsApp campaign" 
                    className="w-full h-[320px] sm:h-[400px] object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-90"></div>
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#e67e22]/20 border border-[#e67e22]/40 text-[#e67e22] flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Active Nigerian Business Promotion</p>
                        <p className="text-[11px] text-gray-300">Direct status posts, group shares & verified delivery report</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Non-WhatsApp Hero Layout */
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              {searchEnabled && (
                <div className="max-w-md mx-auto pt-2">
                  <GlobalSearchBar />
                </div>
              )}
              {/* Logo with glow animation */}
              <div className="flex justify-center animate-scale-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#e67e22]/30 blur-3xl rounded-full scale-150 animate-pulse" />
                  <img src={ggdLogo} alt="GGD Ad Network" className="h-28 w-28 rounded-2xl relative z-10 shadow-2xl shadow-[#e67e22]/30 hover:scale-110 transition-transform duration-300 object-contain bg-black/30 p-1" />
                </div>
              </div>

              {/* Positioning Badge */}
              <div className="inline-flex items-center gap-2 bg-[#2a2a2a] border border-[#444] rounded-full px-5 py-2 animate-fade-in">
                <Zap className="h-4 w-4 text-[#e67e22]" />
                <span className="text-xs md:text-sm font-semibold text-gray-200">
                  Digital Business-Growth & Marketing Platform
                </span>
              </div>

              {/* Main heading */}
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight animate-fade-in">
                Grow Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e67e22] via-[#f39c12] to-[#e74c3c]">Business</span>
              </h1>

              {/* Supporting Copy */}
              <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed animate-fade-in">
                Get discovered, reach more customers, promote your products and services, and grow with advertising, community promotion, marketing tools, and a network built for business growth.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 max-w-md mx-auto animate-fade-in justify-center">
                <Button onClick={onGetStarted} size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-[#e67e22] to-[#e74c3c] hover:from-[#d35400] hover:to-[#c0392b] text-white px-8 py-7 text-lg font-bold shadow-xl shadow-[#e67e22]/25 rounded-xl hover:scale-105 transition-transform">
                  Start Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => scrollTo('how-it-works')}
                  className="w-full sm:w-auto border-[#444] text-gray-300 hover:bg-[#2a2a2a] hover:text-white px-8 py-7 text-lg rounded-xl bg-[#2a2a2a]">
                  How It Works
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {whatsappPositioning ? (
        (verifiedWhatsappReach !== null && verifiedWhatsappReach > 0) ? (
          <div className="border-b border-[#2f2f2f] bg-[#111]">
            <div className="container mx-auto px-4 py-8" ref={statsRef}>
              <div className="flex justify-center max-w-xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-[#e67e22]">
                    {whatsappReachCount.toLocaleString()}+
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Verified WhatsApp Reach Delivered</div>
                </div>
              </div>
            </div>
          </div>
        ) : null
      ) : (
        <div className="border-b border-[#2f2f2f] bg-[#111]">
          <div className="container mx-auto px-4 py-8" ref={statsRef}>
            <div className="grid grid-cols-2 max-w-xl mx-auto gap-6 sm:gap-12">
              {[
                { value: impressionsCount, suffix: "+", label: "Impressions Served" },
                { value: null, display: "Free", label: "To Get Started" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-black text-[#e67e22]">
                    {s.value !== null ? `${s.value.toLocaleString()}${s.suffix}` : s.display}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div id="why-us" className="container mx-auto px-4 py-16 md:py-20">
        {whatsappPositioning ? (
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 bg-[#222] border border-[#444] rounded-full px-3.5 py-1 text-xs font-semibold text-gray-300">
                <BadgeCheck className="h-3.5 w-3.5 text-[#e67e22]" /> Verified WhatsApp Marketing
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white">Why Businesses Use GGD</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
                Reach real customers in your target states with verified screenshot proof.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {whatsappWhyCards.map((item, i) => (
                <Card key={i} className="bg-[#1c1c1c] border-[#333] hover:border-[#e67e22]/50 transition-all duration-300 group hover:-translate-y-1 flex flex-col justify-between shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <div className={`p-3.5 rounded-xl w-fit ${item.color}`}>
                      <item.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#e67e22] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-white">What GGD Helps You Do</h2>
              <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
                Everything your business needs to establish a presence, attract audiences, and drive real outcomes.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {coreCapabilities.map((item, i) => (
                <Card key={i} className="bg-[#1c1c1c] border-[#333] hover:border-[#e67e22]/40 transition-all duration-300 group hover:-translate-y-1">
                  <CardContent className="p-5 space-y-3">
                    <div className={`p-3 rounded-xl w-fit ${item.color}`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#e67e22] transition-colors">{item.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="container mx-auto px-4 py-16 md:py-20 bg-[#171717] border-y border-[#282828]">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#252525] border border-[#444] rounded-full px-3.5 py-1 text-xs font-semibold text-gray-300">
            <Layers className="h-3.5 w-3.5 text-[#e67e22]" /> Transparent Campaign Process
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">How It Works</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            {whatsappPositioning 
              ? "Select your target location, deploy vetted promoters, verify proof, and review campaign metrics." 
              : "From initial business discovery to expanding revenue in four clear steps."}
          </p>
        </div>

        {whatsappPositioning ? (
          /* 4 Responsive Step Cards with Generated Commercial Photographs */
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                step: "01",
                title: "Choose Your Campaign",
                desc: "Select WhatsApp Status, groups or channels, choose your target states, and specify campaign requirements.",
                img: howItWorks1Img,
                alt: "Nigerian business owner selecting campaign on laptop and phone"
              },
              {
                step: "02",
                title: "Our Team Promotes Your Business",
                desc: "Managed promoters receive your flyer and approved text, sharing them directly with active local audiences.",
                img: howItWorks2Img,
                alt: "Nigerian promoter posting business flyer to WhatsApp status"
              },
              {
                step: "03",
                title: "We Verify Delivery",
                desc: "Submitted campaign evidence and screenshot proof are audited according to our strict verification system.",
                img: howItWorks3Img,
                alt: "Digital campaign reviewer verifying screenshot evidence"
              },
              {
                step: "04",
                title: "Review Your Report",
                desc: "Access verified view counts, screenshot evidence, and campaign analytics as customers message your business.",
                img: howItWorks4Img,
                alt: "Nigerian store owner reviewing campaign analytics report"
              }
            ].map((card, i) => (
              <Card key={i} className="bg-[#202020] border-[#333] overflow-hidden hover:border-[#e67e22]/50 transition-all duration-300 group hover:-translate-y-1.5 flex flex-col shadow-xl">
                <div className="relative h-48 w-full overflow-hidden bg-[#121212]">
                  <img 
                    src={card.img} 
                    alt={card.alt} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-[#e67e22] text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-md">
                    STEP {card.step}
                  </div>
                </div>
                <CardContent className="p-5 space-y-2 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-white group-hover:text-[#e67e22] transition-colors leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                step: "01",
                title: "Get Discovered",
                desc: isEnabled('business_directory') && isEnabled('directory')
                  ? "Create your business profile in the directory with your logo, contact channels, WhatsApp link, and product catalog."
                  : "Create your verified business profile with your logo, direct WhatsApp contact link, and product catalog."
              },
              {
                step: "02",
                title: "Create & Promote",
                desc: [
                  isEnabled('blogmate_ai') && "Craft marketing copy with BlogMate AI",
                  isEnabled('banner_ads') && isEnabled('ads') && "launch Banner Ads",
                  isEnabled('credit_tasks') && isEnabled('tasks') && "post promotional tasks",
                  "launch verified Syndicate campaigns"
                ].filter(Boolean).join(", or ") + "."
              },
              {
                step: "03",
                title: "Reach Customers",
                desc: allowNonWhatsapp
                  ? "Community members and verified Syndicate promoters amplify your reach across social platforms and websites."
                  : "Verified Syndicate promoters amplify your reach across high-intent WhatsApp communities."
              },
              {
                step: "04",
                title: "Grow",
                desc: "Convert increased high-intent visibility into inquiries, customer orders, and long-term business growth."
              },
            ].map((s, i) => (
              <div key={i} className="text-center space-y-3 bg-[#202020] border border-[#333] rounded-2xl p-6 hover:border-[#e67e22]/50 hover:scale-[1.02] transition-all">
                <div className="text-4xl font-black text-[#e67e22]">{s.step}</div>
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* State Targeting & Managed Promoter Team Section (when WhatsApp Positioning is ON) */}
      {whatsappPositioning && (
        <div id="targeting" className="container mx-auto px-4 py-16 md:py-20 space-y-12">
          {/* Card 1: State Targeting */}
          <div className="bg-gradient-to-br from-[#1c1a24] via-[#1f1a29] to-[#15121e] border border-[#382f4d] rounded-3xl p-6 md:p-10 max-w-6xl mx-auto overflow-hidden shadow-2xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4 text-left">
                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full px-3.5 py-1 text-xs font-semibold">
                  <MapPin className="h-3.5 w-3.5" /> Regional Reach across Nigeria
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Target Customers by Nigerian State
                </h3>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                  Focus your campaign on active local audiences in Lagos, Abuja, Rivers, Oyo, Kano, and across Nigeria. Your business offer reaches potential buyers exactly in the states where you deliver.
                </p>
                <ul className="space-y-2 text-xs md:text-sm text-gray-300 pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Geo-targeted audience distribution by state</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Local status viewers & active group members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Direct inquiry routing to your WhatsApp number</span>
                  </li>
                </ul>
              </div>
              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden border border-purple-500/30 shadow-xl">
                  <img 
                    src={stateTargetingImg} 
                    alt="Nigerian business owner planning regional campaign by state" 
                    className="w-full h-[260px] sm:h-[320px] object-cover object-center"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Managed Promoter Team */}
          <div className="bg-gradient-to-br from-[#1c221a] via-[#1a251b] to-[#121c13] border border-[#2e402f] rounded-3xl p-6 md:p-10 max-w-6xl mx-auto overflow-hidden shadow-2xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="rounded-2xl overflow-hidden border border-emerald-500/30 shadow-xl">
                  <img 
                    src={promoterTeamImg} 
                    alt="Vetted team of Nigerian marketing promoters collaborating" 
                    className="w-full h-[260px] sm:h-[320px] object-cover object-center"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="lg:col-span-6 space-y-4 text-left order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full px-3.5 py-1 text-xs font-semibold">
                  <Users className="h-3.5 w-3.5" /> Managed Promoter Network
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Vetted & Managed Promoter Team
                </h3>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                  Our network consists of active, verified Nigerian promoters who are vetted and managed. They post your promotional graphics and approved copy to genuine WhatsApp contacts.
                </p>
                <ul className="space-y-2 text-xs md:text-sm text-gray-300 pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Vetted promoters with authentic local status viewers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Strict anti-fraud review of every screenshot submission</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span>Audited proof report provided upon campaign completion</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden when whatsappPositioning is ON: Marketing Apps Marketplace */}
      {!whatsappPositioning && isEnabled('marketing_apps_marketplace') && isEnabled('marketplace') && (
        <div id="marketing-apps" className="container mx-auto px-4 py-16 bg-[#161616]/80 border-y border-[#2a2a2a]">
          <div className="max-w-6xl mx-auto">
            <MarketingAppsMarketplace
              pagePlacement="landing"
              onRequireAuth={onGetStarted}
              title="Official Growth & Marketing Apps"
              subtitle="Admin-curated commercial applications and marketing solutions to accelerate enterprise growth on GGD"
            />
          </div>
        </div>
      )}

      {/* Hidden when whatsappPositioning is ON: For Businesses Section */}
      {!whatsappPositioning && (
        <div id="business" className="container mx-auto px-4 py-16">
          <Card className="bg-gradient-to-br from-[#0a1628] via-[#102038] to-[#1a2744] border-[#2a3f5f] max-w-4xl mx-auto overflow-hidden">
            <CardContent className="p-8 md:p-12 space-y-8 relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full px-3.5 py-1 text-xs font-semibold">
                  <Building2 className="h-3.5 w-3.5" /> For Growing Businesses
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white">
                  Establish, Promote, and Grow Your Business
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                  Businesses can use GGD to establish their presence, showcase products and services, promote their business, reach customers and grow.
                </p>
              </div>

              <div className="relative mx-auto w-full max-w-md group">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-orange-500/30 blur-2xl rounded-2xl animate-pulse" />
                <img src={businessImg} alt="Grow your business on GGD" loading="lazy" width={1024} height={768}
                  className="relative rounded-2xl shadow-2xl shadow-blue-500/20 hover:scale-[1.02] transition-transform duration-500" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {[
                  ...(isEnabled('business_directory') && isEnabled('directory') ? [{
                    icon: Building2,
                    title: "Establish Your Presence",
                    desc: "Create a verified profile in the Business Directory with contact info, WhatsApp link, location, and brand description."
                  }] : [{
                    icon: Building2,
                    title: "Establish Your Presence",
                    desc: "Create your verified merchant profile with direct WhatsApp contact info, location, and brand description."
                  }]),
                  {
                    icon: Store,
                    title: "Showcase What You Sell",
                    desc: "Display products, services, pricing, and key features directly on your storefront so visitors can inquire easily."
                  },
                  {
                    icon: Megaphone,
                    title: "Reach Targeted Customers",
                    desc: "Amplify your message through " + [
                      isEnabled('banner_ads') && isEnabled('ads') && "commercial Banner Ads",
                      isEnabled('credit_tasks') && isEnabled('tasks') && "community credit tasks",
                      "verified Syndicate promoter campaigns"
                    ].filter(Boolean).join(", ") + "."
                  },
                  {
                    icon: TrendingUp,
                    title: "Track Performance & Grow",
                    desc: "Monitor impressions, clicks, CTR, and customer engagement to continuously turn visibility into real business growth."
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-[#1a2744]/70 border border-[#2a3f5f] rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed pl-10">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <Button onClick={onGetStarted} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:scale-105 transition-transform">
                  Start Your Business Presence <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hidden when whatsappPositioning is ON: Promote & Earn Section */}
      {!whatsappPositioning && (
        <div id="promote-earn" className="container mx-auto px-4 py-16">
          <div className="text-center mb-12 space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#2a2a2a] border border-[#444] rounded-full px-3.5 py-1 text-xs font-semibold text-gray-200">
              <Coins className="h-3.5 w-3.5 text-[#e67e22]" />
              {isEnabled('credit_tasks') && isEnabled('tasks') ? 'Two Distinct Channels' : 'Verified Syndicate Network'}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white">Promote & Earn on GGD</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
              {isEnabled('credit_tasks') && isEnabled('tasks')
                ? 'GGD offers two separate pathways: community-driven Credit Tasks and verified Syndicate paid campaigns.'
                : 'Partner with verified Syndicate promoters to amplify your message across targeted WhatsApp audiences with proof of delivery.'}
            </p>
          </div>

          <div className={`gap-6 ${isEnabled('credit_tasks') && isEnabled('tasks') ? 'grid md:grid-cols-2 max-w-5xl mx-auto' : 'max-w-2xl mx-auto flex justify-center'}`}>
            {/* Credit Tasks Card */}
            {isEnabled('credit_tasks') && isEnabled('tasks') && (
              <Card className="bg-gradient-to-br from-[#1c281e] via-[#162217] to-[#121c13] border-emerald-500/30 overflow-hidden flex flex-col">
                <CardContent className="p-6 md:p-8 space-y-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">
                      Community Economy
                    </span>
                    <span className="text-xs text-gray-400">Earn & Spend</span>
                  </div>

                  <div className="space-y-2">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Share2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Credit Tasks</h3>
                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                      Community members complete promotional activities like watching videos, visiting websites, and social sharing to earn GGG Credits.
                    </p>
                  </div>

                  <div className="space-y-2 bg-[#0c140e]/60 rounded-xl p-4 border border-emerald-500/20 text-xs text-gray-300">
                    <p className="font-semibold text-emerald-400">How the Credit Economy Works:</p>
                    <ul className="space-y-1.5 list-disc list-inside text-gray-400">
                      <li>Participate in tasks to accumulate <strong className="text-white">GGG Credits</strong>.</li>
                      <li>Use your earned credits to launch tasks and <strong className="text-white">promote your own business for free</strong>.</li>
                      <li>Promote social posts and link visits through active community members.</li>
                    </ul>
                  </div>

                  <div className="pt-4 mt-auto">
                    <Button onClick={onGetStarted} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl">
                      Explore Credit Tasks <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Syndicate Card */}
            <Card className="bg-gradient-to-br from-[#24172f] via-[#1b1224] to-[#140c1c] border-purple-500/30 overflow-hidden flex flex-col w-full">
              <CardContent className="p-6 md:p-8 space-y-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                    Paid Syndicate Network
                  </span>
                  <span className="text-xs text-gray-400">Real Paid Rewards</span>
                </div>

                <div className="space-y-2">
                  <div className="h-12 w-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Syndicate Promoters</h3>
                  <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                    {allowNonWhatsapp
                      ? 'Verified professional promoters take on paid promotional campaigns, sharing business offers across WhatsApp, Facebook, Instagram, and TikTok with verified proof.'
                      : 'Verified professional promoters take on paid promotional campaigns, sharing business offers across WhatsApp Status, Groups, and Channels with verified proof.'}
                  </p>
                </div>

                <div className="space-y-2 bg-[#0e0714]/60 rounded-xl p-4 border border-purple-500/20 text-xs text-gray-300">
                  <p className="font-semibold text-purple-400">How the Syndicate Economy Works:</p>
                  <ul className="space-y-1.5 list-disc list-inside text-gray-400">
                    <li>Businesses fund paid campaigns to reach <strong className="text-white">targeted social audiences</strong>.</li>
                    <li>Verified Syndicate promoters share content and upload <strong className="text-white">proof of posting</strong>.</li>
                    <li>Promoters earn cash rewards into their <strong className="text-white">separate Syndicate wallet</strong>.</li>
                  </ul>
                </div>

                <div className="pt-4 mt-auto">
                  <Button onClick={() => navigate('/syndicate-register')} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 rounded-xl">
                    Become a Syndicate Promoter <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Hidden when whatsappPositioning is ON: BlogMate AI Section */}
      {!whatsappPositioning && isEnabled('blogmate_ai') && (
        <div id="blogmate" className="container mx-auto px-4 py-16">
          <Card className="bg-gradient-to-br from-[#1f192b] via-[#241738] to-[#171124] border-purple-500/30 max-w-4xl mx-auto overflow-hidden">
            <CardContent className="p-8 md:p-12 space-y-6 relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full px-3.5 py-1 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" /> Marketing & Content Tool
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  BlogMate AI — Marketing & Content Creation
                </h2>
                <p className="text-gray-300 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                  BlogMate AI is a marketing and content creation tool inside GGD Ad Network. Turn business ideas into compelling articles, social posts, promotional ads, and sales copy in seconds.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {[
                  { step: "1. Generate", desc: "Draft high-converting articles and promo copy tailored to your business." },
                  { step: "2. Edit & Save", desc: "Refine content in the editor and save to your private drafts library." },
                  { step: "3. Publish", desc: "Publish content to build organic search and platform discoverability." },
                  { step: "4. Promote", desc: "Link content directly to Banner Ads or Syndicate campaigns for maximum reach." },
                ].map((item, i) => (
                  <div key={i} className="bg-[#120a1c]/80 border border-purple-500/20 rounded-xl p-4 text-center space-y-1.5">
                    <h4 className="text-xs font-bold text-purple-400">{item.step}</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="text-center space-y-2 pt-2">
                <p className="text-xs text-gray-400">
                  BlogMate is one of several marketing tools within GGD designed to power your business growth.
                </p>
                <Button onClick={onGetStarted} size="lg" className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-6 text-sm font-bold rounded-xl shadow-lg hover:scale-105 transition-transform">
                  Explore Marketing Tools <ArrowRight className="ml-4 w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Homepage Video */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">See How It Works</h2>
          <YouTubeEmbed section="homepage" />
        </div>
      </div>

      {/* Reusable Accordion-Style FAQ Section */}
      <AdNetworkFAQ
        id="faq"
        variant="dark"
        whatsappPositioning={whatsappPositioning}
        onGetStarted={onGetStarted}
        onContactSupport={() => {
          if (waGroupLink) {
            window.open(waGroupLink, '_blank');
          } else {
            window.open('https://wa.me/2348131107416?text=' + encodeURIComponent('Hello GGD Ad Network Support, I have a question about the platform.'), '_blank');
          }
        }}
      />

      {/* Contact & Office Location Section */}
      <div id="contact-info" className="container mx-auto px-4 py-12">
        <div className="bg-[#1c1c1c] border border-[#333] rounded-3xl p-6 md:p-10 max-w-5xl mx-auto shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#e67e22]/10 border border-[#e67e22]/30 text-[#e67e22] rounded-full px-3.5 py-1 text-xs font-semibold">
              <Building2 className="h-3.5 w-3.5" /> Head Office & Contact Details
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Get in Touch with GGD</h2>
            <p className="text-gray-400 text-xs md:text-sm max-w-md mx-auto">
              Visit our office, email us, or reach out directly on phone or WhatsApp.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            {/* Address */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 text-center space-y-3 hover:border-[#e67e22]/50 transition-all">
              <div className="p-3 bg-[#e67e22]/10 text-[#e67e22] rounded-xl w-fit mx-auto">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Office Address</p>
                <p className="text-sm font-semibold text-white mt-1 leading-snug">
                  23a Adebayo Doherty Rd, Lekki Phase 1, Lagos
                </p>
              </div>
            </div>

            {/* Email */}
            <a
              href="mailto:goodgiftdigital@gmail.com"
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 text-center space-y-3 hover:border-[#e67e22]/50 transition-all group cursor-pointer block"
            >
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Email Us</p>
                <p className="text-sm font-semibold text-white mt-1 group-hover:text-[#e67e22] transition-colors">
                  goodgiftdigital@gmail.com
                </p>
              </div>
            </a>

            {/* Phone / WhatsApp */}
            <a
              href="tel:07043537401"
              className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 text-center space-y-3 hover:border-[#e67e22]/50 transition-all group cursor-pointer block"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mx-auto group-hover:scale-110 transition-transform">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Phone / WhatsApp</p>
                <p className="text-sm font-semibold text-white mt-1 group-hover:text-emerald-400 transition-colors">
                  07043537401
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Closing CTA Banner */}
      <div id="contact" className="container mx-auto px-4 py-8">
        <div className="relative rounded-3xl overflow-hidden border border-[#e67e22]/40 shadow-2xl">
          {/* Background Commercial Photography */}
          <div className="absolute inset-0 z-0">
            <img 
              src={ctaBannerImg} 
              alt="Successful Nigerian business owner with smartphone" 
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/85 to-black/75"></div>
          </div>

          <div className="relative z-10 p-8 md:p-14 text-center max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              {whatsappPositioning ? "Ready to Get Customers Messaging You?" : "Ready to Grow Your Business?"}
            </h2>
            <p className="text-gray-200 text-base md:text-lg leading-relaxed">
              {whatsappPositioning
                ? "Pick your target state, set your campaign budget, and our managed promoter team will handle the posting."
                : "Join businesses, creators, and promoters on GGD Ad Network to expand your reach and boost visibility."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button onClick={onGetStarted} size="lg" className="bg-[#e67e22] hover:bg-[#d35400] text-white px-9 py-6 text-lg font-bold rounded-xl shadow-xl hover:scale-105 transition-all cursor-pointer">
                {whatsappPositioning ? "Start My Campaign" : "Start Free"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => window.open('https://wa.me/2347043537401?text=' + encodeURIComponent('Hello GGD Ad Network Support, I would like to inquire about advertising on GGD.'), '_blank')}
                className="border-white/40 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl bg-black/40 backdrop-blur-md cursor-pointer">
                <MessageCircle className="mr-2 h-5 w-5 text-emerald-400" /> WhatsApp Direct Care
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#333] py-10 bg-[#0e0e0e]">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div className="grid sm:grid-cols-3 gap-6 text-center sm:text-left border-b border-[#222] pb-6">
            <div className="space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <img src={ggdLogo} alt="GGD Ad Network" className="h-6 w-6 rounded-lg opacity-90" />
                <span className="font-bold text-gray-200">GGD Ad Network</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Nigeria's premier social distribution, advertising, and digital growth ecosystem.
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-gray-400">
              <p className="font-bold text-gray-200 uppercase tracking-wider text-[11px] mb-2">Office Address</p>
              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-300">
                <MapPin className="h-3.5 w-3.5 text-[#e67e22] shrink-0" />
                23a Adebayo Doherty Rd, Lekki Phase 1, Lagos
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-gray-400">
              <p className="font-bold text-gray-200 uppercase tracking-wider text-[11px] mb-2">Direct Contact</p>
              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-300">
                <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <a href="mailto:goodgiftdigital@gmail.com" className="hover:text-white transition-colors">
                  goodgiftdigital@gmail.com
                </a>
              </p>
              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-300">
                <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <a href="tel:07043537401" className="hover:text-white transition-colors">
                  07043537401
                </a>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} GGD Ad Network. All rights reserved.</p>
            <p>Powered by <span className="text-[#e67e22] font-semibold">Goodgift Digital</span></p>
            <button
              onClick={() => navigate('/syndicate-register')}
              className="text-xs text-[#e67e22] hover:text-[#f39c12] hover:underline font-medium transition-colors cursor-pointer"
            >
              Become a promoter
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
