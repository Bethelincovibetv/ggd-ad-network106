export interface ParsedTaskNotificationTarget {
  isTaskSubmission: boolean;
  taskId: string | null;
  taskTitle: string | null;
}

/**
 * Detects whether a notification relates to a task proof submission or creator task completion,
 * and extracts the taskId and/or taskTitle from nav_target, link_url, or message text.
 */
export function parseTaskSubmissionNotification(n: {
  title?: string | null;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  nav_target?: string | null;
  link_url?: string | null;
} | null | undefined): ParsedTaskNotificationTarget {
  if (!n) {
    return { isTaskSubmission: false, taskId: null, taskTitle: null };
  }

  const navTarget = (n.nav_target || '').trim();
  const linkUrl = (n.link_url || '').trim();
  const title = (n.title || '').trim();
  const message = (n.message || n.body || '').trim();
  const type = (n.type || '').trim().toLowerCase();

  let taskId: string | null = null;
  let taskTitle: string | null = null;

  if (navTarget.startsWith('task-manage:')) {
    taskId = navTarget.replace('task-manage:', '').trim() || null;
  }

  if (!taskId && linkUrl) {
    try {
      const parsed = new URL(linkUrl, typeof window !== 'undefined' ? window.location.origin : 'https://app.local');
      taskId = parsed.searchParams.get('manageTask') || parsed.searchParams.get('taskId') || null;
      if (!taskTitle) {
        taskTitle = parsed.searchParams.get('manageTaskTitle');
      }
    } catch {
      const match = linkUrl.match(/manageTask=([a-zA-Z0-9-]+)/);
      if (match) taskId = match[1];
    }
  }

  // Extract quoted task title from messages like:
  // Someone submitted proof for "Share 50% Promo". Review within 48 hours...
  const quoteMatch =
    message.match(/submitted proof for\s+"([^"]+)"/i) ||
    message.match(/completed your task\s+"([^"]+)"/i) ||
    message.match(/task\s+"([^"]+)"/i);
  if (quoteMatch && quoteMatch[1]) {
    taskTitle = quoteMatch[1].trim();
  }

  const matchesKeyword =
    type === 'task_proof_submission' ||
    type === 'task_completion_creator' ||
    navTarget.startsWith('task-manage:') ||
    navTarget === 'tasks-manage' ||
    linkUrl.includes('manageTask=') ||
    /task proof to review|new task proof|submitted proof for|new task submission/i.test(`${title} ${message}`);

  return {
    isTaskSubmission: matchesKeyword,
    taskId,
    taskTitle,
  };
}

export function buildTaskManageUrl(taskId?: string | null, taskTitle?: string | null): string {
  const params = new URLSearchParams();
  params.set('tab', 'tasks');
  params.set('taskSection', 'manage');
  if (taskId) {
    params.set('manageTask', taskId);
  } else if (taskTitle) {
    params.set('manageTaskTitle', taskTitle);
  }
  return `/?${params.toString()}`;
}

export const PENDING_MANAGE_TASK_STORAGE_KEY = 'ggd_pending_manage_task';

export function navigateToTaskManagement(
  notification: {
    title?: string | null;
    message?: string | null;
    body?: string | null;
    type?: string | null;
    nav_target?: string | null;
    link_url?: string | null;
  },
  onNavigate?: (tab: string) => void
) {
  const { taskId, taskTitle } = parseTaskSubmissionNotification(notification);

  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('ggd_active_tab', 'tasks');
    localStorage.setItem(
      PENDING_MANAGE_TASK_STORAGE_KEY,
      JSON.stringify({
        taskId: taskId || null,
        taskTitle: taskTitle || null,
        requestedAt: Date.now(),
      })
    );
  } catch {
    // Ignore storage quota errors
  }

  const targetUrl = buildTaskManageUrl(taskId, taskTitle);
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isDashboardRoute = ['/', '/index', '/dashboard', '/tasks'].includes(path);

  if (isDashboardRoute) {
    try {
      window.history.replaceState(null, '', targetUrl);
    } catch {
      // Ignore history errors
    }
    if (onNavigate) {
      onNavigate('tasks');
    } else {
      window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'tasks' }));
    }
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('ggd-manage-task', {
          detail: { taskId: taskId || null, taskTitle: taskTitle || null },
        })
      );
    }, 60);
  } else {
    window.location.assign(targetUrl);
  }
}
