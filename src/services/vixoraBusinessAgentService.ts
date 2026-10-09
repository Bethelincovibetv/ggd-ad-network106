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

export interface BusinessOverviewContext {
  userId: string;
  userEmail: string;
  displayName: string;
  credits: number;
  profile: BusinessProfileData | null;
  listings: BusinessListingItem[];
  activeProductsCount: number;
  activeServicesCount: number;
}

/**
 * Loads current business context for the user from Supabase
 */
export async function fetchUserBusinessContext(userId: string): Promise<BusinessOverviewContext> {
  const [userProfileRes, bizProfileRes, listingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    (supabase.from('business_profiles') as any).select('*').eq('user_id', userId).maybeSingle(),
    (supabase.from('business_listings') as any).select('*').eq('user_id', userId).order('created_at', { ascending: false })
  ]);

  const profile = bizProfileRes.data as BusinessProfileData | null;
  const rawListings = (listingsRes.data || []) as any[];

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

  const activeProducts = listings.filter(l => l.listing_type === 'product' && l.is_active);
  const activeServices = listings.filter(l => l.listing_type === 'service' && l.is_active);

  return {
    userId,
    userEmail: userProfileRes.data?.email || '',
    displayName: userProfileRes.data?.display_name || userProfileRes.data?.full_name || 'Business Owner',
    credits: Number(userProfileRes.data?.credits) || 0,
    profile,
    listings,
    activeProductsCount: activeProducts.length,
    activeServicesCount: activeServices.length
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
    // 1. Ensure business profile exists
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

    // If ID is not directly provided, find by closest title
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

    // Check if business profile exists
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

    // Also sync phone number to user profiles table if provided
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
 * Generates an automated high-resolution promotional flyer graphic
 */
export function generateProductPromoCanvas(params: {
  title: string;
  price?: number;
  businessName?: string;
  themeColor?: 'orange' | 'purple' | 'emerald' | 'gold';
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Theme Gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
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
  } else {
    // Default GGD Orange / Red Fire
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#ea580c');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Subtle decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.beginPath();
  ctx.arc(950, 200, 320, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(100, 1100, 280, 0, Math.PI * 2);
  ctx.fill();

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
    if (metrics.width > 900 && n > 0) {
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
    const priceY = Math.min(y + 110, 620);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.roundRect(80, priceY, 520, 120, 28);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 58px system-ui, sans-serif';
    ctx.fillText(`₦${params.price.toLocaleString()}`, 120, priceY + 82);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('LIMITED TIME PRICE', 120, priceY + 32);
  }

  // Value Proposition Points
  const listY = 820;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText('✓ 100% Genuine & Quality Guaranteed', 80, listY);
  ctx.fillText('✓ Direct WhatsApp Contact & Fast Delivery', 80, listY + 65);
  ctx.fillText('✓ Secure Verified Merchant Protection', 80, listY + 130);

  // Call to Action Box
  ctx.fillStyle = '#ffffff';
  ctx.roundRect(80, 1100, 920, 120, 30);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ORDER NOW VIA WHATSAPP →', 540, 1175);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/jpeg', 0.92);
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
    name: 'getBusinessOverview',
    description: 'Retrieves current business statistics, catalog count, wallet credits, and storefront profile info.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        scope: { type: Type.STRING, enum: ['summary', 'products', 'profile'], description: 'Scope of information' }
      }
    }
  },
  {
    name: 'generateProductFlyer',
    description: 'Generates a promotional social media flyer graphic banner for a product or service.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of the product or promotion' },
        price: { type: Type.NUMBER, description: 'Price in Naira' },
        themeColor: { type: Type.STRING, enum: ['orange', 'purple', 'emerald', 'gold'], description: 'Banner color palette' }
      },
      required: ['title']
    }
  }
];
