
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CTAButtonStyle, CTAButtonTemplate } from "@/types/advert";

interface ProductLinkSectionProps {
  productLink: string;
  ctaButtonStyle: CTAButtonStyle;
  ctaButtonTemplate?: CTAButtonTemplate;
  onProductLinkChange: (value: string) => void;
  onCtaButtonStyleChange: (value: CTAButtonStyle) => void;
  onCtaButtonTemplateChange?: (value: CTAButtonTemplate) => void;
}

const ProductLinkSection = ({
  productLink,
  ctaButtonStyle,
  ctaButtonTemplate = 'default',
  onProductLinkChange,
  onCtaButtonStyleChange,
  onCtaButtonTemplateChange
}: ProductLinkSectionProps) => {
  return (
    <>
      <div>
        <Label htmlFor="productLink" className="text-lg font-medium">Product Link *</Label>
        <Input
          id="productLink"
          placeholder="https://your-product-link.com"
          value={productLink}
          onChange={(e) => onProductLinkChange(e.target.value)}
          className="mt-2"
        />
      </div>
      
      <div>
        <Label htmlFor="ctaButtonStyle" className="text-lg font-medium">CTA Button Style</Label>
        <Select value={ctaButtonStyle} onValueChange={(value: CTAButtonStyle) => onCtaButtonStyleChange(value)}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="get-instant-access">Get Instant Access</SelectItem>
            <SelectItem value="buy-now">Buy Now</SelectItem>
            <SelectItem value="grab-it">Grab It</SelectItem>
            <SelectItem value="get-started">Get Started</SelectItem>
            <SelectItem value="order-now">Order Now</SelectItem>
            <SelectItem value="claim-yours">Claim Yours</SelectItem>
            <SelectItem value="download-now">Download Now</SelectItem>
            <SelectItem value="start-free-trial">Start Free Trial</SelectItem>
            <SelectItem value="join-now">Join Now</SelectItem>
            <SelectItem value="learn-more">Learn More</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

export default ProductLinkSection;
