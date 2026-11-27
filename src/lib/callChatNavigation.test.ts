import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCallLogCounterparty,
  buildDirectChatUrl,
  parseDirectChatTargetFromSearch,
  buildMissedCallNavTarget,
  isMissedCallNotification,
  extractMissedCallContact,
} from './callChatNavigation';

describe('callChatNavigation', () => {
  it('resolves counterparty details correctly for caller and callee', () => {
    const incomingMissed = resolveCallLogCounterparty(
      {
        callerId: 'user-caller-1',
        callerName: 'Adaeze Boutique',
        callerAvatar: 'https://cdn.example.com/ada.jpg',
        calleeId: 'user-me-2',
        calleeName: 'Chidi Tech',
        status: 'missed',
        callType: 'video',
      },
      'user-me-2'
    );

    assert.equal(incomingMissed.targetId, 'user-caller-1');
    assert.equal(incomingMissed.targetName, 'Adaeze Boutique');
    assert.equal(incomingMissed.targetAvatar, 'https://cdn.example.com/ada.jpg');
    assert.equal(incomingMissed.isMissed, true);
    assert.equal(incomingMissed.isCaller, false);

    const outgoing = resolveCallLogCounterparty(
      {
        callerId: 'user-me-2',
        callerName: 'Chidi Tech',
        calleeId: 'user-other-3',
        calleeName: 'Lagos Logistics',
        calleeAvatar: 'https://cdn.example.com/lagos.jpg',
        status: 'rejected',
      },
      'user-me-2'
    );

    assert.equal(outgoing.targetId, 'user-other-3');
    assert.equal(outgoing.targetName, 'Lagos Logistics');
    assert.equal(outgoing.isMissed, false);
    assert.equal(outgoing.isCaller, true);
  });

  it('builds and parses direct chat URLs with contact metadata', () => {
    const url = buildDirectChatUrl({
      userId: 'abc-123',
      name: 'Naija Gadgets',
      avatar: 'https://cdn.example.com/ng.png',
    });

    assert.ok(url.startsWith('/?'));
    const query = url.slice(url.indexOf('?'));
    const parsed = parseDirectChatTargetFromSearch(query);

    assert.deepEqual(parsed, {
      userId: 'abc-123',
      name: 'Naija Gadgets',
      avatar: 'https://cdn.example.com/ng.png',
    });
  });

  it('round-trips missed call notification metadata cleanly', () => {
    const navTarget = buildMissedCallNavTarget({
      callerId: 'caller-99',
      callerName: 'Emeka Motors',
      callerAvatar: 'https://cdn.example.com/emeka.png',
      callType: 'video',
    });

    const notif = {
      id: 'notif-1',
      type: 'missed_call',
      title: 'Missed Video Call from Emeka Motors',
      message: 'You missed a video call from Emeka Motors.',
      nav_target: navTarget,
      link_url: buildDirectChatUrl({
        userId: 'caller-99',
        name: 'Emeka Motors',
        avatar: 'https://cdn.example.com/emeka.png',
      }),
    };

    assert.equal(isMissedCallNotification(notif), true);
    assert.deepEqual(extractMissedCallContact(notif), {
      callerId: 'caller-99',
      callerName: 'Emeka Motors',
      callerAvatar: 'https://cdn.example.com/emeka.png',
      callType: 'video',
    });
  });

  it('returns null for non-missed-call notifications', () => {
    const normalNotif = {
      type: 'credit_transfer',
      title: 'You received 500 GGG credits',
      nav_target: 'receipt:trx-1',
    };
    assert.equal(isMissedCallNotification(normalNotif), false);
    assert.equal(extractMissedCallContact(normalNotif), null);
  });
});
