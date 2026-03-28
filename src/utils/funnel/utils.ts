
import { CTAButtonStyle, CTAButtonTemplate } from "@/types/advert";

export const getCtaButtonText = (style: CTAButtonStyle): string => {
  const styles = {
    'get-instant-access': 'Get Instant Access',
    'buy-now': 'Buy Now',
    'grab-it': 'Grab It',
    'get-started': 'Get Started',
    'order-now': 'Order Now',
    'claim-yours': 'Claim Yours',
    'download-now': 'Download Now',
    'start-free-trial': 'Start Free Trial',
    'join-now': 'Join Now',
    'learn-more': 'Learn More'
  };
  return styles[style];
};

export const getCtaButtonHtml = (style: CTAButtonStyle, template: CTAButtonTemplate, productLink: string): string => {
  const text = getCtaButtonText(style);
  
  // Only default template now since we removed the photo template
  return `<a href="${productLink}" class="cta-button">${text}</a>`;
};

export const getCountdownEndTime = (): string => {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
};

export const convertYouTubeUrl = (url: string): string => {
  if (!url || !url.trim()) return '';
  
  console.log('Converting YouTube URL:', url);
  
  // Handle different YouTube URL formats
  let videoId = '';
  
  try {
    if (url.includes('youtube.com/watch?v=')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      videoId = urlParams.get('v') || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('youtube.com/v/')) {
      videoId = url.split('youtube.com/v/')[1].split('?')[0].split('&')[0];
    }
    
    if (!videoId) {
      console.error('Could not extract video ID from URL:', url);
      return '';
    }
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
    console.log('Generated embed URL:', embedUrl);
    return embedUrl;
  } catch (error) {
    console.error('Error converting YouTube URL:', error);
    return '';
  }
};

export const createFeatureBullets = (description: string): string => {
  if (!description.includes('.')) return '';
  
  const sentences = description.split('.').filter(sentence => sentence.trim()).slice(0, 4);
  const bullets = sentences.map(sentence => 
    `<li>${sentence.trim()}${sentence.trim().endsWith('.') ? '' : '.'}</li>`
  ).join('');
  
  return `
    <ul class="feature-bullets">
      ${bullets}
    </ul>
  `;
};
