import React from 'react';
import MetaTags from './MetaTags';

interface Props {
  title: string;
  description?: string | null;
  image?: string | null;
  path?: string;
  type?: 'website' | 'article' | 'product' | 'profile' | 'business';
  badge?: string | null;
  theme?: 'orange' | 'emerald' | 'purple' | 'dark' | 'gradient';
  jsonLd?: Record<string, unknown>;
}

/** Shared SEO + Open Graph head for public pages */
const SeoHead: React.FC<Props> = ({
  title,
  description,
  image,
  path,
  type = 'website',
  badge,
  jsonLd,
}) => {
  return (
    <MetaTags
      title={title}
      description={description}
      imageUrl={image}
      path={path}
      type={type}
      badge={badge}
      jsonLd={jsonLd}
    />
  );
};

export default SeoHead;