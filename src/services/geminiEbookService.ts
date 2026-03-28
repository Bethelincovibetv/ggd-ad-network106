
const GEMINI_API_KEY = 'AIzaSyDRi8DYi5WbJzTYIbgVe5GyRYQSKWrkhxw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface EbookGenerationRequest {
  topic: string;
  authorName: string;
  pages: number;
  category: string;
  tone: string;
  description?: string;
  authorBio?: string;
}

export const generateEbookWithGemini = async (request: EbookGenerationRequest): Promise<string> => {
  console.log('Starting ebook generation with request:', request);
  
  const prompt = `Create a comprehensive ${request.pages}-page ebook about "${request.topic}" in the ${request.category} category.

Title: "${request.topic}" by ${request.authorName}

Requirements:
- Write in a ${request.tone.toLowerCase()} tone
- Create ${request.pages} pages of high-quality, well-researched content
- Include a proper table of contents
- Each chapter should be substantial and informative
- Use proper formatting with headers, subheaders, and paragraphs
- Make it professional and ready for Amazon KDP
${request.description ? `- Additional context: ${request.description}` : ''}

Structure the ebook as follows:
1. Title Page: "${request.topic}" by ${request.authorName}
2. Table of Contents
3. Introduction
4. Main chapters (distribute content across ${Math.max(request.pages - 4, 1)} chapters)
5. Conclusion

Make sure the content is:
- Original and engaging
- Well-researched and accurate
- Properly formatted for reading
- Professional quality
- Suitable for the ${request.category} category
- Written in ${request.tone.toLowerCase()} style

Generate the complete ebook content now:`;

  try {
    console.log('Making request to Gemini API...');
    
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
        }
      })
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response data:', data);
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini API response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    let generatedContent = data.candidates[0].content.parts[0].text;
    console.log('Generated content length:', generatedContent.length);
    
    // Add author details at the end if bio is provided
    if (request.authorBio) {
      generatedContent += `\n\n---\n\n## About the Author\n\n**${request.authorName}**\n\n${request.authorBio}`;
    } else {
      generatedContent += `\n\n---\n\n## About the Author\n\n**${request.authorName}** is the author of "${request.topic}" and specializes in ${request.category.toLowerCase()}.`;
    }

    console.log('Ebook generation completed successfully');
    return generatedContent;
  } catch (error) {
    console.error('Error generating ebook with Gemini:', error);
    throw new Error(`Failed to generate ebook content: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
  }
};
