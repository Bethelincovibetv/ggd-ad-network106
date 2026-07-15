import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, MapPin, Award, CheckCircle, Loader2, Briefcase, Users, Phone, Globe,
  MessageCircle, Star, Sparkles, Store, Facebook, Instagram, Send, ExternalLink, Crown,
  ShoppingBag, Share2, Mail, Play,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ggdLogo from '@/assets/ggd-logo.png';
import AdDisplayPreview from '@/components/AdDisplayPreview';
import { toast } from '@/hooks/use-toast';

const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
};
const setLink = (rel: string, href: string) => {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
};

const UserProfilePublicPage: React.FC = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [syndicate, setSyndicate] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [sitesEnabled, setSitesEnabled] = useState(true);
  const [premiumTier, setPremiumTier] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id && !slug) return;
    (async () => {
      let resolvedId = id;
      if (!resolvedId && slug) {
        const { data: bySlug } = await supabase
          .from('profiles').select('user_id').eq('business_slug', slug).maybeSingle();
        resolvedId = bySlug?.user_id;
      }
      if (!resolvedId) { setLoading(false); return; }
      const [p, s, b, toggle, roleRow] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, business_name, avatar_url, business_logo_url, business_description, business_category, business_location, business_phone, business_website, business_slug, created_at').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('syndicate_profiles').select('*').eq('user_id', resolvedId).maybeSingle(),
        (supabase.from('business_profiles') as any).select('*').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('feature_toggles').select('is_enabled').eq('feature_key', 'business_sites').maybeSingle(),
        (supabase.from('user_roles') as any).select('premium_tier, premium_expires_at').eq('user_id', resolvedId).eq('role', 'premium').maybeSingle(),
      ]);
      setProfile(p.data);
      setSyndicate(s.data);
      setBusiness(b.data);
      setSitesEnabled(toggle.data?.is_enabled !== false);
      const tier = (roleRow as any)?.data?.premium_tier ?? 0;
      const exp = (roleRow as any)?.data?.premium_expires_at;
      const active = !exp || new Date(exp) > new Date();
      setPremiumTier(active ? Number(tier) || 0 : 0);
      if (b.data?.category_id) {
        const { data: cat } = await (supabase.from('business_categories') as any).select('*').eq('id', b.data.category_id).single();
        setCategory(cat);
      }
      if (b.data?.id) {
        const { data: L } = await (supabase.from('business_listings') as any)
          .select('*').eq('business_profile_id', b.data.id).eq('is_active', true)
          .order('is_featured', { ascending: false }).order('created_at', { ascending: false });
        setListings(L || []);
      }
      setLoading(false);
    })();
  }, [id, slug]);

  useEffect(() => {
    if (!profile) return;
    const name = business?.business_name || profile.business_name || profile.display_name || 'GGD User';
    const desc = (business?.description || profile.business_description ||
      `${name}${profile.business_category ? ' — ' + profile.business_category : ''}${profile.business_location ? ' in ' + profile.business_location : ''}. Verified on GGD Ad Network.`).slice(0, 158);
    const img = business?.logo_url || profile.business_logo_url || profile.avatar_url || `${window.location.origin}${ggdLogo}`;
    const url = window.location.href;
    const title = `${name}${(category?.name || profile.business_category) ? ' | ' + (category?.name || profile.business_category) : ''} | GGD Network`;
    document.title = title.slice(0, 60);
    setMeta('description', desc);
    setMeta('og:title', title, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:image', img, 'property');
    setMeta('og:type', 'profile', 'property');
    setMeta('og:url', url, 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', img);
    setLink('canonical', url);
    const ld = {
      '@context': 'https://schema.org',
      '@type': (business || profile.business_category) ? 'LocalBusiness' : 'Person',
      name, description: desc, image: img, url,
      ...((business?.phone_number || profile.business_phone) && { telephone: business?.phone_number || profile.business_phone }),
      ...((business?.address || profile.business_location) && { address: { '@type': 'PostalAddress', streetAddress: business?.address || undefined, addressLocality: profile.business_location || undefined } }),
      ...((business?.website_link || profile.business_website) && { sameAs: [business?.website_link || profile.business_website].filter(Boolean) }),
    };
    let sc = document.getElementById('ld-business') as HTMLScriptElement | null;
    if (!sc) { sc = document.createElement('script'); sc.id = 'ld-business'; sc.type = 'application/ld+json'; document.head.appendChild(sc); }
    sc.textContent = JSON.stringify(ld);
    return () => { document.title = 'GGD Ad Network'; };
  }, [profile, business, category]);

  const share = async () => {
    const url = window.location.href;
    const title = business?.business_name || profile?.business_name || profile?.display_name || 'GGD Site';
    try {
      if ((navigator as any).share) await (navigator as any).share({ title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); }
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );

  if (!profile || !sitesEnabled) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">{!sitesEnabled ? 'Business sites are currently disabled.' : 'User not found'}</p>
      <Button onClick={() => navigate('/')} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
    </div>
  );

  const name = business?.business_name || profile.business_name || profile.display_name || 'User';
  const initials = name.slice(0, 2).toUpperCase();
  const logoImage = business?.logo_url || profile.business_logo_url || profile.avatar_url;
  const heroBanner = business?.hero_image_url || logoImage;
  const description = business?.description || profile.business_description;
  const phone = business?.phone_number || profile.business_phone;
  const website = business?.website_link || profile.business_website;
  const address = business?.address || profile.business_location;
  const catName = category?.name || profile.business_category;
  const waPhone = (phone || '').replace(/[^\d]/g, '');
  const brandedWa = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello, I saw your ad and got your contact from GGD Ad Network.`)}` : null;

  const socials = [
    { key: 'whatsapp', href: business?.whatsapp_link || brandedWa, icon: MessageCircle, label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600' },
    { key: 'whatsapp_group', href: business?.whatsapp_group_link, icon: Users, label: 'WA Group', color: 'bg-green-600 hover:bg-green-700' },
    { key: 'website', href: website, icon: Globe, label: 'Website', color: 'bg-blue-500 hover:bg-blue-600' },
    { key: 'facebook', href: business?.facebook_url, icon: Facebook, label: 'Facebook', color: 'bg-blue-600 hover:bg-blue-700' },
    { key: 'instagram', href: business?.instagram_url, icon: Instagram, label: 'Instagram', color: 'bg-pink-500 hover:bg-pink-600' },
    { key: 'telegram', href: business?.telegram_url, icon: Send, label: 'Telegram', color: 'bg-sky-500 hover:bg-sky-600' },
    { key: 'tiktok', href: business?.tiktok_url, icon: ExternalLink, label: 'TikTok', color: 'bg-gray-800 hover:bg-gray-900' },
  ].filter(s => s.href);

  const featured = listings.filter(l => l.is_featured);
  const rest = listings.filter(l => !l.is_featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-background dark:to-background">
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="gap-1 text-xs">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-6 w-6 rounded-lg" />
            <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GGD Network</span>
          </div>
          <Button variant="ghost" size="sm" onClick={share} className="gap-1 text-xs">
            <Share2 className="h-4 w-4" />Share
          </Button>
        </div>
      </header>

      <article className="container mx-auto px-4 py-6 max-w-3xl space-y-5">
        {/* Cinematic hero */}
        <Card className="overflow-hidden border-0 shadow-2xl animate-fade-in">
          <div className="relative h-56 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 overflow-hidden">
            {heroBanner && (
              <img src={heroBanner} alt={`${name} hero banner`} className="absolute inset-0 w-full h-full object-cover opacity-50 scale-110 animate-[heroZoom_20s_ease-in-out_infinite_alternate]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            {premiumTier >= 1 ? (
              <Badge className="absolute top-3 right-3 bg-[#1DA1F2] text-white gap-1 font-bold text-[10px] shadow-lg" title="Verified premium business">
                <CheckCircle className="h-3 w-3 fill-white text-[#1DA1F2]" />VERIFIED
              </Badge>
            ) : (
              <Badge className="absolute top-3 right-3 bg-amber-400 text-amber-950 gap-1 font-bold text-[10px]">
                <Sparkles className="h-3 w-3" />TRUSTED
              </Badge>
            )}
          </div>
          <div className="px-5 pb-5 -mt-14 relative">
            <Avatar className="h-24 w-24 border-4 border-card shadow-xl ring-2 ring-orange-400/40 animate-scale-in">
              <AvatarImage src={logoImage || ''} />
              <AvatarFallback className="bg-orange-500 text-white text-2xl font-black">{initials}</AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-black mt-3 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent inline-flex items-center gap-1.5">
              {name}
              {premiumTier >= 1 && (
                <CheckCircle className="h-5 w-5 fill-[#1DA1F2] text-white shrink-0" aria-label="Verified" />
              )}
            </h1>
            {catName && <p className="text-sm text-orange-600 font-semibold">{catName}</p>}
            {address && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />{address}
              </p>
            )}
            <div className="flex gap-1 flex-wrap mt-3">
              {syndicate && <Badge variant="secondary" className="text-[10px] gap-0.5"><Award className="h-2.5 w-2.5" />Syndicate</Badge>}
              {business?.is_directory_listed && <Badge variant="secondary" className="text-[10px] gap-0.5"><Briefcase className="h-2.5 w-2.5" />Business</Badge>}
              <Badge variant="secondary" className="text-[10px] gap-0.5"><Star className="h-2.5 w-2.5 text-amber-500" />Trusted</Badge>
              {business?.paystack_enabled && <Badge variant="secondary" className="text-[10px] gap-0.5"><ShoppingBag className="h-2.5 w-2.5 text-green-600" />Accepts Payments</Badge>}
            </div>
          </div>
        </Card>

        {/* About */}
        {description && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold mb-2 text-foreground">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{description}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact primary */}
        {(phone || website || waPhone) && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-bold mb-2">Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {phone && (
                  <Button variant="outline" className="justify-start gap-2 text-xs h-11" onClick={() => window.open(`tel:${phone}`)}>
                    <Phone className="h-4 w-4 text-orange-500" />{phone}
                  </Button>
                )}
                {waPhone && (
                  <Button className="justify-start gap-2 text-xs h-11 bg-green-600 hover:bg-green-700 text-white" onClick={() => brandedWa && window.open(brandedWa, '_blank')}>
                    <MessageCircle className="h-4 w-4" />WhatsApp
                  </Button>
                )}
                {website && (
                  <Button variant="outline" className="justify-start gap-2 text-xs h-11 col-span-full" onClick={() => window.open(website, '_blank')}>
                    <Globe className="h-4 w-4 text-blue-500" />{website}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social channels */}
        {socials.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3">📱 Connect With Us</h2>
              <div className="grid grid-cols-2 gap-2">
                {socials.map(s => (
                  <Button key={s.key} className={`${s.color} text-white justify-start gap-2 h-11`} onClick={() => window.open(s.href!, '_blank')}>
                    <s.icon className="h-4 w-4" />
                    <span className="text-sm">{s.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products / Services / Offers */}
        {listings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
                Products & Offers
              </h2>
              <Badge variant="secondary" className="text-[10px]">{listings.length}</Badge>
            </div>

            {featured.length > 0 && (
              <div className="mb-4 space-y-3">
                {featured.map(listing => (
                  <Card key={listing.id} className="overflow-hidden border-2 border-amber-300 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 cursor-pointer hover:shadow-2xl transition active:scale-[0.99]"
                    onClick={() => navigate(`/product/${listing.id}`)}>
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 px-3 py-1.5 flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-white" />
                        <span className="text-[11px] font-black text-white tracking-wide">FEATURED OFFER</span>
                      </div>
                      {listing.image_url && (
                        <div className="relative">
                          <img src={listing.image_url} alt={listing.title} className="w-full h-48 object-cover" />
                          {listing.video_url && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="h-14 w-14 rounded-full bg-white/90 grid place-items-center shadow-lg">
                                <Play className="h-6 w-6 text-orange-600 ml-0.5" />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-base text-foreground">{listing.title}</h3>
                          <Badge variant="secondary" className="text-[9px] shrink-0">{listing.listing_type === 'service' ? 'Service' : 'Product'}</Badge>
                        </div>
                        {listing.description && <p className="text-sm text-muted-foreground mt-1">{listing.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          {listing.price > 0 ? (
                            <p className="text-xl font-black text-orange-600">₦{Number(listing.price).toLocaleString()}</p>
                          ) : <span />}
                          <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white gap-1 h-10"
                            onClick={(e) => { e.stopPropagation(); navigate(`/product/${listing.id}`); }}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {rest.map(listing => (
                  <Card key={listing.id} className="overflow-hidden border shadow-sm hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98]"
                    onClick={() => navigate(`/product/${listing.id}`)}>
                    <CardContent className="p-0">
                      <div className="relative">
                        {listing.image_url ? (
                          <img src={listing.image_url} alt={listing.title} className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="w-full aspect-square bg-muted flex items-center justify-center">
                            <Store className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        {listing.video_url && (
                          <div className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 grid place-items-center">
                            <Play className="h-3.5 w-3.5 text-white ml-0.5" />
                          </div>
                        )}
                        <Badge className="absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0 h-4">
                          {listing.listing_type === 'service' ? 'Service' : 'Product'}
                        </Badge>
                      </div>
                      <div className="p-2.5">
                        <h3 className="font-bold text-xs text-foreground line-clamp-2 min-h-[2rem]">{listing.title}</h3>
                        {listing.price > 0 && (
                          <p className="text-sm font-black text-orange-600 mt-1">₦{Number(listing.price).toLocaleString()}</p>
                        )}
                        <Button size="sm" className="w-full mt-2 h-8 text-[10px] bg-gradient-to-r from-orange-500 to-red-600 text-white"
                          onClick={(e) => { e.stopPropagation(); navigate(`/product/${listing.id}`); }}>
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {business?.paystack_enabled && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-sm font-bold text-green-800 dark:text-green-300">This business accepts online payments</p>
              <p className="text-xs text-green-600 mt-1">Powered by Paystack</p>
            </CardContent>
          </Card>
        )}

        {syndicate && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" />Syndicate Stats</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                  <p className="text-lg font-black text-foreground">{syndicate.ranking_score || 0}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                  <p className="text-lg font-black text-foreground">{syndicate.tasks_completed || 0}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Verified</p>
                  <p className="text-lg font-black text-foreground">{(syndicate.verified_platforms || []).length}</p>
                </div>
              </div>
              {(syndicate.verified_platforms || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {syndicate.verified_platforms.map((p: string) => (
                    <Badge key={p} variant="secondary" className="text-[10px] gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5 text-green-500" />{p}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {profile.created_at && (
          <p className="text-center text-[10px] text-muted-foreground">
            Joined {new Date(profile.created_at).toLocaleDateString()} · GGD Ad Network
          </p>
        )}

        <div className="pt-2">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wide mb-2">Sponsored</p>
          <AdDisplayPreview />
        </div>
      </article>
    </div>
  );
};

export default UserProfilePublicPage;
