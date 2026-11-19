import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Eye,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  Search,
  Copy,
  Check,
  Loader2,
  Plus,
  Briefcase,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";
import { getOrCreateTaskShareUrl } from "@/lib/taskShare";
import { notifyTaskStatusPush } from "@/services/pushNotificationService";

interface TaskCreatorManagerProps {
  createdTasks: any[];
  exchangeRate: number;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onToggleActive: (task: any) => Promise<void> | void;
  onDeleteTask: (task: any) => Promise<void> | void;
  onOpenCreate: () => void;
  onRefreshParent: () => void;
  onPendingCountChange?: (count: number) => void;
}

interface UnifiedPerformerEntry {
  id: string;
  submissionId: string | null;
  taskId: string;
  taskTitle: string;
  taskReward: number;
  taskType: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  autoApproved: boolean;
  proofUrl: string | null;
  proofText: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  expiresAt: string | null;
  source: "proof" | "completion";
}

interface PerformerProfile {
  user_id: string;
  display_name: string | null;
  business_name: string | null;
  email: string | null;
  avatar_url: string | null;
  referral_code: string | null;
}

const hoursRemaining = (iso?: string | null) => {
  if (!iso) return null;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 36e5));
};

const QUICK_REJECTION_REASONS = [
  "Screenshot does not clearly show the shared post or status.",
  "Wrong promotional flyer or link shared.",
  "Post/status image appears cropped or missing views/timestamp.",
];

export const TaskCreatorManager: React.FC<TaskCreatorManagerProps> = ({
  createdTasks,
  exchangeRate,
  selectedTaskId,
  onSelectTask,
  onToggleActive,
  onDeleteTask,
  onOpenCreate,
  onRefreshParent,
  onPendingCountChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<UnifiedPerformerEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PerformerProfile>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState("");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; performer: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const taskIdsKey = useMemo(
    () => createdTasks.map((t) => t.id).sort().join(","),
    [createdTasks]
  );

  const loadCreatorActivity = useCallback(async () => {
    if (createdTasks.length === 0) {
      setEntries([]);
      onPendingCountChange?.(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await callRpc("auto_approve_expired_task_proofs", {});
    } catch {
      // Non-blocking
    }

    const taskMap = new Map<string, any>();
    createdTasks.forEach((t) => taskMap.set(t.id, t));
    const taskIds = createdTasks.map((t) => t.id);

    try {
      const [proofsRes, compsRes] = await Promise.all([
        (supabase.from as any)("task_proof_submissions")
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("task_completions")
          .select("id, task_id, user_id, created_at")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      const unified: UnifiedPerformerEntry[] = [];
      const seenProofCompletionKeys = new Set<string>();

      (proofsRes.data || []).forEach((p: any) => {
        const task = taskMap.get(p.task_id);
        if (p.status === "approved") {
          seenProofCompletionKeys.add(`${p.task_id}::${p.user_id}`);
        }
        unified.push({
          id: `proof-${p.id}`,
          submissionId: p.id,
          taskId: p.task_id,
          taskTitle: task?.title || "Campaign Task",
          taskReward: Number(task?.reward_credits || 5),
          taskType: task?.task_type || "share",
          userId: p.user_id,
          status: (p.status as "pending" | "approved" | "rejected") || "pending",
          autoApproved: Boolean(p.auto_approved),
          proofUrl: p.proof_url || null,
          proofText: p.proof_text || null,
          rejectionReason: p.rejection_reason || null,
          createdAt: p.created_at,
          reviewedAt: p.reviewed_at || null,
          expiresAt: p.expires_at || null,
          source: "proof",
        });
      });

      // Merge direct completions (e.g. YouTube Watch & Subscribe tasks) that don't have a proof row
      if (!compsRes.error && compsRes.data) {
        compsRes.data.forEach((c: any) => {
          const key = `${c.task_id}::${c.user_id}`;
          if (seenProofCompletionKeys.has(key)) return;
          const task = taskMap.get(c.task_id);
          unified.push({
            id: `comp-${c.id}`,
            submissionId: null,
            taskId: c.task_id,
            taskTitle: task?.title || "Campaign Task",
            taskReward: Number(task?.reward_credits || 5),
            taskType: task?.task_type || "youtube",
            userId: c.user_id,
            status: "approved",
            autoApproved: false,
            proofUrl: null,
            proofText: task?.task_type === "youtube" ? "Completed YouTube engagement verification" : "Direct task completion",
            rejectionReason: null,
            createdAt: c.created_at,
            reviewedAt: c.created_at,
            expiresAt: null,
            source: "completion",
          });
        });
      }

      unified.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setEntries(unified);
      const totalPending = unified.filter((e) => e.status === "pending").length;
      onPendingCountChange?.(totalPending);

      const userIds = Array.from(new Set(unified.map((e) => e.userId).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profRows } = await supabase
          .from("profiles")
          .select("user_id, display_name, business_name, email, avatar_url, referral_code")
          .in("user_id", userIds);
        const profMap: Record<string, PerformerProfile> = {};
        (profRows || []).forEach((pr: any) => {
          profMap[pr.user_id] = pr;
        });
        setProfiles(profMap);
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not load task performers");
    } finally {
      setLoading(false);
    }
  }, [taskIdsKey, createdTasks, onPendingCountChange]);

  useEffect(() => {
    loadCreatorActivity();
  }, [loadCreatorActivity]);

  // If user opens a specific task that has pending proofs, prioritize All or Pending cleanly
  const selectedTask = useMemo(
    () => (selectedTaskId ? createdTasks.find((t) => t.id === selectedTaskId) || null : null),
    [selectedTaskId, createdTasks]
  );

  const handleReviewProof = async (
    entry: UnifiedPerformerEntry,
    approve: boolean,
    reason?: string
  ) => {
    if (!entry.submissionId) return;
    if (!approve && (!reason || !reason.trim())) {
      toast.error("Please enter a short reason for rejecting this proof.");
      return;
    }

    setBusyEntryId(entry.id);
    try {
      const { data, error } = await callRpc<any>("review_task_proof", {
        p_submission_id: entry.submissionId,
        p_approve: approve,
        p_reason: approve ? null : reason?.trim(),
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || "Review failed");
        return;
      }

      toast.success(
        approve
          ? `Approved! +${entry.taskReward} GGG credited to performer.`
          : "Proof rejected — performer notified to re-submit."
      );
      if (entry.userId) {
        notifyTaskStatusPush({
          userId: entry.userId,
          taskTitle: entry.taskTitle || selectedTask?.title || "Credit Task",
          approved: approve,
          rewardCredits: approve ? entry.taskReward : undefined,
          reason: approve ? undefined : reason?.trim(),
        }).catch(() => {});
      }
      setRejectingEntryId(null);
      setRejectionInput("");
      await loadCreatorActivity();
      onRefreshParent();
    } catch (err: any) {
      toast.error(err?.message || "Could not process review");
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleCopyShareLink = async (task: any) => {
    const shareUrl = await getOrCreateTaskShareUrl(task.id);
    if (!shareUrl) {
      toast.error("Could not generate share link");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLinkId(task.id);
      toast.success("Campaign share link copied!");
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Derived metrics per task and overall
  const perTaskStats = useMemo(() => {
    const map: Record<
      string,
      { pending: number; approved: number; rejected: number; total: number }
    > = {};
    createdTasks.forEach((t) => {
      map[t.id] = { pending: 0, approved: 0, rejected: 0, total: 0 };
    });
    entries.forEach((e) => {
      if (!map[e.taskId]) {
        map[e.taskId] = { pending: 0, approved: 0, rejected: 0, total: 0 };
      }
      map[e.taskId].total += 1;
      map[e.taskId][e.status] += 1;
    });
    return map;
  }, [createdTasks, entries]);

  const summary = useMemo(() => {
    const pendingCount = entries.filter((e) => e.status === "pending").length;
    const approvedEntries = entries.filter((e) => e.status === "approved");
    const activeCampaigns = createdTasks.filter((t) => t.is_active).length;
    const totalFundedCredits = createdTasks.reduce(
      (sum, t) => sum + Number(t.reward_credits || 5) * Number(t.max_completions || 1),
      0
    );
    const totalPaidCredits = createdTasks.reduce(
      (sum, t) => sum + Number(t.reward_credits || 5) * Number(t.completions_count || 0),
      0
    );
    const totalPerformers = Math.max(
      approvedEntries.length,
      createdTasks.reduce((sum, t) => sum + Number(t.completions_count || 0), 0)
    );
    return {
      pendingCount,
      approvedCount: approvedEntries.length,
      rejectedCount: entries.filter((e) => e.status === "rejected").length,
      activeCampaigns,
      totalFundedCredits,
      totalPaidCredits,
      totalPerformers,
    };
  }, [createdTasks, entries]);

  const scopedEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedTaskId && e.taskId !== selectedTaskId) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prof = profiles[e.userId];
        const performerName = (
          prof?.business_name ||
          prof?.display_name ||
          prof?.email ||
          ""
        ).toLowerCase();
        const matchesTitle = e.taskTitle.toLowerCase().includes(q);
        const matchesUser = performerName.includes(q);
        const matchesNote = (e.proofText || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesUser && !matchesNote) return false;
      }
      return true;
    });
  }, [entries, selectedTaskId, statusFilter, searchQuery, profiles]);

  const scopedCounts = useMemo(() => {
    const base = selectedTaskId
      ? entries.filter((e) => e.taskId === selectedTaskId)
      : entries;
    return {
      all: base.length,
      pending: base.filter((e) => e.status === "pending").length,
      approved: base.filter((e) => e.status === "approved").length,
      rejected: base.filter((e) => e.status === "rejected").length,
    };
  }, [entries, selectedTaskId]);

  const rate = exchangeRate || 100;

  if (createdTasks.length === 0) {
    return (
      <Card className="border border-dashed border-border bg-card">
        <CardContent className="py-12 px-5 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center mx-auto">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Created Tasks Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Launch your first promotional campaign to track performers, review screenshot proofs in one place, and pay credits automatically.
          </p>
          <Button
            onClick={onOpenCreate}
            className="min-h-[44px] rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs px-5"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Your First Task
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Creator Management Overview Bar */}
      <Card className="border border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Creator Task Management</p>
              <p className="text-xs text-muted-foreground">
                See everyone who performed your campaigns and approve proofs in one workspace
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadCreatorActivity}
                disabled={loading}
                className="min-h-[38px] rounded-xl text-xs font-semibold"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onOpenCreate}
                className="min-h-[38px] rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Task
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-3.5 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">My Campaigns</p>
              <p className="text-xl font-black text-foreground tabular-nums">
                {createdTasks.length}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {summary.activeCampaigns} active · {createdTasks.length - summary.activeCampaigns} paused/closed
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className="p-3.5 text-left hover:bg-muted/30 transition-colors space-y-0.5"
            >
              <p className="text-[11px] font-medium text-amber-400">Pending Proofs</p>
              <p className="text-xl font-black text-foreground tabular-nums">
                {summary.pendingCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {summary.pendingCount > 0 ? "Tap to review queue" : "All caught up"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className="p-3.5 text-left hover:bg-muted/30 transition-colors space-y-0.5"
            >
              <p className="text-[11px] font-medium text-emerald-400">Total Performers</p>
              <p className="text-xl font-black text-foreground tabular-nums">
                {summary.totalPerformers}
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {summary.rejectedCount} rejected · {entries.length} logs
              </p>
            </button>

            <div className="p-3.5 space-y-0.5">
              <p className="text-[11px] font-medium text-orange-400">Credits Paid / Funded</p>
              <p className="text-xl font-black text-foreground tabular-nums">
                {summary.totalPaidCredits.toLocaleString()}
                <span className="text-xs font-semibold text-muted-foreground">
                  {" "}
                  / {summary.totalFundedCredits.toLocaleString()} GGG
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                ₦{(summary.totalPaidCredits * rate).toLocaleString()} distributed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Split Workspace: Left = My Campaigns List, Right = Selected/All Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Campaigns List Column */}
        <Card className="lg:col-span-5 border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">
              Your Tasks ({createdTasks.length})
            </span>
            {selectedTaskId && (
              <button
                type="button"
                onClick={() => onSelectTask(null)}
                className="text-xs font-semibold text-orange-400 hover:underline whitespace-nowrap"
              >
                Show All Performers
              </button>
            )}
          </div>

          <div className="divide-y divide-border max-h-[420px] lg:max-h-[640px] overflow-y-auto">
            {/* Unified "All Campaigns" Selector Row */}
            <button
              type="button"
              onClick={() => onSelectTask(null)}
              className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 ${
                selectedTaskId === null
                  ? "bg-orange-500/10"
                  : "hover:bg-muted/30"
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span>All Campaigns Performer Feed</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                  {entries.length} submission{entries.length !== 1 ? "s" : ""} across {createdTasks.length} task{createdTasks.length !== 1 ? "s" : ""}
                </p>
              </div>
              {summary.pendingCount > 0 && (
                <span className="text-[11px] font-bold text-amber-400 tabular-nums shrink-0">
                  {summary.pendingCount} pending
                </span>
              )}
            </button>

            {createdTasks.map((task) => {
              const tStat = perTaskStats[task.id] || { pending: 0, approved: 0, rejected: 0, total: 0 };
              const isSelected = selectedTaskId === task.id;
              const maxComp = Number(task.max_completions || 0);
              const doneCount = Number(task.completions_count || 0);
              const pct = maxComp > 0 ? Math.min(100, Math.round((doneCount / maxComp) * 100)) : 0;

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTask(task.id);
                    }
                  }}
                  className={`px-4 py-3.5 cursor-pointer transition-colors space-y-2 ${
                    isSelected ? "bg-orange-500/10" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2">
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-muted-foreground tabular-nums">
                        <span className="text-emerald-400 font-semibold">
                          +{task.reward_credits} cr
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {doneCount}/{maxComp || "∞"} done
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={task.is_active ? "text-emerald-400" : "text-muted-foreground"}>
                          {task.is_active ? "Active" : "Paused/Closed"}
                        </span>
                      </div>
                    </div>

                    {tStat.pending > 0 ? (
                      <span className="text-[11px] font-bold text-amber-400 tabular-nums shrink-0">
                        {tStat.pending} pending
                      </span>
                    ) : tStat.total > 0 ? (
                      <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
                        {tStat.total} performer{tStat.total !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>

                  {maxComp > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Performers & Proof Management Column */}
        <Card className="lg:col-span-7 border border-border bg-card overflow-hidden">
          {/* Selected Campaign Detail Header & Quick Actions */}
          {selectedTask ? (
            <div className="p-4 border-b border-border space-y-3 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectTask(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  All My Tasks
                </button>
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                  Created {new Date(selectedTask.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                  {selectedTask.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span className="text-emerald-400 font-bold">
                    +{selectedTask.reward_credits} GGG (₦{((selectedTask.reward_credits || 5) * rate).toLocaleString()}) / person
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedTask.completions_count || 0}/{selectedTask.max_completions || "∞"} spots filled
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={selectedTask.is_active ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {selectedTask.is_active ? "Active" : "Paused / Completed"}
                  </span>
                </div>
              </div>

              {/* Campaign Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleActive(selectedTask)}
                  className="min-h-[38px] rounded-xl text-xs font-semibold"
                >
                  {selectedTask.is_active ? (
                    <>
                      <Pause className="h-3.5 w-3.5 mr-1.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Resume
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyShareLink(selectedTask)}
                  className="min-h-[38px] rounded-xl text-xs font-semibold"
                >
                  {copiedLinkId === selectedTask.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy Share Link
                    </>
                  )}
                </Button>

                {selectedTask.share_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const u = await getOrCreateTaskShareUrl(selectedTask.id);
                      if (u) window.open(`/s/${u.split("/").pop()?.split("?")[0]}`, "_blank");
                    }}
                    className="min-h-[38px] rounded-xl text-xs font-semibold"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Preview
                  </Button>
                )}

                {confirmDeleteId === selectedTask.id ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await onDeleteTask(selectedTask);
                        setConfirmDeleteId(null);
                        onSelectTask(null);
                      }}
                      className="min-h-[38px] rounded-xl text-xs font-bold"
                    >
                      Confirm Delete
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-[38px] rounded-xl text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(selectedTask.id)}
                    className="min-h-[38px] rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="text-sm font-bold text-foreground">
                Who Performed Your Tasks
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unified log of every member who submitted proof or completed any of your tasks
              </p>
            </div>
          )}

          {/* Filter Tabs + Search Input */}
          <div className="p-3.5 border-b border-border space-y-2.5">
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/50">
              {(
                [
                  { id: "all", label: "All", count: scopedCounts.all },
                  { id: "pending", label: "Pending", count: scopedCounts.pending },
                  { id: "approved", label: "Approved", count: scopedCounts.approved },
                  { id: "rejected", label: "Rejected", count: scopedCounts.rejected },
                ] as const
              ).map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`min-h-[38px] px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
                      active
                        ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="tabular-nums opacity-85">({tab.count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search performer name, note, or task title..."
                className="pl-8 h-10 rounded-xl text-xs bg-muted/30"
              />
            </div>
          </div>

          {/* Performers / Submissions List */}
          <div className="divide-y divide-border">
            {loading ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-orange-400 mx-auto" />
                <p className="text-xs text-muted-foreground">Loading performers &amp; proof submissions...</p>
              </div>
            ) : scopedEntries.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Users className="h-9 w-9 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  {statusFilter === "pending"
                    ? "No pending proofs waiting review"
                    : "No task performers match this filter"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {statusFilter !== "all"
                    ? "Switch to All or share your task link so earners can perform your campaign."
                    : "When members share your task and upload screenshots or watch your video, they appear here."}
                </p>
                {statusFilter !== "all" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setStatusFilter("all")}
                    className="mt-1 rounded-xl text-xs"
                  >
                    Show All Activity
                  </Button>
                )}
              </div>
            ) : (
              scopedEntries.map((entry) => {
                const prof = profiles[entry.userId];
                const performerName =
                  prof?.business_name ||
                  prof?.display_name ||
                  prof?.email?.split("@")[0] ||
                  "GGD Member";
                const initial = performerName.trim().charAt(0).toUpperCase();
                const hoursLeft = hoursRemaining(entry.expiresAt);
                const isRejectOpen = rejectingEntryId === entry.id;
                const isBusy = busyEntryId === entry.id;

                return (
                  <div key={entry.id} className="p-4 space-y-3">
                    {/* Performer & Task Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          {prof?.avatar_url ? (
                            <AvatarImage src={prof.avatar_url} alt={performerName} />
                          ) : null}
                          <AvatarFallback className="bg-orange-500/20 text-orange-300 text-xs font-bold">
                            {initial}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {performerName}
                            </p>
                            {prof?.referral_code && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                @{prof.referral_code}
                              </span>
                            )}
                          </div>

                          {!selectedTaskId && (
                            <button
                              type="button"
                              onClick={() => onSelectTask(entry.taskId)}
                              className="text-xs font-medium text-orange-400 hover:underline text-left block truncate max-w-full"
                            >
                              {entry.taskTitle}
                            </button>
                          )}

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                            <span>
                              +{entry.taskReward} cr (₦{(entry.taskReward * rate).toLocaleString()})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Semantic Status Indicator with Label */}
                      <div className="shrink-0 text-right">
                        {entry.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 tabular-nums">
                            <Clock className="h-3.5 w-3.5" />
                            {hoursLeft !== null ? `${hoursLeft}h left` : "Pending"}
                          </span>
                        ) : entry.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {entry.autoApproved ? "Auto-approved" : "Approved"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Proof Screenshot & Note */}
                    {(entry.proofUrl || entry.proofText) && (
                      <div className="pl-12 space-y-2">
                        {entry.proofUrl && (
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: entry.proofUrl!,
                                  title: entry.taskTitle,
                                  performer: performerName,
                                })
                              }
                              className="relative group rounded-xl overflow-hidden border border-border bg-muted/40 shrink-0"
                              title="Click to enlarge screenshot"
                            >
                              <img
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                src={entry.proofUrl}
                                alt={`Proof submitted by ${performerName}`}
                                className="h-24 w-32 object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] font-semibold py-0.5 text-center">
                                Tap to zoom
                              </span>
                            </button>
                            <div className="min-w-0 flex-1 space-y-1">
                              {entry.proofText && (
                                <p className="text-xs text-foreground/90 leading-relaxed break-words">
                                  {entry.proofText}
                                </p>
                              )}
                              <a
                                href={entry.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Open full screenshot
                              </a>
                            </div>
                          </div>
                        )}

                        {!entry.proofUrl && entry.proofText && (
                          <p className="text-xs text-muted-foreground leading-relaxed break-words">
                            {entry.proofText}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection Reason Display */}
                    {entry.status === "rejected" && entry.rejectionReason && (
                      <div className="ml-12 flex items-start gap-1.5 text-xs text-red-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>Reason: {entry.rejectionReason}</span>
                      </div>
                    )}

                    {/* Inline Review Controls for Pending Proofs */}
                    {entry.status === "pending" && entry.submissionId && (
                      <div className="pl-12 space-y-2.5">
                        {isRejectOpen ? (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-semibold text-foreground">
                              Select or write rejection reason:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {QUICK_REJECTION_REASONS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setRejectionInput(preset)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-left transition-colors"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                            <Input
                              value={rejectionInput}
                              onChange={(e) => setRejectionInput(e.target.value)}
                              placeholder="Enter reason shown to performer..."
                              className="h-10 rounded-xl text-xs"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isBusy || !rejectionInput.trim()}
                                onClick={() => handleReviewProof(entry, false, rejectionInput)}
                                className="min-h-[40px] rounded-xl text-xs font-bold"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Confirm Rejection
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRejectingEntryId(null);
                                  setRejectionInput("");
                                }}
                                className="min-h-[40px] rounded-xl text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => handleReviewProof(entry, true)}
                              className="min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Approve &amp; Pay
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => {
                                setRejectingEntryId(entry.id);
                                setRejectionInput("");
                              }}
                              className="min-h-[42px] rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-xs"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1.5" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Full Screenshot Lightbox Modal */}
      <Dialog open={!!previewImage} onOpenChange={(o) => { if (!o) setPreviewImage(null); }}>
        <DialogContent className="max-w-lg rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-400" />
              Proof from {previewImage?.performer}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{previewImage.title}</p>
              <div className="rounded-xl overflow-hidden border border-border bg-black/50">
                <img
                  referrerPolicy="no-referrer"
                  src={previewImage.url}
                  alt={`Proof from ${previewImage.performer}`}
                  className="w-full max-h-[65vh] object-contain mx-auto"
                />
              </div>
              <div className="flex justify-end gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Original
                </a>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskCreatorManager;
