import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Loader2, MessageCircle, Phone, Globe, Store, 
  ExternalLink, Share2, Crown, ShoppingBag, Play, Package, 
  Briefcase, ChevronRight, MapPin, Sparkles, ShieldCheck, 
  Layers, ArrowRight 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AdDisplayPreview from '@/components/AdDisplayPreview';
import MetaTags from '@/components/MetaTags';
import BlazingBadge from '@/components/BlazingBadge';
import { getIndustryMeta, getEffectiveBusinessDescription } from '@/utils/industryData';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [relatedListings, setRelatedListings] = useState<any[]>([]);
  const [sellerOtherListings, setSellerOtherListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const { data: L } = await (supabase.from('business_listings') as any)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!L) {
        setLoading(false);
        return;
      }

      setListing(L);
      setActiveImg(L.image_url || null);

      // Fetch parent business profile
      let B: any = null;
      if (L.business_profile_id) {
        const { data: bData } = await (supabase.from('business_profiles') as any)
          .select('*')
          .eq('id', L.business_profile_id)
          .maybeSingle();
        B = bData;
      }
      if (!B && L.user_id) {
        const { data: bUserData } = await (supabase.from('business_profiles') as any)
          .select('*')
          .eq('user_id', L.user_id)
          .maybeSingle();
        B = bUserData;
      }

      if (!B) {
        B = {
          id: L.business_profile_id || L.user_id,
          business_name: 'Accredited Business',
          logo_url: null,
          is_directory_listed: true,
          address: 'Nigeria',
          state: null,
        };
      }

      setBusiness(B);

      // Fetch user profile and category
      if (B?.user_id) {
        const { data: P } = await supabase
          .from('profiles')
          .select('user_id, display_name, business_name, business_slug, business_phone, business_website, avatar_url, business_logo_url')
          .eq('user_id', B.user_id)
          .maybeSingle();
        setProfile(P);
      }

      if (B?.category_id) {
        const { data: C } = await (supabase.from('business_categories') as any)
          .select('*')
          .eq('id', B.category_id)
          .maybeSingle();
        setCategory(C);

        // Fetch related products in the same industry
        const { data: relatedBiz } = await (supabase.from('business_profiles') as any)
          .select('id, is_directory_listed')
          .eq('category_id', B.category_id);

        const validRelatedBiz = (relatedBiz || []).filter((rb: any) => rb.is_directory_listed !== false);
        if (validRelatedBiz.length > 0) {
          const rIds = validRelatedBiz.map((rb: any) => rb.id);
          const { data: relatedItems } = await (supabase.from('business_listings') as any)
            .select('*')
            .in('business_profile_id', rIds)
            .neq('id', id)
            .limit(6);
          setRelatedListings(relatedItems || []);
        }
      }

      // Fetch other listings by this same seller
      if (L.business_profile_id) {
        const { data: sellerItems } = await (supabase.from('business_listings') as any)
          .select('*')
          .eq('business_profile_id', L.business_profile_id)
          .neq('id', id)
          .limit(4);
        setSellerOtherListings(sellerItems || []);
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/?tab=directory');
  };

  const share = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: listing?.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied to clipboard!' });
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <Package className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-black text-foreground">Catalog Item Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm">This product or service listing is currently unavailable or has been removed.</p>
        <Button onClick={goBack} variant="outline" className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" />Return to Directory</Button>
      </div>
    );
  }

  const bizName = business?.business_name || profile?.business_name || profile?.display_name || 'Accredited Business';
  const bizUrl = profile?.business_slug ? `/b/${profile.business_slug}` : (business?.id ? `/business/${business.id}` : null);
  const waPhone = (business?.phone_number || profile?.business_phone || '').replace(/[^\d]/g, '');
  const gallery = [listing.image_url, ...(Array.isArray(listing.extra_images) ? listing.extra_images : [])].filter(Boolean);
  const isService = listing.listing_type === 'service';
  const industryMeta = getIndustryMeta(category?.slug || category?.name || '');
  const IndustryIcon = industryMeta.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/40 dark:from-background dark:via-background dark:to-background pb-16">
      <MetaTags
        type={isService ? 'website' : 'product'}
        title={`${listing.title} — ${isService ? 'Service' : 'Product'} by ${bizName} | GGD`}
        description={listing.description || listing.long_description || `${isService ? 'Professional service' : 'Quality product'} from ${bizName} on GGD Ad Network.`}
        imageUrl={listing.image_url}
        badge={category?.name || (isService ? 'SERVICE' : 'PRODUCT')}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': isService ? 'Service' : 'Product',
          name: listing.title,
          description: listing.description || listing.long_description || undefined,
          image: listing.image_url || undefined,
          brand: {
            '@type': 'Brand',
            name: bizName,
          },
          ...(category ? { category: category.name } : {}),
          ...(listing.price != null && Number(listing.price) > 0 ? {
            offers: {
              '@type': 'Offer',
              price: listing.price,
              priceCurrency: 'NGN',
              availability: 'https://schema.org/InStock',
            }
          } : {}),
        }}
      />

      {/* Sticky Header with Breadcrumb Navigation */}
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50 shadow-xs">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 rounded-xl text-xs font-bold">
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <div className="h-4 w-[1px] bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Link to="/?tab=directory" className="hover:text-foreground">Directory</Link>
              {category && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <Link to={`/industry/${category.slug || category.id}`} className="hover:text-foreground font-semibold truncate">
                    {category.name}
                  </Link>
                </>
              )}
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-bold truncate max-w-[200px]">{listing.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={share} className="gap-1 rounded-xl text-xs font-bold">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </header>

      <article className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Industry Banner Tag & Taxonomy Pill */}
        {category && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center">
                <IndustryIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Industry & Sector</p>
                <p className="text-xs font-black text-foreground">{category.name}</p>
              </div>
            </div>
            <Link
              to={`/industry/${category.slug || category.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 text-xs font-bold transition-all"
            >
              Explore {category.name} Industry Hub <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Media Gallery / Video Card */}
        <Card className="overflow-hidden border border-border/80 shadow-lg rounded-3xl">
          {listing.video_url ? (
            <div className="aspect-video bg-black">
              {/youtube\.com|youtu\.be/.test(listing.video_url) ? (
                <iframe
                  src={listing.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  title={listing.title}
                />
              ) : (
                <video src={listing.video_url} controls className="w-full h-full" poster={listing.image_url || undefined} />
              )}
            </div>
          ) : activeImg ? (
            <div className="w-full bg-slate-900/5 dark:bg-black/40 flex items-center justify-center p-3">
              <img
                loading="lazy"
                src={activeImg}
                alt={listing.title}
                className="w-full max-h-[500px] h-auto object-contain rounded-2xl shadow-xs"
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white">
              {isService ? <Briefcase className="h-16 w-16 opacity-70" /> : <Package className="h-16 w-16 opacity-70" />}
            </div>
          )}

          {gallery.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto bg-card border-t border-border/60 no-scrollbar">
              {gallery.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(img)}
                  className={`flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImg === img ? 'border-orange-500 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Title, Badges & Pricing Overview */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`text-xs font-bold border-0 px-3 py-1 rounded-full shadow-xs ${
              isService ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {isService ? '💼 Professional Service' : '📦 Commercial Product'}
            </Badge>

            {listing.is_featured && <BlazingBadge label="FEATURED OFFER" size="md" />}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight">
            {listing.title}
          </h1>

          {/* Pricing Header */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {isService ? 'Service Pricing' : 'Product Unit Price'}
              </p>
              {Number(listing.price) > 0 ? (
                <p className="text-3xl font-black bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 bg-clip-text text-transparent">
                  {isService ? 'Starting at ' : ''}₦{Number(listing.price).toLocaleString()}
                </p>
              ) : (
                <p className="text-xl font-black text-slate-700 dark:text-slate-200">
                  {isService ? 'Custom Quote on Inquiry' : 'Contact Seller for Price'}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Verified Merchant Listing</span>
            </div>
          </div>
        </div>

        {/* Description & Specifications */}
        {(listing.long_description || listing.description) && (
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                {isService ? 'Service Scope & Specifications' : 'Product Overview & Details'}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-foreground whitespace-pre-line">
                {listing.long_description || listing.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order & Contact Action Hub */}
        <div className="space-y-3">
          {/* Direct GGD Chat */}
          <Button
            className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-13 rounded-2xl gap-2 text-sm sm:text-base font-black shadow-lg cursor-pointer"
            onClick={() => {
              if (!currentUser) {
                toast({
                  title: "Sign in required",
                  description: "Please sign in or register to chat with this seller directly on GGD.",
                });
                navigate('/?auth=signin');
                return;
              }
              const sellerId = business?.user_id || listing?.user_id || profile?.user_id;
              if (!sellerId) {
                toast({ title: "Unable to reach seller", description: "Seller contact details unavailable." });
                return;
              }
              if (currentUser.id === sellerId) {
                toast({ title: "This is your listing", description: "You are the owner of this item." });
                return;
              }
              const type = listing.listing_type || 'product';
              const title = encodeURIComponent(listing.title || '');
              const price = listing.price ? encodeURIComponent(String(listing.price)) : '';
              const itemId = listing.id ? encodeURIComponent(listing.id) : '';
              const image = (activeImg || listing.image_url) ? encodeURIComponent(activeImg || listing.image_url) : '';
              navigate(`/?tab=inbox&chatWith=${sellerId}&tagType=${type}&tagTitle=${title}&tagPrice=${price}&tagId=${itemId}&tagImage=${image}`);
            }}
          >
            <MessageCircle className="h-5 w-5" />
            {isService ? 'Inquire on GGD Platform Chat' : 'Chat & Order on GGD Platform'}
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {waPhone && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white h-12 rounded-2xl gap-2 text-xs sm:text-sm font-bold shadow-md cursor-pointer"
                onClick={() => {
                  const text = isService
                    ? `Hello! I saw your service "${listing.title}" on GGD Ad Network and would like to make an inquiry.`
                    : `Hello! I saw your product "${listing.title}" on GGD Ad Network and would like to place an order.`;
                  window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {isService ? 'WhatsApp Inquiry' : 'WhatsApp Order Now'}
              </Button>
            )}

            {(business?.phone_number || profile?.business_phone) && (
              <Button
                variant="outline"
                className="h-12 rounded-2xl gap-2 text-xs sm:text-sm font-bold border-border/80 shadow-xs cursor-pointer"
                onClick={() => window.open(`tel:${business?.phone_number || profile?.business_phone}`)}
              >
                <Phone className="h-4 w-4 text-orange-500" />
                Call Seller
              </Button>
            )}
          </div>
        </div>

        {/* Business Credentials Card */}
        {bizUrl && (
          <Card className="border border-orange-500/30 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-red-500/5 rounded-3xl overflow-hidden shadow-sm">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {(profile?.business_logo_url || profile?.avatar_url || business?.logo_url) ? (
                  <img
                    loading="lazy"
                    src={profile?.business_logo_url || profile?.avatar_url || business?.logo_url}
                    alt={bizName}
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md">
                    <Store className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Offered by</p>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <h3 className="font-black text-base text-foreground truncate">{bizName}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                    {getEffectiveBusinessDescription(business?.description || profile?.business_description, bizName, category?.name || category?.slug)}
                  </p>
                  {business?.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      {business.address}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => navigate(bizUrl)}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-bold gap-1.5 h-10 px-4 shadow-md cursor-pointer"
              >
                <Store className="h-4 w-4" />
                Visit Storefront
              </Button>
            </CardContent>
          </Card>
        )}

        {/* MORE FROM THIS SELLER */}
        {sellerOtherListings.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
              More from {bizName}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sellerOtherListings.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/product/${item.id}`)}
                  className="text-left rounded-2xl overflow-hidden shadow-xs bg-card border border-border/80 hover:border-orange-500 p-2.5 transition-all active:scale-[0.98] group"
                >
                  <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full bg-orange-500/10 flex items-center justify-center text-orange-600">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold line-clamp-1 group-hover:text-orange-500">{item.title}</p>
                  {item.price && <p className="text-xs font-black text-orange-600 mt-0.5">₦{Number(item.price).toLocaleString()}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MORE IN THIS INDUSTRY */}
        {relatedListings.length > 0 && category && (
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                More in {category.name}
              </h3>
              <Link to={`/industry/${category.slug || category.id}`} className="text-xs font-bold text-orange-600 hover:underline">
                View All {category.name} →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {relatedListings.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/product/${item.id}`)}
                  className="text-left rounded-2xl overflow-hidden shadow-xs bg-card border border-border/80 hover:border-orange-500 p-3 transition-all active:scale-[0.98] flex flex-col justify-between group"
                >
                  <div>
                    <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden mb-2">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold line-clamp-1 group-hover:text-orange-500">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{item.business_profiles?.business_name}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
                    {item.price ? (
                      <span className="text-xs font-black text-orange-600">₦{Number(item.price).toLocaleString()}</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Inquiry</span>
                    )}
                    <span className="text-[10px] font-bold text-orange-600">Details →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sponsored Banner */}
        <div className="pt-4">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mb-2 font-bold">
            Sponsored Partner Adverts
          </p>
          <AdDisplayPreview />
        </div>
      </article>
    </div>
  );
};

export default ProductDetailPage;
