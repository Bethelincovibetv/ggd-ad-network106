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

interface CallHistoryListProps {
  userId: string;
  onClose?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const CallHistoryList: React.FC<CallHistoryListProps> = ({
  userId,
  onClose,
  className = '',
  isCompact = false,
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
    const isCaller = log.callerId === userId;
    const targetId = isCaller ? log.calleeId : log.callerId;
    const targetName = isCaller ? log.calleeName : log.callerName;
    const targetAvatar = isCaller ? log.calleeAvatar : log.callerAvatar;

    startCall({
      calleeId: targetId,
      calleeName: targetName,
      calleeAvatar: targetAvatar,
      callType: type,
    });

    if (onClose) onClose();
  };

  const filteredLogs = logs.filter((log) => {
    const isCaller = log.callerId === userId;
    const isMissed = log.status === 'missed' || (log.status === 'rejected' && !isCaller);

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
    <div className={`flex flex-col h-full bg-card rounded-xl ${className}`}>
      {/* Header & Filter Tabs */}
      <div className="p-3 border-b space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">Call History</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {logs.length} logged record{logs.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
              Close
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 h-8 w-full text-xs">
            <TabsTrigger value="all" className="text-[11px] px-1">All</TabsTrigger>
            <TabsTrigger value="missed" className="text-[11px] px-1 text-red-500 data-[state=active]:text-red-600">
              Missed
            </TabsTrigger>
            <TabsTrigger value="incoming" className="text-[11px] px-1">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing" className="text-[11px] px-1">Outgoing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60 p-1">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-orange-500" />
            Loading call logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-1">
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
            const isCaller = log.callerId === userId;
            const otherName = isCaller ? log.calleeName : log.callerName;
            const otherAvatar = isCaller ? log.calleeAvatar : log.callerAvatar;
            const isMissed = log.status === 'missed' || (log.status === 'rejected' && !isCaller);
            const isVideo = log.callType === 'video';

            return (
              <div
                key={log.id}
                className="flex items-center justify-between p-2.5 hover:bg-muted/40 rounded-lg transition-colors group"
              >
                {/* Left: Avatar & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 shrink-0 border border-border">
                    <AvatarImage src={otherAvatar} />
                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700 font-bold">
                      {otherName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs font-bold truncate ${
                          isMissed ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                        }`}
                      >
                        {otherName || 'Member'}
                      </p>
                      {isVideo ? (
                        <Video className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <Phone className="h-3 w-3 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      {/* Status Icon */}
                      <span className="flex items-center gap-1">
                        {isMissed ? (
                          <PhoneMissed className="h-3 w-3 text-red-500" />
                        ) : isCaller ? (
                          <PhoneOutgoing className="h-3 w-3 text-blue-500" />
                        ) : (
                          <PhoneIncoming className="h-3 w-3 text-emerald-500" />
                        )}
                        <span className={isMissed ? 'text-red-500 font-medium' : ''}>
                          {isMissed
                            ? 'Missed Call'
                            : isCaller
                            ? 'Outgoing'
                            : 'Incoming'}
                        </span>
                      </span>

                      {/* Duration */}
                      {!isMissed && log.durationSeconds > 0 && (
                        <span>• {formatDuration(log.durationSeconds)}</span>
                      )}

                      {/* Timestamp */}
                      <span>• {formatTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Callbacks */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCallBack(log, 'audio')}
                    disabled={callStatus !== 'idle'}
                    className="h-8 w-8 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                    title={`Audio call ${otherName}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCallBack(log, 'video')}
                    disabled={callStatus !== 'idle'}
                    className="h-8 w-8 rounded-full text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    title={`Video call ${otherName}`}
                  >
                    <Video className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDelete(e, log.id)}
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete log"
                  >
                    <Trash2 className="h-3 w-3" />
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
