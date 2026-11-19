import { CallSession, CallStatus, CallType } from '@/types/call';

export const MAX_CALL_AVATAR_URL_LENGTH = 2048;
export const MAX_CALL_DISPLAY_NAME_LENGTH = 150;
export const MAX_CALL_SDP_LENGTH = 65536;
export const MAX_FIRESTORE_CALL_DOC_BYTES = 900_000; // Safe margin under Firestore's 1,048,576-byte limit

/**
 * Computes UTF-8 byte length of a JSON-serializable payload.
 */
export function estimateUtf8ByteLength(value: unknown): number {
  const json = JSON.stringify(value) ?? '';
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length;
  }
  return json.length * 2;
}

/**
 * Sanitizes avatar URLs before persisting them in Firestore signaling/log documents.
 * Inline base64 data URIs (which can easily exceed 1-2 MB) and local blob URLs are stripped
 * so Firestore documents stay compact and well under the 1 MiB document size limit.
 */
export function sanitizeCallAvatarUrl(avatar?: string | null): string {
  if (typeof avatar !== 'string') return '';
  const trimmed = avatar.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) {
    return '';
  }

  if (trimmed.length > MAX_CALL_AVATAR_URL_LENGTH) {
    return '';
  }

  return trimmed;
}

/**
 * Sanitizes a participant's display name to match blueprint length constraints.
 */
export function sanitizeCallDisplayName(name?: string | null, fallback = 'GGD Member'): string {
  if (typeof name !== 'string') return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_CALL_DISPLAY_NAME_LENGTH);
}

/**
 * Sanitizes an SDP offer/answer object so it fits safely within Firestore limits.
 */
export function sanitizeSessionDescription(
  desc?: { type?: string; sdp?: string } | null
): { type: string; sdp: string } | undefined {
  if (!desc || typeof desc !== 'object') return undefined;
  const type = typeof desc.type === 'string' ? desc.type.slice(0, 32) : '';
  const sdp = typeof desc.sdp === 'string' ? desc.sdp.slice(0, MAX_CALL_SDP_LENGTH) : '';
  if (!type && !sdp) return undefined;
  return { type, sdp };
}

export interface BuildCallDocInput {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  callType: CallType;
  status?: CallStatus;
  offer?: { type?: string; sdp?: string };
  createdAt?: string;
}

/**
 * Builds a Firestore-safe CallSession document guaranteed to fit under Firestore's 1 MiB limit.
 */
export function buildFirestoreCallSessionPayload(input: BuildCallDocInput): CallSession {
  const payload: CallSession = {
    callId: String(input.callId || '').slice(0, 128),
    callerId: String(input.callerId || '').slice(0, 128),
    callerName: sanitizeCallDisplayName(input.callerName, 'Caller'),
    callerAvatar: sanitizeCallAvatarUrl(input.callerAvatar),
    calleeId: String(input.calleeId || '').slice(0, 128),
    calleeName: sanitizeCallDisplayName(input.calleeName, 'Contact'),
    calleeAvatar: sanitizeCallAvatarUrl(input.calleeAvatar),
    callType: input.callType === 'video' ? 'video' : 'audio',
    status: input.status || 'ringing',
    offer: sanitizeSessionDescription(input.offer),
    createdAt: input.createdAt || new Date().toISOString(),
  };

  if (estimateUtf8ByteLength(payload) > MAX_FIRESTORE_CALL_DOC_BYTES) {
    payload.callerAvatar = '';
    payload.calleeAvatar = '';
  }

  return payload;
}

export interface BuildCallLogInput {
  id: string;
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  callType: 'audio' | 'video';
  status: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'ended';
  durationSeconds: number;
  participants: string[];
  createdAt?: string;
}

/**
 * Builds a Firestore-safe CallLog document guaranteed to fit under Firestore's 1 MiB limit.
 */
export function buildFirestoreCallLogPayload(input: BuildCallLogInput): BuildCallLogInput & { createdAt: string } {
  const payload = {
    id: String(input.id || '').slice(0, 160),
    callId: String(input.callId || '').slice(0, 128),
    callerId: String(input.callerId || '').slice(0, 128),
    callerName: sanitizeCallDisplayName(input.callerName, 'Caller'),
    callerAvatar: sanitizeCallAvatarUrl(input.callerAvatar),
    calleeId: String(input.calleeId || '').slice(0, 128),
    calleeName: sanitizeCallDisplayName(input.calleeName, 'Contact'),
    calleeAvatar: sanitizeCallAvatarUrl(input.calleeAvatar),
    callType: (input.callType === 'video' ? 'video' : 'audio') as 'audio' | 'video',
    status: input.status,
    durationSeconds: Number.isFinite(input.durationSeconds) ? Math.max(0, Math.floor(input.durationSeconds)) : 0,
    participants: Array.isArray(input.participants)
      ? input.participants.slice(0, 10).map((p) => String(p).slice(0, 128))
      : [],
    createdAt: input.createdAt || new Date().toISOString(),
  };

  return payload;
}
