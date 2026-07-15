import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Eye, CheckCircle2, Clock, Coins } from "lucide-react";

/** Collapsible (accordion-style) campaign analytics for the Business Owner
 *  management dashboard. Each row is a THIN header by default, expanding
 *  smoothly to reveal deep metrics on click. Clicking again collapses it.
 */
interface Campaign {
  id: string;
  title: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  impressions: number;
  clicks: number;
  budget_credits?: number | null;
  reward_credits?: number | null;
}

interface Metrics {
  approved: number;
  pending: number;
  spend: number;
}

const CollapsibleCampaigns: React.FC<{ userId?: string }> = ({ userId }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, Metrics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let uid = userId;
      if (!uid) {
        const { data } = await supabase.auth.getUser();
        uid = data.user?.id;
      }
      if (!uid) return;
      const { data } = await supabase
        .from("ads")
        .select("id, title, is_active, expires_at, created_at, impressions, clicks, budget_credits, reward_credits")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setCampaigns((data as any) || []);
      setLoading(false);
    })();
  }, [userId]);

  const loadMetrics = async (adId: string) => {
    if (metrics[adId]) return;
    const { data: assigns } = await supabase
      .from("syndicate_task_assignments")
      .select("status, payout_amount")
      .eq("task_id", adId);
    const approved = (assigns || []).filter((a: any) => a.status === "approved").length;
    const pending = (assigns || []).filter((a: any) => ["submitted", "accepted", "assigned"].includes(a.status)).length;
    const spend = (assigns || [])
      .filter((a: any) => a.status === "approved")
      .reduce((s: number, a: any) => s + (Number(a.payout_amount) || 0), 0);
    setMetrics((m) => ({ ...m, [adId]: { approved, pending, spend } }));
  };

  const toggle = (id: string) => {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) loadMetrics(next);
  };

  const status = (c: Campaign) => {
    const expired = c.expires_at && new Date(c.expires_at) < new Date();
    if (expired) return { label: "Completed", cls: "bg-gray-500/15 text-gray-500" };
    if (!c.is_active) return { label: "Paused", cls: "bg-yellow-500/15 text-yellow-600" };
    return { label: "Active", cls: "bg-green-500/15 text-green-600" };
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading campaigns…</div>;
  if (campaigns.length === 0) {
    return <div className="text-sm text-muted-foreground p-6 text-center">No campaigns yet.</div>;
  }

  return (
    <div className="space-y-2">
      {campaigns.map((c) => {
        const s = status(c);
        const open = openId === c.id;
        const m = metrics[c.id];
        return (
          <Card key={c.id} className="overflow-hidden border-border/60">
            <button
              onClick={() => toggle(c.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge className={`${s.cls} text-[10px] font-bold`}>{s.label}</Badge>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/20">
                  <Metric icon={Eye} label="Impressions" value={c.impressions ?? 0} tint="text-blue-500 bg-blue-500/10" />
                  <Metric icon={CheckCircle2} label="Approved" value={m?.approved ?? 0} tint="text-green-500 bg-green-500/10" />
                  <Metric icon={Clock} label="Pending" value={m?.pending ?? 0} tint="text-yellow-500 bg-yellow-500/10" />
                  <Metric icon={Coins} label="Spend" value={m?.spend ?? (c.budget_credits ?? c.reward_credits ?? 0)} tint="text-orange-500 bg-orange-500/10" />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const Metric: React.FC<{ icon: any; label: string; value: number; tint: string }> = ({ icon: Icon, label, value, tint }) => (
  <div className="rounded-lg bg-background p-2">
    <div className={`h-7 w-7 rounded-md flex items-center justify-center ${tint} mb-1`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <p className="text-[9px] font-bold uppercase text-muted-foreground">{label}</p>
    <p className="text-base font-black">{value.toLocaleString()}</p>
  </div>
);

export default CollapsibleCampaigns;