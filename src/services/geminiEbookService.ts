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

  try {
    const response = await fetch('/api/generate-ebook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.content) {
        return data.content;
      }
    }
  } catch (error) {
    console.warn('Backend /api/generate-ebook fetch failed, creating structured fallback:', error);
  }

  // Client-side structured fallback
  return `# ${request.topic}

**By ${request.authorName || 'Author'}**
*Category: ${request.category || 'Business'} | Tone: ${request.tone || 'Professional'}*

---

## Table of Contents
1. Introduction & Overview
2. Strategic Foundations
3. Core Tactics & Step-by-Step Implementation
4. Scaling & Long-Term Results
5. Conclusion & Action Checklist

---

## Chapter 1: Introduction & Overview
Welcome to **${request.topic}**. In this comprehensive guide, we examine the essential frameworks and methodologies required to succeed in ${request.category.toLowerCase()}.

---

## Chapter 2: Strategic Foundations
Building a competitive advantage starts with clear objectives, validated audience feedback, and disciplined focus.

---

## Chapter 3: Core Tactics & Implementation
1. **Set Benchmarks**: Establish measurable KPIs.
2. **Execute Rapidly**: Iterate based on real market data.
3. **Syndicate & Promote**: Utilize distributed networks to amplify your reach.

---

## Chapter 4: Scaling & Long-Term Growth
Consistent execution and modern marketing tools ensure sustainable growth and compounding returns.

---

## Chapter 5: Conclusion
Take immediate action on these insights to transform your business outcomes.

---

## About the Author
**${request.authorName}** ${request.authorBio ? `\n\n${request.authorBio}` : `is a specialist in ${request.category.toLowerCase()}.`}`;
};
