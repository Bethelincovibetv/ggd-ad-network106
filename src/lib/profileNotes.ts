export type ProfileNotePriority = 'high' | 'medium' | 'low';
export type ProfileNoteStatus = 'planned' | 'in_progress' | 'implemented';
export type ProfileSectionId =
  | 'identity'
  | 'business'
  | 'creator'
  | 'push'
  | 'security'
  | 'referral'
  | 'general';

export interface ProfileImplementationNote {
  id: string;
  title: string;
  details: string;
  section: ProfileSectionId;
  priority: ProfileNotePriority;
  status: ProfileNoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileExistingCapability {
  id: string;
  section: ProfileSectionId;
  tabTarget: 'info' | 'push' | 'creator' | 'email' | 'password';
  anchorId: string;
  label: string;
  backing: string;
  summary: string;
}

export const PROFILE_NOTES_STORAGE_KEY = 'ggd_profile_implementation_notes_v1';

export const PROFILE_SECTION_LABELS: Record<ProfileSectionId, string> = {
  identity: 'Identity & Unified Avatar',
  business: 'Business & SEO Slug',
  creator: 'Creator & AI Chat',
  push: 'Web Push Notifications',
  security: 'Email & Password',
  referral: 'Referral & Activation',
  general: 'General Profile UX',
};

export const PROFILE_EXISTING_CAPABILITIES: readonly ProfileExistingCapability[] = [
  {
    id: 'cap_identity',
    section: 'identity',
    tabTarget: 'info',
    anchorId: 'profile-identity',
    label: 'Identity & Unified Avatar Sync',
    backing: 'Supabase profiles + business_profiles + syndicate_profiles',
    summary: 'Avatar upload mirrors automatically across user profile, business logo, and syndicate card.',
  },
  {
    id: 'cap_business',
    section: 'business',
    tabTarget: 'info',
    anchorId: 'profile-business',
    label: 'Business Profile & Storefront Slug',
    backing: 'Supabase profiles + business_profiles',
    summary: 'Display name, business bio, category, location, phone, website, and auto-generated public /b/:slug.',
  },
  {
    id: 'cap_referral',
    section: 'referral',
    tabTarget: 'info',
    anchorId: 'profile-referral',
    label: 'Referral Link & Roles Overview',
    backing: 'profiles + user_roles + task_wallets',
    summary: 'Displays GGD credit balance, Naira wallet, active roles, and one-tap referral invite copy.',
  },
  {
    id: 'cap_push',
    section: 'push',
    tabTarget: 'push',
    anchorId: 'profile-push',
    label: 'Web Push Notification Alerts',
    backing: 'pushNotificationService + profiles',
    summary: 'Manage background browser push alerts for task approvals, ad status, DMs, and calls.',
  },
  {
    id: 'cap_creator',
    section: 'creator',
    tabTarget: 'creator',
    anchorId: 'profile-creator',
    label: 'Creator & Vixora AI Chat Model Sync',
    backing: 'localStorage + /api/vixora',
    summary: 'Select preferred Vixora free-tier Gemini/Gemma chat model, distribution channels, and niche.',
  },
  {
    id: 'cap_security',
    section: 'security',
    tabTarget: 'password',
    anchorId: 'profile-security',
    label: 'Email Confirmation & Password Update',
    backing: 'Supabase Auth',
    summary: 'Verify password changes with current password confirmation or initiate new email verification.',
  },
] as const;

export const DEFAULT_PROFILE_IMPLEMENTATION_NOTES: ProfileImplementationNote[] = [
  {
    id: 'note_bank_payout',
    title: 'Saved Bank Payout Details & Default Withdrawal Account',
    details: 'Store verified bank name, account number, and account name on profiles for 1-click task wallet withdrawals.',
    section: 'business',
    priority: 'high',
    status: 'planned',
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'note_completion_meter',
    title: 'Profile Completion Progress & KYC Readiness Checklist',
    details: 'Show exact percentage completion across avatar, bio, WhatsApp number, and NIN/CAC business verification.',
    section: 'identity',
    priority: 'medium',
    status: 'planned',
    createdAt: '2026-11-20T10:05:00.000Z',
    updatedAt: '2026-11-20T10:05:00.000Z',
  },
  {
    id: 'note_ai_model_sync',
    title: 'Default Vixora AI Chat Model Selector Sync',
    details: 'Persist user-selected free-tier Gemini/Gemma model (defaulting to gemini-3.8-flash) inside Creator & AI Chat settings.',
    section: 'creator',
    priority: 'high',
    status: 'implemented',
    createdAt: '2026-11-20T10:10:00.000Z',
    updatedAt: '2026-11-20T10:10:00.000Z',
  },
];

function getStorageKey(userId?: string | null): string {
  return userId ? `${PROFILE_NOTES_STORAGE_KEY}_${userId}` : PROFILE_NOTES_STORAGE_KEY;
}

export function loadProfileNotes(userId?: string | null): ProfileImplementationNote[] {
  if (typeof window === 'undefined') return [...DEFAULT_PROFILE_IMPLEMENTATION_NOTES];
  try {
    const raw = window.localStorage?.getItem(getStorageKey(userId));
    if (!raw) return [...DEFAULT_PROFILE_IMPLEMENTATION_NOTES];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [...DEFAULT_PROFILE_IMPLEMENTATION_NOTES];
  } catch {
    return [...DEFAULT_PROFILE_IMPLEMENTATION_NOTES];
  }
}

export function saveProfileNotes(notes: ProfileImplementationNote[], userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(getStorageKey(userId), JSON.stringify(notes));
  } catch {
    // Non-blocking storage failure
  }
}

export function addProfileNote(
  notes: ProfileImplementationNote[],
  input: {
    title: string;
    details?: string;
    section?: ProfileSectionId;
    priority?: ProfileNotePriority;
  }
): ProfileImplementationNote[] {
  const title = input.title.trim();
  if (!title) return notes;
  const now = new Date().toISOString();
  const next: ProfileImplementationNote = {
    id: `pnote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: title.slice(0, 120),
    details: (input.details || '').trim().slice(0, 500),
    section: input.section || 'general',
    priority: input.priority || 'medium',
    status: 'planned',
    createdAt: now,
    updatedAt: now,
  };
  return [next, ...notes];
}

export function cycleProfileNoteStatus(
  notes: ProfileImplementationNote[],
  noteId: string
): ProfileImplementationNote[] {
  const order: ProfileNoteStatus[] = ['planned', 'in_progress', 'implemented'];
  return notes.map((note) => {
    if (note.id !== noteId) return note;
    const idx = order.indexOf(note.status);
    const nextStatus = order[(idx + 1) % order.length];
    return {
      ...note,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function deleteProfileNote(
  notes: ProfileImplementationNote[],
  noteId: string
): ProfileImplementationNote[] {
  return notes.filter((note) => note.id !== noteId);
}

export function formatNotesAsMarkdown(notes: ProfileImplementationNote[]): string {
  const lines: string[] = ['# UserProfilePage.tsx Implementation Notes', ''];
  for (const n of notes) {
    const mark = n.status === 'implemented' ? 'x' : n.status === 'in_progress' ? '~' : ' ';
    const secLabel = PROFILE_SECTION_LABELS[n.section] || n.section;
    lines.push(`- [${mark}] (${n.priority.toUpperCase()}) [${secLabel}] ${n.title}`);
    if (n.details) {
      lines.push(`  - ${n.details}`);
    }
  }
  return lines.join('\n');
}
