import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Store, Globe, Phone, Loader2, Eye, Filter, MapPin,
  Sparkles, Play, Package, Briefcase, Layers, X, ArrowRight,
  ChevronRight, Grid3X3, ShieldCheck, Compass, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import directoryHero from "@/assets/directory-hero.jpg";
import SlideCarousel from "@/components/SlideCarousel";
import BlazingBadge from "@/components/BlazingBadge";
import { getIndustryMeta, getEffectiveBusinessDescription } from "@/utils/industryData";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import {
  NIGERIAN_STATES,
  extractStateFromLocation,
  detectUserNigerianState,
} from "@/utils/nigerianStates";
import { subscribeToAllVerifications } from "@/services/businessVerificationEngine";
import { VerificationSubmissionRecord } from "@/types/verification";
import { buildWhatsAppLink } from "@/lib/whatsapp";

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

const BusinessDirectory = ({ hideCarousel = false }: BusinessDirectoryProps) => {
  const navigate = useNavigate();
  const [directoryTab, setDirectoryTab] = useState<'all' | 'products' | 'services' | 'businesses'>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [verificationsMap, setVerificationsMap] = useState<Map<string, VerificationSubmissionRecord>>(new Map());
  const [onlyVerified, setOnlyVerified] = useState(false);
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
  const [showIndustriesPanel, setShowIndustriesPanel] = useState(false);

  useEffect(() => {
    fetchData();
    const savedState = localStorage.getItem('ggd_user_state');
    if (savedState && NIGERIAN_STATES.includes(savedState)) {
      setSelectedState(savedState);
    }

    const rtChannel = supabase
      .channel('business_directory_realtime_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_profiles' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_listings' }, () => {
        fetchData();
      })
      .subscribe();

    const unsubVerifications = subscribeToAllVerifications((records) => {
      const vMap = new Map<string, VerificationSubmissionRecord>();
      records.forEach((r) => {
        if (r.user_id) vMap.set(r.user_id, r);
      });
      setVerificationsMap(vMap);
    });

    const handleVerifUpdated = () => {
      fetchData();
    };
    window.addEventListener('ggd_verification_updated', handleVerifUpdated);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ggd_last_verif_change') {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (rtChannel) supabase.removeChannel(rtChannel);
      if (unsubVerifications) unsubVerifications();
      window.removeEventListener('ggd_verification_updated', handleVerifUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [bizRes, profRes, catRes, listRes] = await Promise.all([
        (supabase.from('business_profiles') as any).select('*'),
        (supabase.from('profiles') as any)
          .select('id, user_id, display_name, business_name, business_description, business_logo_url, business_category, industry, state, business_location, business_phone, business_website, business_slug, avatar_url, is_verified, verification_status')
          .not('business_name', 'is', null),
        (supabase.from('business_categories') as any).select('*').eq('is_active', true).order('sort_order'),
        (supabase.from('business_listings') as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
      ]);

      const loadedCats = catRes.data || [];

      const profileByUserId = new Map<string, any>();
      (profRes.data || []).forEach((p: any) => {
        if (p.user_id) profileByUserId.set(p.user_id, p);
      });

      const rawBiz = bizRes.data || [];
      const dedupedByKey = new Map<string, any>();
      const keyById = new Map<string, string>();
      const keyByUserId = new Map<string, string>();
      const keyByName = new Map<string, string>();

      rawBiz.forEach((b: any) => {
        const cleanName = typeof b.business_name === 'string' ? b.business_name.trim() : '';
        if (!cleanName || b.is_directory_listed === false) return;

        const prof = b.user_id ? profileByUserId.get(b.user_id) : null;
        const normalizedName = cleanName.toLowerCase();
        const existingKey =
          (b.id && keyById.get(b.id)) ||
          (b.user_id && keyByUserId.get(b.user_id)) ||
          keyByName.get(normalizedName);

        const candidate = {
          ...b,
          business_name: cleanName,
          description: b.description || prof?.business_description || null,
          logo_url: b.logo_url || prof?.business_logo_url || prof?.avatar_url || null,
          category_id: b.category_id || prof?.business_category || prof?.industry || null,
          state:
            b.state ||
            prof?.state ||
            (b.address ? extractStateFromLocation(b.address) : null) ||
            (prof?.business_location ? extractStateFromLocation(prof.business_location) : null),
          address: b.address || prof?.business_location || 'Nigeria',
          phone_number: b.phone_number || prof?.business_phone || null,
          website_link: b.website_link || prof?.business_website || null,
          is_verified: Boolean(
            b.is_verified === true ||
              b.verification_status === 'VERIFIED' ||
              prof?.is_verified === true ||
              prof?.verification_status === 'VERIFIED'
          ),
          verification_status:
            b.verification_status === 'VERIFIED' || prof?.verification_status === 'VERIFIED'
              ? 'VERIFIED'
              : b.verification_status || prof?.verification_status || 'UNVERIFIED',
        };

        if (existingKey && dedupedByKey.has(existingKey)) {
          const prev = dedupedByKey.get(existingKey);
          const merged = {
            ...prev,
            ...candidate,
            id: prev.id || candidate.id,
            user_id: prev.user_id || candidate.user_id,
            description: prev.description || candidate.description,
            logo_url: prev.logo_url || candidate.logo_url,
            category_id: prev.category_id || candidate.category_id,
            state: prev.state || candidate.state,
            phone_number: prev.phone_number || candidate.phone_number,
            website_link: prev.website_link || candidate.website_link,
            whatsapp_link: prev.whatsapp_link || candidate.whatsapp_link,
            is_verified: Boolean(prev.is_verified || candidate.is_verified),
            verification_status:
              prev.verification_status === 'VERIFIED' || candidate.verification_status === 'VERIFIED'
                ? 'VERIFIED'
                : prev.verification_status || candidate.verification_status,
          };
          dedupedByKey.set(existingKey, merged);
          if (merged.id) keyById.set(merged.id, existingKey);
          if (merged.user_id) keyByUserId.set(merged.user_id, existingKey);
          keyByName.set(normalizedName, existingKey);
        } else {
          const canonicalKey = b.user_id || b.id || normalizedName;
          dedupedByKey.set(canonicalKey, candidate);
          if (candidate.id) keyById.set(candidate.id, canonicalKey);
          if (candidate.user_id) keyByUserId.set(candidate.user_id, canonicalKey);
          keyByName.set(normalizedName, canonicalKey);
        }
      });

      const allBiz = Array.from(dedupedByKey.values());
      const bizLookup = new Map<string, any>();
      allBiz.forEach((b: any) => {
        if (b.id) bizLookup.set(b.id, b);
        if (b.user_id) bizLookup.set(b.user_id, b);
      });

      const rawDbListings = listRes.data || [];
      const dbListings = rawDbListings
        .map((l: any) => {
          const attachedBiz =
            (l.business_profile_id && bizLookup.get(l.business_profile_id)) ||
            (l.user_id && bizLookup.get(l.user_id)) ||
            l.business_profiles ||
            null;
          return {
            ...l,
            business_profiles: attachedBiz || {
              id: l.business_profile_id || l.user_id,
              user_id: l.user_id,
              business_name: l.title || 'Merchant',
              logo_url: null,
              category_id: l.category_id || null,
              is_directory_listed: true,
              is_verified: false,
              address: 'Nigeria',
              state: null,
            },
          };
        })
        .filter((l: any) => {
          if (l.business_profiles && l.business_profiles.is_directory_listed === false) {
            return false;
          }
          return l.is_active !== false;
        });

      setBusinesses(allBiz);
      setCategories(loadedCats);
      setListings(dbListings);
    } catch (err) {
      console.error('Failed to load directory data:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
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
        toast.success(`Location detected: ${loc.state} State`, {
          id: 'geo-detect',
          description: `Filtered businesses and stores around ${loc.state}.`,
        });
      } else {
        toast.error('Could not determine exact Nigerian state. Please select from the list.', {
          id: 'geo-detect',
        });
      }
    } catch {
      toast.error('Location detection timed out or was declined.', { id: 'geo-detect' });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const getBusinessEffectiveState = (biz: any): string | null => {
    if (biz?.state && biz.state.trim()) return biz.state.trim();
    if (biz?.address) {
      const extracted = extractStateFromLocation(biz.address);
      if (extracted) return extracted;
    }
    return null;
  };

  const isBusinessVerified = useCallback((b: any): boolean => {
    if (!b) return false;
    if (b.is_verified === true || b.verification_status === 'VERIFIED') return true;
    const uid = b.user_id || b.business_profiles?.user_id;
    if (uid && verificationsMap.has(uid)) {
      const v = verificationsMap.get(uid);
      if (v?.status === 'VERIFIED' && v?.verified_badge_granted) return true;
    }
    return false;
  }, [verificationsMap]);

  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);

  const verifiedBusinesses = useMemo(() => {
    return businesses.filter((b) => isBusinessVerified(b));
  }, [businesses, isBusinessVerified]);

  const verifiedBusinessesCount = verifiedBusinesses.length;

  const businessCountByState = useMemo(() => {
    return verifiedBusinesses.reduce((acc: Record<string, number>, b) => {
      const st = getBusinessEffectiveState(b);
      if (st) {
        acc[st] = (acc[st] || 0) + 1;
      }
      return acc;
    }, {});
  }, [verifiedBusinesses]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return verifiedBusinesses.filter((b) => {
      const bState = getBusinessEffectiveState(b);
      const matchesSearch =
        !q ||
        b.business_name?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        (bState && bState.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'all' || b.category_id === selectedCategory;
      const matchesState =
        selectedState === 'all' ||
        (bState &&
          (bState.toLowerCase() === selectedState.toLowerCase() ||
            bState.toLowerCase().includes(selectedState.toLowerCase())));

      return matchesSearch && matchesCategory && matchesState;
    });
  }, [verifiedBusinesses, searchQuery, selectedCategory, selectedState]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return listings.filter((l) => {
      if (onlyVerified && !isBusinessVerified(l.business_profiles)) return false;
      const lState = getBusinessEffectiveState(l.business_profiles);
      const catId = l.category_id || l.business_profiles?.category_id;

      const matchesSearch =
        !q ||
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.long_description?.toLowerCase().includes(q) ||
        l.business_profiles?.business_name?.toLowerCase().includes(q) ||
        l.business_profiles?.address?.toLowerCase().includes(q) ||
        (lState && lState.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' ||
        catId === selectedCategory ||
        (activeCategoryObj &&
          ((l.category_slug &&
            activeCategoryObj.slug &&
            activeCategoryObj.slug.toLowerCase().includes(l.category_slug.toLowerCase())) ||
            (l.category_slug &&
              activeCategoryObj.name &&
              activeCategoryObj.name.toLowerCase().includes(l.category_slug.toLowerCase())) ||
            (activeCategoryObj.slug &&
              l.category_slug &&
              l.category_slug.toLowerCase().includes(activeCategoryObj.slug.toLowerCase()))));

      const matchesState =
        selectedState === 'all' ||
        (lState &&
          (lState.toLowerCase() === selectedState.toLowerCase() ||
            lState.toLowerCase().includes(selectedState.toLowerCase())));

      return matchesSearch && matchesCategory && matchesState;
    });
  }, [listings, onlyVerified, searchQuery, selectedCategory, selectedState, activeCategoryObj, isBusinessVerified]);

  const featuredListings = filteredListings.filter((l) => l.is_featured);
  const productListings = filteredListings.filter((l) => l.listing_type !== 'service');
  const serviceListings = filteredListings.filter((l) => l.listing_type === 'service');

  const activeNearbyState = selectedState !== 'all' ? selectedState : userDetectedLocation?.state || null;
  const nearbyBusinesses = activeNearbyState
    ? verifiedBusinesses.filter((b) => {
        const st = getBusinessEffectiveState(b);
        return (
          st &&
          (st.toLowerCase() === activeNearbyState.toLowerCase() ||
            st.toLowerCase().includes(activeNearbyState.toLowerCase()))
        );
      })
    : [];

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedState !== 'all' || searchQuery.trim().length > 0 || onlyVerified;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedState('all');
    setOnlyVerified(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm font-medium text-muted-foreground">Loading business directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6">
      {/* Top Promotional Slider */}
      {!hideCarousel && <SlideCarousel />}

      {/* Directory Hero Header */}
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-5 sm:p-8 text-white shadow-md">
        <img
          loading="lazy"
          src={directoryHero}
          alt="Nigeria Business Directory and Marketplace"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-orange-950/80 to-red-950/85" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-amber-300 flex items-center gap-2">
              <Store className="h-4 w-4 shrink-0" />
              <span>Commercial Directory &amp; Marketplace</span>
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-balance leading-tight">
              Nigeria Business Directory &amp; Marketplace
            </h1>
            <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl">
              Discover accredited companies, browse physical products, and hire verified service providers across Nigeria.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-lg pt-1">
            <div className="rounded-xl sm:rounded-2xl bg-white/10 border border-white/15 p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold tabular-nums">{verifiedBusinesses.length}</p>
              <p className="text-xs sm:text-sm text-white/85 font-medium mt-0.5">Verified Stores</p>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white/10 border border-white/15 p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold tabular-nums text-amber-200">{categories.length}</p>
              <p className="text-xs sm:text-sm text-white/85 font-medium mt-0.5">Industries</p>
            </div>
            <div className="rounded-xl sm:rounded-2xl bg-white/10 border border-white/15 p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-200">{listings.length}</p>
              <p className="text-xs sm:text-sm text-white/85 font-medium mt-0.5">Listings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar, Compact State / Industry Filters & Segment Switcher */}
      <section className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search businesses, products, services, or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-12 h-12 rounded-xl bg-background border-border text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Compact State, Industry, GPS & Verified Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* State Selector */}
          <Select
            value={selectedState}
            onValueChange={(val) => {
              setSelectedState(val);
              if (val !== 'all') {
                localStorage.setItem('ggd_user_state', val);
              }
            }}
          >
            <SelectTrigger className="h-12 w-full rounded-xl bg-background border-border text-sm font-medium">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                <SelectValue placeholder="All States (Nigeria)" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-72">
              <SelectItem value="all">
                All 36 States &amp; FCT ({verifiedBusinesses.length})
              </SelectItem>
              {NIGERIAN_STATES.map((st) => {
                const count = businessCountByState[st] || 0;
                return (
                  <SelectItem key={st} value={st}>
                    {st} State {count > 0 ? `(${count})` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Industry Selector */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-12 w-full rounded-xl bg-background border-border text-sm font-medium">
              <div className="flex items-center gap-2 truncate">
                <Filter className="h-4 w-4 text-orange-500 shrink-0" />
                <SelectValue placeholder="All Industries" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-72">
              <SelectItem value="all">
                All Industries ({listings.length + verifiedBusinesses.length})
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* GPS Near Me Button */}
          <Button
            type="button"
            variant={userDetectedLocation?.state === selectedState ? 'default' : 'outline'}
            onClick={handleAutoDetectLocation}
            disabled={isDetectingLocation}
            className={`h-12 min-h-[44px] w-full rounded-xl text-sm font-semibold gap-2 whitespace-nowrap ${
              userDetectedLocation?.state === selectedState
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-transparent'
                : 'border-border hover:border-rose-400 text-foreground'
            }`}
          >
            {isDetectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Compass
                className={`h-4 w-4 shrink-0 ${
                  userDetectedLocation?.state === selectedState ? 'text-white' : 'text-rose-500'
                }`}
              />
            )}
            <span>{userDetectedLocation?.state ? `Near ${userDetectedLocation.state}` : 'Near Me (GPS)'}</span>
          </Button>

          {/* Verified Only Toggle */}
          <Button
            type="button"
            variant={onlyVerified ? 'default' : 'outline'}
            onClick={() => setOnlyVerified((prev) => !prev)}
            className={`h-12 min-h-[44px] w-full rounded-xl text-sm font-semibold gap-2 whitespace-nowrap ${
              onlyVerified
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                : 'border-border hover:border-emerald-500/60 text-foreground'
            }`}
          >
            <ShieldCheck
              className={`h-4 w-4 shrink-0 ${onlyVerified ? 'text-white' : 'text-emerald-600'}`}
            />
            <span>Verified Only</span>
            <span className="tabular-nums opacity-80">({verifiedBusinessesCount})</span>
          </Button>
        </div>

        {/* Quick State Filter Strip + Optional Industry Browser Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-border/60">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedState('all')}
              className={`h-10 min-h-[40px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedState === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              All Nigeria
            </button>
            {TOP_COMMERCIAL_STATES.map((st) => {
              const count = businessCountByState[st] || 0;
              const isSel = selectedState === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setSelectedState(st);
                    localStorage.setItem('ggd_user_state', st);
                  }}
                  className={`h-10 min-h-[40px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-orange-600 text-white'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{st}</span>
                  {count > 0 && (
                    <span className={`text-xs tabular-nums ${isSel ? 'text-white/90' : 'opacity-70'}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {categories.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowIndustriesPanel((prev) => !prev)}
              className="h-10 min-h-[40px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 gap-1.5 shrink-0 self-start sm:self-auto whitespace-nowrap"
            >
              <Grid3X3 className="h-4 w-4" />
              <span>Industries ({categories.length})</span>
              {showIndustriesPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Collapsible Industry Hub Grid */}
        {showIndustriesPanel && categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setShowIndustriesPanel(false);
              }}
              className={`min-h-[48px] p-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-orange-600 text-white border-transparent font-semibold'
                  : 'bg-background border-border hover:border-orange-500/50 text-foreground'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Store className="h-4 w-4 shrink-0" />
                All Industries
              </span>
              <span className="text-xs tabular-nums opacity-80">{listings.length + verifiedBusinesses.length}</span>
            </button>

            {categories.map((c) => {
              const cMeta = getIndustryMeta(c.slug || c.name);
              const CIcon = cMeta.icon;
              const isSel = selectedCategory === c.id;
              const bizCount = verifiedBusinesses.filter((b) => b.category_id === c.id).length;
              const itemCount = listings.filter((l) => l.business_profiles?.category_id === c.id).length;

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-colors ${
                    isSel
                      ? 'bg-orange-600 text-white border-transparent'
                      : 'bg-background border-border hover:border-orange-500/50 text-foreground'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(c.id);
                      setShowIndustriesPanel(false);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left min-h-[36px]"
                  >
                    <span
                      className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                        isSel ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600'
                      }`}
                    >
                      <CIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className={`text-xs tabular-nums ${isSel ? 'text-white/80' : 'text-muted-foreground'}`}>
                        {itemCount + bizCount} total
                      </p>
                    </div>
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/industry/${c.slug || c.id}`)}
                    className={`h-9 px-2.5 rounded-lg text-xs font-semibold shrink-0 ${
                      isSel ? 'text-white hover:bg-white/20' : 'text-orange-600 hover:bg-orange-500/10'
                    }`}
                    title={`Open ${c.name} Hub`}
                  >
                    Hub <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Directory Segment Tabs */}
        <div className="grid grid-cols-2 sm:inline-flex gap-1.5 p-1.5 rounded-2xl bg-muted/60 border border-border/60 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setDirectoryTab('all')}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              directoryTab === 'all'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>All</span>
            <span className="tabular-nums opacity-85">({filteredListings.length + filtered.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDirectoryTab('products')}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              directoryTab === 'products'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span>Products</span>
            <span className="tabular-nums opacity-85">({productListings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDirectoryTab('services')}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              directoryTab === 'services'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            <span>Services</span>
            <span className="tabular-nums opacity-85">({serviceListings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDirectoryTab('businesses')}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
              directoryTab === 'businesses'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
            }`}
          >
            <Store className="h-4 w-4 shrink-0" />
            <span>Businesses</span>
            <span className="tabular-nums opacity-85">({filtered.length})</span>
          </button>
        </div>

        {/* Active Filter Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm">
            <span className="text-muted-foreground font-medium">Active filters:</span>

            {onlyVerified && (
              <button
                type="button"
                onClick={() => setOnlyVerified(false)}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium hover:bg-emerald-500/20"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified Only</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {selectedState !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedState('all')}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-medium hover:bg-rose-500/20"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{selectedState}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {selectedCategory !== 'all' && activeCategoryObj && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-medium hover:bg-orange-500/20"
              >
                <span>{activeCategoryObj.name}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted text-foreground border border-border font-medium hover:bg-muted/80"
              >
                <span>&ldquo;{searchQuery.trim()}&rdquo;</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              {activeCategoryObj && (
                <button
                  type="button"
                  onClick={() => navigate(`/industry/${activeCategoryObj.slug || activeCategoryObj.id}`)}
                  className="min-h-[36px] text-xs sm:text-sm font-semibold text-orange-600 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open {activeCategoryObj.name} Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[36px] text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground underline"
              >
                Reset all
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Nearby Recommended Businesses (when a Nigerian state is active or GPS detected) */}
      {activeNearbyState && nearbyBusinesses.length > 0 && (
        <section className="rounded-2xl bg-card border border-rose-500/25 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-5 w-5 text-rose-500 shrink-0" />
                <span>Recommended in {activeNearbyState} State</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Verified merchants and service providers operating in {activeNearbyState}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedState(activeNearbyState);
                setDirectoryTab('businesses');
              }}
              className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-semibold border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 self-start sm:self-auto whitespace-nowrap"
            >
              View All ({nearbyBusinesses.length})
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {nearbyBusinesses.slice(0, 3).map((biz) => {
              const bizCat = categories.find((c) => c.id === biz.category_id);
              const bState = getBusinessEffectiveState(biz);
              return (
                <button
                  type="button"
                  key={`nearby-${biz.id}`}
                  onClick={() => navigate(`/business/${biz.id}`)}
                  className="p-3.5 rounded-xl bg-background border border-border hover:border-rose-500/60 transition-colors text-left flex items-center gap-3.5 group min-h-[76px]"
                >
                  {biz.logo_url ? (
                    <img
                      src={biz.logo_url}
                      alt={biz.business_name}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-xl object-cover border border-border shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                      <Store className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-rose-600 transition-colors">
                        {biz.business_name}
                      </h3>
                      {isBusinessVerified(biz) && (
                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" aria-label="Verified Merchant" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {bizCat?.name || 'Accredited Business'} · {bState || activeNearbyState}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-rose-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Sponsored Listings */}
      {featuredListings.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
              <span>Featured Sponsored Listings</span>
            </h2>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground tabular-nums">
              {featuredListings.length} featured
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {featuredListings.slice(0, 12).map((l) => {
              const isSrv = l.listing_type === 'service';
              return (
                <div
                  key={l.id}
                  className="flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden bg-card border border-amber-400/70 hover:border-orange-500 transition-colors flex flex-col justify-between shadow-xs"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/product/${l.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/product/${l.id}`);
                      }
                    }}
                    className="cursor-pointer focus-visible:outline-hidden"
                  >
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {l.image_url ? (
                        <img
                          src={l.image_url}
                          alt={l.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white/80">
                          {isSrv ? <Briefcase className="h-10 w-10" /> : <Package className="h-10 w-10" />}
                        </div>
                      )}
                      {l.video_url && (
                        <div className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-black/70 grid place-items-center">
                          <Play className="h-4 w-4 text-white" fill="white" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <BlazingBadge label="FEATURED" size="sm" />
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground truncate">
                        {isSrv ? 'Service' : 'Product'} · {l.business_profiles?.business_name || 'Verified Store'}
                      </p>
                      <h3 className="text-base font-semibold text-foreground line-clamp-1">{l.title}</h3>
                      {l.price ? (
                        <p className="text-base font-bold tabular-nums text-orange-600 dark:text-orange-400">
                          ₦{Number(l.price).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">Price on inquiry</p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <Button
                      type="button"
                      onClick={() => navigate(`/product/${l.id}`)}
                      className="w-full h-11 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Offer</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PRODUCTS & SERVICES SECTION */}
      {(directoryTab === 'all' || directoryTab === 'products' || directoryTab === 'services') && (
        <section className="space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 ${
                  directoryTab === 'services'
                    ? 'bg-blue-600'
                    : directoryTab === 'products'
                    ? 'bg-emerald-600'
                    : 'bg-orange-600'
                }`}
              >
                {directoryTab === 'services' ? (
                  <Briefcase className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {directoryTab === 'services'
                    ? 'Services & Solutions'
                    : directoryTab === 'products'
                    ? 'Products Catalog'
                    : 'Products & Services'}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                  {directoryTab === 'services'
                    ? serviceListings.length
                    : directoryTab === 'products'
                    ? productListings.length
                    : filteredListings.length}{' '}
                  available listings
                </p>
              </div>
            </div>
          </div>

          {(() => {
            const listToShow =
              directoryTab === 'services'
                ? serviceListings
                : directoryTab === 'products'
                ? productListings
                : filteredListings;

            if (listToShow.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-border p-8 sm:p-10 text-center bg-card space-y-3">
                  <Package className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h3 className="text-base font-semibold text-foreground">
                    {directoryTab === 'services'
                      ? 'No services match this filter'
                      : 'No products or services match this filter'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Try choosing a different Nigerian state, switching industries, or clearing your search query.
                  </p>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetAllFilters}
                      className="h-11 min-h-[44px] px-5 rounded-xl text-sm font-semibold"
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {listToShow.map((l) => {
                  const catObj = categories.find((c) => c.id === l.business_profiles?.category_id);
                  const isSrv = l.listing_type === 'service';
                  const itemState = getBusinessEffectiveState(l.business_profiles);
                  const isVerifiedSeller = isBusinessVerified(l.business_profiles || l);

                  return (
                    <article
                      key={l.id}
                      className="rounded-2xl overflow-hidden bg-card border border-border hover:border-orange-500/70 transition-all duration-150 hover:-translate-y-0.5 shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        {/* Compact Multi-Column Card Media */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/product/${l.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/product/${l.id}`);
                            }
                          }}
                          className="relative aspect-[4/3] bg-muted overflow-hidden cursor-pointer focus-visible:outline-hidden"
                        >
                          {l.image_url ? (
                            <img
                              src={l.image_url}
                              alt={l.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-white/70 gap-1.5 p-3">
                              {isSrv ? <Briefcase className="h-8 w-8" /> : <Package className="h-8 w-8" />}
                              <span className="text-[11px] font-medium text-center line-clamp-1">{l.title}</span>
                            </div>
                          )}

                          {l.is_featured && (
                            <div className="absolute top-2 left-2 z-10">
                              <BlazingBadge label="FEATURED" size="sm" />
                            </div>
                          )}

                          {l.video_url && (
                            <div className="absolute top-2 right-12 h-8 w-8 rounded-full bg-black/65 grid place-items-center z-10">
                              <Play className="h-3.5 w-3.5 text-white" fill="white" />
                            </div>
                          )}

                          <div
                            className="absolute top-2 right-2 z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FavoriteButton
                              item={{
                                targetId: l.id,
                                type: isSrv ? 'service' : 'product',
                                title: l.title,
                                subtitle: l.business_profiles?.business_name,
                                description: l.description,
                                imageUrl: l.image_url,
                                price: l.price,
                                location: itemState,
                                category: catObj?.name,
                                verified: isVerifiedSeller,
                                linkUrl: `/product/${l.id}`,
                                businessName: l.business_profiles?.business_name,
                                businessPhone: l.business_profiles?.phone_number,
                                businessWebsite: l.business_profiles?.website_link,
                              }}
                              variant="overlay"
                              size="md"
                            />
                          </div>
                        </div>

                        {/* Compact Card Content */}
                        <div className="p-2.5 sm:p-3.5 space-y-1">
                          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                            <span className={isSrv ? 'text-blue-600 dark:text-blue-400 font-semibold shrink-0' : 'text-emerald-600 dark:text-emerald-400 font-semibold shrink-0'}>
                              {isSrv ? 'Service' : 'Product'}
                            </span>
                            {itemState && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{itemState}</span>
                                </span>
                              </>
                            )}
                          </div>

                          <h3
                            onClick={() => navigate(`/product/${l.id}`)}
                            className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2 cursor-pointer group-hover:text-orange-600 transition-colors min-h-[2.25rem]"
                          >
                            {l.title}
                          </h3>

                          <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <span className="truncate">
                              {l.business_profiles?.business_name || 'Accredited Business'}
                            </span>
                            {isVerifiedSeller && (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-label="Verified Seller" />
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Compact Price & Action Footer */}
                      <div className="p-2.5 sm:p-3.5 pt-0 space-y-2">
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1.5">
                          {l.price ? (
                            <p className="text-sm sm:text-base font-bold tabular-nums text-orange-600 dark:text-orange-400 truncate">
                              ₦{Number(l.price).toLocaleString()}
                            </p>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">Inquiry</span>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={() => navigate(`/product/${l.id}`)}
                          className="w-full h-10 sm:h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs sm:text-sm gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span>View Details</span>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}

      {/* ACCREDITED BUSINESSES & STORES SECTION */}
      {(directoryTab === 'all' || directoryTab === 'businesses') && (
        <section
          className={`space-y-4 sm:space-y-5 ${
            directoryTab === 'all' ? 'pt-6 border-t border-border/70' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-red-600 grid place-items-center text-white shrink-0">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  Accredited Businesses &amp; Stores
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                  {filtered.length} registered storefront{filtered.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 sm:p-10 text-center bg-card space-y-3">
              <Store className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-semibold text-foreground">
                No businesses match this filter
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {selectedState !== 'all'
                  ? `No listed businesses were found in ${selectedState} State matching your current criteria.`
                  : 'Try adjusting your search query or industry filter to see more Nigerian businesses.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {selectedState !== 'all' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedState('all')}
                    className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-semibold"
                  >
                    Show All States
                  </Button>
                )}
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSearchQuery('')}
                    className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-semibold"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filtered.map((biz) => {
                const bizCategory = categories.find((c) => c.id === biz.category_id);
                const isBizVerifiedStatus = isBusinessVerified(biz);
                const bizState = getBusinessEffectiveState(biz);
                const rawWa = biz.whatsapp_link || biz.phone_number;
                const waHref = rawWa
                  ? rawWa.startsWith('http')
                    ? rawWa
                    : buildWhatsAppLink(rawWa, {
                        message: `Hello ${biz.business_name}, I found your business on GGD Ad Network!`,
                      })
                  : null;
                const websiteHref = biz.website_link
                  ? biz.website_link.startsWith('http')
                    ? biz.website_link
                    : `https://${biz.website_link}`
                  : null;

                return (
                  <article
                    key={biz.id}
                    className="rounded-2xl bg-card border border-border hover:border-orange-500/70 transition-all duration-150 hover:-translate-y-0.5 shadow-xs flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Overview Body */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/business/${biz.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/business/${biz.id}`);
                        }
                      }}
                      className="p-4 sm:p-5 space-y-3.5 flex-1 cursor-pointer focus-visible:outline-hidden"
                    >
                      <div className="flex items-start gap-3.5">
                        {biz.logo_url ? (
                          <img
                            loading="lazy"
                            src={biz.logo_url}
                            alt={biz.business_name}
                            referrerPolicy="no-referrer"
                            className="h-14 w-14 rounded-2xl object-cover border border-border bg-muted shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shrink-0">
                            <Store className="h-7 w-7" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                              {biz.business_name}
                            </h3>
                            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                              <FavoriteButton
                                item={{
                                  targetId: biz.id,
                                  type: 'business',
                                  title: biz.business_name,
                                  subtitle: bizCategory?.name || 'Accredited Business',
                                  description: biz.description,
                                  imageUrl: biz.logo_url,
                                  location: bizState,
                                  category: bizCategory?.name,
                                  verified: isBizVerifiedStatus,
                                  linkUrl: `/business/${biz.id}`,
                                  businessName: biz.business_name,
                                  businessPhone: biz.phone_number,
                                  businessWebsite: biz.website_link,
                                }}
                                variant="ghost"
                                className="h-11 w-11 min-h-[44px] min-w-[44px]"
                              />
                            </div>
                          </div>

                          {/* Clean Unboxed Metadata */}
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                            {isBizVerifiedStatus && (
                              <>
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <ShieldCheck className="h-4 w-4 shrink-0" />
                                  Verified
                                </span>
                                {(bizCategory || bizState) && <span aria-hidden="true">·</span>}
                              </>
                            )}
                            {bizCategory && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/industry/${bizCategory.slug || bizCategory.id}`);
                                  }}
                                  className="hover:text-orange-600 hover:underline font-medium truncate max-w-[170px]"
                                >
                                  {bizCategory.name}
                                </button>
                                {bizState && <span aria-hidden="true">·</span>}
                              </>
                            )}
                            {bizState && (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {bizState}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {getEffectiveBusinessDescription(
                          biz.description,
                          biz.business_name,
                          bizCategory?.name || biz.category_id
                        )}
                      </p>
                    </div>

                    {/* Spacious Touch-Friendly Action Footer */}
                    <div className="p-4 sm:p-5 pt-3.5 border-t border-border/60 bg-muted/20 space-y-2.5">
                      {(waHref || websiteHref) && (
                        <div className={`grid gap-2 ${waHref && websiteHref ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {waHref && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="h-11 min-h-[44px] px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                            >
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          {websiteHref && (
                            <a
                              href={websiteHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="h-11 min-h-[44px] px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                            >
                              <Globe className="h-4 w-4 shrink-0" />
                              <span>Website</span>
                            </a>
                          )}
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={() => navigate(`/business/${biz.id}`)}
                        className="w-full h-11 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm gap-2"
                      >
                        <Store className="h-4 w-4" />
                        <span>View Store</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default BusinessDirectory;
