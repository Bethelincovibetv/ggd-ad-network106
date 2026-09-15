import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Store, Globe, Phone, Facebook, Instagram, Send, 
  ExternalLink, Crown, Loader2, Eye, Filter, MapPin, Star, 
  Sparkles, Play, Package, Briefcase, Layers, X, ArrowRight, 
  ChevronRight, Grid3X3, ShieldCheck, Tag, Compass, Navigation,
  MapPinned, LocateFixed, Check
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import directoryHero from "@/assets/directory-hero.jpg";
import SlideCarousel from "@/components/SlideCarousel";
import BlazingBadge from "@/components/BlazingBadge";
import { getIndustryMeta, getEffectiveBusinessDescription } from "@/utils/industryData";
import { 
  NIGERIAN_STATES, 
  extractStateFromLocation, 
  detectUserNigerianState, 
  calculateDistanceKm,
  NIGERIAN_STATE_DETAILS
} from "@/utils/nigerianStates";

interface BusinessDirectoryProps {
  isBusiness?: boolean;
  onRequireAuth?: () => void;
  hideCarousel?: boolean;
}

const TOP_COMMERCIAL_STATES = [
  'Lagos',
  'Abuja (FCT)',
  'Rivers',
  'Oyo',
  'Kano',
  'Anambra',
  'Delta',
  'Enugu',
  'Ogun',
  'Edo',
  'Kaduna',
];

const BusinessDirectory = ({ isBusiness, onRequireAuth, hideCarousel = false }: BusinessDirectoryProps) => {
  const navigate = useNavigate();
  const [directoryTab, setDirectoryTab] = useState<'all' | 'products' | 'services' | 'businesses' | 'industries'>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [userDetectedLocation, setUserDetectedLocation] = useState<{
    state: string;
    coords: { latitude: number; longitude: number };
    distanceKm: number;
  } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [directoryCost, setDirectoryCost] = useState(0);
  const [showAllIndustriesGrid, setShowAllIndustriesGrid] = useState(false);

  useEffect(() => { 
    fetchData(); 
    // Check if user previously saved a state preference in localStorage
    const savedState = localStorage.getItem('ggd_user_state');
    if (savedState && NIGERIAN_STATES.includes(savedState)) {
      setSelectedState(savedState);
    }
  }, []);

  const fetchData = async () => {
    const [bizRes, catRes, costRes, listRes] = await Promise.all([
      (supabase.from('business_profiles') as any).select('*').eq('is_directory_listed', true),
      (supabase.from('business_categories') as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('app_settings').select('value').eq('key', 'directory_listing_cost').maybeSingle(),
      (supabase.from('business_listings') as any)
        .select('*, business_profiles!inner(id, business_name, logo_url, category_id, is_directory_listed, address, state, phone_number, whatsapp_link)')
        .eq('is_active', true)
        .eq('business_profiles.is_directory_listed', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100),
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
    const { data } = await (supabase.from('business_profiles') as any).select('is_directory_listed, state, address').eq('user_id', user.id).single();
    if (data?.is_directory_listed) setIsListed(true);
  };

  const handleAutoDetectLocation = async () => {
    setIsDetectingLocation(true);
    toast.loading('Detecting your Nigerian state via GPS...', { id: 'geo-detect' });
    try {
      const loc = await detectUserNigerianState();
      if (loc) {
        setUserDetectedLocation(loc);
        setSelectedState(loc.state);
        localStorage.setItem('ggd_user_state', loc.state);
        toast.success(`📍 Found your location: ${loc.state} State!`, { 
          id: 'geo-detect',
          description: `Filtered businesses and verified stores around ${loc.state}.`
        });
      } else {
        toast.error('Could not determine exact Nigerian state. Please pick from the dropdown.', { id: 'geo-detect' });
      }
    } catch {
      toast.error('Location detection timed out or was declined.', { id: 'geo-detect' });
    } finally {
      setIsDetectingLocation(false);
    }
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

  const getBusinessEffectiveState = (biz: any): string | null => {
    if (biz?.state && biz.state.trim()) return biz.state.trim();
    if (biz?.address) {
      const extracted = extractStateFromLocation(biz.address);
      if (extracted) return extracted;
    }
    return null;
  };

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

  // Business state counts
  const businessCountByState = businesses.reduce((acc: Record<string, number>, b) => {
    const st = getBusinessEffectiveState(b);
    if (st) {
      acc[st] = (acc[st] || 0) + 1;
    }
    return acc;
  }, {});

  const filtered = businesses.filter(b => {
    const q = searchQuery.toLowerCase();
    const bState = getBusinessEffectiveState(b);
    const matchesSearch = !searchQuery || 
      b.business_name?.toLowerCase().includes(q) || 
      b.description?.toLowerCase().includes(q) || 
      b.address?.toLowerCase().includes(q) ||
      (bState && bState.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || b.category_id === selectedCategory;
    
    const matchesState = selectedState === 'all' || (
      bState && (bState.toLowerCase() === selectedState.toLowerCase() || bState.toLowerCase().includes(selectedState.toLowerCase()))
    );

    return matchesSearch && matchesCategory && matchesState;
  });

  const filteredListings = listings.filter(l => {
    const q = searchQuery.toLowerCase();
    const lState = getBusinessEffectiveState(l.business_profiles);
    const matchesSearch = !searchQuery || 
      l.title?.toLowerCase().includes(q) || 
      l.description?.toLowerCase().includes(q) || 
      l.business_profiles?.business_name?.toLowerCase().includes(q) ||
      l.business_profiles?.address?.toLowerCase().includes(q) ||
      (lState && lState.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || l.business_profiles?.category_id === selectedCategory;
    
    const matchesState = selectedState === 'all' || (
      lState && (lState.toLowerCase() === selectedState.toLowerCase() || lState.toLowerCase().includes(selectedState.toLowerCase()))
    );

    return matchesSearch && matchesCategory && matchesState;
  });

  const featuredListings = filteredListings.filter(l => l.is_featured);
  const productListings = filteredListings.filter(l => l.listing_type !== 'service');
  const serviceListings = filteredListings.filter(l => l.listing_type === 'service');

  // Nearby recommended businesses when user has an active state filter or detected location
  const activeNearbyState = selectedState !== 'all' ? selectedState : userDetectedLocation?.state || null;
  const nearbyBusinesses = activeNearbyState 
    ? businesses.filter(b => {
        const st = getBusinessEffectiveState(b);
        return st && (st.toLowerCase() === activeNearbyState.toLowerCase() || st.toLowerCase().includes(activeNearbyState.toLowerCase()));
      })
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Slider images (from admin-managed slides) */}
      {!hideCarousel && <SlideCarousel />}

      {/* Hero with background image */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 text-white shadow-xl">
        <img loading="lazy" src={directoryHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/95 via-red-600/90 to-pink-700/95" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-8 w-8 drop-shadow-md text-amber-200" />
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur">
              Commercial Directory & Hub
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black drop-shadow tracking-tight">
            Nigeria Business Directory & Marketplace
          </h2>
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed mt-1.5 max-w-xl">
            Discover verified companies, order physical products, and hire professional service providers across active industries on GGD Ad Network.
          </p>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mt-5 max-w-md">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black">{businesses.length}</p>
              <p className="text-[10px] sm:text-[11px] opacity-90 font-medium">Verified Stores</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black text-amber-200">{categories.length}</p>
              <p className="text-[10px] sm:text-[11px] opacity-90 font-medium">Industries</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 text-center border border-white/20">
              <p className="text-xl sm:text-2xl font-black text-emerald-200">{listings.length}</p>
              <p className="text-[10px] sm:text-[11px] opacity-90 font-medium">Products & Services</p>
            </div>
          </div>
        </div>
      </div>

      {/* SUPERCHARGED INDUSTRY EXPLORATION HUB */}
      {categories.length > 0 && (
        <div className="space-y-3 p-4 sm:p-5 rounded-3xl bg-card border border-border/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center font-bold">
                <Filter className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-foreground">
                  Browse by Industry & Sector
                </h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                  Select an industry to filter catalog, or tap the arrow to open its dedicated Industry Hub
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllIndustriesGrid(prev => !prev)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 gap-1 rounded-xl h-8"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              {showAllIndustriesGrid ? 'Scroll Mode' : 'View All Grid'}
            </Button>
          </div>

          {/* Quick Filter Bar */}
          {showAllIndustriesGrid ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white border-transparent shadow-md font-bold'
                    : 'bg-secondary/40 border-border/60 hover:border-orange-500/50 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="h-7 w-7 rounded-xl bg-white/20 grid place-items-center">
                    <Store className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] opacity-80 font-black">{listings.length + businesses.length}</span>
                </div>
                <p className="text-xs font-black">All Industries</p>
              </button>

              {categories.map(c => {
                const cMeta = getIndustryMeta(c.slug || c.name);
                const CIcon = cMeta.icon;
                const isSel = selectedCategory === c.id;
                const bizCount = businesses.filter(b => b.category_id === c.id).length;
                const itemCount = listings.filter(l => l.business_profiles?.category_id === c.id).length;

                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between group relative ${
                      isSel
                        ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white border-transparent shadow-md'
                        : 'bg-card border-border/70 hover:border-orange-500/50 hover:shadow-xs text-foreground'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategory(c.id)}
                      className="text-left w-full cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`h-7 w-7 rounded-xl grid place-items-center ${
                          isSel ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600'
                        }`}>
                          <CIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[10px] font-bold opacity-80">
                          {itemCount + bizCount}
                        </span>
                      </div>
                      <p className="text-xs font-black line-clamp-1">{c.name}</p>
                    </button>

                    <div className="pt-2 mt-2 border-t border-current/10 flex items-center justify-between">
                      <span className="text-[9px] opacity-75">
                        {itemCount} items
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/industry/${c.slug || c.id}`);
                        }}
                        title={`Open dedicated ${c.name} Hub`}
                        className={`text-[10px] font-bold flex items-center gap-0.5 hover:underline cursor-pointer ${
                          isSel ? 'text-amber-200' : 'text-orange-600'
                        }`}
                      >
                        Hub →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md'
                    : 'bg-secondary/50 border border-border/60 text-foreground hover:bg-secondary'
                }`}
              >
                <Store className="h-4 w-4" />
                All Industries
                <span className="opacity-80 text-[10px] font-normal">({listings.length + businesses.length})</span>
              </button>

              {categories.map(c => {
                const cMeta = getIndustryMeta(c.slug || c.name);
                const CIcon = cMeta.icon;
                const isSel = selectedCategory === c.id;
                const itemCount = listings.filter(l => l.business_profiles?.category_id === c.id).length;

                return (
                  <div
                    key={c.id}
                    className={`flex-shrink-0 flex items-center rounded-2xl border transition-all ${
                      isSel
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-transparent shadow-md'
                        : 'bg-card border-border/70 text-foreground hover:border-orange-500/50'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategory(c.id)}
                      className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold cursor-pointer"
                    >
                      <span className={`h-6 w-6 rounded-xl grid place-items-center text-xs ${
                        isSel ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600'
                      }`}>
                        <CIcon className="h-3.5 w-3.5" />
                      </span>
                      <span>{c.name}</span>
                      {itemCount > 0 && (
                        <span className="opacity-75 text-[10px]">({itemCount})</span>
                      )}
                    </button>

                    <button
                      onClick={() => navigate(`/industry/${c.slug || c.id}`)}
                      title={`Open dedicated ${c.name} Hub`}
                      className={`px-2.5 py-2.5 border-l text-[10px] font-bold flex items-center gap-0.5 transition-all hover:bg-black/10 rounded-r-2xl cursor-pointer ${
                        isSel ? 'border-white/30 text-amber-200' : 'border-border/60 text-orange-600'
                      }`}
                    >
                      Hub →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Featured Products & Services */}
      {featuredListings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 grid place-items-center shadow-md">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.6} />
            </div>
            <h3 className="text-sm font-black text-foreground">Featured Sponsored Listings</h3>
            <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-0 text-[9px] rounded-full">Sponsored</Badge>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {featuredListings.slice(0, 12).map(l => (
              <button
                key={l.id}
                onClick={() => navigate(`/product/${l.id}`)}
                className="flex-shrink-0 w-48 text-left rounded-2xl overflow-hidden shadow-sm bg-card border-2 border-amber-400/80 hover:border-orange-500 hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="relative h-32 bg-gradient-to-br from-orange-500 to-red-500 overflow-hidden">
                    {l.image_url ? (
                      <img src={l.image_url} alt={l.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70">
                        {l.listing_type === 'service' ? <Briefcase className="h-8 w-8" /> : <Package className="h-8 w-8" />}
                      </div>
                    )}
                    {l.video_url && (
                      <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 grid place-items-center">
                        <Play className="h-3 w-3 text-white" fill="white" />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                      <Sparkles className="h-2 w-2" /> FEATURED
                    </div>
                    <div className="absolute bottom-1.5 left-1.5">
                      <Badge className={`text-[8px] font-bold border-0 rounded-full px-1.5 ${
                        l.listing_type === 'service' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {l.listing_type === 'service' ? '💼 Service' : '📦 Product'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-black line-clamp-1">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-medium">{l.business_profiles?.business_name}</p>
                  </div>
                </div>
                <div className="p-3 pt-0 flex items-center justify-between">
                  {l.price ? (
                    <p className="text-xs font-black text-orange-600">₦{Number(l.price).toLocaleString()}</p>
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground">Inquiry</span>
                  )}
                  <span className="text-[10px] font-bold text-orange-500">View Offer →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subscribe / List Business CTA */}
      {((isBusiness && !isListed) || (!isListed && onRequireAuth)) && (
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 text-center text-white">
            <Crown className="h-9 w-9 mx-auto mb-2 drop-shadow-lg text-amber-200" />
            <h3 className="font-black text-base sm:text-lg">List Your Business in the Directory</h3>
            <p className="text-xs sm:text-sm opacity-90 max-w-md mx-auto mt-1">
              Join accredited Nigerian businesses reaching thousands of active buyers, promoters, and corporate partners across Nigeria.
            </p>
            <Button 
              onClick={subscribeToDirectory} 
              disabled={subscribing} 
              className="mt-4 bg-white text-orange-600 hover:bg-white/90 font-bold rounded-2xl shadow-md h-11 px-6 text-sm cursor-pointer"
            >
              {subscribing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
              {onRequireAuth ? 'Register & List Your Business' : `Subscribe ${directoryCost > 0 ? `(${directoryCost} credits/mo)` : '(Free)'}`}
            </Button>
          </div>
        </Card>
      )}

      {isBusiness && isListed && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-2xl p-4 text-center border border-emerald-500/20 shadow-xs">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Your business is actively verified and listed in the Directory!
          </p>
        </div>
      )}

      {/* Search & Active Category / State Filters */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products, services, or businesses across Nigeria..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 h-12 rounded-2xl bg-card border border-border/80 text-sm shadow-xs" 
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Nigerian State Selector Dropdown */}
          <div className="flex items-center gap-2">
            <Select value={selectedState} onValueChange={(val) => {
              setSelectedState(val);
              if (val !== 'all') {
                localStorage.setItem('ggd_user_state', val);
              }
            }}>
              <SelectTrigger className="h-12 w-full md:w-56 rounded-2xl bg-card border border-border/80 text-sm shadow-xs">
                <MapPin className="h-4 w-4 mr-1.5 text-rose-500 shrink-0" />
                <SelectValue placeholder="All States (Nigeria)" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72">
                <SelectItem value="all">
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-semibold">🇳🇬 All 36 States + FCT</span>
                    <span className="text-[10px] text-muted-foreground">({businesses.length})</span>
                  </div>
                </SelectItem>
                {NIGERIAN_STATES.map(st => {
                  const count = businessCountByState[st] || 0;
                  return (
                    <SelectItem key={st} value={st}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{st} State</span>
                        {count > 0 && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded-full">
                            {count}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* GPS Auto-Detect Near Me Button */}
            <Button
              type="button"
              variant={userDetectedLocation?.state === selectedState ? "default" : "outline"}
              onClick={handleAutoDetectLocation}
              disabled={isDetectingLocation}
              title="Detect my state via GPS"
              className={`h-12 px-3.5 rounded-2xl text-xs font-bold gap-1.5 shrink-0 transition-all ${
                userDetectedLocation?.state === selectedState 
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm' 
                  : 'border-rose-300 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              {isDetectingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Compass className="h-4 w-4 text-rose-500" />
              )}
              <span className="hidden sm:inline">Near Me</span>
            </Button>
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-12 md:w-56 rounded-2xl bg-card border border-border/80 text-sm shadow-xs">
                <Filter className="h-4 w-4 mr-1.5 text-orange-500 shrink-0" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72">
                <SelectItem value="all">All Industries ({listings.length + businesses.length})</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Quick State Filter Chips for Nigeria Commercial Hubs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap mr-1 flex items-center gap-1">
            <MapPinned className="h-3 w-3 text-rose-500" /> State Hubs:
          </span>
          <button
            onClick={() => setSelectedState('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
              selectedState === 'all'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All Nigeria
          </button>
          {TOP_COMMERCIAL_STATES.map(st => {
            const count = businessCountByState[st] || 0;
            const isSel = selectedState === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setSelectedState(st);
                  localStorage.setItem('ggd_user_state', st);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all whitespace-nowrap flex items-center gap-1 ${
                  isSel
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xs'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{st}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? 'bg-white/25 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Filter Pills */}
        {(selectedCategory !== 'all' || selectedState !== 'all' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
            <span className="text-xs text-muted-foreground font-semibold">Active Filter:</span>
            
            {selectedState !== 'all' && (
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl px-2.5 py-1 text-xs gap-1">
                <MapPin className="h-3 w-3" /> State: {selectedState}
                <button
                  onClick={() => setSelectedState('all')}
                  className="hover:text-red-600 ml-1 cursor-pointer"
                  title="Clear State Filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {selectedCategory !== 'all' && activeCategoryObj && (
              <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/30 rounded-xl px-2.5 py-1 text-xs gap-1">
                Industry: {activeCategoryObj.name}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-red-600 ml-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {searchQuery && (
              <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-border rounded-xl px-2.5 py-1 text-xs gap-1">
                Query: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-600 ml-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {activeCategoryObj && (
              <button
                onClick={() => navigate(`/industry/${activeCategoryObj.slug || activeCategoryObj.id}`)}
                className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-0.5 ml-auto"
              >
                Open {activeCategoryObj.name} Industry Hub <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* RECOMMENDED BUSINESSES NEAR YOU (GEOGRAPHIC RECOMMENDATION BANNER) */}
      {activeNearbyState && nearbyBusinesses.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-orange-500/10 border border-rose-500/25 p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center text-white shadow-xs">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-foreground">
                    Recommended Businesses Near You in {activeNearbyState} State
                  </h3>
                  <Badge className="bg-rose-500 text-white text-[9px] font-black rounded-full px-2 py-0.5">
                    LOCAL STORES
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified commercial enterprises, fast delivery, and local service providers in your state.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedState(activeNearbyState);
                setDirectoryTab('businesses');
              }}
              className="text-xs font-bold rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 self-start sm:self-auto h-8"
            >
              View All in {activeNearbyState} ({nearbyBusinesses.length}) →
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nearbyBusinesses.slice(0, 3).map(biz => {
              const bizCat = categories.find(c => c.id === biz.category_id);
              const bState = getBusinessEffectiveState(biz);
              return (
                <div
                  key={`nearby-${biz.id}`}
                  onClick={() => navigate(`/business/${biz.id}`)}
                  className="p-3.5 rounded-2xl bg-card border border-rose-500/20 hover:border-rose-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3 group"
                >
                  {biz.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={biz.business_name}
                      className="h-12 w-12 rounded-xl object-cover border border-border/60 shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shrink-0">
                      <Store className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h4 className="font-black text-xs text-foreground truncate group-hover:text-rose-600 transition-colors">
                        {biz.business_name}
                      </h4>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {bizCat?.name || 'Accredited Business'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[9px] font-bold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/40 px-1.5 py-0 rounded-md gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {bState || activeNearbyState}
                      </Badge>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Directory Segment Controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button
          size="sm"
          variant={directoryTab === 'all' ? 'default' : 'outline'}
          onClick={() => setDirectoryTab('all')}
          className={`rounded-full h-10 px-4 text-xs font-bold gap-1.5 transition-all cursor-pointer ${
            directoryTab === 'all'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm'
              : 'hover:border-orange-500/50'
          }`}
        >
          <Layers className="h-4 w-4" />
          All Catalog Items
          <span className="ml-1 opacity-80 text-[10px]">({filteredListings.length + filtered.length})</span>
        </Button>

        <Button
          size="sm"
          variant={directoryTab === 'products' ? 'default' : 'outline'}
          onClick={() => setDirectoryTab('products')}
          className={`rounded-full h-10 px-4 text-xs font-bold gap-1.5 transition-all cursor-pointer ${
            directoryTab === 'products'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
              : 'hover:border-emerald-500/50'
          }`}
        >
          <Package className="h-4 w-4" />
          Products Catalog
          <span className="ml-1 opacity-80 text-[10px]">({productListings.length})</span>
        </Button>

        <Button
          size="sm"
          variant={directoryTab === 'services' ? 'default' : 'outline'}
          onClick={() => setDirectoryTab('services')}
          className={`rounded-full h-10 px-4 text-xs font-bold gap-1.5 transition-all cursor-pointer ${
            directoryTab === 'services'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
              : 'hover:border-blue-500/50'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Services & Solutions
          <span className="ml-1 opacity-80 text-[10px]">({serviceListings.length})</span>
        </Button>

        <Button
          size="sm"
          variant={directoryTab === 'businesses' ? 'default' : 'outline'}
          onClick={() => setDirectoryTab('businesses')}
          className={`rounded-full h-10 px-4 text-xs font-bold gap-1.5 transition-all cursor-pointer ${
            directoryTab === 'businesses'
              ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-sm'
              : 'hover:border-red-500/50'
          }`}
        >
          <Store className="h-4 w-4" />
          Accredited Businesses
          <span className="ml-1 opacity-80 text-[10px]">({filtered.length})</span>
        </Button>
      </div>

      {/* PRODUCTS & SERVICES CATALOG */}
      {(directoryTab === 'all' || directoryTab === 'products' || directoryTab === 'services') && (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-xl grid place-items-center shadow-xs ${
                directoryTab === 'services'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                  : directoryTab === 'products'
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
                  : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
              }`}>
                {directoryTab === 'services' ? <Briefcase className="h-4 w-4" /> : <Package className="h-4 w-4" />}
              </div>
              <h3 className="text-sm font-black text-foreground">
                {directoryTab === 'services' ? 'Services Directory' : directoryTab === 'products' ? 'Products Catalog' : 'Products & Services Marketplace'}
              </h3>
              <Badge variant="secondary" className="text-[11px] font-bold">
                {directoryTab === 'services' ? serviceListings.length : directoryTab === 'products' ? productListings.length : filteredListings.length}
              </Badge>
            </div>
          </div>

          {(() => {
            const listToShow = directoryTab === 'services'
              ? serviceListings
              : directoryTab === 'products'
              ? productListings
              : filteredListings;

            if (listToShow.length === 0) {
              return (
                <div className="rounded-3xl border border-dashed border-border/80 p-8 text-center bg-card/40">
                  <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">
                    {directoryTab === 'services' ? 'No services found in this filter' : 'No products found in this filter'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Try selecting another industry or clearing the search query</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {listToShow.map(l => {
                  const catObj = categories.find(c => c.id === l.business_profiles?.category_id);
                  const isSrv = l.listing_type === 'service';

                  return (
                    <div
                      key={l.id}
                      className="rounded-3xl overflow-hidden shadow-xs bg-card border border-border/80 hover:border-orange-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                    >
                      <button
                        onClick={() => navigate(`/product/${l.id}`)}
                        className="text-left w-full cursor-pointer"
                      >
                        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                          {l.image_url ? (
                            <img
                              src={l.image_url}
                              alt={l.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white/60">
                              {isSrv ? <Briefcase className="h-8 w-8" /> : <Package className="h-8 w-8" />}
                            </div>
                          )}
                          {l.is_featured && (
                            <div className="absolute top-2 left-2 z-10">
                              <BlazingBadge label="FEATURED" size="sm" />
                            </div>
                          )}
                          {l.video_url && (
                            <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 grid place-items-center z-10">
                              <Play className="h-3.5 w-3.5 text-white" fill="white" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 z-10">
                            <Badge className={`text-[8px] font-bold border-0 rounded-full px-2 py-0.5 shadow-sm ${
                              isSrv ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                              {isSrv ? '💼 Service' : '📦 Product'}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-3 space-y-1">
                          <p className="text-xs font-black line-clamp-1 group-hover:text-orange-500 transition-colors">
                            {l.title}
                          </p>
                          <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                            <span className="line-clamp-1 font-medium">{l.business_profiles?.business_name || 'Accredited Business'}</span>
                            {getBusinessEffectiveState(l.business_profiles) && (
                              <span className="shrink-0 flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold text-[9px]">
                                <MapPin className="h-2.5 w-2.5" />
                                {getBusinessEffectiveState(l.business_profiles)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Card Footer with Category Tag and Details Button */}
                      <div className="p-3 pt-0 space-y-2">
                        {catObj && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/industry/${catObj.slug || catObj.id}`);
                            }}
                            className="text-[9px] font-bold text-muted-foreground hover:text-orange-600 flex items-center gap-1 cursor-pointer truncate"
                          >
                            <Tag className="h-2.5 w-2.5 text-orange-500" />
                            {catObj.name}
                          </button>
                        )}

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                          {l.price ? (
                            <p className="text-xs font-black text-orange-600">
                              ₦{Number(l.price).toLocaleString()}
                            </p>
                          ) : (
                            <span className="text-[10px] font-semibold text-muted-foreground">Inquiry</span>
                          )}

                          <button
                            onClick={() => navigate(`/product/${l.id}`)}
                            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
                          >
                            View →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ACCREDITED BUSINESSES SECTION */}
      {(directoryTab === 'all' || directoryTab === 'businesses') && (
        <div className={`space-y-3 ${directoryTab === 'all' ? 'pt-6 border-t border-border/60' : 'pt-1'}`}>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 grid place-items-center shadow-xs text-white">
                <Store className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-foreground">Accredited Businesses & Stores</h3>
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
                  className="border border-border/80 shadow-xs rounded-3xl overflow-hidden hover:shadow-lg hover:border-orange-500/60 transition-all cursor-pointer group flex flex-col justify-between" 
                  onClick={() => navigate(`/business/${biz.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 p-4 flex items-center gap-3.5 text-white">
                      {biz.logo_url ? (
                        <img
                          loading="lazy"
                          src={biz.logo_url}
                          alt={biz.business_name}
                          className="h-14 w-14 rounded-2xl object-cover border-2 border-white/40 shadow-sm bg-white flex-shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 border border-white/30">
                          <Store className="h-7 w-7 text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm truncate group-hover:underline">{biz.business_name}</h3>
                          <ShieldCheck className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                        </div>
                        <p className="text-[11px] text-white/85 line-clamp-2 leading-relaxed mt-0.5">
                          {getEffectiveBusinessDescription(biz.description, biz.business_name, bizCategory?.name || biz.category_id)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {bizCategory && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/industry/${bizCategory.slug || bizCategory.id}`);
                              }}
                              className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white border-0 text-[9px] font-bold rounded-full px-2 py-0.5 cursor-pointer backdrop-blur"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {bizCategory.name}
                            </button>
                          )}
                          {getBusinessEffectiveState(biz) && (
                            <span className="inline-flex items-center gap-1 bg-black/25 text-white/95 text-[9px] font-bold rounded-full px-2 py-0.5 backdrop-blur">
                              <MapPin className="h-2.5 w-2.5 text-amber-300" />
                              {getBusinessEffectiveState(biz)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    <div className="p-3.5 flex flex-wrap items-center justify-between gap-1.5 bg-card border-t border-border/40">
                      <div className="flex flex-wrap gap-1.5">
                        {biz.whatsapp_link && (
                          <a
                            href={biz.whatsapp_link.startsWith('http') ? biz.whatsapp_link : `https://wa.me/${biz.whatsapp_link.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge className="text-[10px] gap-1 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-500/30 rounded-xl cursor-pointer transition">
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
                            <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30 rounded-xl cursor-pointer transition">
                              <Globe className="h-3 w-3" />Website
                            </Badge>
                          </a>
                        )}
                      </div>

                      <span className="text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Store <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 rounded-3xl bg-card border border-dashed border-border p-8 space-y-3">
                <Store className="h-10 w-10 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-sm font-semibold text-foreground">
                  No businesses found matching this filter
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {selectedState !== 'all' 
                    ? `There are currently no listed businesses in ${selectedState} State matching your criteria.`
                    : 'Try adjusting your search query or selected industry to view more Nigerian businesses.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {selectedState !== 'all' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setSelectedState('all')}
                      className="rounded-xl text-xs font-bold"
                    >
                      Show All States (Nigeria)
                    </Button>
                  )}
                  {searchQuery && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSearchQuery('')}
                      className="rounded-xl text-xs"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDirectory;
