import { supabase } from "@/integrations/supabase/client";

export type SyndicateAdminNavTab = 
  | 'overview' 
  | 'campaigns' 
  | 'members' 
  | 'participation' 
  | 'proofs' 
  | 'payouts' 
  | 'verification' 
  | 'notifications' 
  | 'audit' 
  | 'settings';

export interface NotifyAdminApprovalParams {
  title: string;
  message: string;
  type?: string;
  tab?: SyndicateAdminNavTab;
  linkUrl?: string;
}

/**
 * Creates real database notifications for all authorized Admins (user_roles.role = 'admin')
 * to alert them to approvals, bank changes, new applications, or proof submissions.
 */
export async function notifyAdminsOfApprovalRequired({
  title,
  message,
  type = 'syndicate_approval',
  tab = 'verification',
  linkUrl,
}: NotifyAdminApprovalParams): Promise<boolean> {
  try {
    const { data: adminRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (roleError || !adminRoles || adminRoles.length === 0) {
      console.warn("No admin users found to notify");
      return false;
    }

    const adminIds = [...new Set(adminRoles.map(r => r.user_id))];
    const navTarget = `admin:syndicate:${tab}`;
    const targetLink = linkUrl || `/admin?section=syndicate&tab=${tab}`;

    const notifications = adminIds.map(adminId => ({
      user_id: adminId,
      title,
      message,
      type,
      nav_target: navTarget,
      link_url: targetLink,
      is_read: false,
    }));

    const { error: notifErr } = await supabase.from('notifications').insert(notifications);
    if (notifErr) {
      console.warn("Failed to insert admin approval notification:", notifErr);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in notifyAdminsOfApprovalRequired:", err);
    return false;
  }
}

/**
 * Notifies a specific user/member about an approval or status update
 */
export async function notifyMemberOfStatusUpdate({
  userId,
  title,
  message,
  type = 'syndicate_status',
  navTarget = 'syndicate',
}: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  navTarget?: string;
}): Promise<boolean> {
  try {
    if (!userId) return false;
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      nav_target: navTarget,
      is_read: false,
    });
    if (error) {
      console.warn("Failed to notify member:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error in notifyMemberOfStatusUpdate:", err);
    return false;
  }
}
