import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallSession, CallStatus, CallType, MediaControlsState } from '@/types/call';
import {
  startOutgoingCall,
  answerIncomingCall,
  rejectIncomingCall,
  endActiveCall,
  listenForIncomingCalls,
} from '@/services/webrtcService';
import {
  startIncomingCallRingtone,
  startOutgoingRingback,
  playCallConnectedTone,
  playCallEndedTone,
} from '@/utils/audio';
import { saveCallLog } from '@/services/callLogService';
import { toast } from 'sonner';

interface CallContextType {
  currentUser: { id: string; name: string; avatar?: string } | null;
  callStatus: CallStatus;
  activeSession: CallSession | null;
  incomingSession: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  isMinimized: boolean;
  mediaControls: MediaControlsState;
  startCall: (params: { calleeId: string; calleeName: string; calleeAvatar?: string; callType: CallType }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  flipCamera: () => Promise<void>;
  setIsMinimized: (minimized: boolean) => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);
  const [incomingSession, setIncomingSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Synchronized state refs for event listeners and callbacks
  const callStatusRef = useRef<CallStatus>('idle');
  const activeSessionRef = useRef<CallSession | null>(null);
  const incomingSessionRef = useRef<CallSession | null>(null);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    incomingSessionRef.current = incomingSession;
  }, [incomingSession]);

  const [mediaControls, setMediaControls] = useState<MediaControlsState>({
    isMuted: false,
    isVideoDisabled: false,
    isScreenSharing: false,
    isSpeakerOn: true,
    facingMode: 'user',
  });

  // Audio tone loop stoppers
  const stopRingbackRef = useRef<(() => void) | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  // WebRTC cleanup function ref
  const activeCleanupRef = useRef<(() => void) | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // Stop active sounds helper
  const stopAllAudioLoops = useCallback(() => {
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
  }, []);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Load authenticated user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          // Fetch profile details
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, business_name, avatar_url')
            .eq('user_id', data.user.id)
            .single();

          setCurrentUser({
            id: data.user.id,
            name: profile?.display_name || profile?.business_name || data.user.email?.split('@')[0] || 'GGD Member',
            avatar: profile?.avatar_url || '',
          });
        }
      } catch (err) {
        console.warn('Could not load user in CallContext:', err);
      }
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, business_name, avatar_url')
          .eq('user_id', session.user.id)
          .single();

        setCurrentUser({
          id: session.user.id,
          name: profile?.display_name || profile?.business_name || session.user.email?.split('@')[0] || 'GGD Member',
          avatar: profile?.avatar_url || '',
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Listen for real-time incoming calls for current user
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = listenForIncomingCalls(currentUser.id, (incoming) => {
      // 1. If this is already the session currently being answered or in an active call with this callId, do not decline
      if (
        incoming.callId === activeSessionRef.current?.callId ||
        incoming.callId === incomingSessionRef.current?.callId
      ) {
        return;
      }

      // 2. Ignore calls older than 90 seconds (stale call invitations)
      if (incoming.createdAt) {
        const ageMs = Date.now() - new Date(incoming.createdAt).getTime();
        if (ageMs > 90000) {
          return;
        }
      }

      // 3. Only decline as busy if user is actively connected or placing a call to someone else with a different callId
      if (
        (callStatusRef.current === 'connected' || callStatusRef.current === 'calling') &&
        activeSessionRef.current &&
        activeSessionRef.current.callId !== incoming.callId
      ) {
        rejectIncomingCall(incoming.callId, 'busy');
        return;
      }

      // 4. Update incoming call state and ring device
      incomingSessionRef.current = incoming;
      setIncomingSession(incoming);
      callStatusRef.current = 'ringing';
      setCallStatus('ringing');

      // Play incoming ringtone and trigger device vibration
      stopAllAudioLoops();
      stopRingtoneRef.current = startIncomingCallRingtone();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([500, 250, 500, 250, 500, 250]);
        } catch {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, stopAllAudioLoops]);

  // Handle URL call parameters (?callId=...&action=accept)
  useEffect(() => {
    if (!currentUser?.id) return;
    const params = new URLSearchParams(window.location.search);
    const callId = params.get('callId');
    const action = params.get('action');

    if (callId && incomingSession?.callId === callId && action === 'accept') {
      acceptCall();
      // Clean up search params
      params.delete('callId');
      params.delete('action');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    } else if (callId && incomingSession?.callId === callId && action === 'decline') {
      declineCall();
      params.delete('callId');
      params.delete('action');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    }
  }, [currentUser?.id, incomingSession]);

  // Clean termination helper
  const performCleanup = useCallback((reason?: string) => {
    stopAllAudioLoops();

    if (activeCleanupRef.current) {
      try {
        activeCleanupRef.current();
      } catch {}
      activeCleanupRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setRemoteStream(null);
    }

    peerConnectionRef.current = null;
    originalVideoTrackRef.current = null;

    playCallEndedTone();
    setCallStatus('ended');

    // Save call log to Firestore
    const session = activeSession || incomingSession;
    if (session && session.callerId && session.calleeId) {
      let logStatus: 'missed' | 'rejected' | 'ended' = 'ended';
      if (reason === 'rejected') {
        logStatus = 'rejected';
      } else if (reason === 'missed' || (callDuration === 0 && callStatus === 'calling')) {
        logStatus = 'missed';
      }
      saveCallLog({
        callId: session.callId || `call-${Date.now()}`,
        callerId: session.callerId,
        callerName: session.callerName,
        callerAvatar: session.callerAvatar,
        calleeId: session.calleeId,
        calleeName: session.calleeName,
        calleeAvatar: session.calleeAvatar,
        callType: session.callType,
        status: logStatus,
        durationSeconds: callDuration,
        participants: [session.callerId, session.calleeId],
        createdAt: session.createdAt || new Date().toISOString(),
      });
    }

    if (reason && reason !== 'user_hung_up') {
      const msg = reason === 'rejected' ? 'Call was declined.' : reason === 'busy' ? 'User is currently on another call.' : 'Call ended.';
      toast.info(msg);
    }

    // Reset back to idle after brief duration
    setTimeout(() => {
      setCallStatus('idle');
      setActiveSession(null);
      setIncomingSession(null);
      setCallDuration(0);
      setIsMinimized(false);
      setMediaControls({
        isMuted: false,
        isVideoDisabled: false,
        isScreenSharing: false,
        isSpeakerOn: true,
        facingMode: 'user',
      });
    }, 1200);
  }, [localStream, remoteStream, stopAllAudioLoops]);

  // 1. Start Outgoing Call
  const startCall = useCallback(async ({
    calleeId,
    calleeName,
    calleeAvatar,
    callType,
  }: {
    calleeId: string;
    calleeName: string;
    calleeAvatar?: string;
    callType: CallType;
  }) => {
    if (!currentUser) {
      toast.error('Please log in to make audio and video calls.');
      return;
    }

    if (calleeId === currentUser.id) {
      toast.error('You cannot call yourself.');
      return;
    }

    if (callStatus !== 'idle') {
      toast.info('You are already on an active call.');
      return;
    }

    try {
      setCallStatus('calling');
      setIsMinimized(false);

      // Start outgoing ringback tone
      stopAllAudioLoops();
      stopRingbackRef.current = startOutgoingRingback();

      const sessionPlaceholder: CallSession = {
        callId: '',
        callerId: currentUser.id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar,
        calleeId,
        calleeName,
        calleeAvatar,
        callType,
        status: 'calling',
        createdAt: new Date().toISOString(),
      };
      setActiveSession(sessionPlaceholder);

      const callResult = await startOutgoingCall({
        callerId: currentUser.id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar,
        calleeId,
        calleeName,
        calleeAvatar,
        callType,
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnected: () => {
          stopAllAudioLoops();
          playCallConnectedTone();
          setCallStatus('connected');
          toast.success('Call connected!');
        },
        onEnded: (reason) => {
          performCleanup(reason);
        },
        onError: (err) => {
          console.error('Call connection error:', err);
          toast.error('Call failed to connect.');
          performCleanup('failed');
        },
      });

      peerConnectionRef.current = callResult.peerConnection;
      setLocalStream(callResult.localStream);
      activeCleanupRef.current = callResult.cleanup;
      setActiveSession((prev) => prev ? { ...prev, callId: callResult.callId } : prev);
    } catch (err: any) {
      console.error('Failed to start call:', err);
      stopAllAudioLoops();
      setCallStatus('idle');
      setActiveSession(null);
      toast.error(err.message || 'Microphone or Camera access denied.');
    }
  }, [currentUser, callStatus, stopAllAudioLoops, performCleanup]);

  // 2. Accept Incoming Call
  const acceptCall = useCallback(async () => {
    const targetSession = incomingSessionRef.current || incomingSession;
    if (!targetSession) return;

    try {
      stopAllAudioLoops();
      callStatusRef.current = 'connected';
      setCallStatus('connected');
      activeSessionRef.current = targetSession;
      setActiveSession(targetSession);
      incomingSessionRef.current = null;
      setIncomingSession(null);

      const answerResult = await answerIncomingCall({
        callSession: targetSession,
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnected: () => {
          stopAllAudioLoops();
          playCallConnectedTone();
          callStatusRef.current = 'connected';
          setCallStatus('connected');
        },
        onEnded: (reason) => {
          performCleanup(reason);
        },
        onError: (err) => {
          console.error('Error answering call:', err);
          toast.error('Failed to establish call connection.');
          performCleanup('failed');
        },
      });

      peerConnectionRef.current = answerResult.peerConnection;
      setLocalStream(answerResult.localStream);
      activeCleanupRef.current = answerResult.cleanup;
    } catch (err: any) {
      console.error('Accept call failed:', err);
      stopAllAudioLoops();
      callStatusRef.current = 'idle';
      setCallStatus('idle');
      activeSessionRef.current = null;
      setActiveSession(null);
      toast.error(err.message || 'Could not access audio/video devices.');
    }
  }, [incomingSession, stopAllAudioLoops, performCleanup]);

  // 3. Decline Incoming Call
  const declineCall = useCallback(async () => {
    if (!incomingSession) return;
    stopAllAudioLoops();
    const id = incomingSession.callId;

    saveCallLog({
      callId: incomingSession.callId,
      callerId: incomingSession.callerId,
      callerName: incomingSession.callerName,
      callerAvatar: incomingSession.callerAvatar,
      calleeId: incomingSession.calleeId,
      calleeName: incomingSession.calleeName,
      calleeAvatar: incomingSession.calleeAvatar,
      callType: incomingSession.callType,
      status: 'rejected',
      durationSeconds: 0,
      participants: [incomingSession.callerId, incomingSession.calleeId],
      createdAt: incomingSession.createdAt || new Date().toISOString(),
    });

    setIncomingSession(null);
    setCallStatus('idle');
    await rejectIncomingCall(id, 'rejected');
  }, [incomingSession, stopAllAudioLoops]);

  // 4. End Call
  const endCall = useCallback(async () => {
    if (activeSession?.callId) {
      await endActiveCall(activeSession.callId);
    }
    performCleanup('user_hung_up');
  }, [activeSession, performCleanup]);

  // 5. Toggle Microphone Mute
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const newMutedState = !mediaControls.isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !newMutedState;
    });

    setMediaControls((prev) => ({
      ...prev,
      isMuted: newMutedState,
    }));
  }, [localStream, mediaControls.isMuted]);

  // 6. Toggle Camera On/Off
  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const newVideoDisabledState = !mediaControls.isVideoDisabled;
    videoTracks.forEach((track) => {
      track.enabled = !newVideoDisabledState;
    });

    setMediaControls((prev) => ({
      ...prev,
      isVideoDisabled: newVideoDisabledState,
    }));
  }, [localStream, mediaControls.isVideoDisabled]);

  // 7. Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !localStream) return;

    if (mediaControls.isScreenSharing) {
      // Revert back to webcam track
      if (originalVideoTrackRef.current) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(originalVideoTrackRef.current);
        }
        originalVideoTrackRef.current = null;
      }
      setMediaControls((prev) => ({ ...prev, isScreenSharing: false }));
    } else {
      try {
        if (!navigator.mediaDevices.getDisplayMedia) {
          toast.error('Screen sharing is not supported by your browser.');
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');

        if (sender && sender.track) {
          originalVideoTrackRef.current = sender.track;
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          if (originalVideoTrackRef.current && sender) {
            sender.replaceTrack(originalVideoTrackRef.current);
            originalVideoTrackRef.current = null;
          }
          setMediaControls((prev) => ({ ...prev, isScreenSharing: false }));
        };

        setMediaControls((prev) => ({ ...prev, isScreenSharing: true }));
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
      }
    }
  }, [localStream, mediaControls.isScreenSharing]);

  // 8. Flip Camera (Mobile Front/Back)
  const flipCamera = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !localStream) return;

    const currentFacing = mediaControls.facingMode;
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });

      const newTrack = newStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');

      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      // Stop old track
      localStream.getVideoTracks().forEach((t) => t.stop());
      localStream.removeTrack(localStream.getVideoTracks()[0]);
      localStream.addTrack(newTrack);

      setMediaControls((prev) => ({ ...prev, facingMode: newFacing }));
    } catch (err) {
      console.warn('Camera flip failed:', err);
    }
  }, [localStream, mediaControls.facingMode]);

  return (
    <CallContext.Provider
      value={{
        currentUser,
        callStatus,
        activeSession,
        incomingSession,
        localStream,
        remoteStream,
        callDuration,
        isMinimized,
        mediaControls,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        flipCamera,
        setIsMinimized,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useWebRTCCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useWebRTCCall must be used within a CallProvider');
  }
  return context;
};
