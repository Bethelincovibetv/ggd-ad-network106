
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import FormHeader from './FormHeader';
import ProductDetailsSection from './ProductDetailsSection';
import VideoSection from './VideoSection';
import ProductLinkSection from './ProductLinkSection';
import ProductImageUpload from './ProductImageUpload';
import ReviewManager from './ReviewManager';
import GenerateButton from './GenerateButton';
import { useSalesFunnelGenerator } from "@/hooks/useSalesFunnelGenerator";
import { generateFunnelHtml } from "@/utils/funnelHtmlGenerator";
import { toast } from "sonner";

interface SalesFunnelFormProps {
  onFunnelGenerated: (funnel: string) => void;
}

const SalesFunnelForm = ({ onFunnelGenerated }: SalesFunnelFormProps) => {
  const {
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
    setProductName,
    setProductDescription,
    setMainVideoUrl,
    setBonusVideoUrl,
    setPrice,
    setCurrency,
    setProductLink,
    setCtaButtonStyle,
    setCtaButtonTemplate,
    setIsGenerating,
    addReview,
    updateReview,
    removeReview,
    handleImageUpload,
    validateForm
  } = useSalesFunnelGenerator();

  const generateSalesFunnel = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    
    try {
      const funnelHtml = generateFunnelHtml({
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
        ctaButtonTemplate
      });

      onFunnelGenerated(funnelHtml);
      toast.success("🚀 Enhanced sales funnel generated successfully!");
    } catch (error) {
      toast.error("Failed to generate sales funnel. Please try again.");
      console.error("Sales funnel generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
      <FormHeader />
      <CardContent className="space-y-6">
        <ProductDetailsSection
          productName={productName}
          productDescription={productDescription}
          price={price}
          currency={currency}
          onProductNameChange={setProductName}
          onProductDescriptionChange={setProductDescription}
          onPriceChange={setPrice}
          onCurrencyChange={setCurrency}
        />
        
        <VideoSection
          mainVideoUrl={mainVideoUrl}
          bonusVideoUrl={bonusVideoUrl}
          onMainVideoUrlChange={setMainVideoUrl}
          onBonusVideoUrlChange={setBonusVideoUrl}
        />
        
        <ProductLinkSection
          productLink={productLink}
          ctaButtonStyle={ctaButtonStyle}
          ctaButtonTemplate={ctaButtonTemplate}
          onProductLinkChange={setProductLink}
          onCtaButtonStyleChange={setCtaButtonStyle}
          onCtaButtonTemplateChange={setCtaButtonTemplate}
        />
        
        <ProductImageUpload 
          productImages={productImages}
          onImageUpload={handleImageUpload}
        />
        
        <ReviewManager
          reviews={reviews}
          onAddReview={addReview}
          onUpdateReview={updateReview}
          onRemoveReview={removeReview}
        />
        
        <GenerateButton
          isGenerating={isGenerating}
          onClick={generateSalesFunnel}
        />
      </CardContent>
    </Card>
  );
};

export default SalesFunnelForm;
