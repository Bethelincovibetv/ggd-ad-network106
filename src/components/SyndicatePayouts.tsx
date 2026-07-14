import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Check, Wallet, ShieldAlert } from 'lucide-react';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';

interface Row {
  id: string;
  task_id: string;
  syndicate_user_id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  payout_amount: number | null;
  paid_at: string | null;
  payment_note: string | null;
  task?: { title: string; payout_amount: number | null; cost_per_syndicate: number | null };
  syndicate?: { account_name: string | null; account_number: string | null; bank_name: string | null; email?: string };
}

const SyndicatePayouts: React.FC = () => {
  const { isEnabled, loading: togglesLoading } = useFeatureToggles();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: myTasks } = await supabase
      .from('syndicate_tasks')
      .select('id, title, payout_amount, cost_per_syndicate')
      .eq('business_user_id', user.id);
    const taskMap: Record<string, any> = {};
    (myTasks || []).forEach(t => { taskMap[t.id] = t; });
    const taskIds = (myTasks || []).map(t => t.id);
    if (taskIds.length === 0) { setRows([]); setLoading(false); return; }

    const { data: assigns } = await supabase
      .from('syndicate_task_assignments')
      .select('id, task_id, syndicate_user_id, status, submitted_at, reviewed_at, payout_amount, paid_at, payment_note')
      .in('task_id', taskIds)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false });

    const synIds = [...new Set((assigns || []).map(a => a.syndicate_user_id))];
    let synMap: Record<string, any> = {};
    if (synIds.length) {
      const { data: syns } = await supabase
        .from('syndicate_profiles')
        .select('user_id, account_name, account_number, bank_name')
        .in('user_id', synIds);
      (syns || []).forEach(s => { synMap[s.user_id] = s; });
      const { data: profs } = await supabase.from('profiles').select('user_id, email, display_name').in('user_id', synIds);
      (profs || []).forEach(p => { if (synMap[p.user_id]) synMap[p.user_id].email = p.email; synMap[p.user_id] = { ...(synMap[p.user_id] || {}), email: p.email, display_name: p.display_name }; });
    }

    setRows((assigns || []).map(a => ({ ...a, task: taskMap[a.task_id], syndicate: synMap[a.syndicate_user_id] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markPaid = async (r: Row) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const amount = r.task?.payout_amount ?? r.task?.cost_per_syndicate ?? 0;
    const { error } = await supabase
      .from('syndicate_task_assignments')
      .update({
        payout_amount: amount,
        paid_at: new Date().toISOString(),
        paid_by: user.id,
        payment_note: notes[r.id] || null,
      })
      .eq('id', r.id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success('Marked as paid');
    load();
  };

  const copy = (v?: string | null) => {
    if (!v) return;
    navigator.clipboard.writeText(v);
    toast.success('Copied');
  };

  if (togglesLoading) return null;

  if (!isEnabled('business_pays_syndicate')) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Admin-managed payouts</p>
          <p className="text-xs text-muted-foreground mt-1">
            Syndicate payouts are currently handled by GGD admin. When enabled, you'll pay approved crew members directly here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDue = rows.filter(r => !r.paid_at).reduce((s, r) => s + (r.task?.payout_amount ?? r.task?.cost_per_syndicate ?? 0), 0);

  return (
    <div className="space-y-3">
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total pending payout</p>
            <p className="text-2xl font-black text-orange-600">₦{totalDue.toLocaleString()}</p>
          </div>
          <Wallet className="h-8 w-8 text-orange-500" />
        </CardContent>
      </Card>

      {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
      {!loading && rows.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No approved syndicate tasks yet.</CardContent></Card>
      )}

      {rows.map(r => {
        const amount = r.task?.payout_amount ?? r.task?.cost_per_syndicate ?? 0;
        const paid = !!r.paid_at;
        return (
          <Card key={r.id} className={paid ? 'opacity-70' : ''}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-sm truncate">{r.task?.title || 'Task'}</CardTitle>
                <Badge variant={paid ? 'secondary' : 'default'} className="text-[10px] shrink-0">
                  {paid ? <><Check className="h-3 w-3 mr-1" />Paid</> : 'Pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground uppercase">Syndicate</p>
                  <p className="font-semibold truncate">{(r.syndicate as any)?.display_name || r.syndicate?.email || 'Anonymous'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[9px] text-muted-foreground uppercase">Amount</p>
                  <p className="font-black text-orange-600">₦{amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase">Bank Details</p>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{r.syndicate?.bank_name || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono">{r.syndicate?.account_number || 'No account provided'}</span>
                  {r.syndicate?.account_number && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(r.syndicate?.account_number)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{r.syndicate?.account_name || ''}</p>
              </div>
              {paid ? (
                <p className="text-[10px] text-muted-foreground">
                  Paid {new Date(r.paid_at!).toLocaleString()}
                  {r.payment_note ? ` · ${r.payment_note}` : ''}
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Ref / note (optional)"
                    className="h-8 text-xs"
                    value={notes[r.id] || ''}
                    onChange={e => setNotes({ ...notes, [r.id]: e.target.value })}
                  />
                  <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-orange-500 to-red-600" onClick={() => markPaid(r)}>
                    Mark Paid
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SyndicatePayouts;