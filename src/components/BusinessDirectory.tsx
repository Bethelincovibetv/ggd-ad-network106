import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Store, Globe, Phone, Facebook, Instagram, Send, ExternalLink, Crown, Loader2, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BusinessDirectoryProps {
  isBusiness?: boolean;
}

const BusinessDirectory = ({ isBusiness }: BusinessDirectoryProps) => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isListed, setIsListed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [directoryCost, setDirectoryCost] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [bizRes, catRes, costRes] = await Promise.all([
      (supabase.from('business_profiles') as any).select('*').eq('is_directory_listed', true),
      (supabase.from('business_categories') as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('app_settings').select('value').eq('key', 'directory_listing_cost').maybeSingle(),
    ]);
    setBusinesses(bizRes.data || []);
    setCategories(catRes.data || []);
    if (costRes.data?.value) setDirectoryCost(parseInt(costRes.data.value));
    checkOwnListing();
    setLoading(false);
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
    fetchData();
  };

  const filtered = businesses.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || b.business_name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || b.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Business Directory</h2>
        <p className="text-xs text-muted-foreground">Discover verified businesses on GGD Network</p>
      </div>

      {/* Subscribe CTA */}
      {isBusiness && !isListed && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardContent className="p-4 text-center space-y-2">
            <Crown className="h-8 w-8 mx-auto text-orange-600" />
            <h3 className="font-bold text-sm text-foreground">List Your Business</h3>
            <p className="text-xs text-muted-foreground">Get discovered by thousands of users.</p>
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

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search businesses..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {categories.length > 0 && (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9">
              <Filter className="h-3 w-3 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} businesses listed</p>

      <div className="space-y-3">
        {filtered.map(biz => {
          const bizCategory = categories.find(c => c.id === biz.category_id);
          return (
            <Card key={biz.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/business/${biz.id}`)}>
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 flex items-center gap-3">
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.business_name} className="h-14 w-14 rounded-xl object-cover border-2 border-white/30" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                      <Store className="h-7 w-7 text-white/80" />
                    </div>
                  )}
                  <div className="text-white min-w-0 flex-1">
                    <h3 className="font-bold text-sm truncate">{biz.business_name}</h3>
                    {biz.description && <p className="text-[11px] text-white/80 line-clamp-2">{biz.description}</p>}
                    {bizCategory && <Badge className="mt-1 bg-white/20 text-white border-0 text-[9px]">{bizCategory.name}</Badge>}
                  </div>
                  <Eye className="h-5 w-5 text-white/60 flex-shrink-0" />
                </div>
                <div className="p-3 flex flex-wrap gap-1.5">
                  {biz.whatsapp_link && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-green-200 text-green-700">
                      <Phone className="h-3 w-3" />WhatsApp
                    </Badge>
                  )}
                  {biz.website_link && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Globe className="h-3 w-3" />Website
                    </Badge>
                  )}
                  {biz.facebook_url && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-blue-200 text-blue-700">
                      <Facebook className="h-3 w-3" />Facebook
                    </Badge>
                  )}
                  {biz.instagram_url && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-pink-200 text-pink-700">
                      <Instagram className="h-3 w-3" />Instagram
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
