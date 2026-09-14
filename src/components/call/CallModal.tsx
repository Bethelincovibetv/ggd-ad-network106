import React, { useEffect, useRef, useState } from 'react';
import { useWebRTCCall } from '@/contexts/CallContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  ScreenShare,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CallModal: React.FC = () => {
  const {
    callStatus,
    activeSession,
    localStream,
    remoteStream,
    callDuration,
    isMinimized,
    mediaControls,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    flipCamera,
    setIsMinimized,
  } = useWebRTCCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Dedicated continuous background audio player for remote stream (voice calls, video calls, & minimized)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = isSpeakerMuted;
      remoteAudioRef.current.play().catch((e) => {
        console.warn('Audio stream autoPlay handled:', e);
      });
    }
  }, [remoteStream, callStatus, isSpeakerMuted]);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, callStatus, mediaControls.isVideoDisabled]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Remote video sound handled by remoteAudioRef or unmuted video
      remoteVideoRef.current.muted = isSpeakerMuted;
      remoteVideoRef.current.play().catch((e) => {
        console.warn('Video stream autoPlay handled:', e);
      });
    }
  }, [remoteStream, callStatus, isSpeakerMuted]);

  // Format call duration MM:SS
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle' || !activeSession) {
    return null;
  }

  const isVideo = activeSession.callType === 'video';
  const partnerName = activeSession.callerId === activeSession.calleeId
    ? activeSession.callerName
    : (activeSession.calleeName || 'User');
  const partnerAvatar = activeSession.calleeAvatar || activeSession.callerAvatar;

  // ----------------------------------------------------
  // Minimized Picture-in-Picture Floating Mode
  // ----------------------------------------------------
  if (isMinimized) {
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        <div
          id="minimized-call-widget"
          className="fixed bottom-20 right-4 z-[99999] w-72 rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl backdrop-blur-xl p-3 text-white animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-emerald-500/50 flex-shrink-0 flex items-center justify-center">
                {partnerAvatar ? (
                  <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-emerald-400">{partnerName.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{partnerName}</p>
                <p className="text-xs text-emerald-400 font-mono">
                  {callStatus === 'connected' ? formatDuration(callDuration) : 'Calling...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                id="expand-call-btn"
                size="icon"
                variant="ghost"
                onClick={() => setIsMinimized(false)}
                className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
                title="Expand Call"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                id="minimized-end-call-btn"
                size="icon"
                variant="destructive"
                onClick={endCall}
                className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white"
                title="End Call"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ----------------------------------------------------
  // Full-Screen / Modal Active Call Window
  // ----------------------------------------------------
  return (
    <div
      id="active-call-modal"
      className="fixed inset-0 z-[99998] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="relative w-full max-w-4xl h-[88vh] max-h-[750px] bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl overflow-hidden border border-white/15 shadow-2xl flex flex-col">
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-white/20">
              {partnerAvatar ? (
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white">
                  {partnerName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">{partnerName}</h3>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-xs text-slate-300 font-mono">
                  {callStatus === 'connected' ? formatDuration(callDuration) : 'Calling...'}
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                  {isVideo ? 'HD Video' : 'HQ Audio'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="minimize-call-btn"
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
              title="Minimize (Picture-in-Picture)"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main View Area */}
        <div className="relative flex-1 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <>
              {/* Remote Video Track */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Remote fallback if video is not currently active / still calling */}
              {(!remoteStream || remoteStream.getVideoTracks().length === 0 || callStatus === 'calling') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                  <div className="relative mb-6">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-emerald-500/40 shadow-2xl flex items-center justify-center bg-slate-800">
                      {partnerAvatar ? (
                        <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-emerald-400">{partnerName.charAt(0)}</span>
                      )}
                    </div>
                    {callStatus === 'calling' && (
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-30 pointer-events-none" />
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{partnerName}</h2>
                  <p className="text-sm text-slate-400 mt-1 font-medium">
                    {callStatus === 'calling' ? 'Ringing callee device...' : 'Connecting video feed...'}
                  </p>
                </div>
              )}

              {/* Local Video Picture-in-Picture Preview */}
              <div className="absolute bottom-24 right-4 z-20 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black/90 group">
                {!mediaControls.isVideoDisabled ? (
                  <>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${mediaControls.facingMode === 'environment' ? '' : 'mirror'}`}
                    />
                    <button
                      type="button"
                      onClick={flipCamera}
                      title="Switch to Back/Front Camera"
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/30 backdrop-blur-xs transition-opacity sm:opacity-0 group-hover:opacity-100 flex items-center justify-center"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs gap-1">
                    <VideoOff className="h-4 w-4" />
                    <span>Camera Off</span>
                  </div>
                )}
                <span className="absolute bottom-1 left-2 text-[10px] text-white/90 font-medium bg-black/60 px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                  <span>You</span>
                  {mediaControls.facingMode === 'environment' && (
                    <span className="text-[9px] text-emerald-300 font-bold">• Rear</span>
                  )}
                </span>
              </div>
            </>
          ) : (
            /* Audio-Only Call Experience with Animated Waveforms */
            <div className="flex flex-col items-center justify-center p-6 text-center text-white">
              <div className="relative mb-6">
                <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-emerald-500/40 shadow-2xl flex items-center justify-center bg-slate-800">
                  {partnerAvatar ? (
                    <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-bold text-emerald-400">{partnerName.charAt(0)}</span>
                  )}
                </div>
                {callStatus === 'connected' && (
                  <div className="absolute -inset-3 rounded-full border-2 border-emerald-500/30 animate-pulse pointer-events-none" />
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold">{partnerName}</h2>
              <p className="text-sm text-slate-400 mt-1 font-medium">
                {callStatus === 'calling' ? 'Calling...' : `In Call • ${formatDuration(callDuration)}`}
              </p>

              {/* Simulated Audio Frequency Visualizer */}
              {callStatus === 'connected' && (
                <div className="flex items-center justify-center gap-1.5 mt-8 h-10">
                  {[40, 75, 55, 90, 60, 100, 70, 85, 45, 95, 65, 80].map((height, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-emerald-400 rounded-full animate-pulse"
                      style={{
                        height: `${height}%`,
                        animationDelay: `${(i * 0.1).toFixed(1)}s`,
                        animationDuration: '0.8s',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Control Bar */}
        <div className="z-30 px-6 py-5 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center gap-3 sm:gap-4">
          {/* Mute Microphone */}
          <Button
            id="toggle-mic-btn"
            size="icon"
            onClick={toggleMute}
            className={`h-12 w-12 rounded-full border transition-transform hover:scale-105 ${
              mediaControls.isMuted
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title={mediaControls.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {mediaControls.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Toggle Camera (for video calls) */}
          {isVideo && (
            <Button
              id="toggle-video-btn"
              size="icon"
              onClick={toggleVideo}
              className={`h-12 w-12 rounded-full border transition-transform hover:scale-105 ${
                mediaControls.isVideoDisabled
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={mediaControls.isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {mediaControls.isVideoDisabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          )}

          {/* Flip Camera (Front / Rear) */}
          {isVideo && !mediaControls.isVideoDisabled && (
            <Button
              id="flip-camera-btn"
              size="icon"
              onClick={flipCamera}
              className={`h-12 w-12 rounded-full border transition-transform hover:scale-105 ${
                mediaControls.facingMode === 'environment'
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                  : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
              title={
                mediaControls.facingMode === 'environment'
                  ? 'Currently Back Camera (Rear) - Click to Switch to Front'
                  : 'Currently Front Camera - Click to Switch to Back (Rear)'
              }
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}

          {/* Screen Share */}
          {isVideo && (
            <Button
              id="share-screen-btn"
              size="icon"
              onClick={toggleScreenShare}
              className={`h-12 w-12 rounded-full border transition-transform hover:scale-105 hidden sm:flex ${
                mediaControls.isScreenSharing
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={mediaControls.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <ScreenShare className="h-5 w-5" />
            </Button>
          )}

          {/* Speaker Mute/Unmute */}
          <Button
            id="toggle-speaker-btn"
            size="icon"
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`h-12 w-12 rounded-full border transition-transform hover:scale-105 ${
              isSpeakerMuted
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          {/* End Call Button */}
          <Button
            id="terminate-call-btn"
            size="icon"
            variant="destructive"
            onClick={endCall}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl transition-transform hover:scale-110 active:scale-95 ml-2"
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
