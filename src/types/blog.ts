
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
      return {
        is_blog: true,
        title: String(data.title || '').trim(),
        subtitle: data.subtitle ? String(data.subtitle).trim() : undefined,
        category: data.category ? String(data.category).trim() : 'Business',
        read_time: data.read_time || calculateReadTime(data),
        cover_image: data.cover_image || null,
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

