import React from 'react';
import { useWebRTCCall } from '@/contexts/CallContext';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const IncomingCallBanner: React.FC = () => {
  const { incomingSession, callStatus, acceptCall, declineCall } = useWebRTCCall();

  if (!incomingSession || callStatus !== 'ringing') {
    return null;
  }

  const isVideo = incomingSession.callType === 'video';

  return (
    <div
      id="incoming-call-overlay"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] w-[92%] max-w-md animate-in fade-in slide-in-from-top-6 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 p-4 shadow-2xl border border-white/15 backdrop-blur-xl text-white">
        {/* Glowing aura effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10">
          {/* Avatar with pulsing ring */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500/60 shadow-lg bg-slate-800 flex items-center justify-center">
              {incomingSession.callerAvatar ? (
                <img
                  src={incomingSession.callerAvatar}
                  alt={incomingSession.callerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-emerald-400">
                  {incomingSession.callerName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Animated ringing badge */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[9px] text-white font-bold">
                {isVideo ? '📹' : '📞'}
              </span>
            </span>
          </div>

          {/* Caller Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Incoming {isVideo ? 'Video' : 'Audio'} Call
              </span>
            </div>
            <h4 className="text-base font-bold text-white truncate mt-0.5">
              {incomingSession.callerName}
            </h4>
            <p className="text-xs text-slate-300 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Ringing...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Decline Button */}
            <Button
              id="decline-call-btn"
              type="button"
              variant="destructive"
              size="icon"
              onClick={declineCall}
              className="h-11 w-11 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              title="Decline"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>

            {/* Accept Button */}
            <Button
              id="accept-call-btn"
              type="button"
              size="icon"
              onClick={acceptCall}
              className="h-11 w-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 animate-bounce"
              title="Answer Call"
            >
              {isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
