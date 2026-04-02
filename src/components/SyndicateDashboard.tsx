import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Download, Upload, Loader2, CheckCircle, Copy, ExternalLink, Wallet, Award, Clock, XCircle, MapPin, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeEmbed from "@/components/YouTubeEmbed";

const SyndicateDashboard = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [requestingMatch, setRequestingMatch] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tasksRes, assignmentsRes, profileRes, walletRes] = await Promise.all([
      supabase.from('syndicate_tasks').select('*').eq('status', 'active'),
      supabase.from('syndicate_task_assignments').select('*, syndicate_tasks(*)').eq('syndicate_user_id', user.id),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setTasks(tasksRes.data || []);
    setMyAssignments(assignmentsRes.data || []);
    setProfile(profileRes.data);
    setWallet(walletRes.data);
    setLoading(false);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingAvatar(false); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('syndicate-proofs').upload(fileName, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('syndicate-proofs').getPublicUrl(fileName);
    await supabase.from('syndicate_profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
    toast.success("Profile photo updated!");
    setUploadingAvatar(false);
    fetchData();
  };

  const acceptTask = async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('syndicate_task_assignments').insert({ task_id: taskId, syndicate_user_id: user.id });
    if (error) {
      if (error.code === '23505') toast.info("Already accepted this task");
      else toast.error("Failed to accept task");
      return;
    }
    toast.success("Task accepted! Complete it to earn.");
    fetchData();
  };

  const downloadFlyer = async (flyerUrl: string, taskTitle: string) => {
    try {
      const response = await fetch(flyerUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskTitle.replace(/\s+/g, '_')}_flyer.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Flyer downloaded!");
    } catch { window.open(flyerUrl, '_blank'); }
  };

  const uploadProof = async (assignmentId: string, file: File) => {
    setUploading(assignmentId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(null); return; }
    const { data: userProfile } = await supabase.from('profiles').select('display_name, email').eq('user_id', user.id).maybeSingle();
    const userName = userProfile?.display_name || userProfile?.email?.split('@')[0] || 'unknown';
    const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${sanitizedName}_${assignmentId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('syndicate-proofs').upload(fileName, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from('syndicate-proofs').getPublicUrl(fileName);
    await supabase.from('syndicate_task_assignments').update({
      proof_url: publicUrl, status: 'submitted', submitted_at: new Date().toISOString(),
    }).eq('id', assignmentId);
    toast.success("Proof submitted! Waiting for review.");
    setUploading(null);
    fetchData();
  };

  const requestTaskMatching = async () => {
    setRequestingMatch(true);
    // Find tasks that have expired assignments from other syndicates
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRequestingMatch(false); return; }
    
    const assignedIds = myAssignments.map(a => a.task_id);
    const availableForMatch = tasks.filter(t => !assignedIds.includes(t.id));
    
    if (availableForMatch.length === 0) {
      toast.info("No tasks available for matching right now");
      setRequestingMatch(false);
      return;
    }

    // Accept the first available unmatched task
    const taskToMatch = availableForMatch[0];
    const { error } = await supabase.from('syndicate_task_assignments').insert({
      task_id: taskToMatch.id, syndicate_user_id: user.id,
    });

    if (error) {
      toast.error("Matching failed");
    } else {
      toast.success(`Matched to task: ${taskToMatch.title}`);
      fetchData();
    }
    setRequestingMatch(false);
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const assignedTaskIds = myAssignments.map(a => a.task_id);
  const availableTasks = tasks.filter(t => !assignedTaskIds.includes(t.id));

  // Categorize assignments
  const pendingAssignments = myAssignments.filter(a => a.status === 'accepted' || a.status === 'assigned');
  const submittedAssignments = myAssignments.filter(a => a.status === 'submitted');
  const completedAssignments = myAssignments.filter(a => a.status === 'approved');
  const rejectedAssignments = myAssignments.filter(a => a.status === 'rejected');
  const expiredAssignments = myAssignments.filter(a => a.status === 'expired');

  const renderAssignment = (assignment: any) => {
    const task = assignment.syndicate_tasks;
    if (!task) return null;

    // Check if deadline passed
    const createdAt = new Date(assignment.created_at);
    const deadlineMs = (task.deadline_hours || 24) * 60 * 60 * 1000;
    const isExpired = Date.now() > createdAt.getTime() + deadlineMs && (assignment.status === 'accepted' || assignment.status === 'assigned');
    const timeLeft = createdAt.getTime() + deadlineMs - Date.now();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (60 * 60 * 1000)));
    const minsLeft = Math.max(0, Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)));

    return (
      <Card key={assignment.id} className={`shadow-sm ${
        assignment.status === 'approved' ? 'border-green-300 bg-green-50/30 dark:bg-green-950/10' :
        assignment.status === 'rejected' ? 'border-red-300 bg-red-50/30 dark:bg-red-950/10' :
        isExpired ? 'border-gray-300 opacity-60' : 'border-border'
      }`}>
        <CardContent className="p-4 space-y-3">
          {task.flyer_url && <img src={task.flyer_url} alt={task.title} className="w-full rounded-lg" />}
          <h4 className="font-bold text-sm text-foreground">{task.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>

          <div className="flex flex-wrap gap-1.5">
            {(task.placements || []).map((p: string) => (
              <Badge key={p} variant="secondary" className="text-[10px] px-2 py-0.5">{p.replace(/_/g, ' ')}</Badge>
            ))}
          </div>

          {/* Time remaining */}
          {(assignment.status === 'accepted' || assignment.status === 'assigned') && !isExpired && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium bg-orange-50 dark:bg-orange-950/30 rounded-md px-2 py-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{hoursLeft}h {minsLeft}m remaining</span>
            </div>
          )}
          {isExpired && <Badge variant="destructive" className="text-xs px-2 py-0.5">Expired - Task Missed</Badge>}

          <div className="flex gap-2 flex-wrap">
            {task.description && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => copyText(task.description)}>
                <Copy className="h-3.5 w-3.5 mr-1" />Copy Text
              </Button>
            )}
            {task.share_link && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(task.share_link, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />Open Link
              </Button>
            )}
            {task.flyer_url && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => downloadFlyer(task.flyer_url, task.title)}>
                <Download className="h-3.5 w-3.5 mr-1" />Flyer
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Badge className={`text-xs px-2.5 py-1 ${
              assignment.status === 'approved' ? 'bg-green-500' :
              assignment.status === 'submitted' ? 'bg-yellow-500' :
              assignment.status === 'rejected' ? 'bg-red-500' :
              isExpired ? 'bg-gray-500' : 'bg-blue-500'
            }`}>
              {isExpired ? 'Expired' : assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
            </Badge>

            {(assignment.status === 'accepted' || assignment.status === 'assigned') && !isExpired && (
              <>
                <input type="file" id={`proof-${assignment.id}`} accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && uploadProof(assignment.id, e.target.files[0])} />
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-9 px-4" disabled={uploading === assignment.id}
                  onClick={() => document.getElementById(`proof-${assignment.id}`)?.click()}>
                  {uploading === assignment.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Upload Proof
                </Button>
              </>
            )}
          </div>

          {assignment.proof_url && <img src={assignment.proof_url} alt="Proof" className="w-full rounded-lg border" />}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <YouTubeEmbed section="syndicate" />

      {/* Profile & Stats */}
      <Card className="border-purple-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-purple-300">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-6 w-6 text-purple-600" />
                )}
              </div>
              <input type="file" id="avatarUpload" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              <button onClick={() => document.getElementById('avatarUpload')?.click()} disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-bold text-foreground">{profile?.ranking_score || 0}</div><div className="text-[9px] text-muted-foreground">Rank</div></div>
                <div><div className="text-lg font-bold text-foreground">{profile?.tasks_completed || 0}</div><div className="text-[9px] text-muted-foreground">Done</div></div>
                <div><div className="text-lg font-bold text-green-600">₦{wallet?.balance || 0}</div><div className="text-[9px] text-muted-foreground">Earnings</div></div>
              </div>
            </div>
          </div>
          {profile?.state && <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.state}</p>}
          {profile?.verified_platforms?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {profile.verified_platforms.map((p: string) => <Badge key={p} className="text-[9px] bg-purple-100 text-purple-700">{p} ✓</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Matching */}
      <Button variant="outline" className="w-full text-xs" onClick={requestTaskMatching} disabled={requestingMatch}>
        {requestingMatch ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
        Request Task Matching
      </Button>

      {/* Tabbed Assignment View */}
      <Tabs defaultValue="pending" className="space-y-2">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="pending" className="text-[9px]">
            Pending {pendingAssignments.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[8px] bg-blue-500">{pendingAssignments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="submitted" className="text-[9px]">
            Review {submittedAssignments.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[8px] bg-yellow-500">{submittedAssignments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-[9px]">Done</TabsTrigger>
          <TabsTrigger value="rejected" className="text-[9px]">Rejected</TabsTrigger>
          <TabsTrigger value="expired" className="text-[9px]">Missed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2">
          {pendingAssignments.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">No pending tasks</p> : pendingAssignments.map(renderAssignment)}
        </TabsContent>
        <TabsContent value="submitted" className="space-y-2">
          {submittedAssignments.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">No tasks awaiting review</p> : submittedAssignments.map(renderAssignment)}
        </TabsContent>
        <TabsContent value="completed" className="space-y-2">
          {completedAssignments.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">No completed tasks yet</p> : completedAssignments.map(renderAssignment)}
        </TabsContent>
        <TabsContent value="rejected" className="space-y-2">
          {rejectedAssignments.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">No rejected tasks</p> : rejectedAssignments.map(renderAssignment)}
        </TabsContent>
        <TabsContent value="expired" className="space-y-2">
          {expiredAssignments.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">No missed tasks</p> : expiredAssignments.map(renderAssignment)}
        </TabsContent>
      </Tabs>

      {/* Available Tasks */}
      <h3 className="font-bold text-base text-foreground">Available Tasks</h3>
      <div className="space-y-3">
        {availableTasks.map(task => (
          <Card key={task.id} className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              {task.flyer_url && <img src={task.flyer_url} alt={task.title} className="w-full rounded-lg" />}
              <h4 className="font-bold text-sm text-foreground">{task.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {(task.placements || []).map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-[10px] px-2 py-0.5">{p.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {task.target_state && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {task.target_state}</span>}
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {task.deadline_hours || 24}h deadline</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-green-600 font-bold">₦{task.cost_per_syndicate}/task</span>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-4" onClick={() => acceptTask(task.id)}>
                  Accept Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {availableTasks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No available tasks right now</p>
            <p className="text-xs mt-1">Check back soon or request task matching above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyndicateDashboard;
