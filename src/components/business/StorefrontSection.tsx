import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ExternalLink,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Store,
  Eye,
  Sparkles,
  MapPin,
  Phone,
  Globe,
  Package,
  Zap,
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StorefrontSectionProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  listings: any[];
  userId: string;
  onNavigateToTab: (tab: string) => void;
}

export const StorefrontSection: React.FC<StorefrontSectionProps> = ({
  profile,
  setProfile,
  listings,
  userId,
  onNavigateToTab,
}) => {
  const [copied, setCopied] = useState(false);
  const [togglingDirectory, setTogglingDirectory] = useState(false);

  const storefrontPath = profile?.slug ? `/b/${profile.slug}` : `/user/${userId}`;
  const fullStorefrontUrl = `${window.location.origin}${storefrontPath}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullStorefrontUrl);
    setCopied(true);
    toast.success("Storefront link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Check out ${profile?.business_name || 'our business'} on GGD Ad Network! Browse our products, offers, and professional services here: ${fullStorefrontUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.business_name || 'My Business on GGD',
          text: profile?.description || 'Browse our products and services',
          url: fullStorefrontUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleToggleDirectory = async (checked: boolean) => {
    setTogglingDirectory(true);
    try {
      if (profile?.id) {
        const { error } = await (supabase.from('business_profiles') as any)
          .update({ is_directory_listed: checked })
          .eq('id', profile.id);
        if (error) throw error;
        setProfile((prev: any) => ({ ...prev, is_directory_listed: checked }));
        toast.success(checked ? "Listed in GGD Business Directory! 🌟" : "Removed from public directory search");
      }
    } catch (err: any) {
      toast.error("Failed to update directory status: " + err.message);
    } finally {
      setTogglingDirectory(false);
    }
  };

  const activeProducts = listings.filter(l => l.listing_type !== 'service' && l.is_active !== false);
  const activeServices = listings.filter(l => l.listing_type === 'service' && l.is_active !== false);

  return (
    <div className="space-y-4">
      {/* Top Banner Actions */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-orange-600" />
                <h3 className="font-black text-base sm:text-lg text-foreground">
                  Your Live Public Storefront
                </h3>
                <Badge className="bg-emerald-500 text-white font-black text-[9px]">
                  LIVE
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                This is the dedicated link your customers and WhatsApp contacts use to view your catalog, order products, and book your services.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => window.open(storefrontPath, '_blank')}
                className="flex-1 sm:flex-initial h-10 px-4 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md rounded-xl"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Visit Storefront
              </Button>

              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="h-10 px-3 text-xs font-bold rounded-xl border-border/80"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1.5">{copied ? 'Copied' : 'Copy Link'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleShareWhatsApp}
                className="h-10 px-3 text-xs font-bold text-emerald-600 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={handleNativeShare}
                className="h-10 px-3 text-xs font-bold rounded-xl border-border/80"
                title="Share via other apps"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Status Toggle */}
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-orange-500" />
              <h4 className="text-sm font-bold text-foreground">GGD Business Directory Listing</h4>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allow other members and search engines to discover your business in the public directory.
            </p>
          </div>
          <Switch
            checked={profile?.is_directory_listed !== false}
            onCheckedChange={handleToggleDirectory}
            disabled={togglingDirectory}
          />
        </CardContent>
      </Card>

      {/* Live Storefront Mockup Preview */}
      <Card className="overflow-hidden border-border/80 shadow-md">
        <div className="p-3 bg-muted/40 border-b border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="text-[11px] font-mono text-muted-foreground ml-2 truncate max-w-xs sm:max-w-md">
              {fullStorefrontUrl}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateToTab('profile')}
            className="h-7 text-[11px] font-bold text-orange-600 hover:text-orange-700"
          >
            Edit Branding
          </Button>
        </div>

        <CardContent className="p-0 bg-background">
          {/* Cover Header in Preview */}
          <div className="relative h-28 sm:h-36 w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-600">
            {profile?.hero_image_url && (
              <img
                src={profile.hero_image_url}
                alt="Storefront cover"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Profile Identity Row */}
          <div className="px-4 sm:px-6 pb-5">
            <div className="relative -mt-10 sm:-mt-12 flex items-end justify-between gap-3 mb-3">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-background bg-card shadow-lg overflow-hidden shrink-0">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-orange-500 text-white font-black text-2xl">
                    {profile?.business_name ? profile.business_name.slice(0, 2).toUpperCase() : 'GB'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.open(storefrontPath, '_blank')}
                  className="h-8 px-3 text-xs font-bold bg-orange-600 text-white rounded-xl shadow"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                  Open Live
                </Button>
              </div>
            </div>

            {/* Business Header Info */}
            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground">
                {profile?.business_name || 'My Business'}
              </h3>
              {profile?.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-2xl leading-relaxed">
                  {profile.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                {profile?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-orange-500" />
                    {profile.address}
                  </span>
                )}
                {profile?.phone_number && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-orange-500" />
                    {profile.phone_number}
                  </span>
                )}
                {profile?.website_link && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-blue-500" />
                    Website
                  </span>
                )}
              </div>
            </div>

            {/* Catalog Summary in Preview */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Catalog Preview ({activeProducts.length} Products, {activeServices.length} Services)
                </h4>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateToTab('products')}
                    className="h-7 text-[11px] font-bold text-blue-600"
                  >
                    + Manage Products
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateToTab('services')}
                    className="h-7 text-[11px] font-bold text-purple-600"
                  >
                    + Manage Services
                  </Button>
                </div>
              </div>

              {listings.length === 0 ? (
                <div className="text-center py-8 rounded-2xl bg-muted/20 border border-dashed border-border/70">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs font-bold text-foreground">No listings published yet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Add products or services to populate your public storefront.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {listings.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      className="rounded-xl border border-border/60 overflow-hidden bg-card text-left p-2 flex flex-col justify-between"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-1.5">
                        {l.image_url ? (
                          <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/60">
                            {l.listing_type === 'service' ? (
                              <Zap className="h-5 w-5 text-purple-400" />
                            ) : (
                              <Package className="h-5 w-5 text-blue-400" />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{l.title}</p>
                      <p className="text-[11px] font-black text-orange-600 mt-0.5">
                        {Number(l.price) > 0 ? `₦${Number(l.price).toLocaleString()}` : (l.listing_type === 'service' ? 'Contact' : '₦0')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorefrontSection;
