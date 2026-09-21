import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

export interface BusinessReview {
  id: string;
  business_user_id: string; // Target Merchant User ID
  reviewer_id?: string;     // Customer Auth ID if logged in
  reviewer_name: string;    // Customer Name
  reviewer_email?: string;  // Customer Email (optional)
  rating: number;           // 1 to 5 stars
  comment: string;          // Written review text
  verified_purchase?: boolean; // Verified customer
  status: 'active' | 'hidden';
  created_at: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>; // 5: count, 4: count, etc.
  recommendationPercentage: number;
}

const REVIEWS_COLLECTION = 'business_reviews';

/**
 * Calculates accurate statistics from a list of reviews
 */
export function calculateReviewStats(reviews: BusinessReview[]): ReviewStats {
  const activeReviews = reviews.filter(r => r.status !== 'hidden');
  const total = activeReviews.length;

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (total === 0) {
    return {
      averageRating: 0.0,
      totalReviews: 0,
      ratingDistribution: distribution,
      recommendationPercentage: 0,
    };
  }

  let sum = 0;
  let positiveCount = 0; // 4 or 5 stars

  activeReviews.forEach(r => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
    sum += Number(r.rating || 5);
    if (r.rating >= 4) positiveCount++;
  });

  const avg = Math.round((sum / total) * 10) / 10;
  const recPct = Math.round((positiveCount / total) * 100);

  return {
    averageRating: avg,
    totalReviews: total,
    ratingDistribution: distribution,
    recommendationPercentage: recPct,
  };
}

/**
 * Fetch all active customer reviews for a given business user
 */
export async function getBusinessReviews(businessUserId: string): Promise<BusinessReview[]> {
  if (!businessUserId) return [];

  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('business_user_id', '==', businessUserId),
      orderBy('created_at', 'desc')
    );

    const snap = await getDocs(q);
    const results: BusinessReview[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data() as BusinessReview;
      if (data.status !== 'hidden') {
        results.push(data);
      }
    });
    return results;
  } catch (err) {
    console.warn('Error fetching business reviews from Firestore:', err);
    return [];
  }
}

/**
 * Real-time listener for customer reviews of a business
 */
export function subscribeToBusinessReviews(
  businessUserId: string,
  onUpdate: (reviews: BusinessReview[], stats: ReviewStats) => void,
  onError?: (err: any) => void
): () => void {
  if (!businessUserId) {
    onUpdate([], calculateReviewStats([]));
    return () => {};
  }

  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('business_user_id', '==', businessUserId),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const results: BusinessReview[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data() as BusinessReview;
          if (data.status !== 'hidden') {
            results.push(data);
          }
        });
        const stats = calculateReviewStats(results);
        onUpdate(results, stats);
      },
      (error) => {
        console.warn('Real-time business reviews listener note:', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up business reviews subscription:', err);
    getBusinessReviews(businessUserId).then(revs => {
      onUpdate(revs, calculateReviewStats(revs));
    });
    return () => {};
  }
}

/**
 * Submits a genuine customer review to Firestore
 */
export async function submitBusinessReview(payload: {
  business_user_id: string;
  reviewer_id?: string;
  reviewer_name: string;
  reviewer_email?: string;
  rating: number;
  comment: string;
  verified_purchase?: boolean;
}): Promise<BusinessReview> {
  const now = new Date().toISOString();
  const reviewId = `rev_${payload.business_user_id.slice(0, 6)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const review: BusinessReview = {
    id: reviewId,
    business_user_id: payload.business_user_id,
    reviewer_id: payload.reviewer_id,
    reviewer_name: payload.reviewer_name.trim() || 'Verified Customer',
    reviewer_email: payload.reviewer_email?.trim() || undefined,
    rating: Math.max(1, Math.min(5, payload.rating)),
    comment: payload.comment.trim(),
    verified_purchase: payload.verified_purchase ?? true,
    status: 'active',
    created_at: now,
  };

  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await setDoc(docRef, review);

  return review;
}

/**
 * Delete or hide a review (Admin / Merchant action)
 */
export async function deleteBusinessReview(reviewId: string): Promise<void> {
  if (!reviewId) return;
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await deleteDoc(docRef);
}
