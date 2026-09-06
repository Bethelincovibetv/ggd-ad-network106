import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  FileText, 
  Zap, 
  TrendingUp, 
  RotateCcw, 
  ArrowRight, 
  BookOpen, 
  Sparkles,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { guideService } from "@/services/guideService";
import { playRewardSound } from "@/lib/soundEffects";
import { toast } from "sonner";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
  feature: string;
}

const QuickGuide = ({ onFeatureChange }: { onFeatureChange: (feature: string) => void }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const steps = await guideService.getCompletedSteps(user.id);
          setCompletedSteps(steps);
        }
      } catch (err) {
        console.warn("Failed to load guide progress:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const guideSteps: GuideStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to GGD & BlogMate AI',
      description: 'You are successfully logged in! This guide will help you get started with all our powerful advertising and marketing features.',
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
      title: 'Create Gaming & Banner Advertisements',
      description: 'Design engaging animated ads for games and digital products with our specialized ad creator.',
      icon: Zap,
      completed: completedSteps.includes('gaming-ads'),
      feature: 'advert'
    },
    {
      id: 'sales-funnel',
      title: 'Build High-Converting Sales Funnels',
      description: 'Create professional sales funnels with countdown timers and conversion optimization.',
      icon: TrendingUp,
      completed: completedSteps.includes('sales-funnel'),
      feature: 'funnel'
    },
    {
      id: 'ad-rotator',
      title: 'Manage Ad Rotations & Campaigns',
      description: 'Set up and manage rotating advertisements across your platforms efficiently.',
      icon: RotateCcw,
      completed: completedSteps.includes('ad-rotator'),
      feature: 'rotator'
    }
  ];

  const toggleStepCompleted = async (stepId: string) => {
    if (stepId === 'welcome') return;
    const isCurrentlyCompleted = completedSteps.includes(stepId);
    const nextStatus = !isCurrentlyCompleted;

    setSavingStepId(stepId);
    // Optimistic UI update
    setCompletedSteps(prev => 
      nextStatus ? [...prev, stepId] : prev.filter(id => id !== stepId)
    );

    if (userId) {
      await guideService.setStepCompletion(userId, stepId, nextStatus);
    }

    if (nextStatus) {
      playRewardSound();
      toast.success("Step marked complete! Progress saved to your account.");
    }
    setSavingStepId(null);
  };

  const handleTryFeature = async (step: GuideStep) => {
    if (!completedSteps.includes(step.id) && userId) {
      setCompletedSteps(prev => [...prev, step.id]);
      await guideService.setStepCompletion(userId, step.id, true);
      playRewardSound();
    }
    onFeatureChange(step.feature);
  };

  const completedCount = guideSteps.filter(s => s.completed).length;
  const completionPercentage = Math.round((completedCount / guideSteps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Card className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-amber-500/10 border border-orange-500/30 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="text-center py-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl shadow-md">
              <BookOpen className="h-7 w-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black text-foreground">
            Interactive Setup Guide
          </CardTitle>
          <p className="text-sm font-semibold text-foreground/80 mt-1 max-w-lg mx-auto">
            Step-by-step walkthrough to help you grow your business and launch campaigns.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Badge className="bg-orange-600 text-white hover:bg-orange-700 px-3 py-1 font-bold text-xs shadow-xs">
              {completionPercentage}% Completed ({completedCount}/{guideSteps.length} Steps)
            </Badge>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border/40">
            <div 
              className="bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3.5">
        {guideSteps.map((step, index) => {
          const Icon = step.icon;
          const isSaving = savingStepId === step.id;
          return (
            <Card 
              key={step.id}
              className={`transition-all duration-200 rounded-2xl border ${
                step.completed 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-700/40 shadow-xs' 
                  : 'bg-card border-border hover:border-orange-500/40 hover:shadow-sm'
              }`}
            >
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleStepCompleted(step.id)}
                      disabled={step.id === 'welcome' || isSaving}
                      aria-label={step.completed ? "Mark incomplete" : "Mark complete"}
                      className="mt-0.5 flex-shrink-0 focus:outline-hidden group"
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
                      ) : (
                        <Circle className="h-7 w-7 text-muted-foreground/60 group-hover:text-orange-500 transition-colors" />
                      )}
                    </button>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Icon className={`h-5 w-5 ${
                          step.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                        }`} />
                        <h3 className="text-base font-bold text-foreground">
                          Step {index + 1}: {step.title}
                        </h3>
                        {step.completed && (
                          <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30">
                            Completed ✓
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {step.id !== 'welcome' && (
                      <Button
                        size="sm"
                        variant={step.completed ? "outline" : "default"}
                        onClick={() => handleTryFeature(step)}
                        className={`h-9 px-4 rounded-xl font-bold text-xs shadow-xs ${
                          step.completed
                            ? 'border-border text-foreground hover:bg-muted'
                            : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
                        }`}
                      >
                        {step.completed ? 'Launch Feature' : 'Try This Feature'}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default QuickGuide;
