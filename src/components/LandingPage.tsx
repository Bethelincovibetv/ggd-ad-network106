import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Zap, BarChart3, Code, Shield, Users, Smartphone, Star, MessageCircle, Menu, X, ArrowRight, Briefcase, TrendingUp, DollarSign, Target } from "lucide-react";
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

const useCountUp = (end: number, duration: number = 2000) => {
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

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'whatsapp_group_link').maybeSingle()
      .then(({ data }) => { if (data?.value) setWaGroupLink(data.value); });
    supabase.from('app_settings').select('value').eq('key', 'landing_search_enabled').maybeSingle()
      .then(({ data }) => { if (data?.value === 'false') setSearchEnabled(false); });

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

    supabase.from('ads').select('*').eq('is_active', true).limit(5)
      .then(({ data }) => { if (data?.length) setSampleAds(data); });
  }, []);

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
    { id: 'features', label: 'What GGD Offers' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'business', label: 'For Business' },
    { id: 'earn', label: 'Earn & Promote' },
    { id: 'contact', label: 'Get Started' },
  ];

  const features = [
    { icon: Globe, title: "Get Discovered", description: "Create a business presence and showcase your products and services so customers can find you." },
    { icon: Zap, title: "Get Visibility", description: "Put your business in front of more people through GGD advertising and featured exposure." },
    { icon: Users, title: "Promote & Reach", description: "Use Credit Tasks, community promotion, and our professional Syndicate network." },
    { icon: Code, title: "Create Marketing", description: "Use BlogMate and practical marketing tools to create content and materials for your business." },
    { icon: BarChart3, title: "Track Results", description: "Use campaign and performance insights to understand your reach and improve your marketing." },
    { icon: Smartphone, title: "Built for Mobile", description: "Manage your business, marketing, promotions, and opportunities from your phone." },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <nav className="sticky top-0 z-50 bg-[#e67e22] shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
            <span className="font-black text-xl text-white">GGD</span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-2 border border-white/30 rounded-lg">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-x-0 top-[60px] z-40 bg-[#1a1a1a] border-b border-[#333] animate-fade-in">
          <div className="flex flex-col p-6 space-y-6">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="text-left text-lg text-gray-300 hover:text-white font-medium transition-colors">
                {item.label}
              </button>
            ))}
            <Button onClick={() => { setMenuOpen(false); onGetStarted(); }} className="w-full bg-gradient-to-r from-[#e67e22] to-[#e74c3c] text-white py-6 text-lg font-bold rounded-xl">
              Get Started
            </Button>
          </div>
        </div>
      )}

      <div id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e67e22]/20 via-[#1a1a1a] to-[#1a1a1a]" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[#e67e22]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#e74c3c]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-[#e67e22]/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        <div className="container mx-auto px-4 pt-10 pb-16 relative z-10">
          <div className="text-center space-y-6">
            {searchEnabled && <div className="max-w-md mx-auto pt-2"><GlobalSearchBar /></div>}
            <div className="flex justify-center animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 bg-[#e67e22]/30 blur-3xl rounded-full scale-150 animate-pulse" />
                <img src={ggdLogo} alt="GGD Ad Network" className="h-28 w-28 rounded-2xl relative z-10 shadow-2xl shadow-[#e67e22]/30 hover:scale-110 transition-transform duration-300" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-[#2a2a2a] border border-[#444] rounded-full px-5 py-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Zap className="h-4 w-4 text-[#e67e22]" />
              <span className="text-sm font-semibold text-gray-200">Business Growth & Marketing Platform</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Grow Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e67e22] to-[#e74c3c]">Business</span>
            </h1>

            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.6s' }}>
              Get discovered, reach more customers, promote your products and services, and grow with advertising, community promotion, marketing tools, and a network built for business growth.
            </p>

            <div className="flex flex-col gap-3 pt-4 max-w-sm mx-auto animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <Button onClick={onGetStarted} size="lg" className="w-full bg-gradient-to-r from-[#e67e22] to-[#e74c3c] hover:from-[#d35400] hover:to-[#c0392b] text-white py-7 text-lg font-bold shadow-xl shadow-[#e67e22]/25 rounded-xl hover:scale-105 transition-transform">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => scrollTo('how-it-works')} className="w-full border-[#444] text-gray-400 hover:bg-[#2a2a2a] hover:text-white py-7 text-lg rounded-xl bg-[#2a2a2a]">
                See How GGD Works
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-y border-[#333] bg-[#111]">
        <div className="container mx-auto px-4 py-8" ref={impressions.ref}>
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: impressions.count, suffix: "+", label: "Impressions Served" },
              { value: campaigns.count, suffix: "+", label: "Active Campaigns" },
              { value: null, display: "Free", label: "To Get Started" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-[#e67e22]">{s.value !== null ? `${s.value.toLocaleString()}${s.suffix}` : s.display}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sampleAds.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">See GGD Advertising in Action</h2>
            <p className="text-gray-400 text-sm">Real campaigns currently running through the GGD advertising system.</p>
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
                <div className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] text-white px-4 py-2 rounded-lg text-center text-sm font-medium cursor-pointer" onClick={() => window.open(sampleAds[currentAdIdx]?.target_url, '_blank')}>Visit Ad →</div>
              </div>
              <div className="bg-[#111] px-4 py-2 text-center border-t border-[#333]"><p className="text-[10px] text-gray-500">Powered by <span className="font-semibold text-[#e67e22]">GGD Ad Network</span></p></div>
            </Card>
            {sampleAds.length > 1 && <div className="flex justify-center mt-3 gap-1.5">{sampleAds.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentAdIdx ? 'bg-[#e67e22]' : 'bg-[#444]'}`} />)}</div>}
          </div>
        </div>
      )}

      <div id="business" className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-br from-[#0a1628] to-[#1a2744] border-[#2a3f5f] max-w-3xl mx-auto overflow-hidden">
          <CardContent className="p-8 text-center space-y-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative mx-auto w-full max-w-sm group"><div className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-orange-500/30 blur-2xl rounded-2xl animate-pulse" /><img src={businessImg} alt="Grow your small business with GGD" loading="lazy" width={1024} height={768} className="relative rounded-2xl shadow-2xl shadow-blue-500/20 hover:scale-105 transition-transform duration-500 animate-fade-in" /></div>
            <Briefcase className="h-12 w-12 text-blue-400 mx-auto animate-bounce" />
            <h2 className="text-2xl md:text-3xl font-bold text-white">Everything Your Business Needs to Grow</h2>
            <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">Build your business presence, showcase your products and services, advertise to more people, promote your offers, create marketing content, and connect with potential customers.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Target className="h-6 w-6 text-red-400" />, label: "Get Discovered" },
                { icon: <Users className="h-6 w-6 text-orange-400" />, label: "Reach People" },
                { icon: <TrendingUp className="h-6 w-6 text-green-400" />, label: "Grow" },
              ].map((item, i) => <div key={i} className="bg-[#1a2744]/80 border border-[#2a3f5f] rounded-xl p-4 hover:border-blue-500/50 hover:scale-105 transition-all"><div className="flex justify-center mb-2">{item.icon}</div><p className="text-xs text-gray-300 font-medium">{item.label}</p></div>)}
            </div>
            <Button onClick={onGetStarted} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 text-base font-bold rounded-xl hover:scale-105 transition-transform">Start Growing <ArrowRight className="ml-2 h-5 w-5" /></Button>
          </CardContent>
        </Card>
      </div>

      <div id="earn" className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b3d] border-[#3d2b4f] max-w-3xl mx-auto overflow-hidden">
          <CardContent className="p-8 text-center space-y-6 relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative mx-auto w-full max-w-sm group"><div className="absolute -inset-2 bg-gradient-to-r from-purple-500/30 to-yellow-500/30 blur-2xl rounded-2xl animate-pulse" /><img src={syndicateImg} alt="Earn money as a GGD Syndicate promoter" loading="lazy" width={1024} height={768} className="relative rounded-2xl shadow-2xl shadow-purple-500/20 hover:scale-105 transition-transform duration-500 animate-fade-in" /></div>
            <Star className="h-12 w-12 text-yellow-400 mx-auto animate-pulse" />
            <h2 className="text-2xl md:text-3xl font-bold text-white">Promote & Earn</h2>
            <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">Businesses can use Credit Tasks for community promotion, while verified Syndicate promoters can take paid promotional campaigns and earn rewards.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <DollarSign className="h-6 w-6 text-yellow-400" />, label: "Earn Rewards" },
                { icon: <Smartphone className="h-6 w-6 text-purple-400" />, label: "Work Mobile" },
                { icon: <Globe className="h-6 w-6 text-green-400" />, label: "Reach Anywhere" },
              ].map((item, i) => <div key={i} className="bg-[#2d1b3d]/80 border border-[#3d2b4f] rounded-xl p-4 hover:border-yellow-500/50 hover:scale-105 transition-all"><div className="flex justify-center mb-2">{item.icon}</div><p className="text-xs text-gray-300 font-medium">{item.label}</p></div>)}
            </div>
            <Button onClick={() => navigate('/syndicate-register')} size="lg" className="bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white px-8 py-5 text-base font-bold rounded-xl hover:scale-105 transition-transform">Become a Syndicate <ArrowRight className="ml-2 h-5 w-5" /></Button>
          </CardContent>
        </Card>
      </div>

      <div id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What You Can Do With GGD</h2><p className="text-gray-400 max-w-xl mx-auto">One ecosystem for discovering businesses, creating marketing, reaching people, and growing.</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{features.map((f, i) => <Card key={i} className="bg-[#222] border-[#333] hover:border-[#e67e22]/30 transition-all duration-300 group hover:scale-105 hover:-translate-y-1"><CardContent className="p-6 space-y-3"><div className="p-3 bg-[#e67e22]/10 rounded-xl w-fit group-hover:bg-[#e67e22]/20 transition-colors"><f.icon className="h-6 w-6 text-[#e67e22]" /></div><h3 className="text-lg font-semibold text-white">{f.title}</h3><p className="text-gray-400 text-sm leading-relaxed">{f.description}</p></CardContent></Card>)}</div>
      </div>

      <div id="how-it-works" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How GGD Helps Your Business Grow</h2><p className="text-gray-400">A simple path from visibility to opportunity.</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Get Discovered", desc: "Create your business presence and showcase your products and services." },
            { step: "02", title: "Create & Promote", desc: "Create marketing content and use advertising, Credit Tasks, or community promotion to reach people." },
            { step: "03", title: "Reach Customers", desc: "Use GGD's business, community, advertising, and professional promotion network to expand your reach." },
            { step: "04", title: "Grow", desc: "Track your activity, connect with customers, improve your marketing, and keep growing." },
          ].map((s, i) => <div key={i} className="text-center space-y-3 group hover:scale-105 transition-transform"><div className="text-5xl font-black text-[#e67e22]/20 group-hover:text-[#e67e22]/40 transition-colors">{s.step}</div><h3 className="text-lg font-bold text-white">{s.title}</h3><p className="text-gray-400 text-sm">{s.desc}</p></div>)}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8"><div className="max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-white text-center mb-6">See How GGD Works</h2><YouTubeEmbed section="homepage" /></div></div>

      <div id="contact" className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] rounded-2xl p-8 md:p-14 text-center hover:shadow-2xl hover:shadow-[#e67e22]/20 transition-shadow">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Grow Your Business?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">Get discovered, reach more people, promote your business, and build your next opportunity with GGD.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} size="lg" className="bg-white text-[#e67e22] hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-xl hover:scale-105 transition-transform">Start Now — It's Free <ArrowRight className="ml-2 h-5 w-5" /></Button>
            {waGroupLink && <Button size="lg" variant="outline" onClick={() => window.open(waGroupLink, '_blank')} className="border-white/50 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"><MessageCircle className="mr-2 h-5 w-5" /> Contact Us</Button>}
          </div>
        </div>
      </div>

      <footer className="border-t border-[#333] py-8"><div className="container mx-auto px-4 text-center text-gray-500 text-sm space-y-2"><p>© {new Date().getFullYear()} GGD Ad Network. All rights reserved.</p><p className="text-xs">Powered by <span className="text-[#e67e22] font-semibold">Goodgift Digital</span></p></div></footer>
      <InstallPrompt />
    </div>
  );
};

export default LandingPage;
