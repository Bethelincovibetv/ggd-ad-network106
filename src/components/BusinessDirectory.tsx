import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Store, Globe, Phone, Facebook, Instagram, Send, ExternalLink, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BusinessDirectoryProps {
  isBusiness?: boolean;
}

const BusinessDirectory = ({ isBusiness }: BusinessDirectoryProps) => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListed, setIsListed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [directoryCost, setDirectoryCost] = useState(0);

  useEffect(() => { fetchBusinesses(); fetchDirectoryCost(); checkOwnListing(); }, []);

  const fetchBusinesses = async () => {
    const { data } = await (supabase.from('business_profiles') as any).select('*').eq('is_directory_listed', true);
    setBusinesses(data || []);
    setLoading(false);
  };

  const fetchDirectoryCost = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'directory_listing_cost').maybeSingle();
    if (data?.value) setDirectoryCost(parseInt(data.value));
  };

  const checkOwnListing = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase.from('business_profiles') as any).select('is_directory_listed').eq('user_id', user.id).single();
    if (data?.is_directory_listed) setIsListed(true);
  };

  const subscribeToDirectory = async () => {
    setSubscribing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubscribing(false); return; }

    if (directoryCost > 0) {
      const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
      if (!profile || profile.credits < directoryCost) {
        toast.error(`Not enough credits. Need ${directoryCost} credits.`);
        setSubscribing(false);
        return;
      }
      await supabase.from('profiles').update({ credits: profile.credits - directoryCost }).eq('user_id', user.id);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await (supabase.from('business_profiles') as any).update({
      is_directory_listed: true,
      directory_subscription_expires_at: expiresAt.toISOString(),
    }).eq('user_id', user.id);

    toast.success("🎉 Your business is now listed in the directory!");
    setIsListed(true);
    setSubscribing(false);
    fetchBusinesses();
  };

  const filtered = businesses.filter(b => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.business_name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Business Directory</h2>
        <p className="text-xs text-muted-foreground">Discover verified businesses on GGD Network</p>
      </div>

      {/* Subscribe CTA for businesses not yet listed */}
      {isBusiness && !isListed && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardContent className="p-4 text-center space-y-2">
            <Crown className="h-8 w-8 mx-auto text-orange-600" />
            <h3 className="font-bold text-sm text-foreground">List Your Business</h3>
            <p className="text-xs text-muted-foreground">Get discovered by thousands of users. Subscribe to appear in the directory.</p>
            <Button onClick={subscribeToDirectory} disabled={subscribing} className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              {subscribing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
              Subscribe {directoryCost > 0 ? `(${directoryCost} credits/month)` : '(Free)'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isBusiness && isListed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-green-700 font-medium">✅ Your business is listed in the directory!</p>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search businesses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} businesses listed</p>

      <div className="space-y-3">
        {filtered.map(biz => (
          <Card key={biz.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 flex items-center gap-3">
                {biz.logo_url ? (
                  <img src={biz.logo_url} alt={biz.business_name} className="h-14 w-14 rounded-xl object-cover border-2 border-white/30" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                    <Store className="h-7 w-7 text-white/80" />
                  </div>
                )}
                <div className="text-white min-w-0">
                  <h3 className="font-bold text-sm truncate">{biz.business_name}</h3>
                  {biz.description && <p className="text-[11px] text-white/80 line-clamp-2">{biz.description}</p>}
                </div>
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {biz.whatsapp_link && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-green-200 text-green-700" onClick={() => window.open(biz.whatsapp_link, '_blank')}>
                    <Phone className="h-3 w-3" />WhatsApp
                  </Button>
                )}
                {biz.website_link && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => window.open(biz.website_link, '_blank')}>
                    <Globe className="h-3 w-3" />Website
                  </Button>
                )}
                {biz.facebook_url && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-blue-200 text-blue-700" onClick={() => window.open(biz.facebook_url, '_blank')}>
                    <Facebook className="h-3 w-3" />Facebook
                  </Button>
                )}
                {biz.instagram_url && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-pink-200 text-pink-700" onClick={() => window.open(biz.instagram_url, '_blank')}>
                    <Instagram className="h-3 w-3" />Instagram
                  </Button>
                )}
                {biz.telegram_url && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 border-sky-200 text-sky-700" onClick={() => window.open(biz.telegram_url, '_blank')}>
                    <Send className="h-3 w-3" />Telegram
                  </Button>
                )}
                {biz.tiktok_url && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => window.open(biz.tiktok_url, '_blank')}>
                    <ExternalLink className="h-3 w-3" />TikTok
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No businesses listed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDirectory;
