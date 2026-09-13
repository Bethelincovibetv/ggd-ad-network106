import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from '@/lib/firebase';
import { CallSession, CallType } from '@/types/call';
import { p2pImageTransfer } from '@/services/webrtcDataChannel';

export const RTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export interface ActiveCallState {
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callSession: CallSession | null;
  unsubCall: Unsubscribe | null;
  unsubCallerCandidates: Unsubscribe | null;
  unsubCalleeCandidates: Unsubscribe | null;
}

/**
 * Capture local user media (camera and/or microphone)
 */
export async function getLocalMediaStream(callType: CallType, facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: callType === 'video' ? {
      facingMode,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    } : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err: any) {
    // If video fails (e.g. no camera attached or permission denied for video), fallback to audio-only
    if (callType === 'video') {
      console.warn('Video stream access failed, attempting audio-only fallback:', err);
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw err;
  }
}

/**
 * Dispatch high-priority FCM / Web Push notification to recipient device
 */
export async function notifyIncomingCallViaFCM(payload: {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  callType: CallType;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/calls/notify-incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('FCM call notification dispatch failed:', err);
    return false;
  }
}

/**
 * Create an outgoing Call:
 * 1. Initializes local media & RTCPeerConnection
 * 2. Creates SDP Offer
 * 3. Saves Call Doc in Firestore with status 'ringing'
 * 4. Pushes ICE candidates to /calls/{callId}/callerCandidates
 * 5. Listens to callee answer & /calls/{callId}/calleeCandidates
 */
export async function startOutgoingCall({
  callerId,
  callerName,
  callerAvatar,
  calleeId,
  calleeName,
  calleeAvatar,
  callType,
  onRemoteStream,
  onConnected,
  onEnded,
  onError,
}: {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  callType: CallType;
  onRemoteStream: (stream: MediaStream) => void;
  onConnected: () => void;
  onEnded: (reason: string) => void;
  onError: (err: any) => void;
}): Promise<{
  callId: string;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  cleanup: () => void;
}> {
  await ensureFirebaseAuth();

  const localStream = await getLocalMediaStream(callType);
  const peerConnection = new RTCPeerConnection(RTC_ICE_SERVERS);
  const remoteStream = new MediaStream();
  onRemoteStream(remoteStream);

  // Add local tracks to peer connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle incoming remote tracks
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      // Avoid duplicate tracks
      if (!remoteStream.getTracks().some(t => t.id === track.id)) {
        remoteStream.addTrack(track);
      }
    });
  };

  // Create Firestore call document reference
  const callsCollection = collection(db, 'calls');
  const callDocRef = doc(callsCollection);
  const callId = callDocRef.id;

  const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');
  const calleeCandidatesCollection = collection(callDocRef, 'calleeCandidates');

  // Listen for local ICE candidates and write to callerCandidates subcollection
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(callerCandidatesCollection, event.candidate.toJSON()).catch((err) => {
        console.warn('Error saving caller ICE candidate:', err);
      });
    }
  };

  // Monitor connection state
  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === 'connected') {
      onConnected();
    } else if (
      peerConnection.connectionState === 'disconnected' ||
      peerConnection.connectionState === 'failed' ||
      peerConnection.connectionState === 'closed'
    ) {
      onEnded('connection_' + peerConnection.connectionState);
    }
  };

  // Create P2P DataChannel for 16KB chunked ephemeral image streaming
  try {
    const dataChannel = peerConnection.createDataChannel('image-transfer', {
      ordered: true,
    });
    p2pImageTransfer.bindDataChannel(dataChannel, callerId, calleeId);
  } catch (err) {
    console.warn('[WebRTC] Could not initialize DataChannel:', err);
  }

  // Create SDP Offer
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: callType === 'video',
  });
  await peerConnection.setLocalDescription(offer);

  // Write call session to Firestore
  const callData: CallSession = {
    callId,
    callerId,
    callerName,
    callerAvatar: callerAvatar || '',
    calleeId,
    calleeName,
    calleeAvatar: calleeAvatar || '',
    callType,
    status: 'ringing',
    offer: {
      type: offer.type,
      sdp: offer.sdp || '',
    },
    createdAt: new Date().toISOString(),
  };

  await setDoc(callDocRef, callData);

  // Send background FCM push notification to callee
  notifyIncomingCallViaFCM({
    callId,
    callerId,
    callerName,
    callerAvatar,
    calleeId,
    callType,
  });

  // Listen for Callee's SDP Answer & Status changes
  let hasSetRemoteAnswer = false;
  const pendingCandidates: RTCIceCandidateInit[] = [];

  const unsubCall = onSnapshot(callDocRef, async (snapshot) => {
    const data = snapshot.data() as CallSession | undefined;
    if (!data) return;

    if (data.status === 'rejected' || data.status === 'ended' || data.status === 'busy') {
      onEnded(data.status);
      return;
    }

    if (!peerConnection.currentRemoteDescription && data.answer && !hasSetRemoteAnswer) {
      try {
        hasSetRemoteAnswer = true;
        const answerDescription = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(answerDescription);

        // Process any queued candidates
        while (pendingCandidates.length > 0) {
          const cand = pendingCandidates.shift();
          if (cand) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          }
        }
      } catch (err) {
        console.error('Error applying remote answer:', err);
        onError(err);
      }
    }
  });

  // Listen for Callee ICE candidates in subcollection
  const unsubCalleeCandidates = onSnapshot(calleeCandidatesCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data() as RTCIceCandidateInit;
        try {
          if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
          } else {
            pendingCandidates.push(candidateData);
          }
        } catch (err) {
          console.warn('Error adding callee candidate:', err);
        }
      }
    });
  });

  // Cleanup helper
  const cleanup = () => {
    unsubCall();
    unsubCalleeCandidates();

    // Mark call as ended in Firestore if still active
    updateDoc(callDocRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    }).catch(() => {});

    // Stop all local tracks
    localStream.getTracks().forEach((track) => {
      track.stop();
      track.enabled = false;
    });

    // Close peer connection
    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    try {
      peerConnection.close();
    } catch {}
  };

  return {
    callId,
    peerConnection,
    localStream,
    cleanup,
  };
}

/**
 * Callee: Answer an incoming Call:
 * 1. Initializes local media & RTCPeerConnection
 * 2. Applies Caller's SDP Offer
 * 3. Creates SDP Answer
 * 4. Updates Call Doc in Firestore with answer & status 'connected'
 * 5. Exchanges ICE candidates via callerCandidates & calleeCandidates
 */
export async function answerIncomingCall({
  callSession,
  onRemoteStream,
  onConnected,
  onEnded,
  onError,
}: {
  callSession: CallSession;
  onRemoteStream: (stream: MediaStream) => void;
  onConnected: () => void;
  onEnded: (reason: string) => void;
  onError: (err: any) => void;
}): Promise<{
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  cleanup: () => void;
}> {
  await ensureFirebaseAuth();

  if (!callSession.offer) {
    throw new Error('Call offer SDP is missing');
  }

  const localStream = await getLocalMediaStream(callSession.callType);
  const peerConnection = new RTCPeerConnection(RTC_ICE_SERVERS);
  const remoteStream = new MediaStream();
  onRemoteStream(remoteStream);

  // Add local tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Receive remote tracks
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      if (!remoteStream.getTracks().some(t => t.id === track.id)) {
        remoteStream.addTrack(track);
      }
    });
  };

  // Listen for incoming P2P DataChannel
  peerConnection.ondatachannel = (event) => {
    if (event.channel.label === 'image-transfer' || event.channel) {
      p2pImageTransfer.bindDataChannel(event.channel, callSession.calleeId, callSession.callerId);
    }
  };

  const callDocRef = doc(db, 'calls', callSession.callId);
  const calleeCandidatesCollection = collection(callDocRef, 'calleeCandidates');
  const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');

  // Stream local ICE candidates to calleeCandidates subcollection
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(calleeCandidatesCollection, event.candidate.toJSON()).catch((err) => {
        console.warn('Error saving callee ICE candidate:', err);
      });
    }
  };

  // Monitor connection
  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === 'connected') {
      onConnected();
    } else if (
      peerConnection.connectionState === 'disconnected' ||
      peerConnection.connectionState === 'failed' ||
      peerConnection.connectionState === 'closed'
    ) {
      onEnded('connection_' + peerConnection.connectionState);
    }
  };

  // Apply remote offer
  await peerConnection.setRemoteDescription(new RTCSessionDescription(callSession.offer));

  // Create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Update Call doc in Firestore
  await updateDoc(callDocRef, {
    answer: {
      type: answer.type,
      sdp: answer.sdp || '',
    },
    status: 'connected',
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Listen for status changes (e.g. caller hangs up)
  const unsubCall = onSnapshot(callDocRef, (snapshot) => {
    const data = snapshot.data() as CallSession | undefined;
    if (!data) return;
    if (data.status === 'ended' || data.status === 'rejected') {
      onEnded(data.status);
    }
  });

  // Listen for Caller ICE candidates in callerCandidates subcollection
  const unsubCallerCandidates = onSnapshot(callerCandidatesCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data() as RTCIceCandidateInit;
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
        } catch (err) {
          console.warn('Error adding caller candidate:', err);
        }
      }
    });
  });

  const cleanup = () => {
    unsubCall();
    unsubCallerCandidates();

    updateDoc(callDocRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
    }).catch(() => {});

    localStream.getTracks().forEach((track) => {
      track.stop();
      track.enabled = false;
    });

    peerConnection.ontrack = null;
    peerConnection.onicecandidate = null;
    peerConnection.onconnectionstatechange = null;
    try {
      peerConnection.close();
    } catch {}
  };

  return {
    peerConnection,
    localStream,
    cleanup,
  };
}

/**
 * Reject / Decline an incoming call
 */
export async function rejectIncomingCall(callId: string, reason: 'rejected' | 'busy' = 'rejected'): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, {
      status: reason,
      endedAt: new Date().toISOString(),
      endReason: reason,
    });
  } catch (err) {
    console.warn('Failed to reject call in Firestore:', err);
  }
}

/**
 * End / Terminate an active call
 */
export async function endActiveCall(callId: string): Promise<void> {
  try {
    await ensureFirebaseAuth();
    const callDocRef = doc(db, 'calls', callId);
    await updateDoc(callDocRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
      endReason: 'user_hung_up',
    });
  } catch (err) {
    console.warn('Failed to end call in Firestore:', err);
  }
}

/**
 * Subscribe to incoming calls for a recipient user
 */
export function listenForIncomingCalls(
  currentUserId: string,
  onIncomingCall: (call: CallSession) => void
): Unsubscribe {
  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('calleeId', '==', currentUserId),
    where('status', '==', 'ringing')
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const callData = change.doc.data() as CallSession;
        if (callData.status === 'ringing') {
          onIncomingCall(callData);
        }
      }
    });
  }, (err) => {
    console.warn('Incoming call listener note:', err);
  });
}

/**
 * Direct Peer-to-Peer DataChannel for Chat (without media streams)
 * Connects two chat peers peer-to-peer using Firestore signaling for ephemeral image streaming
 */
export async function connectChatP2PDataChannel({
  myUserId,
  otherUserId,
  onConnected,
  onError,
}: {
  myUserId: string;
  otherUserId: string;
  onConnected?: () => void;
  onError?: (err: any) => void;
}): Promise<() => void> {
  try {
    await ensureFirebaseAuth();

    if (p2pImageTransfer.isReady()) {
      onConnected?.();
      return () => {};
    }

    const roomKey = [myUserId, otherUserId].sort().join('_');
    const channelDocRef = doc(db, 'calls', `p2p_channel_${roomKey}`);
    const isInitiator = myUserId < otherUserId;

    const peerConnection = new RTCPeerConnection(RTC_ICE_SERVERS);

    const localCandidatesCol = collection(
      channelDocRef,
      isInitiator ? 'callerCandidates' : 'calleeCandidates'
    );
    const remoteCandidatesCol = collection(
      channelDocRef,
      isInitiator ? 'calleeCandidates' : 'callerCandidates'
    );

    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        addDoc(localCandidatesCol, e.candidate.toJSON()).catch(() => {});
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        onConnected?.();
      }
    };

    let unsubRemoteCandidates: Unsubscribe | null = null;
    let unsubDoc: Unsubscribe | null = null;

    if (isInitiator) {
      const dc = peerConnection.createDataChannel('image-transfer', { ordered: true });
      p2pImageTransfer.bindDataChannel(dc, myUserId, otherUserId);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await setDoc(channelDocRef, {
        initiator: myUserId,
        receiver: otherUserId,
        offer: { type: offer.type, sdp: offer.sdp },
        updatedAt: new Date().toISOString(),
      });

      unsubDoc = onSnapshot(channelDocRef, async (snap) => {
        const data = snap.data();
        if (data?.answer && !peerConnection.currentRemoteDescription) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch {}
        }
      });
    } else {
      peerConnection.ondatachannel = (e) => {
        p2pImageTransfer.bindDataChannel(e.channel, myUserId, otherUserId);
        onConnected?.();
      };

      unsubDoc = onSnapshot(channelDocRef, async (snap) => {
        const data = snap.data();
        if (data?.offer && !peerConnection.currentRemoteDescription) {
          try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await updateDoc(channelDocRef, {
              answer: { type: answer.type, sdp: answer.sdp },
              updatedAt: new Date().toISOString(),
            });
          } catch {}
        }
      });
    }

    unsubRemoteCandidates = onSnapshot(remoteCandidatesCol, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          try {
            if (peerConnection.remoteDescription) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data() as RTCIceCandidateInit));
            }
          } catch {}
        }
      });
    });

    return () => {
      unsubDoc?.();
      unsubRemoteCandidates?.();
      try { peerConnection.close(); } catch {}
    };
  } catch (err) {
    console.warn('[connectChatP2PDataChannel] Handshake initialization note:', err);
    onError?.(err);
    return () => {};
  }
}
