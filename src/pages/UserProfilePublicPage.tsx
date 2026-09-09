import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, MapPin, Award, CheckCircle, Loader2, Briefcase, Users, Phone, Globe,
  MessageCircle, Star, Sparkles, Store, Facebook, Instagram, Send, ExternalLink, Crown,
  ShoppingBag, Share2, Mail, Play, Menu, X, Home, Info, ShieldCheck, ChevronRight,
  Clock, PackageCheck, Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ggdLogo from '@/assets/ggd-logo.png';
import AdDisplayPreview from '@/components/AdDisplayPreview';
import { toast } from '@/hooks/use-toast';
import { WEBSITE_TEMPLATES, getWebsiteTemplate, DEFAULT_TEMPLATE_ID } from '@/utils/websiteTemplates';

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
  const [listingFilter, setListingFilter] = useState<'all' | 'products' | 'services'>('all');
  const [sitesEnabled, setSitesEnabled] = useState(true);
  const [premiumTier, setPremiumTier] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'catalog' | 'about' | 'contact' | 'socials' | 'trust'>('overview');
  const [templateKey, setTemplateKey] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [showAdminTemplatePicker, setShowAdminTemplatePicker] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const activeTemplate = getWebsiteTemplate(templateKey);

  const scrollToSection = (sectionId: 'overview' | 'catalog' | 'about' | 'contact' | 'socials' | 'trust') => {
    setActiveSection(sectionId);
    setSidebarOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleChatDirect = (item?: any) => {
    if (!profile?.user_id) return;
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to chat directly with this business on GGD.",
      });
      navigate('/?auth=signin');
      return;
    }

    let url = `/?tab=inbox&chatWith=${profile.user_id}`;
    if (item) {
      const type = item.listing_type || 'product';
      const title = encodeURIComponent(item.title || '');
      const price = item.price ? encodeURIComponent(String(item.price)) : '';
      const id = item.id ? encodeURIComponent(item.id) : '';
      const image = item.image_url ? encodeURIComponent(item.image_url) : '';
      url += `&tagType=${type}&tagTitle=${title}&tagPrice=${price}&tagId=${id}&tagImage=${image}`;
    }
    navigate(url);
  };

  const handleAdminSaveTemplate = async (newKey: string, setAsDefault = false) => {
    if (!isAdmin) return;
    setSavingTemplate(true);
    try {
      if (setAsDefault) {
        await supabase.from('app_settings').upsert({
          key: 'default_business_website_template',
          value: newKey
        }, { onConflict: 'key' });
        toast({ title: 'Success', description: `Saved ${WEBSITE_TEMPLATES[newKey]?.name} as Network Default Template!` });
      } else if (profile?.user_id) {
        await supabase.from('app_settings').upsert({
          key: `biz_template_${profile.user_id}`,
          value: newKey
        }, { onConflict: 'key' });
        toast({ title: 'Success', description: `Applied ${WEBSITE_TEMPLATES[newKey]?.name} to this business website!` });
      }
      setTemplateKey(newKey);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not save template' });
    } finally {
      setSavingTemplate(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setCurrentUser(data.user);
      if (data.user) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle();
        setIsAdmin(!!roleData);
      }
    });
  }, []);

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
      const [p, s, b, toggle, roleRow, defaultTplRes, userTplRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, business_name, avatar_url, business_logo_url, business_description, business_category, business_location, business_phone, business_website, business_slug, created_at').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('syndicate_profiles').select('*').eq('user_id', resolvedId).maybeSingle(),
        (supabase.from('business_profiles') as any).select('*').eq('user_id', resolvedId).maybeSingle(),
        supabase.from('feature_toggles').select('is_enabled').eq('feature_key', 'business_sites').maybeSingle(),
        (supabase.from('user_roles') as any).select('premium_tier, premium_expires_at').eq('user_id', resolvedId).eq('role', 'premium').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'default_business_website_template').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', `biz_template_${resolvedId}`).maybeSingle(),
      ]);
      setProfile(p.data);
      setSyndicate(s.data);
      setBusiness(b.data);
      setSitesEnabled(toggle.data?.is_enabled !== false);
      const tier = (roleRow as any)?.data?.premium_tier ?? 0;
      const exp = (roleRow as any)?.data?.premium_expires_at;
      const active = !exp || new Date(exp) > new Date();
      setPremiumTier(active ? Number(tier) || 0 : 0);

      // Determine template: URL query override > user-specific template > network default > fallback
      const urlParams = new URLSearchParams(window.location.search);
      const previewTpl = urlParams.get('template');
      const resolvedTpl = previewTpl || userTplRes.data?.value || defaultTplRes.data?.value || DEFAULT_TEMPLATE_ID;
      setTemplateKey(resolvedTpl);

      if (b.data?.category_id) {
        const { data: cat } = await (supabase.from('business_categories') as any).select('*').eq('id', b.data.category_id).single();
        setCategory(cat);
      }
      if (b.data?.id || resolvedId) {
        let query = (supabase.from('business_listings') as any).select('*');
        if (b.data?.id && resolvedId) {
          query = query.or(`business_profile_id.eq.${b.data.id},user_id.eq.${resolvedId}`);
        } else if (b.data?.id) {
          query = query.eq('business_profile_id', b.data.id);
        } else {
          query = query.eq('user_id', resolvedId);
        }
        const { data: L } = await query
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });
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
    const title = `${name}${(category?.name || profile.business_category) ? ' | ' + (category?.name || profile.business_category) : ''} | Official Website`;
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
    const title = business?.business_name || profile?.business_name || profile?.display_name || 'Official Website';
    try {
      if ((navigator as any).share) await (navigator as any).share({ title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Website link copied to clipboard!' }); }
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-500">Loading business site...</p>
      </div>
    </div>
  );

  if (!profile || !sitesEnabled) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-800 p-4">
      <Store className="h-12 w-12 text-slate-400" />
      <p className="text-slate-600 text-center font-medium">{!sitesEnabled ? 'Business sites are currently disabled by network administrator.' : 'Business storefront not found.'}</p>
      <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2">
        <ArrowLeft className="h-4 w-4" /> Return to GGD Home
      </Button>
    </div>
  );

  const name = business?.business_name || profile.business_name || profile.display_name || 'Enterprise Business';
  const initials = name.slice(0, 2).toUpperCase();
  const logoImage = business?.logo_url || profile.business_logo_url || profile.avatar_url;
  const heroBanner = business?.hero_image_url || logoImage;
  const description = business?.description || profile.business_description;
  const phone = business?.phone_number || profile.business_phone;
  const website = business?.website_link || profile.business_website;
  const address = business?.address || profile.business_location;
  const catName = category?.name || profile.business_category;
  const waPhone = (phone || '').replace(/[^\d]/g, '');
  const brandedWa = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${name}, I saw your official website on GGD and would like to inquire about your offers.`)}` : null;

  const socials = [
    { key: 'whatsapp', href: business?.whatsapp_link || brandedWa, icon: MessageCircle, label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600' },
    { key: 'whatsapp_group', href: business?.whatsapp_group_link, icon: Users, label: 'WA Community', color: 'bg-green-600 hover:bg-green-700' },
    { key: 'website', href: website, icon: Globe, label: 'Official Website', color: 'bg-blue-600 hover:bg-blue-700' },
    { key: 'facebook', href: business?.facebook_url, icon: Facebook, label: 'Facebook', color: 'bg-blue-700 hover:bg-blue-800' },
    { key: 'instagram', href: business?.instagram_url, icon: Instagram, label: 'Instagram', color: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' },
    { key: 'telegram', href: business?.telegram_url, icon: Send, label: 'Telegram Channel', color: 'bg-sky-500 hover:bg-sky-600' },
    { key: 'tiktok', href: business?.tiktok_url, icon: ExternalLink, label: 'TikTok', color: 'bg-zinc-800 hover:bg-zinc-700' },
  ].filter(s => s.href);

  const productCount = listings.filter(l => l.listing_type !== 'service').length;
  const serviceCount = listings.filter(l => l.listing_type === 'service').length;

  const filteredListings = listings.filter(l => {
    if (listingFilter === 'products') return l.listing_type !== 'service';
    if (listingFilter === 'services') return l.listing_type === 'service';
    return true;
  });

  const featured = filteredListings.filter(l => l.is_featured);
  const rest = filteredListings.filter(l => !l.is_featured);

  const navMenuItems = [
    { id: 'overview' as const, label: 'Home Overview', icon: Home },
    { id: 'catalog' as const, label: 'Products & Services', icon: ShoppingBag, count: listings.length },
    { id: 'about' as const, label: 'About Business', icon: Info },
    { id: 'contact' as const, label: 'Contact & Location', icon: Phone },
    { id: 'socials' as const, label: 'Social Channels', icon: Globe, count: socials.length },
    { id: 'trust' as const, label: 'Trust & Verification', icon: ShieldCheck },
  ];

  return (
    <div className={`min-h-screen ${activeTemplate.canvasBg} flex flex-col selection:bg-orange-500 selection:text-white transition-colors duration-200`}>
      
      {/* Admin Template Bar: lets Admin select and preview website templates */}
      {isAdmin && (
        <div className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
              <Palette className="h-4 w-4" />
            </div>
            <span className="font-bold text-xs text-slate-200">Admin Website Template:</span>
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-xs font-semibold text-orange-300 flex items-center gap-1.5 border border-white/10">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeTemplate.swatchPrimary }} />
              {activeTemplate.name}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {Object.values(WEBSITE_TEMPLATES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleAdminSaveTemplate(t.id, false)}
                disabled={savingTemplate}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  templateKey === t.id
                    ? 'bg-orange-500 text-white border-orange-400 shadow-sm'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/15'
                }`}
                title={t.subtitle}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.swatchPrimary }} />
                <span>{t.name.replace(' (Default)', '')}</span>
              </button>
            ))}

            <Button
              size="sm"
              disabled={savingTemplate}
              onClick={() => handleAdminSaveTemplate(templateKey, true)}
              className="h-8 px-3 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl shadow"
              title="Save this template as default for all new/unconfigured business websites"
            >
              Set as Platform Default
            </Button>
          </div>
        </div>
      )}

      {/* Top Mobile Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0 h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 rounded-lg border border-orange-200 shrink-0 shadow-xs">
              <AvatarImage src={logoImage || ''} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1">
                {name}
                {premiumTier >= 1 && <CheckCircle className={`h-3.5 w-3.5 ${activeTemplate.verifiedIconColor}`} />}
              </h1>
              <span className={`text-[10px] ${activeTemplate.accentText} font-semibold truncate block`}>{catName || 'Verified Store'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={share} 
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-9 w-9 rounded-xl"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold gap-1.5 h-9 px-3 rounded-xl shadow-xs"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>Menu</span>
          </Button>
        </div>
      </header>

      {/* Main Website Wrapper with Desktop Sidebar and Main Content Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ======================================================== */}
        {/* CUSTOM WEBSITE SIDEBAR NAVIGATION MENU                    */}
        {/* ======================================================== */}
        <aside 
          className={`
            fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-full lg:h-screen
            w-80 sm:w-84 lg:w-80 shrink-0
            ${activeTemplate.sidebarBg} border-r ${activeTemplate.sidebarBorder}
            flex flex-col justify-between
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto shadow-xs
          `}
        >
          {/* Top Brand & Profile Badge */}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div 
                onClick={() => navigate('/')} 
                className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
              >
                <img src={ggdLogo} alt="GGD" className="h-5 w-5 rounded-md" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">GGD Network</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(false)} 
                className="lg:hidden text-slate-400 hover:text-slate-700 h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-start gap-3.5 pt-1">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16 rounded-2xl border-2 border-white shadow-md ring-2 ring-orange-400/30">
                  <AvatarImage src={logoImage || ''} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 text-white text-xl font-black">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {premiumTier >= 1 && (
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
                    <CheckCircle className={`h-4 w-4 ${activeTemplate.verifiedIconColor}`} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-slate-900 leading-tight truncate" title={name}>
                  {name}
                </h2>
                {catName && (
                  <p className={`text-xs font-bold ${activeTemplate.accentText} mt-0.5 truncate`}>{catName}</p>
                )}
                {address && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="truncate">{address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-bold text-[11px]">Open for Inquiries</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">Verified Partner</span>
            </div>
          </div>

          {/* Navigation Links Menu */}
          <nav className="p-4 flex-1 space-y-1.5">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Website Navigation
            </p>
            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold
                    transition-all duration-200 group text-left
                    ${isActive 
                      ? activeTemplate.navActive 
                      : activeTemplate.navInactive}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : `${activeTemplate.accentText} group-hover:scale-110 transition-transform`}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {item.count}
                      </span>
                    )}
                    <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Direct Action Deck in Sidebar */}
          <div className="p-4 border-t border-slate-100 space-y-2.5 bg-slate-50/70">
            <p className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Direct Contact
            </p>
            
            {/* Direct GGD Chat */}
            {profile?.user_id && (
              <Button
                onClick={() => { setSidebarOpen(false); handleChatDirect(); }}
                className={`w-full ${activeTemplate.primaryBtn} text-xs h-11 rounded-xl gap-2`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat Directly on GGD</span>
              </Button>
            )}

            {/* WhatsApp Direct */}
            {brandedWa && (
              <Button
                onClick={() => window.open(brandedWa, '_blank')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-xs"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Business</span>
              </Button>
            )}

            {/* Call Button */}
            {phone && (
              <Button
                variant="outline"
                onClick={() => window.open(`tel:${phone}`)}
                className="w-full border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs h-9 rounded-xl gap-2 shadow-xs"
              >
                <Phone className={`h-3.5 w-3.5 ${activeTemplate.accentText}`} />
                <span>Call {phone}</span>
              </Button>
            )}

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <button 
                onClick={share} 
                className="hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" /> Share Website
              </button>
              <button 
                onClick={() => navigate('/')} 
                className="hover:text-orange-600 flex items-center gap-1 transition-colors font-medium"
              >
                GGD Network <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MAIN WEBSITE STAGE CANVAS                                */}
        {/* ======================================================== */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 space-y-12 max-w-5xl mx-auto w-full">
          
          {/* SECTION 1: HERO OVERVIEW */}
          <section id="overview" className="scroll-mt-6">
            <Card className={`${activeTemplate.cardBg} ${activeTemplate.cardBorder} overflow-hidden rounded-3xl shadow-sm relative border`}>
              {/* Hero Banner Image with dynamic gradient overlay */}
              <div className={`relative h-60 sm:h-76 md:h-88 w-full bg-gradient-to-br ${activeTemplate.heroCoverGradient} overflow-hidden`}>
                {heroBanner ? (
                  <img 
                    src={heroBanner} 
                    alt={name} 
                    className="w-full h-full object-cover opacity-85 scale-105 hover:scale-110 transition-transform duration-1000 ease-out" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600">
                    <Store className="h-24 w-24 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
                
                {/* Badges on Hero Banner */}
                <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap">
                  {premiumTier >= 1 ? (
                    <Badge className="bg-sky-500 text-white gap-1.5 font-bold text-xs py-1 px-3 shadow-md border-0">
                      <CheckCircle className="h-3.5 w-3.5 fill-white text-sky-500" /> Verified Business
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-400 text-amber-950 gap-1.5 font-bold text-xs py-1 px-3 border-0 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" /> Trusted Merchant
                    </Badge>
                  )}
                  {business?.paystack_enabled && (
                    <Badge className="bg-emerald-600 text-white gap-1 font-bold text-xs py-1 px-2.5 border-0 shadow-sm">
                      <ShoppingBag className="h-3.5 w-3.5" /> Online Payments
                    </Badge>
                  )}
                </div>
              </div>

              {/* Business Identity and Introduction Info */}
              <div className="p-6 sm:p-8 md:p-10 -mt-16 sm:-mt-20 relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-white shadow-xl ring-2 ring-orange-400/40 bg-white">
                      <AvatarImage src={logoImage || ''} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-3xl font-black">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="pb-1">
                      <h1 className={`text-2xl sm:text-4xl font-black ${activeTemplate.headingText} tracking-tight flex items-center gap-2`}>
                        {name}
                        {premiumTier >= 1 && (
                          <CheckCircle className={`h-6 w-6 ${activeTemplate.verifiedIconColor} shrink-0`} />
                        )}
                      </h1>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 mt-1 flex-wrap font-medium">
                        {catName && <span className={`${activeTemplate.accentText} font-bold`}>{catName}</span>}
                        {catName && address && <span>•</span>}
                        {address && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3.5 w-3.5 text-red-500" /> {address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Buttons */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                      onClick={() => handleChatDirect()}
                      className={`${activeTemplate.primaryBtn} text-xs sm:text-sm h-11 px-5 rounded-xl gap-2`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat on GGD</span>
                    </Button>
                    {brandedWa && (
                      <Button
                        onClick={() => window.open(brandedWa, '_blank')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs sm:text-sm h-11 px-4 rounded-xl gap-2 shadow-xs"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={share}
                      className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm h-11 px-3 rounded-xl gap-1.5 shadow-xs"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Key Highlights Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                  <div className={`${activeTemplate.statCardBg} rounded-2xl p-3 text-center border ${activeTemplate.statCardBorder}`}>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Catalog</p>
                    <p className={`text-lg sm:text-xl font-black ${activeTemplate.headingText} mt-0.5`}>{listings.length} Listings</p>
                  </div>
                  <div className={`${activeTemplate.statCardBg} rounded-2xl p-3 text-center border ${activeTemplate.statCardBorder}`}>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Satisfaction</p>
                    <p className="text-lg sm:text-xl font-black text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-current" /> 4.9 / 5.0
                    </p>
                  </div>
                  <div className={`${activeTemplate.statCardBg} rounded-2xl p-3 text-center border ${activeTemplate.statCardBorder}`}>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Response</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 mt-0.5">&lt; 15 mins</p>
                  </div>
                  <div className={`${activeTemplate.statCardBg} rounded-2xl p-3 text-center border ${activeTemplate.statCardBorder}`}>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Accreditation</p>
                    <p className={`text-lg sm:text-xl font-black ${activeTemplate.accentText} mt-0.5`}>Verified</p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* SECTION 2: PRODUCTS & SERVICES CATALOG */}
          <section id="catalog" className="scroll-mt-24 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${activeTemplate.statCardBg} ${activeTemplate.accentText} border ${activeTemplate.statCardBorder}`}>
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black ${activeTemplate.headingText} tracking-tight`}>Products & Services</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Direct commercial catalog and verified client solutions</p>
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              {productCount > 0 && serviceCount > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setListingFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      listingFilter === 'all' 
                        ? `${activeTemplate.primaryBtn}` 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({listings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingFilter('products')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      listingFilter === 'products' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Products ({productCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingFilter('services')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      listingFilter === 'services' 
                        ? 'bg-purple-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Services ({serviceCount})
                  </button>
                </div>
              )}
            </div>

            {/* Featured Spotlight Offers */}
            {featured.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
                  <Crown className="h-4 w-4" /> Featured Spotlight
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {featured.map((listing) => (
                    <Card 
                      key={listing.id}
                      className="bg-white border-2 border-amber-300 rounded-3xl overflow-hidden hover:border-amber-500 transition-all shadow-md group cursor-pointer"
                      onClick={() => navigate(`/product/${listing.id}`)}
                    >
                      <div className="relative h-52 bg-slate-100 overflow-hidden">
                        {listing.image_url ? (
                          <img 
                            src={listing.image_url} 
                            alt={listing.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Store className="h-16 w-16 text-slate-300" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Crown className="h-3 w-3" /> Featured {listing.listing_type === 'service' ? 'Service' : 'Product'}
                        </div>
                        {listing.video_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                            <div className="h-12 w-12 rounded-full bg-white/95 text-orange-600 flex items-center justify-center shadow-lg">
                              <Play className="h-5 w-5 ml-0.5 fill-current" />
                            </div>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-5 space-y-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                            {listing.title}
                          </h3>
                          {listing.description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {listing.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Pricing</span>
                            {Number(listing.price) > 0 ? (
                              <p className="text-xl font-black text-amber-600">
                                {listing.listing_type === 'service' ? 'From ' : ''}₦{Number(listing.price).toLocaleString()}
                              </p>
                            ) : (
                              <p className="text-xs font-bold text-slate-600">Quote on Request</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); handleChatDirect(listing); }}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 font-bold text-xs h-10 px-3 rounded-xl gap-1 shadow-xs"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> Inquire
                            </Button>
                            <Button
                              size="sm"
                              className={`${activeTemplate.primaryBtn} text-xs h-10 px-3.5 rounded-xl`}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Catalog Grid */}
            {rest.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {rest.map((listing) => (
                  <Card 
                    key={listing.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-lg transition-all group flex flex-col justify-between cursor-pointer shadow-xs"
                    onClick={() => navigate(`/product/${listing.id}`)}
                  >
                    <div className="relative h-44 bg-slate-100 overflow-hidden">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <Store className="h-12 w-12 text-slate-300" />
                        </div>
                      )}
                      <Badge className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur text-slate-800 text-[10px] border border-slate-200 font-bold shadow-xs">
                        {listing.listing_type === 'service' ? 'Service' : 'Product'}
                      </Badge>
                      {listing.video_url && (
                        <div className="absolute top-2.5 right-2.5 bg-orange-600 text-white p-1 rounded-full shadow">
                          <Play className="h-3 w-3 fill-current" />
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {listing.title}
                        </h4>
                        {listing.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {listing.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] text-slate-400 font-medium">Price</span>
                          {Number(listing.price) > 0 ? (
                            <span className={`text-base font-black ${activeTemplate.accentText}`}>
                              {listing.listing_type === 'service' ? 'From ' : ''}₦{Number(listing.price).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-600">Quote on Request</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleChatDirect(listing); }}
                            className="w-full border-slate-200 bg-white hover:bg-orange-50 text-orange-600 font-bold text-[11px] h-9 rounded-xl gap-1 shadow-xs"
                          >
                            <MessageCircle className="h-3 w-3" /> Inquire
                          </Button>
                          <Button
                            size="sm"
                            className={`w-full ${activeTemplate.primaryBtn} text-[11px] h-9 rounded-xl`}
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : featured.length === 0 && (
              <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
                <ShoppingBag className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No active listings in this category</p>
                <p className="text-xs text-slate-500 mt-1">Please check back soon or chat directly with the business.</p>
              </div>
            )}
          </section>

          {/* SECTION 3: ABOUT THE BUSINESS */}
          <section id="about" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${activeTemplate.headingText} tracking-tight`}>About {name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Corporate profile, background, and service pledge</p>
              </div>
            </div>

            <Card className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {description || `${name} is an officially accredited commercial enterprise on GGD Ad Network, committed to delivering verified products and top-quality professional services across Nigeria and beyond.`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Industry Category</span>
                  <span className="text-slate-900 font-bold text-sm">{catName || 'Commercial Enterprise'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Operational Base</span>
                  <span className="text-slate-900 font-bold text-sm">{address || 'Nigeria'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Member Since</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Verified GGD Member'}
                  </span>
                </div>
              </div>
            </Card>
          </section>

          {/* SECTION 4: CONTACT & LOCATION */}
          <section id="contact" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${activeTemplate.headingText} tracking-tight`}>Contact & Location</h2>
                <p className="text-xs text-slate-500 mt-0.5">Reach our dedicated sales, service, and inquiry desk</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone Card */}
              {phone && (
                <Card 
                  onClick={() => window.open(`tel:${phone}`)}
                  className="bg-white border border-slate-200 hover:border-orange-400 rounded-2xl p-5 cursor-pointer transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Telephone</span>
                      <p className="text-base font-black text-slate-900 truncate">{phone}</p>
                      <span className="text-xs text-orange-600 font-semibold">Click to dial directly</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* WhatsApp Card */}
              {waPhone && (
                <Card 
                  onClick={() => brandedWa && window.open(brandedWa, '_blank')}
                  className="bg-white border border-slate-200 hover:border-green-500 rounded-2xl p-5 cursor-pointer transition-all group shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">WhatsApp Business</span>
                      <p className="text-base font-black text-slate-900 truncate">{phone || 'Instant Chat'}</p>
                      <span className="text-xs text-green-600 font-semibold">Send verified inquiry</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Official Website Card */}
              {website && (
                <Card 
                  onClick={() => window.open(website, '_blank')}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 cursor-pointer transition-all group sm:col-span-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Corporate Web Portal</span>
                        <p className="text-base font-black text-slate-900 truncate">{website}</p>
                        <span className="text-xs text-blue-600 font-semibold">Open external website</span>
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-slate-400 group-hover:text-slate-800" />
                  </div>
                </Card>
              )}

              {/* Physical Location Address */}
              {address && (
                <Card className="bg-white border border-slate-200 rounded-2xl p-5 sm:col-span-2 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Registered Address</span>
                      <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">{address}</p>
                      <p className="text-xs text-slate-500 mt-1">Available for local dispatch, order pickup, and in-person consultations.</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </section>

          {/* SECTION 5: SOCIAL CHANNELS */}
          {socials.length > 0 && (
            <section id="socials" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/80">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${activeTemplate.headingText} tracking-tight`}>Social Channels & Community</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Follow and engage with {name} across digital networks</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {socials.map((s) => (
                  <Button
                    key={s.key}
                    onClick={() => window.open(s.href!, '_blank')}
                    className={`${s.color} text-white font-bold justify-start gap-3 h-12 rounded-xl shadow-xs`}
                  >
                    <s.icon className="h-5 w-5" />
                    <span className="text-sm">{s.label}</span>
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 6: TRUST, ACCREDITATION & PAYMENTS */}
          <section id="trust" className="scroll-mt-24 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-2xl font-black ${activeTemplate.headingText} tracking-tight`}>Accreditation & Trust</h2>
                <p className="text-xs text-slate-500 mt-0.5">Verification status and supported transaction channels</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {business?.paystack_enabled && (
                <Card className="bg-gradient-to-br from-emerald-50/70 via-white to-white border border-emerald-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Online Payments Enabled</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        This store accepts secure debit card, bank transfer, and USSD payments powered by Paystack.
                      </p>
                      <Badge className="mt-3 bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                        Paystack Verified
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}

              {syndicate && (
                <Card className="bg-gradient-to-br from-purple-50/70 via-white to-white border border-purple-200 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-black text-slate-900">Syndicate Promoter Verified</h3>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div className="bg-purple-50/70 rounded-lg p-2 border border-purple-100">
                          <p className="text-[9px] text-purple-700 uppercase font-bold">Score</p>
                          <p className="text-sm font-black text-slate-900">{syndicate.ranking_score || 0}</p>
                        </div>
                        <div className="bg-purple-50/70 rounded-lg p-2 border border-purple-100">
                          <p className="text-[9px] text-purple-700 uppercase font-bold">Tasks</p>
                          <p className="text-sm font-black text-slate-900">{syndicate.tasks_completed || 0}</p>
                        </div>
                        <div className="bg-purple-50/70 rounded-lg p-2 border border-purple-100">
                          <p className="text-[9px] text-purple-700 uppercase font-bold">Channels</p>
                          <p className="text-sm font-black text-slate-900">{(syndicate.verified_platforms || []).length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Network Security Guarantee Card */}
              <Card className="bg-gradient-to-br from-blue-50/70 via-white to-white border border-blue-200 rounded-2xl p-6 sm:col-span-2 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">GGD Verified Business Profile</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Identity, commercial phone lines, and corporate profiles are periodically monitored on GGD Ad Network to protect buyers and foster authentic commercial growth across Nigerian commerce.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Sponsored Ad Banner & Network Footer */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
              Sponsored Advertisement
            </p>
            <AdDisplayPreview />
            
            <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-100 space-y-1">
              <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
              <p className="text-[11px]">
                Hosted on <span className="text-orange-600 font-semibold cursor-pointer" onClick={() => navigate('/')}>GGD Ad Network</span> · Business ID: {profile.user_id.slice(0, 8)}...
              </p>
            </footer>
          </div>

        </main>
      </div>

      {/* Floating Chat Launcher on mobile/desktop */}
      {profile?.user_id && (
        <aside aria-label="Chat with business" className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => handleChatDirect()}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl ${activeTemplate.primaryBtn} text-xs sm:text-sm shadow-xl hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer ring-2 ring-white`}
          >
            <div className="relative">
              <MessageCircle className="h-5 w-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </div>
            <span className="truncate max-w-[140px] sm:max-w-[180px]">Chat with {name}</span>
          </button>
        </aside>
      )}
    </div>
  );
};

export default UserProfilePublicPage;
