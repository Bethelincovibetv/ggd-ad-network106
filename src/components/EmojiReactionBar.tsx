import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { toast } from 'sonner';

// Common emoji set shared across comments, replies and chat messages.
export const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉'];

interface EmojiReactionBarProps {
  targetType: 'comment' | 'message' | 'post';
  targetId: string;
  currentUserId: string | null;
  className?: string;
}

interface Row { id: string; user_id: string; emoji: string }

const EmojiReactionBar: React.FC<EmojiReactionBarProps> = ({ targetType, targetId, currentUserId, className = '' }) => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [targetId]);

  const load = async () => {
    const { data } = await supabase
      .from('emoji_reactions')
      .select('id, user_id, emoji')
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    setRows((data as any) || []);
  };

  const toggle = async (emoji: string) => {
    if (!currentUserId) { toast.error('Please sign in to react'); return; }
    const mine = rows.find(r => r.user_id === currentUserId && r.emoji === emoji);
    if (mine) {
      setRows(prev => prev.filter(r => r.id !== mine.id));
      await supabase.from('emoji_reactions').delete().eq('id', mine.id);
    } else {
      const optimistic: Row = { id: `tmp-${Date.now()}`, user_id: currentUserId, emoji };
      setRows(prev => [...prev, optimistic]);
      const { data, error } = await supabase
        .from('emoji_reactions')
        .insert({ target_type: targetType, target_id: targetId, user_id: currentUserId, emoji })
        .select('id, user_id, emoji')
        .maybeSingle();
      if (error) { setRows(prev => prev.filter(r => r.id !== optimistic.id)); return; }
      if (data) setRows(prev => prev.map(r => (r.id === optimistic.id ? (data as any) : r)));
    }
  };

  const grouped = COMMON_EMOJIS
    .map(e => ({ emoji: e, count: rows.filter(r => r.emoji === e).length, mine: rows.some(r => r.emoji === e && r.user_id === currentUserId) }))
    .filter(g => g.count > 0);

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {grouped.map(g => (
        <button
          key={g.emoji}
          onClick={() => toggle(g.emoji)}
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] border transition-colors ${
            g.mine ? 'bg-orange-500/15 border-orange-500/40 text-orange-600' : 'bg-muted border-transparent text-muted-foreground'
          }`}
        >
          <span className="text-[13px] leading-none">{g.emoji}</span>
          <span className="font-semibold">{g.count}</span>
        </button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button className="text-muted-foreground hover:text-orange-500 p-0.5" aria-label="Add reaction">
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1 flex gap-1" side="top">
          {COMMON_EMOJIS.map(e => (
            <button key={e} onClick={() => toggle(e)} className="text-xl hover:scale-125 transition-transform p-0.5">
              {e}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default EmojiReactionBar;
