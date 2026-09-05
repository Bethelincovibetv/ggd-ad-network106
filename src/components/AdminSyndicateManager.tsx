import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, CheckCircle, XCircle, Clock, Wallet, DollarSign, MapPin, Eye, TrendingUp, Briefcase, Star, ArrowRight, Loader2, Ban, Snowflake, Sun, PauseCircle, PlayCircle, RotateCw, Zap, AlertTriangle, RefreshCw, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";
import { reviewSyndicateAssignment } from "@/services/syndicateTaskService";
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
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'pending' | 'completed' | 'failed' | 'all'>('pending');

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
    try {
      let reason: string | null = null;
      if (!approve) {
        reason = window.prompt("Reason for rejecting this withdrawal?", "Bank details invalid or flagged");
        if (reason === null) return;
      }
      const { data, error } = await callRpc('admin_process_withdrawal', {
        p_request_id: id,
        p_approve: approve,
        p_rejection_reason: reason,
      });

      if (error) throw error;
      const res = data as any;
      if (res && !res.success) {
        throw new Error(res.error || 'Failed to process withdrawal');
      }

      toast.success(approve ? "Withdrawal marked as paid manually" : "Withdrawal rejected & refunded");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal");
    }
  };

  const triggerPaystackPayout = async (withdrawalId: string, forceRetry = false) => {
    setProcessingPayoutId(withdrawalId);
    try {
      const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
        body: { withdrawal_id: withdrawalId, force_retry: forceRetry },
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || 'Paystack transfer failed');
      }

      if (data.status === 'completed') {
        toast.success("⚡ Paystack transfer successful! Funds sent to bank.");
      } else {
        toast.info(data.message || "⚡ Payout initiated via Paystack (processing)");
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Paystack transfer failed");
      fetchData();
    } finally {
      setProcessingPayoutId(null);
    }
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
    let reason: string | null = null;
    if (!approve) {
      reason = window.prompt("Why is this proof rejected? (shown to the syndicate)", "Proof unclear or invalid");
      if (reason === null) return; // cancelled
    }
    try {
      const res = await reviewSyndicateAssignment({
        assignmentId,
        approve,
        rejectionReason: reason,
      });

      if (!res.success) {
        throw new Error(res.error || 'Review failed');
      }

      toast.success(approve ? "Approved & paid!" : "Rejected");
      viewTaskSubmissions(viewingTaskSubs!);
    } catch (err: any) {
      toast.error(err.message || 'Review failed');
    }
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
                    <AvatarImage src={s._profile?.avatar_url || s.avatar_url} />
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
                  {(s.is_suspended || s.wallet_frozen) && (
                    <div className="flex flex-wrap gap-1">
                      {s.is_suspended && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]"><Ban className="h-3 w-3 mr-0.5" />Suspended{s.suspended_reason ? `: ${s.suspended_reason}` : ''}</Badge>}
                      {s.wallet_frozen && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]"><Snowflake className="h-3 w-3 mr-0.5" />Wallet frozen</Badge>}
                      {(s.failed_streak || 0) > 0 && <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Streak: {s.failed_streak} fails</Badge>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-9 text-[11px] rounded-xl" onClick={() => toggleSuspend(s)}>
                      {s.is_suspended ? <><Sun className="h-3.5 w-3.5 mr-1" />Unsuspend</> : <><Ban className="h-3.5 w-3.5 mr-1" />Suspend</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 text-[11px] rounded-xl" onClick={() => toggleFreezeWallet(s)}>
                      {s.wallet_frozen ? <><Sun className="h-3.5 w-3.5 mr-1" />Unfreeze</> : <><Snowflake className="h-3.5 w-3.5 mr-1" />Freeze Wallet</>}
                    </Button>
                  </div>
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
                    {a.proof_url && <img loading="lazy" src={a.proof_url} alt="Proof" className="w-full rounded-xl border cursor-pointer hover:opacity-90 transition" onClick={() => window.open(a.proof_url, '_blank')} />}
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
                    {(a.status === 'accepted' || a.status === 'assigned') && (
                      <Button size="sm" variant="outline" className="w-full text-xs rounded-xl h-10" onClick={() => forceReassign(a.id)}>
                        <RotateCw className="h-3.5 w-3.5 mr-1" />Force Reassign (release to pool)
                      </Button>
                    )}
                    {a.status === 'rejected' && a.rejection_reason && (
                      <div className="rounded-xl bg-red-50 border border-red-200 p-2 text-[11px] text-red-800">
                        <strong>Rejection reason:</strong> {a.rejection_reason}
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
        <TabsContent value="withdrawals" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl">
              {[
                { key: 'pending', label: '⏳ Pending / In-Flight' },
                { key: 'completed', label: '✅ Completed' },
                { key: 'failed', label: '⚠️ Failed / Rejected' },
                { key: 'all', label: '📋 All Records' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setWithdrawalFilter(f.key as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                    withdrawalFilter === f.key
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchData}
              className="rounded-xl h-8 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {(() => {
            const filtered = withdrawals.filter(w => {
              const s = w.status || 'pending';
              if (withdrawalFilter === 'pending') return ['pending', 'pending_admin', 'pending_automatic', 'processing'].includes(s);
              if (withdrawalFilter === 'completed') return s === 'completed';
              if (withdrawalFilter === 'failed') return ['failed', 'rejected', 'cancelled'].includes(s);
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 bg-secondary/20 rounded-2xl">
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Wallet className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No withdrawals in this filter</p>
                  <p className="text-xs text-muted-foreground">Change filter or refresh to view requests</p>
                </div>
              );
            }

            return filtered.map(w => {
              const isProcessingThis = processingPayoutId === w.id;
              const isPendingOrProcessing = ['pending', 'pending_admin', 'pending_automatic', 'processing'].includes(w.status || 'pending');
              const isCompleted = w.status === 'completed';
              const isFailed = ['failed', 'rejected', 'cancelled'].includes(w.status);

              return (
                <Card key={w.id} className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className={`p-4 text-white ${
                      isCompleted ? 'bg-gradient-to-r from-emerald-600 to-teal-600' :
                      isFailed ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                      w.status === 'processing' ? 'bg-gradient-to-r from-cyan-600 to-blue-600' :
                      'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">Withdrawal Request</span>
                            {w.payout_mode === 'automatic' ? (
                              <Badge className="bg-white/25 text-white border-0 text-[9px] font-bold">
                                <Zap className="h-3 w-3 mr-0.5" /> Auto (Paystack)
                              </Badge>
                            ) : (
                              <Badge className="bg-white/20 text-white border-0 text-[9px] font-medium">
                                👤 Manual Transfer
                              </Badge>
                            )}
                          </div>
                          <p className="text-2xl font-black mt-0.5">₦{Number(w.amount)?.toLocaleString()}</p>
                          <p className="text-[11px] opacity-90">{w._profile?.display_name || w._profile?.email || 'Syndicate Member'}</p>
                        </div>
                        <Badge className="bg-white/25 text-white border-0 text-[10px] font-bold px-2.5 py-1">
                          {isCompleted ? <CheckCircle className="h-3 w-3 mr-1" /> :
                           w.status === 'processing' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
                           isFailed ? <AlertTriangle className="h-3 w-3 mr-1" /> :
                           <Clock className="h-3 w-3 mr-1" />}
                          {w.status === 'pending_automatic' ? 'Pending Auto' :
                           w.status === 'pending_admin' ? 'Pending Admin' :
                           w.status === 'processing' ? 'Processing Transfer' :
                           w.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="bg-secondary/40 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground">
                          <span>Bank Account</span>
                          <span>Requested: {new Date(w.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-sm text-foreground">{w.bank_name} — {w.account_number}</p>
                        <p className="text-muted-foreground font-medium">{w.account_name}</p>

                        {(w.paystack_reference || w.paystack_transfer_code || w.failure_reason) && (
                          <div className="pt-2 mt-2 border-t border-border/40 space-y-1 text-[11px]">
                            {w.paystack_reference && (
                              <p className="text-muted-foreground font-mono text-[10px]">
                                <span className="font-semibold text-foreground">Paystack Ref:</span> {w.paystack_reference}
                              </p>
                            )}
                            {w.paystack_transfer_code && (
                              <p className="text-muted-foreground font-mono text-[10px]">
                                <span className="font-semibold text-foreground">Transfer Code:</span> {w.paystack_transfer_code}
                              </p>
                            )}
                            {w.failure_reason && (
                              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-2 text-red-700 dark:text-red-300 text-[11px] font-medium">
                                <strong>Failure Reason:</strong> {w.failure_reason} (Credits were safely restored)
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {isPendingOrProcessing && (
                          <>
                            <Button
                              size="sm"
                              disabled={isProcessingThis}
                              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs rounded-xl h-10 font-bold shadow-md"
                              onClick={() => triggerPaystackPayout(w.id, w.status === 'processing')}
                            >
                              {isProcessingThis ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Zap className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              {w.status === 'processing' ? 'Re-check / Retry Paystack' : '⚡ Pay via Paystack'}
                            </Button>

                            <Button
                              size="sm"
                              disabled={isProcessingThis}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-xs rounded-xl h-10 font-bold shadow-md"
                              onClick={() => processWithdrawal(w.id, true)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Paid Manually
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isProcessingThis}
                              className="text-xs rounded-xl h-10 px-3.5 font-bold"
                              onClick={() => processWithdrawal(w.id, false)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject & Refund
                            </Button>
                          </>
                        )}

                        {isFailed && (
                          <div className="flex w-full gap-2">
                            <Button
                              size="sm"
                              disabled={isProcessingThis}
                              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs rounded-xl h-10 font-bold shadow-md"
                              onClick={() => triggerPaystackPayout(w.id, true)}
                            >
                              {isProcessingThis ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                              🔄 Retry Paystack Transfer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessingThis}
                              className="flex-1 text-xs rounded-xl h-10 font-bold"
                              onClick={() => processWithdrawal(w.id, true)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Mark Paid Manually
                            </Button>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="w-full text-center py-1 text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Settled on {w.processed_at ? new Date(w.processed_at).toLocaleString() : 'Record'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}
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
