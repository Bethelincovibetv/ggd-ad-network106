import { Review, CTAButtonStyle, CTAButtonTemplate } from "@/types/advert";
import { getCtaButtonText, getCtaButtonHtml, convertYouTubeUrl, createFeatureBullets } from "./utils";

export const generateHeader = (): string => {
  return `
    <div class="header">
      <h1>🔥 LIMITED TIME OFFER 🔥</h1>
      <p>Don't Miss Out On This Incredible Deal!</p>
    </div>
  `;
};

export const generateCountdown = (countdownEnd: string): string => {
  return `
    <div class="countdown">
      ⏰ This Offer Expires In:
      <div class="countdown-timer" id="countdown">24:00:00</div>
    </div>
  `;
};

export const generateHero = (productName: string, productDescription: string, productImages: string[]): string => {
  const featureBullets = createFeatureBullets(productDescription);
  
  const productImagesHtml = productImages.length > 0 
    ? `
      <div class="product-images" style="margin: 20px 0;">
        ${productImages.length === 1 
          ? `<img src="${productImages[0]}" alt="${productName}" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: scaleIn 1s ease-out;">`
          : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              ${productImages.map((image, index) => 
                `<img src="${image}" alt="${productName} ${index + 1}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); animation: scaleIn ${0.5 + index * 0.1}s ease-out;">`
              ).join('')}
            </div>
          `
        }
      </div>
    `
    : '';

  return `
    <div class="hero">
      <h1>${productName}</h1>
      <div class="hero-description">
        <div class="description-highlight">${productDescription}</div>
        ${featureBullets}
      </div>
      ${productImagesHtml}
    </div>
  `;
};

export const generateVideoSection = (videoUrl: string, title: string = "📹 Watch This Amazing Demo"): string => {
  if (!videoUrl || !videoUrl.trim()) return '';
  
  const embedUrl = convertYouTubeUrl(videoUrl);
  
  if (!embedUrl) {
    console.error('Failed to convert video URL:', videoUrl);
    return `
      <div class="video-section">
        <h2>${title}</h2>
        <div class="video-wrapper">
          <div style="background: #f0f0f0; padding: 40px; text-align: center; border-radius: 10px;">
            <p style="color: #666;">Video could not be loaded. Please check the YouTube URL.</p>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="video-section">
      <h2>${title}</h2>
      <div class="video-wrapper">
        <iframe 
          src="${embedUrl}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen
          style="width: 100%; height: 100%; border: none;"
          title="Video Player"
        ></iframe>
      </div>
    </div>
  `;
};

export const generatePriceSection = (price: number, currency: 'NGN' | 'USD', productLink: string, ctaButtonStyle: CTAButtonStyle, ctaButtonTemplate: CTAButtonTemplate = 'default'): string => {
  const currencySymbol = currency === 'NGN' ? '₦' : '$';
  const formattedPrice = currency === 'NGN' ? price.toLocaleString() : price.toFixed(2);
  const formattedOriginalPrice = currency === 'NGN' ? (Math.round(price * 2)).toLocaleString() : (Math.round(price * 2)).toFixed(2);
  
  return `
    <div class="price-section">
      <h2>🎯 Special Launch Price</h2>
      <div class="price">${currencySymbol}${formattedPrice}</div>
      <p style="text-decoration: line-through; color: #7f8c8d;">Regular Price: ${currencySymbol}${formattedOriginalPrice}</p>
      ${getCtaButtonHtml(ctaButtonStyle, ctaButtonTemplate, productLink)}
    </div>
  `;
};

export const generateBonusSection = (bonusVideoUrl: string): string => {
  if (!bonusVideoUrl || !bonusVideoUrl.trim()) return '';
  
  const embedUrl = convertYouTubeUrl(bonusVideoUrl);
  
  if (!embedUrl) {
    console.error('Failed to convert bonus video URL:', bonusVideoUrl);
    return `
      <div class="bonus-section">
        <h2>🎁 EXCLUSIVE BONUS</h2>
        <p>Get This Amazing Bonus Content Absolutely FREE!</p>
        <div style="background: #f0f0f0; padding: 40px; text-align: center; border-radius: 10px; margin-top: 20px;">
          <p style="color: #666;">Bonus video could not be loaded. Please check the YouTube URL.</p>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="bonus-section">
      <h2>🎁 EXCLUSIVE BONUS</h2>
      <p>Get This Amazing Bonus Content Absolutely FREE!</p>
      <div class="video-wrapper" style="margin-top: 20px;">
        <iframe 
          src="${embedUrl}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen
          style="width: 100%; height: 100%; border: none;"
          title="Bonus Video Player"
        ></iframe>
      </div>
    </div>
  `;
};

export const generateReviewsSection = (reviews: Review[]): string => {
  if (reviews.length === 0) return '';
  
  const reviewCards = reviews.map(review => `
    <div class="review-card">
      <div class="reviewer-info">
        ${review.reviewerPhoto 
          ? `<img src="${review.reviewerPhoto}" alt="${review.reviewerName}" class="reviewer-photo" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; object-fit: cover;">`
          : `<div class="reviewer-photo" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${review.reviewerName.charAt(0)}</div>`
        }
        <div>
          <strong>${review.reviewerName}</strong>
          <div class="stars">${'⭐'.repeat(review.rating)}</div>
        </div>
      </div>
      <p>"${review.reviewText}"</p>
    </div>
  `).join('');
  
  return `
    <div class="reviews">
      <h2 style="text-align: center; margin-bottom: 30px;">⭐ What Our Customers Say</h2>
      ${reviewCards}
    </div>
  `;
};

export const generateGuaranteeSection = (): string => {
  return `
    <div class="guarantee">
      <h2>💯 100% Money-Back Guarantee</h2>
      <p>Try it risk-free for 30 days. If you're not completely satisfied, get your money back!</p>
    </div>
  `;
};

export const generateFinalCTA = (productLink: string, ctaButtonStyle: CTAButtonStyle, ctaButtonTemplate: CTAButtonTemplate = 'default'): string => {
  return `
    <div style="text-align: center; padding: 40px 20px;">
      ${getCtaButtonHtml(ctaButtonStyle, ctaButtonTemplate, productLink).replace('class="cta-button"', 'class="cta-button" style="font-size: 2rem;"').replace('class="cta-button-template"', 'class="cta-button-template" style="display: inline-block;"')}
      <p style="margin-top: 20px; color: #7f8c8d;">⚡ Instant Access • 🔒 Secure Payment • 📱 Mobile Friendly</p>
    </div>
  `;
};

export const generateCountdownScript = (countdownEnd: string): string => {
  return `
    <script>
        // Countdown timer
        function startCountdown() {
            const countdownElement = document.getElementById('countdown');
            const endTime = new Date('${countdownEnd}').getTime();
            
            function updateCountdown() {
                const now = new Date().getTime();
                const timeLeft = endTime - now;
                
                if (timeLeft <= 0) {
                    countdownElement.innerHTML = "OFFER EXPIRED!";
                    return;
                }
                
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                countdownElement.innerHTML = hours.toString().padStart(2, '0') + ':' + 
                                           minutes.toString().padStart(2, '0') + ':' + 
                                           seconds.toString().padStart(2, '0');
            }
            
            updateCountdown();
            setInterval(updateCountdown, 1000);
        }
        
        startCountdown();
    </script>
  `;
};
