import { useState } from 'react';
import { Review, CTAButtonStyle, CTAButtonTemplate } from "@/types/advert";
import { toast } from "sonner";

export const useSalesFunnelGenerator = () => {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [mainVideoUrl, setMainVideoUrl] = useState('');
  const [bonusVideoUrl, setBonusVideoUrl] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [productLink, setProductLink] = useState('');
  const [ctaButtonStyle, setCtaButtonStyle] = useState<CTAButtonStyle>('buy-now');
  const [ctaButtonTemplate, setCtaButtonTemplate] = useState<CTAButtonTemplate>('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFunnel, setGeneratedFunnel] = useState<string>('');

  const addReview = () => {
    setReviews(prev => [...prev, {
      reviewerName: '',
      reviewText: '',
      reviewerPhoto: '',
      rating: 5
    }]);
  };

  const updateReview = (index: number, field: keyof Review, value: any) => {
    setReviews(prev => prev.map((review, i) => 
      i === index ? { ...review, [field]: value } : review
    ));
  };

  const removeReview = (index: number) => {
    setReviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProductImages(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const validateForm = () => {
    if (!productName.trim() || !productDescription.trim() || !productLink.trim() || price <= 0) {
      toast.error("Please fill in all required fields");
      return false;
    }
    return true;
  };

  return {
    // State
    productName,
    productDescription,
    mainVideoUrl,
    bonusVideoUrl,
    productImages,
    reviews,
    price,
    currency,
    productLink,
    ctaButtonStyle,
    ctaButtonTemplate,
    isGenerating,
    generatedFunnel,
    
    // Setters
    setProductName,
    setProductDescription,
    setMainVideoUrl,
    setBonusVideoUrl,
    setProductImages,
    setPrice,
    setCurrency,
    setProductLink,
    setCtaButtonStyle,
    setCtaButtonTemplate,
    setIsGenerating,
    setGeneratedFunnel,
    
    // Functions
    addReview,
    updateReview,
    removeReview,
    handleImageUpload,
    validateForm
  };
};
