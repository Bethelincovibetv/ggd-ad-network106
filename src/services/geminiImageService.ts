
const GEMINI_API_KEY = 'AIzaSyDRi8DYi5WbJzTYIbgVe5GyRYQSKWrkhxw';
const GEMINI_IMAGE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Emoji mapping for different topics
const getTopicEmojis = (topic: string): string[] => {
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('business') || topicLower.includes('finance') || topicLower.includes('money')) {
    return ['💼', '📊', '💰', '📈', '🏢', '💳', '📱', '🎯'];
  }
  if (topicLower.includes('technology') || topicLower.includes('tech') || topicLower.includes('digital')) {
    return ['💻', '📱', '🚀', '⚡', '🔧', '🌐', '📡', '🤖'];
  }
  if (topicLower.includes('health') || topicLower.includes('fitness') || topicLower.includes('medical')) {
    return ['🏥', '💊', '🩺', '❤️', '🏃', '🥗', '💪', '🧘'];
  }
  if (topicLower.includes('education') || topicLower.includes('learning') || topicLower.includes('school')) {
    return ['📚', '🎓', '✏️', '📝', '🧠', '💡', '🔬', '📖'];
  }
  if (topicLower.includes('food') || topicLower.includes('cooking') || topicLower.includes('recipe')) {
    return ['🍳', '🥘', '🍽️', '👨‍🍳', '🥕', '🍅', '🧄', '🌶️'];
  }
  if (topicLower.includes('travel') || topicLower.includes('vacation') || topicLower.includes('adventure')) {
    return ['✈️', '🏖️', '🗺️', '🧳', '📸', '🌍', '🏔️', '🚢'];
  }
  if (topicLower.includes('environment') || topicLower.includes('eco') || topicLower.includes('green')) {
    return ['🌱', '🌳', '♻️', '🌍', '🌿', '🍃', '🌺', '🦋'];
  }
  
  // Default emojis for general topics
  return ['✨', '🎯', '💡', '🚀', '⭐', '🔥', '💫', '🌟'];
};

export const generateImageWithGemini = async (prompt: string): Promise<string | null> => {
  console.log('🎨 Generating emoji-based image for prompt:', prompt);
  
  try {
    // Get relevant emojis for the topic
    const topicEmojis = getTopicEmojis(prompt);
    const primaryEmoji = topicEmojis[0];
    const secondaryEmojis = topicEmojis.slice(1, 4);
    
    // Create a beautiful emoji-based image using SVG
    const imageDataUrl = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#db2777;stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg)" />
        
        <!-- Decorative circles -->
        <circle cx="150" cy="100" r="60" fill="rgba(255,255,255,0.1)" />
        <circle cx="650" cy="300" r="80" fill="rgba(255,255,255,0.08)" />
        <circle cx="700" cy="120" r="40" fill="rgba(255,255,255,0.12)" />
        
        <!-- Main emoji (large) -->
        <text x="400" y="220" font-size="120" text-anchor="middle" filter="url(#glow)">${primaryEmoji}</text>
        
        <!-- Secondary emojis (smaller, positioned around) -->
        <text x="250" y="150" font-size="48" text-anchor="middle" opacity="0.8">${secondaryEmojis[0] || '✨'}</text>
        <text x="550" y="150" font-size="48" text-anchor="middle" opacity="0.8">${secondaryEmojis[1] || '💫'}</text>
        <text x="320" y="320" font-size="40" text-anchor="middle" opacity="0.7">${secondaryEmojis[2] || '⭐'}</text>
        
        <!-- Title background -->
        <rect x="50" y="340" width="700" height="50" fill="rgba(0,0,0,0.3)" rx="25" />
        
        <!-- Title text -->
        <foreignObject x="60" y="350" width="680" height="30">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 20px; 
            color: white; 
            text-align: center; 
            font-weight: 600;
            line-height: 1.2;
            word-wrap: break-word;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          ">
            ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}
          </div>
        </foreignObject>
      </svg>
    `)}`;
    
    console.log('✅ Emoji-based image generated successfully');
    return imageDataUrl;
    
  } catch (error) {
    console.error('💥 Error generating emoji-based image:', error);
    return null;
  }
};
