import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getUniversalOgImage } from '@/utils/ogImageGenerator';

interface Props {
  title: string;
  description?: string | null;
  image?: string | null;
  path?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  badge?: string | null;
  theme?: 'orange' | 'emerald' | 'purple' | 'dark' | 'gradient';
  jsonLd?: Record<string, unknown>;
}

/** Shared SEO + Open Graph head for public pages (profiles, products,
 *  listings, articles, syndicate tasks, guide, and landing) so every page gets a rich preview card with dynamic OG image. */
const SeoHead: React.FC<Props> = ({
  title,
  description,
  image,
  path,
  type = 'website',
  badge,
  theme = 'orange',
  jsonLd,
}) => {
  const url = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const desc = (description || '').replace(/\s+/g, ' ').trim().slice(0, 155);
  const resolvedOgImage = getUniversalOgImage({
    image,
    title,
    description: desc,
    category: type,
    badge: badge || type.toUpperCase(),
    theme,
  });

  return (
    <Helmet>
      <title>{title.slice(0, 60)}</title>
      {desc && <meta name="description" content={desc} />}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="GGD Ad Network" />
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={resolvedOgImage} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};

export default SeoHead;