
import { BlogPost, BlogSection } from "@/types/blog";
import { getPixabayImages } from "./pixabayService";
import { generateImageWithGemini } from "./geminiImageService";

const GEMINI_API_KEY = 'AIzaSyDRi8DYi5WbJzTYIbgVe5GyRYQSKWrkhxw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Function to add relevant emojis to content
const addEmojisToContent = (content: string, topic: string): string => {
  const topicLower = topic.toLowerCase();
  let emojiMap: { [key: string]: string } = {};
  
  // Define emoji replacements based on topic
  if (topicLower.includes('business') || topicLower.includes('finance')) {
    emojiMap = {
      'success': '🎯',
      'growth': '📈',
      'profit': '💰',
      'strategy': '🧠',
      'team': '👥',
      'goal': '🎯',
      'achieve': '🏆',
      'important': '⚡',
      'key': '🔑',
      'solution': '💡'
    };
  } else if (topicLower.includes('technology') || topicLower.includes('tech')) {
    emojiMap = {
      'innovation': '🚀',
      'digital': '💻',
      'future': '🔮',
      'smart': '🧠',
      'efficient': '⚡',
      'advanced': '🔬',
      'solution': '💡',
      'development': '🛠️',
      'progress': '📈',
      'breakthrough': '🌟'
    };
  } else if (topicLower.includes('health') || topicLower.includes('fitness')) {
    emojiMap = {
      'healthy': '💪',
      'wellness': '🌿',
      'fitness': '🏃',
      'nutrition': '🥗',
      'exercise': '💪',
      'energy': '⚡',
      'balance': '⚖️',
      'strong': '💪',
      'vital': '❤️',
      'natural': '🌱'
    };
  } else {
    // Default emojis for general content
    emojiMap = {
      'important': '⚡',
      'key': '🔑',
      'success': '🎯',
      'growth': '📈',
      'solution': '💡',
      'effective': '✨',
      'essential': '🌟',
      'valuable': '💎',
      'powerful': '🚀',
      'amazing': '🌟'
    };
  }
  
  // Replace words with emoji versions
  let enhancedContent = content;
  Object.entries(emojiMap).forEach(([word, emoji]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    enhancedContent = enhancedContent.replace(regex, `${word} ${emoji}`);
  });
  
  return enhancedContent;
};

export const generateBlogPost = async (topic: string): Promise<BlogPost> => {
  console.log('🚀 Generating blog post for topic:', topic);
  
  const prompt = `Create a comprehensive SEO-optimized blog post about "${topic}". 
  
  Structure the response as a JSON object with the following format:
  {
    "title": "SEO-optimized title (60 characters or less)",
    "metaDescription": "SEO meta description (150 characters or less)",
    "sections": [
      {
        "heading": "H2 heading",
        "content": "2-3 paragraphs of detailed content",
        "imageKeyword": "keyword for image search"
      }
    ]
  }
  
  Requirements:
  - Create 5-7 sections with H2 headings
  - Each section should have 2-3 paragraphs (150-200 words)
  - Use SEO best practices with relevant keywords
  - Include engaging, informative content
  - Make headings descriptive and keyword-rich
  - Provide image keywords for each section
  - Total length should be 1500-2000 words
  - Make content professional and engaging
  
  Return only the JSON object, no additional text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status}`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Clean up the response to extract JSON
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini API');
    }
    
    const blogData = JSON.parse(jsonMatch[0]);
    console.log('Parsed blog data:', blogData);
    
    console.log('📝 Blog data sections before image generation:', blogData.sections.length);
    
    // Generate emoji-based images for each section and enhance content with emojis
    const sectionsWithImagesAndEmojis = await Promise.all(
      blogData.sections.map(async (section: any, index: number) => {
        console.log(`🎨 Generating emoji image for section ${index + 1}:`, section.heading);
        
        try {
          const imagePrompt = section.imageKeyword || section.heading || topic;
          console.log(`🔎 Using image prompt: "${imagePrompt}"`);
          
          // Generate emoji-based image
          const emojiImageUrl = await generateImageWithGemini(imagePrompt);
          
          // Enhance content with relevant emojis
          const enhancedContent = addEmojisToContent(section.content, topic);
          
          if (emojiImageUrl) {
            console.log(`✅ Using emoji-based image for section ${index + 1}`);
            return {
              ...section,
              content: enhancedContent,
              imageUrl: emojiImageUrl,
              imageAlt: `Professional illustration: ${imagePrompt}`
            };
          } else {
            console.log(`🔄 Emoji image generation failed, falling back to Pixabay for section ${index + 1}`);
            
            // Fallback to Pixabay
            const searchQuery = section.imageKeyword || section.heading || topic;
            const images = await getPixabayImages(searchQuery);
            
            if (images.length > 0) {
              console.log(`✅ Using Pixabay fallback image for section ${index + 1}:`, images[0].webformatURL);
              return {
                ...section,
                content: enhancedContent,
                imageUrl: images[0].webformatURL,
                imageAlt: searchQuery
              };
            } else {
              console.warn(`❌ No images found for section ${index + 1}`);
              return {
                ...section,
                content: enhancedContent,
                imageUrl: null,
                imageAlt: imagePrompt
              };
            }
          }
        } catch (error) {
          console.error(`💥 Error processing image for section ${index + 1}:`, error);
          const enhancedContent = addEmojisToContent(section.content, topic);
          return {
            ...section,
            content: enhancedContent,
            imageUrl: null,
            imageAlt: section.imageKeyword || topic
          };
        }
      })
    );

    console.log('🎯 Sections with emoji images processed:', sectionsWithImagesAndEmojis.length);
    console.log('🎨 Emoji-based images:', sectionsWithImagesAndEmojis.filter(s => s.imageUrl && s.imageUrl.startsWith('data:')).length);
    console.log('🖼️ Pixabay fallback images:', sectionsWithImagesAndEmojis.filter(s => s.imageUrl && !s.imageUrl.startsWith('data:')).length);

    // Enhance title and meta description with emojis
    const enhancedTitle = addEmojisToContent(blogData.title, topic);
    const enhancedMetaDescription = addEmojisToContent(blogData.metaDescription, topic);

    const blogPost: BlogPost = {
      title: enhancedTitle,
      metaDescription: enhancedMetaDescription,
      sections: sectionsWithImagesAndEmojis
    };

    console.log('✅ Final blog post created with', blogPost.sections.length, 'sections and enhanced emojis');
    return blogPost;
    
  } catch (error) {
    console.error('💥 Error generating blog post:', error);
    throw new Error('Failed to generate blog post. Please try again.');
  }
};
