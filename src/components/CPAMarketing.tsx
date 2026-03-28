
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Users, 
  BarChart3,
  ExternalLink,
  CheckCircle,
  Lightbulb,
  Rocket,
  Gift,
  Zap,
  ArrowRight,
  Star,
  MessageCircle
} from "lucide-react";

const CPAMarketing = () => {
  const [email, setEmail] = useState('');

  const handleJoinProgram = () => {
    if (email) {
      // Open OffersVault in new tab
      window.open('https://www.offervault.com/', '_blank');
    }
  };

  const strategies = [
    {
      icon: Target,
      title: "Blog Content Marketing",
      description: "Use BlogMate AI to create SEO-optimized blog posts that naturally promote CPA offers",
      steps: [
        "Generate relevant blog content with BlogMate AI",
        "Include CPA offers naturally within the content",
        "Optimize for SEO to drive organic traffic",
        "Track conversions and optimize"
      ]
    },
    {
      icon: Zap,
      title: "Gaming Ad Campaigns",
      description: "Create engaging gaming advertisements that drive high-converting traffic to CPA offers",
      steps: [
        "Use the Gaming Ads generator for eye-catching creatives",
        "Target gaming audiences with relevant CPA offers",
        "A/B test different ad variations",
        "Scale winning campaigns"
      ]
    },
    {
      icon: TrendingUp,
      title: "Sales Funnel Integration",
      description: "Build professional sales funnels that pre-sell visitors before sending them to CPA offers",
      steps: [
        "Create landing pages with the Sales Funnel generator",
        "Build trust with valuable content",
        "Pre-sell the CPA offer benefits",
        "Use countdown timers to create urgency"
      ]
    },
    {
      icon: BarChart3,
      title: "Ad Rotation & Testing",
      description: "Maximize profits by rotating and testing multiple CPA offers simultaneously",
      steps: [
        "Set up multiple CPA offers in the Ad Rotator",
        "Test different offers with the same traffic source",
        "Track performance metrics",
        "Focus budget on highest-converting offers"
      ]
    }
  ];

  const benefits = [
    "Generate $100-$5000+ monthly in CPA commissions",
    "Work with top CPA networks and exclusive offers",
    "Scale your income with proven traffic methods",
    "No product creation or customer support needed",
    "Perfect for beginners and experienced marketers"
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 rounded-3xl opacity-50"></div>
        <div className="relative z-10 p-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-r from-green-500 to-blue-600 rounded-full">
                <DollarSign className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            CPA MARKETING MASTERY
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed mb-6">
            Learn how to make <span className="font-bold text-green-600">$100-$5000+ per month</span> with 
            CPA marketing using BlogMate AI's powerful content creation tools!
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 text-lg">
              💰 HIGH PROFITS
            </Badge>
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 text-lg">
              🚀 BEGINNER FRIENDLY
            </Badge>
          </div>
        </div>
      </div>

      {/* What is CPA Marketing Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">What is CPA Marketing?</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg text-gray-700 leading-relaxed">
            <strong>CPA (Cost Per Action) Marketing</strong> is a performance-based advertising model where you earn money 
            when people complete specific actions like signing up for a service, downloading an app, or making a purchase.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Users className="h-10 w-10 text-blue-600 mx-auto mb-2" />
              <h4 className="font-semibold">Drive Traffic</h4>
              <p className="text-sm text-gray-600">Use BlogMate AI to create content that attracts visitors</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <Target className="h-10 w-10 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold">Promote Offers</h4>
              <p className="text-sm text-gray-600">Share CPA offers with your audience</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <DollarSign className="h-10 w-10 text-purple-600 mx-auto mb-2" />
              <h4 className="font-semibold">Earn Commissions</h4>
              <p className="text-sm text-gray-600">Get paid when people complete actions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-500" />
            <CardTitle className="text-2xl">Why CPA Marketing Works So Well</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategies Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            How to Make Money with BlogMate AI + CPA Marketing
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Here are the proven strategies to combine BlogMate AI's features with CPA marketing for maximum profits
          </p>
        </div>

        <div className="grid gap-6">
          {strategies.map((strategy, index) => {
            const Icon = strategy.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{strategy.title}</CardTitle>
                      <p className="text-gray-600 mt-1">{strategy.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {strategy.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                          {stepIndex + 1}
                        </div>
                        <span className="text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Join Program Section */}
      <Card className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white border-0">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-white rounded-full opacity-20 animate-ping"></div>
              <div className="relative p-3 bg-white/20 rounded-full backdrop-blur-sm">
                <Rocket className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Your CPA Marketing Journey?
          </h2>
          
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of successful affiliate marketers using OffersVault to find 
            high-converting CPA offers in every niche!
          </p>
          
          <div className="max-w-md mx-auto mb-6">
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
              />
              <Button 
                onClick={handleJoinProgram}
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100 font-bold"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Now
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center gap-6 text-sm opacity-90">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>1000+ CPA Offers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Real-time Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>High Payouts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Tips */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8 text-orange-600" />
            <CardTitle className="text-2xl">Pro Tips for CPA Success</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-800">Content Strategy</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 text-orange-500 flex-shrink-0" />
                  <span>Create valuable content first, promote offers second</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 text-orange-500 flex-shrink-0" />
                  <span>Use BlogMate AI to generate consistent, SEO-optimized content</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 text-orange-500 flex-shrink-0" />
                  <span>Build trust with your audience before promoting offers</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-gray-800">Offer Selection</h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 text-orange-500 flex-shrink-0" />
                  <span>Choose offers relevant to your audience</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 text-orange-500 flex-shrink-0" />
                  <span>Test multiple offers to find the best converters</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-1 text-orange-500 flex-shrink-0" />
                  <span>Focus on offers with high conversion rates and good payouts</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <MessageCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Join Our CPA Marketing Community! 💬
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
            Connect with other CPA marketers, share strategies, get help with campaigns, and discover new profitable offers!
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-bold"
          >
            <a
              href="https://chat.whatsapp.com/DzTcIqw55H776ItzZsePUn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <MessageCircle className="h-6 w-6" />
              Join WhatsApp Group
              <ExternalLink className="h-6 w-6" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CPAMarketing;
