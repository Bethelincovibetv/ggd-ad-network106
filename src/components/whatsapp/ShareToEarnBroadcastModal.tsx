import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Radio,
  Users,
  Coins,
  Send,
  Loader2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { WhatsAppQrModal } from './WhatsAppQrModal';
import {
  getWhatsAppStatus,
  executeWhatsAppBroadcast,
} from '@/services/whatsappService';
import { WhatsAppSessionState, WhatsAppAdminGroup, WhatsAppBroadcastResult } from '@/types/whatsapp';
import { playRewardSound } from '@/lib/soundEffects';

export interface ShareToEarnPostItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  targetUrl?: string;
  rewardCredits?: number;
  authorName?: string;
}

interface ShareToEarnBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: ShareToEarnPostItem | null;
  userId?: string;
  onRewardClaimed?: (credits: number) => void;
}

export const ShareToEarnBroadcastModal: React.FC<ShareToEarnBroadcastModalProps> = ({
  isOpen,
  onClose,
  post,
  userId,
  onRewardClaimed,
}) => {
  const [session, setSession] = useState<WhatsAppSessionState | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState<number>(0);
  const [broadcastResult, setBroadcastResult] = useState<WhatsAppBroadcastResult | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Check connection status whenever modal opens
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getWhatsAppStatus(userId);
      setSession(data);
      if (data.adminGroups) {
        setSelectedGroups(data.adminGroups.map((g) => g.id));
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setBroadcastResult(null);
      setProgressPercent(0);
      setCurrentGroupIndex(0);
      fetchStatus();
    }
  }, [isOpen, userId]);

  const isConnected = session?.status === 'connected';
  const totalGroupsCount = selectedGroups.length;
  const rewardAmount = post?.rewardCredits || 50;

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Execute Broadcast to Baileys Engine
  const handleProceedBroadcast = async () => {
    if (!post) return;
    if (totalGroupsCount === 0) {
      toast.error('Please select at least one WhatsApp admin group to broadcast to.');
      return;
    }

    setBroadcasting(true);
    setProgressPercent(10);

    // Simulated stepped progress animation for realistic group dispatch
    const progressTimer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + 15;
      });
      setCurrentGroupIndex((prev) => (prev < totalGroupsCount - 1 ? prev + 1 : prev));
    }, 400);

    try {
      const result = await executeWhatsAppBroadcast({
        userId: userId || 'default_user',
        postId: post.id,
        taskId: post.id,
        taskTitle: post.title,
        message: post.description || post.content || post.title,
        linkUrl: post.targetUrl || window.location.origin,
        imageUrl: post.imageUrl,
        rewardCredits: rewardAmount,
        targetGroupIds: selectedGroups,
      });

      clearInterval(progressTimer);
      setProgressPercent(100);
      setBroadcastResult(result);
      playRewardSound();

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#25D366', '#128C7E', '#FFB703', '#FB8500'],
        });
      } catch {}

      toast.success(`🎉 Successfully broadcast to ${result.totalTargetGroups} groups! +${rewardAmount} Credits Claimed!`);
      onRewardClaimed?.(rewardAmount);
    } catch (err: any) {
      clearInterval(progressTimer);
      toast.error(err?.message || 'Broadcast failed. Please check WhatsApp connection.');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !broadcasting && onClose()}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-border/80 bg-background rounded-3xl shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] p-5 text-white relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-black text-white">
                    Share to Earn on WhatsApp
                  </DialogTitle>
                  <Badge className="bg-amber-400 text-amber-950 font-black text-[10px] px-2">
                    +{rewardAmount} CREDITS
                  </Badge>
                </div>
                <DialogDescription className="text-emerald-100/90 text-xs mt-0.5">
                  Automated Baileys Broadcast to Managed Groups
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {loadingStatus ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                <p className="text-xs text-muted-foreground font-semibold">Checking WhatsApp Baileys connection...</p>
              </div>
            ) : !isConnected ? (
              /* Disconnected Prompt State */
              <div className="text-center py-4 space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground">WhatsApp Not Linked</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                    To automatically broadcast this advert to your communities and claim reward points, please link your WhatsApp account first via QR code scan.
                  </p>
                </div>

                <div className="p-3 bg-muted/60 rounded-2xl border border-border/60 text-xs text-left space-y-1.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Instant Benefits:
                  </p>
                  <ul className="text-muted-foreground text-[11px] space-y-1 list-disc list-inside">
                    <li>1-click simultaneous broadcast to all your WhatsApp admin groups</li>
                    <li>Earn +{rewardAmount} promotional credits instantly per broadcast</li>
                    <li>Zero manual copy-pasting required</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setIsQrOpen(true)}
                  className="w-full h-11 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] hover:opacity-95 text-white font-bold rounded-xl shadow-md text-xs cursor-pointer"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Connect WhatsApp via QR Code
                </Button>
              </div>
            ) : broadcastResult ? (
              /* Success / Completion Result Screen */
              <div className="text-center py-3 space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="h-9 w-9 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-foreground">Broadcast Complete!</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Your advert was successfully dispatched to <strong>{broadcastResult.totalTargetGroups} WhatsApp groups</strong>.
                  </p>
                </div>

                {/* Reward Claim Banner */}
                <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 border-2 border-amber-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-foreground">Reward Added</p>
                      <p className="text-[11px] text-muted-foreground">Credited to your balance</p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-amber-600">
                    +{broadcastResult.rewardCreditsGranted} pts
                  </span>
                </div>

                <Button
                  onClick={onClose}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Done & Close
                </Button>
              </div>
            ) : (
              /* Connected Confirmation & Broadcast Execution */
              <div className="space-y-4">
                {/* Advert Preview Card */}
                {post && (
                  <div className="p-3 bg-muted/40 rounded-2xl border border-border/60 flex items-start gap-3">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-16 w-16 rounded-xl object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0 text-white">
                        <Radio className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground line-clamp-1">{post.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {post.description || post.content || 'Sponsored business advert'}
                      </p>
                      <Badge variant="outline" className="text-[9px] mt-1 text-emerald-600 border-emerald-500/30">
                        WhatsApp Optimized Payload
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Broadcast Target Groups Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      Target Admin Groups ({selectedGroups.length}/{session?.adminGroups?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedGroups.length === session?.adminGroups?.length) {
                          setSelectedGroups([]);
                        } else {
                          setSelectedGroups(session?.adminGroups?.map((g) => g.id) || []);
                        }
                      }}
                      className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                    >
                      {selectedGroups.length === session?.adminGroups?.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {session?.adminGroups?.map((group) => {
                      const isSelected = selectedGroups.includes(group.id);
                      return (
                        <div
                          key={group.id}
                          onClick={() => !broadcasting && toggleGroup(group.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-foreground'
                              : 'bg-card border-border/60 text-muted-foreground opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="font-semibold truncate text-[11px]">{group.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {group.size} members
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confirmation Box */}
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-1 text-xs">
                  <p className="font-bold text-foreground flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Confirmation Prompt
                  </p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    This will automatically broadcast this advert to{' '}
                    <strong className="text-foreground">
                      {totalGroupsCount} WhatsApp group{totalGroupsCount !== 1 ? 's' : ''}
                    </strong>{' '}
                    you manage. Proceed?
                  </p>
                </div>

                {/* Broadcasting Progress State */}
                {broadcasting && (
                  <div className="space-y-2 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
                        Broadcasting to group {currentGroupIndex + 1} of {totalGroupsCount}...
                      </span>
                      <span className="font-mono font-bold text-emerald-600">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-muted rounded-full" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handleProceedBroadcast}
                    disabled={broadcasting || totalGroupsCount === 0}
                    className="flex-1 h-11 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    {broadcasting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dispatching to WhatsApp...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Proceed & Claim +{rewardAmount} Credits
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={broadcasting}
                    className="h-11 text-xs text-muted-foreground font-semibold rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Connect Modal for Disconnected Users */}
      <WhatsAppQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        userId={userId}
        onConnected={(newSession) => {
          setSession(newSession);
          if (newSession.adminGroups) {
            setSelectedGroups(newSession.adminGroups.map((g: any) => g.id));
          }
        }}
      />
    </>
  );
};
