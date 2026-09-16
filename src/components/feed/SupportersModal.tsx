import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, Coins, Sparkles, Heart, Crown, X } from 'lucide-react';
import { PostGiftRecord } from '@/services/postGiftService';

interface SupportersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gifts: PostGiftRecord[];
  totalCredits: number;
  postAuthorName: string;
}

export const SupportersModal: React.FC<SupportersModalProps> = ({
  open,
  onOpenChange,
  gifts,
  totalCredits,
  postAuthorName,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-4 sm:p-5 rounded-3xl border border-border shadow-2xl bg-card overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-foreground">
                Post Supporters & Gifts
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                Total {totalCredits.toLocaleString()} credits gifted to {postAuthorName}
              </p>
            </div>
          </div>
        </div>

        <div className="py-2 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {gifts.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No gifts sent yet. Be the first supporter to send a virtual gift!
            </div>
          ) : (
            gifts.map((g, index) => (
              <div
                key={g.id || index}
                className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-orange-500/40">
                    {g.senderAvatar && <AvatarImage src={g.senderAvatar} alt={g.senderName} />}
                    <AvatarFallback className="text-xs bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold">
                      {g.senderName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">
                        {g.senderName}
                      </span>
                      {index === 0 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-400 text-amber-950 flex items-center gap-0.5">
                          <Crown className="h-2.5 w-2.5 fill-current" /> Top
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span>Gifted {g.giftEmoji} {g.giftName}</span>
                    </div>
                    {g.note && (
                      <p className="text-[11px] text-foreground/80 italic mt-0.5 bg-background/80 px-2 py-0.5 rounded-lg border border-border/40 inline-block">
                        "{g.note}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-black text-orange-600 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                    <Coins className="h-3 w-3" /> +{g.amount}
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(g.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-border/60 text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-8"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportersModal;
