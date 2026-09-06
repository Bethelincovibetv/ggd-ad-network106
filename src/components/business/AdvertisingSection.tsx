import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Share2,
  Users,
  Crown,
  Link2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  MousePointer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface AdvertisingSectionProps {
  businessName: string;
  userId: string;
  onNavigateToTab?: (tab: string) => void;
}

export const AdvertisingSection: React.FC<AdvertisingSectionProps> = ({
  businessName,
  userId,
  onNavigateToTab,
}) => {
  const { isEnabled } = useFeatureToggles();
  const [activeAds, setActiveAds] = useState<any[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);

  useEffect(() => {
    const fetchBusinessAds = async () => {
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setActiveAds(data);
        }
      } catch (err) {
        console.error("Error loading ads:", err);
      } finally {
        setLoadingAds(false);
      }
    };

    if (userId) {
      fetchBusinessAds();
    }
  }, [userId]);

  const dispatchNav = (tab: string) => {
    window.dispatchEvent(new CustomEvent('ggd-nav', { detail: tab }));
  };

  return (
    <div className="space-y-4">
      {/* Advertising Hub Header */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white grid place-items-center shadow-md">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-foreground">
                    Promote {businessName || 'Your Business'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Amplify your reach across web publishers, social syndicates, and the GGD community.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => dispatchNav('ads-create')}
              className="w-full sm:w-auto h-11 px-5 text-xs font-black bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 rounded-xl"
            >
              <Megaphone className="h-4 w-4 mr-1.5" />
              Create New Advert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Promotion Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Channel 1: Banner Ad Network */}
        <Card className="border-border/70 hover:border-orange-500/60 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 text-orange-600 grid place-items-center">
                  <Megaphone className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50">
                  Publisher Websites
                </Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Display Banner Adverts
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Launch targeted banner ads that rotate live across verified publisher blogs and websites in the GGD network.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => dispatchNav('ads-create')}
              className="mt-4 h-10 w-full text-xs font-bold justify-between rounded-xl border-border/70 hover:border-orange-500 text-foreground"
            >
              Launch Banner Advert
              <ArrowRight className="h-4 w-4 text-orange-500" />
            </Button>
          </CardContent>
        </Card>

        {/* Channel 2: WhatsApp Syndicates */}
        <Card className="border-border/70 hover:border-green-500/60 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-2xl bg-green-500/10 text-green-600 grid place-items-center">
                  <Users className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50">
                  WhatsApp Status
                </Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                WhatsApp Status Syndicates
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pay verified WhatsApp syndicates to broadcast your flyers and offers directly to thousands of status viewers.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => dispatchNav('business-tasks')}
              className="mt-4 h-10 w-full text-xs font-bold justify-between rounded-xl border-border/70 hover:border-green-500 text-foreground"
            >
              Create Syndicate Campaign
              <ArrowRight className="h-4 w-4 text-green-600" />
            </Button>
          </CardContent>
        </Card>

        {/* Channel 3: Community Announcements */}
        <Card className="border-border/70 hover:border-blue-500/60 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 grid place-items-center">
                  <Share2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50">
                  GGD Community
                </Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Post Offer to Community Feed
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Announce discounts, new arrivals, or client case studies to all active members on the community social wall.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => dispatchNav('feed')}
              className="mt-4 h-10 w-full text-xs font-bold justify-between rounded-xl border-border/70 hover:border-blue-500 text-foreground"
            >
              Post Announcement
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </Button>
          </CardContent>
        </Card>

        {/* Channel 4: Smart Links */}
        <Card className="border-border/70 hover:border-purple-500/60 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 grid place-items-center">
                  <Link2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 bg-purple-50">
                  Trackable URLs
                </Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Generate Smart Trackable Links
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Create shortened marketing links for your storefront or listings to monitor click origins and analytics.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => dispatchNav('smart-links')}
              className="mt-4 h-10 w-full text-xs font-bold justify-between rounded-xl border-border/70 hover:border-purple-500 text-foreground"
            >
              Open Smart Links
              <ArrowRight className="h-4 w-4 text-purple-600" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Existing Business Adverts */}
      {activeAds.length > 0 && (
        <Card className="border-border/70 shadow-sm mt-4">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black">Your Running Adverts</CardTitle>
                <CardDescription className="text-xs">Live campaigns currently promoting your business</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatchNav('ads')}
                className="h-8 text-xs font-bold text-orange-600"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 divide-y divide-border/60">
            {activeAds.map((ad) => (
              <div key={ad.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground truncate">{ad.title}</p>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 h-4 ${
                        ad.status === 'active'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {ad.status || 'Active'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {ad.views_count || 0} impressions
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3" />
                      {ad.clicks_count || 0} clicks
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dispatchNav('ads')}
                  className="h-8 px-2.5 text-xs font-bold"
                >
                  Manage
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvertisingSection;
