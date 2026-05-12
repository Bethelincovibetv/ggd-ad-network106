import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Briefcase, Upload, Loader2, Plus, Eye, CheckCircle, Clock, XCircle, Image as ImageIcon,
  User, MapPin, Calendar, Search, Archive, BarChart3, Trophy, Hourglass, Trash2, ChevronRight, Megaphone
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

const BusinessTaskCreator = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
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
  const [openTask, setOpenTask] = useState<any>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [bannerCostPerDay, setBannerCostPerDay] = useState<number>(50);
  const [converting, setConverting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tasksRes, walletRes, pricingRes, assignmentsRes] = await Promise.all([
      supabase.from('syndicate_tasks').select('*').eq('business_user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('platform_pricing').select('*').order('platform_name'),
      supabase.from('syndicate_task_assignments').select('*'),
    ]);

    const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'banner_credit_cost_per_day').maybeSingle();
    if (setting?.value) setBannerCostPerDay(parseInt(setting.value) || 50);

    const myTaskIds = new Set((tasksRes.data || []).map(t => t.id));
    const myAssignments = (assignmentsRes.data || []).filter(a => myTaskIds.has(a.task_id));

    setTasks(tasksRes.data || []);
    setWallet(walletRes.data);
    setPlatformPricing(pricingRes.data || []);
    setAllAssignments(myAssignments);

    // Load profiles for all syndicates that submitted to my tasks
    const userIds = [...new Set(myAssignments.map(a => a.syndicate_user_id))];
    if (userIds.length > 0) {
      const [{ data: profiles }, { data: synProfiles }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, email, avatar_url').in('user_id', userIds),
        supabase.from('syndicate_profiles').select('user_id, state, verified_platforms, ranking_score, tasks_completed').in('user_id', userIds),
      ]);
      const map: Record<string, any> = {};
      userIds.forEach(uid => {
        const p = (profiles || []).find(x => x.user_id === uid);
        const s = (synProfiles || []).find(x => x.user_id === uid);
        map[uid] = { ...(p || {}), ...(s || {}) };
      });
      setProfilesMap(map);
    }
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

  const togglePlacement = (id: string) =>
    setForm(prev => ({ ...prev,
      placements: prev.placements.includes(id) ? prev.placements.filter(p => p !== id) : [...prev.placements, id]
    }));

  const reviewSubmission = async (assignmentId: string, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    await supabase.from('syndicate_task_assignments').update({
      status, reviewed_at: new Date().toISOString(),
    }).eq('id', assignmentId);

    if (approve) {
      const assignment = allAssignments.find(s => s.id === assignmentId);
      if (assignment) {
        const task = tasks.find(t => t.id === assignment.task_id);
        const payout = task?.cost_per_syndicate || 50;
        const { data: synWallet } = await supabase.from('task_wallets').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
        if (synWallet) {
          await supabase.from('task_wallets').update({
            balance: (synWallet.balance || 0) + payout,
            total_earned: (synWallet.total_earned || 0) + payout,
          }).eq('user_id', assignment.syndicate_user_id);
        }
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
      const assignment = allAssignments.find(s => s.id === assignmentId);
      if (assignment) {
        await supabase.from('notifications').insert({
          user_id: assignment.syndicate_user_id,
          title: '❌ Task Rejected',
          message: 'Your task submission was rejected. Please review the requirements.',
          type: 'warning',
        });
      }
    }

    toast.success(approve ? "Approved & paid" : "Rejected");
    fetchData();
  };

  const archiveTask = async (taskId: string) => {
    if (!confirm('Move this task to Completed Campaigns? It will stop accepting new submissions.')) return;
    await supabase.from('syndicate_tasks').update({ status: 'completed' }).eq('id', taskId);
    toast.success('Moved to Completed Campaigns');
    fetchData();
  };

  const convertToBannerAd = async (task: any) => {
    const daysStr = prompt(`Convert "${task.title}" into a banner ad?\n\nCost: ${bannerCostPerDay} credits/day\n\nHow many days should the banner run?`, '7');
    if (!daysStr) return;
    const days = parseInt(daysStr);
    if (!days || days < 1) { toast.error('Enter valid days'); return; }
    const cost = days * bannerCostPerDay;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle();
    if (!profile || (profile.credits || 0) < cost) {
      toast.error(`Need ${cost} credits, have ${profile?.credits || 0}`);
      return;
    }
    if (!task.share_link) { toast.error('Campaign needs a share link to convert'); return; }

    setConverting(true);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { error: adErr } = await supabase.from('ads').insert({
      user_id: user.id,
      title: task.title,
      description: task.description,
      image_url: task.flyer_url || null,
      target_url: task.share_link,
      is_active: true,
      expires_at: expiresAt,
    });
    if (adErr) { toast.error('Failed to create banner ad'); setConverting(false); return; }

    await supabase.from('profiles').update({ credits: (profile.credits || 0) - cost }).eq('user_id', user.id);
    toast.success(`Banner ad live for ${days} days! ${cost} credits deducted.`);
    setConverting(false);
  };

  // Per-task stats
  const taskStats = useMemo(() => {
    const map: Record<string, { approved: number; pending: number; rejected: number; total: number; remaining: number }> = {};
    tasks.forEach(t => {
      const subs = allAssignments.filter(a => a.task_id === t.id);
      const approved = subs.filter(s => s.status === 'approved').length;
      const pending = subs.filter(s => s.status === 'submitted' || s.status === 'accepted').length;
      const rejected = subs.filter(s => s.status === 'rejected').length;
      map[t.id] = {
        approved, pending, rejected,
        total: subs.length,
        remaining: Math.max((t.max_syndicates || 0) - approved, 0),
      };
    });
    return map;
  }, [tasks, allAssignments]);

  if (loading) return <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status !== 'active');

  // Auto-completed: every slot approved
  const visibleActive = activeTasks.filter(t => {
    const s = taskStats[t.id];
    return !s || s.remaining > 0;
  });
  const autoCompleted = activeTasks.filter(t => {
    const s = taskStats[t.id];
    return s && s.remaining === 0 && s.approved >= (t.max_syndicates || 0);
  });
  const allCompleted = [...completedTasks, ...autoCompleted];

  const totalCostPreview = calculateTotalCost();

  const filterTasks = (list: any[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  };

  const renderTaskCard = (task: any, isCompleted: boolean) => {
    const s = taskStats[task.id] || { approved: 0, pending: 0, rejected: 0, total: 0, remaining: task.max_syndicates };
    const pct = task.max_syndicates ? Math.round((s.approved / task.max_syndicates) * 100) : 0;
    return (
      <Card key={task.id} className="overflow-hidden hover:shadow-md transition cursor-pointer" onClick={() => setOpenTask(task)}>
        <CardContent className="p-0">
          {task.flyer_url && (
            <div className="aspect-video bg-muted overflow-hidden">
              <img src={task.flyer_url} alt={task.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground line-clamp-1">{task.title}</h3>
              <Badge className={isCompleted ? 'bg-green-600 text-white text-[9px]' : 'bg-orange-500 text-white text-[9px]'}>
                {isCompleted ? 'completed' : 'live'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{s.approved}/{task.max_syndicates} approved</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <div className="bg-green-50 rounded p-1.5 text-center">
                <p className="text-[9px] text-green-700">Done</p>
                <p className="text-xs font-bold text-green-700">{s.approved}</p>
              </div>
              <div className="bg-yellow-50 rounded p-1.5 text-center">
                <p className="text-[9px] text-yellow-700">Pending</p>
                <p className="text-xs font-bold text-yellow-700">{s.pending}</p>
              </div>
              <div className="bg-blue-50 rounded p-1.5 text-center">
                <p className="text-[9px] text-blue-700">Left</p>
                <p className="text-xs font-bold text-blue-700">{s.remaining}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-[10px] text-muted-foreground">₦{task.total_cost} • {task.deadline_hours || 24}h</span>
              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setOpenTask(task); }}>
                <Eye className="h-3 w-3 mr-1" />View <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hero / Wallet Summary */}
      <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 text-white p-5 relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
            <Briefcase className="h-3.5 w-3.5" /> Business Console
          </div>
          <p className="text-[11px] mt-3 opacity-80">Task wallet balance</p>
          <p className="text-4xl font-black mt-0.5">₦{wallet?.balance?.toLocaleString() || 0}</p>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur">
              <Hourglass className="h-3 w-3 mx-auto opacity-80" />
              <p className="text-base font-bold mt-1">{visibleActive.length}</p>
              <p className="text-[9px] opacity-80 uppercase">Active</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur">
              <Trophy className="h-3 w-3 mx-auto opacity-80" />
              <p className="text-base font-bold mt-1">{allCompleted.length}</p>
              <p className="text-[9px] opacity-80 uppercase">Completed</p>
            </div>
            <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur">
              <BarChart3 className="h-3 w-3 mx-auto opacity-80" />
              <p className="text-base font-bold mt-1">{allAssignments.filter(a => a.status === 'approved').length}</p>
              <p className="text-[9px] opacity-80 uppercase">Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={() => setIsCreating(true)}
          className="h-auto py-3.5 flex-col gap-1 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md rounded-xl">
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">New Campaign</span>
        </Button>
        <Button variant="outline" onClick={fetchData}
          className="h-auto py-3.5 flex-col gap-1 rounded-xl border-2">
          <Eye className="h-5 w-5 text-orange-600" />
          <span className="text-xs font-semibold">Refresh</span>
        </Button>
      </div>

      {isCreating && (
        <Card className="border-orange-200">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Task title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Textarea placeholder="Write-up / ad copy *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
            <Input placeholder="Share link (optional)" value={form.share_link} onChange={e => setForm({...form, share_link: e.target.value})} />

            <div>
              <Label className="text-xs font-medium">Flyer / Image</Label>
              <input type="file" id="flyerUpload" accept="image/*" onChange={e => e.target.files?.[0] && uploadFlyer(e.target.files[0])} className="hidden" />
              <Button variant="outline" className="w-full mt-1 text-xs" disabled={uploading}
                onClick={() => document.getElementById('flyerUpload')?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Upload Flyer'}
              </Button>
              {flyerUrl && <img src={flyerUrl} alt="Flyer" className="w-full rounded-lg mt-2" />}
            </div>

            <div>
              <Label className="text-xs font-medium mb-2 block">Target Placements *</Label>
              <div className="space-y-2">
                {platformPricing.filter(p => p.is_active).map(p => {
                  const checked = form.placements.includes(p.platform_key);
                  return (
                    <button type="button" key={p.platform_key} onClick={() => togglePlacement(p.platform_key)}
                      className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg border transition ${checked ? 'border-orange-400 bg-orange-50' : 'border-border hover:bg-muted/40'}`}>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={checked} className="pointer-events-none" />
                        {p.icon_url && <img src={p.icon_url} alt={p.platform_name} className="h-5 w-5" />}
                        <span className="text-xs font-medium">{p.platform_name}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] text-green-700 border-green-300">₦{p.price_per_task}</Badge>
                    </button>
                  );
                })}
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
                <p className="text-xs text-orange-800">Total Cost: <strong>₦{totalCostPreview}</strong> ({form.max_syndicates} × placements)</p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={createTask} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">Create Task</Button>
              <Button onClick={() => setIsCreating(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Tabs Active vs Completed */}
      <Tabs defaultValue="active">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="active" className="text-xs">
            <Hourglass className="h-3.5 w-3.5 mr-1" />Active ({visibleActive.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            <Trophy className="h-3.5 w-3.5 mr-1" />Completed ({allCompleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 pt-3">
          {filterTasks(visibleActive).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
              <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-40" />
              No active campaigns. Create one above.
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filterTasks(visibleActive).map(t => renderTaskCard(t, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 pt-3">
          {filterTasks(allCompleted).length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
              <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
              No completed campaigns yet.
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {filterTasks(allCompleted).map(t => renderTaskCard(t, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task detail sheet — full submissions list */}
      <Sheet open={!!openTask} onOpenChange={o => { if (!o) { setOpenTask(null); setStatusFilter('all'); } }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {openTask && (() => {
            const subs = allAssignments.filter(a => a.task_id === openTask.id);
            const s = taskStats[openTask.id];
            const pct = openTask.max_syndicates ? Math.round((s.approved / openTask.max_syndicates) * 100) : 0;
            const filtered = subs.filter(sub => {
              if (statusFilter === 'all') return true;
              if (statusFilter === 'pending') return sub.status === 'submitted' || sub.status === 'accepted';
              return sub.status === statusFilter;
            });
            return (
              <>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5">
                  <SheetHeader className="text-left">
                    <SheetTitle className="text-white text-base line-clamp-1">{openTask.title}</SheetTitle>
                  </SheetHeader>
                  <p className="text-[11px] opacity-90 mt-1 line-clamp-2">{openTask.description}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="opacity-90">{s.approved}/{openTask.max_syndicates} approved</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2 bg-white/20" />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="bg-white/15 rounded p-2 text-center"><p className="text-[9px] opacity-80">Total</p><p className="text-sm font-bold">{subs.length}</p></div>
                    <div className="bg-white/15 rounded p-2 text-center"><p className="text-[9px] opacity-80">Done</p><p className="text-sm font-bold">{s.approved}</p></div>
                    <div className="bg-white/15 rounded p-2 text-center"><p className="text-[9px] opacity-80">Pending</p><p className="text-sm font-bold">{s.pending}</p></div>
                    <div className="bg-white/15 rounded p-2 text-center"><p className="text-[9px] opacity-80">Left</p><p className="text-sm font-bold">{s.remaining}</p></div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                      <Button key={f} size="sm" variant={statusFilter === f ? 'default' : 'outline'}
                        className="h-7 text-[10px] capitalize" onClick={() => setStatusFilter(f)}>{f}</Button>
                    ))}
                  </div>

                  {openTask.status === 'active' && (
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => archiveTask(openTask.id)}>
                      <Archive className="h-3 w-3 mr-1" />Mark campaign as completed
                    </Button>
                  )}

                  <Button size="sm" disabled={converting} className="w-full text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white"
                    onClick={() => convertToBannerAd(openTask)}>
                    {converting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Megaphone className="h-3 w-3 mr-1" />}
                    Convert to Banner Ad ({bannerCostPerDay} credits/day)
                  </Button>

                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No submissions to show</p>
                  )}

                  {filtered.map(sub => {
                    const profile = profilesMap[sub.syndicate_user_id] || {};
                    return (
                      <Card key={sub.id} className={
                        sub.status === 'approved' ? 'border-green-200 bg-green-50/30' :
                        sub.status === 'rejected' ? 'border-red-200 bg-red-50/30' :
                        'border-yellow-200'
                      }>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={profile.avatar_url || ''} />
                              <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                                {(profile.display_name || 'S').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">{profile.display_name || 'Syndicate'}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
                            </div>
                            <Badge className={
                              sub.status === 'approved' ? 'bg-green-600' :
                              sub.status === 'rejected' ? 'bg-red-600' :
                              'bg-yellow-500'
                            }>{sub.status}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                            {profile.state && <div className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{profile.state}</div>}
                            <div className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—'}</div>
                          </div>

                          {sub.proof_url && (
                            <div>
                              <p className="text-[10px] font-medium text-foreground mb-1">Proof:</p>
                              <button onClick={() => setZoomImage(sub.proof_url)} className="block w-full">
                                <img src={sub.proof_url} alt="Proof" className="w-full rounded-lg border" />
                              </button>
                            </div>
                          )}

                          {sub.status === 'submitted' && (
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 bg-green-600 text-white text-xs hover:bg-green-700" onClick={() => reviewSubmission(sub.id, true)}>
                                <CheckCircle className="h-3 w-3 mr-1" />Approve & Pay
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => reviewSubmission(sub.id, false)}>
                                <XCircle className="h-3 w-3 mr-1" />Reject
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Image zoom */}
      <Dialog open={!!zoomImage} onOpenChange={o => { if (!o) setZoomImage(null); }}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          {zoomImage && <img src={zoomImage} alt="Proof full size" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessTaskCreator;
