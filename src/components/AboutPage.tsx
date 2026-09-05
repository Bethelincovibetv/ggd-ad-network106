import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Search, Megaphone, Rocket, PenTool, Users, TrendingUp } from "lucide-react";
import YouTubeEmbed from "@/components/YouTubeEmbed";

const AboutPage = () => {
  const growthPaths = [
    { icon: Search, title: 'Get Discovered', desc: 'Showcase your business, products, and services so customers can find you.' },
    { icon: Megaphone, title: 'Get Visibility', desc: 'Advertise and promote your business to reach more potential customers.' },
    { icon: Rocket, title: 'Promote', desc: 'Use community promotion, Credit Tasks, or professional Syndicate promoters.' },
    { icon: PenTool, title: 'Create', desc: 'Use practical marketing and content tools to build what your business needs.' },
    { icon: Users, title: 'Connect', desc: 'Take part in a community where businesses and people discover opportunities.' },
    { icon: TrendingUp, title: 'Grow', desc: 'Turn visibility, promotion, and customer connections into business opportunities.' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          About GGD Ad Network
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          A digital business-growth and marketing platform built to help businesses get discovered, reach more customers, and grow.
        </p>
      </div>

      <YouTubeEmbed section="about" />

      <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Our Mission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To make effective digital marketing and business growth more accessible to businesses, especially small and growing businesses.
            GGD brings business discovery, advertising, community promotion, marketing tools, and promotional networks together in one ecosystem.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {growthPaths.map((item, i) => (
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
          <h2 className="text-lg font-bold text-foreground">What GGD Helps You Do</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Get discovered', desc: 'Create a business presence and showcase your products and services.' },
              { step: '2', title: 'Reach more people', desc: 'Use advertising and promotion to put your business in front of potential customers.' },
              { step: '3', title: 'Build connections', desc: 'Use the community and promotional network to create more opportunities.' },
              { step: '4', title: 'Grow your business', desc: 'Use practical marketing tools and performance insights to keep improving.' },
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
