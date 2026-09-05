import React from 'react';
import { Helmet } from 'react-helmet-async';
import ggdLogo from '@/assets/ggd-logo.png';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  keywords?: string;
}

const DEFAULT_TITLE = 'GGD Ad Network — Digital Business-Growth & Marketing Platform';
const DEFAULT_DESC =
  'GGD Ad Network is a digital business-growth and marketing platform that helps businesses get discovered, reach more customers, promote products and services, and grow with advertising and community promoters.';
const DEFAULT_IMAGE =
  'https://cilkybiebptqtuhbopyz.supabase.co/storage/v1/object/public/images/GGD%20AD%20NETWORK/01a5b45d-5b2e-4458-acc6-e6b4697174e1.png';

export const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
}) => {
  const fullTitle = title
    ? `${title} | GGD Ad Network`
    : DEFAULT_TITLE;
  const metaDesc = description || DEFAULT_DESC;
  const metaImage = image || DEFAULT_IMAGE;
  const currentUrl =
    url || (typeof window !== 'undefined' ? window.location.href : 'https://ggdadnetwork.com');

  return (
    <Helmet>
      {/* Basic Primary Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content="GGD Ad Network" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={metaImage} />
    </Helmet>
  );
};

export default MetaTags;
