import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, X, Image as ImageIcon, Flame, Smile, Briefcase, Heart, PartyPopper, Flower2, Loader2, RefreshCw } from 'lucide-react';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  category: string;
  isSticker?: boolean;
}

export const CURATED_GIFS_AND_STICKERS: GifItem[] = [
  // 1. Reactions & Gestures
  { id: 'g_thumbs_up', title: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', category: 'Reactions' },
  { id: 'g_clap', title: 'Applause & Respect', url: 'https://media.giphy.com/media/l9TlXHpcPjRRm/giphy.gif', category: 'Reactions' },
  { id: 'g_laugh', title: 'Laughing Out Loud', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', category: 'Reactions' },
  { id: 'g_mindblown', title: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', category: 'Reactions' },
  { id: 'g_nod', title: 'Agreement Nod', url: 'https://media.giphy.com/media/NEvPzZ8bd1V4Y/giphy.gif', category: 'Reactions' },
  { id: 'g_wow', title: 'Wow & Shocked', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', category: 'Reactions' },
  { id: 'g_eyes', title: 'Eye Roll & Looking', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', category: 'Reactions' },
  { id: 'g_popcorn', title: 'Eating Popcorn', url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif', category: 'Reactions' },
  { id: 'g_salute', title: 'Salute & Respect', url: 'https://media.giphy.com/media/l0ExbnGIX9sMlEV9e/giphy.gif', category: 'Reactions' },

  // 2. Animated Stickers (Transparent & Expressive)
  { id: 'stk_fire_glow', title: 'Burning Fire', url: 'https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_star_gold', title: 'Sparkling Star', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_heart_pulse', title: 'Pulsing Heart', url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_hundred', title: '100 Percent', url: 'https://media.giphy.com/media/3o7TKpKJHK0pwJaN2w/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_money_bag', title: 'Cash Bag Flow', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_crown', title: 'Golden Crown', url: 'https://media.giphy.com/media/3o7TKxOzWkgxIIMhrs/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_verified', title: 'Verified Badge Glow', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif', category: 'Stickers', isSticker: true },
  { id: 'stk_rocket', title: 'Rocket Launch', url: 'https://media.giphy.com/media/3o7TKF5DTHxuj4zAyc/giphy.gif', category: 'Stickers', isSticker: true },

  // 3. Business & Hustle
  { id: 'g_money_rain', title: 'Cash Rain Alert', url: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif', category: 'Business' },
  { id: 'g_deal_done', title: 'Deal Done Handshake', url: 'https://media.giphy.com/media/3oKIPcfXQ0R0sdmQg8/giphy.gif', category: 'Business' },
  { id: 'g_success', title: 'Success Hustle', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', category: 'Business' },
  { id: 'g_working', title: 'Hard Work Shipping', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', category: 'Business' },
  { id: 'g_orders', title: 'Orders Coming In', url: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif', category: 'Business' },
  { id: 'g_stonks', title: 'Profits Up & Growth', url: 'https://media.giphy.com/media/YnkMcHgNIMW4Yfmjxr/giphy.gif', category: 'Business' },

  // 4. Celebration & Dance
  { id: 'g_dance', title: 'Celebration Dance', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif', category: 'Celebration' },
  { id: 'g_confetti', title: 'Party Confetti', url: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif', category: 'Celebration' },
  { id: 'g_cheers', title: 'Cheers Toast', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', category: 'Celebration' },
  { id: 'g_fireworks', title: 'Fireworks Glow', url: 'https://media.giphy.com/media/26BROqpt73bE5m2u4/giphy.gif', category: 'Celebration' },
  { id: 'g_victory', title: 'Victory Cheer', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', category: 'Celebration' },

  // 5. Love, Flowers & Botanical
  { id: 'g_love_heart', title: 'Heart Glow', url: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif', category: 'Love & Flowers' },
  { id: 'g_rose_bloom', title: 'Rose Blooming', url: 'https://media.giphy.com/media/3og0IPxMM41XZ0q5Vu/giphy.gif', category: 'Love & Flowers' },
  { id: 'g_sunflower', title: 'Sunflower Glow', url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif', category: 'Love & Flowers' },
  { id: 'g_thank_you', title: 'Thank You So Much', url: 'https://media.giphy.com/media/osAcIGMETeseE036U5/giphy.gif', category: 'Love & Flowers' },
  { id: 'g_blessings', title: 'Blessings & Prayer', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif', category: 'Love & Flowers' },
  { id: 'g_hugs', title: 'Warm Hug', url: 'https://media.giphy.com/media/3M4NpbLCTxBqU/giphy.gif', category: 'Love & Flowers' },
];

export const CURATED_GIFS = CURATED_GIFS_AND_STICKERS;

const GIF_CATEGORIES = [
  { id: 'All', label: '🔥 All GIFs', icon: Flame },
  { id: 'Stickers', label: '✨ Stickers', icon: Sparkles },
  { id: 'Reactions', label: '😂 Reactions', icon: Smile },
  { id: 'Business', label: '💼 Business', icon: Briefcase },
  { id: 'Celebration', label: '🎉 Party', icon: PartyPopper },
  { id: 'Love & Flowers', label: '🌸 Flowers', icon: Flower2 },
];

const POPULAR_SEARCH_TAGS = [
  'Clap', 'Mind blown', 'Cash', 'Congrats', 'Laugh', 'Love', 'Fire', 'Rose', 'Deal', 'Dance'
];

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
  const [onlineResults, setOnlineResults] = useState<GifItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  // Live real-time search engine with API integration
  useEffect(() => {
    if (!open) return;
    const query = search.trim();
    if (!query) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        // Search Giphy public API for rich real-time gifs/stickers
        const isStickerSearch = activeCategory === 'Stickers' || query.toLowerCase().includes('sticker');
        const endpoint = isStickerSearch
          ? `https://api.giphy.com/v1/stickers/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=15&rating=g`
          : `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=15&rating=g`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.data) && data.data.length > 0) {
            const parsed: GifItem[] = data.data.map((item: any) => ({
              id: `api_${item.id}`,
              title: item.title || query,
              url: item.images?.fixed_height?.url || item.images?.downsized_medium?.url || item.images?.original?.url,
              category: isStickerSearch ? 'Stickers' : 'Reactions',
              isSticker: isStickerSearch,
            })).filter((item: GifItem) => !!item.url);
            setOnlineResults(parsed);
          } else {
            setOnlineResults([]);
          }
        }
      } catch (err) {
        // Fallback gracefully to curated set on network limits
        console.warn('Real-time GIF fetch note:', err);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search, activeCategory, open]);

  const displayedItems = useMemo(() => {
    if (onlineResults.length > 0 && search.trim()) {
      return onlineResults;
    }

    return CURATED_GIFS_AND_STICKERS.filter(g => {
      const matchesCat = activeCategory === 'All' 
        ? true 
        : activeCategory === 'Stickers' 
          ? g.isSticker || g.category === 'Stickers'
          : g.category === activeCategory;

      const matchesSearch = !search.trim() || 
        g.title.toLowerCase().includes(search.toLowerCase()) || 
        g.category.toLowerCase().includes(search.toLowerCase());

      return matchesCat && matchesSearch;
    });
  }, [onlineResults, search, activeCategory]);

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
            title="Add Animated GIF or Sticker"
          >
            <span className="text-[11px] font-black uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs">
              GIF
            </span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-80 sm:w-96 p-3 rounded-2xl shadow-2xl border border-border bg-popover z-50 space-y-2.5"
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xs">
              GIF & Stickers
            </span>
            <span className="text-xs font-bold text-foreground">Real-Time Search</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Real-time search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search any GIF or sticker in real-time..."
            className="h-8 pl-8 pr-7 text-xs bg-muted/40 rounded-xl"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {POPULAR_SEARCH_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSearch(tag)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/60 hover:bg-purple-500/15 hover:text-purple-600 text-muted-foreground shrink-0 transition"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-border/40">
          {GIF_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  if (search) setSearch('');
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Loading state during live search */}
        {isSearchingOnline && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" /> Searching GIFs & stickers...
          </div>
        )}

        {/* Grid of GIFs and Animated Stickers */}
        <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto p-0.5 rounded-lg">
          {displayedItems.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => handlePick(g.url)}
              className={`group relative ${g.isSticker ? 'aspect-square bg-muted/10 p-1 flex items-center justify-center' : 'aspect-video bg-muted/40'} rounded-lg overflow-hidden border border-border/70 hover:border-purple-500 hover:ring-2 hover:ring-purple-500/30 transition-all hover:scale-102`}
            >
              <img
                src={g.url}
                alt={g.title}
                loading="lazy"
                className={g.isSticker ? "max-h-full max-w-full object-contain" : "w-full h-full object-cover"}
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[9px] font-medium px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {g.title}
              </span>
            </button>
          ))}
          {displayedItems.length === 0 && !isSearchingOnline && (
            <div className="col-span-3 text-center py-6 text-xs text-muted-foreground">
              No matching GIFs or stickers found for "{search}". Try searching "clap", "fire", or "love".
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GifPickerPopover;

