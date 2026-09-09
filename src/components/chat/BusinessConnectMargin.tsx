import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap, Briefcase, ShoppingBag, Store, Sparkles, CheckCircle2,
  ExternalLink, Phone, MessageSquare, ChevronRight, HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessConnectMarginProps {
  businessUserId: string;
  onApplyPrompt?: (promptText: string) => void;
  className?: string;
  isCompact?: boolean;
}

export const BusinessConnectMargin: React.FC<BusinessConnectMarginProps> = ({
  businessUserId,
  onApplyPrompt,
  className = '',
  isCompact = false,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [bizProfile, setBizProfile] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [productsCount, setProductsCount] = useState<number>(0);
  const [servicesCount, setServicesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessUserId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        // Fetch user profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, business_name, display_name, avatar_url, business_logo_url, business_phone, whatsapp_number, bio')
          .eq('user_id', businessUserId)
          .maybeSingle();

        // Fetch business_profiles if exists
        const { data: bProf } = await (supabase.from('business_profiles') as any)
          .select('*, business_categories(name)')
          .eq('user_id', businessUserId)
          .maybeSingle();

        // Fetch listings to see if they offer products or services
        const { data: listings } = await (supabase.from('business_listings') as any)
          .select('id, title, listing_type, price')
          .eq('user_id', businessUserId)
          .eq('is_active', true);

        if (!mounted) return;

        setProfile(prof || null);
        setBizProfile(bProf || null);
        if (bProf?.business_categories?.name) {
          setCategoryName(bProf.business_categories.name);
        }

        const pCount = (listings || []).filter((l: any) => l.listing_type !== 'service').length;
        const sCount = (listings || []).filter((l: any) => l.listing_type === 'service').length;
        setProductsCount(pCount);
        setServicesCount(sCount);
      } catch (err) {
        console.error('Failed to load business connect context:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [businessUserId]);

  if (!businessUserId || loading) return null;

  const displayName = bizProfile?.business_name || profile?.business_name || profile?.display_name || 'this business';
  const bio = bizProfile?.description || profile?.bio || '';
  const bioLower = (bio + ' ' + (categoryName || '') + ' ' + displayName).toLowerCase();

  // Intelligent domain detection:
  const isEducation =
    /educat|school|academy|tutor|course|lesson|learn|train|class|study|student|curriculum|mentor|lecture/.test(
      bioLower
    );
  const isServiceOriented =
    servicesCount > 0 ||
    /service|consult|agency|design|develop|legal|repair|clean|cater|logistic|account|marketing|photo|video|mechanic/.test(
      bioLower
    );
  const isProductOriented =
    productsCount > 0 ||
    /product|shop|store|sell|buy|fashion|cloth|wear|shoe|gadget|phone|jewel|food|bakery|provision|retail|wholesale/.test(
      bioLower
    );

  // Recommendation strategy
  let typeLabel = 'Accredited Partner';
  let Icon = Store;
  let themeColor = 'from-orange-500 to-amber-500';
  let badgeColor = 'bg-orange-500/15 text-orange-600 border-orange-500/30';
  let recommendationTitle = 'Have you connected with this business?';
  let recommendationDesc = `Connect directly with ${displayName} to explore offers, partner up, or arrange transactions.`;
  let quickPrompts: { label: string; text: string }[] = [];

  if (isEducation) {
    typeLabel = 'Education & Training';
    Icon = GraduationCap;
    themeColor = 'from-indigo-600 to-purple-600';
    badgeColor = 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30';
    recommendationTitle = 'Looking for Education & Training?';
    recommendationDesc = `${displayName} is involved in education and training. Inquire about available courses, certifications, or educational guidance.`;
    quickPrompts = [
      {
        label: '🎓 Inquire about Courses & Tuition',
        text: `Hello ${displayName}! I saw that you provide educational training. Can you please share details on available courses, schedule, and fees?`,
      },
      {
        label: '📚 Request Syllabus / Curriculum',
        text: `Hi ${displayName}, I would like to review the syllabus and training requirements for your program.`,
      },
      {
        label: '🗓️ Book Educational Consultation',
        text: `Hello! I would like to schedule a direct consultation regarding your educational programs.`,
      },
    ];
  } else if (isServiceOriented) {
    typeLabel = 'Professional Service';
    Icon = Briefcase;
    themeColor = 'from-blue-600 to-cyan-600';
    badgeColor = 'bg-blue-500/15 text-blue-600 border-blue-500/30';
    recommendationTitle = 'Need this specialized service?';
    recommendationDesc = `${displayName} offers professional services. Request a tailored project quote or check their current availability.`;
    quickPrompts = [
      {
        label: '💼 Request Service Quotation',
        text: `Hello ${displayName}! I am interested in your services and would like to request a quotation for my project.`,
      },
      {
        label: '⏱️ Inquire about Availability',
        text: `Hi ${displayName}, are you currently available to take on a new service project this week?`,
      },
      {
        label: '🤝 Discuss Scope & Timeline',
        text: `Hello! I have specific requirements and would like to discuss deliverables and estimated turnaround time.`,
      },
    ];
  } else if (isProductOriented) {
    typeLabel = 'Store & Products';
    Icon = ShoppingBag;
    themeColor = 'from-emerald-600 to-teal-600';
    badgeColor = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    recommendationTitle = 'Ready to buy from this store?';
    recommendationDesc = `${displayName} has verified products. Inquire about current stock, bulk wholesale discounts, or delivery options.`;
    quickPrompts = [
      {
        label: '🛍️ Inquire Product Availability',
        text: `Hello ${displayName}! Is this item currently in stock and ready for immediate purchase?`,
      },
      {
        label: '📦 Ask about Delivery / Waybill',
        text: `Hi! What are your delivery options and shipping fees to my location?`,
      },
      {
        label: '💰 Negotiate Bulk / Wholesale Price',
        text: `Hello! Do you offer bulk discounts or wholesale prices if I order multiple units?`,
      },
    ];
  } else {
    quickPrompts = [
      {
        label: '👋 Introduce & Connect',
        text: `Hello ${displayName}! I found your business on GGD Ad Network and would like to connect with you.`,
      },
      {
        label: '📋 Request Business Catalog',
        text: `Hi ${displayName}, could you please share your latest price catalog and list of services?`,
      },
    ];
  }

  const phone = profile?.business_phone || profile?.whatsapp_number || bizProfile?.phone_number;

  if (isCompact) {
    return (
      <div className={`p-2.5 rounded-xl border bg-card shadow-xs space-y-2 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${themeColor} text-white grid place-items-center shrink-0`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-foreground truncate block">{recommendationTitle}</span>
              <span className="text-[10px] text-muted-foreground truncate block">{recommendationDesc}</span>
            </div>
          </div>
          <Badge className={`text-[9px] font-black shrink-0 border ${badgeColor}`}>
            {typeLabel}
          </Badge>
        </div>

        {/* Quick action chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onApplyPrompt && onApplyPrompt(p.text)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-orange-500/15 hover:text-orange-600 border border-border/80 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <span>{p.label}</span>
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden border border-border/80 shadow-sm bg-card flex flex-col justify-between ${className}`}>
      <CardContent className="p-3.5 space-y-3">
        {/* Header Badge */}
        <div className="flex items-center justify-between gap-2">
          <Badge className={`text-[10px] font-black border ${badgeColor} flex items-center gap-1 py-0.5 px-2`}>
            <Icon className="h-3 w-3" />
            <span>{typeLabel}</span>
          </Badge>
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Verified Network
          </span>
        </div>

        {/* Title & Desc */}
        <div>
          <h4 className="text-xs font-black text-foreground leading-snug">
            {recommendationTitle}
          </h4>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {recommendationDesc}
          </p>
        </div>

        {/* Business Stats if present */}
        {(productsCount > 0 || servicesCount > 0) && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {productsCount > 0 && (
              <div className="p-2 rounded-lg bg-secondary/50 text-center border border-border/40">
                <p className="text-xs font-black text-foreground">{productsCount}</p>
                <p className="text-[9px] text-muted-foreground font-semibold">Available Products</p>
              </div>
            )}
            {servicesCount > 0 && (
              <div className="p-2 rounded-lg bg-secondary/50 text-center border border-border/40">
                <p className="text-xs font-black text-foreground">{servicesCount}</p>
                <p className="text-[9px] text-muted-foreground font-semibold">Offered Services</p>
              </div>
            )}
          </div>
        )}

        {/* Intelligent Recommendation Quick Prompts */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground/80 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-orange-500" />
            1-Tap Quick Questions
          </p>
          <div className="space-y-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onApplyPrompt && onApplyPrompt(p.text)}
                className="w-full text-left p-2 rounded-xl text-xs font-semibold bg-muted/40 hover:bg-orange-500/10 hover:border-orange-500/40 border border-transparent transition-all flex items-center justify-between group"
              >
                <span className="text-foreground group-hover:text-orange-600 transition-colors line-clamp-1">
                  {p.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-orange-600 transition-colors shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp or Direct Call Option */}
        {phone && (
          <div className="pt-2 border-t border-border/60 flex items-center gap-2">
            <a
              href={`https://wa.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1.5 px-2 rounded-lg bg-green-600/10 hover:bg-green-600/20 text-green-700 dark:text-green-400 font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <Phone className="h-3 w-3" /> WhatsApp
            </a>
            {bizProfile?.id && (
              <a
                href={`/business/${bizProfile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[11px] flex items-center gap-1 transition"
              >
                <ExternalLink className="h-3 w-3" /> Storefront
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessConnectMargin;
