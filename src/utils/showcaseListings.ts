export interface ShowcaseListing {
  id: string;
  title: string;
  description: string;
  long_description: string;
  price: number;
  image_url: string;
  extra_images?: string[];
  video_url?: string | null;
  listing_type: 'product' | 'service';
  is_featured: boolean;
  is_active: boolean;
  business_profile_id: string;
  category_id?: string;
  category_slug?: string;
  user_id?: string;
  created_at?: string;
  business_profiles: {
    id: string;
    business_name: string;
    logo_url: string;
    category_id?: string;
    is_directory_listed: boolean;
    address: string;
    state: string;
    phone_number?: string;
    whatsapp_link?: string;
    website_link?: string;
  };
}

export const SHOWCASE_PRODUCTS_AND_SERVICES: ShowcaseListing[] = [];

export const getShowcaseListingsByCategory = (_categorySlugOrName: string): ShowcaseListing[] => {
  return [];
};

export const getShowcaseListingById = (_id: string): ShowcaseListing | undefined => {
  return undefined;
};

