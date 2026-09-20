import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Loader2, Store, Search, MapPin, Package, 
  Briefcase, Sparkles, Layers, ChevronRight, MessageCircle, 
  Globe, Phone, ExternalLink, Play, ArrowRight, ShieldCheck,
  Compass, MapPinned, X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import AdDisplayPreview from '@/components/AdDisplayPreview';
import MetaTags from '@/components/MetaTags';
import BlazingBadge from '@/components/BlazingBadge';
import { getIndustryMeta, getEffectiveBusinessDescription } from '@/utils/industryData';
import { 
  NIGERIAN_STATES, 
  TOP_COMMERCIAL_STATES, 
  detectUserNigerianState, 
  extractStateFromLocation 
} from '@/utils/nigerianStates';
import { toast } from 'sonner';

const IndustryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [selectedState, setSelectedState] = useState<string>(() => {
    return localStorage.getItem('ggd_user_state') || 'all';
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [userDetectedState, setUserDetectedState] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'products' | 'services' | 'businesses'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetchIndustryData();
  }, [slug]);

  const handleAutoDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const detected = await detectUserNigerianState();
      if (detected.state) {
        setSelectedState(detected.state);
        setUserDetectedState(detected.state);
        localStorage.setItem('ggd_user_state', detected.state);
        toast.success(`Location detected: ${detected.state} State, Nigeria`);
      } else {
        toast.info(detected.formattedAddress || 'Could not precisely identify Nigerian state. Please select from the dropdown.');
      }
    } catch (err: any) {
      toast.error('Could not access GPS. Please choose your Nigerian state.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const getBusinessEffectiveState = (biz: any): string | null => {
    if (!biz) return null;
    if (biz.state && biz.state !== 'all') return biz.state;
    return extractStateFromLocation(biz.address || biz.location || '');
  };

  const fetchIndustryData = async () => {
    setLoading(true);
    try {
      // Fetch current category by slug or id
      const { data: catRes } = await (supabase.from('business_categories') as any)
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .maybeSingle();

      const { data: allCats } = await (supabase.from('business_categories') as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setAllCategories(allCats || []);

      let activeCategory = catRes;
      if (!activeCategory && allCats?.length) {
        activeCategory = allCats.find((c: any) => c.slug === slug || c.name.toLowerCase() === slug?.toLowerCase());
      }

      setCategory(activeCategory);

      if (activeCategory) {
        // Fetch businesses in this category
        const { data: bizData } = await (supabase.from('business_profiles') as any)
          .select('*')
          .eq('category_id', activeCategory.id);

        const loadedBusinesses = (bizData || []).filter((b: any) => b.is_directory_listed !== false);
        setBusinesses(loadedBusinesses);

        const bizMap = new Map<string, any>();
        loadedBusinesses.forEach((b: any) => {
          if (b.id) bizMap.set(b.id, b);
          if (b.user_id) bizMap.set(b.user_id, b);
        });

        // Fetch products and services from these businesses
        let dbListings: any[] = [];
        if (loadedBusinesses.length > 0) {
          const bizIds = loadedBusinesses.map((b: any) => b.id);
          const { data: listData } = await (supabase.from('business_listings') as any)
            .select('*')
            .in('business_profile_id', bizIds)
            .order('created_at', { ascending: false });

          dbListings = (listData || [])
            .map((l: any) => ({
              ...l,
              business_profiles: l.business_profiles || bizMap.get(l.business_profile_id) || (l.user_id ? bizMap.get(l.user_id) : null) || null,
            }))
            .filter((l: any) => l.is_active !== false);
        }

        setListings(dbListings);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error('Error fetching industry data:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate('/');

  const meta = getIndustryMeta(category?.slug || category?.name || slug || '');
  const IndustryIcon = meta.icon;

  const filteredBusinesses = businesses.filter(b => {
    // State Filter
    if (selectedState !== 'all') {
      const bState = getBusinessEffectiveState(b);
      if (bState && bState.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }
    }
    // Query Search
    if (!q) return true;
    const query = q.toLowerCase();
    return (
      b.business_name?.toLowerCase().includes(query) || 
      b.description?.toLowerCase().includes(query) ||
      b.address?.toLowerCase().includes(query)
    );
  });

  const filteredListings = listings.filter(l => {
    // State Filter
    if (selectedState !== 'all') {
      const bState = getBusinessEffectiveState(l.business_profiles);
      if (bState && bState.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }
    }
    // Query Search
    if (!q) return true;
    const query = q.toLowerCase();
    return (
      l.title?.toLowerCase().includes(query) || 
      l.description?.toLowerCase().includes(query) ||
      l.business_profiles?.business_name?.toLowerCase().includes(query)
    );
  });

  const products = filteredListings.filter(l => l.listing_type !== 'service');
  const services = filteredListings.filter(l => l.listing_type === 'service');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-9 w-9 animate-spin text-orange-500 mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading Industry Directory...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <Store className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-black text-foreground">Industry Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm">The category you requested could not be found or has not been activated yet.</p>
        <div className="flex gap-2">
          <Button onClick={goBack} variant="outline" className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>
          <Button onClick={() => navigate('/?tab=directory')} className="rounded-xl bg-orange-600 text-white hover:bg-orange-700">Explore Directory</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/40 dark:from-background dark:via-background dark:to-background pb-16">
      <MetaTags
        title={`${category.name} Industry Directory, Products & Services — GGD Ad Network`}
        description={category.description || meta.fallbackDesc || `Discover verified ${category.name} businesses, products, and services across Nigeria on GGD Ad Network.`}
        imageUrl={category.banner_url}
        badge={category.name}
        keywords={[category.name, `${category.name} products`, `${category.name} services`, 'Nigerian business directory', 'GGD stores']}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${category.name} Industry Directory`,
          description: category.description || meta.fallbackDesc,
          about: {
            '@type': 'Thing',
            name: category.name,
          }
        }}
      />

      {/* Sticky Top Nav */}
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50 shadow-xs">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5 rounded-xl text-xs font-bold">
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <div className="h-4 w-[1px] bg-border hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Link to="/?tab=directory" className="hover:text-foreground font-semibold">Directory</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-bold truncate">{category.name}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/?tab=directory')}
            variant="outline"
            className="rounded-xl text-xs font-bold gap-1 hidden sm:flex"
          >
            <Store className="h-3.5 w-3.5 text-orange-500" />
            All Industries
          </Button>
        </div>
      </header>

      {/* Hero Banner with Rich Industry Header */}
      <div className="relative overflow-hidden bg-slate-900 text-white">
        {category.banner_url ? (
          <img loading="lazy" src={category.banner_url} alt={category.name} className="absolute inset-0 w-full h-full object-cover opacity-35" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-90`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        
        <div className="relative container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur grid place-items-center shadow-lg border border-white/30 text-white">
                  <IndustryIcon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur">
                  Official Industry Hub
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                {category.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed drop-shadow">
                {category.description || meta.fallbackDesc}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-center min-w-[280px]">
              <div>
                <p className="text-xl sm:text-2xl font-black text-white">{businesses.length}</p>
                <p className="text-[10px] text-slate-300 font-medium">Businesses</p>
              </div>
              <div className="border-x border-white/20 px-2">
                <p className="text-xl sm:text-2xl font-black text-emerald-300">{listings.filter(l => l.listing_type !== 'service').length}</p>
                <p className="text-[10px] text-slate-300 font-medium">Products</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-blue-300">{listings.filter(l => l.listing_type === 'service').length}</p>
                <p className="text-[10px] text-slate-300 font-medium">Services</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Search & State Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search products, services & businesses in ${category.name}...`}
                value={q}
                onChange={e => setQ(e.target.value)}
                className="pl-10 h-11 rounded-2xl bg-card border border-border/80 shadow-xs text-sm"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold">
                  Clear
                </button>
              )}
            </div>

            {/* State Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Select value={selectedState} onValueChange={(val) => {
                setSelectedState(val);
                if (val !== 'all') {
                  localStorage.setItem('ggd_user_state', val);
                }
              }}>
                <SelectTrigger className="h-11 w-full sm:w-52 rounded-2xl bg-card border border-border/80 text-xs shadow-xs">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-rose-500 shrink-0" />
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-72">
                  <SelectItem value="all">🇳🇬 All 36 States + FCT</SelectItem>
                  {NIGERIAN_STATES.map(st => (
                    <SelectItem key={st} value={st}>
                      {st} State
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* GPS Auto-Detect */}
              <Button
                type="button"
                variant={userDetectedState === selectedState ? "default" : "outline"}
                onClick={handleAutoDetectLocation}
                disabled={isDetectingLocation}
                title="Filter by my state using GPS"
                className={`h-11 px-3 rounded-2xl text-xs font-bold gap-1.5 shrink-0 ${
                  userDetectedState === selectedState
                    ? 'bg-rose-600 text-white'
                    : 'border-rose-300 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                {isDetectingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Compass className="h-3.5 w-3.5 text-rose-500" />}
                <span className="hidden sm:inline">Near Me</span>
              </Button>
            </div>
          </div>

          {/* Quick State Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap mr-1 flex items-center gap-1">
              <MapPinned className="h-3 w-3 text-rose-500" /> Filter State:
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
              const isSel = selectedState === st;
              return (
                <button
                  key={st}
                  onClick={() => {
                    setSelectedState(st);
                    localStorage.setItem('ggd_user_state', st);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                    isSel
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Active Filter Pills */}
          {(selectedState !== 'all' || q) && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs text-muted-foreground font-semibold">Active Filter:</span>
              {selectedState !== 'all' && (
                <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl px-2.5 py-1 text-xs gap-1">
                  <MapPin className="h-3 w-3" /> State: {selectedState}
                  <button
                    onClick={() => setSelectedState('all')}
                    className="hover:text-red-600 ml-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {q && (
                <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-border rounded-xl px-2.5 py-1 text-xs gap-1">
                  Query: "{q}"
                  <button
                    onClick={() => setQ('')}
                    className="hover:text-red-600 ml-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Industry View Tab Segment Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button
            size="sm"
            variant={tab === 'all' ? 'default' : 'outline'}
            onClick={() => setTab('all')}
            className={`rounded-full h-9 px-4 text-xs font-bold gap-1.5 transition-all ${
              tab === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xs'
                : 'hover:border-orange-500/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            All in {category.name}
            <span className="ml-1 opacity-80 text-[10px]">({filteredListings.length + filteredBusinesses.length})</span>
          </Button>

          <Button
            size="sm"
            variant={tab === 'products' ? 'default' : 'outline'}
            onClick={() => setTab('products')}
            className={`rounded-full h-9 px-4 text-xs font-bold gap-1.5 transition-all ${
              tab === 'products'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                : 'hover:border-emerald-500/50'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Products
            <span className="ml-1 opacity-80 text-[10px]">({products.length})</span>
          </Button>

          <Button
            size="sm"
            variant={tab === 'services' ? 'default' : 'outline'}
            onClick={() => setTab('services')}
            className={`rounded-full h-9 px-4 text-xs font-bold gap-1.5 transition-all ${
              tab === 'services'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                : 'hover:border-blue-500/50'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Services
            <span className="ml-1 opacity-80 text-[10px]">({services.length})</span>
          </Button>

          <Button
            size="sm"
            variant={tab === 'businesses' ? 'default' : 'outline'}
            onClick={() => setTab('businesses')}
            className={`rounded-full h-9 px-4 text-xs font-bold gap-1.5 transition-all ${
              tab === 'businesses'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-xs'
                : 'hover:border-red-500/50'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Businesses
            <span className="ml-1 opacity-80 text-[10px]">({filteredBusinesses.length})</span>
          </Button>
        </div>

        {/* PRODUCTS SECTION */}
        {(tab === 'all' || tab === 'products') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white grid place-items-center text-xs">
                  <Package className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-sm font-black text-foreground">
                  {category.name} Products Catalog
                </h2>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {products.length}
                </Badge>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
                <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">No products currently cataloged in {category.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Check back soon as merchants update their stock.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {products.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/product/${item.id}`)}
                    className="text-left rounded-2xl overflow-hidden shadow-xs bg-card border border-border/60 hover:border-emerald-500 hover:shadow-md active:scale-[0.98] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                            <Package className="h-8 w-8 opacity-60" />
                          </div>
                        )}
                        {item.is_featured && (
                          <div className="absolute top-1.5 left-1.5 z-10">
                            <BlazingBadge label="FEATURED" size="sm" />
                          </div>
                        )}
                        {item.video_url && (
                          <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 grid place-items-center z-10">
                            <Play className="h-3 w-3 text-white" fill="white" />
                          </div>
                        )}
                        <div className="absolute bottom-1.5 left-1.5 z-10">
                          <Badge className="bg-emerald-600 text-white text-[8px] font-bold border-0 rounded-full px-1.5 shadow-sm">
                            📦 Product
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-black line-clamp-1 group-hover:text-emerald-600 transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <span className="line-clamp-1">{item.business_profiles?.business_name || 'Accredited Merchant'}</span>
                          {getBusinessEffectiveState(item.business_profiles) && (
                            <span className="shrink-0 flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold text-[9px]">
                              <MapPin className="h-2.5 w-2.5" />
                              {getBusinessEffectiveState(item.business_profiles)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 pt-0 flex items-center justify-between">
                      {item.price ? (
                        <p className="text-xs font-black text-emerald-600">
                          ₦{Number(item.price).toLocaleString()}
                        </p>
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">Contact for Rate</span>
                      )}
                      <span className="text-[10px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                        Details →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SERVICES SECTION */}
        {(tab === 'all' || tab === 'services') && (
          <div className={`space-y-3 ${tab === 'all' ? 'pt-4 border-t border-border/40' : ''}`}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-600 text-white grid place-items-center text-xs">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-sm font-black text-foreground">
                  {category.name} Professional Services & Capabilities
                </h2>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {services.length}
                </Badge>
              </div>
            </div>

            {services.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
                <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">No services currently listed in {category.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Service providers will appear here once listed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {services.map(srv => (
                  <button
                    key={srv.id}
                    onClick={() => navigate(`/product/${srv.id}`)}
                    className="text-left rounded-2xl overflow-hidden shadow-xs bg-card border border-border/60 hover:border-blue-500 hover:shadow-md active:scale-[0.98] transition-all p-4 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-600 text-white text-[9px] font-bold border-0 rounded-full px-2 py-0.5">
                          💼 Professional Service
                        </Badge>
                        {srv.is_featured && <BlazingBadge label="FEATURED" size="sm" />}
                      </div>

                      <h3 className="font-black text-sm text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                        {srv.title}
                      </h3>

                      {srv.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {srv.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 truncate">
                          <Store className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span className="truncate">{srv.business_profiles?.business_name || 'Verified Agency'}</span>
                        </div>
                        {getBusinessEffectiveState(srv.business_profiles) && (
                          <span className="shrink-0 flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-semibold text-[9px] bg-rose-500/10 px-1.5 py-0.5 rounded-md">
                            <MapPin className="h-2.5 w-2.5" />
                            {getBusinessEffectiveState(srv.business_profiles)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between">
                      {srv.price ? (
                        <p className="text-xs font-black text-blue-600">
                          Starting at ₦{Number(srv.price).toLocaleString()}
                        </p>
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground">Custom Quote Available</span>
                      )}
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Inquire <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BUSINESSES SECTION */}
        {(tab === 'all' || tab === 'businesses') && (
          <div className={`space-y-3 ${tab === 'all' ? 'pt-4 border-t border-border/40' : ''}`}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white grid place-items-center text-xs">
                  <Store className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-sm font-black text-foreground">
                  Verified Businesses & Providers in {category.name}
                </h2>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {filteredBusinesses.length}
                </Badge>
              </div>
            </div>

            {filteredBusinesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
                <Store className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">No businesses found matching your filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredBusinesses.map(biz => (
                  <Card
                    key={biz.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] border-border/60 rounded-2xl group"
                    onClick={() => navigate(`/business/${biz.id}`)}
                  >
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 p-4 flex items-center gap-3.5 text-white">
                        {biz.logo_url ? (
                          <img
                            loading="lazy"
                            src={biz.logo_url}
                            alt={biz.business_name}
                            className="h-14 w-14 rounded-2xl object-cover border-2 border-white/40 shadow-sm bg-white"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                            <Store className="h-7 w-7 text-white" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-sm truncate">{biz.business_name}</h3>
                            <ShieldCheck className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                          </div>
                          <p className="text-[11px] text-white/85 line-clamp-2 mt-0.5 leading-relaxed">
                            {getEffectiveBusinessDescription(biz.description, biz.business_name, category?.name || category?.slug)}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {getBusinessEffectiveState(biz) && (
                              <span className="inline-flex items-center gap-1 bg-black/25 text-white/95 text-[9px] font-bold rounded-full px-2 py-0.5 backdrop-blur">
                                <MapPin className="h-2.5 w-2.5 text-amber-300" />
                                {getBusinessEffectiveState(biz)}
                              </span>
                            )}
                            {biz.address && (
                              <p className="text-[10px] text-white/75 flex items-center gap-1 truncate max-w-[200px]">
                                {biz.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 bg-card flex items-center justify-between gap-2 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          {biz.phone_number && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs text-muted-foreground rounded-xl gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://wa.me/${biz.phone_number.replace(/[^\d]/g, '')}`, '_blank');
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                              WhatsApp
                            </Button>
                          )}
                          {biz.website && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs text-muted-foreground rounded-xl gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(biz.website.startsWith('http') ? biz.website : `https://${biz.website}`, '_blank');
                              }}
                            >
                              <Globe className="h-3.5 w-3.5 text-blue-500" />
                              Website
                            </Button>
                          )}
                        </div>

                        <span className="text-xs font-bold text-orange-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Visit Store <ExternalLink className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BROWSE OTHER INDUSTRIES SELECTOR */}
        {allCategories.length > 1 && (
          <div className="pt-8 border-t border-border/60 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                Explore Other Industry Hubs
              </h3>
              <Link to="/?tab=directory" className="text-xs font-bold text-orange-600 hover:underline">
                View All Industries →
              </Link>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {allCategories
                .filter(c => c.id !== category.id && c.slug !== category.slug)
                .map(c => {
                  const cMeta = getIndustryMeta(c.slug || c.name);
                  const CIcon = cMeta.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/industry/${c.slug || c.id}`)}
                      className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-card border border-border/80 hover:border-orange-500 hover:shadow-sm text-xs font-bold text-foreground transition-all cursor-pointer"
                    >
                      <span className="h-6 w-6 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center">
                        <CIcon className="h-3.5 w-3.5" />
                      </span>
                      {c.name}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Sponsored Rotator */}
        <div className="pt-4">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mb-2 font-bold">
            Sponsored Partner Adverts
          </p>
          <AdDisplayPreview />
        </div>
      </main>
    </div>
  );
};

export default IndustryPage;
