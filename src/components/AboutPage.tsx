import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, Store, Megaphone, Users, Sparkles, TrendingUp, Compass, Heart, 
  ShieldCheck, User, MapPin, GraduationCap, Code, Rocket, Quote, 
  MessageCircle, Mail, ExternalLink, Download, Maximize2, X, CheckCircle2, Award, Globe
} from "lucide-react";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import MetaTags from "@/components/MetaTags";
import { supabase } from "@/integrations/supabase/client";
import defaultCeoFlyer from "@/assets/images/ceo_about_flyer_1789459834911.jpg";

interface CeoConfig {
  name: string;
  role: string;
  location: string;
  background: string;
  focus: string;
  bio1: string;
  bio2: string;
  speech: string;
  avatarUrl: string;
  flyerUrl: string;
  whatsapp: string;
  email: string;
}

const DEFAULT_CEO_CONFIG: CeoConfig = {
  name: "Bethel Chukwunyere",
  role: "Founder & CEO",
  location: "Lagos, Nigeria",
  background: "Founder of Goodgift Digital, web developer, software product builder, and Mass Communication student at Miva Open University.",
  focus: "Building AI-driven digital tools, automated ad platforms, and web solutions for African creators and businesses.",
  bio1: "Bethel Chukwunyere is a visionary software product builder, full-stack web developer, and digital entrepreneur based in Lagos, Nigeria. As the Founder & CEO of Goodgift Digital and GGD Ad Network, Bethel bridges the gap between deep technical engineering and strategic human connection—a perspective shaped by his academic pursuits in Mass Communication at Miva Open University. Driven by a mission to unlock economic opportunities across the continent, he has dedicated his career to engineering intuitive digital solutions that empower emerging African businesses, indie creators, and promoters to thrive in the modern online economy.",
  bio2: "Under his strategic direction, GGD Ad Network has pioneered a decentralized, AI-enhanced advertising ecosystem that redefines how brands reach high-intent customers. Bethel's relentless focus centers on architecting automated ad platforms, intelligent marketing suites, and collaborative syndication networks that eliminate traditional advertising bottlenecks. By pairing advanced software architecture with accessible community distribution, Bethel continues to champion African technological innovation and pave the way for sustainable digital commerce across Africa.",
  speech: "At GGD Ad Network, we believe every business—regardless of size or starting capital—deserves access to world-class advertising tools, verified promotional syndicates, and genuine customer discovery. Our mission is not just to build software; it is to engineer an interconnected digital economy where African creators, entrepreneurs, and merchants can scale fearlessly, get discovered instantly, and build generational value.",
  avatarUrl: "",
  flyerUrl: defaultCeoFlyer,
  whatsapp: "+2348000000000",
  email: "contact@goodgiftdigital.com",
};

const AboutPage: React.FC = () => {
  const [ceo, setCeo] = useState<CeoConfig>(DEFAULT_CEO_CONFIG);
  const [showFullFlyer, setShowFullFlyer] = useState(false);

  useEffect(() => {
    fetchCeoSettings();
  }, []);

  const fetchCeoSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('*');
      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach(s => { map[s.key] = s.value; });

        setCeo(prev => ({
          ...prev,
          name: map.ceo_name || prev.name,
          role: map.ceo_role || prev.role,
          location: map.ceo_location || prev.location,
          background: map.ceo_background || prev.background,
          focus: map.ceo_focus || prev.focus,
          bio1: map.ceo_bio_1 || prev.bio1,
          bio2: map.ceo_bio_2 || prev.bio2,
          speech: map.ceo_speech || prev.speech,
          avatarUrl: map.ceo_avatar_url || prev.avatarUrl,
          flyerUrl: map.ceo_flyer_url || defaultCeoFlyer,
          whatsapp: map.ceo_whatsapp || map.admin_whatsapp || prev.whatsapp,
          email: map.ceo_email || prev.email,
        }));
      }
    } catch (err) {
      console.warn("Could not load dynamic CEO settings, using default profile:", err);
    }
  };

  // Schema.org JSON-LD Structured Data for search indexing
  const personAndProfileJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": ceo.name,
      "jobTitle": ceo.role,
      "worksFor": {
        "@type": "Organization",
        "name": "GGD Ad Network",
        "url": typeof window !== "undefined" ? window.location.origin : "https://ggdadnetwork.com",
        "parentOrganization": {
          "@type": "Organization",
          "name": "Goodgift Digital"
        }
      },
      "description": `${ceo.bio1} ${ceo.bio2}`,
      "alumniOf": {
        "@type": "EducationalOrganization",
        "name": "Miva Open University"
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Lagos",
        "addressCountry": "Nigeria"
      },
      "knowsAbout": [
        "AI-Driven Digital Tools",
        "Automated Advertising Platforms",
        "Web Solutions & Software Product Architecture",
        "Mass Communication",
        "African Digital Marketplace & Social Distribution"
      ],
      "image": ceo.avatarUrl || ceo.flyerUrl
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "name": `About ${ceo.name} - ${ceo.role} of GGD Ad Network`,
      "headline": `Meet ${ceo.name}, ${ceo.role} of GGD Ad Network`,
      "description": `Meet ${ceo.name}, GGD Ad Network CEO & Lagos digital entrepreneur building AI-driven ad platforms & web tools for African creators and businesses.`,
      "mainEntity": {
        "@type": "Person",
        "name": ceo.name,
        "jobTitle": ceo.role
      }
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* SEO Meta Tags for indexing */}
      <MetaTags
        title="Bethel Chukwunyere - Founder & CEO | GGD Ad Network"
        description="Meet Bethel Chukwunyere, GGD Ad Network CEO & Lagos digital entrepreneur building AI-driven ad platforms & web tools for African creators and businesses."
        badge="ABOUT & FOUNDER"
        keywords={[
          'GGD Ad Network CEO',
          'Bethel Chukwunyere',
          'Digital Entrepreneur Lagos',
          'Founder of Goodgift Digital',
          'AI-driven ad platforms Nigeria',
          'African web solutions',
          'Miva Open University Mass Communication',
          'African creator tools'
        ]}
        author="Bethel Chukwunyere"
        jsonLd={personAndProfileJsonLd}
      />

      {/* Page Title & Intro */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="px-3 py-1 bg-orange-500/10 text-orange-600 border-orange-500/30 text-xs font-bold gap-1.5 shadow-xs">
          <Sparkles className="h-3.5 w-3.5" /> GGD Ad Network & Goodgift Digital
        </Badge>
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent tracking-tight">
          About GGD Ad Network
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          GGD Ad Network is a next-generation digital business-growth and social advertising platform engineered to help African businesses get discovered, acquire high-intent customers, and scale sustainably.
        </p>
      </div>

      {/* SECTION 1: PROFESSIONAL FOUNDER & EXECUTIVE FLYER BANNER */}
      <div className="relative group rounded-2xl overflow-hidden border border-orange-500/20 shadow-xl bg-slate-950">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900 flex items-center justify-center">
          <img
            src={ceo.flyerUrl}
            alt="Bethel Chukwunyere - Founder & CEO of GGD Ad Network Official Executive Flyer"
            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          
          {/* Action Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4 sm:p-6 opacity-95 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <Badge className="bg-orange-500/90 hover:bg-orange-600 text-white font-black text-[11px] uppercase tracking-wider backdrop-blur-md px-3 py-1 border-0 shadow-md">
                Official Executive Keynote
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowFullFlyer(true)}
                className="bg-white/20 hover:bg-white/40 text-white backdrop-blur-md rounded-xl text-xs font-bold gap-1.5 h-8 px-3 border border-white/30"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Expand Flyer
              </Button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Leadership & Vision</p>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                Empowering African Businesses & Creators with AI Ad Infrastructure
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-1">
                Bethel Chukwunyere • Founder & CEO, GGD Ad Network & Goodgift Digital
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MEET THE FOUNDER & CEO */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-50/60 via-background to-amber-50/40 dark:from-orange-950/20 dark:via-background dark:to-amber-950/10 shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-200" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">Meet the Founder & CEO</h2>
          </div>
          <Badge className="bg-white/20 text-white text-[10px] font-bold border-white/30 px-2.5 py-0.5">
            Executive Profile
          </Badge>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Header Row with Avatar & Key Badges */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-border/60">
            <div className="relative shrink-0">
              {ceo.avatarUrl ? (
                <img
                  src={ceo.avatarUrl}
                  alt={ceo.name}
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover ring-4 ring-orange-500/20 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex flex-col items-center justify-center font-black text-3xl shadow-md ring-4 ring-orange-500/20">
                  <span>BC</span>
                  <span className="text-[9px] uppercase tracking-widest font-bold opacity-80 mt-1">Founder</span>
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-xs" title="Verified Founder">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {ceo.name}
                </h3>
                <Badge className="bg-orange-500 text-white font-bold text-xs py-0.5 px-2.5">
                  {ceo.role}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-orange-500" />
                  {ceo.location}
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
                  Mass Communication • Miva Open University
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  Goodgift Digital
                </span>
              </div>

              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                Web Developer • Software Product Builder • Digital Entrepreneur
              </p>
            </div>
          </div>

          {/* 2-Paragraph Third-Person Bio */}
          <div className="space-y-4 text-sm sm:text-base text-foreground/90 leading-relaxed">
            <p className="first-letter:text-3xl first-letter:font-black first-letter:text-orange-600 first-letter:mr-1">
              {ceo.bio1}
            </p>
            <p>
              {ceo.bio2}
            </p>
          </div>

          {/* Keynote Speech Quote Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-l-4 border-orange-500 relative">
            <Quote className="h-8 w-8 text-orange-500/30 absolute top-4 right-4" />
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Founder's Keynote Message
            </p>
            <p className="text-sm sm:text-base italic text-foreground font-medium leading-relaxed">
              "{ceo.speech}"
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">— {ceo.name}</span>
              <span className="text-[11px] text-muted-foreground">({ceo.role}, GGD Ad Network)</span>
            </div>
          </div>

          {/* Key Strategic Focus Pillars */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Core Strategic Focus</h4>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-background border border-border/80 flex items-start gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 shrink-0">
                  <Rocket className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-foreground">AI-Driven Digital Tools</h5>
                  <p className="text-[11px] text-muted-foreground">Intelligent copywriting, automated asset synthesis, and campaign optimizers.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/80 flex items-start gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-foreground">Automated Ad Platforms</h5>
                  <p className="text-[11px] text-muted-foreground">Decentralized impressions, credit-backed actions, and verified social distribution.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/80 flex items-start gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                  <Code className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-foreground">Web Solutions for Creators</h5>
                  <p className="text-[11px] text-muted-foreground">Scalable storefronts, responsive digital portfolios, and seamless direct customer communication.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background border border-border/80 flex items-start gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-foreground">Syndicate Social Networks</h5>
                  <p className="text-[11px] text-muted-foreground">Empowering promoters and everyday users to monetize their reach through viral campaigns.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social / Connect Footer Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Connect with Bethel:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {ceo.whatsapp && (
                <a
                  href={`https://wa.me/${ceo.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-bold transition border border-emerald-500/20"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Founder
                </a>
              )}
              {ceo.email && (
                <a
                  href={`mailto:${ceo.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition border border-border"
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Video */}
      <YouTubeEmbed section="about" />

      {/* Mission & Vision */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                <Compass className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Our Mission</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To make effective digital marketing and business growth accessible to every African business, merchant, and indie builder through intuitive AI tools and collaborative distribution.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600">
                <Heart className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Our Vision</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To build a continent-wide digital ecosystem where businesses find loyal customers, promoters earn sustainable income, and African commerce scales globally.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* What We Help Businesses Do */}
      <div className="space-y-3">
        <div className="text-center md:text-left">
          <h2 className="text-lg font-bold text-foreground">What We Help Businesses Do</h2>
          <p className="text-xs text-muted-foreground">Practical growth channels designed for measurable outcomes.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              icon: Building2,
              title: "Get Discovered",
              desc: "Businesses can establish a presence and showcase their business, contact details, and location in the directory.",
              color: "text-blue-500 bg-blue-500/10",
            },
            {
              icon: Store,
              title: "Showcase Offerings",
              desc: "Highlight products and services directly on your profile so customer discovery converts into real inquiries.",
              color: "text-emerald-500 bg-emerald-500/10",
            },
            {
              icon: Megaphone,
              title: "Get Visibility",
              desc: "Use commercial Banner Ads and eligible featured exposure across GGD to increase high-intent brand visibility.",
              color: "text-orange-500 bg-orange-500/10",
            },
            {
              icon: Users,
              title: "Promote & Reach",
              desc: "Use Credit Tasks for community promotion or work with verified Syndicate promoters for paid multi-platform promotion.",
              color: "text-purple-500 bg-purple-500/10",
            },
            {
              icon: Sparkles,
              title: "Create Marketing Content",
              desc: "Use practical marketing and content creation tools, including BlogMate AI, to craft compelling copy and articles.",
              color: "text-pink-500 bg-pink-500/10",
            },
            {
              icon: TrendingUp,
              title: "Scale & Grow",
              desc: "The goal is to turn visibility, customer reach, and promotion into real, sustainable business opportunities.",
              color: "text-amber-500 bg-amber-500/10",
            },
          ].map((item, i) => (
            <Card key={i} className="border-border hover:border-orange-500/30 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Growth Journey */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">How GGD Helps You Grow</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Get Discovered', desc: 'Create your business profile with contact links, products, and services in the directory.' },
              { step: '02', title: 'Create & Promote', desc: 'Craft marketing content with tools like BlogMate AI, launch Banner Ads, or post promotional tasks.' },
              { step: '03', title: 'Reach Customers', desc: 'Community members and verified Syndicate promoters amplify your reach across social platforms.' },
              { step: '04', title: 'Grow', desc: 'Convert increased visibility into direct inquiries, sales, and long-term customer relationships.' },
            ].map((s, i) => (
              <div key={i} className="space-y-1.5">
                <div className="text-xs font-black text-orange-500">{s.step}</div>
                <h4 className="text-sm font-bold text-foreground">{s.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Attribution */}
      <div className="text-center py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">Engineered with passion by</p>
        <p className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Goodgift Digital
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          © {new Date().getFullYear()} GGD Ad Network • Founded by Bethel Chukwunyere • Lagos, Nigeria. All rights reserved.
        </p>
      </div>

      {/* FULL FLYER MODAL */}
      {showFullFlyer && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900 text-white">
              <span className="text-xs font-bold text-orange-400">Bethel Chukwunyere - Official Executive Flyer</span>
              <button
                type="button"
                onClick={() => setShowFullFlyer(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 sm:p-4 max-h-[80vh] overflow-auto flex items-center justify-center bg-black">
              <img
                src={ceo.flyerUrl}
                alt="Executive Keynote Flyer"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">GGD Ad Network & Goodgift Digital</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFullFlyer(false)}
                className="rounded-xl text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutPage;


