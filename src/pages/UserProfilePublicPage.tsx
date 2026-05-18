import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MapPin, Award, CheckCircle, Loader2, Briefcase, Users, Phone, Globe, MessageCircle, Crown, Star, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ggdLogo from '@/assets/ggd-logo.png';
import AdDisplayPreview from '@/components/AdDisplayPreview';

const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
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
  const [sitesEnabled, setSitesEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id && !slug) return;
    (async () => {
      // Resolve user_id from slug when using /b/:slug route
      let resolvedId = id;
      if (!resolvedId && slug) {
        const { data: bySlug } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('business_slug', slug)
          .maybeSingle();
        resolvedId = bySlug?.user_id;
      }
      if (!resolvedId) { setLoading(false); return; }
      const [p, s, b, toggle] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, business_name, avatar_url, business_logo_url, business_description, business_category, business_location, business_phone, business_website, business_slug, created_at').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('syndicate_profiles').select('*').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('business_profiles').select('id, business_name, logo_url, hero_image_url, description, is_directory_listed').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('feature_toggles').select('is_enabled').eq('feature_key', 'business_sites').maybeSingle(),
      ]);
      setProfile(p.data);
      setSyndicate(s.data);
      setBusiness(b.data);
      setSitesEnabled(toggle.data?.is_enabled !== false);
      setLoading(false);
    })();
  }, [id, slug]);

  // SEO meta tags
  useEffect(() => {
    if (!profile) return;
    const name = profile.business_name || profile.display_name || 'GGD User';
    const desc = (profile.business_description ||
      `${name}${profile.business_category ? ' — ' + profile.business_category : ''}${profile.business_location ? ' in ' + profile.business_location : ''}. Verified on GGD Ad Network.`).slice(0, 158);
    const img = profile.business_logo_url || profile.avatar_url || `${window.location.origin}${ggdLogo}`;
    const url = window.location.href;
    const title = `${name}${profile.business_category ? ' | ' + profile.business_category : ''} | GGD Network`;

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

    // JSON-LD LocalBusiness
    const ld = {
      '@context': 'https://schema.org',
      '@type': profile.business_category ? 'LocalBusiness' : 'Person',
      name,
      description: desc,
      image: img,
      url,
      ...(profile.business_phone && { telephone: profile.business_phone }),
      ...(profile.business_location && { address: { '@type': 'PostalAddress', addressLocality: profile.business_location } }),
      ...(profile.business_website && { sameAs: [profile.business_website] }),
    };
    let s = document.getElementById('ld-business') as HTMLScriptElement | null;
    if (!s) { s = document.createElement('script'); s.id = 'ld-business'; s.type = 'application/ld+json'; document.head.appendChild(s); }
    s.textContent = JSON.stringify(ld);

    return () => { document.title = 'GGD Ad Network'; };
  }, [profile]);

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

  const name = profile.business_name || profile.display_name || 'User';
  const initials = name.slice(0, 2).toUpperCase();
  const logoImage = profile.business_logo_url || profile.avatar_url;
  const heroBanner = business?.hero_image_url || logoImage;
  const waPhone = (profile.business_phone || '').replace(/[^\d]/g, '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-background dark:to-background">
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-xs">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-6 w-6 rounded-lg" />
            <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GGD Network</span>
          </div>
        </div>
      </header>

      <article className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        {/* Animated pro hero — available to every user */}
        <Card className="overflow-hidden border-0 shadow-2xl animate-fade-in">
          <div className="relative h-52 bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 overflow-hidden">
            {heroBanner && (
              <img src={heroBanner} alt={`${name} hero banner`} className="absolute inset-0 w-full h-full object-cover opacity-40 scale-110 animate-[heroZoom_20s_ease-in-out_infinite_alternate]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <Badge className="absolute top-3 right-3 bg-amber-400 text-amber-950 gap-1 font-bold text-[10px] animate-fade-in">
              <Sparkles className="h-3 w-3" />VERIFIED
            </Badge>
          </div>
          <div className="px-5 pb-5 -mt-14 relative">
            <Avatar className="h-24 w-24 border-4 border-card shadow-xl ring-2 ring-orange-400/40 animate-scale-in">
              <AvatarImage src={logoImage || ''} />
              <AvatarFallback className="bg-orange-500 text-white text-2xl font-black">{initials}</AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-black mt-3 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{name}</h1>
            {profile.business_category && <p className="text-sm text-orange-600 font-semibold">{profile.business_category}</p>}
            {profile.business_location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />{profile.business_location}
              </p>
            )}
            <div className="flex gap-1 flex-wrap mt-3">
              {syndicate && <Badge variant="secondary" className="text-[10px] gap-0.5"><Award className="h-2.5 w-2.5" />Syndicate</Badge>}
              {business?.is_directory_listed && <Badge variant="secondary" className="text-[10px] gap-0.5"><Briefcase className="h-2.5 w-2.5" />Business</Badge>}
              <Badge variant="secondary" className="text-[10px] gap-0.5"><Star className="h-2.5 w-2.5 text-amber-500" />Trusted</Badge>
            </div>
          </div>
        </Card>

        {/* About / description */}
        {profile.business_description && (
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold mb-2 text-foreground">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{profile.business_description}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact & links */}
        {(profile.business_phone || profile.business_website) && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-bold mb-2">Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profile.business_phone && (
                  <Button variant="outline" className="justify-start gap-2 text-xs" onClick={() => window.open(`tel:${profile.business_phone}`)}>
                    <Phone className="h-4 w-4 text-orange-500" />{profile.business_phone}
                  </Button>
                )}
                {waPhone && (
                  <Button className="justify-start gap-2 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(`https://wa.me/${waPhone}`, '_blank')}>
                    <MessageCircle className="h-4 w-4" />WhatsApp
                  </Button>
                )}
                {profile.business_website && (
                  <Button variant="outline" className="justify-start gap-2 text-xs col-span-full" onClick={() => window.open(profile.business_website, '_blank')}>
                    <Globe className="h-4 w-4 text-blue-500" />{profile.business_website}
                  </Button>
                )}
              </div>
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

        {business?.is_directory_listed && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-bold flex items-center gap-2"><Briefcase className="h-4 w-4 text-orange-500" />Business directory</h2>
              <p className="text-sm font-semibold">{business.business_name}</p>
              {business.description && <p className="text-xs text-muted-foreground">{business.description}</p>}
              <Button size="sm" onClick={() => navigate(`/business/${business.id}`)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                View Business Page
              </Button>
            </CardContent>
          </Card>
        )}

        {profile.created_at && (
          <p className="text-center text-[10px] text-muted-foreground">
            Joined {new Date(profile.created_at).toLocaleDateString()} · GGD Ad Network
          </p>
        )}

        {/* Sponsored ad slot — shown on every public profile */}
        <div className="pt-2">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wide mb-2">Sponsored</p>
          <AdDisplayPreview />
        </div>
      </article>
    </div>
  );
};

export default UserProfilePublicPage;
