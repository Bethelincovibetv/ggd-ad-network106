import React, { useState, useRef } from 'react';
import { Reply, SmilePlus, Heart, ThumbsUp, Flame, CornerUpLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playSwipeReplySound } from '@/utils/audio';

export const WHATSAPP_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

interface WhatsAppSlideMessageProps {
  messageId: string;
  currentUserId: string | null;
  isMine: boolean;
  children: React.ReactNode;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
}

export const WhatsAppSlideMessage: React.FC<WhatsAppSlideMessageProps> = ({
  messageId,
  currentUserId,
  isMine,
  children,
  onReact,
  onReply,
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactions, setReactions] = useState<{ emoji: string; count: number; hasMine: boolean }[]>([]);
  const [hasTriggeredReplySound, setHasTriggeredReplySound] = useState(false);
  
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);

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

  const REPLY_THRESHOLD = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    isHorizontalSwipe.current = null;
    setHasTriggeredReplySound(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Detect if horizontal gesture vs vertical scroll
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (!isHorizontalSwipe.current) return;

    // Direct swipe right (or swipe inward depending on isMine)
    // In WhatsApp, swiping right on any message triggers Reply
    const cappedDiff = Math.max(-10, Math.min(85, diffX));
    setDragOffset(cappedDiff);

    if (cappedDiff >= REPLY_THRESHOLD && !hasTriggeredReplySound) {
      setHasTriggeredReplySound(true);
      playSwipeReplySound();
      if ('vibrate' in navigator) {
        try { navigator.vibrate(12); } catch {}
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    isHorizontalSwipe.current = null;

    if (dragOffset >= REPLY_THRESHOLD) {
      if (onReply) {
        onReply();
      }
    }
    setDragOffset(0);
    setHasTriggeredReplySound(false);
  };

  // Mouse slide support for desktop testing
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
    setHasTriggeredReplySound(false);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const diffX = moveEvent.clientX - touchStartX.current;
      const cappedDiff = Math.max(-10, Math.min(85, diffX));
      setDragOffset(cappedDiff);

      if (cappedDiff >= REPLY_THRESHOLD && !hasTriggeredReplySound) {
        setHasTriggeredReplySound(true);
        playSwipeReplySound();
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      setDragOffset((curr) => {
        if (curr >= REPLY_THRESHOLD && onReply) {
          onReply();
        }
        return 0;
      });
      setHasTriggeredReplySound(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleReact = async (emoji: string) => {
    setShowReactionBar(false);
    if (!currentUserId) {
      toast.error('Please sign in to react');
      return;
    }

    try {
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

  const replyProgress = Math.min(1, Math.max(0, dragOffset / REPLY_THRESHOLD));
  const isTriggered = dragOffset >= REPLY_THRESHOLD;

  return (
    <div
      className="relative group/msg my-1 select-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* WhatsApp Slide-to-Reply Icon Indicator behind the sliding bubble */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 z-0 flex items-center justify-center transition-all duration-75 pointer-events-none"
        style={{
          opacity: replyProgress > 0.15 ? 1 : 0,
          transform: `translateY(-50%) translateX(${Math.max(0, dragOffset * 0.45 - 12)}px) scale(${0.7 + replyProgress * 0.4})`,
        }}
      >
        <div
          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all shadow-md ${
            isTriggered
              ? 'bg-orange-500 text-white scale-110 ring-2 ring-orange-400/40'
              : 'bg-muted/90 text-muted-foreground border border-border'
          }`}
        >
          <CornerUpLeft className={`h-4 w-4 transition-transform ${isTriggered ? 'rotate-[-20deg]' : ''}`} />
        </div>
      </div>

      {/* Floating Reaction Bar (Quick Reaction Popup) */}
      {showReactionBar && (
        <div
          className={`absolute -top-10 z-30 flex items-center gap-1 bg-background/95 backdrop-blur-md px-2 py-1 rounded-full shadow-xl border border-border/80 animate-in fade-in zoom-in-95 duration-150 ${
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

      {/* Main message bubble with physics slide transform */}
      <div
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        className="relative z-10"
      >
        {children}

        {/* Hover / Quick action tools for desktop */}
        <div
          className={`absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 z-20 ${
            isMine ? '-left-16' : '-right-16'
          }`}
        >
          {onReply && (
            <button
              type="button"
              onClick={() => {
                playSwipeReplySound();
                onReply();
              }}
              className="h-6 w-6 rounded-full bg-background shadow-xs border border-border flex items-center justify-center text-muted-foreground hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
              title="Reply to message"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowReactionBar((p) => !p)}
            className="h-6 w-6 rounded-full bg-background shadow-xs border border-border flex items-center justify-center text-muted-foreground hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
            title="React with emoji"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Reaction Badges attached to bubble */}
      {reactions.length > 0 && (
        <div
          className={`flex items-center gap-1 mt-0.5 flex-wrap z-10 relative ${
            isMine ? 'justify-end pr-1' : 'justify-start pl-1'
          }`}
        >
          {reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => handleReact(r.emoji)}
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold border transition-all shadow-2xs ${
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

