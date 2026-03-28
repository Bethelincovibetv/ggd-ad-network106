
// Using a public Pixabay API key - in production, this should be stored securely
const PIXABAY_API_KEY = '47598442-ead9bf76ada46ed96edc4f2c9';
const PIXABAY_API_URL = 'https://pixabay.com/api/';

export interface PixabayImage {
  id: number;
  webformatURL: string;
  tags: string;
  user: string;
}

export const getPixabayImages = async (query: string): Promise<PixabayImage[]> => {
  console.log('🔍 Fetching images for query:', query);
  
  try {
    // Clean the query to remove special characters and make it more search-friendly
    const cleanQuery = query
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(' ')
      .slice(0, 3) // Take only first 3 words for better results
      .join(' ');
    
    console.log('🧹 Cleaned query:', cleanQuery);
    
    if (!cleanQuery) {
      console.warn('⚠️ Empty query after cleaning, using fallback');
      return [];
    }

    const url = `${PIXABAY_API_URL}?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(cleanQuery)}&image_type=photo&category=business&safesearch=true&per_page=10&min_width=640&min_height=480&order=popular`;
    
    console.log('🌐 Pixabay API URL:', url);
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Pixabay API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('✅ Pixabay API response:', {
      totalHits: data.totalHits,
      hits: data.hits?.length || 0,
      query: cleanQuery
    });
    
    if (data.hits && data.hits.length > 0) {
      console.log('🖼️ First image URL:', data.hits[0].webformatURL);
      console.log('🏷️ First image tags:', data.hits[0].tags);
    } else {
      console.warn('⚠️ No images found for query:', cleanQuery);
    }
    
    return data.hits || [];
    
  } catch (error) {
    console.error('💥 Error fetching images from Pixabay:', error);
    return [];
  }
};
