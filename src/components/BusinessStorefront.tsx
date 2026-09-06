import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Building2,
  Package,
  Zap,
  ShoppingBag,
  Megaphone,
  TrendingUp,
  ExternalLink,
  Plus,
  Search,
  Crown,
  Share2,
  Sparkles,
  Layers,
  ArrowRight,
  BarChart3,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

// Subcomponents
import { AddListingChoiceModal } from "./business/AddListingChoiceModal";
import { ListingFormModal } from "./business/ListingFormModal";
import { ProductCardItem } from "./business/ProductCardItem";
import { BusinessProfileSection } from "./business/BusinessProfileSection";
import { StorefrontSection } from "./business/StorefrontSection";
import { AdvertisingSection } from "./business/AdvertisingSection";
import { PerformanceSection } from "./business/PerformanceSection";

interface BusinessStorefrontProps {
  onNavigate?: (tab: string) => void;
}

export const BusinessStorefront: React.FC<BusinessStorefrontProps> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();

  // Core Data States
  const [profile, setProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Search and Filter States for Listings
  const [productSearch, setProductSearch] = useState<string>('');
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'featured'>('all');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'active' | 'featured'>('all');
  const [allListingsFilter, setAllListingsFilter] = useState<'all' | 'products' | 'services' | 'featured'>('all');
  const [allListingsSearch, setAllListingsSearch] = useState<string>('');

  // Modals
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formListingType, setFormListingType] = useState<'product' | 'service'>('product');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Load All Workspace Data
  const fetchWorkspaceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // 1. Fetch categories
      const { data: cats } = await supabase
        .from('business_categories')
        .select('*')
        .order('name');
      if (cats) setCategories(cats);

      // 2. Fetch User Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (prof) setUserProfile(prof);

      // 3. Fetch Business Profile
      let { data: bp } = await (supabase.from('business_profiles') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Auto-provision business_profile if missing to guarantee a valid business_profile_id
      if (!bp) {
        const defaultName = prof?.business_name || prof?.display_name || user.email?.split('@')[0] || 'My Business';
        const defaultLogo = prof?.business_logo_url || prof?.avatar_url || null;
        const { data: createdBp, error: createErr } = await (supabase.from('business_profiles') as any)
          .insert({
            user_id: user.id,
            business_name: defaultName,
            description: prof?.business_description || null,
            phone_number: prof?.business_phone || null,
            address: prof?.business_location || null,
            website_link: prof?.business_website || null,
            logo_url: defaultLogo,
            is_directory_listed: true,
          })
          .select()
          .maybeSingle();

        if (!createErr && createdBp) {
          bp = createdBp;
        }
      }

      setProfile(bp || { user_id: user.id, business_name: 'My Business' });

      // 4. Fetch Listings (both products and services)
      const { data: listData, error: listErr } = await (supabase.from('business_listings') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!listErr && listData) {
        setListings(listData);
      }
    } catch (err: any) {
      console.error("Error loading business workspace:", err);
      toast.error("Failed to load business data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const handleOpenChoiceModal = () => {
    setEditingItem(null);
    setChoiceModalOpen(true);
  };

  const handleSelectTypeFromChoice = (type: 'product' | 'service') => {
    setEditingItem(null);
    setFormListingType(type);
    setFormModalOpen(true);
  };

  const handleAddDirectProduct = () => {
    setEditingItem(null);
    setFormListingType('product');
    setFormModalOpen(true);
  };

  const handleAddDirectService = () => {
    setEditingItem(null);
    setFormListingType('service');
    setFormModalOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setFormListingType(item.listing_type === 'service' ? 'service' : 'product');
    setFormModalOpen(true);
  };

  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Derived Lists
  const allProducts = listings.filter((l) => l.listing_type !== 'service');
  const allServices = listings.filter((l) => l.listing_type === 'service');

  // Filtered Products
  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch = !productSearch || p.title?.toLowerCase().includes(productSearch.toLowerCase()) || p.description?.toLowerCase().includes(productSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (productFilter === 'active') return p.is_active !== false;
    if (productFilter === 'featured') return p.is_featured;
    return true;
  });

  // Filtered Services
  const filteredServices = allServices.filter((s) => {
    const matchesSearch = !serviceSearch || s.title?.toLowerCase().includes(serviceSearch.toLowerCase()) || s.description?.toLowerCase().includes(serviceSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (serviceFilter === 'active') return s.is_active !== false;
    if (serviceFilter === 'featured') return s.is_featured;
    return true;
  });

  // Filtered All Listings
  const filteredAllListings = listings.filter((item) => {
    const matchesSearch = !allListingsSearch || item.title?.toLowerCase().includes(allListingsSearch.toLowerCase()) || item.description?.toLowerCase().includes(allListingsSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (allListingsFilter === 'products') return item.listing_type !== 'service';
    if (allListingsFilter === 'services') return item.listing_type === 'service';
    if (allListingsFilter === 'featured') return item.is_featured;
    return true;
  });

  const storefrontPath = profile?.slug ? `/b/${profile.slug}` : `/user/${userId}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-xs font-bold">Loading My Business Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. WORKSPACE HEADER & IDENTITY BAR                                        */}
      {/* ========================================================================= */}
      <Card className="border-border/70 overflow-hidden shadow-sm bg-gradient-to-r from-card via-card to-muted/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Identity & Basic Details */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-orange-500/30 bg-muted shrink-0 shadow-md">
                {profile?.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt={profile.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-xl">
                    {profile?.business_name ? profile.business_name.slice(0, 2).toUpperCase() : 'GB'}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-foreground truncate max-w-xs sm:max-w-md">
                    {profile?.business_name || 'My Business'}
                  </h1>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950/20">
                    Verified Storefront
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold">
                    {allProducts.length} {allProducts.length === 1 ? 'Product' : 'Products'}
                  </span>
                  <span>•</span>
                  <span className="font-semibold">
                    {allServices.length} {allServices.length === 1 ? 'Service' : 'Services'}
                  </span>
                  <span>•</span>
                  <button
                    onClick={() => window.open(storefrontPath, '_blank')}
                    className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-bold hover:underline"
                  >
                    View Storefront
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Primary Action Button: Add Listing */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={handleOpenChoiceModal}
                className="flex-1 sm:flex-initial h-11 px-5 text-xs font-black bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20 rounded-2xl transition-all"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Listing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 2. WORKSPACE TABS NAVIGATION BAR                                          */}
      {/* ========================================================================= */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto no-scrollbar pb-1">
          <TabsList className="h-12 p-1 bg-muted/60 border border-border/60 rounded-2xl inline-flex w-auto min-w-full sm:min-w-0 justify-start sm:justify-center gap-1">
            <TabsTrigger value="overview" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Store className="h-3.5 w-3.5 text-orange-500" />
              Overview
            </TabsTrigger>

            <TabsTrigger value="profile" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              Business Profile
            </TabsTrigger>

            <TabsTrigger value="products" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              Products ({allProducts.length})
            </TabsTrigger>

            <TabsTrigger value="services" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Zap className="h-3.5 w-3.5 text-purple-600" />
              Services ({allServices.length})
            </TabsTrigger>

            <TabsTrigger value="listings" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              All Listings ({listings.length})
            </TabsTrigger>

            <TabsTrigger value="storefront" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Share2 className="h-3.5 w-3.5 text-cyan-600" />
              Storefront
            </TabsTrigger>

            <TabsTrigger value="advertising" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Megaphone className="h-3.5 w-3.5 text-orange-600" />
              Promote
            </TabsTrigger>

            <TabsTrigger value="performance" className="rounded-xl text-xs font-bold px-3 sm:px-4 h-10 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
              Performance
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW / WORKSPACE HUB                                           */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Metrics & Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card
              onClick={() => handleNavigateTab('products')}
              className="border-border/70 hover:border-blue-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Products</span>
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 grid place-items-center group-hover:scale-110 transition-transform">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-foreground mt-2">{allProducts.length}</p>
                <p className="text-[11px] text-blue-600 font-bold mt-0.5 flex items-center gap-1">
                  Manage Products <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleNavigateTab('services')}
              className="border-border/70 hover:border-purple-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Services</span>
                  <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 grid place-items-center group-hover:scale-110 transition-transform">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-foreground mt-2">{allServices.length}</p>
                <p className="text-[11px] text-purple-600 font-bold mt-0.5 flex items-center gap-1">
                  Manage Services <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleNavigateTab('storefront')}
              className="border-border/70 hover:border-emerald-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Storefront</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center group-hover:scale-110 transition-transform">
                    <Store className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 mt-2">Active</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  Preview & Share <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleNavigateTab('advertising')}
              className="border-border/70 hover:border-orange-500/50 cursor-pointer transition-all shadow-sm group"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Promotion</span>
                  <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center group-hover:scale-110 transition-transform">
                    <Megaphone className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-orange-600 mt-2">Promote</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  Ads & Syndicates <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Add Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              onClick={handleAddDirectProduct}
              className="p-4 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-500 cursor-pointer transition-all flex items-center gap-3.5 group"
            >
              <div className="h-11 w-11 rounded-xl bg-blue-600 text-white grid place-items-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-foreground group-hover:text-blue-600 transition-colors">
                  + Add New Product
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Physical goods, fashion, merchandise, or digital items.
                </p>
              </div>
              <Plus className="h-5 w-5 text-blue-600 shrink-0" />
            </div>

            <div
              onClick={handleAddDirectService}
              className="p-4 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-500 cursor-pointer transition-all flex items-center gap-3.5 group"
            >
              <div className="h-11 w-11 rounded-xl bg-purple-600 text-white grid place-items-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-foreground group-hover:text-purple-600 transition-colors">
                  + Add New Service
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Consultation, repairs, agency work, or custom gigs.
                </p>
              </div>
              <Plus className="h-5 w-5 text-purple-600 shrink-0" />
            </div>
          </div>

          {/* Recent Listings Preview */}
          <Card className="border-border/70 shadow-sm">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-foreground">Recent Listings</h3>
                <p className="text-xs text-muted-foreground">Your most recently updated products and services</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateTab('listings')}
                className="h-8 text-xs font-bold text-orange-600"
              >
                View All ({listings.length})
              </Button>
            </div>
            <CardContent className="p-4">
              {listings.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">No listings created yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Start by adding your first product or service to publish on your public storefront.
                  </p>
                  <Button
                    onClick={handleOpenChoiceModal}
                    className="mt-4 h-10 text-xs font-black bg-orange-600 text-white rounded-xl shadow"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create First Listing
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.slice(0, 3).map((item) => (
                    <ProductCardItem
                      key={item.id}
                      item={item}
                      onEdit={handleEditItem}
                      onRefresh={fetchWorkspaceData}
                      userCredits={userProfile?.credits || 0}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: BUSINESS PROFILE SECTION                                           */}
        {/* ========================================================================= */}
        <TabsContent value="profile">
          <BusinessProfileSection
            profile={profile}
            setProfile={setProfile}
            categories={categories}
            onSaved={fetchWorkspaceData}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: DEDICATED PRODUCTS TAB                                             */}
        {/* ========================================================================= */}
        <TabsContent value="products" className="space-y-4">
          {/* Top Bar for Products */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Products Catalog
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage all physical and digital merchandise for your business.
              </p>
            </div>

            <Button
              onClick={handleAddDirectProduct}
              className="h-10 px-4 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by title or description..."
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/50">
              <Button
                size="sm"
                variant={productFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setProductFilter('all')}
                className="h-8 text-xs font-bold rounded-lg px-2.5"
              >
                All ({allProducts.length})
              </Button>
              <Button
                size="sm"
                variant={productFilter === 'active' ? 'default' : 'ghost'}
                onClick={() => setProductFilter('active')}
                className="h-8 text-xs font-bold rounded-lg px-2.5"
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={productFilter === 'featured' ? 'default' : 'ghost'}
                onClick={() => setProductFilter('featured')}
                className="h-8 text-xs font-bold rounded-lg px-2.5 text-amber-600"
              >
                <Crown className="h-3 w-3 mr-1 fill-amber-500" />
                Featured
              </Button>
            </div>
          </div>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <Card className="border-border/70 border-dashed">
              <CardContent className="p-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">
                  {allProducts.length === 0
                    ? "Your business doesn't have any products yet."
                    : "No products match your search or filter."}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Add physical or digital items to sell through your storefront and share directly on WhatsApp.
                </p>
                {allProducts.length === 0 && (
                  <Button
                    onClick={handleAddDirectProduct}
                    className="mt-4 h-10 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Product
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((p) => (
                <ProductCardItem
                  key={p.id}
                  item={p}
                  onEdit={handleEditItem}
                  onRefresh={fetchWorkspaceData}
                  userCredits={userProfile?.credits || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: DEDICATED SERVICES TAB                                             */}
        {/* ========================================================================= */}
        <TabsContent value="services" className="space-y-4">
          {/* Top Bar for Services */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Services & Offerings
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage your professional services, consultation packages, and client offerings.
              </p>
            </div>

            <Button
              onClick={handleAddDirectService}
              className="h-10 px-4 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Service
            </Button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search services by title or description..."
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/50">
              <Button
                size="sm"
                variant={serviceFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setServiceFilter('all')}
                className="h-8 text-xs font-bold rounded-lg px-2.5"
              >
                All ({allServices.length})
              </Button>
              <Button
                size="sm"
                variant={serviceFilter === 'active' ? 'default' : 'ghost'}
                onClick={() => setServiceFilter('active')}
                className="h-8 text-xs font-bold rounded-lg px-2.5"
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={serviceFilter === 'featured' ? 'default' : 'ghost'}
                onClick={() => setServiceFilter('featured')}
                className="h-8 text-xs font-bold rounded-lg px-2.5 text-amber-600"
              >
                <Crown className="h-3 w-3 mr-1 fill-amber-500" />
                Featured
              </Button>
            </div>
          </div>

          {/* Services List */}
          {filteredServices.length === 0 ? (
            <Card className="border-border/70 border-dashed">
              <CardContent className="p-8 text-center">
                <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">
                  {allServices.length === 0
                    ? "Your business doesn't have any services yet."
                    : "No services match your search or filter."}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  List your professional skills, consultations, and deliverables so clients can inquire directly.
                </p>
                {allServices.length === 0 && (
                  <Button
                    onClick={handleAddDirectService}
                    className="mt-4 h-10 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Service
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((s) => (
                <ProductCardItem
                  key={s.id}
                  item={s}
                  onEdit={handleEditItem}
                  onRefresh={fetchWorkspaceData}
                  userCredits={userProfile?.credits || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: ALL LISTINGS (UNIFIED SEPARATION)                                   */}
        {/* ========================================================================= */}
        <TabsContent value="listings" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" />
                All Listings Catalog
              </h3>
              <p className="text-xs text-muted-foreground">
                Consolidated overview of all {allProducts.length} Products and {allServices.length} Services.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddDirectProduct}
                className="flex-1 sm:flex-initial h-10 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Product
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddDirectService}
                className="flex-1 sm:flex-initial h-10 text-xs font-bold text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Service
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={allListingsSearch}
                onChange={(e) => setAllListingsSearch(e.target.value)}
                placeholder="Search across all listings..."
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/50 overflow-x-auto no-scrollbar">
              <Button
                size="sm"
                variant={allListingsFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setAllListingsFilter('all')}
                className="h-8 text-xs font-bold rounded-lg px-2.5 shrink-0"
              >
                All ({listings.length})
              </Button>
              <Button
                size="sm"
                variant={allListingsFilter === 'products' ? 'default' : 'ghost'}
                onClick={() => setAllListingsFilter('products')}
                className="h-8 text-xs font-bold rounded-lg px-2.5 shrink-0 text-blue-600"
              >
                Products ({allProducts.length})
              </Button>
              <Button
                size="sm"
                variant={allListingsFilter === 'services' ? 'default' : 'ghost'}
                onClick={() => setAllListingsFilter('services')}
                className="h-8 text-xs font-bold rounded-lg px-2.5 shrink-0 text-purple-600"
              >
                Services ({allServices.length})
              </Button>
              <Button
                size="sm"
                variant={allListingsFilter === 'featured' ? 'default' : 'ghost'}
                onClick={() => setAllListingsFilter('featured')}
                className="h-8 text-xs font-bold rounded-lg px-2.5 shrink-0 text-amber-600"
              >
                Featured
              </Button>
            </div>
          </div>

          {/* Listings List */}
          {filteredAllListings.length === 0 ? (
            <Card className="border-border/70 border-dashed">
              <CardContent className="p-8 text-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">No listings found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the buttons above to add your first product or service.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAllListings.map((item) => (
                <ProductCardItem
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onRefresh={fetchWorkspaceData}
                  userCredits={userProfile?.credits || 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 6: STOREFRONT SECTION                                                 */}
        {/* ========================================================================= */}
        <TabsContent value="storefront">
          <StorefrontSection
            profile={profile}
            setProfile={setProfile}
            listings={listings}
            userId={userId}
            onNavigateToTab={handleNavigateTab}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 7: ADVERTISING & PROMOTION SECTION                                    */}
        {/* ========================================================================= */}
        <TabsContent value="advertising">
          <AdvertisingSection
            businessName={profile?.business_name || 'Your Business'}
            userId={userId}
            onNavigateToTab={handleNavigateTab}
          />
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 8: PERFORMANCE SECTION                                                */}
        {/* ========================================================================= */}
        <TabsContent value="performance">
          <PerformanceSection
            profile={profile}
            listings={listings}
            userId={userId}
            onNavigateToTab={handleNavigateTab}
          />
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* 3. MODALS & FORMS                                                         */}
      {/* ========================================================================= */}

      {/* Choice Modal: "What do you want to add?" [Product] [Service] */}
      <AddListingChoiceModal
        open={choiceModalOpen}
        onOpenChange={setChoiceModalOpen}
        onSelectType={handleSelectTypeFromChoice}
      />

      {/* Listing Form Modal: Handles creating & editing Products and Services */}
      <ListingFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        listingType={formListingType}
        editingItem={editingItem}
        businessProfileId={profile?.id}
        userId={userId}
        onSaved={fetchWorkspaceData}
      />
    </div>
  );
};

export default BusinessStorefront;
