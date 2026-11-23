import React from 'react';
import { useWebRTCCall } from '@/contexts/CallContext';
import { CallType } from '@/types/call';
import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallButtonProps {
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  callType: CallType;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export const CallButton: React.FC<CallButtonProps> = ({
  calleeId,
  calleeName,
  calleeAvatar,
  callType,
  variant = 'outline',
  size = 'icon',
  className = '',
  showLabel = false,
}) => {
  const { startCall, callStatus, currentUser } = useWebRTCCall();

  const isSelf = currentUser?.id === calleeId;
  const isCalling = callStatus !== 'idle';

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startCall({
      calleeId,
      calleeName,
      calleeAvatar,
      callType,
    });
  };

  if (isSelf) {
    return null;
  }

  const isVideo = callType === 'video';

  const label = isVideo ? `Video Call ${calleeName}` : `Audio Call ${calleeName}`;

  const uses3DKey = className.includes('inbox-key-3d');

  return (
    <Button
      id={`call-btn-${callType}-${calleeId}`}
      type="button"
      variant={variant}
      size={size}
      disabled={isCalling}
      onClick={handleCall}
      aria-label={label}
      className={`relative rounded-xl transition-transform duration-150 active:translate-y-[1.5px] active:scale-[0.97] ${
        uses3DKey
          ? 'hover:brightness-105'
          : isVideo
          ? 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'
          : 'hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/10'
      } ${className}`}
      title={label}
    >
      {isVideo ? <Video className="h-4 w-4 sm:h-4 sm:w-4" /> : <Phone className="h-4 w-4 sm:h-4 sm:w-4" />}
      {showLabel && (
        <span className="ml-2 font-semibold text-xs whitespace-nowrap">
          {isVideo ? 'Video Call' : 'Audio Call'}
        </span>
      )}
    </Button>
  );
};
