import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { resolveAdminAiApiKey } from "@/vixora/services/adminKeySync";

export interface BusinessListingItem {
  id: string;
  title: string;
  price: number;
  description?: string | null;
  long_description?: string | null;
  listing_type: 'product' | 'service';
  image_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface BusinessProfileData {
  id: string;
  user_id: string;
  business_name: string;
  description?: string | null;
  phone_number?: string | null;
  address?: string | null;
  website_link?: string | null;
  category_id?: string | null;
  is_verified?: boolean;
  is_directory_listed?: boolean;
  instagram_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
}

export interface UserAdRecord {
  id: string;
  title: string;
  description?: string;
  impressions?: number;
  clicks?: number;
  is_active?: boolean;
  expires_at?: string;
  image_url?: string;
  target_url?: string;
}

export interface BusinessAgentMemory {
  brandVoice: 'naija_energetic' | 'luxury_elite' | 'urgent_closer' | 'corporate_friendly' | 'custom';
  customVoicePrompt?: string;
  targetAudience?: string;
  bankDetails?: string;
  whatsappHotline?: string;
  deliveryTerms?: string;
  returnPolicy?: string;
  keySellingPoints?: string[];
  customLearnedNotes: string[];
  lastUpdated?: string;
}

export interface BusinessOverviewContext {
  userId: string;
  userEmail: string;
  displayName: string;
  credits: number;
  walletBalance: number;
  referralCode?: string;
  isVerified?: boolean;
  profile: BusinessProfileData | null;
  listings: BusinessListingItem[];
  ads: UserAdRecord[];
  activeProductsCount: number;
  activeServicesCount: number;
  activeAdsCount: number;
  recentPostsCount: number;
  memory: BusinessAgentMemory;
}

/**
 * Loads saved brand voice and learned memory for user
 */
export function getUserBusinessMemory(userId: string): BusinessAgentMemory {
  try {
    const raw = localStorage.getItem(`vixora_biz_memory_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    brandVoice: 'naija_energetic',
    targetAudience: 'African shoppers, WhatsApp buyers, and wholesale clients',
    bankDetails: '',
    whatsappHotline: '',
    deliveryTerms: 'Fast nationwide doorstep delivery',
    returnPolicy: '7-day inspection and exchange guarantee',
    keySellingPoints: ['Verified authentic quality', 'Direct WhatsApp support', 'Best market value'],
    customLearnedNotes: []
  };
}

/**
 * Saves or updates user business memory & brand voice preferences
 */
export function saveUserBusinessMemory(userId: string, update: Partial<BusinessAgentMemory>): BusinessAgentMemory {
  const current = getUserBusinessMemory(userId);
  const updated: BusinessAgentMemory = {
    ...current,
    ...update,
    lastUpdated: new Date().toISOString()
  };
  try {
    localStorage.setItem(`vixora_biz_memory_${userId}`, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Uploads media (images / photos) to Cloud SQL / Supabase storage
 * with fallback to base64 Data URL if bucket access is constrained
 */
export async function uploadAgentMedia(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const cleanName = `${userId}_agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

  // Try multiple standard public buckets
  const buckets = ['avatars', 'community-posts', 'community_media', 'task-proofs'];
  for (const b of buckets) {
    try {
      const { data, error } = await supabase.storage.from(b).upload(cleanName, file, {
        upsert: true,
        contentType: file.type
      });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from(b).getPublicUrl(cleanName);
        if (publicUrl && publicUrl.startsWith('http')) {
          return publicUrl;
        }
      }
    } catch {
      // try next
    }
  }

  // Safe client-side Data URL fallback
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Loads full business context for the user across all account activities
 */
export async function fetchUserBusinessContext(userId: string): Promise<BusinessOverviewContext> {
  const [userProfileRes, bizProfileRes, listingsRes, adsRes, postsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    (supabase.from('business_profiles') as any).select('*').eq('user_id', userId).maybeSingle(),
    (supabase.from('business_listings') as any).select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('ads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  const profile = bizProfileRes.data as BusinessProfileData | null;
  const rawListings = (listingsRes.data || []) as any[];
  const rawAds = (adsRes.data || []) as any[];

  const listings: BusinessListingItem[] = rawListings.map(l => ({
    id: l.id,
    title: l.title,
    price: Number(l.price) || 0,
    description: l.description,
    long_description: l.long_description,
    listing_type: (l.listing_type === 'service' ? 'service' : 'product') as 'product' | 'service',
    image_url: l.image_url,
    is_active: l.is_active !== false,
    created_at: l.created_at
  }));

  const ads: UserAdRecord[] = rawAds.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    impressions: a.impressions || 0,
    clicks: a.clicks || 0,
    is_active: a.is_active !== false,
    expires_at: a.expires_at,
    image_url: a.image_url,
    target_url: a.target_url
  }));

  const activeProducts = listings.filter(l => l.listing_type === 'product' && l.is_active);
  const activeServices = listings.filter(l => l.listing_type === 'service' && l.is_active);
  const activeAds = ads.filter(a => a.is_active);

  const memory = getUserBusinessMemory(userId);

  return {
    userId,
    userEmail: userProfileRes.data?.email || '',
    displayName: userProfileRes.data?.display_name || userProfileRes.data?.full_name || 'Business Owner',
    credits: Number(userProfileRes.data?.credits) || 0,
    walletBalance: Number(userProfileRes.data?.wallet_balance) || 0,
    referralCode: userProfileRes.data?.referral_code || undefined,
    isVerified: !!userProfileRes.data?.is_verified || !!profile?.is_verified,
    profile,
    listings,
    ads,
    activeProductsCount: activeProducts.length,
    activeServicesCount: activeServices.length,
    activeAdsCount: activeAds.length,
    recentPostsCount: postsRes.count || 0,
    memory
  };
}

/**
 * Creates a product or service in business_listings table
 */
export async function createProductOrService(userId: string, data: {
  title: string;
  price: number;
  description?: string;
  long_description?: string;
  listing_type?: 'product' | 'service';
  image_url?: string;
}): Promise<{ success: boolean; item?: BusinessListingItem; message: string }> {
  try {
    let { data: bizProfile } = await (supabase.from('business_profiles') as any)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!bizProfile) {
      const { data: userProfile } = await supabase.from('profiles').select('display_name, phone_number').eq('user_id', userId).maybeSingle();
      const newBizName = userProfile?.display_name ? `${userProfile.display_name}'s Store` : 'My GGD Business';
      
      const { data: createdBiz, error: createBizErr } = await (supabase.from('business_profiles') as any)
        .insert({
          user_id: userId,
          business_name: newBizName,
          phone_number: userProfile?.phone_number || null,
          verification_status: 'unverified'
        })
        .select('id')
        .single();

      if (createBizErr || !createdBiz) {
        throw new Error(createBizErr?.message || 'Could not initialize business profile');
      }
      bizProfile = createdBiz;
    }

    const listingType = data.listing_type === 'service' ? 'service' : 'product';
    const fallbackImg = listingType === 'service'
      ? 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop';

    const insertPayload = {
      user_id: userId,
      business_profile_id: bizProfile.id,
      title: data.title.trim(),
      price: Math.max(0, Number(data.price) || 0),
      description: data.description?.trim() || `Verified ${listingType} available on GGD Ad Network.`,
      long_description: data.long_description?.trim() || null,
      listing_type: listingType,
      image_url: data.image_url?.trim() || fallbackImg,
      is_active: true
    };

    const { data: inserted, error: insertErr } = await (supabase.from('business_listings') as any)
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message || 'Failed to insert product');
    }

    const createdItem: BusinessListingItem = {
      id: inserted.id,
      title: inserted.title,
      price: Number(inserted.price) || 0,
      description: inserted.description,
      long_description: inserted.long_description,
      listing_type: inserted.listing_type as any,
      image_url: inserted.image_url,
      is_active: inserted.is_active,
      created_at: inserted.created_at
    };

    return {
      success: true,
      item: createdItem,
      message: `Successfully created ${listingType} "${createdItem.title}" at ₦${createdItem.price.toLocaleString()}!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error creating product or service'
    };
  }
}

/**
 * Updates an existing product or service in business_listings
 */
export async function updateProductOrService(userId: string, data: {
  id?: string;
  titleMatch?: string;
  newTitle?: string;
  price?: number;
  description?: string;
  is_active?: boolean;
  listing_type?: 'product' | 'service';
  image_url?: string;
}): Promise<{ success: boolean; item?: BusinessListingItem; message: string }> {
  try {
    let targetId = data.id;

    if (!targetId && data.titleMatch) {
      const { data: matchedListings } = await (supabase.from('business_listings') as any)
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${data.titleMatch.trim()}%`)
        .limit(1);

      if (matchedListings && matchedListings.length > 0) {
        targetId = matchedListings[0].id;
      }
    }

    if (!targetId) {
      return {
        success: false,
        message: `Could not find any existing product or service matching "${data.titleMatch || 'specified item'}" in your catalog.`
      };
    }

    const updatePayload: Record<string, any> = {};
    if (data.newTitle !== undefined) updatePayload.title = data.newTitle.trim();
    if (data.price !== undefined) updatePayload.price = Math.max(0, Number(data.price));
    if (data.description !== undefined) updatePayload.description = data.description.trim();
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
    if (data.listing_type !== undefined) updatePayload.listing_type = data.listing_type;
    if (data.image_url !== undefined) updatePayload.image_url = data.image_url.trim();

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, message: 'No fields were provided to update.' };
    }

    const { data: updated, error: updateErr } = await (supabase.from('business_listings') as any)
      .update(updatePayload)
      .eq('id', targetId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(updateErr?.message || 'Update failed');
    }

    const updatedItem: BusinessListingItem = {
      id: updated.id,
      title: updated.title,
      price: Number(updated.price) || 0,
      description: updated.description,
      long_description: updated.long_description,
      listing_type: updated.listing_type as any,
      image_url: updated.image_url,
      is_active: updated.is_active,
      created_at: updated.created_at
    };

    return {
      success: true,
      item: updatedItem,
      message: `Updated "${updatedItem.title}"! (Price: ₦${updatedItem.price.toLocaleString()}, Status: ${updatedItem.is_active ? 'Active' : 'Inactive'}).`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error updating product or service'
    };
  }
}

/**
 * Updates the user's business profile details
 */
export async function updateBusinessProfileDetails(userId: string, data: {
  business_name?: string;
  description?: string;
  phone_number?: string;
  address?: string;
  website_link?: string;
  category_id?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
}): Promise<{ success: boolean; profile?: BusinessProfileData; message: string }> {
  try {
    const updatePayload: Record<string, any> = {};
    if (data.business_name) updatePayload.business_name = data.business_name.trim();
    if (data.description !== undefined) updatePayload.description = data.description.trim();
    if (data.phone_number !== undefined) updatePayload.phone_number = data.phone_number.trim();
    if (data.address !== undefined) updatePayload.address = data.address.trim();
    if (data.website_link !== undefined) updatePayload.website_link = data.website_link.trim();
    if (data.category_id !== undefined) updatePayload.category_id = data.category_id;
    if (data.instagram_url !== undefined) updatePayload.instagram_url = data.instagram_url.trim();
    if (data.twitter_url !== undefined) updatePayload.twitter_url = data.twitter_url.trim();
    if (data.facebook_url !== undefined) updatePayload.facebook_url = data.facebook_url.trim();
    if (data.tiktok_url !== undefined) updatePayload.tiktok_url = data.tiktok_url.trim();

    const { data: existing } = await (supabase.from('business_profiles') as any)
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let updatedResult: any;

    if (existing) {
      const { data: updated, error } = await (supabase.from('business_profiles') as any)
        .update(updatePayload)
        .eq('user_id', userId)
        .select('*')
        .single();
      if (error) throw error;
      updatedResult = updated;
    } else {
      const { data: inserted, error } = await (supabase.from('business_profiles') as any)
        .insert({
          user_id: userId,
          business_name: data.business_name || 'My GGD Business',
          verification_status: 'unverified',
          ...updatePayload
        })
        .select('*')
        .single();
      if (error) throw error;
      updatedResult = inserted;
    }

    if (data.phone_number) {
      await supabase.from('profiles').update({ phone_number: data.phone_number }).eq('user_id', userId);
    }

    return {
      success: true,
      profile: updatedResult as BusinessProfileData,
      message: `Updated business profile for "${updatedResult.business_name}" successfully!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error updating business profile'
    };
  }
}

/**
 * Publishes a post on the Community Feed on behalf of the user
 */
export async function publishCommunityPostOnBehalf(userId: string, data: {
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  tags?: string[];
}): Promise<{ success: boolean; post?: any; message: string }> {
  try {
    const defaultTags = ['verified_store', 'business', 'deals'];
    const finalTags = data.tags && data.tags.length > 0 ? data.tags : defaultTags;

    const { data: inserted, error } = await supabase.from('community_posts').insert({
      user_id: userId,
      content: data.content.trim(),
      image_url: data.imageUrl || null,
      link_url: data.linkUrl || null,
      tags: finalTags
    }).select('*').single();

    if (error) throw error;

    return {
      success: true,
      post: inserted,
      message: 'Published promotional post directly to Community Feed on your behalf!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to publish post on community feed'
    };
  }
}

/**
 * Creates an ad campaign in ads table on behalf of the user
 */
export async function createAdCampaignOnBehalf(userId: string, data: {
  title: string;
  description: string;
  imageUrl?: string;
  targetUrl?: string;
  durationDays?: number;
}): Promise<{ success: boolean; ad?: any; message: string }> {
  try {
    const days = data.durationDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { data: inserted, error } = await supabase.from('ads').insert({
      user_id: userId,
      title: data.title.trim(),
      description: data.description.trim(),
      image_url: data.imageUrl || null,
      target_url: data.targetUrl || `/store/${userId}`,
      is_active: true,
      approved: true,
      expires_at: expiresAt.toISOString()
    }).select('*').single();

    if (error) throw error;

    return {
      success: true,
      ad: inserted,
      message: `Created banner ad "${data.title}" live for ${days} days!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to create ad campaign'
    };
  }
}

/**
 * Generates an automated high-resolution promotional flyer or banner graphic
 * Supports: 'flyer_portrait' (1080x1350), 'banner_landscape' (1200x628), 'banner_square' (1080x1080)
 */
export function generateProductPromoCanvas(params: {
  title: string;
  price?: number;
  businessName?: string;
  themeColor?: 'orange' | 'purple' | 'emerald' | 'gold' | 'blue';
  format?: 'flyer_portrait' | 'banner_landscape' | 'banner_square';
  ctaText?: string;
}): string {
  const canvas = document.createElement('canvas');
  const format = params.format || 'flyer_portrait';
  
  let w = 1080;
  let h = 1350;
  if (format === 'banner_landscape') {
    w = 1200;
    h = 628;
  } else if (format === 'banner_square') {
    w = 1080;
    h = 1080;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Theme Gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (params.themeColor === 'purple') {
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#4c1d95');
    grad.addColorStop(1, '#db2777');
  } else if (params.themeColor === 'emerald') {
    grad.addColorStop(0, '#022c22');
    grad.addColorStop(0.5, '#065f46');
    grad.addColorStop(1, '#059669');
  } else if (params.themeColor === 'gold') {
    grad.addColorStop(0, '#1c1917');
    grad.addColorStop(0.5, '#78350f');
    grad.addColorStop(1, '#d97706');
  } else if (params.themeColor === 'blue') {
    grad.addColorStop(0, '#030712');
    grad.addColorStop(0.5, '#1e3a8a');
    grad.addColorStop(1, '#0ea5e9');
  } else {
    // Default GGD Orange Fire
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#ea580c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(w - 100, 150, Math.min(w, h) * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(100, h - 100, Math.min(w, h) * 0.3, 0, Math.PI * 2);
  ctx.fill();

  if (format === 'banner_landscape') {
    // Landscape Banner 1200x628
    // Top Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.roundRect(60, 40, 320, 48, 24);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('⚡ GGD AD NETWORK FEATURED', 80, 71);

    // Business Name
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText((params.businessName || 'VERIFIED BUSINESS').toUpperCase(), 60, 130);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px system-ui, sans-serif';
    ctx.fillText(params.title.slice(0, 38), 60, 205);

    // Price badge if available
    if (params.price) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.roundRect(60, 250, 360, 80, 20);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.font = '900 42px system-ui, sans-serif';
      ctx.fillText(`₦${params.price.toLocaleString()}`, 90, 308);
    }

    // Value bullets
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('✓ Direct WhatsApp Inquiries & Fast Delivery', 60, 390);
    ctx.fillText('✓ Verified Merchant & Transparent Pricing', 60, 430);

    // CTA Button
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(60, 490, 460, 80, 24);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(params.ctaText || 'SHOP NOW / ORDER ON WHATSAPP →', 290, 540);
    ctx.textAlign = 'left';

  } else {
    // Portrait Flyer or Square
    // Top Verified Store Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.roundRect(80, 80, 360, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('✨ GGD VERIFIED STOREFRONT', 110, 118);

    // Business Name
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText((params.businessName || 'EXCLUSIVE OFFER').toUpperCase(), 80, 220);

    // Product Headline (Wrap if long)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px system-ui, sans-serif';
    const words = params.title.split(' ');
    let line = '';
    let y = 320;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > (w - 180) && n > 0) {
        ctx.fillText(line.trim(), 80, y);
        line = words[n] + ' ';
        y += 80;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 80, y);

    // Product Price Card if available
    if (params.price) {
      const priceY = Math.min(y + 90, h - 550);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.roundRect(80, priceY, 520, 120, 28);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 58px system-ui, sans-serif';
      ctx.fillText(`₦${params.price.toLocaleString()}`, 120, priceY + 82);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('LIMITED TIME OFFER', 120, priceY + 32);
    }

    // Value Proposition Points
    const listY = h - 420;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('✓ 100% Genuine & Quality Guaranteed', 80, listY);
    ctx.fillText('✓ Direct WhatsApp Contact & Fast Delivery', 80, listY + 65);
    ctx.fillText('✓ Secure Verified Merchant Protection', 80, listY + 130);

    // Call to Action Box
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(80, h - 200, w - 160, 120, 30);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(params.ctaText || 'ORDER NOW VIA WHATSAPP →', w / 2, h - 128);
    ctx.textAlign = 'left';
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Diagnostic Strategy Planner: Generates a realistic growth diagnosis
 */
export function generateBusinessGrowthStrategy(context: BusinessOverviewContext, memory?: BusinessAgentMemory) {
  const productsCount = context.activeProductsCount;
  const servicesCount = context.activeServicesCount;
  const adsCount = context.activeAdsCount;
  const hasPhone = !!context.profile?.phone_number;
  const hasAddress = !!context.profile?.address;
  const hasBio = !!context.profile?.description;

  const wins: string[] = [];
  const bottlenecks: string[] = [];
  const sevenDaySprint: { day: string; task: string; impact: string }[] = [];

  // Wins
  if (productsCount > 0) wins.push(`Active product catalog established with ${productsCount} item(s)`);
  if (servicesCount > 0) wins.push(`Service offerings live with ${servicesCount} professional package(s)`);
  if (hasPhone) wins.push(`Direct WhatsApp hotline configured (${context.profile?.phone_number})`);
  if (adsCount > 0) wins.push(`${adsCount} advertising campaign(s) actively collecting clicks`);
  if (context.isVerified) wins.push('Verified merchant status active on GGD directory');
  if (wins.length === 0) wins.push('Fresh storefront initialized and ready for market acceleration');

  // Bottlenecks
  if (productsCount < 3) bottlenecks.push('Catalog depth is thin (Recommended: at least 3-5 high-yield products)');
  if (!hasAddress) bottlenecks.push('No physical/city location listed on profile (adds massive trust for Nigerian buyers)');
  if (adsCount === 0) bottlenecks.push('No banner adverts running on GGD Network (missing automated daily impressions)');
  if (!hasBio) bottlenecks.push('Store bio is empty (needs a 2-line punchy mission statement)');
  if (context.recentPostsCount < 2) bottlenecks.push('Low social engagement on Community Feed (regular posts drive free organic orders)');

  // 7-day tactical plan
  sevenDaySprint.push({
    day: 'Day 1',
    task: 'Add 2 high-margin bestselling items with crisp photos and clear pricing',
    impact: '+45% catalog conversion'
  });
  sevenDaySprint.push({
    day: 'Day 2',
    task: 'Launch a 7-day banner advert targeting buyers in Lagos, Abuja & Port Harcourt',
    impact: 'Automated 1,000+ targeted impressions'
  });
  sevenDaySprint.push({
    day: 'Day 3',
    task: 'Publish a behind-the-scenes showcase post on GGD Community Feed with hashtags',
    impact: 'Free organic community reach'
  });
  sevenDaySprint.push({
    day: 'Day 4',
    task: 'Set up WhatsApp quick closing script for fast responses to inbound customer DMs',
    impact: 'Closes 2x more inquiries within 10 mins'
  });
  sevenDaySprint.push({
    day: 'Day 5',
    task: 'Offer a limited 48-hour discount flyer on WhatsApp Status using Vixora Flyer Engine',
    impact: 'Urgency-driven weekend sales'
  });
  sevenDaySprint.push({
    day: 'Day 6',
    task: 'Collect 2 customer reviews and display them on your verified profile',
    impact: 'Trust factor boost for new buyers'
  });
  sevenDaySprint.push({
    day: 'Day 7',
    task: 'Review advertising analytics and double down on top converting product',
    impact: 'Scale predictable weekly revenue'
  });

  const healthScore = Math.min(95, Math.max(35, 
    (productsCount * 12) + (servicesCount * 10) + (adsCount * 15) + (hasPhone ? 15 : 0) + (hasAddress ? 10 : 0) + (hasBio ? 10 : 0)
  ));

  return {
    healthScore,
    wins,
    bottlenecks,
    sevenDaySprint
  };
}

/**
 * Customer Support Reply & Order Closer generator
 */
export function generateCustomerSupportClosingReply(params: {
  customerMessage: string;
  context: BusinessOverviewContext;
  memory?: BusinessAgentMemory;
}) {
  const storeName = params.context.profile?.business_name || params.context.displayName;
  const phone = params.context.profile?.phone_number || params.memory?.whatsappHotline || 'our WhatsApp hotline';
  const delivery = params.memory?.deliveryTerms || 'fast doorstep delivery across Nigeria';
  const bank = params.memory?.bankDetails || '';

  const cleanQuery = params.customerMessage.toLowerCase();
  
  if (cleanQuery.includes('price') || cleanQuery.includes('how much') || cleanQuery.includes('cost')) {
    return `Hello! Thanks for reaching out to ${storeName}! 😊\n\nOur current promotional price is fully updated in our catalog with 100% verified quality guarantee.\n\nWe provide ${delivery} right to your doorstep. Would you like me to reserve one for you before stock runs out today?`;
  }

  if (cleanQuery.includes('delivery') || cleanQuery.includes('location') || cleanQuery.includes('waybill') || cleanQuery.includes('lagos') || cleanQuery.includes('abuja')) {
    return `Great question! At ${storeName}, we offer ${delivery}. We dispatch promptly and provide your tracking info.\n\nPlease share your delivery address and contact phone so we can calculate the exact fastest delivery timeline for you!`;
  }

  if (cleanQuery.includes('original') || cleanQuery.includes('authentic') || cleanQuery.includes('fake') || cleanQuery.includes('quality')) {
    return `You have 100% peace of mind! All items at ${storeName} are verified, authentic, and inspected before dispatch. We stand behind our quality with a 7-day inspection policy.\n\nCan I prepare your package for dispatch now?`;
  }

  return `Hello and welcome to ${storeName}! ✨\n\nThank you for reaching out to us. We have received your inquiry and are happy to assist you immediately. We provide verified authentic items, ${delivery}, and dedicated after-sales care.\n\nPlease let us know your preferred quantity or choice and we will finalize your order right away!`;
}

/**
 * Generates an instant WhatsApp Order Breakdown & Invoice
 */
export function generateOrderClosingInvoice(params: {
  orderText: string;
  context: BusinessOverviewContext;
  memory?: BusinessAgentMemory;
}) {
  const storeName = params.context.profile?.business_name || params.context.displayName;
  const bank = params.memory?.bankDetails || 'Please contact merchant for bank account details';
  const phone = params.context.profile?.phone_number || params.memory?.whatsappHotline || '';

  return `🧾 *OFFICIAL ORDER CONFIRMATION & INVOICE*
🏪 Store: ${storeName}
📅 Date: ${new Date().toLocaleDateString('en-GB')}
----------------------------------------
📦 *Order Summary:*
${params.orderText}

🚚 *Delivery:* Doorstep Nationwide Waybill
🛡️ *Buyer Guarantee:* 100% Verified Quality Checked
----------------------------------------
💳 *Payment Instructions:*
${bank}

📲 *WhatsApp Customer Care:* ${phone}
----------------------------------------
_Please reply with your payment receipt and delivery address to initiate immediate dispatch!_`;
}

/**
 * Tools definition for Gemini Function Calling
 */
export const BUSINESS_AGENT_TOOL_DEFINITIONS = [
  {
    name: 'createProductOrService',
    description: 'Creates and publishes a new product or service in the user business storefront catalog on GGD Ad Network.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title or name of the product or service' },
        price: { type: Type.NUMBER, description: 'Price in Nigerian Naira (₦)' },
        description: { type: Type.STRING, description: 'Short compelling description of the item or deliverables' },
        listing_type: { type: Type.STRING, enum: ['product', 'service'], description: 'Whether this is a physical/digital product or a professional service' },
        imageUrl: { type: Type.STRING, description: 'Optional image URL for the item' }
      },
      required: ['title', 'price']
    }
  },
  {
    name: 'updateProductOrService',
    description: 'Updates an existing product or service in the user catalog (change price, title, description, or active status).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        titleMatch: { type: Type.STRING, description: 'The title or name of the existing product or service to find and update' },
        newTitle: { type: Type.STRING, description: 'Optional new title if renaming' },
        price: { type: Type.NUMBER, description: 'Optional new price in Nigerian Naira (₦)' },
        description: { type: Type.STRING, description: 'Optional new description' },
        is_active: { type: Type.BOOLEAN, description: 'Optional active visibility toggle (true = live, false = hidden)' }
      },
      required: ['titleMatch']
    }
  },
  {
    name: 'updateBusinessProfile',
    description: 'Updates the user official business storefront profile (business name, phone number, address, description, website).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        business_name: { type: Type.STRING, description: 'The official business or store name' },
        phone_number: { type: Type.STRING, description: 'WhatsApp / Phone number for customer orders' },
        address: { type: Type.STRING, description: 'Physical store or office address' },
        description: { type: Type.STRING, description: 'Business overview and mission statement' },
        website_link: { type: Type.STRING, description: 'External website or store link' }
      }
    }
  },
  {
    name: 'publishCommunityPost',
    description: 'Publishes an engaging promotional update, showcase post, or offer on the GGD Community Feed on behalf of the user.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: 'Full post text with compelling story, key features, and hashtags' },
        imageUrl: { type: Type.STRING, description: 'Optional image or banner URL for the post' },
        linkUrl: { type: Type.STRING, description: 'Optional storefront or WhatsApp link' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Hashtags or categories' }
      },
      required: ['content']
    }
  },
  {
    name: 'planBusinessStrategy',
    description: 'Performs a comprehensive diagnostic of the business store, evaluates what is working vs bottlenecks, and outlines a 7-day revenue plan.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        focusArea: { type: Type.STRING, enum: ['growth', 'pricing', 'advertising', 'whatsapp_closing'], description: 'Primary strategy focus' }
      }
    }
  },
  {
    name: 'createBannerAdvert',
    description: 'Generates a promotional social banner or display advert canvas for campaigns.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Headline of the advert' },
        price: { type: Type.NUMBER, description: 'Price or offer' },
        themeColor: { type: Type.STRING, enum: ['orange', 'purple', 'emerald', 'gold', 'blue'], description: 'Color palette' },
        format: { type: Type.STRING, enum: ['banner_landscape', 'banner_square', 'flyer_portrait'], description: 'Banner format' }
      },
      required: ['title']
    }
  },
  {
    name: 'replyCustomerSupportOrOrder',
    description: 'Drafts a high-converting customer support response or prepares an order invoice and closing text for WhatsApp.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        customerMessage: { type: Type.STRING, description: 'The customer query or order text to reply to' },
        intent: { type: Type.STRING, enum: ['support_faq', 'close_order', 'objection_handling'], description: 'Reply intent' }
      },
      required: ['customerMessage']
    }
  },
  {
    name: 'saveBrandMemory',
    description: 'Saves or updates custom brand voice instructions, bank details, delivery terms, or store policies into the AI permanent memory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        brandVoice: { type: Type.STRING, enum: ['naija_energetic', 'luxury_elite', 'urgent_closer', 'corporate_friendly'], description: 'Tone style' },
        bankDetails: { type: Type.STRING, description: 'Bank account number and name' },
        whatsappHotline: { type: Type.STRING, description: 'WhatsApp contact number' },
        deliveryTerms: { type: Type.STRING, description: 'Delivery policy' },
        learnedNote: { type: Type.STRING, description: 'Any key business fact or custom rule to remember permanently' }
      }
    }
  }
];

export interface BusinessToolExecutionResult {
  toolName: string;
  success: boolean;
  message: string;
  badge?: string;
  data?: {
    productResult?: BusinessListingItem;
    profileResult?: any;
    flyerUrl?: string;
    bannerAdResult?: any;
    communityPostResult?: any;
    strategyResult?: any;
    accountOverviewResult?: any;
  };
}

/**
 * Executes a tool function directly on the user's business catalog and database
 */
export async function executeBusinessAgentTool(
  toolName: string,
  args: any,
  context: BusinessOverviewContext,
  uploadedMediaUrl?: string
): Promise<BusinessToolExecutionResult> {
  const userId = context.userId;
  const memory = context.memory || getUserBusinessMemory(userId);

  switch (toolName) {
    case 'createProductOrService': {
      const listingType = args.listing_type === 'service' ? 'service' : 'product';
      const img = args.imageUrl || uploadedMediaUrl || undefined;
      const res = await createProductOrService(userId, {
        title: args.title || 'Exclusive Item',
        price: Number(args.price) || 5000,
        description: args.description,
        listing_type: listingType,
        image_url: img
      });
      return {
        toolName,
        success: res.success,
        message: res.message,
        badge: res.success ? `⚡ New ${listingType === 'service' ? 'Service' : 'Product'} Published` : 'Notice',
        data: { productResult: res.item }
      };
    }

    case 'updateProductOrService': {
      const res = await updateProductOrService(userId, {
        titleMatch: args.titleMatch,
        newTitle: args.newTitle,
        price: args.price !== undefined ? Number(args.price) : undefined,
        description: args.description,
        is_active: args.is_active,
        image_url: args.imageUrl || uploadedMediaUrl
      });
      return {
        toolName,
        success: res.success,
        message: res.message,
        badge: res.success ? '⚡ Product Updated' : 'Notice',
        data: { productResult: res.item }
      };
    }

    case 'updateBusinessProfile': {
      const res = await updateBusinessProfileDetails(userId, {
        business_name: args.business_name,
        phone_number: args.phone_number,
        address: args.address,
        description: args.description,
        website_link: args.website_link
      });
      return {
        toolName,
        success: res.success,
        message: res.message,
        badge: res.success ? '⚡ Business Profile Updated' : 'Notice',
        data: { profileResult: res.profile }
      };
    }

    case 'publishCommunityPost': {
      const postImg = args.imageUrl || uploadedMediaUrl || context.listings[0]?.image_url || undefined;
      const res = await publishCommunityPostOnBehalf(userId, {
        content: args.content,
        imageUrl: postImg,
        linkUrl: args.linkUrl,
        tags: args.tags || ['storefront', 'deals', 'verified']
      });
      return {
        toolName,
        success: res.success,
        message: res.message,
        badge: res.success ? '🚀 Post Published to Community Feed' : 'Notice',
        data: { communityPostResult: res.post }
      };
    }

    case 'planBusinessStrategy': {
      const diag = generateBusinessGrowthStrategy(context, memory);
      return {
        toolName,
        success: true,
        message: `Analyzed store metrics and generated 7-day revenue sprint plan. Health Score: ${diag.healthScore}%.`,
        badge: '📈 7-Day Strategy Plan Generated',
        data: { strategyResult: diag }
      };
    }

    case 'createBannerAdvert': {
      const targetTitle = args.title || context.listings[0]?.title || context.profile?.business_name || 'Exclusive Offer';
      const targetPrice = Number(args.price) || context.listings[0]?.price || 15000;
      const bannerUrl = generateProductPromoCanvas({
        title: targetTitle,
        price: targetPrice,
        businessName: context.profile?.business_name || context.displayName,
        themeColor: args.themeColor || 'orange',
        format: args.format || 'banner_landscape'
      });
      return {
        toolName,
        success: true,
        message: `High-converting banner creative generated for "${targetTitle}".`,
        badge: '🎨 Banner Advert Created',
        data: { flyerUrl: bannerUrl }
      };
    }

    case 'replyCustomerSupportOrOrder': {
      const isOrder = args.intent === 'close_order' || (args.customerMessage && (args.customerMessage.toLowerCase().includes('order') || args.customerMessage.toLowerCase().includes('want') || args.customerMessage.toLowerCase().includes('buying')));
      if (isOrder) {
        const invoice = generateOrderClosingInvoice({
          orderText: args.customerMessage,
          context,
          memory
        });
        return {
          toolName,
          success: true,
          message: invoice,
          badge: '🧾 Order Confirmation & Invoice'
        };
      } else {
        const reply = generateCustomerSupportClosingReply({
          customerMessage: args.customerMessage,
          context,
          memory
        });
        return {
          toolName,
          success: true,
          message: reply,
          badge: '💬 Customer Closing Reply'
        };
      }
    }

    case 'saveBrandMemory': {
      const updatedNotes = args.learnedNote ? [...(memory.customLearnedNotes || []), args.learnedNote] : memory.customLearnedNotes;
      saveUserBusinessMemory(userId, {
        brandVoice: args.brandVoice || memory.brandVoice,
        bankDetails: args.bankDetails || memory.bankDetails,
        whatsappHotline: args.whatsappHotline || memory.whatsappHotline,
        deliveryTerms: args.deliveryTerms || memory.deliveryTerms,
        customLearnedNotes: updatedNotes
      });
      return {
        toolName,
        success: true,
        message: `Saved rule permanently to Vixora AI memory.`,
        badge: '🧠 Brand Memory Saved'
      };
    }

    default:
      return {
        toolName,
        success: false,
        message: `Execution completed.`
      };
  }
}

/**
 * Intelligent natural language intent analyzer:
 * Parses conversational commands flexibly and maps them directly to tool executions
 */
export async function parseAndExecuteNaturalLanguageIntent(
  query: string,
  context: BusinessOverviewContext,
  uploadedMediaUrl?: string
): Promise<BusinessToolExecutionResult | null> {
  const lower = query.toLowerCase().trim();

  // 1. COMMUNITY POST
  if (lower.startsWith('post on community') || lower.startsWith('post to community') || lower.startsWith('publish post') || lower.startsWith('tell community') || lower.includes('share on community') || lower.includes('community post')) {
    const cleanContent = query
      .replace(/^(can you |please |vixora |post on community |post to community |publish post |tell community |share on community )+/i, '')
      .trim();
    const finalContent = cleanContent || `🔥 Special showcase from ${context.profile?.business_name || context.displayName}! Check out our verified collection. DM or WhatsApp us to order now! #deals #verified #store`;
    return executeBusinessAgentTool('publishCommunityPost', { content: finalContent }, context, uploadedMediaUrl);
  }

  // 2. STRATEGY / AUDIT
  if (lower.includes('strategy') || lower.includes('plan') || lower.includes('audit') || lower.includes('what is working') || lower.includes('what should be done') || lower.includes('how to grow') || lower.includes('diagnostic')) {
    return executeBusinessAgentTool('planBusinessStrategy', {}, context);
  }

  // 3. BANNER ADVERT / FLYER
  if (lower.includes('banner') || lower.includes('flyer') || lower.includes('poster') || lower.includes('ad creative') || lower.includes('display ad')) {
    let title = query
      .replace(/^(can you |please |vixora |create |make |generate |banner |flyer |ad |for )+/i, '')
      .trim();
    if (!title || title.length < 2) {
      title = context.listings[0]?.title || context.profile?.business_name || 'Exclusive Offer';
    }
    const format = lower.includes('square') ? 'banner_square' : 'banner_landscape';
    const themeColor = lower.includes('purple') ? 'purple' : lower.includes('emerald') ? 'emerald' : lower.includes('gold') ? 'gold' : 'orange';
    return executeBusinessAgentTool('createBannerAdvert', { title, format, themeColor }, context);
  }

  // 4. CUSTOMER SUPPORT / ORDER
  if (lower.includes('customer said') || lower.includes('reply customer') || lower.includes('how to reply') || lower.includes('order invoice') || lower.includes('close sale') || lower.includes('receive order') || lower.includes('customer wants') || lower.includes('customer inquiry')) {
    const isOrder = lower.includes('order') || lower.includes('wants') || lower.includes('buying');
    return executeBusinessAgentTool('replyCustomerSupportOrOrder', {
      customerMessage: query,
      intent: isOrder ? 'close_order' : 'support_faq'
    }, context);
  }

  // 5. UPDATE PRICE OR ITEM
  if ((lower.includes('update') || lower.includes('change') || lower.includes('edit') || lower.includes('set price')) && (lower.includes('price') || lower.includes('cost') || lower.includes('item') || lower.includes('product'))) {
    const priceMatch = query.match(/(?:to|for|at|new price)?\s*(?:₦|naira|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)(?:\s*(?:k|thousand))?/i);
    let price: number | undefined;
    if (priceMatch) {
      const rawNum = priceMatch[1].replace(/,/g, '');
      let num = parseFloat(rawNum);
      if (query.toLowerCase().includes(`${rawNum}k`)) num *= 1000;
      if (!isNaN(num) && num > 0) price = num;
    }

    let targetTitle = '';
    for (const item of context.listings) {
      if (lower.includes(item.title.toLowerCase())) {
        targetTitle = item.title;
        break;
      }
    }
    if (!targetTitle && context.listings[0]) {
      targetTitle = context.listings[0].title;
    }

    if (price !== undefined) {
      return executeBusinessAgentTool('updateProductOrService', {
        titleMatch: targetTitle,
        price
      }, context);
    }
  }

  // 6. CREATE PRODUCT / SERVICE
  if (lower.startsWith('add') || lower.startsWith('create') || lower.startsWith('publish') || lower.startsWith('sell') || lower.includes('new product') || lower.includes('new service') || (uploadedMediaUrl && (lower.includes('product') || lower.includes('price')))) {
    const isService = lower.includes('service');
    let price = 5000;
    const priceMatch = query.match(/(?:₦|naira|ngn|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)(?:\s*(?:k|thousand))?/i);
    if (priceMatch) {
      const rawNum = priceMatch[1].replace(/,/g, '');
      let num = parseFloat(rawNum);
      if (query.toLowerCase().includes(`${rawNum}k`)) num *= 1000;
      if (!isNaN(num) && num > 0) price = num;
    }

    let title = query
      .replace(/^(can you |please |vixora |add |create |publish |sell |new |a |an |product |service |called |named )+/i, '')
      .replace(/(?:for|at|price|worth|costing)\s*(?:₦|naira|\$)?[0-9,k]+/i, '')
      .replace(/(?:with description|description:).*/i, '')
      .trim();

    if (!title || title.length < 2) {
      title = isService ? 'Professional Service' : 'Exclusive Product';
    }
    title = title.replace(/^["']|["']$/g, '').trim();

    return executeBusinessAgentTool('createProductOrService', {
      title,
      price,
      listing_type: isService ? 'service' : 'product',
      imageUrl: uploadedMediaUrl
    }, context, uploadedMediaUrl);
  }

  // 7. UPDATE PROFILE
  if (lower.includes('business name') || lower.includes('store name') || lower.includes('whatsapp') || lower.includes('phone') || lower.includes('address to')) {
    const updateArgs: any = {};
    const phoneMatch = query.match(/(?:\+?234|0)[0-9]{10}/);
    if (phoneMatch) updateArgs.phone_number = phoneMatch[0];

    const nameMatch = query.match(/(?:name to|called|store name:?)\s*([a-zA-Z0-9\s&'-]{3,40})/i);
    if (nameMatch) updateArgs.business_name = nameMatch[1].trim();

    if (lower.includes('address to')) {
      const addr = query.split(/address to\s*/i)[1]?.trim();
      if (addr) updateArgs.address = addr;
    }

    if (Object.keys(updateArgs).length > 0) {
      return executeBusinessAgentTool('updateBusinessProfile', updateArgs, context);
    }
  }

  // 8. REMEMBER & SAVE MEMORY DIRECTLY (ChatGPT-style memory learning)
  if (
    lower.startsWith('save memory') ||
    lower.startsWith('save to memory') ||
    lower.startsWith('save in memory') ||
    lower.startsWith('remember that') ||
    lower.startsWith('remember:') ||
    lower.startsWith('remember ') ||
    lower.includes('save this to memory') ||
    lower.includes('our brand voice is') ||
    lower.includes('my bank account is') ||
    lower.includes('our delivery policy is') ||
    lower.includes('save memory direct')
  ) {
    let note = query
      .replace(/^(can you |please |vixora |save memory[:\s]+|save to memory[:\s]+|save in memory[:\s]+|remember that[:\s]+|remember[:\s]+|remember\s+|save this to memory[:\s]+)/i, '')
      .trim();

    // Check if voice switch was requested
    let brandVoice: any = undefined;
    if (lower.includes('naija') || lower.includes('energetic')) brandVoice = 'naija_energetic';
    if (lower.includes('luxury') || lower.includes('elite')) brandVoice = 'luxury_elite';
    if (lower.includes('closer') || lower.includes('urgent')) brandVoice = 'urgent_closer';
    if (lower.includes('corporate') || lower.includes('friendly')) brandVoice = 'corporate_friendly';

    if (!note || note.length < 2) {
      note = query;
    }

    return executeBusinessAgentTool('saveBrandMemory', {
      learnedNote: `[Saved Instruction] ${note}`,
      brandVoice
    }, context);
  }

  return null;
}


