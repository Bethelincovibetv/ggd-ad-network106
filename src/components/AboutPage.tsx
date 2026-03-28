import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Users, Zap, Shield, Heart, Target } from "lucide-react";

const AboutPage = () => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          About GGD Ad Network
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Africa's fastest-growing decentralized advertising and social media monetization platform.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Our Mission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            GGD Ad Network empowers small businesses to reach millions through social media influencers 
            and everyday users. We connect businesses with verified syndicate operators who share ads 
            across WhatsApp, Facebook, Instagram, TikTok, and more — turning social engagement into income.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Globe, title: 'Global Reach', desc: 'Ads displayed across thousands of platforms worldwide' },
          { icon: Users, title: 'Syndicate Network', desc: 'Verified operators sharing your content everywhere' },
          { icon: Zap, title: 'Instant Results', desc: 'Campaign goes live within minutes of creation' },
          { icon: Shield, title: 'Secure & Trusted', desc: 'Verified proofs and secure Paystack payments' },
          { icon: Heart, title: 'Community First', desc: 'Built for African businesses by African innovators' },
          { icon: Target, title: 'Targeted Ads', desc: 'Reach specific locations and demographics' },
        ].map((item, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-3 text-center space-y-1">
              <item.icon className="h-6 w-6 mx-auto text-orange-500" />
              <h3 className="text-xs font-bold text-foreground">{item.title}</h3>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-bold text-foreground">How It Works</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up for free and get daily login credits.' },
              { step: '2', title: 'Create Campaigns', desc: 'Upload your ad banner, set duration, and go live.' },
              { step: '3', title: 'Reach Millions', desc: 'Syndicate operators share your ads across social media.' },
              { step: '4', title: 'Track & Grow', desc: 'Monitor impressions, clicks, and conversions in real-time.' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{s.step}</div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
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
        <p className="text-[10px] text-muted-foreground mt-1">© {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </div>
  );
};

export default AboutPage;
