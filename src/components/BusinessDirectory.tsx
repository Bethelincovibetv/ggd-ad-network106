import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Store, Globe, Phone, Facebook, Instagram, Send, ExternalLink, Crown, Loader2, Eye, Filter, MapPin, Star, Sparkles, Play, Package, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import directoryHero from "@/assets/directory-hero.jpg";
import SlideCarousel from "@/components/SlideCarousel";

interface BusinessDirectoryProps {
  isBusiness?: boolean;
  onRequireAuth?: () => void;
  hideCarousel?: boolean;
}

const BusinessDirectory = ({ isBusiness, onRequireAuth, hideCarousel = false }: BusinessDirectoryProps) => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isListed, setIsListed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [directoryCost, setDirectoryCost] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [bizRes, catRes, costRes, listRes] = await Promise.all([
      (supabase.from('business_profiles') as any).select('*').eq('is_directory_listed', true),
      (supabase.from('business_categories') as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('app_settings').select('value').eq('key', 'directory_listing_cost').maybeSingle(),
      (supabase.from('business_listings') as any)
        .select('*, business_profiles!inner(id, business_name, logo_url, category_id, is_directory_listed)')
        .eq('is_active', true)
        .eq('business_profiles.is_directory_listed', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60),
    ]);
    setBusinesses(bizRes.data || []);
    setCategories(catRes.data || []);
    setListings(listRes.data || []);
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
    if (!user) {
      setSubscribing(false);
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        toast.info("Please sign in or register to list your business.");
      }
      return;
    }
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
    toast.success("🎉 Your business is now listed!");
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

  const filteredListings = listings.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || l.business_profiles?.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const featuredListings = filteredListings.filter(l => l.is_featured);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Slider images (from admin-managed slides) */}
      {!hideCarousel && <SlideCarousel />}

      {/* Hero with background image */}
      <div className="relative rounded-2xl overflow-hidden p-6 text-white shadow-xl">
        <img loading="lazy" src={directoryHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/90 via-red-600/85 to-pink-700/90" />
        <div className="relative">
          <Store className="h-10 w-10 mb-2.5 drop-shadow-lg" />
          <h2 className="text-2xl font-black drop-shadow tracking-tight">Business Directory</h2>
          <p className="text-xs sm:text-sm opacity-90 max-w-lg">Discover and connect with verified businesses, vendors, and services across Nigeria on GGD Ad Network</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 max-w-md">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-black">{businesses.length}</p>
              <p className="text-[11px] opacity-90 font-medium">Verified Businesses</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-black">{categories.length}</p>
              <p className="text-[11px] opacity-90 font-medium">Active Industries</p>
            </div>
            <div className="hidden sm:block bg-white/20 backdrop-blur rounded-xl p-3 text-center border border-white/20">
              <p className="text-2xl font-black">{listings.length}</p>
              <p className="text-[11px] opacity-90 font-medium">Catalog Items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Industries quick filter chips */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Browse by Industry</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCategory === 'all' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}
            >All Industries</button>
            {categories.map(c => (
              <div key={c.id} className="flex-shrink-0 flex items-center">
                <button onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-l-full text-xs font-bold transition-all ${selectedCategory === c.id ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                  {c.name}
                </button>
                {c.slug && (
                  <button onClick={() => navigate(`/industry/${c.slug}`)}
                    title={`Open ${c.name} page`}
                    className={`px-2 py-1.5 rounded-r-full text-[10px] font-bold border-l ${selectedCategory === c.id ? 'bg-gradient-to-r from-red-500 to-red-600 text-white border-white/30' : 'bg-secondary text-orange-600 border-background hover:bg-secondary/80'}`}>
                    →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Products & Services */}
      {featuredListings.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 grid place-items-center shadow-md">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.6} />
            </div>
            <p className="text-sm font-black">Featured Listings</p>
            <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-0 text-[9px] rounded-full">Sponsored</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {featuredListings.slice(0, 12).map(l => (
              <button key={l.id} onClick={() => navigate(`/product/${l.id}`)}
                className="flex-shrink-0 w-44 text-left rounded-2xl overflow-hidden shadow-lg bg-card border-2 border-amber-400/80 hover:border-orange-500 transition-all active:scale-[0.98]">
                <div className="relative h-28 bg-gradient-to-br from-orange-500 to-red-500">
                  {l.image_url && <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" loading="lazy" />}
                  {l.video_url && <div className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 grid place-items-center"><Play className="h-3 w-3 text-white" fill="white" /></div>}
                  <div className="absolute top-1 left-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Sparkles className="h-2 w-2" /> FEATURED
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-black line-clamp-1">{l.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{l.business_profiles?.business_name}</p>
                  {l.price && <p className="text-xs font-black text-orange-600 mt-1">₦{Number(l.price).toLocaleString()}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subscribe / List Business CTA */}
      {((isBusiness && !isListed) || (!isListed && onRequireAuth)) && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-5 sm:p-6 text-center text-white">
            <Crown className="h-9 w-9 mx-auto mb-2 drop-shadow-lg" />
            <h3 className="font-black text-base sm:text-lg">List Your Business in the Directory</h3>
            <p className="text-xs sm:text-sm opacity-90 max-w-md mx-auto mt-1">
              Join accredited Nigerian businesses reaching thousands of active buyers, promoters, and corporate partners across Nigeria.
            </p>
            <Button 
              onClick={subscribeToDirectory} 
              disabled={subscribing} 
              className="mt-4 bg-white text-orange-600 hover:bg-white/90 font-bold rounded-xl shadow-md h-11 px-6 text-sm"
            >
              {subscribing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
              {onRequireAuth ? 'Register & List Your Business' : `Subscribe ${directoryCost > 0 ? `(${directoryCost} credits/mo)` : '(Free)'}`}
            </Button>
          </div>
        </Card>
      )}

      {isBusiness && isListed && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-2xl p-4 text-center border border-emerald-500/20 shadow-sm">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-2">
            <span className="h-6 w-6 rounded-full bg-emerald-500 text-white grid place-items-center text-xs">✓</span>
            Your business is actively listed in the Directory!
          </p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search businesses by name, keywords, or location..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 h-11 rounded-xl bg-secondary/50 border-0 text-sm" 
            />
          </div>
          {categories.length > 0 && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-11 sm:w-60 rounded-xl bg-secondary/50 border-0 text-sm">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium px-1">
          {filteredListings.length} products & services available · {filtered.length} verified businesses listed
        </p>
      </div>

      {/* All Products & Services (Featured at the Top) */}
      {filteredListings.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center shadow-md">
                <Package className="h-4 w-4 text-white" strokeWidth={2.6} />
              </div>
              <h3 className="text-sm font-black text-foreground">Products & Services Catalog</h3>
              <Badge variant="secondary" className="text-[11px] font-bold">
                {filteredListings.length}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredListings.map(l => (
              <button key={l.id} onClick={() => navigate(`/product/${l.id}`)}
                className="text-left rounded-2xl overflow-hidden shadow-md bg-card border border-border/40 hover:border-orange-500/60 active:scale-[0.97] transition-all flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-400 to-red-500">
                    {l.image_url && <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" loading="lazy" />}
                    {l.video_url && <div className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 grid place-items-center"><Play className="h-3.5 w-3.5 text-white" fill="white" /></div>}
                    <div className="absolute bottom-1.5 left-1.5">
                      <Badge className={`text-[8px] font-bold border-0 rounded-full px-1.5 ${l.listing_type === 'service' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        {l.listing_type === 'service' ? 'Service' : 'Product'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-black line-clamp-1">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{l.business_profiles?.business_name}</p>
                  </div>
                </div>
                <div className="p-2.5 pt-0">
                  {l.price && <p className="text-xs font-black text-orange-600">₦{Number(l.price).toLocaleString()}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verified Businesses Directory (Positioned below products) */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 grid place-items-center shadow-md">
              <Store className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-black text-foreground">Accredited Businesses</h3>
            <Badge variant="secondary" className="text-[11px] font-bold">
              {filtered.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(biz => {
            const bizCategory = categories.find(c => c.id === biz.category_id);
            return (
              <Card 
                key={biz.id} 
                className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between" 
                onClick={() => navigate(`/business/${biz.id}`)}
              >
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 flex items-center gap-3">
                    {biz.logo_url ? (
                      <img loading="lazy" src={biz.logo_url} alt={biz.business_name} className="h-14 w-14 rounded-xl object-cover border-2 border-white/30 shadow-md flex-shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                        <Store className="h-7 w-7 text-white/80" />
                      </div>
                    )}
                    <div className="text-white min-w-0 flex-1">
                      <h3 className="font-black text-sm truncate group-hover:underline">{biz.business_name}</h3>
                      {biz.description && <p className="text-[11px] text-white/85 line-clamp-2 leading-relaxed mt-0.5">{biz.description}</p>}
                      {bizCategory && <Badge className="mt-1.5 bg-white/20 text-white border-0 text-[9px] rounded-full">{bizCategory.name}</Badge>}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {biz.whatsapp_link && (
                      <a
                        href={biz.whatsapp_link.startsWith('http') ? biz.whatsapp_link : `https://wa.me/${biz.whatsapp_link.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge className="text-[10px] gap-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/30 rounded-full cursor-pointer transition">
                          <Phone className="h-3 w-3" />WhatsApp
                        </Badge>
                      </a>
                    )}
                    {biz.website_link && (
                      <a
                        href={biz.website_link.startsWith('http') ? biz.website_link : `https://${biz.website_link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30 rounded-full cursor-pointer transition">
                          <Globe className="h-3 w-3" />Website
                        </Badge>
                      </a>
                    )}
                    {biz.facebook_url && (
                      <a
                        href={biz.facebook_url.startsWith('http') ? biz.facebook_url : `https://${biz.facebook_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge className="text-[10px] gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/30 rounded-full cursor-pointer transition">
                          <Facebook className="h-3 w-3" />Facebook
                        </Badge>
                      </a>
                    )}
                    {biz.instagram_url && (
                      <a
                        href={biz.instagram_url.startsWith('http') ? biz.instagram_url : `https://instagram.com/${biz.instagram_url.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge className="text-[10px] gap-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20 border-pink-500/30 rounded-full cursor-pointer transition">
                          <Instagram className="h-3 w-3" />Instagram
                        </Badge>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Store className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground">No businesses found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or selected category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDirectory;
