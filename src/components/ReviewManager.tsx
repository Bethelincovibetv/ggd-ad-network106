
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { Review } from "@/types/advert";
import ReviewerPhotoUpload from './ReviewerPhotoUpload';

interface ReviewManagerProps {
  reviews: Review[];
  onAddReview: () => void;
  onUpdateReview: (index: number, field: keyof Review, value: any) => void;
  onRemoveReview: (index: number) => void;
}

const ReviewManager = ({ 
  reviews, 
  onAddReview, 
  onUpdateReview, 
  onRemoveReview 
}: ReviewManagerProps) => {
  return (
    <div>
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium">Customer Reviews</Label>
        <Button onClick={onAddReview} variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Review
        </Button>
      </div>
      {reviews.map((review, index) => (
        <Card key={index} className="mt-4 p-4">
          <div className="flex justify-between items-start mb-4">
            <ReviewerPhotoUpload
              reviewerPhoto={review.reviewerPhoto || ''}
              reviewerName={review.reviewerName}
              onPhotoUpload={(photo) => onUpdateReview(index, 'reviewerPhoto', photo)}
              onPhotoRemove={() => onUpdateReview(index, 'reviewerPhoto', '')}
            />
            <Button onClick={() => onRemoveReview(index)} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              placeholder="Reviewer Name"
              value={review.reviewerName}
              onChange={(e) => onUpdateReview(index, 'reviewerName', e.target.value)}
            />
            <Input
              type="number"
              min="1"
              max="5"
              placeholder="Rating (1-5)"
              value={review.rating}
              onChange={(e) => onUpdateReview(index, 'rating', Number(e.target.value))}
            />
          </div>
          <Textarea
            placeholder="Review text..."
            value={review.reviewText}
            onChange={(e) => onUpdateReview(index, 'reviewText', e.target.value)}
            className="mt-2"
            rows={2}
          />
        </Card>
      ))}
    </div>
  );
};

export default ReviewManager;
