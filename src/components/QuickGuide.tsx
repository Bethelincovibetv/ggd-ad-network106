
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Circle, 
  FileText, 
  Zap, 
  TrendingUp, 
  RotateCcw, 
  ArrowRight,
  BookOpen,
  Target,
  Sparkles
} from "lucide-react";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  feature: string;
}

const QuickGuide = ({ onFeatureChange }: { onFeatureChange: (feature: string) => void }) => {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const guideSteps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to BlogMate AI',
      description: 'You\'ve successfully logged in! This guide will help you get started with all our powerful features.',
      icon: Sparkles,
      completed: true,
      feature: 'landing'
    },
    {
      id: 'blog-generator',
      title: 'Generate Your First Blog Post',
      description: 'Create SEO-optimized blog posts in minutes. Just enter a topic and let our AI do the work.',
      icon: FileText,
      completed: completedSteps.includes('blog-generator'),
      feature: 'blog'
    },
    {
      id: 'gaming-ads',
      title: 'Create Gaming Advertisements',
      description: 'Design engaging animated ads for games and digital products with our specialized ad creator.',
      icon: Zap,
      completed: completedSteps.includes('gaming-ads'),
      feature: 'advert'
    },
    {
      id: 'sales-funnel',
      title: 'Build Sales Funnels',
      description: 'Create professional sales funnels with countdown timers and conversion optimization.',
      icon: TrendingUp,
      completed: completedSteps.includes('sales-funnel'),
      feature: 'funnel'
    },
    {
      id: 'ad-rotator',
      title: 'Manage Ad Rotations',
      description: 'Set up and manage rotating advertisements across your platforms efficiently.',
      icon: RotateCcw,
      completed: completedSteps.includes('ad-rotator'),
      feature: 'rotator'
    }
  ];

  const markStepCompleted = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  const handleTryFeature = (step: GuideStep) => {
    markStepCompleted(step.id);
    onFeatureChange(step.feature);
  };

  const completionPercentage = Math.round((completedSteps.length / (guideSteps.length - 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Quick Setup Guide
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Let's get you started with BlogMate AI in just a few steps
          </p>
          <div className="mt-4">
            <Badge variant="secondary" className="text-sm">
              Progress: {completionPercentage}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {guideSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card 
              key={step.id}
              className={`transition-all duration-200 ${
                step.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'hover:shadow-md hover:scale-[1.02]'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <Circle className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`h-6 w-6 ${
                        step.completed ? 'text-green-600' : 'text-purple-600'
                      }`} />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Step {index + 1}: {step.title}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                      {step.description}
                    </p>
                    
                    {!step.completed && step.id !== 'welcome' && (
                      <Button 
                        onClick={() => handleTryFeature(step)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Try This Feature
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                    
                    {step.completed && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {completionPercentage === 100 && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Congratulations! 🎉
            </h3>
            <p className="text-gray-600 mb-4">
              You've completed the setup guide! You're now ready to create amazing content with BlogMate AI.
            </p>
            <Button 
              onClick={() => onFeatureChange('blog')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              Start Creating Content
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuickGuide;
