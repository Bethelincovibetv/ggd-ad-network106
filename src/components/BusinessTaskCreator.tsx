import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Upload, Loader2, Plus, Eye, CheckCircle, Clock, XCircle, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SOCIAL_PLACEMENTS = [
  { id: 'whatsapp_status', label: 'Share to WhatsApp Status' },
  { id: 'whatsapp_broadcast', label: 'Share to WhatsApp Broadcast/Chats (up to 50)' },
  { id: 'whatsapp_group', label: 'Share to WhatsApp Group' },
  { id: 'facebook_group', label: 'Share to Facebook Group' },
  { id: 'telegram_group', label: 'Share to Telegram Group' },
  { id: 'telegram_channel', label: 'Share to Telegram Channel' },
  { id: 'tiktok_group', label: 'Share to TikTok Group' },
  { id: 'tiktok_video', label: 'Post TikTok Video' },
  { id: 'ggd_banner', label: 'Post on GGD Ad Network Banner' },
];

const BusinessTaskCreator = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [costPerSyndicate, setCostPerSyndicate] = useState(50);
  const [form, setForm] = useState({
    title: '', description: '', share_link: '', max_syndicates: '10',
    placements: [] as string[], locations: '',
  });
  const [flyerUrl, setFlyerUrl] = useState('');
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tasksRes, walletRes, settingsRes] = await Promise.all([
      supabase.from('syndicate_tasks').select('*').eq('business_user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('*').eq('key', 'task_cost_per_syndicate').maybeSingle(),
    ]);

    setTasks(tasksRes.data || []);
    setWallet(walletRes.data);
    if (settingsRes.data) setCostPerSyndicate(parseInt(settingsRes.data.value) || 50);
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

  const createTask = async () => {
    if (!form.title.trim() || !form.description.trim()) { toast.error("Title and description required"); return; }
    if (form.placements.length === 0) { toast.error("Select at least one placement"); return; }

    const maxSyndicates = parseInt(form.max_syndicates) || 10;
    const totalCost = maxSyndicates * costPerSyndicate;

    if (!wallet || wallet.balance < totalCost) {
      toast.error(`Insufficient wallet balance. Need ₦${totalCost}, have ₦${wallet?.balance || 0}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('syndicate_tasks').insert({
      business_user_id: user.id,
      title: form.title,
      description: form.description,
      flyer_url: flyerUrl || null,
      share_link: form.share_link || null,
      target_placements: form.placements,
      target_locations: form.locations ? form.locations.split(',').map(l => l.trim()) : [],
      max_syndicates: maxSyndicates,
      cost_per_syndicate: costPerSyndicate,
      total_cost: totalCost,
    });

    if (error) { toast.error("Failed to create task"); return; }

    // Deduct from wallet
    await supabase.from('task_wallets').update({
      balance: wallet.balance - totalCost,
      total_spent: (wallet.total_spent || 0) + totalCost,
    }).eq('user_id', user.id);

    toast.success("Task created! Syndicates will be notified.");
    setForm({ title: '', description: '', share_link: '', max_syndicates: '10', placements: [], locations: '' });
    setFlyerUrl('');
    setIsCreating(false);
    fetchData();
  };

  const togglePlacement = (id: string) => {
    setForm(prev => ({
      ...prev,
      placements: prev.placements.includes(id)
        ? prev.placements.filter(p => p !== id)
        : [...prev.placements, id],
    }));
  };

  const viewSubmissions = async (taskId: string) => {
    setViewingSubmissions(taskId);
    const { data } = await supabase.from('syndicate_task_assignments').select('*').eq('task_id', taskId);
    setSubmissions(data || []);
  };

  const reviewSubmission = async (assignmentId: string, approve: boolean) => {
    const status = approve ? 'approved' : 'rejected';
    await supabase.from('syndicate_task_assignments').update({
      status, reviewed_at: new Date().toISOString(),
    }).eq('id', assignmentId);

    if (approve) {
      const assignment = submissions.find(s => s.id === assignmentId);
      if (assignment) {
        // Credit syndicate wallet
        const { data: syndicateWallet } = await supabase.from('task_wallets').select('*').eq('user_id', assignment.syndicate_user_id).maybeSingle();
        if (syndicateWallet) {
          await supabase.from('task_wallets').update({
            balance: syndicateWallet.balance + costPerSyndicate,
          }).eq('user_id', assignment.syndicate_user_id);
        }

        // Notify syndicate
        await supabase.from('notifications').insert({
          user_id: assignment.syndicate_user_id,
          title: '💰 Task Approved!',
          message: `Your task submission was approved! ₦${costPerSyndicate} credited to your wallet.`,
          type: 'credit',
        });
      }
    }

    toast.success(approve ? "Submission approved & paid!" : "Submission rejected");
    viewSubmissions(viewingSubmissions!);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const totalCostPreview = (parseInt(form.max_syndicates) || 0) * costPerSyndicate;

  return (
    <div className="space-y-4">
      {/* Wallet Summary */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Task Wallet Balance</p>
            <p className="text-2xl font-bold text-green-700">₦{wallet?.balance || 0}</p>
          </div>
          <Badge variant="outline" className="text-green-700 border-green-300">
            ₦{costPerSyndicate}/syndicate
          </Badge>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-foreground">My Tasks</h2>
        <Button onClick={() => setIsCreating(true)} size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">
          <Plus className="h-3 w-3 mr-1" />Create Task
        </Button>
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

            {/* Social Placements */}
            <div>
              <Label className="text-xs font-medium mb-2 block">Target Placements *</Label>
              <div className="space-y-2">
                {SOCIAL_PLACEMENTS.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Checkbox checked={form.placements.includes(p.id)} onCheckedChange={() => togglePlacement(p.id)} />
                    <span className="text-xs">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Max Syndicates</Label>
                <Input type="number" value={form.max_syndicates} onChange={e => setForm({...form, max_syndicates: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Target Locations</Label>
                <Input value={form.locations} onChange={e => setForm({...form, locations: e.target.value})} className="mt-1" placeholder="Lagos, Abuja..." />
              </div>
            </div>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-3">
                <p className="text-xs text-orange-800">Total Cost: <strong>₦{totalCostPreview}</strong> ({form.max_syndicates} syndicates × ₦{costPerSyndicate})</p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={createTask} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs">Create Task</Button>
              <Button onClick={() => setIsCreating(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions View */}
      {viewingSubmissions && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">Submissions</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setViewingSubmissions(null)} className="text-xs">Close</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No submissions yet</p>
            ) : submissions.map(sub => (
              <Card key={sub.id} className="border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className={sub.status === 'approved' ? 'bg-green-500' : sub.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}>
                      {sub.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>
                  {sub.proof_screenshot_url && (
                    <img src={sub.proof_screenshot_url} alt="Proof" className="w-full rounded-lg" />
                  )}
                  {sub.status === 'submitted' && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" onClick={() => reviewSubmission(sub.id, true)}>
                        <CheckCircle className="h-3 w-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => reviewSubmission(sub.id, false)}>
                        <XCircle className="h-3 w-3 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
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
                {(task.target_placements || []).map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-[9px]">{p.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-muted-foreground">{task.assigned_count}/{task.max_syndicates} syndicates</span>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => viewSubmissions(task.id)}>
                  <Eye className="h-3 w-3 mr-1" />View Proofs
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
