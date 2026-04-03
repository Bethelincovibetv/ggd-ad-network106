import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, CheckCircle, XCircle, Clock, Wallet, Settings, DollarSign, MapPin, Eye } from "lucide-react";
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [appsRes, syndicatesRes, withdrawalsRes, tasksRes, pricingRes, profilesRes] = await Promise.all([
      supabase.from('syndicate_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').order('ranking_score', { ascending: false }),
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('syndicate_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_pricing').select('*').order('platform_name'),
      supabase.from('profiles').select('user_id, email, display_name, avatar_url'),
    ]);

    // Enrich syndicates and applications with profile info
    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    setApplications((appsRes.data || []).map((a: any) => ({ ...a, _profile: profileMap[a.user_id] })));
    setSyndicates((syndicatesRes.data || []).map((s: any) => ({ ...s, _profile: profileMap[s.user_id] })));
    setWithdrawals((withdrawalsRes.data || []).map((w: any) => ({ ...w, _profile: profileMap[w.user_id] })));
    setAllTasks(tasksRes.data || []);
    setPlatformPricing(pricingRes.data || []);
    setLoading(false);
  };

  const approveApplication = async (app: any, platforms: string[]) => {
    await supabase.from('syndicate_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.from('syndicate_profiles').insert({ user_id: app.user_id, verified_platforms: platforms, state: app.state || null });
    await supabase.from('user_roles').insert({ user_id: app.user_id, role: 'syndicate' });
    await supabase.from('task_wallets').insert({ user_id: app.user_id });
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
      const { data: wallet } = await supabase.from('task_wallets').select('*').eq('user_id', withdrawal.user_id).maybeSingle();
      if (wallet) await supabase.from('task_wallets').update({ balance: wallet.balance + withdrawal.amount }).eq('user_id', withdrawal.user_id);
    }
    if (withdrawal) {
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: approve ? '💰 Withdrawal Processed' : '❌ Withdrawal Rejected',
        message: approve ? `₦${withdrawal.amount} sent to your bank.` : `₦${withdrawal.amount} refunded to wallet.`,
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
    await supabase.from('syndicate_task_assignments').update({ status, reviewed_at: new Date().toISOString() }).eq('id', assignmentId);

    if (approve && assignment) {
      const task = allTasks.find(t => t.id === assignment.task_id);
      const payout = task?.cost_per_syndicate || 50;
      const { data: wallet } = await supabase.from('task_wallets').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
      if (wallet) {
        await supabase.from('task_wallets').update({
          balance: (wallet.balance || 0) + payout, total_earned: (wallet.total_earned || 0) + payout,
        }).eq('user_id', assignment.syndicate_user_id);
      }
      const { data: synProfile } = await supabase.from('syndicate_profiles').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
      if (synProfile) {
        await supabase.from('syndicate_profiles').update({
          tasks_completed: (synProfile.tasks_completed || 0) + 1, ranking_score: (synProfile.ranking_score || 0) + 10,
        }).eq('user_id', assignment.syndicate_user_id);
      }
      await supabase.from('notifications').insert({
        user_id: assignment.syndicate_user_id, title: '💰 Task Approved by Admin!',
        message: `₦${payout} credited to your wallet.`, type: 'credit',
      });
    }
    toast.success(approve ? "Approved & paid!" : "Rejected");
    viewTaskSubmissions(viewingTaskSubs!);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const pendingApps = applications.filter(a => a.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  return (
    <Tabs defaultValue="applications" className="space-y-4">
      <TabsList className="w-full grid grid-cols-5">
        <TabsTrigger value="applications" className="text-[9px]">
          Apps {pendingApps.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[8px] bg-red-500">{pendingApps.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="syndicates" className="text-[9px]">Syndicates</TabsTrigger>
        <TabsTrigger value="tasks" className="text-[9px]">Tasks</TabsTrigger>
        <TabsTrigger value="withdrawals" className="text-[9px]">
          Payouts {pendingWithdrawals.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[8px] bg-red-500">{pendingWithdrawals.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="pricing" className="text-[9px]">Pricing</TabsTrigger>
      </TabsList>

      {/* Applications */}
      <TabsContent value="applications" className="space-y-3">
        {pendingApps.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No pending applications</p>}
        {pendingApps.map(app => (
          <ApplicationCard key={app.id} app={app} onApprove={approveApplication} onReject={rejectApplication} />
        ))}
      </TabsContent>

      {/* Syndicates */}
      <TabsContent value="syndicates" className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search syndicates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <p className="text-xs text-muted-foreground">{syndicates.length} syndicate members</p>
        {syndicates.filter(s => !searchQuery || JSON.stringify(s).toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
          <Card key={s.id} className="border">
            <CardContent className="p-4 space-y-3">
              {/* User identity */}
              <div className="flex items-center gap-3">
                {s.avatar_url || s._profile?.avatar_url ? (
                  <img src={s.avatar_url || s._profile?.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover border-2 border-purple-200" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{s._profile?.display_name || s._profile?.email || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{s._profile?.email || ''}</p>
                  {s.state && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{s.state}</p>}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-purple-700">{s.tasks_completed || 0}</p>
                  <p className="text-[9px] text-purple-600">Tasks Done</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{s.ranking_score || 0}</p>
                  <p className="text-[9px] text-blue-600">Score</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-700">{(s.verified_platforms || []).length}</p>
                  <p className="text-[9px] text-green-600">Platforms</p>
                </div>
              </div>

              {/* Verified platforms */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">VERIFIED PLATFORMS</p>
                <div className="flex gap-1 flex-wrap">
                  {(s.verified_platforms || []).map((p: string) => (
                    <Badge key={p} className="text-[10px] bg-purple-100 text-purple-700 gap-1">
                      <CheckCircle className="h-3 w-3" />{p}
                    </Badge>
                  ))}
                  {(s.verified_platforms || []).length === 0 && <span className="text-[10px] text-muted-foreground">None assigned</span>}
                </div>
              </div>

              {/* Bank details */}
              {(s.bank_name || s.account_number) && (
                <div className="bg-muted/30 rounded-lg p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">BANK DETAILS</p>
                  <p className="text-xs text-foreground">{s.bank_name} — {s.account_number}</p>
                  {s.account_name && <p className="text-[10px] text-muted-foreground">{s.account_name}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {/* All Tasks (Admin can review) */}
      <TabsContent value="tasks" className="space-y-3">
        {viewingTaskSubs ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm text-foreground">Task Submissions</h4>
              <Button size="sm" variant="ghost" onClick={() => setViewingTaskSubs(null)} className="text-xs">Back</Button>
            </div>
            {taskAssignments.length === 0 ? <p className="text-center py-4 text-xs text-muted-foreground">No submissions</p> :
              taskAssignments.map(a => (
                <Card key={a.id} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge className={a.status === 'approved' ? 'bg-green-500' : a.status === 'rejected' ? 'bg-red-500' : a.status === 'submitted' ? 'bg-yellow-500' : 'bg-blue-500'}>{a.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : 'Not submitted'}</span>
                    </div>
                    {a.proof_url && <img src={a.proof_url} alt="Proof" className="w-full rounded-lg border cursor-pointer" onClick={() => window.open(a.proof_url, '_blank')} />}
                    {a.status === 'submitted' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" onClick={() => adminReviewAssignment(a.id, true)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => adminReviewAssignment(a.id, false)}>
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          allTasks.map(task => (
            <Card key={task.id}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-xs text-foreground">{task.title}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{task.description}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(task.placements || []).map((p: string) => <Badge key={p} variant="secondary" className="text-[8px]">{p.replace(/_/g,' ')}</Badge>)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">₦{task.total_cost} | {task.max_syndicates} syndicates | {task.deadline_hours || 24}h</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => viewTaskSubmissions(task.id)}>
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
        {pendingWithdrawals.map(w => (
          <Card key={w.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-bold text-foreground">₦{w.amount}</p>
                <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{w.bank_name} - {w.account_number} ({w.account_name})</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" onClick={() => processWithdrawal(w.id, true)}>
                  <CheckCircle className="h-3 w-3 mr-1" />Approve
                </Button>
                <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => processWithdrawal(w.id, false)}>
                  <XCircle className="h-3 w-3 mr-1" />Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingWithdrawals.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No pending withdrawals</p>}
      </TabsContent>

      {/* Platform Pricing */}
      <TabsContent value="pricing" className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Platform Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[10px] text-muted-foreground">Set price per task for each social media platform</p>
            {platformPricing.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-xs flex-1">{p.platform_name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">₦</span>
                  <Input type="number" defaultValue={p.price_per_task} className="h-8 w-20 text-sm"
                    onBlur={e => { const v = parseFloat(e.target.value); if (v > 0 && v !== p.price_per_task) updatePlatformPrice(p.id, v); }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
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
    <Card className="border-yellow-200">
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
          {app.state && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{app.state}</span>}
        </div>
        <p className="text-[10px] font-medium text-foreground">Select platforms to approve:</p>
        {influenceFields.map(f => app[f.key] && (
          <div key={f.key} className="flex items-center gap-2">
            <Checkbox checked={selectedPlatforms.includes(f.platform)}
              onCheckedChange={() => setSelectedPlatforms(prev =>
                prev.includes(f.platform) ? prev.filter(p => p !== f.platform) : [...prev, f.platform]
              )} />
            <div>
              <span className="text-xs font-medium">{f.label}:</span>
              <span className="text-xs text-muted-foreground ml-1">{app[f.key]}</span>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" disabled={selectedPlatforms.length === 0}
            onClick={() => onApprove(app, selectedPlatforms)}>
            <CheckCircle className="h-3 w-3 mr-1" />Approve
          </Button>
          <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => onReject(app)}>
            <XCircle className="h-3 w-3 mr-1" />Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSyndicateManager;
