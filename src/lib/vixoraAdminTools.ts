export interface BannerAdvertBuildInput {
  args?: Record<string, any>;
  businessName?: string;
  userId: string;
  uploadedMediaUrl?: string;
  canvasDataUrl?: string;
  isAdmin?: boolean;
}

export interface NormalizedBannerAdvertPayload {
  title: string;
  description: string;
  targetUrl: string;
  durationDays: number;
  format: 'banner_landscape' | 'banner_square' | 'flyer_portrait';
  themeColor: 'orange' | 'purple' | 'emerald' | 'gold' | 'blue';
  imageUrl: string | null;
  approved: boolean;
  deductCredits: boolean;
}

export interface AdminNaturalIntentMatch {
  toolName:
    | 'verifyBusinessOrReview'
    | 'reviewSubmittedCreditTasks'
    | 'reviewSyndicateSubmissions'
    | 'reviewSyndicateApplications'
    | 'manageBannerAdvertsAdmin'
    | 'manageUsersAndWithdrawalsAdmin'
    | 'getAdminPlatformOverview'
    | 'navigateAdminSection';
  args: Record<string, any>;
}

const VALID_THEMES = new Set(['orange', 'purple', 'emerald', 'gold', 'blue']);
const VALID_FORMATS = new Set(['banner_landscape', 'banner_square', 'flyer_portrait']);

export function buildBannerAdvertInput(
  input: BannerAdvertBuildInput
): NormalizedBannerAdvertPayload {
  const args = input.args || {};
  const rawTitle = String(args.title || args.headline || input.businessName || 'Featured Business Offer').trim();
  const title = rawTitle.length >= 2 ? rawTitle.slice(0, 120) : 'Featured Business Offer';

  const rawDesc = String(
    args.description ||
      args.subheadline ||
      `Promoted banner campaign for ${input.businessName || title} on GGD Ad Network.`
  ).trim();
  const description = rawDesc.slice(0, 500);

  const rawUrl = String(args.targetUrl || args.target_url || `/store/${input.userId}`).trim();
  const targetUrl =
    rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/')
      ? rawUrl
      : `https://${rawUrl}`;

  const parsedDays = Number(args.durationDays ?? args.duration_days ?? 7);
  const durationDays = Number.isFinite(parsedDays)
    ? Math.max(1, Math.min(90, Math.round(parsedDays)))
    : 7;

  const format = VALID_FORMATS.has(args.format)
    ? (args.format as NormalizedBannerAdvertPayload['format'])
    : 'banner_landscape';

  const themeColor = VALID_THEMES.has(args.themeColor)
    ? (args.themeColor as NormalizedBannerAdvertPayload['themeColor'])
    : 'orange';

  const imageUrl =
    (typeof args.imageUrl === 'string' && args.imageUrl.trim()) ||
    (typeof input.uploadedMediaUrl === 'string' && input.uploadedMediaUrl.trim()) ||
    (typeof input.canvasDataUrl === 'string' && input.canvasDataUrl.trim()) ||
    null;

  return {
    title,
    description,
    targetUrl,
    durationDays,
    format,
    themeColor,
    imageUrl,
    approved: true,
    deductCredits: false,
  };
}

const GENERIC_TARGET_WORDS = new Set([
  'verification',
  'verifications',
  'application',
  'applications',
  'task',
  'tasks',
  'proof',
  'proofs',
  'submission',
  'submissions',
  'assignment',
  'assignments',
  'ad',
  'ads',
  'advert',
  'adverts',
  'banner',
  'banners',
  'withdrawal',
  'withdrawals',
  'request',
  'requests',
  'pending',
  'review',
  'all',
  'queue',
]);

function extractTargetIdentifier(query: string): string | undefined {
  const uuidMatch = query.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) return uuidMatch[0];

  const emailMatch = query.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) return emailMatch[0];

  const quotedMatch = query.match(/["']([^"']{2,60})["']/);
  if (quotedMatch) return quotedMatch[1].trim();

  const forMatch = query.match(/(?:for|by|user|business|applicant|task|submission|ad)\s+([a-zA-Z0-9 _.-]{2,45})$/i);
  if (forMatch) {
    const candidate = forMatch[1].trim();
    if (!GENERIC_TARGET_WORDS.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return undefined;
}

export function parseAdminNaturalLanguageIntent(query: string): AdminNaturalIntentMatch | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const wantsReject =
    lower.includes('reject') ||
    lower.includes('decline') ||
    lower.includes('deny') ||
    lower.includes('revoke');
  const wantsApprove =
    lower.includes('approve') ||
    lower.includes('confirm') ||
    lower.includes('accept') ||
    lower.includes('verify') ||
    lower.includes('pass');
  const wantsList =
    lower.includes('list') ||
    lower.includes('show') ||
    lower.includes('pending') ||
    lower.includes('view') ||
    lower.includes('check') ||
    lower.includes('queue');

  const targetIdOrQuery = extractTargetIdentifier(trimmed);

  // 1. Syndicate Applications (check before general syndicate tasks)
  if (
    lower.includes('syndicate application') ||
    lower.includes('syndicate applicant') ||
    lower.includes('syndicate apps') ||
    lower.includes('promoter application') ||
    (lower.includes('syndicate') && lower.includes('application'))
  ) {
    const action = wantsReject
      ? 'reject'
      : (wantsApprove && targetIdOrQuery && !wantsList)
      ? 'approve'
      : 'list_pending';
    return {
      toolName: 'reviewSyndicateApplications',
      args: {
        action,
        applicationIdOrQuery: targetIdOrQuery,
      },
    };
  }

  // 2. Syndicate Submitted Tasks / Assignments
  if (
    lower.includes('syndicate task') ||
    lower.includes('syndicate submission') ||
    lower.includes('syndicate proof') ||
    lower.includes('syndicate assignment') ||
    (lower.includes('syndicate') && (lower.includes('confirm') || lower.includes('submit') || lower.includes('review')))
  ) {
    const action = wantsReject
      ? 'reject'
      : (wantsApprove && targetIdOrQuery && !wantsList)
      ? 'approve'
      : 'list_pending';
    return {
      toolName: 'reviewSyndicateSubmissions',
      args: {
        action,
        assignmentIdOrQuery: targetIdOrQuery,
      },
    };
  }

  // 3. Community Credit Tasks / Submitted Task Proofs
  if (
    lower.includes('submitted task') ||
    lower.includes('task proof') ||
    lower.includes('task submission') ||
    lower.includes('credit task') ||
    (lower.includes('confirm') && lower.includes('task')) ||
    (lower.includes('approve') && lower.includes('task')) ||
    (lower.includes('review') && lower.includes('task'))
  ) {
    const action = wantsReject
      ? 'reject'
      : (wantsApprove && targetIdOrQuery && !wantsList)
      ? 'approve'
      : 'list_pending';
    return {
      toolName: 'reviewSubmittedCreditTasks',
      args: {
        action,
        submissionIdOrQuery: targetIdOrQuery,
      },
    };
  }

  // 4. Business Verification
  if (
    lower.includes('verify business') ||
    lower.includes('business verification') ||
    lower.includes('verify user') ||
    lower.includes('cac') ||
    lower.includes('nin') ||
    (lower.includes('verif') && (lower.includes('business') || lower.includes('store') || lower.includes('merchant')))
  ) {
    const action = wantsReject
      ? 'reject'
      : (wantsApprove && targetIdOrQuery && !wantsList)
      ? 'approve'
      : 'list_pending';
    return {
      toolName: 'verifyBusinessOrReview',
      args: {
        action,
        recordIdOrQuery: targetIdOrQuery,
      },
    };
  }

  // 5. Banner Advert Creation & Admin Ad Moderation
  if (
    lower.includes('banner') ||
    lower.includes('advert') ||
    lower.includes('ad campaign') ||
    (lower.includes('ads') && (wantsList || wantsApprove || wantsReject || lower.includes('pause')))
  ) {
    if (lower.includes('create') || lower.includes('make') || lower.includes('launch') || lower.includes('generate') || lower.includes('publish')) {
      const title = trimmed
        .replace(/^(can you |please |vixora |create |make |launch |generate |publish |a |an |new |admin |banner |advert |ad |for )+/i, '')
        .trim();
      return {
        toolName: 'manageBannerAdvertsAdmin',
        args: {
          action: 'create',
          title: title.length >= 2 ? title : 'GGD Official Spotlight Banner',
          format: lower.includes('square') ? 'banner_square' : 'banner_landscape',
          themeColor: lower.includes('purple') ? 'purple' : lower.includes('emerald') ? 'emerald' : lower.includes('gold') ? 'gold' : 'orange',
        },
      };
    }

    const action = lower.includes('pause')
      ? 'pause'
      : wantsReject
      ? 'reject'
      : (wantsApprove && targetIdOrQuery && !wantsList)
      ? 'approve'
      : 'list_pending';
    return {
      toolName: 'manageBannerAdvertsAdmin',
      args: {
        action,
        adIdOrQuery: targetIdOrQuery,
      },
    };
  }

  // 6. Withdrawals, Credits & Activation Fee Overrides
  if (
    lower.includes('withdrawal') ||
    lower.includes('payout request') ||
    lower.includes('activate user') ||
    lower.includes('grant credit') ||
    lower.includes('add credit') ||
    lower.includes('find user') ||
    lower.includes('lookup user') ||
    lower.includes('search user')
  ) {
    if (lower.includes('withdrawal') || lower.includes('payout request')) {
      return {
        toolName: 'manageUsersAndWithdrawalsAdmin',
        args: {
          action: wantsReject ? 'reject_withdrawal' : (wantsApprove && targetIdOrQuery ? 'approve_withdrawal' : 'list_withdrawals'),
          targetIdOrQuery,
        },
      };
    }
    if (lower.includes('activate')) {
      return {
        toolName: 'manageUsersAndWithdrawalsAdmin',
        args: { action: 'activate_user', targetIdOrQuery },
      };
    }
    if (lower.includes('credit')) {
      const amtMatch = trimmed.match(/(\d[\d,]*)/);
      const amount = amtMatch ? parseInt(amtMatch[1].replace(/,/g, ''), 10) : 200;
      return {
        toolName: 'manageUsersAndWithdrawalsAdmin',
        args: { action: 'grant_credits', targetIdOrQuery, amount },
      };
    }
    return {
      toolName: 'manageUsersAndWithdrawalsAdmin',
      args: { action: 'search_users', targetIdOrQuery },
    };
  }

  // 7. Navigate Admin Section
  if (lower.startsWith('open ') || lower.startsWith('go to ') || lower.includes('navigate to')) {
    const sectionMap: Array<[string, string]> = [
      ['verification', 'verification'],
      ['syndicate', 'syndicate'],
      ['task proof', 'task-proofs'],
      ['activation', 'activation-fee'],
      ['banner', 'ads'],
      ['ads', 'ads'],
      ['user', 'users'],
      ['analytics', 'analytics'],
      ['setting', 'settings'],
      ['toggle', 'features'],
      ['redeem', 'airtime'],
    ];
    for (const [kw, section] of sectionMap) {
      if (lower.includes(kw)) {
        return {
          toolName: 'navigateAdminSection',
          args: { section },
        };
      }
    }
  }

  // 8. Admin Platform Overview / Queues Summary
  if (
    lower.includes('overview') ||
    lower.includes('summary') ||
    lower.includes('audit') ||
    lower.includes('status') ||
    lower.includes('dashboard') ||
    lower.includes('what is pending') ||
    lower.includes('pending items')
  ) {
    return {
      toolName: 'getAdminPlatformOverview',
      args: {},
    };
  }

  return null;
}
