import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Upload, Loader2, Plus, Eye, CheckCircle, Clock, XCircle, Image, User, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

const BusinessTaskCreator = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [platformPricing, setPlatformPricing] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', share_link: '', max_syndicates: '10',
    placements: [] as string[], target_state: '', deadline_hours: '24',
  });
  const [flyerUrl, setFlyerUrl] = useState('');
  const [viewingTask, setViewingTask] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionProfiles, setSubmissionProfiles] = useState<Record<string, any>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tasksRes, walletRes, pricingRes] = await Promise.all([
      supabase.from('syndicate_tasks').select('*').eq('business_user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('platform_pricing').select('*').order('platform_name'),
    ]);

    setTasks(tasksRes.data || []);
    setWallet(walletRes.data);
    setPlatformPricing(pricingRes.data || []);
    setLoading(false);
  };

  const uploadFlyer = async (file: File) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('task-flyers').upload(fileName, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('task-flyers').getPublicUrl(fileName);
    setFlyerUrl(publicUrl);
    setUploading(false);
  };

  const calculateTotalCost = () => {
    const maxSyndicates = parseInt(form.max_syndicates) || 1;
    let perSyndicateCost = 0;
    form.placements.forEach(pKey => {
      const pricing = platformPricing.find(p => p.platform_key === pKey);
      perSyndicateCost += pricing ? Number(pricing.price_per_task) : 50;
    });
    return maxSyndicates * perSyndicateCost;
  };

  const createTask = async () => {
    if (!form.title.trim() || !form.description.trim()) { toast.error("Title and description required"); return; }
    if (form.placements.length === 0) { toast.error("Select at least one placement"); return; }

    const totalCost = calculateTotalCost();
    if (!wallet || wallet.balance < totalCost) {
      toast.error(`Insufficient wallet balance. Need ₦${totalCost}, have ₦${wallet?.balance || 0}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const maxSyndicates = parseInt(form.max_syndicates) || 10;
    const costPerSyndicate = totalCost / maxSyndicates;

    const { error } = await supabase.from('syndicate_tasks').insert({
      business_user_id: user.id, title: form.title, description: form.description,
      flyer_url: flyerUrl || null, share_link: form.share_link || null,
      placements: form.placements, target_state: form.target_state || null,
      max_syndicates: maxSyndicates, cost_per_syndicate: costPerSyndicate,
      total_cost: totalCost, deadline_hours: parseInt(form.deadline_hours) || 24,
    });

    if (error) { toast.error("Failed to create task"); return; }

    await supabase.from('task_wallets').update({
      balance: wallet.balance - totalCost,
      total_spent: (wallet.total_spent || 0) + totalCost,
    }).eq('user_id', user.id);

    toast.success("Task created! Syndicates will be notified.");
    setForm({ title: '', description: '', share_link: '', max_syndicates: '10', placements: [], target_state: '', deadline_hours: '24' });
    setFlyerUrl('');
    setIsCreating(false);
    fetchData();
  };

  const togglePlacement = (id: string) => {
    setForm(prev => ({
      ...prev,
      placements: prev.placements.includes(id) ? prev.placements.filter(p => p !== id) : [...prev.placements, id],
    }));
  };

  const viewSubmissions = async (taskId: string) => {
    setViewingTask(taskId);
    const { data } = await supabase.from('syndicate_task_assignments').select('*').eq('task_id', taskId);
    const subs = data || [];
    setSubmissions(subs);

    // Fetch profiles for each syndicate user
    const userIds = [...new Set(subs.map(s => s.syndicate_user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const { data: synProfiles } = await supabase.from('syndicate_profiles').select('*').in('user_id', userIds);
      const map: Record<string, any> = {};
      userIds.forEach(uid => {
        const profile = (profiles || []).find(p => p.user_id === uid);
        const synProfile = (synProfiles || []).find(p => p.user_id === uid);
        map[uid] = { ...(profile || {}), ...(synProfile || {}) };
      });
      setSubmissionProfiles(map);
    }
  };

  const reviewSubmission = async (assignmentId: string, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    await supabase.from('syndicate_task_assignments').update({
      status, reviewed_at: new Date().toISOString(),
    }).eq('id', assignmentId);

    if (approve) {
      const assignment = submissions.find(s => s.id === assignmentId);
      if (assignment) {
        const task = tasks.find(t => t.id === assignment.task_id);
        const payout = task?.cost_per_syndicate || 50;
        const { data: syndicateWallet } = await supabase.from('task_wallets').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
        if (syndicateWallet) {
          await supabase.from('task_wallets').update({
            balance: (syndicateWallet.balance || 0) + payout,
            total_earned: (syndicateWallet.total_earned || 0) + payout,
          }).eq('user_id', assignment.syndicate_user_id);
        }
        // Update syndicate profile stats
        const { data: synProfile } = await supabase.from('syndicate_profiles').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
        if (synProfile) {
          await supabase.from('syndicate_profiles').update({
            tasks_completed: (synProfile.tasks_completed || 0) + 1,
            ranking_score: (synProfile.ranking_score || 0) + 10,
          }).eq('user_id', assignment.syndicate_user_id);
        }

        await supabase.from('notifications').insert({
          user_id: assignment.syndicate_user_id,
          title: '💰 Task Approved!',
          message: `Your task submission was approved! ₦${payout} credited to your wallet.`,
          type: 'credit',
        });
      }
    } else {
      const assignment = submissions.find(s => s.id === assignmentId);
      if (assignment) {
        await supabase.from('notifications').insert({
          user_id: assignment.syndicate_user_id,
          title: '❌ Task Rejected',
          message: `Your task submission was rejected. Please review the requirements.`,
          type: 'warning',
        });
      }
    }

    toast.success(approve ? "Submission approved & paid!" : "Submission rejected");
    viewSubmissions(viewingTask!);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const totalCostPreview = calculateTotalCost();
  const activeTaskCount = tasks.filter(t => t.status === 'active').length;
  const completedTaskCount = tasks.filter(t => t.status !== 'active').length;

  return (
    <div className="space-y-4">
      {/* Hero / Wallet Summary */}
      <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white p-5 relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
            <Briefcase className="h-3.5 w-3.5" /> Business Console
          </div>
          <p className="text-[11px] mt-3 opacity-80">Task wallet balance</p>
          <p className="text-4xl font-black mt-0.5">₦{wallet?.balance?.toLocaleString() || 0}</p>
          <div className="flex items-center gap-3 mt-3 text-[11px] opacity-90">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {activeTaskCount} active</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {completedTaskCount} done</span>
          </div>
        </div>
      </div>

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={() => setIsCreating(true)}
          className="h-auto py-3.5 flex-col gap-1 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md rounded-xl">
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">New Task</span>
        </Button>
        <Button variant="outline" onClick={fetchData}
          className="h-auto py-3.5 flex-col gap-1 rounded-xl border-2">
          <Eye className="h-5 w-5 text-orange-600" />
          <span className="text-xs font-semibold">Refresh</span>
        </Button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base font-bold text-foreground">My Tasks</h2>
        <Badge variant="outline" className="text-[10px]">{tasks.length} total</Badge>
      </div>

      {isCreating && (
        <Card className="border-orange-200">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Task title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Textarea placeholder="Write-up / ad copy *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
            <Input placeholder="Share link (optional)" value={form.share_link} onChange={e => setForm({...form, share_link: e.target.value})} />

            {/* Flyer Upload */}
            <div>
              <Label className="text-xs font-medium">Flyer / Image</Label>
              <input type="file" id="flyerUpload" accept="image/*" onChange={e => e.target.files?.[0] && uploadFlyer(e.target.files[0])} className="hidden" />
              <Button variant="outline" className="w-full mt-1 text-xs" disabled={uploading}
                onClick={() => document.getElementById('flyerUpload')?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Image className="h-4 w-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Upload Flyer'}
              </Button>
              {flyerUrl && <img src={flyerUrl} alt="Flyer" className="w-full rounded-lg mt-2" />}
            </div>

            {/* Social Placements with Prices */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Target Placements * (each has its own price)</Label>
              <div className="space-y-2">
                {platformPricing.filter(p => p.is_active).map(p => (
                  <div key={p.platform_key} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.placements.includes(p.platform_key)} onCheckedChange={() => togglePlacement(p.platform_key)} />
                      <span className="text-xs">{p.platform_name}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] text-green-700 border-green-300">₦{p.price_per_task}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Max Syndicates</Label>
                <Input type="number" value={form.max_syndicates} onChange={e => setForm({...form, max_syndicates: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Target State</Label>
                <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={form.target_state} onChange={e => setForm({...form, target_state: e.target.value})}>
                  <option value="">All States</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Deadline (hrs)</Label>
                <Input type="number" value={form.deadline_hours} onChange={e => setForm({...form, deadline_hours: e.target.value})} className="mt-1" />
              </div>
            </div>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-3">
                <p className="text-xs text-orange-800">Total Cost: <strong>₦{totalCostPreview}</strong> ({form.max_syndicates} syndicates × selected placements)</p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={createTask} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">Create Task</Button>
              <Button onClick={() => setIsCreating(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Detail View */}
      {viewingTask && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">Task Submissions</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setViewingTask(null)} className="text-xs">Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No submissions yet</p>
            ) : submissions.map(sub => {
              const profile = submissionProfiles[sub.syndicate_user_id] || {};
              return (
                <Card key={sub.id} className={`border ${sub.status === 'approved' ? 'border-green-200 bg-green-50/50' : sub.status === 'rejected' ? 'border-red-200 bg-red-50/50' : 'border-yellow-200'}`}>
                  <CardContent className="p-3 space-y-2">
                    {/* Syndicate Profile Info */}
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground">{profile.display_name || 'Syndicate'}</p>
                        <p className="text-[10px] text-muted-foreground">{profile.email}</p>
                      </div>
                      <Badge className={
                        sub.status === 'approved' ? 'bg-green-500' :
                        sub.status === 'rejected' ? 'bg-red-500' :
                        sub.status === 'submitted' ? 'bg-yellow-500' : 'bg-blue-500'
                      }>
                        {sub.status}
                      </Badge>
                    </div>

                    {/* Syndicate Details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {profile.state && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />{profile.state}
                        </div>
                      )}
                      {profile.verified_platforms?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {profile.verified_platforms.map((p: string) => (
                            <Badge key={p} className="text-[8px] bg-purple-100 text-purple-700 h-4">{p}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'Pending'}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="h-3 w-3" />
                        Tasks done: {profile.tasks_completed || 0}
                      </div>
                    </div>

                    {/* Proof Screenshot */}
                    {sub.proof_url && (
                      <div>
                        <p className="text-[10px] font-medium text-foreground mb-1">Screenshot Proof:</p>
                        <img src={sub.proof_url} alt="Proof screenshot" className="w-full rounded-lg border cursor-pointer" onClick={() => window.open(sub.proof_url, '_blank')} />
                      </div>
                    )}

                    {/* Approve/Reject only for submitted status */}
                    {sub.status === 'submitted' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" onClick={() => reviewSubmission(sub.id, true)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Approve & Pay
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => reviewSubmission(sub.id, false)}>
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                    )}

                    {sub.reviewed_at && (
                      <p className="text-[9px] text-muted-foreground">Reviewed: {new Date(sub.reviewed_at).toLocaleString()}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map(task => (
          <Card key={task.id}>
            <CardContent className="p-3">
              {task.flyer_url && <img src={task.flyer_url} alt={task.title} className="w-full rounded-lg mb-2" />}
              <h3 className="font-semibold text-sm text-foreground">{task.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(task.placements || []).map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-[9px]">{p.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                {task.target_state && <span><MapPin className="h-3 w-3 inline" /> {task.target_state}</span>}
                <span><Clock className="h-3 w-3 inline" /> {task.deadline_hours || 24}h deadline</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted-foreground">₦{task.total_cost} total | {task.max_syndicates} syndicates</span>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => viewSubmissions(task.id)}>
                  <Eye className="h-3 w-3 mr-1" />View Submissions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BusinessTaskCreator;
