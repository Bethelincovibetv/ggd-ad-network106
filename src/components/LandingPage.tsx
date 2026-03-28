import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Zap, BarChart3, Code, Shield, Users, Smartphone, Star, MessageCircle, Menu, X, ArrowRight } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";
import ggdLogo from '@/assets/ggd-logo.png';
import { supabase } from "@/integrations/supabase/client";

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [waGroupLink, setWaGroupLink] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'whatsapp_group_link').maybeSingle()
      .then(({ data }) => { if (data?.value) setWaGroupLink(data.value); });
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'business', label: 'For Business' },
    { id: 'earn', label: 'Earn Money' },
    { id: 'contact', label: 'Contact' },
  ];

  const features = [
    { icon: Globe, title: "Global Reach", description: "Display your ads across thousands of websites and social media platforms." },
    { icon: Code, title: "Easy Integration", description: "One simple JavaScript snippet — paste it and your ads go live instantly." },
    { icon: BarChart3, title: "Real-Time Analytics", description: "Track impressions, clicks, and conversions with detailed dashboards." },
    { icon: Shield, title: "API Key Security", description: "Secure API keys to control which sites display your ads." },
    { icon: Users, title: "Earn by Sharing", description: "Complete tasks, refer friends, and earn credits to grow your business." },
    { icon: Smartphone, title: "Mobile App", description: "Install our app on your phone for quick ad management on the go." },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Navigation - Orange top bar */}
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

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[60px] z-40 bg-[#1a1a1a] border-b border-[#333]">
          <div className="flex flex-col p-6 space-y-6">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className="text-left text-lg text-gray-300 hover:text-white font-medium">
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
        <div className="container mx-auto px-4 pt-10 pb-16 relative z-10">
          <div className="text-center space-y-6">
            {/* Large centered logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#e67e22]/30 blur-3xl rounded-full scale-150" />
                <img src={ggdLogo} alt="GGD Ad Network" className="h-28 w-28 rounded-2xl relative z-10 shadow-2xl shadow-[#e67e22]/30" />
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#2a2a2a] border border-[#444] rounded-full px-5 py-2">
              <Zap className="h-4 w-4 text-[#e67e22]" />
              <span className="text-sm font-semibold text-gray-200">#1 Social Media Ad Network</span>
            </div>

            {/* Main heading */}
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Grow Your <span className="text-[#e67e22]">Business</span>
            </h1>

            <p className="text-base md:text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
              Create ad campaigns and reach thousands through our network of social media operators. WhatsApp, Facebook, Instagram, TikTok & more.
            </p>

            <div className="flex flex-col gap-3 pt-4 max-w-sm mx-auto">
              <Button onClick={onGetStarted} size="lg"
                className="w-full bg-gradient-to-r from-[#e67e22] to-[#e74c3c] hover:from-[#d35400] hover:to-[#c0392b] text-white py-7 text-lg font-bold shadow-xl shadow-[#e67e22]/25 rounded-xl">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => scrollTo('how-it-works')}
                className="w-full border-[#444] text-gray-400 hover:bg-[#2a2a2a] hover:text-white py-7 text-lg rounded-xl bg-[#2a2a2a]">
                How It Works
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-[#333] bg-[#111]">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "10K+", label: "Impressions Served" },
              { value: "500+", label: "Active Campaigns" },
              { value: "100+", label: "Connected Sites" },
              { value: "Free", label: "To Get Started" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-[#e67e22]">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Powerful tools for businesses of all sizes.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="bg-[#222] border-[#333] hover:border-[#e67e22]/30 transition-all duration-300 group">
              <CardContent className="p-6 space-y-3">
                <div className="p-3 bg-[#e67e22]/10 rounded-xl w-fit group-hover:bg-[#e67e22]/20 transition-colors">
                  <f.icon className="h-6 w-6 text-[#e67e22]" />
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-400">Start promoting in 4 simple steps</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Sign Up", desc: "Create your free account in seconds" },
            { step: "02", title: "Create Ads", desc: "Upload banners and set your campaign" },
            { step: "03", title: "Earn Credits", desc: "Complete tasks, refer friends, buy credits" },
            { step: "04", title: "Grow Business", desc: "Upgrade to Premium or Business for more" },
          ].map((s, i) => (
            <div key={i} className="text-center space-y-3">
              <div className="text-5xl font-black text-[#e67e22]/20">{s.step}</div>
              <h3 className="text-lg font-bold text-white">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operator Section */}
      <div id="earn" className="container mx-auto px-4 py-16">
        <div className="bg-[#222] border border-[#333] rounded-2xl p-6 md:p-10 max-w-3xl mx-auto text-center space-y-6">
          <Star className="h-10 w-10 text-yellow-400 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-bold text-white">Become a Syndicate Operator</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Turn your social media influence into income. Share ads and earn real money for every task completed.
          </p>
          <Button onClick={onGetStarted} size="lg" className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] text-white px-8 py-5 text-base font-bold rounded-xl">
            Join the Network <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* About */}
      <div id="business" className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">About Us</h2>
          <p className="text-gray-400 leading-relaxed">
            GGD Ad Network is Africa's fastest-growing decentralized advertising platform. We connect businesses 
            with social media operators to distribute ads across WhatsApp, Facebook, Instagram, TikTok, and more. 
            Our mission is to make advertising accessible and profitable for everyone.
          </p>
        </div>
      </div>

      {/* Contact CTA */}
      <div id="contact" className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#e67e22] to-[#e74c3c] rounded-2xl p-8 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Grow Your Business?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of businesses and operators on GGD Ad Network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} size="lg" className="bg-white text-[#e67e22] hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-xl">
              Start Now — It's Free <ArrowRight className="ml-2 h-5 w-5" />
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
