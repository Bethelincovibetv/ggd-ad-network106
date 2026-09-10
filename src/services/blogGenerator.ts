import { BlogPost } from "@/types/blog";
import { getPixabayImages } from "./pixabayService";
import { generateImageWithGemini } from "./geminiImageService";

// Function to add relevant emojis to content
const addEmojisToContent = (content: string, topic: string): string => {
  const topicLower = topic.toLowerCase();
  let emojiMap: { [key: string]: string } = {};

  if (topicLower.includes('business') || topicLower.includes('finance')) {
    emojiMap = {
      success: '🎯',
      growth: '📈',
      profit: '💰',
      strategy: '🧠',
      team: '👥',
      goal: '🎯',
      achieve: '🏆',
      important: '⚡',
      key: '🔑',
      solution: '💡',
    };
  } else if (topicLower.includes('technology') || topicLower.includes('tech')) {
    emojiMap = {
      innovation: '🚀',
      digital: '💻',
      future: '🔮',
      smart: '🧠',
      efficient: '⚡',
      advanced: '🔬',
      solution: '💡',
      development: '🛠️',
      progress: '📈',
      breakthrough: '🌟',
    };
  } else if (topicLower.includes('health') || topicLower.includes('fitness')) {
    emojiMap = {
      healthy: '💪',
      wellness: '🌿',
      fitness: '🏃',
      nutrition: '🥗',
      exercise: '💪',
      energy: '⚡',
      balance: '⚖️',
      strong: '💪',
      vital: '❤️',
      natural: '🌱',
    };
  } else {
    emojiMap = {
      important: '⚡',
      key: '🔑',
      success: '🎯',
      growth: '📈',
      solution: '💡',
      effective: '✨',
      essential: '🌟',
      valuable: '💎',
      powerful: '🚀',
      amazing: '🌟',
    };
  }

  let enhancedContent = content;
  Object.entries(emojiMap).forEach(([word, emoji]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    enhancedContent = enhancedContent.replace(regex, `${word} ${emoji}`);
  });

  return enhancedContent;
};

export const generateBlogPost = async (topic: string): Promise<BlogPost> => {
  console.log('🚀 Generating blog post for topic:', topic);

  let blogData: any = null;

  try {
    const response = await fetch('/api/generate-blog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });

    if (response.ok) {
      const resJson = await response.json();
      if (resJson && resJson.data) {
        blogData = resJson.data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/generate-blog request error, using internal fallback:', err);
  }

  // If blogData wasn't obtained from backend
  if (!blogData || !blogData.title || !Array.isArray(blogData.sections)) {
    blogData = {
      title: `The Ultimate Guide to ${topic.trim()}: Strategies for Growth`,
      metaDescription: `Discover key insights, tactical strategies, and actionable advice to master ${topic.trim()} and achieve outstanding results.`,
      sections: [
        {
          heading: `1. Foundations of ${topic.trim()}`,
          content: `To succeed with ${topic.trim()}, you need a rock-solid foundation. Setting clear objectives and tracking essential performance indicators allows your team to move with speed and confidence.`,
          imageKeyword: `${topic} strategy`,
        },
        {
          heading: '2. Actionable Implementation Strategies',
          content: `Executing your plan requires consistent focus. Replace friction-heavy manual processes with streamlined workflows, and leverage the power of community syndication to amplify your reach.`,
          imageKeyword: 'growth team strategy',
        },
        {
          heading: '3. Scaling and Long-Term Value Creation',
          content: `Continuous optimization through real-time feedback and data analysis ensures long-term dominance. Focus on customer satisfaction and community relationships for sustainable ROI.`,
          imageKeyword: 'success innovation',
        },
      ],
    };
  }

  // Generate images for sections
  const sectionsWithImages = await Promise.all(
    blogData.sections.map(async (section: any, index: number) => {
      try {
        const imagePrompt = section.imageKeyword || section.heading || topic;
        const emojiImageUrl = await generateImageWithGemini(imagePrompt);
        const enhancedContent = addEmojisToContent(section.content || '', topic);

        if (emojiImageUrl) {
          return {
            ...section,
            content: enhancedContent,
            imageUrl: emojiImageUrl,
            imageAlt: `Illustration: ${imagePrompt}`,
          };
        }

        // Fallback to Pixabay
        const pixabayImages = await getPixabayImages(imagePrompt);
        if (pixabayImages.length > 0) {
          return {
            ...section,
            content: enhancedContent,
            imageUrl: pixabayImages[0].webformatURL,
            imageAlt: imagePrompt,
          };
        }

        return {
          ...section,
          content: enhancedContent,
          imageUrl: null,
          imageAlt: imagePrompt,
        };
      } catch (e) {
        return {
          ...section,
          content: addEmojisToContent(section.content || '', topic),
          imageUrl: null,
          imageAlt: section.heading,
        };
      }
    })
  );

  const finalTitle = addEmojisToContent(blogData.title, topic);
  const finalMeta = addEmojisToContent(blogData.metaDescription || '', topic);

  return {
    title: finalTitle,
    metaDescription: finalMeta,
    sections: sectionsWithImages,
  };
};
