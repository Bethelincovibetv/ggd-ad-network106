export interface BusinessWebsiteTemplate {
  id: string;
  name: string;
  subtitle: string;
  tag: string;
  swatchPrimary: string;
  swatchSecondary: string;
  swatchBg: string;
  
  // Tailwind class definitions
  canvasBg: string;
  sidebarBg: string;
  sidebarBorder: string;
  cardBg: string;
  cardBorder: string;
  headingText: string;
  bodyText: string;
  mutedText: string;
  navActive: string;
  navInactive: string;
  primaryBtn: string;
  secondaryBtn: string;
  accentBadge: string;
  accentText: string;
  heroCoverGradient: string;
  statCardBg: string;
  statCardBorder: string;
  dividerBorder: string;
  highlightText: string;
  verifiedIconColor: string;
}

export const WEBSITE_TEMPLATES: Record<string, BusinessWebsiteTemplate> = {
  ggd_brand: {
    id: 'ggd_brand',
    name: 'GGD Brand Signature (Default)',
    subtitle: 'Warm light canvas with signature GGD vibrant orange & amber accents',
    tag: 'Official Platform Brand',
    swatchPrimary: '#ea580c',
    swatchSecondary: '#f59e0b',
    swatchBg: '#fbfcfd',

    canvasBg: 'bg-[#fbfcfd] text-slate-800',
    sidebarBg: 'bg-white/95 backdrop-blur-md',
    sidebarBorder: 'border-slate-200/80',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200/90 shadow-xs',
    headingText: 'text-slate-900',
    bodyText: 'text-slate-600',
    mutedText: 'text-slate-400',
    navActive: 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold shadow-md shadow-orange-500/25',
    navInactive: 'text-slate-600 hover:text-slate-900 hover:bg-orange-50/80',
    primaryBtn: 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black shadow-md shadow-orange-500/25',
    secondaryBtn: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    accentBadge: 'bg-orange-50 text-orange-700 border-orange-200/80 font-bold',
    accentText: 'text-orange-600',
    heroCoverGradient: 'from-orange-500 via-amber-500 to-orange-600',
    statCardBg: 'bg-orange-50/50',
    statCardBorder: 'border-orange-100',
    dividerBorder: 'border-slate-100',
    highlightText: 'text-orange-600',
    verifiedIconColor: 'text-sky-500 fill-sky-500',
  },

  executive_blue: {
    id: 'executive_blue',
    name: 'Executive Modern',
    subtitle: 'Clean white canvas with corporate deep royal blue and slate accents',
    tag: 'Corporate & B2B',
    swatchPrimary: '#2563eb',
    swatchSecondary: '#4f46e5',
    swatchBg: '#f8fafc',

    canvasBg: 'bg-[#f8fafc] text-slate-800',
    sidebarBg: 'bg-white/95 backdrop-blur-md',
    sidebarBorder: 'border-slate-200/80',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200 shadow-xs',
    headingText: 'text-slate-900',
    bodyText: 'text-slate-600',
    mutedText: 'text-slate-400',
    navActive: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold shadow-md shadow-blue-600/25',
    navInactive: 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/80',
    primaryBtn: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black shadow-md shadow-blue-600/25',
    secondaryBtn: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    accentBadge: 'bg-blue-50 text-blue-700 border-blue-200/80 font-bold',
    accentText: 'text-blue-600',
    heroCoverGradient: 'from-blue-600 via-indigo-600 to-slate-900',
    statCardBg: 'bg-blue-50/50',
    statCardBorder: 'border-blue-100',
    dividerBorder: 'border-slate-100',
    highlightText: 'text-blue-600',
    verifiedIconColor: 'text-blue-500 fill-blue-500',
  },

  emerald_clean: {
    id: 'emerald_clean',
    name: 'Emerald Marketplace',
    subtitle: 'Crisp fresh off-white canvas with lush forest green & mint accents',
    tag: 'Health, Eco & Retail',
    swatchPrimary: '#059669',
    swatchSecondary: '#0d9488',
    swatchBg: '#f7faf9',

    canvasBg: 'bg-[#f7faf9] text-slate-800',
    sidebarBg: 'bg-white/95 backdrop-blur-md',
    sidebarBorder: 'border-slate-200/80',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200 shadow-xs',
    headingText: 'text-slate-900',
    bodyText: 'text-slate-600',
    mutedText: 'text-slate-400',
    navActive: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold shadow-md shadow-emerald-600/25',
    navInactive: 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50/80',
    primaryBtn: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black shadow-md shadow-emerald-600/25',
    secondaryBtn: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    accentBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-bold',
    accentText: 'text-emerald-600',
    heroCoverGradient: 'from-emerald-600 via-teal-600 to-slate-900',
    statCardBg: 'bg-emerald-50/50',
    statCardBorder: 'border-emerald-100',
    dividerBorder: 'border-slate-100',
    highlightText: 'text-emerald-600',
    verifiedIconColor: 'text-emerald-500 fill-emerald-500',
  },

  sunset_boutique: {
    id: 'sunset_boutique',
    name: 'Sunset Boutique',
    subtitle: 'Warm soft blush canvas with rich terracotta, warm coral & gold highlights',
    tag: 'Fashion, Beauty & Luxury',
    swatchPrimary: '#e11d48',
    swatchSecondary: '#ea580c',
    swatchBg: '#fdfcfb',

    canvasBg: 'bg-[#fdfcfb] text-slate-800',
    sidebarBg: 'bg-white/95 backdrop-blur-md',
    sidebarBorder: 'border-slate-200/80',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200 shadow-xs',
    headingText: 'text-slate-900',
    bodyText: 'text-slate-600',
    mutedText: 'text-slate-400',
    navActive: 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-600 text-white font-bold shadow-md shadow-rose-600/25',
    navInactive: 'text-slate-600 hover:text-slate-900 hover:bg-rose-50/80',
    primaryBtn: 'bg-gradient-to-r from-rose-600 via-orange-500 to-amber-600 hover:from-rose-700 hover:to-orange-600 text-white font-black shadow-md shadow-rose-600/25',
    secondaryBtn: 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    accentBadge: 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',
    accentText: 'text-rose-600',
    heroCoverGradient: 'from-rose-600 via-orange-500 to-amber-600',
    statCardBg: 'bg-rose-50/50',
    statCardBorder: 'border-rose-100',
    dividerBorder: 'border-slate-100',
    highlightText: 'text-rose-600',
    verifiedIconColor: 'text-rose-500 fill-rose-500',
  },
};

export const DEFAULT_TEMPLATE_ID = 'ggd_brand';

export function getWebsiteTemplate(templateId?: string | null): BusinessWebsiteTemplate {
  if (templateId && WEBSITE_TEMPLATES[templateId]) {
    return WEBSITE_TEMPLATES[templateId];
  }
  return WEBSITE_TEMPLATES[DEFAULT_TEMPLATE_ID];
}
