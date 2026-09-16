import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, X, Image as ImageIcon } from 'lucide-react';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  category: string;
}

export const CURATED_GIFS: GifItem[] = [
  // 1. Reactions & Gestures
  { id: 'g_thumbs_up', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', category: 'Reactions' },
  { id: 'g_clap', title: 'Applause & Respect', url: 'https://media.giphy.com/media/l9TlXHpcPjRRm/giphy.gif', category: 'Reactions' },
  { id: 'g_laugh', title: 'Laughing Out Loud', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', category: 'Reactions' },
  { id: 'g_mindblown', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', category: 'Reactions' },
  { id: 'g_nod', title: 'Agreement Nod', url: 'https://media.giphy.com/media/NEvPzZ8bd1V4Y/giphy.gif', category: 'Reactions' },
  { id: 'g_wow', title: 'Wow & Shocked', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', category: 'Reactions' },

  // 2. Business & Money
  { id: 'g_money_rain', title: 'Cash Rain / Alert', url: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif', category: 'Business' },
  { id: 'g_deal_done', title: 'Deal Done Handshake', url: 'https://media.giphy.com/media/3oKIPcfXQ0R0sdmQg8/giphy.gif', category: 'Business' },
  { id: 'g_success', title: 'Success Hustle', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', category: 'Business' },
  { id: 'g_working', title: 'Hard Work Shipping', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', category: 'Business' },
  { id: 'g_orders', title: 'Orders Coming In', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', category: 'Business' },

  // 3. Celebration & Dance
  { id: 'g_dance', title: 'Celebration Dance', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', category: 'Celebration' },
  { id: 'g_confetti', title: 'Party Confetti', url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', category: 'Celebration' },
  { id: 'g_cheers', title: 'Cheers Toast', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', category: 'Celebration' },
  { id: 'g_fireworks', title: 'Fireworks Glow', url: 'https://media.giphy.com/media/26BROqpt73bE5m2u4/giphy.gif', category: 'Celebration' },

  // 4. Love & Gratitude
  { id: 'g_love_heart', title: 'Heart Glow', url: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif', category: 'Love' },
  { id: 'g_thank_you', title: 'Thank You So Much', url: 'https://media.giphy.com/media/osAcIGMETeseE036U5/giphy.gif', category: 'Love' },
  { id: 'g_blessings', title: 'Blessings & Prayer', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', category: 'Love' },
];

const GIF_CATEGORIES = ['All', 'Reactions', 'Business', 'Celebration', 'Love'];

interface GifPickerPopoverProps {
  onSelectGif: (gifUrl: string) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export const GifPickerPopover: React.FC<GifPickerPopoverProps> = ({
  onSelectGif,
  trigger,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = CURATED_GIFS.filter(g => {
    const matchesCat = activeCategory === 'All' || g.category === activeCategory;
    const matchesSearch = !search.trim() || 
      g.title.toLowerCase().includes(search.toLowerCase()) || 
      g.category.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handlePick = (url: string) => {
    onSelectGif(url);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 px-2.5 rounded-xl hover:bg-purple-500/10 text-foreground font-semibold flex items-center gap-1.5"
            title="Add Animated GIF"
          >
            <span className="text-[11px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-600 text-white shadow-2xs">
              GIF
            </span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-80 sm:w-96 p-3 rounded-2xl shadow-xl border border-border bg-popover z-50 space-y-2.5"
      >
        <div className="flex items-center justify-between pb-1 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase px-1.5 py-0.5 rounded bg-purple-600 text-white">
              GIF
            </span>
            <span className="text-xs font-bold text-foreground">Select Animated GIF</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reaction GIFs..."
            className="h-8 pl-8 text-xs bg-muted/40 rounded-xl"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {GIF_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 transition-colors ${
                activeCategory === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid of GIFs */}
        <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto p-0.5 rounded-lg">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => handlePick(g.url)}
              className="group relative aspect-video rounded-lg overflow-hidden border border-border/70 hover:border-purple-500 transition-all hover:scale-102 bg-muted/30"
            >
              <img
                src={g.url}
                alt={g.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-medium px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {g.title}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GifPickerPopover;
