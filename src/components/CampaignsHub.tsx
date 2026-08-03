import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Megaphone, ClipboardList, Users, Eye, MousePointerClick, Coins, Loader2 } from "lucide-react";
import CampaignAnalytics from "@/components/CampaignAnalytics";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

type Status = "active" | "expired" | "inactive";

interface Row {
  id: string;
  kind: "ad" | "task" | "syndicate";
  title: string;
  created_at: string;
  status: Status;
  impressions?: number;
  clicks?: number;
  spend?: number;
  progress?: { done: number; total: number };
}

const kindMeta = {
  ad: { label: "Banner Advert", icon: Megaphone, tint: "text-orange-600 bg-orange-500/10" },
  task: { label: "Credit Task", icon: ClipboardList, tint: "text-emerald-600 bg-emerald-500/10" },
  syndicate: { label: "Social Campaign", icon: Users, tint: "text-violet-600 bg-violet-500/10" },
} as const;

const statusMeta: Record<Status, { label: string; cls: string }> = {
  active: { label: "Live", cls: "bg-green-500/15 text-green-600" },
  expired: { label: "Expired", cls: "bg-gray-500/15 text-gray-500" },
  inactive: { label: "Not Live", cls: "bg-yellow-500/15 text-yellow-600" },
};

const CampaignsHub: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status>("active");
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }
    const now = Date.now();
    const out: Row[] = [];

    const { data: ads } = await supabase
      .from("ads")
      .select("id, title, created_at, is_active, expires_at, impressions, clicks, budget_credits")
      .eq("user_id", uid);
    (ads || []).forEach((a: any) => {
      const expired = a.expires_at && new Date(a.expires_at).getTime() < now;
      out.push({
        id: a.id,
        kind: "ad",
        title: a.title,
        created_at: a.created_at,
        status: expired ? "expired" : a.is_active ? "active" : "inactive",
        impressions: a.impressions || 0,
        clicks: a.clicks || 0,
        spend: Number(a.budget_credits) || 0,
      });
    });

    if (isEnabled("tasks")) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, created_at, is_active, completions_count, max_completions, reward_credits")
        .eq("creator_id", uid);
      (tasks || []).forEach((t: any) => {
        const done = t.completions_count || 0;
        const total = t.max_completions || 0;
        out.push({
          id: t.id,
          kind: "task",
          title: t.title,
          created_at: t.created_at,
          status: total > 0 && done >= total ? "expired" : t.is_active ? "active" : "inactive",
          spend: done * (t.reward_credits || 0),
          progress: { done, total },
        });
      });
    }

    if (isEnabled("syndicate")) {
      const { data: st } = await supabase
        .from("syndicate_tasks")
        .select("id, title, created_at, status, max_syndicates, total_cost")
        .eq("business_user_id", uid);
      const ids = (st || []).map((s: any) => s.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: asg } = await supabase
          .from("syndicate_task_assignments")
          .select("task_id, status")
          .in("task_id", ids);
        (asg || []).forEach((a: any) => {
          if (a.status === "approved") counts[a.task_id] = (counts[a.task_id] || 0) + 1;
        });
      }
      (st || []).forEach((s: any) => {
        const done = counts[s.id] || 0;
        const total = s.max_syndicates || 0;
        const status: Status =
          s.status === "completed" || (total > 0 && done >= total)
            ? "expired"
            : s.status === "paused" || s.status === "pending"
            ? "inactive"
            : "active";
        out.push({
          id: s.id,
          kind: "syndicate",
          title: s.title,
          created_at: s.created_at,
          status,
          spend: Number(s.total_cost) || 0,
          progress: { done, total },
        });
      });
    }

    out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setRows(out);
    setLoading(false);
  };

  if (analyticsId) {
    return <CampaignAnalytics adId={analyticsId} onBack={() => setAnalyticsId(null)} />;
  }

  const visible = rows.filter(r => r.status === filter);
  const count = (s: Status) => rows.filter(r => r.status === s).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-4 text-white">
        <h2 className="text-xl font-black">Campaign Manager</h2>
        <p className="text-sm text-white/85">Every campaign you run — adverts, credit tasks and social campaigns — in one place.</p>
      </div>

      <Tabs value={filter} onValueChange={v => setFilter(v as Status)}>
        <TabsList className="w-full grid grid-cols-3 h-12">
          <TabsTrigger value="active" className="text-sm font-bold">Live ({count("active")})</TabsTrigger>
          <TabsTrigger value="inactive" className="text-sm font-bold">Not Live ({count("inactive")})</TabsTrigger>
          <TabsTrigger value="expired" className="text-sm font-bold">Ended ({count("expired")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground text-sm">No campaigns in this group yet.</div>
      ) : (
        <div className="space-y-3">
          {visible.map(r => {
            const meta = kindMeta[r.kind];
            const Icon = meta.icon;
            const pct = r.progress && r.progress.total > 0
              ? Math.min(100, Math.round((r.progress.done / r.progress.total) * 100))
              : null;
            return (
              <Card key={`${r.kind}-${r.id}`} className="p-3">
                <div className="flex items-start gap-3">
                  <span className={`h-11 w-11 rounded-xl grid place-items-center flex-shrink-0 ${meta.tint}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base truncate">{r.title}</p>
                      <Badge className={`${statusMeta[r.status].cls} text-[10px] font-bold`}>{statusMeta[r.status].label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {meta.label} · {new Date(r.created_at).toLocaleDateString()}
                    </p>

                    {pct !== null && (
                      <div className="mt-2">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 font-semibold">
                          {r.progress!.done} / {r.progress!.total} completed ({pct}%)
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-[12px] font-semibold text-muted-foreground">
                      {r.kind === "ad" && (
                        <>
                          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{(r.impressions || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MousePointerClick className="h-3.5 w-3.5" />{(r.clicks || 0).toLocaleString()}</span>
                        </>
                      )}
                      <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{(r.spend || 0).toLocaleString()} credits</span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {r.kind === "ad" && (
                        <Button size="sm" className="h-10 text-sm font-bold" onClick={() => setAnalyticsId(r.id)}>
                          <BarChart2 className="h-4 w-4 mr-1" />Analytics
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 text-sm font-bold"
                        onClick={() => onNavigate?.(r.kind === "ad" ? "ads" : r.kind === "task" ? "tasks" : "business-tasks")}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CampaignsHub;