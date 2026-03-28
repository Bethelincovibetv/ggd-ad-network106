
import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CurrencySelector from './CurrencySelector';

interface ProductDetailsSectionProps {
  productName: string;
  productDescription: string;
  price: number;
  currency: 'NGN' | 'USD';
  onProductNameChange: (value: string) => void;
  onProductDescriptionChange: (value: string) => void;
  onPriceChange: (value: number) => void;
  onCurrencyChange: (currency: 'NGN' | 'USD') => void;
}

const ProductDetailsSection = ({
  productName,
  productDescription,
  price,
  currency,
  onProductNameChange,
  onProductDescriptionChange,
  onPriceChange,
  onCurrencyChange
}: ProductDetailsSectionProps) => {
  const currencySymbol = currency === 'NGN' ? '₦' : '$';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="productName" className="text-lg font-medium">Product Name *</Label>
        <Input
          id="productName"
          placeholder="Enter your product name"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          className="mt-2"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price" className="text-lg font-medium">Price *</Label>
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {currencySymbol}
            </span>
            <Input
              id="price"
              type="number"
              placeholder="0.00"
              value={price || ''}
              onChange={(e) => onPriceChange(Number(e.target.value))}
              className="pl-8"
              required
            />
          </div>
        </div>
        
        <CurrencySelector 
          currency={currency}
          onCurrencyChange={onCurrencyChange}
        />
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="productDescription" className="text-lg font-medium">Product Description *</Label>
        <Textarea
          id="productDescription"
          placeholder="Describe your product in detail..."
          value={productDescription}
          onChange={(e) => onProductDescriptionChange(e.target.value)}
          className="mt-2 min-h-24"
          required
        />
      </div>
    </div>
  );
};

export default ProductDetailsSection;
