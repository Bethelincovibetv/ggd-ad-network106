
import { Review, CTAButtonStyle, CTAButtonTemplate } from "@/types/advert";
import { getFunnelStyles } from "./funnel/styles";
import { getCountdownEndTime } from "./funnel/utils";
import {
  generateHeader,
  generateCountdown,
  generateHero,
  generateVideoSection,
  generatePriceSection,
  generateBonusSection,
  generateReviewsSection,
  generateGuaranteeSection,
  generateFinalCTA,
  generateCountdownScript
} from "./funnel/htmlSections";

interface FunnelData {
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

export const generateFunnelHtml = (data: FunnelData): string => {
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
    ctaButtonTemplate = 'default'
  } = data;

  const countdownEnd = getCountdownEndTime();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productName} - Limited Time Offer</title>
    <style>
        ${getFunnelStyles()}
        .cta-button-template {
            display: inline-block;
            text-decoration: none;
            transition: transform 0.3s ease;
        }
        .cta-button-template:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        ${generateHeader()}
        ${generateCountdown(countdownEnd)}
        ${generateHero(productName, productDescription, productImages)}
        ${generateVideoSection(mainVideoUrl)}
        ${generatePriceSection(price, currency, productLink, ctaButtonStyle, ctaButtonTemplate)}
        ${generateBonusSection(bonusVideoUrl)}
        ${generateReviewsSection(reviews)}
        ${generateGuaranteeSection()}
        ${generateFinalCTA(productLink, ctaButtonStyle, ctaButtonTemplate)}
    </div>
    
    ${generateCountdownScript(countdownEnd)}
</body>
</html>`;
};
