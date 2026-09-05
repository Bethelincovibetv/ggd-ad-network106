import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Store, Megaphone, Users, Sparkles, TrendingUp, Compass, Heart, ShieldCheck } from "lucide-react";
import YouTubeEmbed from "@/components/YouTubeEmbed";

const AboutPage = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          About GGD Ad Network
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          GGD Ad Network is a digital business-growth and marketing platform built to help businesses get discovered, reach more customers, promote their products and services, and grow.
        </p>
      </div>

      {/* About Video */}
      <YouTubeEmbed section="about" />

      {/* Overview Card */}
      <Card className="border-orange-500/20 bg-gradient-to-br from-orange-50/50 via-background to-red-50/30 dark:from-orange-950/10 dark:via-background dark:to-red-950/10">
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We bring together <strong className="text-foreground">business discovery</strong>, <strong className="text-foreground">advertising</strong>, <strong className="text-foreground">community promotion</strong>, <strong className="text-foreground">marketing tools</strong>, and <strong className="text-foreground">promotional networks</strong> in one unified ecosystem.
          </p>
        </CardContent>
      </Card>

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
              To make effective digital marketing and business growth more accessible to businesses, especially small and growing businesses.
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
              To build a powerful digital ecosystem where businesses can find customers, people can discover opportunities, and everyone can participate in the growth of the marketplace.
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
              title: "Grow",
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

      <div className="text-center py-4 border-t border-border">
        <p className="text-xs text-muted-foreground">Powered by</p>
        <p className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Goodgift Digital
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">© {new Date().getFullYear()} GGD Ad Network. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AboutPage;

