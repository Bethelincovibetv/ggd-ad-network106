import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  Layers,
  ArrowUpRight,
} from "lucide-react";

export type TaskFilterSection = "all" | "uncompleted" | "pending_review" | "completed" | "manage";

export interface TaskPerformanceStats {
  availableCount: number;
  uncompletedCount: number;
  uncompletedPotentialCredits: number;
  pendingReviewCount: number;
  pendingReviewCredits: number;
  completedCount: number;
  totalEarnedCredits: number;
  totalPerformedCount: number;
  createdCount?: number;
  creatorPendingReviewCount?: number;
}

interface TaskPerformancePanelProps {
  stats: TaskPerformanceStats;
  exchangeRate: number;
  activeSection: TaskFilterSection;
  onSelectSection: (section: TaskFilterSection) => void;
}

export const TaskPerformancePanel: React.FC<TaskPerformancePanelProps> = ({
  stats,
  exchangeRate,
  activeSection,
  onSelectSection,
}) => {
  const earnedNaira = stats.totalEarnedCredits * (exchangeRate || 100);
  const pendingNaira = stats.pendingReviewCredits * (exchangeRate || 100);
  const potentialNaira = stats.uncompletedPotentialCredits * (exchangeRate || 100);

  const pipelineTotal =
    stats.completedCount + stats.pendingReviewCount + stats.uncompletedCount;
  const completedPct =
    pipelineTotal > 0 ? Math.round((stats.completedCount / pipelineTotal) * 100) : 0;
  const pendingPct =
    pipelineTotal > 0 ? Math.round((stats.pendingReviewCount / pipelineTotal) * 100) : 0;
  const uncompletedPct =
    pipelineTotal > 0 ? Math.max(0, 100 - completedPct - pendingPct) : 0;

  const createdCount = stats.createdCount || 0;
  const creatorPendingCount = stats.creatorPendingReviewCount || 0;

  const tabs: {
    id: TaskFilterSection;
    label: string;
    shortLabel: string;
    count: number;
    accentClass: string;
  }[] = [
    {
      id: "all",
      label: "All Tasks",
      shortLabel: "All",
      count: stats.availableCount + stats.uncompletedCount + stats.pendingReviewCount + stats.completedCount,
      accentClass: "text-foreground",
    },
    {
      id: "uncompleted",
      label: "Pending Uncompleted",
      shortLabel: "Uncompleted",
      count: stats.uncompletedCount,
      accentClass: "text-orange-400",
    },
    {
      id: "pending_review",
      label: "Pending Review",
      shortLabel: "In Review",
      count: stats.pendingReviewCount,
      accentClass: "text-amber-400",
    },
    {
      id: "completed",
      label: "Completed",
      shortLabel: "Completed",
      count: stats.completedCount,
      accentClass: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Premium Performance & Earnings Analytics Card */}
      <Card className="overflow-hidden border border-border bg-gradient-to-br from-card via-card to-orange-500/[0.06] shadow-lg">
        <CardContent className="p-0">
          {/* Top Hero Metrics Row */}
          <div className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span>Task Performance &amp; Earnings</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground tabular-nums">
                  +{stats.totalEarnedCredits.toLocaleString()} GGG
                </span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                  ₦{earnedNaira.toLocaleString()} earned
                </span>
              </div>
              <p className="text-[11.5px] text-muted-foreground">
                Verified lifetime earnings from approved community promotion &amp; engagement tasks
              </p>
            </div>

            {/* Total Performed Counter */}
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5 text-orange-400" />
              </div>
              <div className="tabular-nums">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tasks Performed
                </p>
                <p className="text-lg font-black text-foreground leading-tight">
                  {stats.totalPerformedCount.toLocaleString()}
                  <span className="text-xs font-medium text-muted-foreground ml-1.5">
                    ({stats.completedCount} paid · {stats.pendingReviewCount} in review)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 3-State Pipeline Breakdown Grid (Interactive Quick Filters) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/80">
            {/* Pending Uncompleted */}
            <button
              type="button"
              onClick={() => onSelectSection("uncompleted")}
              className={`p-3.5 text-left transition-colors flex items-center justify-between gap-3 hover:bg-muted/30 ${
                activeSection === "uncompleted" ? "bg-orange-500/10" : ""
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-400">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Pending Uncompleted</span>
                </div>
                <p className="text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats.uncompletedCount}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                  {stats.uncompletedCount > 0
                    ? `+${stats.uncompletedPotentialCredits.toLocaleString()} cr (₦${potentialNaira.toLocaleString()}) waiting`
                    : "No open drafts"}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* Completed Tasks Pending Review */}
            <button
              type="button"
              onClick={() => onSelectSection("pending_review")}
              className={`p-3.5 text-left transition-colors flex items-center justify-between gap-3 hover:bg-muted/30 ${
                activeSection === "pending_review" ? "bg-amber-500/10" : ""
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Pending Review</span>
                </div>
                <p className="text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats.pendingReviewCount}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                  {stats.pendingReviewCount > 0
                    ? `+${stats.pendingReviewCredits.toLocaleString()} cr (₦${pendingNaira.toLocaleString()}) clearing`
                    : "None awaiting review"}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* Completed & Paid */}
            <button
              type="button"
              onClick={() => onSelectSection("completed")}
              className={`p-3.5 text-left transition-colors flex items-center justify-between gap-3 hover:bg-muted/30 ${
                activeSection === "completed" ? "bg-emerald-500/10" : ""
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Completed &amp; Paid</span>
                </div>
                <p className="text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats.completedCount}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                  {stats.completedCount > 0
                    ? `+${stats.totalEarnedCredits.toLocaleString()} cr (₦${earnedNaira.toLocaleString()}) paid`
                    : "Complete a task to earn"}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>

          {/* Pipeline Progress Bar (shown when user has engaged with at least 1 task) */}
          {pipelineTotal > 0 && (
            <div className="px-4 py-2.5 bg-muted/20 border-t border-border/80 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] text-muted-foreground tabular-nums">
                <span>Work Pipeline Breakdown</span>
                <span>
                  {completedPct}% Paid · {pendingPct}% In Review · {uncompletedPct}% In Progress
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
                {completedPct > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${completedPct}%` }}
                  />
                )}
                {pendingPct > 0 && (
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pendingPct}%` }}
                  />
                )}
                {uncompletedPct > 0 && (
                  <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${uncompletedPct}%` }}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segmented Section Tabs (Touch-friendly, no text overflow on 390px screens) */}
      <div
        role="tablist"
        aria-label="Filter credit tasks by status"
        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-muted/40 border border-border"
      >
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectSection(tab.id)}
              className={`min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span className="truncate sm:hidden">{tab.shortLabel}</span>
              <span className="truncate hidden sm:inline">{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums shrink-0 ${
                  isActive
                    ? "bg-black/25 text-white"
                    : `bg-background/80 ${tab.accentClass}`
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dedicated Creator Management Access Bar */}
      {(createdCount > 0 || activeSection === "manage") && (
        <button
          type="button"
          onClick={() => onSelectSection(activeSection === "manage" ? "all" : "manage")}
          className={`w-full min-h-[48px] px-4 py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
            activeSection === "manage"
              ? "border-orange-500/60 bg-gradient-to-r from-orange-500/15 to-amber-600/10"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="min-w-0 flex items-center gap-2.5">
            <Briefcase className="h-4 w-4 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                My Created Tasks &amp; Performer Manager
              </p>
              <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                {createdCount} campaign{createdCount !== 1 ? "s" : ""} created
                {creatorPendingCount > 0
                  ? ` · ${creatorPendingCount} proof${creatorPendingCount !== 1 ? "s" : ""} awaiting review`
                  : " · See who performed your tasks"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {creatorPendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold tabular-nums">
                {creatorPendingCount} to review
              </span>
            )}
            <span className="text-xs font-bold text-orange-400 whitespace-nowrap">
              {activeSection === "manage" ? "Back to Feed" : "Open Manager →"}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};

export default TaskPerformancePanel;
