import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBannerAdvertInput,
  parseAdminNaturalLanguageIntent,
} from './vixoraAdminTools';

describe('vixoraAdminTools', () => {
  it('normalizes banner advert payloads with defaults and bounds', () => {
    const payload = buildBannerAdvertInput({
      args: {
        title: 'Mega December Promo',
        targetUrl: 'ggd.ng/promo',
        durationDays: 120,
        format: 'banner_square',
        themeColor: 'emerald',
      },
      businessName: 'Lagos Fashion Hub',
      userId: 'user-42',
      canvasDataUrl: 'data:image/jpeg;base64,AAA',
    });

    assert.equal(payload.title, 'Mega December Promo');
    assert.equal(payload.targetUrl, 'https://ggd.ng/promo');
    assert.equal(payload.durationDays, 90);
    assert.equal(payload.format, 'banner_square');
    assert.equal(payload.themeColor, 'emerald');
    assert.equal(payload.imageUrl, 'data:image/jpeg;base64,AAA');
    assert.equal(payload.approved, true);
    assert.equal(payload.deductCredits, false);
  });

  it('parses admin business verification intents accurately', () => {
    const listMatch = parseAdminNaturalLanguageIntent('Show pending business verifications');
    assert.deepEqual(listMatch, {
      toolName: 'verifyBusinessOrReview',
      args: { action: 'list_pending', recordIdOrQuery: undefined },
    });

    const approveMatch = parseAdminNaturalLanguageIntent(
      'Verify business for "Kano Solar Ltd"'
    );
    assert.deepEqual(approveMatch, {
      toolName: 'verifyBusinessOrReview',
      args: { action: 'approve', recordIdOrQuery: 'Kano Solar Ltd' },
    });
  });

  it('parses submitted task confirmation and syndicate application intents', () => {
    const taskList = parseAdminNaturalLanguageIntent('Confirm submitted tasks pending review');
    assert.equal(taskList?.toolName, 'reviewSubmittedCreditTasks');
    assert.equal(taskList?.args.action, 'list_pending');

    const taskApprove = parseAdminNaturalLanguageIntent(
      'Approve task submission 123e4567-e89b-12d3-a456-426614174000'
    );
    assert.equal(taskApprove?.toolName, 'reviewSubmittedCreditTasks');
    assert.equal(taskApprove?.args.action, 'approve');
    assert.equal(
      taskApprove?.args.submissionIdOrQuery,
      '123e4567-e89b-12d3-a456-426614174000'
    );

    const synApp = parseAdminNaturalLanguageIntent(
      'Confirm syndicate application for promoter@example.com'
    );
    assert.equal(synApp?.toolName, 'reviewSyndicateApplications');
    assert.equal(synApp?.args.action, 'approve');
    assert.equal(synApp?.args.applicationIdOrQuery, 'promoter@example.com');

    const synTask = parseAdminNaturalLanguageIntent(
      'Review pending syndicate task proofs'
    );
    assert.equal(synTask?.toolName, 'reviewSyndicateSubmissions');
    assert.equal(synTask?.args.action, 'list_pending');
  });

  it('parses admin banner advert creation and platform overview commands', () => {
    const bannerCreate = parseAdminNaturalLanguageIntent(
      'Create a purple square banner advert for Black Friday Deals'
    );
    assert.equal(bannerCreate?.toolName, 'manageBannerAdvertsAdmin');
    assert.equal(bannerCreate?.args.action, 'create');
    assert.equal(bannerCreate?.args.format, 'banner_square');
    assert.equal(bannerCreate?.args.themeColor, 'purple');

    const overview = parseAdminNaturalLanguageIntent('Check all pending items overview');
    assert.equal(overview?.toolName, 'getAdminPlatformOverview');
  });
});
