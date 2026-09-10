import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

let customGeminiKey = '';
let customPexelsKey = '';

// Helper to get initialized GoogleGenAI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = customGeminiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------
// API Route: Admin API Key Configuration
// ----------------------------------------------------
app.get('/api/admin/config', (req, res) => {
  const activeGemini = Boolean(customGeminiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  const activePexels = Boolean(customPexelsKey || process.env.PEXELS_API_KEY || process.env.VITE_PEXELS_API_KEY);
  return res.json({
    hasGeminiKey: activeGemini,
    hasPexelsKey: activePexels,
  });
});

app.post('/api/admin/config', (req, res) => {
  const { geminiApiKey, pexelsApiKey } = req.body;
  if (typeof geminiApiKey === 'string') {
    customGeminiKey = geminiApiKey.trim();
  }
  if (typeof pexelsApiKey === 'string') {
    customPexelsKey = pexelsApiKey.trim();
  }
  return res.json({
    success: true,
    message: 'API keys updated successfully in server environment.',
    hasGeminiKey: Boolean(customGeminiKey || process.env.GEMINI_API_KEY),
    hasPexelsKey: Boolean(customPexelsKey || process.env.PEXELS_API_KEY),
  });
});

// ----------------------------------------------------
// API Route: Pexels Image Search for Blog & Flyers
// ----------------------------------------------------
app.get('/api/search-pexels', async (req, res) => {
  const query = (req.query.query as string || 'business').trim();
  const perPage = Math.min(20, Math.max(4, Number(req.query.per_page) || 12));
  const apiKey = customPexelsKey || process.env.PEXELS_API_KEY || process.env.VITE_PEXELS_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`, {
        headers: {
          Authorization: apiKey,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const photos = (data.photos || []).map((p: any) => ({
          id: String(p.id),
          url: p.src?.large2x || p.src?.large || p.src?.medium,
          thumbnail: p.src?.medium || p.src?.small,
          photographer: p.photographer,
          photographerUrl: p.photographer_url,
          alt: p.alt || query,
        }));
        return res.json({ success: true, photos, source: 'pexels' });
      }
    } catch (err) {
      console.warn('Pexels API fetch error:', err);
    }
  }

  // Curated High-Definition Photo Fallback (Zero-Failure)
  const curatedPool = [
    { id: 'p1', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80', photographer: 'Lukas Blazek', alt: `${query} analytics` },
    { id: 'p2', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80', photographer: 'Austin Distel', alt: `${query} team strategy` },
    { id: 'p3', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80', photographer: 'Alexandre Debiève', alt: `${query} technology` },
    { id: 'p4', url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=400&q=80', photographer: 'Micheile Henderson', alt: `${query} finance growth` },
    { id: 'p5', url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=400&q=80', photographer: 'Mike Petrucci', alt: `${query} business store` },
    { id: 'p6', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80', photographer: 'Annie Spratt', alt: `${query} collaborative achievement` },
    { id: 'p7', url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80', photographer: 'Amy Hirschi', alt: `${query} meeting leadership` },
    { id: 'p8', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80', thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80', photographer: 'Hunters Race', alt: `${query} modern executive` }
  ];

  return res.json({ success: true, photos: curatedPool, source: 'curated' });
});


// ----------------------------------------------------
// API Route: Blog Generation
// ----------------------------------------------------
app.post('/api/generate-blog', async (req, res) => {
  const { topic } = req.body;
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const prompt = `Create a comprehensive SEO-optimized blog post about "${topic}". 
  
Structure the response strictly as a JSON object with this format:
{
  "title": "SEO-optimized headline (60 characters or less)",
  "metaDescription": "SEO lead summary / hook (150 characters or less)",
  "sections": [
    {
      "heading": "H2 descriptive heading",
      "content": "2-3 comprehensive, actionable paragraphs with practical business strategies, steps, and real-world examples",
      "imageKeyword": "keyword for relevant business visual"
    }
  ]
}

Requirements:
- Create 4-6 deep, actionable sections with compelling H2 headings
- Include high-value, engaging insights and professional advice
- Return strictly valid JSON with no markdown backticks or commentary.`;

  try {
    const ai = getGeminiClient();
    if (ai) {
      // Try gemini-3.8-flash first, fallback to gemini-2.5-flash
      const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
      let generatedText: string | null = null;
      let lastErr: any = null;

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          });
          if (response.text) {
            generatedText = response.text;
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`Attempt with ${model} failed, trying next model:`, err);
        }
      }

      if (generatedText) {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({ success: true, data: parsed });
        }
      }
      if (lastErr) {
        console.warn('Gemini generateContent error:', lastErr);
      }
    }

    // High quality intelligent template fallback if API key not present or temporary network limit
    const fallback = generateFallbackBlog(topic);
    return res.json({ success: true, data: fallback, fallback: true });
  } catch (error: any) {
    console.error('Error in /api/generate-blog:', error);
    const fallback = generateFallbackBlog(topic);
    return res.json({ success: true, data: fallback, fallback: true });
  }
});

// ----------------------------------------------------
// API Route: Ebook Generation
// ----------------------------------------------------
app.post('/api/generate-ebook', async (req, res) => {
  const { topic, authorName, pages, category, tone, description, authorBio } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const prompt = `Create a comprehensive ${pages || 5}-page ebook about "${topic}" in the ${category || 'Business'} category.
Author: ${authorName || 'Industry Leader'}
Tone: ${tone || 'Professional and informative'}
${description ? `Context: ${description}` : ''}

Structure the ebook with:
1. Title Page: "${topic}" by ${authorName || 'Author'}
2. Table of Contents
3. Introduction
4. Main Chapters with practical steps, strategies, and case studies
5. Conclusion & Action Checklist`;

  try {
    const ai = getGeminiClient();
    if (ai) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          if (response.text) {
            let content = response.text;
            if (authorBio) {
              content += `\n\n---\n\n## About the Author\n\n**${authorName}**\n\n${authorBio}`;
            }
            return res.json({ success: true, content });
          }
        } catch (err) {
          console.warn(`Ebook generation with ${model} failed:`, err);
        }
      }
    }

    const fallbackContent = generateFallbackEbook({ topic, authorName, pages, category, tone, description, authorBio });
    return res.json({ success: true, content: fallbackContent, fallback: true });
  } catch (error: any) {
    console.error('Error in /api/generate-ebook:', error);
    const fallbackContent = generateFallbackEbook({ topic, authorName, pages, category, tone, description, authorBio });
    return res.json({ success: true, content: fallbackContent, fallback: true });
  }
});

// ----------------------------------------------------
// Fallback Generators for High Availability & Zero-Crash
// ----------------------------------------------------
function generateFallbackBlog(topic: string) {
  const cleanTopic = topic.trim();
  return {
    title: `Mastering ${cleanTopic}: The Complete Growth Blueprint`,
    metaDescription: `Discover proven strategies, actionable frameworks, and step-by-step tactics to excel in ${cleanTopic} and accelerate your results.`,
    sections: [
      {
        heading: `1. Understanding the Foundation of ${cleanTopic}`,
        content: `In today's fast-paced digital marketplace, mastering ${cleanTopic} is essential for creating sustainable competitive advantages. By establishing clear milestones, aligning your resources, and focusing on high-impact objectives, businesses can unlock exponential growth.\n\nWhether you are scaling an existing enterprise or launching a brand-new initiative, clarity of purpose and disciplined execution remain the single biggest drivers of long-term success.`,
        imageKeyword: `${cleanTopic} strategy`,
      },
      {
        heading: '2. Core Strategies & Tactical Implementation',
        content: `Successful implementation begins with identifying key bottlenecks and replacing outdated workflows with streamlined, data-backed processes. Focusing on consistent outreach, community engagement, and audience retention allows you to build compounding momentum.\n\nLeverage automated tools, transparent analytics, and syndicate networks to multiply your reach without increasing overhead.`,
        imageKeyword: 'business growth team',
      },
      {
        heading: '3. Overcoming Common Roadblocks & Scaling Up',
        content: `Most initiatives stumble not from lack of vision, but from inconsistent follow-through. By anticipating operational hurdles and maintaining proactive customer communication, you build resilience and high conversion rates.\n\nContinuous optimization through testing, feedback loops, and customer discovery will position your brand as a trusted authority.`,
        imageKeyword: 'achievement success',
      },
      {
        heading: '4. Key Takeaways & Actionable Next Steps',
        content: `To put these insights into immediate practice, audit your current funnel, establish three key performance metrics, and execute with relentless consistency. Connect with partners across the GGD network to amplify your promotions today!`,
        imageKeyword: 'innovation future',
      },
    ],
  };
}

function generateFallbackEbook(data: any) {
  const { topic, authorName, category, tone, authorBio } = data;
  return `# ${topic}

**By ${authorName || 'GGD Creator'}**
*Category: ${category || 'Business & Entrepreneurship'} | Tone: ${tone || 'Professional'}*

---

## Table of Contents
1. Introduction & The Core Philosophy
2. Building Your Strategic Advantage
3. Step-by-Step Execution Framework
4. Scaling, Monetization & Automation
5. Conclusion & Next Milestones

---

## Chapter 1: Introduction & The Core Philosophy
Welcome to the definitive guide on **${topic}**. In this book, we break down the fundamental principles that separate high-performers from the rest of the market. Success in ${category || 'this domain'} requires a blend of vision, rapid adaptation, and consistent execution.

---

## Chapter 2: Building Your Strategic Advantage
To thrive in today's competitive landscape, you must craft an offer and position that resonates deeply with your target audience. Focus on solving high-value problems and delivering measurable impact.

---

## Chapter 3: Step-by-Step Execution Framework
1. **Audit & Plan**: Define clear benchmarks and metrics.
2. **Execute**: Ship continuously and gather immediate market feedback.
3. **Refine**: Eliminate friction points and double down on highest ROI channels.

---

## Chapter 4: Scaling & Long-Term Growth
Once your core foundation is proven, utilize community syndication, automated marketing pipelines, and strategic partnerships to scale effortlessly.

---

## Chapter 5: Conclusion
The blueprint is now in your hands. Consistent daily action turns knowledge into unstoppable momentum.

---

## About the Author
**${authorName || 'The Author'}** ${authorBio ? `\n\n${authorBio}` : `is a specialist in ${category || 'business and digital marketing'}.`}`;
}

// ----------------------------------------------------
// Vite Middleware / Static Serve
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
