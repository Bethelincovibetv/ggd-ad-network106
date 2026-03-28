
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

interface ProductImageUploadProps {
  productImages: string[];
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ProductImageUpload = ({ productImages, onImageUpload }: ProductImageUploadProps) => {
  return (
    <div>
      <Label className="text-lg font-medium">Product Images</Label>
      <div className="mt-2">
        <input
          type="file"
          id="productImages"
          accept="image/*"
          multiple
          onChange={onImageUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById('productImages')?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Product Images
        </Button>
        {productImages.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {productImages.map((image, index) => (
              <img 
                key={index} 
                src={image} 
                alt={`Product ${index + 1}`} 
                className="w-full h-24 object-cover rounded" 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageUpload;
