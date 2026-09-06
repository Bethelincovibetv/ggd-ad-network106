import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Eye,
  MousePointer,
  Percent,
  ShoppingBag,
  MessageCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PerformanceSectionProps {
  profile: any;
  listings: any[];
  userId: string;
  onNavigateToTab: (tab: string) => void;
}

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  profile,
  listings,
  userId,
  onNavigateToTab,
}) => {
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalInquiries: 0,
    activeAdsCount: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch ads statistics
        const { data: ads } = await supabase
          .from('ads')
          .select('views_count, clicks_count, status')
          .eq('user_id', userId);

        let imps = 0;
        let clks = 0;
        let activeAds = 0;
        if (ads) {
          ads.forEach((a) => {
            imps += a.views_count || 0;
            clks += a.clicks_count || 0;
            if (a.status === 'active') activeAds++;
          });
        }

        // Fetch received inquiries / messages count
        let inqs = 0;
        try {
          const { count } = await (supabase.from('p2p_messages') as any)
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId);
          inqs = count || 0;
        } catch {
          // ignore if table error
        }

        setStats({
          totalImpressions: imps,
          totalClicks: clks,
          totalInquiries: inqs,
          activeAdsCount: activeAds,
          loading: false,
        });
      } catch (err) {
        console.error("Error loading performance stats:", err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  const activeProducts = listings.filter(l => l.listing_type !== 'service' && l.is_active !== false);
  const activeServices = listings.filter(l => l.listing_type === 'service' && l.is_active !== false);
  const ctr = stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1) : '0.0';

  // Calculate Business Growth Readiness Score
  const checklist = [
    { label: "Business Name & Description", done: !!(profile?.business_name && profile?.description), tab: 'profile' },
    { label: "Profile Photo / Logo Uploaded", done: !!profile?.logo_url, tab: 'profile' },
    { label: "Storefront Cover Banner Uploaded", done: !!profile?.hero_image_url, tab: 'profile' },
    { label: "Category & Contact Channels Configured", done: !!(profile?.category_id && (profile?.phone_number || profile?.whatsapp_link)), tab: 'profile' },
    { label: "At least 1 Active Product Added", done: activeProducts.length > 0, tab: 'products' },
    { label: "At least 1 Active Service Added", done: activeServices.length > 0, tab: 'services' },
    { label: "Listed in Public Business Directory", done: profile?.is_directory_listed !== false, tab: 'storefront' },
    { label: "Live Advert or Promotion Launched", done: stats.activeAdsCount > 0, tab: 'advertising' },
  ];

  const completedCount = checklist.filter(c => c.done).length;
  const growthScore = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-4">
      {/* Top Score Banner */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white grid place-items-center shadow-md shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base sm:text-lg text-foreground">
                    Business Growth Score
                  </h3>
                  <Badge className="bg-orange-500 text-white font-black text-xs">
                    {growthScore}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {growthScore === 100
                    ? "Exceptional! Your business workspace is fully optimized for maximum conversion."
                    : `${completedCount} of ${checklist.length} growth milestones completed.`}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-48">
              <Progress value={growthScore} className="h-2.5 bg-muted/60" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ad Impressions */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Impressions</span>
              <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">
              {stats.totalImpressions.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Network ad views</p>
          </CardContent>
        </Card>

        {/* Ad Clicks */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Ad Clicks</span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 grid place-items-center">
                <MousePointer className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">
              {stats.totalClicks.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Customer click-throughs</p>
          </CardContent>
        </Card>

        {/* CTR */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Avg. CTR</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">
              {ctr}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Click-to-impression ratio</p>
          </CardContent>
        </Card>

        {/* Inquiries */}
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">Inquiries</span>
              <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 grid place-items-center">
                <MessageCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-2">
              {stats.totalInquiries}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Leads & messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Checklist */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            Growth Readiness Checklist
          </CardTitle>
          <CardDescription className="text-xs">
            Complete all steps to maximize customer trust and conversion on your storefront.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 divide-y divide-border/60">
          {checklist.map((item, idx) => (
            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                )}
                <span className={`text-xs font-semibold truncate ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {item.label}
                </span>
              </div>

              {!item.done && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onNavigateToTab(item.tab)}
                  className="h-7 px-2 text-[11px] font-bold text-orange-600 hover:text-orange-700"
                >
                  Complete
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceSection;
