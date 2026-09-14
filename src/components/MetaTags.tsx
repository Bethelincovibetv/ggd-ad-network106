import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getUniversalOgImage } from '@/utils/ogImageGenerator';

export interface MetaTagsProps {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  path?: string;
  type?: 'website' | 'article' | 'product' | 'profile' | 'business';
  badge?: string | null;
  keywords?: string | string[];
  author?: string;
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noindex?: boolean;
}

/**
 * MetaTags Component
 * Dynamically updates SEO, OpenGraph, and Twitter Card tags using react-helmet-async.
 * Supports title, description, imageUrl, and structured data across all platform pages.
 */
export const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  imageUrl,
  path,
  type = 'website',
  badge,
  keywords,
  author,
  siteName = 'GGD Ad Network',
  twitterCard = 'summary_large_image',
  jsonLd,
  noindex = false,
}) => {
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ggdadnetwork.com';
  const canonicalUrl = currentPath.startsWith('http') ? currentPath : `${origin}${currentPath}`;
  
  const cleanTitle = (title || 'GGD Ad Network').trim();
  const cleanDescription = (description || 'Nigeria’s premier social distribution ad network and marketplace.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  // Resolve image URL (generate fallback branded OG image if not provided)
  const resolvedOgImage = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${origin}${imageUrl}`)
    : getUniversalOgImage({
        image: imageUrl || undefined,
        title: cleanTitle,
        description: cleanDescription,
        category: type,
        badge: badge || type.toUpperCase(),
        theme: type === 'product' ? 'orange' : type === 'profile' ? 'gradient' : 'dark',
      });

  const formattedKeywords = Array.isArray(keywords) ? keywords.join(', ') : keywords;

  return (
    <Helmet>
      {/* Primary Page Title & Meta Tags */}
      <title>{cleanTitle}</title>
      <meta name="description" content={cleanDescription} />
      {formattedKeywords && <meta name="keywords" content={formattedKeywords} />}
      {author && <meta name="author" content={author} />}
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={type === 'business' ? 'profile' : type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={cleanTitle} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:alt" content={cleanTitle} />

      {/* Twitter / X */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@ggdadnetwork" />
      <meta name="twitter:title" content={cleanTitle} />
      <meta name="twitter:description" content={cleanDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />
      <meta name="twitter:image:alt" content={cleanTitle} />

      {/* Structured JSON-LD Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default MetaTags;
