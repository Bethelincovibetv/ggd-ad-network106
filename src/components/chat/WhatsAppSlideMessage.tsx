import React, { useState, useRef } from 'react';
import { SmilePlus, Heart, ThumbsUp, Flame } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const WHATSAPP_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

interface WhatsAppSlideMessageProps {
  messageId: string;
  currentUserId: string | null;
  isMine: boolean;
  children: React.ReactNode;
  onReact?: (emoji: string) => void;
}

export const WhatsAppSlideMessage: React.FC<WhatsAppSlideMessageProps> = ({
  messageId,
  currentUserId,
  isMine,
  children,
  onReact,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactions, setReactions] = useState<{ emoji: string; count: number; hasMine: boolean }[]>([]);
  const touchStartX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Load reactions for this message
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('emoji_reactions')
        .select('id, user_id, emoji')
        .eq('target_type', 'message')
        .eq('target_id', messageId);

      if (!mounted) return;
      if (data) {
        const grouped = WHATSAPP_EMOJIS.map((e) => {
          const matching = data.filter((r: any) => r.emoji === e);
          return {
            emoji: e,
            count: matching.length,
            hasMine: matching.some((r: any) => r.user_id === currentUserId),
          };
        }).filter((g) => g.count > 0);
        setReactions(grouped);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [messageId, currentUserId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Slide range
    if (Math.abs(diff) < 90) {
      setDragOffset(diff);
      if (Math.abs(diff) > 40) {
        setShowReactionBar(true);
      }
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (Math.abs(dragOffset) > 40) {
      setShowReactionBar(true);
    }
    setDragOffset(0);
  };

  const handleReact = async (emoji: string) => {
    setShowReactionBar(false);
    if (!currentUserId) {
      toast.error('Please sign in to react');
      return;
    }

    try {
      // Check if already reacted
      const { data: existing } = await supabase
        .from('emoji_reactions')
        .select('id')
        .eq('target_type', 'message')
        .eq('target_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from('emoji_reactions').delete().eq('id', existing.id);
        setReactions((prev) =>
          prev
            .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, hasMine: false } : r))
            .filter((r) => r.count > 0)
        );
      } else {
        setReactions((prev) => {
          const exists = prev.find((r) => r.emoji === emoji);
          if (exists) {
            return prev.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, hasMine: true } : r));
          }
          return [...prev, { emoji, count: 1, hasMine: true }];
        });

        await supabase.from('emoji_reactions').insert({
          target_type: 'message',
          target_id: messageId,
          user_id: currentUserId,
          emoji,
        });
      }

      if (onReact) onReact(emoji);
    } catch (err: any) {
      console.error('Failed to react:', err);
    }
  };

  return (
    <div
      className="relative group/msg my-1 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* WhatsApp Floating Slide Reaction Bar */}
      {showReactionBar && (
        <div
          className={`absolute -top-10 z-30 flex items-center gap-1.5 bg-background/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-xl border border-border/80 animate-in fade-in zoom-in-95 duration-150 ${
            isMine ? 'right-0' : 'left-0'
          }`}
        >
          {WHATSAPP_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReact(emoji)}
              className="text-lg hover:scale-135 active:scale-95 transition-transform duration-150 p-1"
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowReactionBar(false)}
            className="text-xs text-muted-foreground hover:text-foreground ml-1 p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main message bubble with gesture slide transform */}
      <div
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
        }}
        className="relative"
      >
        {children}

        {/* Hover / Slide quick action reaction trigger icon */}
        <button
          type="button"
          onClick={() => setShowReactionBar((p) => !p)}
          className={`absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity h-6 w-6 rounded-full bg-background/90 shadow-sm border border-border flex items-center justify-center text-muted-foreground hover:text-orange-500 z-10 ${
            isMine ? '-left-7' : '-right-7'
          }`}
          title="Slide or click to react"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* WhatsApp Reaction Badges attached to bubble */}
      {reactions.length > 0 && (
        <div
          className={`flex items-center gap-1 mt-0.5 flex-wrap ${
            isMine ? 'justify-end pr-1' : 'justify-start pl-1'
          }`}
        >
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => handleReact(r.emoji)}
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold border transition-all shadow-xs ${
                r.hasMine
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-600'
                  : 'bg-background/90 border-border text-foreground/80'
              }`}
            >
              <span className="text-xs leading-none">{r.emoji}</span>
              {r.count > 1 && <span>{r.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhatsAppSlideMessage;
