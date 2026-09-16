import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Gift,
  Coins,
  Sparkles,
  Heart,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { VIRTUAL_GIFTS, VirtualGift, sendPostGift, PostGiftRecord } from '@/services/postGiftService';
import { playRewardSound } from '@/lib/soundEffects';

interface SendGiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postAuthorId: string;
  postAuthorName: string;
  postAuthorAvatar?: string | null;
  postExcerpt?: string;
  currentUserCredits: number;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string | null;
  onGiftSent?: (giftRecord: PostGiftRecord, newBalance: number) => void;
  onNavigateToFunding?: () => void;
}

export const SendGiftModal: React.FC<SendGiftModalProps> = ({
  open,
  onOpenChange,
  postId,
  postAuthorId,
  postAuthorName,
  postAuthorAvatar,
  postExcerpt,
  currentUserCredits,
  currentUserId,
  currentUserName = 'You',
  currentUserAvatar,
  onGiftSent,
  onNavigateToFunding,
}) => {
  const [selectedGift, setSelectedGift] = useState<VirtualGift>(VIRTUAL_GIFTS[0]);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('50');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const activeCost = isCustom ? Math.max(1, parseInt(customAmount) || 0) : selectedGift.cost;
  const hasEnoughCredits = currentUserCredits >= activeCost;

  const handleSend = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to send gifts');
      return;
    }

    if (currentUserId === postAuthorId) {
      toast.error('You cannot send a gift to your own post');
      return;
    }

    if (!hasEnoughCredits) {
      toast.error(`Insufficient credits. You need ${activeCost} credits (Balance: ${currentUserCredits})`);
      return;
    }

    setSending(true);
    try {
      const res = await sendPostGift({
        postId,
        postAuthorId,
        postAuthorName,
        gift: isCustom
          ? {
              id: 'gift_custom',
              name: 'Custom Tip',
              emoji: '💰',
              cost: activeCost,
              description: 'Custom Creator Tip',
              gradient: 'from-emerald-500 to-teal-600',
              bgGlow: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
              animationType: 'sparkle',
            }
          : selectedGift,
        customAmount: isCustom ? activeCost : undefined,
        note,
        currentUserId,
        currentUserName,
        currentUserAvatar,
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to send gift');
        return;
      }

      playRewardSound();
      toast.success(res.message || `Gift sent to ${postAuthorName}!`);

      if (res.giftRecord && res.newBalance !== undefined) {
        onGiftSent?.(res.giftRecord, res.newBalance);
      }

      onOpenChange(false);
      setNote('');
    } catch (err: any) {
      toast.error(err.message || 'Error processing gift');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-4 sm:p-5 rounded-3xl border border-border shadow-2xl bg-card overflow-hidden">
        {/* Header with Creator Info */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-11 w-11 ring-2 ring-orange-500 shadow-md">
                {postAuthorAvatar && <AvatarImage src={postAuthorAvatar} alt={postAuthorName} />}
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
                  {postAuthorName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black p-0.5 rounded-full shadow-xs">
                <Gift className="h-3 w-3" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-foreground">{postAuthorName}</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600">
                  Creator
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {postExcerpt || 'Send a virtual gift to boost this post & support the creator!'}
              </p>
            </div>
          </div>

          {/* User balance badge */}
          <div className="text-right">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your Balance</div>
            <div className="flex items-center gap-1 text-xs font-black text-orange-600">
              <Coins className="h-3.5 w-3.5" />
              <span>{currentUserCredits.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Gift Selection Grid */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Choose Virtual Gift
            </span>
            <button
              type="button"
              onClick={() => setIsCustom(prev => !prev)}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 transition"
            >
              {isCustom ? 'Standard Gifts' : 'Custom Tip Amount'}
            </button>
          </div>

          {!isCustom ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {VIRTUAL_GIFTS.map((g) => {
                const isSelected = selectedGift.id === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGift(g)}
                    className={`relative p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between group ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 scale-102 shadow-md'
                        : 'border-border/70 hover:border-orange-300 hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1 group-hover:scale-115 transition-transform duration-200">
                      {g.emoji}
                    </span>
                    <span className="text-[11px] font-bold text-foreground truncate max-w-full">
                      {g.name}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-background border border-border shadow-2xs text-orange-600">
                      <Coins className="h-2.5 w-2.5" /> {g.cost}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
              <label className="text-xs font-bold text-foreground">Custom Credit Amount</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100000"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  placeholder="Enter credit amount"
                  className="h-10 text-sm font-bold bg-background rounded-xl"
                />
                <span className="text-xs font-black text-orange-600 shrink-0 flex items-center gap-1">
                  <Coins className="h-4 w-4" /> Credits
                </span>
              </div>
              <div className="flex gap-1.5 pt-1">
                {[20, 50, 100, 250, 500, 1000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomAmount(amt.toString())}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-background border border-border hover:border-orange-500 text-foreground"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Gift Highlight Banner */}
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-500/10 border border-orange-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{isCustom ? '💰' : selectedGift.emoji}</span>
              <div>
                <div className="text-xs font-bold text-foreground">
                  {isCustom ? 'Custom Credit Tip' : selectedGift.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {isCustom ? 'Send custom credits' : selectedGift.description}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-orange-600 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> {activeCost} Credits
              </span>
            </div>
          </div>

          {/* Personal Cheer Message Note */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Heart className="h-3 w-3 text-rose-500" /> Add a Cheer Message (Optional)
            </label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`e.g. Great post! Keep inspiring us 🔥`}
              maxLength={120}
              className="h-9 text-xs bg-muted/30 rounded-xl"
            />
          </div>

          {/* Warning if insufficient credits */}
          {!hasEnoughCredits && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>You need {activeCost - currentUserCredits} more credits.</span>
              </div>
              {onNavigateToFunding && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onNavigateToFunding();
                  }}
                  className="font-bold underline text-[11px] hover:text-foreground shrink-0"
                >
                  Fund Wallet
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !hasEnoughCredits || activeCost <= 0}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-2xl px-5 h-9 shadow-md flex items-center gap-1.5 flex-1 max-w-[220px]"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send {isCustom ? 'Tip' : selectedGift.name}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendGiftModal;
