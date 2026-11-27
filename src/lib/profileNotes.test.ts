import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROFILE_IMPLEMENTATION_NOTES,
  PROFILE_EXISTING_CAPABILITIES,
  addProfileNote,
  cycleProfileNoteStatus,
  deleteProfileNote,
  formatNotesAsMarkdown,
} from './profileNotes.ts';

describe('profileNotes', () => {
  it('adds, cycles status, deletes, and formats implementation notes cleanly', () => {
    const initial = [...DEFAULT_PROFILE_IMPLEMENTATION_NOTES];
    const added = addProfileNote(initial, {
      title: 'Two-factor WhatsApp OTP backup',
      details: 'Optional OTP verification toggle inside security tab.',
      section: 'security',
      priority: 'high',
    });

    assert.equal(added.length, initial.length + 1);
    assert.equal(added[0].status, 'planned');
    assert.equal(added[0].section, 'security');

    const cycledOnce = cycleProfileNoteStatus(added, added[0].id);
    assert.equal(cycledOnce[0].status, 'in_progress');

    const cycledTwice = cycleProfileNoteStatus(cycledOnce, added[0].id);
    assert.equal(cycledTwice[0].status, 'implemented');

    const md = formatNotesAsMarkdown(cycledTwice);
    assert.equal(md.includes('Two-factor WhatsApp OTP backup'), true);
    assert.equal(md.includes('[x] (HIGH)'), true);

    const removed = deleteProfileNote(cycledTwice, added[0].id);
    assert.equal(removed.length, initial.length);
  });

  it('ignores blank note titles and documents all existing profile tabs', () => {
    const unchanged = addProfileNote(DEFAULT_PROFILE_IMPLEMENTATION_NOTES, { title: '   ' });
    assert.equal(unchanged.length, DEFAULT_PROFILE_IMPLEMENTATION_NOTES.length);

    const tabs = new Set(PROFILE_EXISTING_CAPABILITIES.map((c) => c.tabTarget));
    assert.equal(tabs.has('info'), true);
    assert.equal(tabs.has('push'), true);
    assert.equal(tabs.has('creator'), true);
    assert.equal(tabs.has('password'), true);
  });
});
