// Background templates for text-only community posts (Facebook style).
// Each template is rendered with pure CSS so they load instantly and look great
// at any size. Templates are grouped by theme so users can quickly pick one
// that matches their business or vibe.

export interface PostTemplate {
  id: string;
  name: string;
  category: string;
  background: string;     // any valid CSS background value
  textColor: string;      // tailwind text color class
  font?: string;          // optional tailwind font class
  isAnimated?: boolean;
}

export const POST_TEMPLATES: PostTemplate[] = [
  // 1. Floral & Botanical Themes
  { 
    id: 'floral-blossom', 
    name: '🌸 Blossom', 
    category: 'Floral', 
    background: 'radial-gradient(circle at 20% 20%, #ffe4e6 0%, #f43f5e 50%, #881337 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'floral-sunflower', 
    name: '🌻 Sunflower', 
    category: 'Floral', 
    background: 'linear-gradient(135deg, #fef08a 0%, #eab308 40%, #713f12 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'floral-rose', 
    name: '🌹 Royal Rose', 
    category: 'Floral', 
    background: 'linear-gradient(135deg, #be123c 0%, #881337 50%, #4c0519 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'floral-tropical', 
    name: '🌿 Tropical', 
    category: 'Floral', 
    background: 'linear-gradient(135deg, #059669 0%, #064e3b 60%, #022c22 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'floral-lavender', 
    name: '🪻 Lavender', 
    category: 'Floral', 
    background: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 50%, #3b0764 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'floral-daisy', 
    name: '🌼 Petals', 
    category: 'Floral', 
    background: 'linear-gradient(135deg, #fed7aa 0%, #fb923c 50%, #9a3412 100%)', 
    textColor: 'text-white' 
  },

  // 2. Animated Themes
  { 
    id: 'anim-aurora', 
    name: '✨ Aurora Waves', 
    category: 'Animated', 
    background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)', 
    textColor: 'text-white',
    isAnimated: true 
  },
  { 
    id: 'anim-gold-shimmer', 
    name: '👑 Gold Shimmer', 
    category: 'Animated', 
    background: 'linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)', 
    textColor: 'text-amber-950 font-black',
    isAnimated: true 
  },
  { 
    id: 'anim-cyber-neon', 
    name: '⚡ Cyber Pulse', 
    category: 'Animated', 
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', 
    textColor: 'text-cyan-300 font-extrabold',
    isAnimated: true 
  },
  { 
    id: 'anim-fire-blaze', 
    name: '🔥 Mega Blaze', 
    category: 'Animated', 
    background: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', 
    textColor: 'text-white font-extrabold',
    isAnimated: true 
  },
  { 
    id: 'anim-galaxy-disco', 
    name: '🎆 Celebration', 
    category: 'Animated', 
    background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)', 
    textColor: 'text-amber-300 font-black',
    isAnimated: true 
  },

  // 3. African Culture & Nigerian Vibes
  { 
    id: 'ankara-vibes', 
    name: '🇳🇬 Ankara Vibes', 
    category: 'Culture', 
    background: 'linear-gradient(135deg, #15803d 0%, #ca8a04 50%, #b91c1c 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'lagos-sunset', 
    name: '🌇 Lagos Sunset', 
    category: 'Culture', 
    background: 'linear-gradient(135deg, #f97316 0%, #db2777 50%, #4c1d95 100%)', 
    textColor: 'text-white' 
  },
  { 
    id: 'kente-gold', 
    name: '🦁 Kente Pride', 
    category: 'Culture', 
    background: 'linear-gradient(135deg, #eab308 0%, #dc2626 50%, #1e1b4b 100%)', 
    textColor: 'text-amber-100 font-black' 
  },

  // 4. Vibes & Mood
  { id: 'sunset',     name: 'Sunset',      category: 'Vibes',   background: 'linear-gradient(135deg,#ff6a00,#ee0979)',                    textColor: 'text-white' },
  { id: 'ocean',      name: 'Ocean',       category: 'Vibes',   background: 'linear-gradient(135deg,#2193b0,#6dd5ed)',                    textColor: 'text-white' },
  { id: 'midnight',   name: 'Midnight',    category: 'Vibes',   background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',            textColor: 'text-white' },
  { id: 'aurora',     name: 'Aurora',      category: 'Vibes',   background: 'linear-gradient(135deg,#00c9ff,#92fe9d)',                    textColor: 'text-slate-900' },
  { id: 'candy',      name: 'Candy',       category: 'Vibes',   background: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)',                    textColor: 'text-slate-900' },
  { id: 'royal',      name: 'Royal',       category: 'Vibes',   background: 'linear-gradient(135deg,#141e30,#243b55)',                    textColor: 'text-white' },

  // 5. Food & Restaurant
  { id: 'spice',      name: 'Spice',       category: 'Food',    background: 'linear-gradient(135deg,#7b1f0c,#d63a1a,#f6a623)',            textColor: 'text-white' },
  { id: 'jollof',     name: 'Jollof',      category: 'Food',    background: 'radial-gradient(circle at 30% 20%,#ffd86b,#ff7b00 60%,#a83200)', textColor: 'text-white' },
  { id: 'fresh',      name: 'Fresh',       category: 'Food',    background: 'linear-gradient(135deg,#11998e,#38ef7d)',                    textColor: 'text-white' },

  // 6. Beauty & Fashion
  { id: 'rose',       name: 'Pink Glam',   category: 'Beauty',  background: 'linear-gradient(135deg,#f857a6,#ff5858)',                    textColor: 'text-white' },
  { id: 'glam',       name: 'Dark Velvet', category: 'Beauty',  background: 'linear-gradient(135deg,#000000,#434343)',                    textColor: 'text-white' },
  { id: 'peach',      name: 'Peach Glow',  category: 'Beauty',  background: 'linear-gradient(135deg,#ffecd2,#fcb69f)',                    textColor: 'text-slate-900' },

  // 7. Tech & Business
  { id: 'neon',       name: 'Neon Blue',   category: 'Tech',    background: 'linear-gradient(135deg,#00f2fe,#4facfe)',                    textColor: 'text-slate-900' },
  { id: 'matrix',     name: 'Matrix Code', category: 'Tech',    background: 'linear-gradient(135deg,#000000,#0f9b0f)',                    textColor: 'text-white' },
  { id: 'corporate',  name: 'Corporate',   category: 'Tech',    background: 'linear-gradient(135deg,#1f4037,#99f2c8)',                    textColor: 'text-white' },

  // 8. Events & Promo
  { id: 'party',      name: 'Party Glow',  category: 'Events',  background: 'linear-gradient(135deg,#ff0099,#493240)',                    textColor: 'text-white' },
  { id: 'birthday',   name: 'Birthday',    category: 'Events',  background: 'linear-gradient(135deg,#ff9a8b,#ff6a88,#ff99ac)',            textColor: 'text-white' },
  { id: 'wedding',    name: 'Wedding',     category: 'Events',  background: 'linear-gradient(135deg,#fdfcfb,#e2d1c3)',                    textColor: 'text-slate-900' },

  // 9. Motivation & Faith
  { id: 'sunrise',    name: 'Sunrise Hope', category: 'Inspire', background: 'linear-gradient(135deg,#f7971e,#ffd200)',                    textColor: 'text-slate-900' },
  { id: 'gospel',     name: 'Grace & Glory', category: 'Inspire', background: 'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)',            textColor: 'text-white' },
];

export const TEMPLATE_CATEGORIES = Array.from(new Set(POST_TEMPLATES.map(t => t.category)));

export const findTemplate = (id: string | null | undefined): PostTemplate | null =>
  id ? POST_TEMPLATES.find(t => t.id === id) || null : null;

// Pull #hashtags out of post content. Returns lowercased tag list (no #).
export const extractHashtags = (text: string | null | undefined): string[] => {
  if (!text) return [];
  const matches = text.match(/#([\p{L}0-9_]{2,40})/gu) || [];
  const unique = new Set(matches.map(t => t.slice(1).toLowerCase()));
  return Array.from(unique).slice(0, 20);
};
