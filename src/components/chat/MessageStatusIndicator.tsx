import React from 'react';
import { Check, CheckCheck, Clock, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'seen';

interface MessageStatusIndicatorProps {
  status: MessageDeliveryStatus;
  timestamp?: string | Date;
  seenAt?: string | Date;
  showTimestamp?: boolean;
  showLabel?: boolean;
  variant?: 'on-gradient' | 'on-light' | 'on-dark' | 'auto';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  timestamp,
  seenAt,
  showTimestamp = true,
  showLabel = false,
  variant = 'auto',
  size = 'xs',
  className = '',
}) => {
  const formatTime = (time?: string | Date) => {
    if (!time) return '';
    try {
      const d = typeof time === 'string' ? new Date(time) : time;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const timeString = formatTime(timestamp);
  const seenTimeString = formatTime(seenAt);

  // Size configurations
  const iconSizeClass = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
  }[size];

  const textSizeClass = {
    xs: 'text-[10px]',
    sm: 'text-[11px]',
    md: 'text-xs',
  }[size];

  // Color configurations based on bubble background variant
  const getStatusColor = () => {
    switch (variant) {
      case 'on-gradient': // E.g., Orange-red outgoing bubbles
        if (status === 'seen') return 'text-sky-200 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]';
        if (status === 'delivered') return 'text-white/90';
        if (status === 'sent') return 'text-white/80';
        return 'text-white/70';

      case 'on-light': // E.g., White / gray incoming bubbles
        if (status === 'seen') return 'text-sky-500 font-semibold';
        if (status === 'delivered') return 'text-slate-500';
        if (status === 'sent') return 'text-slate-400';
        return 'text-slate-400';

      case 'on-dark': // Dark mode card
        if (status === 'seen') return 'text-sky-400 font-bold';
        if (status === 'delivered') return 'text-zinc-300';
        if (status === 'sent') return 'text-zinc-400';
        return 'text-zinc-500';

      case 'auto':
      default:
        if (status === 'seen') return 'text-sky-500 dark:text-sky-400 font-semibold';
        if (status === 'delivered') return 'text-muted-foreground';
        if (status === 'sent') return 'text-muted-foreground/80';
        return 'text-muted-foreground/60';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'seen':
        return seenTimeString ? `Seen at ${seenTimeString}` : 'Seen';
    }
  };

  const renderIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <span className="inline-flex items-center" title="Sending...">
            <Clock className={`${iconSizeClass} animate-spin text-current opacity-80`} style={{ animationDuration: '3s' }} />
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center" title="Sent">
            <Check className={`${iconSizeClass} text-current stroke-[2.5]`} />
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center" title="Delivered">
            <CheckCheck className={`${iconSizeClass} text-current stroke-[2]`} />
          </span>
        );
      case 'seen':
        return (
          <span className="inline-flex items-center gap-0.5" title={seenTimeString ? `Seen at ${seenTimeString}` : 'Seen'}>
            <CheckCheck className={`${iconSizeClass} text-current stroke-[2.5] animate-in zoom-in-50 duration-200`} />
          </span>
        );
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1 select-none cursor-default ${getStatusColor()} ${textSizeClass} ${className}`}
            aria-label={`Message status: ${getStatusLabel()}`}
          >
            {showTimestamp && timeString && (
              <span className="opacity-90">{timeString}</span>
            )}
            
            {renderIcon()}

            {showLabel && (
              <span className="font-medium text-[9px] uppercase tracking-wider">
                {status === 'seen' ? 'Seen' : status === 'sent' ? 'Sent' : status}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs bg-popover text-popover-foreground shadow-lg border border-border px-2.5 py-1 z-50">
          <div className="flex items-center gap-1.5">
            {status === 'seen' && <Eye className="h-3 w-3 text-sky-500" />}
            <span className="font-semibold">{getStatusLabel()}</span>
            {timeString && <span className="text-[10px] text-muted-foreground">({timeString})</span>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MessageStatusIndicator;
