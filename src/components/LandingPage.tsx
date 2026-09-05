import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Globe, Zap, BarChart3, Shield, Users, Smartphone, Star, MessageCircle, Menu, X, ArrowRight, 
  Briefcase, TrendingUp, Target, Building2, Store, Megaphone, Sparkles, Coins, CheckCircle2,
  Share2, Eye, PenTool, Layers
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import InstallPrompt from "@/components/InstallPrompt";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import ggdLogo from '@/assets/ggd-logo.png';
import businessImg from '@/assets/landing-business.jpg';
import syndicateImg from '@/assets/landing-syndicate.jpg';
import { supabase } from "@/integrations/supabase/client";

interface LandingPageProps {
  onGetStarted: () => void;
}

// Animated counter hook
const useCountUp = (end: number, duration: number = 2000, suffix: string = '') => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return { count, ref };
};

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const navigate = useNavigate();
  const [waGroupLink, setWaGroupLink] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ impressions: 0, campaigns: 0, sites: 0 });
  const [sampleAds, setSampleAds] = useState<any[]>([]);
  const [currentAdIdx, setCurrentAdIdx] = useState(0);
  const [searchEnabled, setSearchEnabled] = useState(true);

  const impressions = useCountUp(liveStats.impressions || 100, 2500);
  const campaigns = useCountUp(liveStats.campaigns || 1, 2000);
  const sites = useCountUp(liveStats.sites || 1, 1800);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'whatsapp_group_link').maybeSingle()
      .then(({ data }) => { if (data?.value) setWaGroupLink(data.value); });
    supabase.from('app_settings').select('value').eq('key', 'landing_search_enabled').maybeSingle()
      .then(({ data }) => { if (data?.value === 'false') setSearchEnabled(false); });

    // Fetch live stats
    const fetchStats = async () => {
      const [adsRes, keysRes] = await Promise.all([
        supabase.from('ads').select('id, impressions, is_active'),
        supabase.from('api_keys').select('id', { count: 'exact' }),
      ]);
      const allAds = adsRes.data || [];
      const activeCount = allAds.filter(a => a.is_active).length;
      const totalImpressions = allAds.reduce((sum, a) => sum + (a.impressions || 0), 0);
      setLiveStats({
        impressions: totalImpressions || 100,
        campaigns: activeCount || 1,
        sites: keysRes.count || 1,
      });
    };
    fetchStats();

    // Fetch sample ads for display
    supabase.from('ads').select('*').eq('is_active', true).limit(5)
      .then(({ data }) => { if (data?.length) setSampleAds(data); });
  }, []);

  // Rotate sample ads
  useEffect(() => {
    if (sampleAds.length <= 1) return;
    const interval = setInterval(() => setCurrentAdIdx(prev => (prev + 1) % sampleAds.length), 6000);
    return () => clearInterval(interval);
  }, [sampleAds]);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = [
    { id: 'features', label: 'What GGD Does' },
    { id: 'business', label: 'For Businesses' },
    { id: 'promote-earn', label: 'Promote & Earn' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'blogmate', label: 'BlogMate AI' },
    { id: 'contact', label: 'Contact' },
  ];

  const coreCapabilities = [
    {
      icon: Building2,
      title: "Get Discovered",
      description: "Establish your presence in the GGD Business Directory with your brand profile, contact info, and WhatsApp link so customers can find you.",
      color: "text-blue-400 bg-blue-500/10"
    },
    {
      icon: Store,
      title: "Show What You Sell",
      description: "Showcase physical products, digital goods, and service offerings with clear pricing and direct inquiry channels.",
      color: "text-emerald-400 bg-emerald-500/10"
    },
    {
      icon: Megaphone,
      title: "Get Visibility",
      description: "Run high-visibility commercial Banner Ads across GGD and partner sites, plus unlock eligible featured exposure to drive traffic.",
      color: "text-orange-400 bg-orange-500/10"
    },
    {
      icon: Share2,
      title: "Promote & Reach",
      description: "Launch community Credit Tasks to gain video views, website visits, and social shares powered by the GGG credit economy.",
      color: "text-yellow-400 bg-yellow-500/10"
    },
    {
      icon: Users,
      title: "Work With Promoters",
      description: "Partner with verified Syndicate promoters who share your business campaigns across WhatsApp, Facebook, Instagram, and TikTok.",
      color: "text-purple-400 bg-purple-500/10"
    },
    {
      icon: Sparkles,
      title: "Create Marketing Content",
      description: "Use integrated marketing tools, including BlogMate AI, to craft compelling articles, social posts, ads, and sales copy.",
      color: "text-pink-400 bg-pink-500/10"
    },
    {
      icon: Globe,
      title: "Build Awareness",
      description: "Share updates, network with local entrepreneurs, and engage with the active GGD community to grow brand loyalty.",
      color: "text-cyan-400 bg-cyan-500/10"
    },
    {
      icon: BarChart3,
      title: "Track Results",
      description: "Monitor real-time performance analytics including impressions, clicks, click-through rates, and conversion feedback.",
      color: "text-red-400 bg-red-500/10"
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#e67e22] shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD Ad Network" className="h-8 w-8 rounded-lg" />
            <span className="font-black text-xl text-white">GGD</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-sm text-white/90 hover:text-white font-medium transition-colors">
                {item.label}
              </button>
            ))}
            <Button onClick={onGetStarted}
              className="bg-white text-[#e67e22] hover:bg-white/90 font-bold px-4 py-2 rounded-lg">
              Get Started
            </Button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2 border border-white/30 rounded-lg">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[60px] z-40 bg-[#1a1a1a] border-b border-[#333] animate-fade-in md:hidden">
          <div className="flex flex-col p-6 space-y-6">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-left text-lg text-gray-300 hover:text-white font-medium transition-colors">
                {item.label}
              </button>
            ))}
            <Button onClick={() => { setMenuOpen(false); onGetStarted(); }}
              className="w-full bg-gradient-to-r from-[#e67e22] to-[#e74c3c] text-white py-6 text-lg font-bold rounded-xl">
              Get Started
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e67e22]/20 via-[#1a1a1a] to-[#1a1a1a]" />
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#e67e22]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#e74c3c]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-[#e67e22]/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <div className="container mx-auto px-4 pt-10 pb-16 relative z-10">
          <div className="text-center space-y-6">
            {searchEnabled && (
              <div className="max-w-md mx-auto pt-2">
                <GlobalSearchBar />
              </div>
            )}
            {/* Logo with glow animation */}
            <div className="flex justify-center animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-[#e67e22]/30 blur-3xl rounded-full scale-150 animate-pulse" />
                <img src={ggdLogo} alt="GGD Ad Network" className="h-28 w-28 rounded-2xl relative z-10 shadow-2xl shadow-[#e67e22]/30 hover:scale-110 transition-transform duration-300" />
              </div>
            </div>

            {/* Positioning Badge */}
            <div className="inline-flex items-center gap-2 bg-[#2a2a2a] border border-[#444] rounded-full px-5 py-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Zap className="h-4 w-4 text-[#e67e22]" />
              <span className="text-xs md:text-sm font-semibold text-gray-200">Digital Business-Growth & Marketing Platform</span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Grow Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e67e22] via-[#f39c12] to-[#e74c3c]">Business</span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.6s' }}>
              Get discovered, reach more customers, promote your products and services, and grow with advertising, community promotion, marketing tools, and a network built for business growth.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 max-w-md mx-auto animate-fade-in justify-center" style={{ animationDelay: '0.8s' }}>
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
        </div>
      </div>

      {/* Stats with animated counters */}
      <div className="border-y border-[#333] bg-[#111]">
        <div className="container mx-auto px-4 py-8" ref={impressions.ref}>
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: impressions.count, suffix: "+", label: "Impressions Served" },
              { value: campaigns.count, suffix: "+", label: "Active Campaigns" },
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

      {/* What GGD Helps You Do */}
      <div id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-white">What GGD Helps You Do</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            Everything your business needs to establish a presence, attract audiences, and drive real outcomes.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {coreCapabilities.map((item, i) => (
            <Card key={i} className="bg-[#222] border-[#333] hover:border-[#e67e22]/40 transition-all duration-300 group hover:-translate-y-1">
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

      {/* Live Ad Display Sample */}
      {sampleAds.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Live Ad Campaigns</h2>
            <p className="text-gray-400 text-sm">See real commercial banner ads running on GGD Ad Network right now</p>
          </div>
          <div className="max-w-sm mx-auto">
            <Card className="overflow-hidden bg-[#222] border-[#333] hover:border-[#e67e22]/40 transition-all duration-500">
              {sampleAds[currentAdIdx]?.image_url && (
                <div className="relative">
                  <img src={sampleAds[currentAdIdx].image_url} alt={sampleAds[currentAdIdx].title} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 bg-[#e67e22] text-white px-2 py-1 rounded-full text-[10px] font-bold">LIVE AD</div>
                </div>
              )}
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-white line-clamp-2">{sampleAds[currentAdIdx]?.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{sampleAds[currentAdIdx]?.description}</p>
                <div className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] text-white px-4 py-2 rounded-lg text-center text-sm font-medium cursor-pointer"
                  onClick={() => window.open(sampleAds[currentAdIdx]?.target_url, '_blank')}>
                  Visit Ad →
                </div>
              </div>
              <div className="bg-[#111] px-4 py-2 text-center border-t border-[#333]">
                <p className="text-[10px] text-gray-500">Commercial Banner Ads powered by <span className="font-semibold text-[#e67e22]">GGD Ad Network</span></p>
              </div>
            </Card>
            {sampleAds.length > 1 && (
              <div className="flex justify-center mt-3 gap-1.5">
                {sampleAds.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentAdIdx ? 'bg-[#e67e22]' : 'bg-[#444]'}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* For Businesses Section */}
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
                {
                  icon: Building2,
                  title: "Establish Your Presence",
                  desc: "Create a verified profile in the Business Directory with contact info, WhatsApp link, location, and brand description."
                },
                {
                  icon: Store,
                  title: "Showcase What You Sell",
                  desc: "Display products, services, pricing, and key features directly on your storefront so visitors can inquire easily."
                },
                {
                  icon: Megaphone,
                  title: "Reach Targeted Customers",
                  desc: "Amplify your message through commercial Banner Ads, community credit tasks, and verified Syndicate promoter campaigns."
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

      {/* Promote & Earn Section (Clear distinction between Credit Tasks and Syndicate) */}
      <div id="promote-earn" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#2a2a2a] border border-[#444] rounded-full px-3.5 py-1 text-xs font-semibold text-gray-200">
            <Coins className="h-3.5 w-3.5 text-[#e67e22]" /> Two Distinct Channels
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">Promote & Earn on GGD</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
            GGD offers two separate pathways: community-driven Credit Tasks and verified Syndicate paid campaigns.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Credit Tasks Card */}
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
                  Community members complete promotional activities like watching YouTube videos, visiting websites, and social sharing to earn GGG Credits.
                </p>
              </div>

              <div className="space-y-2 bg-[#0c140e]/60 rounded-xl p-4 border border-emerald-500/20 text-xs text-gray-300">
                <p className="font-semibold text-emerald-400">How the Credit Economy Works:</p>
                <ul className="space-y-1.5 list-disc list-inside text-gray-400">
                  <li>Participate in tasks to accumulate <strong className="text-white">GGG Credits</strong>.</li>
                  <li>Use your earned credits to launch tasks and <strong className="text-white">promote your own business for free</strong>.</li>
                  <li>Promote social posts, watch time, and link visits through active community members.</li>
                </ul>
              </div>

              <div className="pt-4 mt-auto">
                <Button onClick={onGetStarted} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-xl">
                  Explore Credit Tasks <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Syndicate Card */}
          <Card className="bg-gradient-to-br from-[#24172f] via-[#1b1224] to-[#140c1c] border-purple-500/30 overflow-hidden flex flex-col">
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
                  Verified professional promoters take on paid promotional campaigns, sharing business offers across WhatsApp, Facebook, Instagram, and TikTok with verified proof.
                </p>
              </div>

              <div className="space-y-2 bg-[#0e0714]/60 rounded-xl p-4 border border-purple-500/20 text-xs text-gray-300">
                <p className="font-semibold text-purple-400">How the Syndicate Economy Works:</p>
                <ul className="space-y-1.5 list-disc list-inside text-gray-400">
                  <li>Businesses fund paid campaigns to reach <strong className="text-white">targeted social audiences</strong>.</li>
                  <li>Verified Syndicate promoters share across social media and upload <strong className="text-white">proof of posting</strong>.</li>
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

      {/* How GGD Helps You Grow */}
      <div id="how-it-works" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-white">How GGD Helps You Grow</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            From initial business discovery to expanding revenue in four clear steps.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Get Discovered",
              desc: "Create your business profile in the directory with your logo, contact channels, WhatsApp link, and product catalog."
            },
            {
              step: "02",
              title: "Create & Promote",
              desc: "Craft marketing copy with tools like BlogMate AI, launch Banner Ads, or post community promotional tasks."
            },
            {
              step: "03",
              title: "Reach Customers",
              desc: "Community members and verified Syndicate promoters amplify your reach across social platforms and websites."
            },
            {
              step: "04",
              title: "Grow",
              desc: "Convert increased high-intent visibility into inquiries, customer orders, and long-term business growth."
            },
          ].map((s, i) => (
            <div key={i} className="text-center space-y-3 bg-[#222] border border-[#333] rounded-2xl p-6 hover:border-[#e67e22]/50 hover:scale-105 transition-all">
              <div className="text-4xl font-black text-[#e67e22]">{s.step}</div>
              <h3 className="text-base font-bold text-white">{s.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BlogMate AI Section — Positioned as a marketing/content tool inside GGD */}
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
                Explore Marketing Tools <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Homepage Video */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">See How It Works</h2>
          <YouTubeEmbed section="homepage" />
        </div>
      </div>

      {/* Contact CTA */}
      <div id="contact" className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] rounded-2xl p-8 md:p-14 text-center hover:shadow-2xl hover:shadow-[#e67e22]/20 transition-shadow">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Grow Your Business?</h2>
          <p className="text-orange-100 text-base md:text-lg mb-8 max-w-xl mx-auto">
            Join businesses, creators, and promoters on GGD Ad Network to expand your reach and boost visibility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} size="lg" className="bg-white text-[#e67e22] hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-xl hover:scale-105 transition-transform">
              Start Free — It's Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {waGroupLink && (
              <Button size="lg" variant="outline" onClick={() => window.open(waGroupLink, '_blank')}
                className="border-white/50 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl">
                <MessageCircle className="mr-2 h-5 w-5" /> Contact Us
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#333] py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm space-y-2">
          <p>© {new Date().getFullYear()} GGD Ad Network. All rights reserved.</p>
          <p className="text-xs">Powered by <span className="text-[#e67e22] font-semibold">Goodgift Digital</span></p>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
};

export default LandingPage;

