export interface VixoraToolEntry {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: 'video' | 'voice' | 'growth' | 'creative' | 'mentorship';
  icon: string;
  gradient: string;
  badge?: string;
  actionType: 'tab' | 'live_voice' | 'chat_command' | 'modal';
  targetTab?: string;
  suggestedPrompt?: string;
  keywords: string[];
}

export const VIXORA_TOOLS_REGISTRY: VixoraToolEntry[] = [
  {
    id: 'tool_naija_script',
    name: 'High-Converting Nigerian Sales Script Writer',
    shortDescription: 'Generate authentic Nigerian sales copy, WhatsApp broadcast pitches, TikTok & FB ad scripts.',
    fullDescription: 'Specialized direct-response copywriter for Nigerian products and offers. Generates authentic Pidgin/English hooks, WhatsApp broadcast closers, and conversion scripts with payment urgency.',
    category: 'growth',
    icon: 'fa-feather-pointed',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'NAIJA AI',
    actionType: 'chat_command',
    suggestedPrompt: 'Write a high-converting Nigerian WhatsApp sales pitch for my product with promo price',
    keywords: ['naija', 'nigerian', 'script writer', 'sales copy', 'whatsapp', 'facebook ad', 'pidgin', 'high converting']
  },
  {
    id: 'tool_chat_assistant',
    name: 'Vixora AI Chat Assistant',
    shortDescription: 'Conversational assistant with GGD account lookup, storefront tools & model switching.',
    fullDescription: 'Conversational AI assistant powered by server-side Gemini & Gemma free-tier models. Ask questions directly, inspect products, request banner graphics, or draft copy.',
    category: 'mentorship',
    icon: 'fa-comments',
    gradient: 'from-orange-500 to-amber-600',
    badge: 'VIXORA AI',
    actionType: 'chat_command',
    suggestedPrompt: 'Help me plan a 7-day product promotion strategy on GGD Ad Network',
    keywords: ['chat', 'assistant', 'ai chat', 'command', 'conversation']
  },
  {
    id: 'tool_script_genius',
    name: 'Direct Ad & Video Script Writer',
    shortDescription: 'Generate clear, high-retention ad scripts with hooks, talking points & CTAs.',
    fullDescription: 'Generates structured ad and outreach scripts optimized for clarity and conversion.',
    category: 'growth',
    icon: 'fa-scroll',
    gradient: 'from-purple-500 to-indigo-600',
    badge: 'AD SCRIPT',
    actionType: 'chat_command',
    suggestedPrompt: 'Write a direct 45-second ad script for my GGD storefront offer',
    keywords: ['script', 'writer', 'ad script', 'hook', 'cta', 'copywriting']
  },
  {
    id: 'tool_growth_seo',
    name: 'Growth & SEO Suite',
    shortDescription: 'High-ranking SEO tags, 3-second viral opening hooks & thumbnail concepts.',
    fullDescription: 'Supercharge video CTR and search discoverability. Generate comma-separated tags, 5 high-retention opening hooks, and high-CTR visual thumbnail concepts.',
    category: 'growth',
    icon: 'fa-bolt-lightning',
    gradient: 'from-emerald-500 to-teal-600',
    badge: 'VIRAL SEO',
    actionType: 'tab',
    targetTab: 'more',
    suggestedPrompt: 'Generate high-ranking SEO tags and viral hooks for crypto trading',
    keywords: ['seo', 'tags', 'hooks', 'thumbnails', 'growth', 'ctr', 'keywords', 'rank']
  },
  {
    id: 'tool_banner_ad',
    name: 'GGD Banner Advert Creator',
    shortDescription: 'Create high-converting 300x250, 728x90 & 1080x1080 banner ads for GGD Ad Network.',
    fullDescription: 'Professional graphic advertising engine. Generate crisp, high-converting banner ads tailored for GGD Ad Network campaigns, websites, and social syndicate promotions with custom CTA buttons.',
    category: 'growth',
    icon: 'fa-rectangle-ad',
    gradient: 'from-orange-500 to-amber-600',
    badge: 'GGD ADS',
    actionType: 'chat_command',
    suggestedPrompt: 'Generate a high-converting 300x250 banner advert for GGD Ad Network',
    keywords: ['banner', 'advert', 'ad', 'ggd ad', 'leaderboard', 'rectangle', 'commercial', 'sponsor']
  },
  {
    id: 'tool_flyer_generator',
    name: 'Promotional Flyer & Graphic Canvas',
    shortDescription: 'Design eye-catching social media promotional flyers and banner graphics.',
    fullDescription: 'Canvas-powered graphic designer. Generates 1080x1350 high-resolution promotional flyers with custom typography, gradient themes, and badge headers.',
    category: 'creative',
    icon: 'fa-image',
    gradient: 'from-pink-500 to-rose-600',
    badge: 'CANVAS ART',
    actionType: 'chat_command',
    suggestedPrompt: 'Generate a promotional flyer banner for my YouTube channel launch',
    keywords: ['flyer', 'banner', 'thumbnail', 'graphic', 'poster', 'instagram', 'image', 'design']
  },
  {
    id: 'tool_subtitle_styler',
    name: 'TikTok Subtitle & Caption Styler',
    shortDescription: 'CapCut & TikTok style animated subtitles with pop green highlights.',
    fullDescription: 'Apply trendy, high-retention subtitle presets including TikTok Pop Green, YouTube Bold Yellow, Cyber Neon, and Minimal White.',
    category: 'creative',
    icon: 'fa-closed-captioning',
    gradient: 'from-teal-500 to-emerald-600',
    badge: 'CAPCUT STYLE',
    actionType: 'chat_command',
    suggestedPrompt: 'Set subtitle caption style to TikTok Pop Green',
    keywords: ['subtitles', 'captions', 'tiktok captions', 'capcut', 'text overlay', 'style']
  },
  {
    id: 'tool_sister_vixora',
    name: 'Sister Vixora Faith & Growth Mentor',
    shortDescription: 'Spiritual motivation, faith alignment, and personal growth guidance.',
    fullDescription: 'Personalized spiritual and creator mentorship guided by faith, encouraging quotes, scripture alignment, and daily purpose coaching.',
    category: 'mentorship',
    icon: 'fa-cross',
    gradient: 'from-amber-600 to-orange-700',
    badge: 'MENTORSHIP',
    actionType: 'tab',
    targetTab: 'coach',
    suggestedPrompt: 'Give me a spiritual message and motivation for creators today',
    keywords: ['faith', 'mentor', 'spiritual', 'sister vixora', 'encouragement', 'coaching', 'bible']
  },
  {
    id: 'tool_learned_skills',
    name: 'Custom Learned Skills & Brand Rules',
    shortDescription: 'Teach Vixora custom workflow preferences, channel voice, and formatting rules.',
    fullDescription: 'Store persistent rules and skills into Vixora AI memory. Customize video durations, preferred voice narrators, or brand styling guidelines.',
    category: 'mentorship',
    icon: 'fa-brain',
    gradient: 'from-indigo-500 to-purple-600',
    badge: 'AI MEMORY',
    actionType: 'chat_command',
    suggestedPrompt: 'Learn a new skill: Always make my scripts 30 seconds and fast paced',
    keywords: ['learned skills', 'memory', 'preferences', 'rules', 'brand voice', 'custom skill']
  }
];
