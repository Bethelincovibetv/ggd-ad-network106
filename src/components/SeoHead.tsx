import React from 'react';
import { Helmet } from 'react-helmet-async';

interface Props {
  title: string;
  description?: string | null;
  image?: string | null;
  path?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  jsonLd?: Record<string, unknown>;
}

/** Shared SEO + Open Graph head for public pages (profiles, products,
 *  listings and posts) so every shared link gets a rich preview card. */
const SeoHead: React.FC<Props> = ({ title, description, image, path, type = 'website', jsonLd }) => {
  const url = path || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const desc = (description || '').replace(/\s+/g, ' ').trim().slice(0, 155);
  return (
    <Helmet>
      <title>{title.slice(0, 60)}</title>
      {desc && <meta name="description" content={desc} />}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="GGD Ad Network" />
      <meta property="og:title" content={title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};

export default SeoHead;