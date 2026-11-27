export interface CallLogLike {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleeAvatar?: string;
  status?: string;
  callType?: 'audio' | 'video' | string;
}

export interface DirectChatTarget {
  userId: string;
  name?: string;
  avatar?: string;
}

export interface NotificationLike {
  id?: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  nav_target?: string | null;
  link_url?: string | null;
}

export interface MissedCallContact {
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
}

export function resolveCallLogCounterparty(
  log: CallLogLike,
  currentUserId: string
): {
  targetId: string;
  targetName: string;
  targetAvatar?: string;
  isMissed: boolean;
  isCaller: boolean;
} {
  const isCaller = log.callerId === currentUserId;
  const targetId = isCaller ? log.calleeId : log.callerId;
  const targetName = (isCaller ? log.calleeName : log.callerName) || 'Member';
  const targetAvatar = isCaller ? log.calleeAvatar : log.callerAvatar;
  const isMissed = log.status === 'missed' || (log.status === 'rejected' && !isCaller);

  return {
    targetId,
    targetName,
    targetAvatar,
    isMissed,
    isCaller,
  };
}

export function buildDirectChatUrl(target: DirectChatTarget): string {
  const params = new URLSearchParams();
  params.set('tab', 'inbox');
  params.set('chatWith', target.userId);
  if (target.name) {
    params.set('chatName', target.name);
  }
  if (target.avatar) {
    params.set('chatAvatar', target.avatar);
  }
  return `/?${params.toString()}`;
}

export function parseDirectChatTargetFromSearch(search: string): DirectChatTarget | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const userId =
    params.get('chatWith') ||
    params.get('chat') ||
    params.get('userId') ||
    params.get('u');
  if (!userId || !userId.trim()) return null;

  return {
    userId: userId.trim(),
    name: params.get('chatName')?.trim() || undefined,
    avatar: params.get('chatAvatar')?.trim() || undefined,
  };
}

export function buildMissedCallNavTarget(contact: MissedCallContact): string {
  const params = new URLSearchParams();
  params.set('uid', contact.callerId);
  if (contact.callerName) params.set('name', contact.callerName);
  if (contact.callerAvatar) params.set('avatar', contact.callerAvatar);
  params.set('callType', contact.callType === 'video' ? 'video' : 'audio');
  return `missed_call:${params.toString()}`;
}

export function isMissedCallNotification(notification: NotificationLike | null | undefined): boolean {
  if (!notification) return false;
  const t = (notification.type || '').toLowerCase();
  const nav = (notification.nav_target || '').toLowerCase();
  const title = (notification.title || '').toLowerCase();

  return (
    t === 'missed_call' ||
    t === 'call_missed' ||
    nav.startsWith('missed_call:') ||
    nav.startsWith('call_callback:') ||
    title.includes('missed call') ||
    title.includes('missed video call') ||
    title.includes('missed audio call')
  );
}

export function extractMissedCallContact(
  notification: NotificationLike | null | undefined
): MissedCallContact | null {
  if (!notification || !isMissedCallNotification(notification)) return null;

  const nav = notification.nav_target || '';
  let callerId = '';
  let callerName = '';
  let callerAvatar: string | undefined;
  let callType: 'audio' | 'video' = 'audio';

  if (nav.startsWith('missed_call:') || nav.startsWith('call_callback:')) {
    const raw = nav.replace(/^(missed_call:|call_callback:)/, '');
    if (raw.includes('=')) {
      const params = new URLSearchParams(raw);
      callerId = params.get('uid') || params.get('callerId') || '';
      callerName = params.get('name') || '';
      callerAvatar = params.get('avatar') || undefined;
      callType = params.get('callType') === 'video' ? 'video' : 'audio';
    } else {
      const [uid, name] = raw.split('|');
      callerId = (uid || '').trim();
      callerName = (name || '').trim();
    }
  }

  if (!callerId && notification.link_url) {
    const qIdx = notification.link_url.indexOf('?');
    if (qIdx >= 0) {
      const parsed = parseDirectChatTargetFromSearch(notification.link_url.slice(qIdx));
      if (parsed) {
        callerId = parsed.userId;
        callerName = callerName || parsed.name || '';
        callerAvatar = callerAvatar || parsed.avatar;
      }
    }
  }

  if (!callerId) return null;

  if (!callerName && notification.title) {
    const m = notification.title.match(/from\s+(.+)$/i);
    if (m) callerName = m[1].trim();
  }
  if ((notification.title || '').toLowerCase().includes('video')) {
    callType = 'video';
  }

  return {
    callerId,
    callerName: callerName || 'Member',
    callerAvatar,
    callType,
  };
}

export function dispatchOpenDirectChat(target: DirectChatTarget): void {
  if (typeof window === 'undefined' || !target.userId) return;

  const targetUrl = buildDirectChatUrl(target);
  try {
    localStorage.setItem('ggd_active_tab', 'inbox');
    localStorage.setItem('ggd_pending_chat_target', JSON.stringify(target));
  } catch {}

  if (window.location.pathname !== '/') {
    window.location.assign(targetUrl);
    return;
  }

  try {
    window.history.pushState(null, '', targetUrl);
  } catch {}

  window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'inbox' }));
  window.dispatchEvent(new CustomEvent('ggd-open-chat', { detail: target }));
}
