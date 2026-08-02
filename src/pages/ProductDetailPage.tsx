import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MessageCircle, Phone, Globe, Store, ExternalLink, Share2, Crown, ShoppingBag, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AdDisplayPreview from '@/components/AdDisplayPreview';
import SeoHead from '@/components/SeoHead';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: L } = await (supabase.from('business_listings') as any).select('*').eq('id', id).maybeSingle();
      if (!L) { setLoading(false); return; }
      setListing(L);
      setActiveImg(L.image_url || null);
      const { data: B } = await (supabase.from('business_profiles') as any).select('*').eq('id', L.business_profile_id).maybeSingle();
      setBusiness(B);
      if (B?.user_id) {
        const { data: P } = await supabase.from('profiles').select('display_name, business_name, business_slug, business_phone, business_website, avatar_url, business_logo_url').eq('user_id', B.user_id).maybeSingle();
        setProfile(P);
      }
      setLoading(false);
    })();
  }, [id]);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const share = async () => {
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: listing?.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast({ title: 'Link copied' }); }
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
  if (!listing) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">Product not found</p>
      <Button onClick={goBack} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
    </div>
  );

  const bizName = business?.business_name || profile?.business_name || profile?.display_name || 'Business';
  const bizUrl = profile?.business_slug ? `/b/${profile.business_slug}` : (business?.user_id ? `/user/${business.user_id}` : null);
  const waPhone = (business?.phone_number || profile?.business_phone || '').replace(/[^\d]/g, '');
  const gallery = [listing.image_url, ...(Array.isArray(listing.extra_images) ? listing.extra_images : [])].filter(Boolean);
  const isService = listing.listing_type === 'service';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-background dark:to-background">
      <SeoHead
        type="product"
        title={`${listing.title} — ${bizName}`}
        description={listing.description || listing.long_description || `${isService ? 'Service' : 'Product'} by ${bizName} on GGD Ad Network.`}
        image={listing.image_url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': isService ? 'Service' : 'Product',
          name: listing.title,
          description: listing.description || undefined,
          image: listing.image_url || undefined,
          brand: bizName,
          ...(listing.price != null ? { offers: { '@type': 'Offer', price: listing.price, priceCurrency: 'NGN' } } : {}),
        }}
      />
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent truncate max-w-[50%]">{bizName}</span>
          <Button variant="ghost" size="sm" onClick={share} className="gap-1"><Share2 className="h-4 w-4" />Share</Button>
        </div>
      </header>

      <article className="container mx-auto px-4 py-6 max-w-3xl space-y-5">
        {/* Media */}
        <Card className="overflow-hidden border-0 shadow-xl">
          {listing.video_url ? (
            <div className="aspect-video bg-black">
              {/youtube\.com|youtu\.be/.test(listing.video_url) ? (
                <iframe src={listing.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} className="w-full h-full" allowFullScreen title={listing.title} />
              ) : (
                <video src={listing.video_url} controls className="w-full h-full" poster={listing.image_url || undefined} />
              )}
            </div>
          ) : activeImg ? (
            <img src={activeImg} alt={listing.title} className="w-full aspect-square md:aspect-video object-cover" />
          ) : (
            <div className="w-full aspect-video bg-muted flex items-center justify-center">
              <Store className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {gallery.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {gallery.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImg(img)} className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 ${activeImg === img ? 'border-orange-500' : 'border-transparent'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Title & price */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={isService ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
              {isService ? 'Service' : 'Product'}
            </Badge>
            {listing.is_featured && <Badge className="bg-amber-400 text-amber-950 gap-1"><Crown className="h-3 w-3" />Featured</Badge>}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">{listing.title}</h1>
          {Number(listing.price) > 0 && (
            <p className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              ₦{Number(listing.price).toLocaleString()}
            </p>
          )}
        </div>

        {/* Description */}
        {(listing.long_description || listing.description) && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold mb-2">Details</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {listing.long_description || listing.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {waPhone && (
            <Button className="bg-green-600 hover:bg-green-700 text-white h-12 gap-2 text-sm font-bold"
              onClick={() => window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello, I saw your ad for ${listing.title} and got your contact from GGD Ad Network.`)}`, '_blank')}>
              <MessageCircle className="h-5 w-5" />Order on WhatsApp
            </Button>
          )}
          {(business?.phone_number || profile?.business_phone) && (
            <Button variant="outline" className="h-12 gap-2 text-sm font-bold"
              onClick={() => window.open(`tel:${business?.phone_number || profile?.business_phone}`)}>
              <Phone className="h-5 w-5 text-orange-500" />Call Seller
            </Button>
          )}
        </div>

        {/* Business card */}
        {bizUrl && (
          <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-red-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              {(profile?.business_logo_url || profile?.avatar_url) ? (
                <img src={profile.business_logo_url || profile.avatar_url} alt={bizName} className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Store className="h-7 w-7 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Sold by</p>
                <p className="font-bold text-sm truncate">{bizName}</p>
              </div>
              <Button size="sm" onClick={() => navigate(bizUrl)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white gap-1">
                <ExternalLink className="h-4 w-4" />Visit Site
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="pt-2">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wide mb-2">Sponsored</p>
          <AdDisplayPreview />
        </div>
      </article>
    </div>
  );
};

export default ProductDetailPage;