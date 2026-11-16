import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";

interface Props {
  /** Limit to one task (creator view). Omit for admin view of all submissions. */
  taskId?: string;
}

const hoursLeft = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 36e5));

const TaskProofReviewList: React.FC<Props> = ({ taskId }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await callRpc('auto_approve_expired_task_proofs', {});
    let q = (supabase.from as any)('task_proof_submissions')
      .select('*, tasks(title, reward_credits)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100);
    if (taskId) q = q.eq('task_id', taskId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const list = data || [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, display_name, email').in('user_id', ids as string[]);
      const m: Record<string, string> = {};
      (profs || []).forEach((p: any) => { m[p.user_id] = p.display_name || p.email || 'Member'; });
      setNames(m);
    }
    setLoading(false);
  }, [filter, taskId]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, approve: boolean) => {
    let reason: string | null = null;
    if (!approve) {
      reason = window.prompt("Reason for rejecting this proof?") || '';
      if (!reason.trim()) { toast.error("Please give a reason"); return; }
    }
    setBusyId(id);
    const { data, error } = await callRpc<any>('review_task_proof', { p_submission_id: id, p_approve: approve, p_reason: reason });
    setBusyId(null);
    if (error || !data?.success) { toast.error(data?.error || error?.message || "Review failed"); return; }
    toast.success(approve ? "Approved — credits paid to the earner" : "Proof rejected");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize text-xs h-8">
            {f}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load} className="h-8 ml-auto"><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No {filter} proofs.</p>
      ) : rows.map(r => (
        <Card key={r.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{names[r.user_id] || 'Member'}</p>
                {!taskId && <p className="text-xs text-muted-foreground truncate">{r.tasks?.title}</p>}
                <p className="text-xs text-muted-foreground">+{r.tasks?.reward_credits ?? 0} credits · {new Date(r.created_at).toLocaleString()}</p>
              </div>
              {r.status === 'pending' ? (
                <Badge variant="secondary" className="shrink-0 gap-1"><Clock className="h-3 w-3" />{hoursLeft(r.expires_at)}h left</Badge>
              ) : (
                <Badge variant={r.status === 'approved' ? 'default' : 'destructive'} className="shrink-0 capitalize">
                  {r.status}{r.auto_approved ? ' (auto)' : ''}
                </Badge>
              )}
            </div>
            {r.proof_url && (
              <a href={r.proof_url} target="_blank" rel="noreferrer">
                <img loading="lazy" src={r.proof_url} alt="Proof screenshot" className="w-full max-h-72 object-contain rounded-lg border bg-muted" />
              </a>
            )}
            {r.proof_text && <p className="text-sm break-words">{r.proof_text}</p>}
            {r.rejection_reason && <p className="text-xs text-destructive">Reason: {r.rejection_reason}</p>}
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-10" disabled={busyId === r.id} onClick={() => review(r.id, true)}>
                  <CheckCircle className="h-4 w-4 mr-1" />Approve & Pay
                </Button>
                <Button size="sm" variant="destructive" className="flex-1 h-10" disabled={busyId === r.id} onClick={() => review(r.id, false)}>
                  <XCircle className="h-4 w-4 mr-1" />Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskProofReviewList;
