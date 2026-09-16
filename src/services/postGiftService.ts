import { supabase } from '@/integrations/supabase/client';
import { executeTransfer, verifyRecipient } from './transferService';

export interface VirtualGift {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  description: string;
  gradient: string;
  bgGlow: string;
  animationType: 'pulse' | 'bounce' | 'sparkle' | 'rocket' | 'crown' | 'fire';
}

export const VIRTUAL_GIFTS: VirtualGift[] = [
  {
    id: 'gift_flower',
    name: 'Flower Bouquet',
    emoji: '💐',
    cost: 10,
    description: 'Show appreciation & warm thanks',
    gradient: 'from-pink-500 to-rose-600',
    bgGlow: 'bg-rose-500/10 border-rose-500/30 text-rose-600',
    animationType: 'bounce',
  },
  {
    id: 'gift_coffee',
    name: 'Coffee Boost',
    emoji: '☕',
    cost: 25,
    description: 'Fuel the creator with caffeine power',
    gradient: 'from-amber-600 to-orange-700',
    bgGlow: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
    animationType: 'pulse',
  },
  {
    id: 'gift_fire',
    name: 'Fire Spark',
    emoji: '🔥',
    cost: 50,
    description: 'This post is pure value & on fire!',
    gradient: 'from-orange-500 to-red-600',
    bgGlow: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
    animationType: 'fire',
  },
  {
    id: 'gift_rocket',
    name: 'Rocket Boost',
    emoji: '🚀',
    cost: 100,
    description: 'Boost this creator to the moon!',
    gradient: 'from-blue-600 to-indigo-600',
    bgGlow: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
    animationType: 'rocket',
  },
  {
    id: 'gift_diamond',
    name: 'Diamond Gem',
    emoji: '💎',
    cost: 250,
    description: 'Rare brilliance & high-tier gratitude',
    gradient: 'from-cyan-500 to-blue-600',
    bgGlow: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600',
    animationType: 'sparkle',
  },
  {
    id: 'gift_crown',
    name: 'Royal Crown',
    emoji: '👑',
    cost: 500,
    description: 'Honor this creator as true royalty',
    gradient: 'from-amber-400 to-yellow-600',
    bgGlow: 'bg-amber-400/10 border-amber-400/30 text-amber-700',
    animationType: 'crown',
  },
  {
    id: 'gift_trophy',
    name: 'Legend Trophy',
    emoji: '🏆',
    cost: 1000,
    description: 'Legendary mastery & top community pillar',
    gradient: 'from-yellow-500 to-amber-600',
    bgGlow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700',
    animationType: 'sparkle',
  },
];

export interface PostGiftRecord {
  id: string;
  postId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  receiverId: string;
  giftId: string;
  giftName: string;
  giftEmoji: string;
  amount: number;
  note?: string;
  createdAt: string;
}

const LOCAL_GIFTS_CACHE_KEY = 'ggd_post_gifts_cache';

/**
 * Reads local cached gift records for fast offline / immediate UI updates.
 */
function getCachedGifts(): PostGiftRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_GIFTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves local cached gift records.
 */
function saveCachedGifts(records: PostGiftRecord[]) {
  try {
    localStorage.setItem(LOCAL_GIFTS_CACHE_KEY, JSON.stringify(records.slice(-200)));
  } catch {}
}

/**
 * Sends a real-time virtual gift to a post author.
 * Executes atomic credit transfer, registers gift in notifications and post comments,
 * and updates live supporter records.
 */
export async function sendPostGift(params: {
  postId: string;
  postAuthorId: string;
  postAuthorName: string;
  gift: VirtualGift;
  customAmount?: number;
  note?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  newBalance?: number;
  giftRecord?: PostGiftRecord;
}> {
  const {
    postId,
    postAuthorId,
    postAuthorName,
    gift,
    customAmount,
    note,
    currentUserId,
    currentUserName,
    currentUserAvatar,
  } = params;

  if (!currentUserId) {
    return { success: false, error: 'Please sign in to send a gift.' };
  }

  if (currentUserId === postAuthorId) {
    return { success: false, error: 'You cannot send a gift to your own post.' };
  }

  const amountToSend = customAmount && customAmount > 0 ? Math.floor(customAmount) : gift.cost;
  if (!amountToSend || amountToSend <= 0) {
    return { success: false, error: 'Invalid gift credit amount.' };
  }

  try {
    // 1. Verify recipient account
    const verifyRes = await verifyRecipient(postAuthorId, currentUserId);
    if (!verifyRes.success || !verifyRes.recipient) {
      return { success: false, error: verifyRes.error || 'Recipient account not found.' };
    }

    // 2. Execute credit transfer
    const transferRes = await executeTransfer(verifyRes.recipient, amountToSend);
    if (!transferRes.success) {
      return { success: false, error: transferRes.error || 'Failed to transfer credits.' };
    }

    // 3. Construct Gift Record
    const giftRecord: PostGiftRecord = {
      id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      postId,
      senderId: currentUserId,
      senderName: currentUserName || 'Community Member',
      senderAvatar: currentUserAvatar,
      receiverId: postAuthorId,
      giftId: gift.id,
      giftName: gift.name,
      giftEmoji: gift.emoji,
      amount: amountToSend,
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // 4. Cache locally for instant UI reactivity
    const currentCached = getCachedGifts();
    saveCachedGifts([giftRecord, ...currentCached]);

    // 5. Post celebratory gift comment to community post
    const commentContent = `🎁 Sent ${gift.emoji} ${gift.name} (${amountToSend} Credits)${note?.trim() ? ` — "${note.trim()}"` : ''}`;
    try {
      await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: commentContent,
      });
    } catch (commentErr) {
      console.warn('Non-blocking comment insertion note:', commentErr);
    }

    // 6. Send notification to post author
    try {
      await supabase.from('notifications').insert({
        user_id: postAuthorId,
        type: 'gift_received',
        title: `🎁 ${currentUserName || 'Someone'} gifted you ${gift.emoji} ${gift.name}!`,
        message: `${currentUserName || 'A member'} sent you ${amountToSend} credits on your post!${note?.trim() ? ` Note: "${note.trim()}"` : ''}`,
        link_url: '/#community',
        is_read: false,
      });
    } catch {}

    return {
      success: true,
      message: `Successfully gifted ${gift.emoji} ${gift.name} (${amountToSend} credits) to ${postAuthorName}!`,
      newBalance: transferRes.newBalance,
      giftRecord,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while sending gift.',
    };
  }
}

/**
 * Loads all gifts for a specific post (combining local cache and comments).
 */
export function getPostGifts(postId: string): {
  gifts: PostGiftRecord[];
  totalCredits: number;
  topSupporter?: { name: string; amount: number; avatar?: string | null };
} {
  const allCached = getCachedGifts();
  const postGifts = allCached.filter(g => g.postId === postId);

  const totalCredits = postGifts.reduce((sum, g) => sum + g.amount, 0);

  // Calculate top supporter
  const supporterMap = new Map<string, { name: string; amount: number; avatar?: string | null }>();
  postGifts.forEach(g => {
    const existing = supporterMap.get(g.senderId) || { name: g.senderName, amount: 0, avatar: g.senderAvatar };
    supporterMap.set(g.senderId, {
      name: g.senderName,
      avatar: g.senderAvatar || existing.avatar,
      amount: existing.amount + g.amount,
    });
  });

  let topSupporter: { name: string; amount: number; avatar?: string | null } | undefined;
  supporterMap.forEach((val) => {
    if (!topSupporter || val.amount > topSupporter.amount) {
      topSupporter = val;
    }
  });

  return {
    gifts: postGifts,
    totalCredits,
    topSupporter,
  };
}
