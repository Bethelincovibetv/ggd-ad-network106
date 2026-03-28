import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Gift, 
  ExternalLink, 
  Star, 
  Sparkles, 
  Crown, 
  Zap,
  TrendingUp,
  BookOpen,
  Target,
  Rocket,
  MessageCircle,
  ArrowLeft,
  Users
} from "lucide-react";

interface BonusPageProps {
  onFeatureChange: (feature: string) => void;
}

const BonusPage = ({ onFeatureChange }: BonusPageProps) => {
  const bonusUrl = "https://docs.google.com/document/d/123FvXz1lW4CTvUDGHcaFKUBy0xu9k_01zSwSfw2ypJs/edit?usp=drivesdk";
  const whatsappGroupUrl = "https://chat.whatsapp.com/DzTcIqw55H776ItzZsePUn";

  const bonusFeatures = [
    {
      icon: Crown,
      title: "Premium Templates",
      description: "Access exclusive blog templates and designs",
      color: "from-yellow-400 to-orange-500"
    },
    {
      icon: Zap,
      title: "Advanced AI Tools",
      description: "Unlock powerful content optimization features",
      color: "from-blue-400 to-indigo-500"
    },
    {
      icon: TrendingUp,
      title: "Marketing Strategies",
      description: "Learn proven methods to boost your content reach",
      color: "from-green-400 to-emerald-500"
    },
    {
      icon: BookOpen,
      title: "Expert Guides",
      description: "Step-by-step tutorials from industry professionals",
      color: "from-purple-400 to-pink-500"
    },
    {
      icon: Target,
      title: "SEO Secrets",
      description: "Insider tips to rank higher on search engines",
      color: "from-red-400 to-rose-500"
    },
    {
      icon: Rocket,
      title: "Growth Hacks",
      description: "Proven techniques to scale your content business",
      color: "from-cyan-400 to-teal-500"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          onClick={() => onFeatureChange('blog')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => onFeatureChange('chat')}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            AI Chat
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onFeatureChange('blog')}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Blog Generator
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 rounded-3xl opacity-50"></div>
        <div className="relative z-10 p-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full blur-lg opacity-75 animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                <Gift className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              EXCLUSIVE BONUSES
            </h1>
            <Crown className="h-8 w-8 text-yellow-500" />
          </div>
          
          <div className="flex justify-center gap-2 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
            ))}
          </div>
          
          <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-6">
            🎉 Congratulations! You've unlocked access to our premium content library filled with 
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> exclusive bonuses, templates, and insider secrets!</span>
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 text-lg">
              🔥 LIMITED TIME
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 text-lg">
              💎 VIP ACCESS
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              asChild
              size="lg"
              className="bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 hover:from-yellow-600 hover:via-pink-600 hover:to-purple-700 text-white px-8 py-4 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
            >
              <a
                href={bonusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
              >
                <Sparkles className="h-6 w-6" />
                CLAIM YOUR BONUSES NOW
                <ExternalLink className="h-6 w-6" />
              </a>
            </Button>
            
            <Button 
              asChild
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
            >
              <a
                href={whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
              >
                <Users className="h-6 w-6" />
                JOIN WHATSAPP GROUP
                <ExternalLink className="h-6 w-6" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* WhatsApp Group Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Join Our Exclusive WhatsApp Community! 💬
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
            Connect with fellow creators, get instant support, share your success stories, and receive exclusive tips and updates directly on WhatsApp!
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-bold"
          >
            <a
              href={whatsappGroupUrl}
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

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bonusFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${feature.color}`}></div>
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto p-4 bg-gradient-to-r ${feature.color} rounded-full w-fit group-hover:scale-110 transition-transform duration-300 mb-4`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-800">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Call to Action Section */}
      <Card className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <CardContent className="relative z-10 p-8 md:p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-white rounded-full opacity-20 animate-ping"></div>
              <div className="relative p-3 bg-white/20 rounded-full backdrop-blur-sm">
                <Rocket className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Supercharge Your Content?
          </h2>
          
          <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8 leading-relaxed">
            Don't miss out on these game-changing resources that have helped thousands of creators 
            scale their content and boost their income!
          </p>
          
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3">
              <span className="text-2xl font-bold">⏰ Limited Time Offer</span>
            </div>
          </div>
          
          <Button 
            asChild
            size="lg"
            variant="secondary"
            className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110"
          >
            <a
              href={bonusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <Gift className="h-6 w-6" />
              ACCESS BONUS CONTENT
              <ExternalLink className="h-6 w-6" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Testimonial Section */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
          ))}
        </div>
        <blockquote className="text-xl italic text-gray-700 mb-4 max-w-3xl mx-auto">
          "These bonuses completely transformed my content strategy! I saw a 300% increase in engagement 
          within just 30 days of implementing the techniques."
        </blockquote>
        <cite className="text-gray-600 font-semibold">- Sarah Johnson, Content Creator</cite>
      </div>
    </div>
  );
};

export default BonusPage;
