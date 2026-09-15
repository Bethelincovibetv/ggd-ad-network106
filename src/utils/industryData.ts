import React from 'react';
import { 
  Laptop, ShoppingBag, HeartPulse, Building2, Utensils, 
  Truck, GraduationCap, Scissors, Film, Smartphone, 
  Sparkles, Store, Briefcase, DollarSign, Wrench, ShieldCheck,
  Sun, Home, Car, Wheat, Plane, Camera, Palette, PhoneCall
} from "lucide-react";

export interface IndustryMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  gradient: string;
  accentColor: string;
}

export interface IndustryDefinition {
  icon: any;
  gradient: string;
  color: string;
  categoryName: string;
  fallbackDesc: string;
  generateDescription: (name: string) => string;
}

export const KNOWN_INDUSTRIES: Record<string, IndustryDefinition> = {
  'technology': {
    icon: Laptop,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    color: '#3B82F6',
    categoryName: 'Technology & ICT',
    fallbackDesc: 'Software development, AI solutions, digital tools, ICT gadgets, and tech services.',
    generateDescription: (name: string) =>
      `${name} is a verified technology enterprise delivering innovative software solutions, digital tools, modern IT gadgets, and dependable technical support to empower clients.`
  },
  'tech': {
    icon: Laptop,
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    color: '#3B82F6',
    categoryName: 'Technology & ICT',
    fallbackDesc: 'Software development, AI solutions, digital tools, ICT gadgets, and tech services.',
    generateDescription: (name: string) =>
      `${name} is a verified technology enterprise delivering innovative software solutions, digital tools, modern IT gadgets, and dependable technical support to empower clients.`
  },
  'fashion': {
    icon: ShoppingBag,
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    color: '#EC4899',
    categoryName: 'Fashion & Apparel',
    fallbackDesc: 'Apparel, traditional wear, luxury clothing, footwear, tailoring, and designer accessories.',
    generateDescription: (name: string) =>
      `${name} specializes in trendsetting fashion, bespoke tailoring, premium apparel, and stylish designer accessories crafted for elegance and distinction.`
  },
  'clothing': {
    icon: ShoppingBag,
    gradient: 'from-pink-500 via-rose-500 to-amber-500',
    color: '#EC4899',
    categoryName: 'Fashion & Apparel',
    fallbackDesc: 'Apparel, traditional wear, luxury clothing, footwear, tailoring, and designer accessories.',
    generateDescription: (name: string) =>
      `${name} specializes in trendsetting fashion, bespoke tailoring, premium apparel, and stylish designer accessories crafted for elegance and distinction.`
  },
  'retail': {
    icon: ShoppingBag,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    color: '#F59E0B',
    categoryName: 'Retail & Commerce',
    fallbackDesc: 'Consumer goods, wholesale, supermarkets, general merchandise, and electronics.',
    generateDescription: (name: string) =>
      `${name} provides an extensive catalog of quality consumer goods, daily essentials, electronics, and wholesale merchandise at competitive market prices.`
  },
  'real-estate': {
    icon: Building2,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    color: '#10B981',
    categoryName: 'Real Estate & Properties',
    fallbackDesc: 'Property sales, rentals, commercial spaces, land acquisition, and facility management.',
    generateDescription: (name: string) =>
      `${name} delivers trusted real estate solutions, verified property listings, prime land acquisition, residential rentals, and professional facility management.`
  },
  'property': {
    icon: Building2,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    color: '#10B981',
    categoryName: 'Real Estate & Properties',
    fallbackDesc: 'Property sales, rentals, commercial spaces, land acquisition, and facility management.',
    generateDescription: (name: string) =>
      `${name} delivers trusted real estate solutions, verified property listings, prime land acquisition, residential rentals, and professional facility management.`
  },
  'health': {
    icon: HeartPulse,
    gradient: 'from-red-500 via-rose-600 to-pink-600',
    color: '#EF4444',
    categoryName: 'Health & Wellness',
    fallbackDesc: 'Clinics, pharmacies, wellness, fitness products, medical diagnostics, and care.',
    generateDescription: (name: string) =>
      `${name} is dedicated to promoting healthy living through certified healthcare products, medical supplies, wellness essentials, and attentive client care.`
  },
  'medical': {
    icon: HeartPulse,
    gradient: 'from-red-500 via-rose-600 to-pink-600',
    color: '#EF4444',
    categoryName: 'Health & Wellness',
    fallbackDesc: 'Clinics, pharmacies, wellness, fitness products, medical diagnostics, and care.',
    generateDescription: (name: string) =>
      `${name} is dedicated to promoting healthy living through certified healthcare products, medical supplies, wellness essentials, and attentive client care.`
  },
  'food': {
    icon: Utensils,
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    color: '#F97316',
    categoryName: 'Food & Dining',
    fallbackDesc: 'Restaurants, catering services, bakery, organic farming, groceries, and agro-allied goods.',
    generateDescription: (name: string) =>
      `${name} serves delicious cuisine, professional event catering, fresh grocery supplies, baked goods, and quality food items prepared to the highest standard.`
  },
  'restaurant': {
    icon: Utensils,
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    color: '#F97316',
    categoryName: 'Food & Dining',
    fallbackDesc: 'Restaurants, catering services, bakery, organic farming, groceries, and agro-allied goods.',
    generateDescription: (name: string) =>
      `${name} serves delicious cuisine, professional event catering, fresh grocery supplies, baked goods, and quality food items prepared to the highest standard.`
  },
  'logistics': {
    icon: Truck,
    gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
    color: '#06B6D4',
    categoryName: 'Logistics & Transport',
    fallbackDesc: 'Courier delivery, haulage, freight forwarding, dispatch services, and warehousing.',
    generateDescription: (name: string) =>
      `${name} offers fast, reliable courier dispatch, doorstep package deliveries, interstate haulage, and dependable freight logistics solutions.`
  },
  'transport': {
    icon: Truck,
    gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
    color: '#06B6D4',
    categoryName: 'Logistics & Transport',
    fallbackDesc: 'Courier delivery, haulage, freight forwarding, dispatch services, and warehousing.',
    generateDescription: (name: string) =>
      `${name} offers fast, reliable courier dispatch, doorstep package deliveries, interstate haulage, and dependable freight logistics solutions.`
  },
  'education': {
    icon: GraduationCap,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    color: '#8B5CF6',
    categoryName: 'Education & Training',
    fallbackDesc: 'Online academies, tutoring, certification courses, educational tools, and publishing.',
    generateDescription: (name: string) =>
      `${name} empowers students and professionals with quality educational programs, certified skill training, practical courses, and academic resources.`
  },
  'training': {
    icon: GraduationCap,
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    color: '#8B5CF6',
    categoryName: 'Education & Training',
    fallbackDesc: 'Online academies, tutoring, certification courses, educational tools, and publishing.',
    generateDescription: (name: string) =>
      `${name} empowers students and professionals with quality educational programs, certified skill training, practical courses, and academic resources.`
  },
  'beauty': {
    icon: Scissors,
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    color: '#D946EF',
    categoryName: 'Beauty & Cosmetics',
    fallbackDesc: 'Skincare, haircare, cosmetics, salon services, spa treatments, and aesthetics.',
    generateDescription: (name: string) =>
      `${name} delivers premier beauty solutions, certified skincare products, hair styling, spa therapies, and rejuvenating personal care services.`
  },
  'cosmetics': {
    icon: Scissors,
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    color: '#D946EF',
    categoryName: 'Beauty & Cosmetics',
    fallbackDesc: 'Skincare, haircare, cosmetics, salon services, spa treatments, and aesthetics.',
    generateDescription: (name: string) =>
      `${name} delivers premier beauty solutions, certified skincare products, hair styling, spa therapies, and rejuvenating personal care services.`
  },
  'media': {
    icon: Film,
    gradient: 'from-purple-600 via-pink-600 to-red-500',
    color: '#A855F7',
    categoryName: 'Media & Creative Design',
    fallbackDesc: 'Photography, videography, graphic design, content creation, advertising, and branding.',
    generateDescription: (name: string) =>
      `${name} is a creative agency offering photography, video production, graphic design, social media marketing, and impactful brand storytelling.`
  },
  'creative': {
    icon: Film,
    gradient: 'from-purple-600 via-pink-600 to-red-500',
    color: '#A855F7',
    categoryName: 'Media & Creative Design',
    fallbackDesc: 'Photography, videography, graphic design, content creation, advertising, and branding.',
    generateDescription: (name: string) =>
      `${name} is a creative agency offering photography, video production, graphic design, social media marketing, and impactful brand storytelling.`
  },
  'finance': {
    icon: DollarSign,
    gradient: 'from-emerald-600 via-green-600 to-teal-700',
    color: '#059669',
    categoryName: 'Finance & Consulting',
    fallbackDesc: 'Financial advisory, tax consulting, fintech services, bookkeeping, and investments.',
    generateDescription: (name: string) =>
      `${name} delivers trusted financial advisory, corporate bookkeeping, tax planning, fintech solutions, and strategic business investment consulting.`
  },
  'services': {
    icon: Briefcase,
    gradient: 'from-blue-600 via-slate-600 to-gray-700',
    color: '#2563EB',
    categoryName: 'Professional Services',
    fallbackDesc: 'Professional services, legal consultancy, agency solutions, and business consulting.',
    generateDescription: (name: string) =>
      `${name} provides dependable corporate advisory, specialized consulting, and expert client-focused professional services designed for business growth.`
  },
  'consulting': {
    icon: Briefcase,
    gradient: 'from-blue-600 via-slate-600 to-gray-700',
    color: '#2563EB',
    categoryName: 'Professional Services',
    fallbackDesc: 'Professional services, legal consultancy, agency solutions, and business consulting.',
    generateDescription: (name: string) =>
      `${name} provides dependable corporate advisory, specialized consulting, and expert client-focused professional services designed for business growth.`
  },
  'automotive': {
    icon: Wrench,
    gradient: 'from-slate-700 via-gray-800 to-zinc-900',
    color: '#475569',
    categoryName: 'Automotive & Repairs',
    fallbackDesc: 'Auto repair, car dealerships, auto spare parts, vehicle tracking, and rentals.',
    generateDescription: (name: string) =>
      `${name} delivers quality vehicle sales, certified auto spare parts, computerized repair diagnostics, and trusted automotive maintenance.`
  },
  'agriculture': {
    icon: Wheat,
    gradient: 'from-lime-600 via-emerald-600 to-green-700',
    color: '#65A30D',
    categoryName: 'Agriculture & Agro-Allied',
    fallbackDesc: 'Crop farming, livestock, agro inputs, poultry, organic produce, and agro-processing.',
    generateDescription: (name: string) =>
      `${name} is committed to sustainable agribusiness, organic food crop cultivation, quality livestock production, and dependable agro-allied distribution.`
  },
  'agro': {
    icon: Wheat,
    gradient: 'from-lime-600 via-emerald-600 to-green-700',
    color: '#65A30D',
    categoryName: 'Agriculture & Agro-Allied',
    fallbackDesc: 'Crop farming, livestock, agro inputs, poultry, organic produce, and agro-processing.',
    generateDescription: (name: string) =>
      `${name} is committed to sustainable agribusiness, organic food crop cultivation, quality livestock production, and dependable agro-allied distribution.`
  },
  'solar': {
    icon: Sun,
    gradient: 'from-amber-500 via-orange-600 to-yellow-500',
    color: '#D97706',
    categoryName: 'Solar & Renewable Energy',
    fallbackDesc: 'Solar installations, inverters, lithium batteries, renewable energy, and electrical supplies.',
    generateDescription: (name: string) =>
      `${name} delivers dependable solar panel installations, high-capacity inverters, energy storage, and modern renewable power solutions.`
  },
  'energy': {
    icon: Sun,
    gradient: 'from-amber-500 via-orange-600 to-yellow-500',
    color: '#D97706',
    categoryName: 'Solar & Renewable Energy',
    fallbackDesc: 'Solar installations, inverters, lithium batteries, renewable energy, and electrical supplies.',
    generateDescription: (name: string) =>
      `${name} delivers dependable solar panel installations, high-capacity inverters, energy storage, and modern renewable power solutions.`
  },
  'interior': {
    icon: Home,
    gradient: 'from-teal-600 via-emerald-600 to-amber-600',
    color: '#0D9488',
    categoryName: 'Interior Decor & Furniture',
    fallbackDesc: 'Custom furniture, interior architecture, modern lighting, home decor, and fittings.',
    generateDescription: (name: string) =>
      `${name} specializes in exquisite interior design, handcrafted custom furniture, architectural finishing, and premium home decor styling.`
  },
  'furniture': {
    icon: Home,
    gradient: 'from-teal-600 via-emerald-600 to-amber-600',
    color: '#0D9488',
    categoryName: 'Interior Decor & Furniture',
    fallbackDesc: 'Custom furniture, interior architecture, modern lighting, home decor, and fittings.',
    generateDescription: (name: string) =>
      `${name} specializes in exquisite interior design, handcrafted custom furniture, architectural finishing, and premium home decor styling.`
  },
  'hospitality': {
    icon: Plane,
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    color: '#0284C7',
    categoryName: 'Hospitality & Tourism',
    fallbackDesc: 'Hotel bookings, tourism packages, short-let apartments, flight reservations, and events.',
    generateDescription: (name: string) =>
      `${name} provides premier hospitality services, luxury short-stay accommodations, travel tour packages, and tailored event coordination.`
  }
};

/**
 * Normalizes category name or slug to match against known industry dictionary.
 */
export const getIndustryMeta = (nameOrSlug: string = '') => {
  const normalized = (nameOrSlug || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  for (const [key, val] of Object.entries(KNOWN_INDUSTRIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return val;
    }
  }
  return {
    icon: Store,
    gradient: 'from-orange-500 via-red-500 to-amber-600',
    color: '#EA580C',
    categoryName: 'Commercial Business',
    fallbackDesc: 'Verified commercial operations, products, and professional services across Nigeria.',
    generateDescription: (name: string) =>
      `${name} is an officially accredited commercial enterprise on GGD Ad Network, committed to delivering verified products, dependable solutions, and prompt customer satisfaction.`
  };
};

/**
 * Generates a tailored, professional default business description using the business name
 * and specific industry/category.
 */
export const generateBusinessDefaultDescription = (businessName?: string, categoryOrIndustry?: string): string => {
  const cleanName = (businessName || '').trim() || 'This verified business';
  const meta = getIndustryMeta(categoryOrIndustry || '');
  return meta.generateDescription(cleanName);
};

/**
 * Returns either the existing custom description (if valid) or the category-tailored default description.
 */
export const getEffectiveBusinessDescription = (
  customDescription?: string | null,
  businessName?: string,
  categoryOrIndustry?: string
): string => {
  if (customDescription && customDescription.trim().length > 0) {
    return customDescription.trim();
  }
  return generateBusinessDefaultDescription(businessName, categoryOrIndustry);
};
