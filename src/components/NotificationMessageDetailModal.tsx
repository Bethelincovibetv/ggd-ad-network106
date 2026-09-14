import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCircle2,
  Copy,
  ExternalLink,
  BookOpen,
  Receipt,
  Share2,
  Volume2,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { playNotificationChime } from '@/utils/audio';

export interface FullNotificationData {
  id: string;
  title: string;
  message?: string;
  body?: string;
  type?: string;
  nav_target?: string;
  link_url?: string;
  created_at: string;
  is_read?: boolean;
}

interface NotificationMessageDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: FullNotificationData | null;
  onAction?: (notification: FullNotificationData) => void;
  onDelete?: (id: string) => void;
}

export const NotificationMessageDetailModal: React.FC<NotificationMessageDetailModalProps> = ({
  open,
  onOpenChange,
  notification,
  onAction,
  onDelete,
}) => {
  if (!notification) return null;

  const contentText = (notification.message || notification.body || '').trim();
  const title = notification.title || 'Notification Message';
  const type = notification.type || 'system';

  const isTransfer =
    type === 'credit_transfer' ||
    type === 'credit' ||
    type === 'transfer_credited' ||
    title.toLowerCase().includes('credit') ||
    title.toLowerCase().includes('transfer');

  const isGuide =
    type === 'guide_step_completion' ||
    title.toLowerCase().includes('guide') ||
    notification.nav_target?.toLowerCase().includes('guide');

  const isChat =
    type === 'chat' ||
    type === 'message' ||
    type === 'urgent_message' ||
    title.toLowerCase().includes('message');

  // Extract clickable URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const rawUrls = contentText.match(urlRegex) || [];
  const primaryUrl = notification.link_url || rawUrls[0] || null;

  const copyMessageContent = () => {
    const fullText = `${title}\n\n${contentText}\n\nReceived: ${new Date(
      notification.created_at
    ).toLocaleString()}`;
    navigator.clipboard.writeText(fullText);
    toast.success('Message content copied to clipboard');
  };

  const handleReplayChime = () => {
    playNotificationChime();
  };

  const handleDelete = () => {
    if (onDelete && notification.id) {
      onDelete(notification.id);
      onOpenChange(false);
    }
  };

  const handleMainAction = () => {
    onOpenChange(false);
    if (onAction) {
      onAction(notification);
    } else if (primaryUrl) {
      window.open(primaryUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="full-message-detail-modal"
        className="sm:max-w-lg max-w-[95vw] rounded-2xl p-0 overflow-hidden border border-border shadow-2xl bg-card text-foreground"
      >
        {/* Header Ribbon */}
        <div
          className={`p-6 pb-4 border-b ${
            isTransfer
              ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/20'
              : isGuide
              ? 'bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-500/20'
              : isChat
              ? 'bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent border-sky-500/20'
              : 'bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent border-orange-500/20'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 ${
                  isTransfer
                    ? 'bg-emerald-500 text-white'
                    : isGuide
                    ? 'bg-indigo-600 text-white'
                    : isChat
                    ? 'bg-sky-600 text-white'
                    : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                }`}
              >
                {isTransfer ? (
                  <Receipt className="h-5 w-5" />
                ) : isGuide ? (
                  <BookOpen className="h-5 w-5" />
                ) : isChat ? (
                  <MessageSquare className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isTransfer && (
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                      Money / Transfer
                    </Badge>
                  )}
                  {isGuide && (
                    <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
                      Educational Guide
                    </Badge>
                  )}
                  {isChat && (
                    <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[10px] font-bold">
                      Direct Message
                    </Badge>
                  )}
                  {!isTransfer && !isGuide && !isChat && (
                    <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 text-[10px] font-bold">
                      System Alert
                    </Badge>
                  )}

                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 inline" />
                    {new Date(notification.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                <DialogTitle className="text-lg sm:text-xl font-black text-foreground mt-1.5 leading-snug">
                  {title}
                </DialogTitle>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleReplayChime}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl flex-shrink-0"
              title="Play notification sound"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message Body Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="bg-muted/30 border border-border/80 rounded-2xl p-4 sm:p-5">
            <p className="text-sm sm:text-base text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap break-words">
              {contentText || 'No additional message details provided.'}
            </p>
          </div>

          {/* Embedded URL links if present */}
          {rawUrls.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Attached Link
              </span>
              {rawUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold transition-colors group"
                >
                  <span className="truncate flex-1 mr-2">{url}</span>
                  <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </a>
              ))}
            </div>
          )}

          {/* Meta Details Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60 flex-wrap gap-2">
            <span className="font-mono text-[11px]">
              ID: {notification.id.slice(0, 14)}...
            </span>
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Verified Delivery
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-muted/20 border-t border-border/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyMessageContent}
              className="rounded-xl text-xs font-bold gap-1.5 h-9"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Text
            </Button>

            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="rounded-xl text-xs font-bold text-muted-foreground hover:text-destructive gap-1.5 h-9"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(notification.nav_target || primaryUrl || isTransfer || isGuide || isChat) && (
              <Button
                type="button"
                onClick={handleMainAction}
                className={`rounded-xl text-xs font-bold gap-1.5 h-9 text-white shadow-sm ${
                  isTransfer
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : isGuide
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : isChat
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                }`}
              >
                {isTransfer ? (
                  <>
                    <Receipt className="h-3.5 w-3.5" /> View Receipt
                  </>
                ) : isGuide ? (
                  <>
                    <BookOpen className="h-3.5 w-3.5" /> Open Guide
                  </>
                ) : isChat ? (
                  <>
                    <MessageSquare className="h-3.5 w-3.5" /> Open Chat
                  </>
                ) : (
                  <>
                    <span>Open Action</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationMessageDetailModal;
