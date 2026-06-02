import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, CheckCircle, XCircle, Clock, Wallet, DollarSign, MapPin, Eye, TrendingUp, Briefcase, Star, ArrowRight, Loader2, Ban, Snowflake, Sun, PauseCircle, PlayCircle, RotateCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

const PLATFORMS = ['WhatsApp', 'Facebook', 'Telegram', 'TikTok', 'Twitter/X'];

const AdminSyndicateManager = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [syndicates, setSyndicates] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
  const [platformPricing, setPlatformPricing] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingTaskSubs, setViewingTaskSubs] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [appsRes, syndicatesRes, withdrawalsRes, tasksRes, pricingRes, profilesRes, pausedRes] = await Promise.all([
      supabase.from('syndicate_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').order('ranking_score', { ascending: false }),
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('syndicate_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_pricing').select('*').order('platform_name'),
      supabase.from('profiles').select('user_id, email, display_name, avatar_url'),
      supabase.from('app_settings').select('value').eq('key', 'syndicate_paused').maybeSingle(),
    ]);
    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    setApplications((appsRes.data || []).map((a: any) => ({ ...a, _profile: profileMap[a.user_id] })));
    setSyndicates((syndicatesRes.data || []).map((s: any) => ({ ...s, _profile: profileMap[s.user_id] })));
    setWithdrawals((withdrawalsRes.data || []).map((w: any) => ({ ...w, _profile: profileMap[w.user_id] })));
    setAllTasks(tasksRes.data || []);
    setPlatformPricing(pricingRes.data || []);
    setPaused((pausedRes.data?.value || 'false') === 'true');
    setLoading(false);
  };

  const togglePauseAll = async (next: boolean) => {
    await supabase.from('app_settings').upsert({ key: 'syndicate_paused', value: next ? 'true' : 'false' }, { onConflict: 'key' });
    setPaused(next);
    toast.success(next ? "All syndicate tasks paused" : "Syndicate tasks resumed");
  };

  const toggleSuspend = async (s: any) => {
    const next = !s.is_suspended;
    let reason: string | null = null;
    if (next) {
      reason = window.prompt("Reason for suspension?", "Policy violation") || 'Suspended by admin';
    }
    await supabase.from('syndicate_profiles').update({
      is_suspended: next,
      suspended_reason: next ? reason : null,
      failed_streak: next ? s.failed_streak : 0,
    } as any).eq('user_id', s.user_id);
    await supabase.from('notifications').insert({
      user_id: s.user_id,
      title: next ? '🚫 Account Suspended' : '✅ Account Reinstated',
      message: next ? `Your syndicate account was suspended: ${reason}` : 'Your syndicate account is active again.',
      type: next ? 'warning' : 'success',
    });
    toast.success(next ? "Syndicate suspended" : "Suspension lifted");
    fetchData();
  };

  const toggleFreezeWallet = async (s: any) => {
    const next = !s.wallet_frozen;
    await supabase.from('syndicate_profiles').update({ wallet_frozen: next } as any).eq('user_id', s.user_id);
    await supabase.from('notifications').insert({
      user_id: s.user_id,
      title: next ? '🧊 Wallet Frozen' : '🔥 Wallet Unfrozen',
      message: next ? 'Withdrawals are temporarily disabled on your account.' : 'You can request withdrawals again.',
      type: next ? 'warning' : 'success',
    });
    toast.success(next ? "Wallet frozen" : "Wallet unfrozen");
    fetchData();
  };

  const forceReassign = async (assignmentId: string) => {
    if (!window.confirm("Release this task back to the pool? The syndicate will be notified.")) return;
    await supabase.from('syndicate_task_assignments').update({
      status: 'reassigned',
      reassigned_by_admin: true,
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', assignmentId);
    toast.success("Task released for reassignment");
    if (viewingTaskSubs) viewTaskSubmissions(viewingTaskSubs);
  };

  const approveApplication = async (app: any, platforms: string[]) => {
    await supabase.from('syndicate_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.from('syndicate_profiles').insert({ user_id: app.user_id, verified_platforms: platforms, state: app.state || null });
    await supabase.from('user_roles').insert({ user_id: app.user_id, role: 'syndicate' });
    await supabase.from('notifications').insert({
      user_id: app.user_id, title: '🎉 Syndicate Approved!',
      message: `Approved for: ${platforms.join(', ')}. Start earning now!`, type: 'success',
    });
    toast.success("Application approved!");
    fetchData();
  };

  const rejectApplication = async (app: any) => {
    await supabase.from('syndicate_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.from('notifications').insert({
      user_id: app.user_id, title: '❌ Application Rejected',
      message: 'Your syndicate application was not approved at this time.', type: 'warning',
    });
    toast.success("Application rejected");
    fetchData();
  };

  const processWithdrawal = async (id: string, approve: boolean) => {
    const withdrawal = withdrawals.find(w => w.id === id);
    await supabase.from('withdrawal_requests').update({ status: approve ? 'completed' : 'rejected', processed_at: new Date().toISOString() }).eq('id', id);
    if (!approve && withdrawal) {
      const { data: rateRow } = await supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle();
      const rate = parseInt(rateRow?.value || '') || 100;
      const refundCredits = Math.ceil(Number(withdrawal.amount) / rate);
      const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', withdrawal.user_id).maybeSingle();
      await supabase.from('profiles').update({ credits: Number(prof?.credits || 0) + refundCredits }).eq('user_id', withdrawal.user_id);
    }
    if (withdrawal) {
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: approve ? '💰 Withdrawal Processed' : '❌ Withdrawal Rejected',
        message: approve ? `₦${withdrawal.amount} sent to your bank.` : `Equivalent GGG credits refunded for ₦${withdrawal.amount}.`,
        type: approve ? 'credit' : 'warning',
      });
    }
    toast.success(approve ? "Withdrawal processed" : "Withdrawal rejected & refunded");
    fetchData();
  };

  const updatePlatformPrice = async (id: string, newPrice: number) => {
    await supabase.from('platform_pricing').update({ price_per_task: newPrice }).eq('id', id);
    toast.success("Price updated!");
    fetchData();
  };

  const viewTaskSubmissions = async (taskId: string) => {
    setViewingTaskSubs(taskId);
    const { data } = await supabase.from('syndicate_task_assignments').select('*').eq('task_id', taskId);
    setTaskAssignments(data || []);
  };

  const adminReviewAssignment = async (assignmentId: string, approve: boolean) => {
    const assignment = taskAssignments.find(a => a.id === assignmentId);
    const status = approve ? 'approved' : 'rejected';
    let reason: string | null = null;
    if (!approve) {
      reason = window.prompt("Why is this proof rejected? (shown to the syndicate)", "Proof unclear or invalid");
      if (reason === null) return; // cancelled
    }
    await supabase.from('syndicate_task_assignments').update({
      status,
      rejection_reason: approve ? null : reason,
      reviewed_at: new Date().toISOString(),
    } as any).eq('id', assignmentId);
    if (approve && assignment) {
      const task = allTasks.find(t => t.id === assignment.task_id);
      const [{ data: rateRow }, { data: pctRow }] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_payout_percentage').maybeSingle(),
      ]);
      const rate = parseInt(rateRow?.value || '') || 100;
      const pct = parseInt(pctRow?.value || '') || 70;
      const explicit = Number((task as any)?.payout_amount || 0);
      const payout = explicit > 0 ? explicit : Number(task?.cost_per_syndicate || 50) * (pct / 100);
      const payoutCredits = Math.floor(Number(payout) / rate);
      const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', assignment.syndicate_user_id).maybeSingle();
      await supabase.from('profiles').update({ credits: Number(prof?.credits || 0) + payoutCredits }).eq('user_id', assignment.syndicate_user_id);
      const { data: synProfile } = await supabase.from('syndicate_profiles').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
      if (synProfile) {
        await supabase.from('syndicate_profiles').update({
          tasks_completed: (synProfile.tasks_completed || 0) + 1, ranking_score: (synProfile.ranking_score || 0) + 10,
        }).eq('user_id', assignment.syndicate_user_id);
      }
      await supabase.from('notifications').insert({
        user_id: assignment.syndicate_user_id, title: '💰 Task Approved by Admin!',
        message: `${payoutCredits} GGG credits (≈₦${payout}) credited to your wallet.`, type: 'credit',
      });
    } else if (!approve && assignment) {
      await supabase.from('notifications').insert({
        user_id: assignment.syndicate_user_id,
        title: '❌ Proof Rejected',
        message: `Reason: ${reason}`,
        type: 'warning',
      });
    }
    toast.success(approve ? "Approved & paid!" : "Rejected");
    viewTaskSubmissions(viewingTaskSubs!);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
    </div>
  );

  const pendingApps = applications.filter(a => a.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const totalEarned = syndicates.reduce((s, x) => s + (x.tasks_completed || 0), 0);

  return (
    <div className="space-y-5">
      {/* Pause-All Control */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {paused ? <PauseCircle className="h-5 w-5 text-amber-600 flex-shrink-0" /> : <PlayCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">{paused ? 'All syndicate tasks PAUSED' : 'Syndicate tasks live'}</p>
              <p className="text-[10px] text-muted-foreground">Toggle to halt all new claims globally</p>
            </div>
          </div>
          <Switch checked={paused} onCheckedChange={togglePauseAll} />
        </CardContent>
      </Card>

      {/* Hero Stats */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-yellow-300/15 blur-2xl" />
        <h3 className="text-base font-black relative">Syndicate Overview</h3>
        <p className="text-[11px] opacity-80 relative">Manage your earning workforce</p>
        <div className="grid grid-cols-4 gap-2 mt-4 relative">
          {[
            { label: 'Members', value: syndicates.length, icon: Users },
            { label: 'Pending', value: pendingApps.length, icon: Clock },
            { label: 'Tasks', value: allTasks.length, icon: Briefcase },
            { label: 'Payouts', value: pendingWithdrawals.length, icon: Wallet },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
              <s.icon className="h-4 w-4 mx-auto mb-1 opacity-80" />
              <p className="text-lg font-black leading-none">{s.value}</p>
              <p className="text-[9px] opacity-80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5 h-11 rounded-xl bg-secondary/80 p-1">
          <TabsTrigger value="applications" className="text-[9px] rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">
            Apps {pendingApps.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[8px] bg-red-500 border-0">{pendingApps.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="syndicates" className="text-[9px] rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">Team</TabsTrigger>
          <TabsTrigger value="tasks" className="text-[9px] rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">Tasks</TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-[9px] rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">
            Pay {pendingWithdrawals.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[8px] bg-red-500 border-0">{pendingWithdrawals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-[9px] rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-semibold">Price</TabsTrigger>
        </TabsList>

        {/* Applications */}
        <TabsContent value="applications" className="space-y-3">
          {pendingApps.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground">No pending applications</p>
            </div>
          )}
          {pendingApps.map(app => (
            <ApplicationCard key={app.id} app={app} onApprove={approveApplication} onReject={rejectApplication} />
          ))}
        </TabsContent>

        {/* Syndicates */}
        <TabsContent value="syndicates" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-xl bg-secondary/50 border-0" />
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">{syndicates.length} syndicate members</p>
          {syndicates.filter(s => !searchQuery || JSON.stringify(s).toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
            <Card key={s.id} className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {/* User header */}
                <div className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 p-4 flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-purple-200 shadow-sm">
                    <AvatarImage src={s.avatar_url || s._profile?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white font-bold text-sm">
                      {(s._profile?.display_name || s._profile?.email || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-foreground truncate">{s._profile?.display_name || s._profile?.email || 'Unknown User'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s._profile?.email || ''}</p>
                    {s.state && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{s.state}</p>}
                  </div>
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 rounded-full px-2.5 py-1">
                    <Star className="h-3 w-3 fill-purple-500" />
                    <span className="text-[11px] font-bold">{s.ranking_score || 0}</span>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-px bg-border/30">
                  <div className="bg-background p-3 text-center">
                    <p className="text-lg font-black text-purple-600">{s.tasks_completed || 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Tasks</p>
                  </div>
                  <div className="bg-background p-3 text-center">
                    <p className="text-lg font-black text-blue-600">{s.ranking_score || 0}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Score</p>
                  </div>
                  <div className="bg-background p-3 text-center">
                    <p className="text-lg font-black text-emerald-600">{(s.verified_platforms || []).length}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">Platforms</p>
                  </div>
                </div>
                {/* Platforms & Bank */}
                <div className="p-3 space-y-2">
                  <div className="flex gap-1 flex-wrap">
                    {(s.verified_platforms || []).map((p: string) => (
                      <Badge key={p} className="text-[9px] bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-0 gap-0.5 shadow-sm">
                        <CheckCircle className="h-2.5 w-2.5" />{p}
                      </Badge>
                    ))}
                    {(s.verified_platforms || []).length === 0 && <span className="text-[10px] text-muted-foreground">No platforms</span>}
                  </div>
                  {(s.bank_name || s.account_number) && (
                    <div className="bg-secondary/50 rounded-xl p-2.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Bank</p>
                      <p className="text-xs text-foreground font-medium">{s.bank_name} — {s.account_number}</p>
                      {s.account_name && <p className="text-[10px] text-muted-foreground">{s.account_name}</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* All Tasks */}
        <TabsContent value="tasks" className="space-y-3">
          {viewingTaskSubs ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-foreground">Task Submissions</h4>
                <Button size="sm" variant="ghost" onClick={() => setViewingTaskSubs(null)} className="text-xs rounded-xl">← Back</Button>
              </div>
              {taskAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center"><Eye className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-xs text-muted-foreground">No submissions yet</p>
                </div>
              ) : taskAssignments.map(a => (
                <Card key={a.id} className="border-0 shadow-md rounded-2xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge className={`rounded-full text-[10px] px-3 py-1 border-0 ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : a.status === 'submitted' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{a.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : 'Not submitted'}</span>
                    </div>
                    {a.proof_url && <img src={a.proof_url} alt="Proof" className="w-full rounded-xl border cursor-pointer hover:opacity-90 transition" onClick={() => window.open(a.proof_url, '_blank')} />}
                    {a.status === 'submitted' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs rounded-xl h-10 shadow-md" onClick={() => adminReviewAssignment(a.id, true)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve & Pay
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 text-xs rounded-xl h-10" onClick={() => adminReviewAssignment(a.id, false)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            allTasks.map(task => (
              <Card key={task.id} className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-foreground truncate">{task.title}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(task.placements || []).map((p: string) => <Badge key={p} className="text-[8px] bg-purple-100 text-purple-700 border-0 rounded-full">{p.replace(/_/g,' ')}</Badge>)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">₦{task.total_cost} · {task.max_syndicates} slots</p>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-[10px] h-9 rounded-xl shadow-sm px-4" onClick={() => viewTaskSubmissions(task.id)}>
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Withdrawals */}
        <TabsContent value="withdrawals" className="space-y-3">
          {pendingWithdrawals.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Wallet className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">No pending payouts</p>
              <p className="text-xs text-muted-foreground">All withdrawals processed</p>
            </div>
          )}
          {pendingWithdrawals.map(w => (
            <Card key={w.id} className="border-0 shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase opacity-80 font-semibold">Withdrawal Request</p>
                      <p className="text-2xl font-black">₦{w.amount?.toLocaleString()}</p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                  </div>
                  <p className="text-[11px] opacity-90 mt-1">{w._profile?.display_name || w._profile?.email || 'User'}</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Bank Details</p>
                    <p className="text-xs font-semibold text-foreground">{w.bank_name} — {w.account_number}</p>
                    <p className="text-[11px] text-muted-foreground">{w.account_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs rounded-xl h-10 shadow-md" onClick={() => processWithdrawal(w.id, true)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />Send Payment
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 text-xs rounded-xl h-10" onClick={() => processWithdrawal(w.id, false)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Platform Pricing */}
        <TabsContent value="pricing" className="space-y-3">
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <div>
                  <h4 className="font-bold text-sm">Platform Pricing</h4>
                  <p className="text-[10px] opacity-80">Set price per task for each platform</p>
                </div>
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              {platformPricing.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-secondary/30 rounded-xl p-3">
                  <span className="text-sm font-semibold flex-1 text-foreground">{p.platform_name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted-foreground">₦</span>
                    <Input type="number" defaultValue={p.price_per_task} className="h-9 w-24 text-sm rounded-lg bg-background font-semibold"
                      onBlur={e => { const v = parseFloat(e.target.value); if (v > 0 && v !== p.price_per_task) updatePlatformPrice(p.id, v); }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ApplicationCard = ({ app, onApprove, onReject }: { app: any; onApprove: (app: any, platforms: string[]) => void; onReject: (app: any) => void }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const influenceFields = [
    { key: 'whatsapp_influence', label: 'WhatsApp', platform: 'WhatsApp' },
    { key: 'facebook_influence', label: 'Facebook', platform: 'Facebook' },
    { key: 'telegram_influence', label: 'Telegram', platform: 'Telegram' },
    { key: 'tiktok_influence', label: 'TikTok', platform: 'TikTok' },
    { key: 'twitter_influence', label: 'Twitter/X', platform: 'Twitter/X' },
  ];

  return (
    <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-amber-400/20 to-orange-400/20 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-amber-200">
              <AvatarImage src={app._profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                {(app._profile?.display_name || app._profile?.email || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{app._profile?.display_name || app._profile?.email || 'Unknown'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{app._profile?.email}</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-0 rounded-full text-[10px] px-2.5"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
          </div>
          {app.state && <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="h-3 w-3" />{app.state}</p>}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">Social Channels</p>
          {influenceFields.map(f => app[f.key] && (
            <div key={f.key} className="flex items-start gap-3 bg-secondary/30 rounded-xl p-3">
              <Checkbox checked={selectedPlatforms.includes(f.platform)}
                onCheckedChange={() => setSelectedPlatforms(prev =>
                  prev.includes(f.platform) ? prev.filter(p => p !== f.platform) : [...prev, f.platform]
                )} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-foreground">{f.label}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{app[f.key]}</p>
              </div>
            </div>
          ))}
          {app.other_platforms && (
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Other Platforms</p>
              <p className="text-xs text-foreground mt-0.5">{app.other_platforms}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs h-11 rounded-xl shadow-md font-semibold" disabled={selectedPlatforms.length === 0}
              onClick={() => onApprove(app, selectedPlatforms)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve ({selectedPlatforms.length})
            </Button>
            <Button size="sm" variant="destructive" className="flex-1 text-xs h-11 rounded-xl font-semibold" onClick={() => onReject(app)}>
              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSyndicateManager;
