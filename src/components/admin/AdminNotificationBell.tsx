import React, { useMemo, useState } from "react";
import {
  Bell,
  Ticket,
  MessageSquare,
  Megaphone,
  ShieldCheck,
  Wallet,
  Briefcase,
  ClipboardList,
  Crown,
  Smartphone,
  Users,
  Check,
  MailOpen,
  Mail,
  Trash2,
  ArrowRight,
  Minimize2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminNotificationCategory,
  AdminPortalNotification,
} from "@/services/adminNotificationHelper";

interface AdminNotificationBellProps {
  notifications: AdminPortalNotification[];
  onOpenNotification: (notif: AdminPortalNotification) => void;
  onToggleRead: (notif: AdminPortalNotification) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (notif: AdminPortalNotification) => void;
  onViewAllFeed: () => void;
}

type BellFilter = "all" | "unread" | "tickets" | "approvals" | "system";

function formatRelativeTimestamp(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatExactTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCategoryMeta(category: AdminNotificationCategory) {
  switch (category) {
    case "support_ticket":
      return {
        label: "Support Ticket",
        icon: Ticket,
        iconBox: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
        actionCls: "bg-orange-600 hover:bg-orange-700 text-white",
      };
    case "support_chat":
      return {
        label: "Support Chat",
        icon: MessageSquare,
        iconBox: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        actionCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
      };
    case "syndicate_payout":
      return {
        label: "Payout Request",
        icon: Wallet,
        iconBox: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
        actionCls: "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white",
      };
    case "syndicate_approval":
    case "syndicate_update":
      return {
        label: "Syndicate",
        icon: Briefcase,
        iconBox: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
        actionCls: "bg-purple-600 hover:bg-purple-700 text-white",
      };
    case "ad_approval":
      return {
        label: "Banner Ad Review",
        icon: Megaphone,
        iconBox: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        actionCls: "bg-amber-600 hover:bg-amber-700 text-white",
      };
    case "verification_review":
      return {
        label: "Identity & CAC Review",
        icon: ShieldCheck,
        iconBox: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
        actionCls: "bg-teal-600 hover:bg-teal-700 text-white",
      };
    case "task_proof":
      return {
        label: "Task Proof",
        icon: ClipboardList,
        iconBox: "bg-green-500/15 text-green-600 dark:text-green-400",
        actionCls: "bg-green-600 hover:bg-green-700 text-white",
      };
    case "co_owner":
      return {
        label: "Co-Owner Application",
        icon: Crown,
        iconBox: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
        actionCls: "bg-amber-600 hover:bg-amber-700 text-white",
      };
    case "redemption":
      return {
        label: "Airtime Redemption",
        icon: Smartphone,
        iconBox: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        actionCls: "bg-blue-600 hover:bg-blue-700 text-white",
      };
    case "contact_gain":
      return {
        label: "Contact Gain Proof",
        icon: Users,
        iconBox: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
        actionCls: "bg-indigo-600 hover:bg-indigo-700 text-white",
      };
    default:
      return {
        label: "System Update",
        icon: AlertTriangle,
        iconBox: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
        actionCls: "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white",
      };
  }
}

export const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({
  notifications,
  onOpenNotification,
  onToggleRead,
  onMarkAllRead,
  onDeleteNotification,
  onViewAllFeed,
}) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<BellFilter>("all");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const ticketCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          !n.is_read &&
          (n.category === "support_ticket" || n.category === "support_chat")
      ).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.is_read;
      if (filter === "tickets")
        return n.category === "support_ticket" || n.category === "support_chat";
      if (filter === "approvals")
        return (
          n.category === "ad_approval" ||
          n.category === "verification_review" ||
          n.category === "syndicate_approval" ||
          n.category === "syndicate_payout" ||
          n.category === "task_proof" ||
          n.category === "co_owner" ||
          n.category === "contact_gain"
        );
      if (filter === "system")
        return (
          n.category === "system_alert" ||
          n.category === "syndicate_update" ||
          n.category === "redemption"
        );
      return true;
    });
  }, [notifications, filter]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Admin notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className="relative h-11 sm:h-10 min-w-[44px] sm:min-w-[40px] px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-2 border border-border bg-card hover:bg-muted/70 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
      >
        <Bell
          className={`h-4.5 w-4.5 shrink-0 ${
            unreadCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-foreground/80"
          }`}
          strokeWidth={2.2}
        />
        <span className="hidden lg:inline text-xs font-semibold whitespace-nowrap">
          Admin Alerts
        </span>
        {unreadCount > 0 && (
          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold tabular-nums flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Admin Portal Notifications"
            className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-12 sm:w-[440px] z-50 max-h-[82vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-2 bg-card">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    Admin Updates &amp; Tickets
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-bold tabular-nums text-orange-600 dark:text-orange-400">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {ticketCount > 0
                    ? `${ticketCount} unread support ticket alert${ticketCount > 1 ? "s" : ""}`
                    : unreadCount > 0
                    ? "Actionable platform updates ready for review"
                    : "All admin notifications reviewed"}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAllRead}
                    className="h-8 px-2.5 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                  >
                    <MailOpen className="h-3.5 w-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications panel"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Segmented Filter Controls */}
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "unread", label: `Unread (${unreadCount})` },
                  { id: "tickets", label: "Tickets" },
                  { id: "approvals", label: "Approvals" },
                  { id: "system", label: "System" },
                ] as { id: BellFilter; label: string }[]
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? "bg-card text-foreground border border-border shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/70 max-h-[54vh]">
              {filtered.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-2">
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {filter === "unread" ? "No unread notifications" : "No notifications in this view"}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    New support tickets, ticket updates, payout requests, ad submissions, and verification reviews appear here in real time.
                  </p>
                </div>
              ) : (
                filtered.slice(0, 30).map((n) => {
                  const meta = getCategoryMeta(n.category);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 transition-colors ${
                        !n.is_read
                          ? "bg-orange-500/[0.06] dark:bg-orange-500/[0.09]"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBox}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Unboxed metadata row: state · category · timestamp */}
                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span
                                className={`font-bold shrink-0 ${
                                  !n.is_read
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {!n.is_read ? "Unread" : "Read"}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate font-medium text-foreground/80">
                                {meta.label}
                              </span>
                            </div>
                            <span
                              className="shrink-0 tabular-nums"
                              title={formatExactTimestamp(n.created_at)}
                            >
                              {formatRelativeTimestamp(n.created_at)}
                            </span>
                          </div>

                          {/* Title & Clear Summary */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              onOpenNotification(n);
                            }}
                            className="w-full text-left group focus-visible:outline-none"
                          >
                            <h4
                              className={`text-xs sm:text-sm leading-snug group-hover:underline ${
                                !n.is_read
                                  ? "font-bold text-foreground"
                                  : "font-medium text-foreground/85"
                              }`}
                            >
                              {n.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {n.summary}
                            </p>
                          </button>

                          {/* Exact Timestamp + One-Click Direct Action */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[11px] text-muted-foreground tabular-nums truncate">
                              {formatExactTimestamp(n.created_at)}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleRead(n);
                                }}
                                title={n.is_read ? "Mark as unread" : "Mark as read"}
                                aria-label={n.is_read ? "Mark as unread" : "Mark as read"}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                {n.is_read ? (
                                  <Mail className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteNotification(n);
                                }}
                                title="Delete notification"
                                aria-label="Delete notification"
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setOpen(false);
                                  onOpenNotification(n);
                                }}
                                className={`h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 whitespace-nowrap shrink-0 ${meta.actionCls}`}
                              >
                                <span>{n.action_label || "Open"}</span>
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-muted/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  onViewAllFeed();
                }}
                className="w-full h-10 rounded-xl text-xs font-semibold justify-center gap-2"
              >
                <span>Open Full Admin Alerts &amp; Ticket Feed</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminNotificationBell;
