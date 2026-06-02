import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Download, Upload, Loader2, CheckCircle, Copy, ExternalLink, Wallet, Award, Clock, XCircle, MapPin, Camera, RefreshCw, Mail, ShieldCheck, Home, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import SyndicateOnboardingWizard from "@/components/SyndicateOnboardingWizard";
import SyndicateWallet from "@/components/SyndicateWallet";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface SyndicateDashboardProps {
  onNavigate?: (tab: string) => void;
}

const SyndicateDashboard = ({ onNavigate }: SyndicateDashboardProps = {}) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [requestingMatch, setRequestingMatch] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [assignmentHours, setAssignmentHours] = useState(24);
  const [showWizard, setShowWizard] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [payoutPct, setPayoutPct] = useState<number>(70);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [credits, setCredits] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const { isEnabled } = useFeatureToggles();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email || '');

    // Auto-release expired assignments so they return to the available pool
    await supabase.rpc('release_expired_syndicate_assignments' as any);

    const [tasksRes, assignmentsRes, profileRes, profCreditsRes, settingRes, rateRes, payoutRes, allAssignRes, pausedRes] = await Promise.all([
      supabase.from('syndicate_tasks').select('*').eq('status', 'active'),
      supabase.from('syndicate_task_assignments').select('*, syndicate_tasks(*)').eq('syndicate_user_id', user.id),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'syndicate_assignment_hours').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'syndicate_payout_percentage').maybeSingle(),
      supabase.from('syndicate_task_assignments').select('task_id,status'),
      supabase.from('app_settings').select('value').eq('key', 'syndicate_paused').maybeSingle(),
    ]);

    setTasks(tasksRes.data || []);
    setMyAssignments(assignmentsRes.data || []);
    setProfile(profileRes.data);
    const c = Number(profCreditsRes.data?.credits || 0);
    setCredits(c);
    const r = parseInt(rateRes.data?.value || '') || 100;
    setExchangeRate(r);
    const pct = parseInt(payoutRes.data?.value || '') || 70;
    setPayoutPct(pct);
    const counts: Record<string, number> = {};
    (allAssignRes.data || []).forEach((a: any) => {
      if (a.status !== 'rejected' && a.status !== 'expired') counts[a.task_id] = (counts[a.task_id] || 0) + 1;
    });
    setAssignmentCounts(counts);
    setPaused((pausedRes.data?.value || 'false') === 'true');
    setWallet({ balance: c * r });
    const h = Number(settingRes.data?.value);
    if (!Number.isNaN(h) && h > 0) setAssignmentHours(h);

    // Show onboarding for newly approved syndicates (only once)
    const seen = localStorage.getItem('ggd_syndicate_wizard_seen') === 'true';
    if (profileRes.data && !seen) setShowWizard(true);

    setLoading(false);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error("Please choose an image file");
        return;
      }

      const { data: profileRows, error: profileLookupError } = await supabase
        .from('syndicate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (profileLookupError) {
        toast.error("Could not verify your profile");
        return;
      }

      if (!profileRows?.length) {
        toast.error("Your syndicate profile is not ready yet");
        return;
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileName = `${user.id}/avatars/${uniqueSuffix}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('syndicate-proofs')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        toast.error(uploadError.message || "Upload failed");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('syndicate-proofs')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('syndicate_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        toast.error(updateError.message || "Could not save your profile photo");
        return;
      }

      setProfile((current: any) => current ? { ...current, avatar_url: publicUrl } : current);
      toast.success("Profile photo updated!");
      fetchData();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const acceptTask = async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (paused) {
      toast.error("Syndicate tasks are temporarily paused by admin");
      return;
    }
    if (profile?.is_suspended) {
      toast.error(`Account suspended${profile?.suspended_reason ? `: ${profile.suspended_reason}` : ''}`);
      return;
    }
    const task = tasks.find(t => t.id === taskId);
    if (task?.business_user_id === user.id) {
      toast.error("You can't perform a task you created");
      return;
    }
    if (task?.target_state && profile?.state && task.target_state !== profile.state) {
      toast.error(`This task is for ${task.target_state} only`);
      return;
    }
    const myPlatforms: string[] = profile?.verified_platforms || [];
    const taskPlatforms: string[] = task?.placements || [];
    if (taskPlatforms.length > 0 && !taskPlatforms.some(p => myPlatforms.includes(p))) {
      toast.error("You're not approved for this task's platform");
      return;
    }
    const currentCount = assignmentCounts[taskId] || 0;
    if (task && currentCount >= (task.max_syndicates || 0)) {
      toast.error("This task is full");
      fetchData();
      return;
    }
    const hasPending = myAssignments.some(a => a.status === 'accepted' || a.status === 'assigned');
    if (hasPending) {
      toast.error("Finish your current task before claiming a new one");
      return;
    }
    const { error } = await supabase.from('syndicate_task_assignments').insert({ task_id: taskId, syndicate_user_id: user.id });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (error.code === '23505' && msg.includes('uniq_syndicate_one_active_task')) {
        toast.error("You already have an active task. Finish it first.");
      } else if (error.code === '23505') {
        toast.info("Already accepted this task");
      } else if (error.code === '23514' || msg.includes('capacity')) {
        toast.error("This task was just claimed by another syndicate");
      } else {
        toast.error("Failed to accept task");
      }
      fetchData();
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

    // Look up task to check approval mode
    const assignment = myAssignments.find(a => a.id === assignmentId);
    const task = assignment?.syndicate_tasks;
    const autoApprove = (task as any)?.approval_mode === 'auto';

    if (autoApprove) {
      const explicit = Number((task as any)?.payout_amount || 0);
      const payout = explicit > 0 ? explicit : Number(task?.cost_per_syndicate || 50) * (payoutPct / 100);
      const payoutCredits = Math.floor(payout / exchangeRate);
      await supabase.from('syndicate_task_assignments').update({
        proof_url: publicUrl, status: 'approved',
        submitted_at: new Date().toISOString(), reviewed_at: new Date().toISOString(),
      }).eq('id', assignmentId);

      const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle();
      await supabase.from('profiles').update({ credits: Number(prof?.credits || 0) + payoutCredits }).eq('user_id', user.id);
      const { data: synProfile } = await supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (synProfile) {
        await supabase.from('syndicate_profiles').update({
          tasks_completed: (synProfile.tasks_completed || 0) + 1,
          ranking_score: (synProfile.ranking_score || 0) + 10,
        }).eq('user_id', user.id);
      }
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: '⚡ Auto-Approved!',
        message: `Instantly approved. ${payoutCredits} GGG credits (≈₦${payout}) credited.`,
        type: 'credit',
      });
      toast.success(`Auto-approved! ${payoutCredits} GGG credits credited.`);
    } else {
      await supabase.from('syndicate_task_assignments').update({
        proof_url: publicUrl, status: 'submitted', submitted_at: new Date().toISOString(),
      }).eq('id', assignmentId);
      toast.success("Proof submitted! Waiting for review.");
    }
    setUploading(null);
    fetchData();
  };

  const requestTaskMatching = async () => {
    setRequestingMatch(true);
    // Find tasks that have expired assignments from other syndicates
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRequestingMatch(false); return; }

    const hasPending = myAssignments.some(a => a.status === 'accepted' || a.status === 'assigned');
    if (hasPending) {
      toast.error("Finish your current task first");
      setRequestingMatch(false);
      return;
    }

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

  if (showWizard && isEnabled('syndicate_onboarding_wizard')) {
    return (
      <SyndicateOnboardingWizard
        initialBank={{
          bank_name: profile?.bank_name,
          account_number: profile?.account_number,
          account_name: profile?.account_name,
        }}
        onComplete={() => { setShowWizard(false); fetchData(); }}
      />
    );
  }

  const assignedTaskIds = myAssignments.map(a => a.task_id);
  const myUserId = profile?.user_id;
  const availableTasks = tasks.filter(t => {
    if (assignedTaskIds.includes(t.id)) return false;
    if (myUserId && t.business_user_id === myUserId) return false; // can't perform own
    if (t.target_state && profile?.state && t.target_state !== profile.state) return false;
    const myPlatforms: string[] = profile?.verified_platforms || [];
    const taskPlatforms: string[] = t.placements || [];
    if (taskPlatforms.length > 0 && !taskPlatforms.some((p: string) => myPlatforms.includes(p))) return false;
    const count = assignmentCounts[t.id] || 0;
    if (count >= (t.max_syndicates || 0)) return false;
    return true;
  });

  // Categorize assignments
  const pendingAssignments = myAssignments.filter(a => a.status === 'accepted' || a.status === 'assigned');
  const submittedAssignments = myAssignments.filter(a => a.status === 'submitted');
  const completedAssignments = myAssignments.filter(a => a.status === 'approved');
  const rejectedAssignments = myAssignments.filter(a => a.status === 'rejected');
  const expiredAssignments = myAssignments.filter(a => a.status === 'expired');

  const renderAssignment = (assignment: any) => {
    const task = assignment.syndicate_tasks;
    if (!task) return null;

    // Check if per-syndicate deadline passed (starts when they accepted the task)
    const acceptedAt = new Date(assignment.accepted_at || assignment.created_at);
    const deadlineMs = assignmentHours * 60 * 60 * 1000;
    const isExpired = Date.now() > acceptedAt.getTime() + deadlineMs && (assignment.status === 'accepted' || assignment.status === 'assigned');
    const timeLeft = acceptedAt.getTime() + deadlineMs - Date.now();
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
      {onNavigate && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" className="h-10 px-3 rounded-xl font-semibold" onClick={() => onNavigate('ads')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Main App
          </Button>
          <Button variant="ghost" size="sm" className="h-10 px-3 rounded-xl text-purple-600 font-semibold" onClick={() => onNavigate('ads')}>
            <Home className="h-4 w-4 mr-1" /> Home
          </Button>
        </div>
      )}

      <YouTubeEmbed section="syndicate" />

      {paused && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs p-3 text-center font-semibold">
          ⏸️ Syndicate tasks are temporarily paused by admin. New claims are disabled.
        </div>
      )}
      {profile?.is_suspended && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 text-xs p-3 text-center font-semibold">
          🚫 Your account is suspended{profile?.suspended_reason ? `: ${profile.suspended_reason}` : ''}. Contact support.
        </div>
      )}

      {/* Hero Profile */}
      <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 text-white p-5 relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/40 backdrop-blur">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <Users className="h-7 w-7 text-white" />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
                e.target.value = '';
              }}
            />
            <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white text-purple-700 flex items-center justify-center shadow-lg">
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wider opacity-90 flex items-center gap-1">
              <Award className="h-3 w-3" /> Syndicate
            </p>
            <p className="text-lg font-bold truncate">{profile?.display_name || 'Earner'}</p>
            {profile?.state && <p className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{profile.state}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 relative">
          <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
            <div className="text-xl font-black">{profile?.ranking_score || 0}</div>
            <div className="text-[10px] opacity-90">Rank Score</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
            <div className="text-xl font-black">{profile?.tasks_completed || 0}</div>
            <div className="text-[10px] opacity-90">Completed</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
            <div className="text-xl font-black">₦{wallet?.balance?.toLocaleString() || 0}</div>
            <div className="text-[10px] opacity-90">Earnings</div>
          </div>
        </div>

        {profile?.verified_platforms?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 relative">
            {profile.verified_platforms.map((p: string) => (
              <Badge key={p} className="text-[9px] bg-white/20 text-white border-0 hover:bg-white/30">{p} ✓</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Request Matching */}
      <Button className="w-full h-14 rounded-xl text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg" onClick={requestTaskMatching} disabled={requestingMatch}>
        {requestingMatch ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
        Find Me a Task
      </Button>

      {/* Account Credentials */}
      <Card className="border-2 border-purple-200 dark:border-purple-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600" /> Account Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 bg-muted/40 rounded-xl p-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Login Email</p>
              <p className="text-sm font-semibold truncate">{userEmail}</p>
            </div>
            <Button size="sm" variant="outline" className="h-10 px-4 text-sm font-semibold rounded-lg" onClick={() => copyText(userEmail)}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Manage your password from your main account profile.
          </p>
        </CardContent>
      </Card>

      {/* Tabbed Assignment View */}
      <Tabs defaultValue="pending" className="space-y-3">
        <TabsList className="w-full grid grid-cols-5 h-auto p-1 gap-0.5">
          <TabsTrigger value="pending" className="text-[9px] font-medium px-1 py-1.5 flex-col gap-0.5 leading-tight">
            <span>Pending</span>
            {pendingAssignments.length > 0 && <Badge className="h-3.5 px-1 text-[8px] bg-blue-500">{pendingAssignments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="submitted" className="text-[9px] font-medium px-1 py-1.5 flex-col gap-0.5 leading-tight">
            <span>Review</span>
            {submittedAssignments.length > 0 && <Badge className="h-3.5 px-1 text-[8px] bg-yellow-500">{submittedAssignments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-[9px] font-medium px-1 py-1.5 leading-tight">Done</TabsTrigger>
          <TabsTrigger value="rejected" className="text-[9px] font-medium px-1 py-1.5 leading-tight">Rejected</TabsTrigger>
          <TabsTrigger value="expired" className="text-[9px] font-medium px-1 py-1.5 leading-tight">Missed</TabsTrigger>
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
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {assignmentHours}h after you accept</span>
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

      {/* Wallet Management — bank details, earnings, withdrawals */}
      <div className="pt-2">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-purple-600" /> My Wallet
        </h3>
        <SyndicateWallet />
      </div>
    </div>
  );
};

export default SyndicateDashboard;
