import { supabase } from "@/integrations/supabase/client";
import { db, ensureFirebaseAuth, handleFirestoreError, OperationType } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

export const ADMIN_PORTAL_FIRESTORE_USER_ID = "admin_portal";
const KNOWN_ADMIN_EMAILS = [
  "goodgiftdigital@gmail.com",
  "accessa787@gmail.com",
  "bethelincovibetv@gmail.com",
];

export type SyndicateAdminNavTab =
  | "overview"
  | "campaigns"
  | "members"
  | "participation"
  | "proofs"
  | "payouts"
  | "verification"
  | "notifications"
  | "audit"
  | "settings";

export type AdminNotificationCategory =
  | "support_ticket"
  | "support_chat"
  | "syndicate_approval"
  | "syndicate_payout"
  | "syndicate_update"
  | "ad_approval"
  | "verification_review"
  | "task_proof"
  | "co_owner"
  | "redemption"
  | "contact_gain"
  | "system_alert";

export interface AdminPortalNotification {
  id: string;
  event_key?: string;
  source: "supabase" | "firestore" | "merged";
  supabaseId?: string;
  firestoreId?: string;
  title: string;
  summary: string;
  category: AdminNotificationCategory;
  severity: "normal" | "urgent";
  is_read: boolean;
  created_at: string;
  link_url: string;
  nav_target: string;
  action_label: string;
  actor_name?: string;
  actor_email?: string;
  user_id?: string;
  ticket_id?: string;
  entity_id?: string;
}

export interface ParsedAdminDestination {
  section: string;
  tab?: string;
  userId?: string;
  ticketId?: string;
  id?: string;
  taskId?: string;
}

export interface NotifyAdminApprovalParams {
  title: string;
  message: string;
  type?: string;
  tab?: SyndicateAdminNavTab | string;
  linkUrl?: string;
}

export interface NotifyAdminSystemUpdateParams {
  title: string;
  summary: string;
  category: AdminNotificationCategory;
  section: string;
  tab?: string;
  itemId?: string;
  userId?: string;
  ticketId?: string;
  taskId?: string;
  actionLabel?: string;
  linkUrl?: string;
  navTarget?: string;
  urgent?: boolean;
  actorName?: string;
  actorEmail?: string;
  eventKey?: string;
}

const DEFAULT_ACTION_LABELS: Record<AdminNotificationCategory, string> = {
  support_ticket: "Open Ticket",
  support_chat: "Open Support Chat",
  syndicate_approval: "Review Application",
  syndicate_payout: "Process Payout",
  syndicate_update: "View Syndicate",
  ad_approval: "Review Ad",
  verification_review: "Review Verification",
  task_proof: "Review Proof",
  co_owner: "Review Co-Owner",
  redemption: "View Redemptions",
  contact_gain: "Review Contact Proof",
  system_alert: "Inspect Update",
};

function sanitizeMax(str: string | undefined | null, max: number): string {
  const clean = (str || "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3)}...`;
}

export function buildAdminActionLink(params: {
  section: string;
  tab?: string;
  itemId?: string;
  userId?: string;
  ticketId?: string;
  taskId?: string;
}): string {
  const search = new URLSearchParams();
  search.set("section", params.section || "admin-alerts");
  if (params.tab) search.set("tab", params.tab);
  if (params.userId) search.set("userId", params.userId);
  if (params.ticketId) search.set("ticketId", params.ticketId);
  if (params.itemId) search.set("id", params.itemId);
  if (params.taskId) search.set("taskId", params.taskId);
  return `/admin?${search.toString()}`;
}

export function parseAdminNotificationLink(
  linkUrl?: string | null,
  navTarget?: string | null
): ParsedAdminDestination {
  const cleanLink = (linkUrl || "").trim();
  const cleanNav = (navTarget || "").trim();

  if (cleanLink) {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://ggd.local";
      const url = new URL(cleanLink, origin);
      const sectionParam = url.searchParams.get("section");
      const tabParam = url.searchParams.get("tab") || undefined;
      const userIdParam = url.searchParams.get("userId") || undefined;
      const ticketIdParam = url.searchParams.get("ticketId") || undefined;
      const idParam = url.searchParams.get("id") || undefined;
      const taskIdParam = url.searchParams.get("taskId") || undefined;

      // Support legacy URLs like /admin?tab=chat&userId=...
      const resolvedSection =
        sectionParam ||
        (tabParam === "chat" ? "chat" : undefined) ||
        (url.pathname.startsWith("/admin") ? "admin-alerts" : "admin-alerts");

      return {
        section: resolvedSection,
        tab: sectionParam ? tabParam : tabParam === "chat" ? undefined : tabParam,
        userId: userIdParam,
        ticketId: ticketIdParam,
        id: idParam,
        taskId: taskIdParam,
      };
    } catch {
      // Fallback below
    }
  }

  if (cleanNav.startsWith("admin:")) {
    const parts = cleanNav.split(":");
    return {
      section: parts[1] || "admin-alerts",
      tab: parts[2] || undefined,
      id: parts[3] || undefined,
    };
  }

  return { section: "admin-alerts" };
}

function inferCategoryFromNotification(raw: any): AdminNotificationCategory {
  const cat = String(raw?.category || "").toLowerCase();
  if (
    cat === "support_ticket" ||
    cat === "support_chat" ||
    cat === "syndicate_approval" ||
    cat === "syndicate_payout" ||
    cat === "syndicate_update" ||
    cat === "ad_approval" ||
    cat === "verification_review" ||
    cat === "task_proof" ||
    cat === "co_owner" ||
    cat === "redemption" ||
    cat === "contact_gain" ||
    cat === "system_alert"
  ) {
    return cat as AdminNotificationCategory;
  }

  const blob = `${raw?.type || ""} ${raw?.title || ""} ${raw?.message || raw?.body || ""} ${raw?.link_url || raw?.url || ""}`.toLowerCase();

  if (blob.includes("support ticket") || blob.includes("ticketid=") || blob.includes("ticket:")) {
    return "support_ticket";
  }
  if (blob.includes("section=chat") || blob.includes("tab=chat") || blob.includes("support message") || blob.includes("voice support")) {
    return "support_chat";
  }
  if (blob.includes("payout") || blob.includes("withdrawal") || blob.includes("tab=withdrawals")) {
    return "syndicate_payout";
  }
  if (blob.includes("banner ad") || blob.includes("section=ads")) {
    return "ad_approval";
  }
  if (blob.includes("verification") && blob.includes("section=verification")) {
    return "verification_review";
  }
  if (blob.includes("task proof") || blob.includes("section=task-proofs")) {
    return "task_proof";
  }
  if (blob.includes("co-owner") || blob.includes("co_owner") || blob.includes("section=coowners")) {
    return "co_owner";
  }
  if (blob.includes("redemption") || blob.includes("airtime") || blob.includes("section=airtime")) {
    return "redemption";
  }
  if (blob.includes("contact gain") || blob.includes("section=contact-gain")) {
    return "contact_gain";
  }
  if (blob.includes("syndicate") && (blob.includes("application") || blob.includes("bank") || blob.includes("approval"))) {
    return "syndicate_approval";
  }
  if (blob.includes("syndicate")) {
    return "syndicate_update";
  }
  return "system_alert";
}

function isAdminScopedSupabaseNotification(n: any): boolean {
  if (!n) return false;
  const link = String(n.link_url || "");
  const nav = String(n.nav_target || "");
  const type = String(n.type || "").toLowerCase();

  if (link.startsWith("/admin") || nav.startsWith("admin:")) return true;
  if (
    type === "support_ticket" ||
    type === "support_chat" ||
    type === "syndicate_approval" ||
    type === "syndicate_payout" ||
    type === "syndicate_update" ||
    type === "ad_approval" ||
    type === "verification_review" ||
    type === "task_proof" ||
    type === "co_owner" ||
    type === "co_owner_upgrade" ||
    type === "admin_alert"
  ) {
    return true;
  }
  return false;
}

function mapSupabaseToAdminPortalNotification(row: any): AdminPortalNotification {
  const category = inferCategoryFromNotification(row);
  const parsed = parseAdminNotificationLink(row.link_url, row.nav_target);
  const linkUrl =
    row.link_url && String(row.link_url).startsWith("/admin")
      ? row.link_url
      : buildAdminActionLink({
          section: parsed.section,
          tab: parsed.tab,
          itemId: parsed.id,
          userId: parsed.userId,
          ticketId: parsed.ticketId,
          taskId: parsed.taskId,
        });

  return {
    id: `sb_${row.id}`,
    supabaseId: row.id,
    source: "supabase",
    title: row.title || "System Update",
    summary: row.message || row.title || "",
    category,
    severity:
      category === "support_ticket" ||
      category === "syndicate_payout" ||
      String(row.type || "").includes("urgent")
        ? "urgent"
        : "normal",
    is_read: Boolean(row.is_read),
    created_at: row.created_at || new Date().toISOString(),
    link_url: linkUrl,
    nav_target: row.nav_target || `admin:${parsed.section}${parsed.tab ? `:${parsed.tab}` : ""}`,
    action_label: DEFAULT_ACTION_LABELS[category],
    user_id: parsed.userId,
    ticket_id: parsed.ticketId,
    entity_id: parsed.id || parsed.taskId,
  };
}

function mapFirestoreToAdminPortalNotification(docId: string, data: any): AdminPortalNotification {
  const category = inferCategoryFromNotification(data);
  const linkUrl =
    data.url && String(data.url).startsWith("/admin")
      ? data.url
      : buildAdminActionLink({
          section: "admin-alerts",
        });
  const parsed = parseAdminNotificationLink(linkUrl, data.navTarget);

  return {
    id: `fs_${docId}`,
    firestoreId: docId,
    event_key: data.eventKey || undefined,
    source: "firestore",
    title: data.title || "System Update",
    summary: data.body || data.message || data.title || "",
    category,
    severity: data.severity === "urgent" ? "urgent" : "normal",
    is_read: Boolean(data.isRead),
    created_at: data.createdAt || new Date().toISOString(),
    link_url: linkUrl,
    nav_target: data.navTarget || `admin:${parsed.section}${parsed.tab ? `:${parsed.tab}` : ""}`,
    action_label: data.actionLabel || DEFAULT_ACTION_LABELS[category],
    actor_name: data.actorName || undefined,
    actor_email: data.actorEmail || undefined,
    user_id: data.targetUserId || parsed.userId,
    ticket_id: data.ticketId || parsed.ticketId,
    entity_id: data.entityId || parsed.id || parsed.taskId,
  };
}

function mergeAdminNotifications(
  supabaseList: AdminPortalNotification[],
  firestoreList: AdminPortalNotification[]
): AdminPortalNotification[] {
  const bySignature = new Map<string, AdminPortalNotification>();

  const buildSignature = (n: AdminPortalNotification) => {
    const bucket = Math.floor(new Date(n.created_at || 0).getTime() / 60000);
    const normTitle = n.title.toLowerCase().trim();
    const normLink = n.link_url.toLowerCase().trim();
    return n.event_key || `${normTitle}::${normLink}::${bucket}`;
  };

  for (const fsItem of firestoreList) {
    bySignature.set(buildSignature(fsItem), fsItem);
  }

  for (const sbItem of supabaseList) {
    const sig = buildSignature(sbItem);
    const existing = bySignature.get(sig);
    if (existing) {
      bySignature.set(sig, {
        ...existing,
        ...sbItem,
        id: sbItem.supabaseId ? `merged_${sbItem.supabaseId}` : existing.id,
        source: "merged",
        supabaseId: sbItem.supabaseId,
        firestoreId: existing.firestoreId,
        action_label: existing.action_label || sbItem.action_label,
        actor_name: existing.actor_name || sbItem.actor_name,
        actor_email: existing.actor_email || sbItem.actor_email,
        ticket_id: existing.ticket_id || sbItem.ticket_id,
        entity_id: existing.entity_id || sbItem.entity_id,
        user_id: existing.user_id || sbItem.user_id,
        // Read if either store marked it read, or follow Supabase if both exist
        is_read: sbItem.is_read || existing.is_read,
      });
    } else {
      bySignature.set(sig, sbItem);
    }
  }

  return Array.from(bySignature.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function resolveAllAdminUserIds(): Promise<string[]> {
  const adminIds = new Set<string>();

  try {
    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase
        .from("profiles")
        .select("user_id")
        .in("email", KNOWN_ADMIN_EMAILS),
    ]);

    (rolesRes.data || []).forEach((r: any) => {
      if (r?.user_id) adminIds.add(r.user_id);
    });

    (profilesRes.data || []).forEach((p: any) => {
      if (p?.user_id) adminIds.add(p.user_id);
    });
  } catch (err) {
    console.warn("Notice resolving admin user IDs:", err);
  }

  return Array.from(adminIds);
}

/**
 * Primary helper for dispatching real-time Admin Portal update notifications
 * across Firestore, Supabase, and live broadcast channels with clear summary,
 * timestamp, unread state, and direct one-click destination link.
 */
export async function notifyAdminsSystemUpdate(
  params: NotifyAdminSystemUpdateParams
): Promise<boolean> {
  const createdAt = new Date().toISOString();
  const linkUrl =
    params.linkUrl ||
    buildAdminActionLink({
      section: params.section,
      tab: params.tab,
      itemId: params.itemId,
      userId: params.userId,
      ticketId: params.ticketId,
      taskId: params.taskId,
    });
  const navTarget =
    params.navTarget ||
    `admin:${params.section}${params.tab ? `:${params.tab}` : ""}${
      params.itemId ? `:${params.itemId}` : ""
    }`;
  const actionLabel = params.actionLabel || DEFAULT_ACTION_LABELS[params.category];
  const eventKey =
    params.eventKey ||
    `${params.category}_${params.itemId || params.ticketId || params.userId || Date.now()}_${Date.now()}`;
  const title = sanitizeMax(params.title, 145);
  const summary = sanitizeMax(params.summary, 950);

  let anySuccess = false;

  // 1. Write to Firestore (`notifications` collection with userId = 'admin_portal')
  if (db) {
    try {
      await ensureFirebaseAuth();
      const blueprintType =
        params.category === "support_ticket" || params.category === "support_chat"
          ? "chat"
          : params.category.startsWith("syndicate")
          ? "syndicate"
          : "system";

      await addDoc(collection(db, "notifications"), {
        userId: ADMIN_PORTAL_FIRESTORE_USER_ID,
        title,
        body: summary,
        url: sanitizeMax(linkUrl, 490),
        type: blueprintType,
        category: params.category,
        navTarget,
        actionLabel,
        targetUserId: params.userId || null,
        ticketId: params.ticketId || null,
        entityId: params.itemId || params.taskId || null,
        actorName: params.actorName || null,
        actorEmail: params.actorEmail || null,
        severity: params.urgent ? "urgent" : "normal",
        eventKey,
        isRead: false,
        createdAt,
      });
      anySuccess = true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "notifications");
    }
  }

  // 2. Write to Supabase `notifications` table for every authorized Admin
  try {
    const adminIds = await resolveAllAdminUserIds();
    if (adminIds.length > 0) {
      const rows = adminIds.map((adminId) => ({
        user_id: adminId,
        title,
        message: summary,
        type: params.category,
        nav_target: navTarget,
        link_url: linkUrl,
        is_read: false,
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (!error) {
        anySuccess = true;
      } else {
        console.warn("Supabase admin notification insert note:", error.message);
      }
    }
  } catch (err) {
    console.warn("Failed inserting Supabase admin notifications:", err);
  }

  // 3. Dispatch real-time in-portal broadcast so open Admin Portals refresh instantly
  try {
    const alertChannel = supabase.channel("admin-portal-alerts");
    alertChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        alertChannel
          .send({
            type: "broadcast",
            event: "admin-system-update",
            payload: {
              id: `live_${eventKey}`,
              event_key: eventKey,
              source: "firestore",
              title,
              summary,
              category: params.category,
              severity: params.urgent ? "urgent" : "normal",
              is_read: false,
              created_at: createdAt,
              link_url: linkUrl,
              nav_target: navTarget,
              action_label: actionLabel,
              actor_name: params.actorName,
              actor_email: params.actorEmail,
              user_id: params.userId,
              ticket_id: params.ticketId,
              entity_id: params.itemId || params.taskId,
            } satisfies AdminPortalNotification,
          })
          .finally(() => {
            setTimeout(() => {
              supabase.removeChannel(alertChannel);
            }, 500);
          });
      }
    });
  } catch {
    // Non-blocking broadcast
  }

  return anySuccess;
}

/**
 * Legacy-compatible helper for Syndicate & approval alerts.
 * Routes cleanly into notifyAdminsSystemUpdate so every approval alert gets
 * summary, timestamp, unread state, and direct one-click Admin Portal routing.
 */
export async function notifyAdminsOfApprovalRequired({
  title,
  message,
  type = "syndicate_approval",
  tab = "applications",
  linkUrl,
}: NotifyAdminApprovalParams): Promise<boolean> {
  const mappedTab =
    tab === "verification"
      ? "applications"
      : tab === "members"
      ? "syndicates"
      : tab === "payouts"
      ? "withdrawals"
      : tab;

  const category: AdminNotificationCategory =
    type === "syndicate_payout" || mappedTab === "withdrawals"
      ? "syndicate_payout"
      : type === "syndicate_update"
      ? "syndicate_update"
      : "syndicate_approval";

  return notifyAdminsSystemUpdate({
    title,
    summary: message,
    category,
    section: "syndicate",
    tab: mappedTab,
    linkUrl:
      linkUrl && !linkUrl.includes("tab=verification")
        ? linkUrl
        : buildAdminActionLink({ section: "syndicate", tab: mappedTab }),
    urgent: category === "syndicate_payout" || category === "syndicate_approval",
  });
}

/**
 * Fetches current Admin Portal notifications from both Supabase and Firestore.
 */
export async function fetchAdminPortalNotifications(
  adminUserId?: string
): Promise<AdminPortalNotification[]> {
  let sbNotifs: AdminPortalNotification[] = [];
  let fsNotifs: AdminPortalNotification[] = [];

  if (adminUserId) {
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", adminUserId)
        .order("created_at", { ascending: false })
        .limit(80);

      sbNotifs = (data || [])
        .filter(isAdminScopedSupabaseNotification)
        .map(mapSupabaseToAdminPortalNotification);
    } catch (err) {
      console.warn("Supabase admin notification fetch note:", err);
    }
  }

  if (db) {
    try {
      await ensureFirebaseAuth();
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", ADMIN_PORTAL_FIRESTORE_USER_ID),
        limit(80)
      );
      const snap = await getDocs(q);
      fsNotifs = snap.docs.map((d) => mapFirestoreToAdminPortalNotification(d.id, d.data()));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "notifications");
    }
  }

  return mergeAdminNotifications(sbNotifs, fsNotifs);
}

/**
 * Subscribes in real time to Admin Portal notifications across Firestore,
 * Supabase DB changes, and broadcast alerts.
 */
export function subscribeToAdminPortalNotifications(
  adminUserId: string,
  onUpdate: (items: AdminPortalNotification[]) => void
): () => void {
  let sbRows: AdminPortalNotification[] = [];
  let fsRows: AdminPortalNotification[] = [];
  let liveBroadcastRows: AdminPortalNotification[] = [];
  let disposed = false;

  const emit = () => {
    if (disposed) return;
    const merged = mergeAdminNotifications(sbRows, [...liveBroadcastRows, ...fsRows]);
    onUpdate(merged);
  };

  const refreshSupabase = async () => {
    if (!adminUserId || disposed) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", adminUserId)
        .order("created_at", { ascending: false })
        .limit(80);
      sbRows = (data || [])
        .filter(isAdminScopedSupabaseNotification)
        .map(mapSupabaseToAdminPortalNotification);
      emit();
    } catch {
      // Ignore transient query errors
    }
  };

  void refreshSupabase();

  let unsubFirestore = () => {};
  if (db) {
    void ensureFirebaseAuth().then(() => {
      if (disposed) return;
      try {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", ADMIN_PORTAL_FIRESTORE_USER_ID),
          limit(80)
        );
        unsubFirestore = onSnapshot(
          q,
          (snap) => {
            fsRows = snap.docs.map((d) => mapFirestoreToAdminPortalNotification(d.id, d.data()));
            emit();
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, "notifications");
          }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "notifications");
      }
    });
  }

  const sbChannel = supabase
    .channel(`admin-portal-notifs-${adminUserId.slice(0, 8)}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${adminUserId}`,
      },
      () => {
        void refreshSupabase();
      }
    )
    .subscribe();

  const alertBroadcastChannel = supabase
    .channel("admin-portal-alerts")
    .on("broadcast", { event: "admin-system-update" }, (payload: any) => {
      const incoming = payload?.payload as AdminPortalNotification | undefined;
      if (!incoming) return;
      liveBroadcastRows = [
        incoming,
        ...liveBroadcastRows.filter((x) => x.event_key !== incoming.event_key),
      ].slice(0, 20);
      emit();
    })
    .subscribe();

  return () => {
    disposed = true;
    unsubFirestore();
    void supabase.removeChannel(sbChannel);
    void supabase.removeChannel(alertBroadcastChannel);
  };
}

export async function markAdminNotificationReadStatus(
  notif: AdminPortalNotification,
  isRead: boolean
): Promise<void> {
  const tasks: Promise<any>[] = [];

  if (notif.supabaseId) {
    tasks.push(
      supabase
        .from("notifications")
        .update({ is_read: isRead })
        .eq("id", notif.supabaseId) as unknown as Promise<any>
    );
  }

  if (notif.firestoreId && db) {
    tasks.push(
      ensureFirebaseAuth()
        .then(() => updateDoc(doc(db, "notifications", notif.firestoreId!), { isRead }))
        .catch((err) => handleFirestoreError(err, OperationType.UPDATE, "notifications"))
    );
  }

  await Promise.allSettled(tasks);
}

export async function markAllAdminNotificationsRead(
  notifications: AdminPortalNotification[],
  adminUserId?: string
): Promise<void> {
  const tasks: Promise<any>[] = [];
  const unreadSupabaseIds = notifications
    .filter((n) => !n.is_read && n.supabaseId)
    .map((n) => n.supabaseId!);

  if (unreadSupabaseIds.length > 0) {
    tasks.push(
      supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadSupabaseIds) as unknown as Promise<any>
    );
  } else if (adminUserId) {
    tasks.push(
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", adminUserId)
        .eq("is_read", false)
        .like("link_url", "/admin%") as unknown as Promise<any>
    );
  }

  const unreadFirestoreIds = notifications
    .filter((n) => !n.is_read && n.firestoreId)
    .map((n) => n.firestoreId!);

  if (unreadFirestoreIds.length > 0 && db) {
    tasks.push(
      ensureFirebaseAuth()
        .then(async () => {
          const batch = writeBatch(db);
          unreadFirestoreIds.slice(0, 400).forEach((fid) => {
            batch.update(doc(db, "notifications", fid), { isRead: true });
          });
          await batch.commit();
        })
        .catch((err) => handleFirestoreError(err, OperationType.UPDATE, "notifications"))
    );
  }

  await Promise.allSettled(tasks);
}

export async function deleteAdminNotification(notif: AdminPortalNotification): Promise<void> {
  const tasks: Promise<any>[] = [];

  if (notif.supabaseId) {
    tasks.push(
      supabase
        .from("notifications")
        .delete()
        .eq("id", notif.supabaseId) as unknown as Promise<any>
    );
  }

  if (notif.firestoreId && db) {
    tasks.push(
      ensureFirebaseAuth()
        .then(() => deleteDoc(doc(db, "notifications", notif.firestoreId!)))
        .catch((err) => handleFirestoreError(err, OperationType.DELETE, "notifications"))
    );
  }

  await Promise.allSettled(tasks);
}

/**
 * Notifies a specific user/member about an approval or status update
 */
export async function notifyMemberOfStatusUpdate({
  userId,
  title,
  message,
  type = "syndicate_status",
  navTarget = "syndicate",
  linkUrl,
}: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  navTarget?: string;
  linkUrl?: string;
}): Promise<boolean> {
  try {
    if (!userId) return false;
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      nav_target: navTarget,
      link_url: linkUrl || null,
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
