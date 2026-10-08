export type FavoriteType = 'business' | 'product' | 'service';

export interface FavoriteItem {
  id: string; // Composite unique key: `${type}_${targetId}`
  type: FavoriteType;
  targetId: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string | null;
  price?: number | string | null;
  location?: string | null;
  category?: string | null;
  verified?: boolean;
  rating?: number | null;
  linkUrl: string;
  businessName?: string;
  businessPhone?: string;
  businessWebsite?: string;
  savedAt: string; // ISO timestamp
  notes?: string;
}

export type NewFavoriteInput = Omit<FavoriteItem, 'id' | 'savedAt'>;
