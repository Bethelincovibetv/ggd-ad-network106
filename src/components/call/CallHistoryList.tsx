import React, { useState, useEffect } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Trash2,
  Clock,
  User,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  subscribeUserCallLogs,
  deleteCallLog,
  CallLogRecord,
} from '@/services/callLogService';
import { useWebRTCCall } from '@/contexts/CallContext';
import {
  dispatchOpenDirectChat,
  resolveCallLogCounterparty,
} from '@/lib/callChatNavigation';

interface CallHistoryListProps {
  userId: string;
  onClose?: () => void;
  className?: string;
  isCompact?: boolean;
  onChatWithUser?: (targetId: string, targetName: string, targetAvatar?: string) => void;
}

export const CallHistoryList: React.FC<CallHistoryListProps> = ({
  userId,
  onClose,
  className = '',
  isCompact = false,
  onChatWithUser,
}) => {
  const [logs, setLogs] = useState<CallLogRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');
  const [loading, setLoading] = useState(true);
  const { startCall, callStatus } = useWebRTCCall();

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const unsubscribe = subscribeUserCallLogs(userId, (newLogs) => {
      setLogs(newLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    setLogs((prev) => prev.filter((item) => item.id !== logId));
    await deleteCallLog(logId);
  };

  const handleCallBack = (log: CallLogRecord, type: 'audio' | 'video') => {
    const { targetId, targetName, targetAvatar } = resolveCallLogCounterparty(log, userId);

    startCall({
      calleeId: targetId,
      calleeName: targetName,
      calleeAvatar: targetAvatar,
      callType: type,
    });

    if (onClose) onClose();
  };

  const handleOpenChat = (log: CallLogRecord) => {
    const { targetId, targetName, targetAvatar } = resolveCallLogCounterparty(log, userId);
    if (!targetId) return;

    if (onChatWithUser) {
      onChatWithUser(targetId, targetName, targetAvatar);
    } else {
      dispatchOpenDirectChat({
        userId: targetId,
        name: targetName,
        avatar: targetAvatar,
      });
    }

    if (onClose) onClose();
  };

  const filteredLogs = logs.filter((log) => {
    const { isMissed, isCaller } = resolveCallLogCounterparty(log, userId);

    if (filter === 'missed') return isMissed;
    if (filter === 'incoming') return !isCaller && !isMissed;
    if (filter === 'outgoing') return isCaller;
    return true;
  });

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex flex-col h-full bg-transparent space-y-2 ${className}`}>
      {/* Header & Filter Tabs */}
      <div className="p-2.5 rounded-2xl inbox-card-3d space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl inbox-key-3d-orange flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate">Call History</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {logs.length} logged record{logs.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-10 min-w-[44px] px-3 rounded-xl inbox-key-3d text-xs font-semibold shrink-0">
              Close
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 h-10 p-1 w-full rounded-xl bg-muted/70">
            <TabsTrigger value="all" className="text-xs font-semibold px-1 rounded-lg">All</TabsTrigger>
            <TabsTrigger value="missed" className="text-xs font-semibold px-1 rounded-lg text-red-500 data-[state=active]:text-red-600">
              Missed
            </TabsTrigger>
            <TabsTrigger value="incoming" className="text-xs font-semibold px-1 rounded-lg">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing" className="text-xs font-semibold px-1 rounded-lg">Outgoing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pb-1">
        {loading ? (
          <div className="py-10 text-center text-xs text-muted-foreground inbox-card-3d rounded-2xl">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-orange-500" />
            Loading call logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground space-y-1 inbox-card-3d rounded-2xl">
            <PhoneOff className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs font-semibold text-foreground">No call logs found</p>
            <p className="text-[11px] text-muted-foreground">
              {filter === 'missed'
                ? 'You have zero missed calls.'
                : 'Calls you place or receive will appear here.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const {
              targetName: otherName,
              targetAvatar: otherAvatar,
              isMissed,
              isCaller,
            } = resolveCallLogCounterparty(log, userId);
            const isVideo = log.callType === 'video';
            const primaryCallType: 'audio' | 'video' = isVideo ? 'video' : 'audio';

            return (
              <div
                key={log.id}
                className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-2xl inbox-card-3d group ${
                  isMissed ? 'ring-1 ring-red-500/25 bg-red-500/[0.03]' : ''
                }`}
              >
                {/* Left: Avatar & Details */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 shrink-0 border border-border shadow-xs">
                    <AvatarImage src={otherAvatar} />
                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 font-bold">
                      {(otherName || 'M').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                          isMissed ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                        }`}
                      >
                        {otherName || 'Member'}
                      </p>
                      {isVideo ? (
                        <Video className="h-3 w-3 text-blue-500 shrink-0" />
                      ) : (
                        <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                      <span className="flex items-center gap-1 shrink-0">
                        {isMissed ? (
                          <PhoneMissed className="h-3 w-3 text-red-500" />
                        ) : isCaller ? (
                          <PhoneOutgoing className="h-3 w-3 text-blue-500" />
                        ) : (
                          <PhoneIncoming className="h-3 w-3 text-emerald-500" />
                        )}
                        <span className={isMissed ? 'text-red-500 font-semibold' : ''}>
                          {isMissed
                            ? 'Missed Call'
                            : isCaller
                            ? 'Outgoing'
                            : 'Incoming'}
                        </span>
                      </span>

                      {!isMissed && log.durationSeconds > 0 && (
                        <span className="shrink-0">· {formatDuration(log.durationSeconds)}</span>
                      )}

                      <span className="shrink-0">· {formatTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Prominent Call Back + Chat Quick Actions */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCallBack(log, primaryCallType)}
                    disabled={callStatus !== 'idle'}
                    className="h-10 min-h-[40px] px-3 rounded-xl inbox-key-3d-emerald text-xs font-bold gap-1.5"
                    title={`Call Back ${otherName}`}
                    aria-label={`Call Back ${otherName}`}
                  >
                    {isVideo ? <Video className="h-3.5 w-3.5 shrink-0" /> : <Phone className="h-3.5 w-3.5 shrink-0" />}
                    <span>Call Back</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenChat(log)}
                    className="h-10 min-h-[40px] px-3 rounded-xl inbox-key-3d-orange text-xs font-bold gap-1.5"
                    title={`Chat with ${otherName}`}
                    aria-label={`Chat with ${otherName}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Chat</span>
                  </Button>

                  {!isCompact && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCallBack(log, isVideo ? 'audio' : 'video')}
                      disabled={callStatus !== 'idle'}
                      className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-xl inbox-key-3d-blue hidden sm:inline-flex"
                      title={isVideo ? `Audio call ${otherName}` : `Video call ${otherName}`}
                      aria-label={isVideo ? `Audio call ${otherName}` : `Video call ${otherName}`}
                    >
                      {isVideo ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDelete(e, log.id)}
                    className="h-10 w-9 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-500/10 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity"
                    title="Delete log"
                    aria-label="Delete call log"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

