import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Zap, BarChart3, Code, Shield, Rocket, ArrowRight, Users, Smartphone, Star, MessageCircle, Info } from "lucide-react";
import InstallPrompt from "@/components/InstallPrompt";
import ggdLogo from '@/assets/ggd-logo.png';
import { supabase } from "@/integrations/supabase/client";

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [waGroupLink, setWaGroupLink] = useState('');
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'whatsapp_group_link').maybeSingle()
      .then(({ data }) => { if (data?.value) setWaGroupLink(data.value); });
  }, []);

  const features = [
    { icon: Globe, title: "Global Reach", description: "Display your ads across thousands of websites and social media platforms." },
    { icon: Code, title: "Easy Integration", description: "One simple JavaScript snippet — paste it and your ads go live instantly." },
    { icon: BarChart3, title: "Real-Time Analytics", description: "Track impressions, clicks, and conversions with detailed dashboards." },
    { icon: Shield, title: "API Key Security", description: "Secure API keys to control which sites display your ads." },
    { icon: Users, title: "Earn by Sharing", description: "Complete tasks, refer friends, and earn credits to grow your business." },
    { icon: Smartphone, title: "Mobile App", description: "Install our app on your phone for quick ad management on the go." },
  ];

  const scrollTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-7 w-7 rounded-lg" />
            <span className="font-black text-white">GGD</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            {['home', 'features', 'how-it-works', 'about', 'contact'].map(id => (
              <button key={id} onClick={() => scrollTo(id)}
                className={`text-xs capitalize ${activeNav === id ? 'text-orange-400' : 'text-gray-400 hover:text-white'}`}>
                {id.replace('-', ' ')}
              </button>
            ))}
          </div>
          <Button onClick={onGetStarted} size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-16 md:py-28 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 text-orange-400 text-sm font-medium">
              <Zap className="h-4 w-4" /> Africa's #1 Ad Network
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tight">
              GGD <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Ad Network</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Promote your business across social media. Create campaigns, earn credits, and grow your brand with our powerful advertising platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={onGetStarted} size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-6 text-lg font-bold shadow-xl shadow-orange-500/25 rounded-xl">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {waGroupLink && (
                <Button variant="outline" size="lg" onClick={() => window.open(waGroupLink, '_blank')}
                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 px-8 py-6 text-lg rounded-xl">
                  <MessageCircle className="mr-2 h-5 w-5" /> Join WhatsApp
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-y border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "10K+", label: "Impressions Served" },
              { value: "500+", label: "Active Campaigns" },
              { value: "100+", label: "Connected Sites" },
              { value: "Free", label: "To Get Started" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-orange-400">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Powerful tools for businesses of all sizes.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="bg-gray-800/50 border-gray-700/50 hover:border-orange-500/30 transition-all duration-300 group">
              <CardContent className="p-6 space-y-3">
                <div className="p-3 bg-orange-500/10 rounded-xl w-fit group-hover:bg-orange-500/20 transition-colors">
                  <f.icon className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="container mx-auto px-4 py-16 md:py-24">
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
              <div className="text-5xl font-black text-orange-500/20">{s.step}</div>
              <h3 className="text-lg font-bold text-white">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operator Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 md:p-10 max-w-3xl mx-auto text-center space-y-6">
          <Star className="h-10 w-10 text-yellow-400 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-bold text-white">Become a Syndicate Operator</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Turn your social media influence into income. Share ads and earn real money for every task completed.
          </p>
          <Button onClick={onGetStarted} size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-5 text-base font-bold rounded-xl">
            Join the Network <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* About */}
      <div id="about" className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">About Us</h2>
          <p className="text-gray-400 leading-relaxed">
            GGD Ad Network is Africa's fastest-growing decentralized advertising platform. We connect businesses 
            with social media operators to distribute ads across WhatsApp, Facebook, Instagram, TikTok, and more. 
            Our mission is to make advertising accessible and profitable for everyone.
          </p>
        </div>
      </div>

      {/* Contact */}
      <div id="contact" className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Grow Your Business?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of businesses and operators on GGD Ad Network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onGetStarted} size="lg" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-xl">
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
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm space-y-2">
          <p>© {new Date().getFullYear()} GGD Ad Network. All rights reserved.</p>
          <p className="text-xs">Powered by <span className="text-orange-400 font-semibold">Goodgift Digital</span></p>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
};

export default LandingPage;
