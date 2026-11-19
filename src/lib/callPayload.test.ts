import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CALL_AVATAR_URL_LENGTH,
  MAX_CALL_DISPLAY_NAME_LENGTH,
  MAX_FIRESTORE_CALL_DOC_BYTES,
  buildFirestoreCallLogPayload,
  buildFirestoreCallSessionPayload,
  estimateUtf8ByteLength,
  sanitizeCallAvatarUrl,
  sanitizeCallDisplayName,
} from './callPayload';

describe('callPayload Firestore volumetric sanitization', () => {
  it('strips multi-megabyte data:image base64 avatars so call docs stay well under 1 MiB', () => {
    const hugeBase64Avatar = `data:image/png;base64,${'A'.repeat(2_600_000)}`;
    const payload = buildFirestoreCallSessionPayload({
      callId: 'FZeMkS52CmPRuq8T65Di',
      callerId: 'user-caller-123',
      callerName: 'Ada Lovelace',
      callerAvatar: hugeBase64Avatar,
      calleeId: 'user-callee-456',
      calleeName: 'Chidi Obi',
      calleeAvatar: hugeBase64Avatar,
      callType: 'audio',
      offer: {
        type: 'offer',
        sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\n',
      },
      createdAt: '2026-11-19T10:00:00.000Z',
    });

    assert.equal(payload.callerAvatar, '');
    assert.equal(payload.calleeAvatar, '');
    const byteSize = estimateUtf8ByteLength(payload);
    assert.ok(byteSize < MAX_FIRESTORE_CALL_DOC_BYTES, `Expected byte size < ${MAX_FIRESTORE_CALL_DOC_BYTES}, got ${byteSize}`);
    assert.ok(byteSize < 2048, `Expected compact payload, got ${byteSize} bytes`);
  });

  it('strips blob URLs and oversized URLs while preserving normal HTTPS and relative upload URLs', () => {
    assert.equal(sanitizeCallAvatarUrl('blob:https://example.com/1234-5678'), '');
    assert.equal(sanitizeCallAvatarUrl(`https://example.com/${'x'.repeat(MAX_CALL_AVATAR_URL_LENGTH)}`), '');
    assert.equal(
      sanitizeCallAvatarUrl('  https://cdn.example.com/avatars/user-1.jpg  '),
      'https://cdn.example.com/avatars/user-1.jpg'
    );
    assert.equal(sanitizeCallAvatarUrl('/uploads/avatars/avatar_123.webp'), '/uploads/avatars/avatar_123.webp');
  });

  it('truncates oversized display names safely with fallback', () => {
    const longName = 'N'.repeat(300);
    const sanitized = sanitizeCallDisplayName(longName);
    assert.equal(sanitized.length, MAX_CALL_DISPLAY_NAME_LENGTH);
    assert.equal(sanitizeCallDisplayName('   ', 'Fallback'), 'Fallback');
  });

  it('sanitizes call_logs payloads so oversized avatars cannot break call history writes', () => {
    const hugeBase64Avatar = `data:image/jpeg;base64,${'B'.repeat(2_000_000)}`;
    const logPayload = buildFirestoreCallLogPayload({
      id: 'call-1-1700000000',
      callId: 'call-1',
      callerId: 'u1',
      callerName: 'Caller',
      callerAvatar: hugeBase64Avatar,
      calleeId: 'u2',
      calleeName: 'Callee',
      calleeAvatar: 'https://example.com/avatar.png',
      callType: 'video',
      status: 'ended',
      durationSeconds: 42.9,
      participants: ['u1', 'u2'],
    });

    assert.equal(logPayload.callerAvatar, '');
    assert.equal(logPayload.calleeAvatar, 'https://example.com/avatar.png');
    assert.equal(logPayload.durationSeconds, 42);
    assert.ok(estimateUtf8ByteLength(logPayload) < 2048);
  });
});
