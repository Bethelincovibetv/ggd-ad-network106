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
}

export const POST_TEMPLATES: PostTemplate[] = [
  // Generic gradients
  { id: 'sunset',     name: 'Sunset',      category: 'Vibes',   background: 'linear-gradient(135deg,#ff6a00,#ee0979)',                    textColor: 'text-white' },
  { id: 'ocean',      name: 'Ocean',       category: 'Vibes',   background: 'linear-gradient(135deg,#2193b0,#6dd5ed)',                    textColor: 'text-white' },
  { id: 'midnight',   name: 'Midnight',    category: 'Vibes',   background: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',            textColor: 'text-white' },
  { id: 'aurora',     name: 'Aurora',      category: 'Vibes',   background: 'linear-gradient(135deg,#00c9ff,#92fe9d)',                    textColor: 'text-slate-900' },
  { id: 'candy',      name: 'Candy',       category: 'Vibes',   background: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)',                    textColor: 'text-slate-900' },
  { id: 'royal',      name: 'Royal',       category: 'Vibes',   background: 'linear-gradient(135deg,#141e30,#243b55)',                    textColor: 'text-white' },

  // Food & restaurant
  { id: 'spice',      name: 'Spice',       category: 'Food',    background: 'linear-gradient(135deg,#7b1f0c,#d63a1a,#f6a623)',            textColor: 'text-white' },
  { id: 'jollof',     name: 'Jollof',      category: 'Food',    background: 'radial-gradient(circle at 30% 20%,#ffd86b,#ff7b00 60%,#a83200)', textColor: 'text-white' },
  { id: 'fresh',      name: 'Fresh',       category: 'Food',    background: 'linear-gradient(135deg,#11998e,#38ef7d)',                    textColor: 'text-white' },

  // Beauty & fashion
  { id: 'rose',       name: 'Rose',        category: 'Beauty',  background: 'linear-gradient(135deg,#f857a6,#ff5858)',                    textColor: 'text-white' },
  { id: 'glam',       name: 'Glam',        category: 'Beauty',  background: 'linear-gradient(135deg,#000000,#434343)',                    textColor: 'text-white' },
  { id: 'peach',      name: 'Peach',       category: 'Beauty',  background: 'linear-gradient(135deg,#ffecd2,#fcb69f)',                    textColor: 'text-slate-900' },

  // Tech & business
  { id: 'neon',       name: 'Neon',        category: 'Tech',    background: 'linear-gradient(135deg,#00f2fe,#4facfe)',                    textColor: 'text-slate-900' },
  { id: 'matrix',     name: 'Matrix',      category: 'Tech',    background: 'linear-gradient(135deg,#000000,#0f9b0f)',                    textColor: 'text-white' },
  { id: 'corporate',  name: 'Corporate',   category: 'Tech',    background: 'linear-gradient(135deg,#1f4037,#99f2c8)',                    textColor: 'text-white' },

  // Events & promo
  { id: 'party',      name: 'Party',       category: 'Events',  background: 'linear-gradient(135deg,#ff0099,#493240)',                    textColor: 'text-white' },
  { id: 'birthday',   name: 'Birthday',    category: 'Events',  background: 'linear-gradient(135deg,#ff9a8b,#ff6a88,#ff99ac)',            textColor: 'text-white' },
  { id: 'wedding',    name: 'Wedding',     category: 'Events',  background: 'linear-gradient(135deg,#fdfcfb,#e2d1c3)',                    textColor: 'text-slate-900' },

  // Religious / motivation
  { id: 'sunrise',    name: 'Sunrise',     category: 'Inspire', background: 'linear-gradient(135deg,#f7971e,#ffd200)',                    textColor: 'text-slate-900' },
  { id: 'gospel',     name: 'Gospel',      category: 'Inspire', background: 'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)',            textColor: 'text-white' },
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
