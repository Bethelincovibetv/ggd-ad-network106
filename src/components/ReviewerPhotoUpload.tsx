
import React from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface ReviewerPhotoUploadProps {
  reviewerPhoto: string;
  reviewerName: string;
  onPhotoUpload: (photo: string) => void;
  onPhotoRemove: () => void;
}

const ReviewerPhotoUpload = ({ 
  reviewerPhoto, 
  reviewerName, 
  onPhotoUpload, 
  onPhotoRemove 
}: ReviewerPhotoUploadProps) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onPhotoUpload(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const inputId = `reviewer-photo-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center gap-3">
      {reviewerPhoto ? (
        <div className="relative">
          <img loading="lazy" 
            src={reviewerPhoto} 
            alt={reviewerName || 'Reviewer'} 
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
          />
          <Button
            type="button"
            onClick={onPhotoRemove}
            variant="destructive"
            size="sm"
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-xs">No Photo</span>
        </div>
      )}
      
      <div>
        <input
          type="file"
          id={inputId}
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById(inputId)?.click()}
        >
          <Upload className="mr-1 h-3 w-3" />
          {reviewerPhoto ? 'Change Photo' : 'Add Photo'}
        </Button>
      </div>
    </div>
  );
};

export default ReviewerPhotoUpload;
