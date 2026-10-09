import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Loader2, MessageCircle, Phone, Globe, Store, 
  ExternalLink, Share2, Crown, ShoppingBag, Play, Package, 
  Briefcase, ChevronRight, MapPin, Sparkles, ShieldCheck, 
  Layers, ArrowRight, Heart 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AdDisplayPreview from '@/components/AdDisplayPreview';
import MetaTags from '@/components/MetaTags';
import BlazingBadge from '@/components/BlazingBadge';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { getIndustryMeta, getEffectiveBusinessDescription } from '@/utils/industryData';
import { ProductPhotoViewerModal } from '@/components/ProductPhotoViewerModal';
import { WhatsAppCheckoutModal } from '@/components/orders/WhatsAppCheckoutModal';
import { DigitalProductCheckoutModal } from '@/components/orders/DigitalProductCheckoutModal';
import { fetchDigitalProductById, DigitalProduct } from '@/services/digitalProductsService';
import { normalizePhone, buildWhatsAppOrderLink, buildWhatsAppLink } from '@/lib/whatsapp';
import { Maximize2, Image as ImageIcon, Wallet, CreditCard } from 'lucide-react';

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
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [digitalProductData, setDigitalProductData] = useState<DigitalProduct | null>(null);
  const [isDigitalCheckoutOpen, setIsDigitalCheckoutOpen] = useState(false);

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
        // Authoritative resolution of digital products
        const digitalProd = await fetchDigitalProductById(id);
        if (digitalProd) {
          setDigitalProductData(digitalProd);
          const synthesizedListing = {
            id: digitalProd.id,
            title: digitalProd.title,
            description: digitalProd.description,
            long_description: digitalProd.long_description,
            price: digitalProd.price,
            image_url: digitalProd.image_url,
            listing_type: 'product',
            is_digital: true,
            is_verified: true,
            payment_methods: digitalProd.payment_methods,
            digital_access_url: digitalProd.digital_access_url,
            access_instructions: digitalProd.access_instructions,
          };
          setListing(synthesizedListing);
          setActiveImg(digitalProd.image_url || null);
          setBusiness({
            id: 'ggd-official',
            business_name: 'GGD Official Store & Admin Hub',
            logo_url: null,
            is_directory_listed: true,
            address: 'Lagos, Nigeria • Official GGD Digital Publishing',
            state: 'Lagos',
          });
          setLoading(false);
          return;
        }
        setLoading(false);
        return;
      }

      setListing(L);
      setActiveImg(L.image_url || null);

      if (L.is_digital || L.id?.startsWith('dp_')) {
        const digitalProd = await fetchDigitalProductById(L.id);
        if (digitalProd) {
          setDigitalProductData(digitalProd);
        }
      }

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
  const rawPhone = business?.phone_number || profile?.business_phone || '';
  const waPhone = normalizePhone(rawPhone);
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
            <FavoriteButton
              item={{
                targetId: listing.id,
                type: isService ? 'service' : 'product',
                title: listing.title,
                subtitle: category?.name,
                description: listing.description || listing.long_description,
                imageUrl: listing.image_url,
                price: listing.price,
                location: business?.address,
                category: category?.name,
                verified: true,
                linkUrl: `/product/${listing.id}`,
                businessName: bizName,
                businessPhone: waPhone || business?.phone_number || profile?.business_phone,
                businessWebsite: profile?.business_website,
              }}
              variant="outline"
              size="sm"
              showLabel
            />
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
        <Card className="overflow-hidden border border-border/80 shadow-lg rounded-3xl relative">
          {/* Overlay Favorite Button on Hero Image */}
          <div className="absolute top-4 right-4 z-20">
            <FavoriteButton
              item={{
                targetId: listing.id,
                type: isService ? 'service' : 'product',
                title: listing.title,
                subtitle: category?.name,
                description: listing.description || listing.long_description,
                imageUrl: listing.image_url,
                price: listing.price,
                location: business?.address,
                category: category?.name,
                verified: true,
                linkUrl: `/product/${listing.id}`,
                businessName: bizName,
                businessPhone: waPhone || business?.phone_number || profile?.business_phone,
                businessWebsite: profile?.business_website,
              }}
              variant="overlay"
              size="lg"
            />
          </div>

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
            <div 
              onClick={() => {
                const idx = gallery.indexOf(activeImg);
                setPhotoViewerIndex(idx >= 0 ? idx : 0);
                setIsPhotoViewerOpen(true);
              }}
              className="w-full bg-slate-900/5 dark:bg-black/40 flex items-center justify-center p-3 relative group cursor-zoom-in"
              title="Click to view full screen photo slider"
            >
              <img
                loading="lazy"
                src={activeImg}
                alt={listing.title}
                className="w-full max-h-[500px] h-auto object-contain rounded-2xl shadow-xs group-hover:scale-[1.01] transition-transform duration-300"
              />
              <div className="absolute bottom-4 right-4 bg-black/75 hover:bg-orange-600 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg opacity-90 group-hover:opacity-100 transition-all">
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Full View Slider ({gallery.length} photos)</span>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white">
              {isService ? <Briefcase className="h-16 w-16 opacity-70" /> : <Package className="h-16 w-16 opacity-70" />}
            </div>
          )}

          {gallery.length > 1 && (
            <div className="flex items-center justify-between gap-2 p-3 bg-card border-t border-border/60">
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                {gallery.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(img)}
                    onDoubleClick={() => {
                      setPhotoViewerIndex(i);
                      setIsPhotoViewerOpen(true);
                    }}
                    className={`flex-shrink-0 h-16 w-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                      activeImg === img ? 'border-orange-500 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img loading="lazy" src={img} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded-sm">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const idx = gallery.indexOf(activeImg);
                  setPhotoViewerIndex(idx >= 0 ? idx : 0);
                  setIsPhotoViewerOpen(true);
                }}
                className="shrink-0 h-9 rounded-xl text-xs font-bold gap-1 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Full Slider</span>
              </Button>
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
          {/* DIRECT PURCHASE BUTTON FOR DIGITAL PRODUCTS */}
          {(digitalProductData || listing?.is_digital) && (
            <div className="space-y-2 p-4 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 border-2 border-orange-500/40 shadow-md animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Instant Digital Delivery
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">Admin-Verified Direct Purchase</span>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white h-14 rounded-2xl gap-2.5 text-base font-black shadow-xl hover:shadow-orange-600/30 cursor-pointer transition-all"
                onClick={() => setIsDigitalCheckoutOpen(true)}
              >
                <ShoppingBag className="h-6 w-6 text-white" />
                <span>Buy Digital Product (Direct Purchase) ⚡</span>
              </Button>

              <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-muted-foreground flex-wrap">
                <span>Accepted Payments:</span>
                {(digitalProductData?.payment_methods === 'wallet_only' || digitalProductData?.payment_methods === 'both' || !digitalProductData) && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30 text-[11px] font-bold gap-1">
                    <Wallet className="h-3 w-3 text-orange-500" /> Wallet Balance
                  </Badge>
                )}
                {(digitalProductData?.payment_methods === 'paystack_only' || digitalProductData?.payment_methods === 'both' || !digitalProductData) && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[11px] font-bold gap-1">
                    <CreditCard className="h-3 w-3 text-blue-500" /> Paystack
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Primary WhatsApp Instant Checkout Button */}
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-14 rounded-2xl gap-2.5 text-base font-black shadow-xl hover:shadow-emerald-600/30 cursor-pointer transition-all animate-in zoom-in-95 duration-200"
            onClick={() => setIsCheckoutModalOpen(true)}
          >
            <MessageCircle className="h-6 w-6 fill-white" />
            <span>{isService ? 'WhatsApp Service Booking & Inquiry' : 'WhatsApp Instant Checkout 🚀'}</span>
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Direct GGD Chat */}
            <Button
              variant="outline"
              className="h-12 rounded-2xl gap-2 text-xs sm:text-sm font-bold border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 shadow-xs cursor-pointer"
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
              <MessageCircle className="h-4 w-4" />
              {isService ? 'Inquire on GGD Chat' : 'Chat on GGD Platform'}
            </Button>

            {(business?.phone_number || profile?.business_phone) ? (
              <Button
                variant="outline"
                className="h-12 rounded-2xl gap-2 text-xs sm:text-sm font-bold border-border/80 shadow-xs cursor-pointer hover:bg-muted"
                onClick={() => window.open(`tel:${business?.phone_number || profile?.business_phone}`)}
              >
                <Phone className="h-4 w-4 text-orange-500" />
                Call Seller ({business?.phone_number || profile?.business_phone})
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-12 rounded-2xl gap-2 text-xs sm:text-sm font-bold border-border/80 shadow-xs cursor-pointer"
                onClick={share}
              >
                <Share2 className="h-4 w-4 text-orange-500" />
                Share Product Link
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

              <div className="flex items-center gap-2">
                <FavoriteButton
                  item={{
                    targetId: business?.id || profile?.user_id || listing?.business_profile_id || 'biz',
                    type: 'business',
                    title: bizName,
                    subtitle: category?.name || 'Verified Merchant Storefront',
                    description: business?.description || profile?.business_description,
                    imageUrl: profile?.business_logo_url || profile?.avatar_url || business?.logo_url,
                    location: business?.address,
                    category: category?.name,
                    verified: true,
                    linkUrl: bizUrl,
                    businessPhone: waPhone || business?.phone_number || profile?.business_phone,
                    businessWebsite: profile?.business_website,
                  }}
                  variant="outline"
                  size="sm"
                  showLabel
                />
                <Button
                  onClick={() => navigate(bizUrl)}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-bold gap-1.5 h-10 px-4 shadow-md cursor-pointer"
                >
                  <Store className="h-4 w-4" />
                  Visit Storefront
                </Button>
              </div>
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

      {/* WhatsApp Checkout Modal */}
      {listing && (
        <WhatsAppCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          product={{
            id: listing.id,
            title: listing.title,
            price: listing.price,
            image_url: activeImg || listing.image_url,
            listing_type: listing.listing_type,
            description: listing.description || listing.long_description,
            user_id: listing.user_id || business?.user_id,
            business_name: bizName,
            business_phone: waPhone || business?.phone_number || profile?.business_phone,
            seller_phone: waPhone || business?.phone_number || profile?.business_phone,
          }}
          sellerInfo={{
            name: bizName,
            phone: waPhone || business?.phone_number || profile?.business_phone,
            business_name: bizName,
            address: business?.address || profile?.business_location,
          }}
          onChatGgd={() => {
            const sellerId = business?.user_id || listing?.user_id || profile?.user_id;
            if (sellerId && currentUser?.id !== sellerId) {
              const type = listing.listing_type || 'product';
              const title = encodeURIComponent(listing.title || '');
              const price = listing.price ? encodeURIComponent(String(listing.price)) : '';
              const itemId = listing.id ? encodeURIComponent(listing.id) : '';
              const image = (activeImg || listing.image_url) ? encodeURIComponent(activeImg || listing.image_url) : '';
              navigate(`/?tab=inbox&chatWith=${sellerId}&tagType=${type}&tagTitle=${title}&tagPrice=${price}&tagId=${itemId}&tagImage=${image}`);
            }
          }}
        />
      )}

      {/* Direct Digital Product Checkout Modal */}
      {(digitalProductData || listing?.is_digital) && (
        <DigitalProductCheckoutModal
          open={isDigitalCheckoutOpen}
          onOpenChange={setIsDigitalCheckoutOpen}
          product={digitalProductData || (listing ? {
            id: listing.id,
            title: listing.title,
            description: listing.description || '',
            long_description: listing.long_description,
            price: Number(listing.price) || 0,
            image_url: listing.image_url || activeImg || '',
            digital_access_url: listing.digital_access_url || 'https://ggdadnetwork.com',
            access_instructions: listing.access_instructions || 'Your digital materials are unlocked.',
            payment_methods: listing.payment_methods || 'both',
            is_active: true,
            is_digital: true,
          } : null)}
        />
      )}

      {/* Full Resolution Photo Slider Modal */}
      {listing && (
        <ProductPhotoViewerModal
          isOpen={isPhotoViewerOpen}
          onClose={() => setIsPhotoViewerOpen(false)}
          images={gallery}
          initialIndex={photoViewerIndex}
          productTitle={listing.title}
          price={listing.price}
          businessName={bizName}
          isVerified={true}
          isService={isService}
          productUrl={window.location.href}
          whatsappPhone={waPhone || business?.phone_number || profile?.business_phone}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
