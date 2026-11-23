import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  Inbox,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPortalNotification } from "@/services/adminNotificationHelper";
import { getCategoryMeta } from "@/components/admin/AdminNotificationBell";

interface AdminAlertsFeedProps {
  notifications: AdminPortalNotification[];
  loading?: boolean;
  onRefresh: () => void;
  onOpenNotification: (notif: AdminPortalNotification) => void;
  onToggleRead: (notif: AdminPortalNotification) => void;
  onMarkAllRead: () => void;
  onDeleteNotification: (notif: AdminPortalNotification) => void;
}

type FeedFilter = "all" | "unread" | "read" | "tickets" | "approvals" | "system";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Just now";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const AdminAlertsFeed: React.FC<AdminAlertsFeedProps> = ({
  notifications,
  loading = false,
  onRefresh,
  onOpenNotification,
  onToggleRead,
  onMarkAllRead,
  onDeleteNotification,
}) => {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read).length;
    const tickets = notifications.filter(
      (n) => n.category === "support_ticket" || n.category === "support_chat"
    ).length;
    const approvals = notifications.filter(
      (n) =>
        n.category === "ad_approval" ||
        n.category === "verification_review" ||
        n.category === "syndicate_approval" ||
        n.category === "syndicate_payout" ||
        n.category === "task_proof" ||
        n.category === "co_owner" ||
        n.category === "contact_gain"
    ).length;
    return { total: notifications.length, unread, tickets, approvals };
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notifications.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (filter === "read" && !n.is_read) return false;
      if (
        filter === "tickets" &&
        n.category !== "support_ticket" &&
        n.category !== "support_chat"
      )
        return false;
      if (
        filter === "approvals" &&
        n.category !== "ad_approval" &&
        n.category !== "verification_review" &&
        n.category !== "syndicate_approval" &&
        n.category !== "syndicate_payout" &&
        n.category !== "task_proof" &&
        n.category !== "co_owner" &&
        n.category !== "contact_gain"
      )
        return false;
      if (
        filter === "system" &&
        n.category !== "system_alert" &&
        n.category !== "syndicate_update" &&
        n.category !== "redemption"
      )
        return false;

      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.action_label.toLowerCase().includes(q) ||
        (n.actor_email || "").toLowerCase().includes(q) ||
        (n.actor_name || "").toLowerCase().includes(q)
      );
    });
  }, [notifications, filter, searchQuery]);

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Alerts</p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
            Unread Updates
          </p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
            {stats.unread}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Support Tickets &amp; Chat
          </p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
            {stats.tickets}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Approvals &amp; Payouts
          </p>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
            {stats.approvals}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket subject, user, payout, ad, or summary..."
              className="pl-9 h-11 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {stats.unread > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={onMarkAllRead}
                className="h-11 rounded-xl text-xs font-semibold gap-1.5"
              >
                <MailOpen className="h-4 w-4 text-orange-600" />
                <span>Mark all read</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-11 rounded-xl text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {(
            [
              { id: "all", label: `All (${stats.total})` },
              { id: "unread", label: `Unread (${stats.unread})` },
              { id: "tickets", label: `Tickets (${stats.tickets})` },
              { id: "approvals", label: `Approvals (${stats.approvals})` },
              { id: "system", label: "System" },
              { id: "read", label: "Read" },
            ] as { id: FeedFilter; label: string }[]
          ).map((t) => {
            const active = filter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              No matching admin alerts
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When users open or update support tickets, request payouts, submit banner ads, upload task proofs, or trigger system reviews, alerts appear here with one-click deep links.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((n) => {
              const meta = getCategoryMeta(n.category);
              const Icon = meta.icon;

              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    !n.is_read
                      ? "bg-orange-500/[0.05] dark:bg-orange-500/[0.08]"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBox}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span
                          className={`font-bold ${
                            !n.is_read
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {!n.is_read ? "Unread" : "Read"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-foreground/80">{meta.label}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTime(n.created_at)}</span>
                        {(n.actor_name || n.actor_email) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{n.actor_name || n.actor_email}</span>
                          </>
                        )}
                      </div>

                      <h4
                        className={`text-sm sm:text-base leading-snug ${
                          !n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/85"
                        }`}
                      >
                        {n.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {n.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleRead(n)}
                      className="h-10 px-3 rounded-xl text-xs font-semibold gap-1.5"
                    >
                      {n.is_read ? (
                        <>
                          <Mail className="h-3.5 w-3.5" />
                          <span>Mark Unread</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Mark Read</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteNotification(n)}
                      aria-label="Delete alert"
                      className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      onClick={() => onOpenNotification(n)}
                      className={`h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 whitespace-nowrap shrink-0 ${meta.actionCls}`}
                    >
                      <span>{n.action_label || "Open"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAlertsFeed;
