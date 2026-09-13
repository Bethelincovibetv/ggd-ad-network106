export type CallType = 'video' | 'audio';

export type CallStatus =
  | 'idle'
  | 'calling'     // Caller initiated, waiting for callee to answer
  | 'ringing'     // Callee receiving incoming call
  | 'connected'   // Active WebRTC peer-to-peer session
  | 'ended'       // Terminated cleanly
  | 'rejected'    // Callee declined
  | 'busy'        // Callee in another call
  | 'missed';     // Unanswered timeout

export interface CallSession {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  callType: CallType;
  status: CallStatus;
  offer?: {
    type: string;
    sdp: string;
  };
  answer?: {
    type: string;
    sdp: string;
  };
  createdAt: string;
  updatedAt?: string;
  connectedAt?: string;
  endedAt?: string;
  endReason?: string;
}

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export interface MediaControlsState {
  isMuted: boolean;
  isVideoDisabled: boolean;
  isScreenSharing: boolean;
  isSpeakerOn: boolean;
  facingMode: 'user' | 'environment';
}
