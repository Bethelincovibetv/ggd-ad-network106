import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  MessageSquarePlus,
  ShieldCheck,
  User,
  ThumbsUp,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  BusinessReview,
  ReviewStats,
  submitBusinessReview,
  deleteBusinessReview
} from '@/services/businessReviewService';

interface BusinessReviewsSectionProps {
  businessUserId: string;
  businessName: string;
  reviews: BusinessReview[];
  stats: ReviewStats;
  currentUser?: any;
  isAdmin?: boolean;
  activeTemplate: any;
}

export const BusinessReviewsSection: React.FC<BusinessReviewsSectionProps> = ({
  businessUserId,
  businessName,
  reviews,
  stats,
  currentUser,
  isAdmin,
  activeTemplate
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewerName, setReviewerName] = useState<string>(
    currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || ''
  );
  const [reviewerEmail, setReviewerEmail] = useState<string>(currentUser?.email || '');
  const [comment, setComment] = useState<string>('');
  const [verifiedPurchase, setVerifiedPurchase] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast({
        title: "Review comment required",
        description: "Please share a brief experience or comment about this business.",
        variant: "destructive"
      });
      return;
    }

    if (!reviewerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name or alias.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitBusinessReview({
        business_user_id: businessUserId,
        reviewer_id: currentUser?.id,
        reviewer_name: reviewerName.trim(),
        reviewer_email: reviewerEmail.trim() || undefined,
        rating,
        comment: comment.trim(),
        verified_purchase: verifiedPurchase
      });

      toast({
        title: "Review submitted!",
        description: "Thank you for sharing your genuine feedback for this business."
      });
      setComment('');
      setModalOpen(false);
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err?.message || "Could not save your review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to remove this review?")) return;
    setDeletingId(reviewId);
    try {
      await deleteBusinessReview(reviewId);
      toast({
        title: "Review removed",
        description: "The customer review has been deleted."
      });
    } catch (err: any) {
      toast({
        title: "Deletion failed",
        description: err?.message || "Could not delete review.",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <section id="reviews" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
            <Star className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h2 className={`text-2xl font-black ${activeTemplate.headingText} tracking-tight`}>
              Verified Customer Ratings & Reviews
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Genuine customer feedback and ratings recorded for {businessName}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className={`${activeTemplate.primaryBtn} text-white font-bold gap-2 h-10 px-4 rounded-xl shadow-xs self-start sm:self-auto cursor-pointer`}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Write a Review
        </Button>
      </div>

      {/* Review Analytics Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Rating Score Card */}
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-center items-center text-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1">
            Overall Merchant Rating
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-slate-900">
              {stats.totalReviews > 0 ? stats.averageRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-sm text-slate-400 font-bold">/ 5.0</span>
          </div>

          <div className="flex items-center gap-1 my-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(stats.totalReviews > 0 ? stats.averageRating : 5)
                    ? 'fill-current text-amber-400'
                    : 'text-slate-200'
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-500 font-semibold">
            {stats.totalReviews > 0
              ? `Based on ${stats.totalReviews} verified ${stats.totalReviews === 1 ? 'customer review' : 'customer reviews'}`
              : 'New merchant on GGD · Ready for first review'}
          </p>

          {stats.totalReviews > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <ThumbsUp className="h-3 w-3" />
              {stats.recommendationPercentage}% of clients recommend this business
            </div>
          )}
        </Card>

        {/* Rating Breakdown Distribution Bars */}
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs md:col-span-2 flex flex-col justify-center space-y-2.5">
          <p className="text-xs font-bold text-slate-700 mb-1">Rating Breakdown</p>
          {[5, 4, 3, 2, 1].map((starVal) => {
            const count = stats.ratingDistribution[starVal] || 0;
            const percentage = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
            return (
              <div key={starVal} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-slate-600">
                  <span>{starVal}</span>
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                </div>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right shrink-0 text-slate-500 font-medium text-[11px]">
                  {count} ({percentage}%)
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Customer Reviews List */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <Card className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-500 grid place-items-center mx-auto">
              <Star className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">No Customer Reviews Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Have you transacted with {businessName}? Share your genuine rating to help other buyers.
              </p>
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              className={`${activeTemplate.primaryBtn} text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 mx-auto`}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Be the First to Review
            </Button>
          </Card>
        ) : (
          reviews.map((rev) => (
            <Card
              key={rev.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-bold grid place-items-center text-sm border border-slate-200 shrink-0">
                    {rev.reviewer_name ? rev.reviewer_name.slice(0, 2).toUpperCase() : 'CU'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-900">{rev.reviewer_name}</p>
                      {rev.verified_purchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Verified Client
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= rev.rating ? 'fill-current text-amber-400' : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{rev.rating}.0</span>
                      <span className="text-[10px] text-slate-400">· {formatDate(rev.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Admin or Author Delete Control */}
                {(isAdmin || (currentUser && currentUser.id === rev.reviewer_id)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteReview(rev.id)}
                    disabled={deletingId === rev.id}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Remove review"
                  >
                    {deletingId === rev.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 mt-3 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                "{rev.comment}"
              </p>
            </Card>
          ))
        )}
      </div>

      {/* Write a Review Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Star className="h-5 w-5 fill-current text-amber-500" />
              Review {businessName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Share your honest commercial experience to guide prospective buyers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            {/* Interactive Star Rating Selector */}
            <div className="space-y-1.5 text-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              <Label className="text-xs font-bold text-slate-700 block">Select Rating</Label>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= (hoverRating !== null ? hoverRating : rating)
                          ? 'fill-current text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-600">
                {rating === 5 && '⭐⭐⭐⭐⭐ Exceptional Service (5 Stars)'}
                {rating === 4 && '⭐⭐⭐⭐ Great Experience (4 Stars)'}
                {rating === 3 && '⭐⭐⭐ Average / Fair (3 Stars)'}
                {rating === 2 && '⭐⭐ Below Expectations (2 Stars)'}
                {rating === 1 && '⭐ Poor Experience (1 Star)'}
              </p>
            </div>

            {/* Reviewer Name */}
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">Your Full Name</Label>
              <Input
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="e.g. Adeola Johnson"
                required
                className="h-10 text-xs rounded-xl font-medium"
              />
            </div>

            {/* Reviewer Email (Optional) */}
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address (Private / Optional)
              </Label>
              <Input
                type="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                placeholder="e.g. adeola@example.com"
                className="h-10 text-xs rounded-xl font-medium"
              />
            </div>

            {/* Review Feedback Comment */}
            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">Your Review Feedback</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Describe product quality, delivery speed, customer service, or communication with ${businessName}...`}
                rows={4}
                required
                className="text-xs rounded-xl font-medium resize-none"
              />
            </div>

            {/* Verified Buyer Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="verifiedCheck"
                checked={verifiedPurchase}
                onChange={(e) => setVerifiedPurchase(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="verifiedCheck" className="text-xs text-slate-600 font-medium cursor-pointer">
                I have engaged or purchased from this business
              </label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="h-10 text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={`${activeTemplate.primaryBtn} text-white font-bold text-xs h-10 px-5 rounded-xl`}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                Publish Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
