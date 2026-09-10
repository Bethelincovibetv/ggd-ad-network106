
export interface BlogSection {
  heading: string;
  content: string;
  imageUrl?: string | null;
  imageAlt?: string;
}

export interface BlogPost {
  title: string;
  metaDescription: string;
  sections: BlogSection[];
}

export interface CommunityBlogPostData {
  is_blog: true;
  title: string;
  subtitle?: string;
  category?: string;
  read_time?: string;
  cover_image?: string | null;
  sections: BlogSection[];
  tags?: string[];
  author_note?: string;
}

export const DEFAULT_CATEGORY_COVERS: Record<string, string> = {
  'Business Growth': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'Marketing & Ads': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
  'Tips & Guides': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
  'Technology & AI': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'Product Spotlight': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
  'Finance & Wealth': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80',
  'Success Story': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'Industry News': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
  'Default': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
};

export const getCategoryCover = (category?: string, existingCover?: string | null): string => {
  if (existingCover && existingCover.trim()) return existingCover;
  if (category && DEFAULT_CATEGORY_COVERS[category]) return DEFAULT_CATEGORY_COVERS[category];
  return DEFAULT_CATEGORY_COVERS['Default'];
};

/**
 * Parses and validates if a community post content is a structured blog article.
 */
export const parseBlogPost = (content: string | null | undefined): CommunityBlogPostData | null => {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    const data = JSON.parse(trimmed);
    if ((data.is_blog === true || data.sections) && data.title) {
      const category = data.category ? String(data.category).trim() : 'Business Growth';
      return {
        is_blog: true,
        title: String(data.title || '').trim(),
        subtitle: data.subtitle ? String(data.subtitle).trim() : undefined,
        category,
        read_time: data.read_time || calculateReadTime(data),
        cover_image: getCategoryCover(category, data.cover_image),
        sections: Array.isArray(data.sections) ? data.sections : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        author_note: data.author_note ? String(data.author_note).trim() : undefined,
      };
    }
  } catch (_e) {
    // Not a JSON blog payload
  }
  return null;
};

/**
 * Calculates human-readable reading time from blog content.
 */
export const calculateReadTime = (blog: { title?: string; subtitle?: string; sections?: BlogSection[] }): string => {
  let wordCount = (blog.title || '').split(/\s+/).length + (blog.subtitle || '').split(/\s+/).length;
  if (Array.isArray(blog.sections)) {
    blog.sections.forEach(s => {
      wordCount += (s.heading || '').split(/\s+/).length;
      wordCount += (s.content || '').split(/\s+/).length;
    });
  }
  const minutes = Math.max(1, Math.ceil(wordCount / 180));
  return `${minutes} min read`;
};

/**
 * Serializes a structured blog post into the stored community_posts string representation.
 */
export const serializeBlogPost = (blog: Omit<CommunityBlogPostData, 'is_blog'> & { is_blog?: true }): string => {
  const payload: CommunityBlogPostData = {
    is_blog: true,
    title: blog.title.trim(),
    subtitle: blog.subtitle?.trim() || undefined,
    category: blog.category || 'Business',
    read_time: blog.read_time || calculateReadTime(blog),
    cover_image: blog.cover_image || null,
    sections: blog.sections || [],
    tags: blog.tags || [],
    author_note: blog.author_note?.trim() || undefined,
  };
  return JSON.stringify(payload);
};

