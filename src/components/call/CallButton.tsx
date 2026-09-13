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

  return (
    <Button
      id={`call-btn-${callType}-${calleeId}`}
      variant={variant}
      size={size}
      disabled={isCalling}
      onClick={handleCall}
      className={`relative rounded-full transition-all duration-200 ${
        isVideo
          ? 'hover:text-primary hover:border-primary/50 hover:bg-primary/10'
          : 'hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-500/10'
      } ${className}`}
      title={isVideo ? `Video Call ${calleeName}` : `Audio Call ${calleeName}`}
    >
      {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
      {showLabel && (
        <span className="ml-2 font-medium text-xs">
          {isVideo ? 'Video Call' : 'Audio Call'}
        </span>
      )}
    </Button>
  );
};
