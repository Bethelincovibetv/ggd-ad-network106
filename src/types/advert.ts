
export interface AdRotatorAd {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  targetUrl: string;
  isActive: boolean;
  isPaid: boolean;
  impressions: number;
  clicks: number;
  durationDays: number;
  startDate?: string;
  endDate?: string;
  amount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'expired';
  createdAt: string;
}

export interface AdNetworkStats {
  totalAds: number;
  activeAds: number;
  totalImpressions: number;
  totalClicks: number;
}

// Additional types needed by other components
export interface Review {
  reviewerName: string;
  reviewText: string;
  reviewerPhoto?: string;
  rating: number;
}

export type CTAButtonStyle = 
  | 'get-instant-access'
  | 'buy-now'
  | 'grab-it'
  | 'get-started'
  | 'order-now'
  | 'claim-yours'
  | 'download-now'
  | 'start-free-trial'
  | 'join-now'
  | 'learn-more';

export type CTAButtonTemplate = 'default' | 'gradient' | 'outline';

export interface AdvertData {
  productName: string;
  productDescription: string;
  mainVideoUrl: string;
  bonusVideoUrl: string;
  productImages: string[];
  reviews: Review[];
  price: number;
  currency: 'NGN' | 'USD';
  productLink: string;
  ctaButtonStyle: CTAButtonStyle;
  ctaButtonTemplate?: CTAButtonTemplate;
}
