import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Download, 
  Upload, 
  Loader2, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  Wallet, 
  Award, 
  Clock, 
  XCircle, 
  MapPin, 
  Camera, 
  RefreshCw, 
  Mail, 
  ShieldCheck, 
  Home, 
  ArrowLeft,
  Briefcase,
  CheckSquare,
  Sparkles,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  TrendingUp,
  Coins,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import SyndicateOnboardingWizard from "@/components/SyndicateOnboardingWizard";
import SyndicateWallet from "@/components/SyndicateWallet";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface SyndicateDashboardProps {
  onNavigate?: (tab: string) => void;
}

const SyndicateDashboard: React.FC<SyndicateDashboardProps> = ({ onNavigate }) => {
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
  
  // Primary navigation tab: 'jobs' | 'assignments' | 'wallet' | 'profile'
  const [mainTab, setMainTab] = useState<string>('jobs');
  // Secondary sub-tab for assignments: 'pending' | 'submitted' | 'completed' | 'rejected' | 'expired'
  const [assignmentSubTab, setAssignmentSubTab] = useState<string>('pending');
  const [showTutorialVideo, setShowTutorialVideo] = useState(false);
  
  const { isEnabled } = useFeatureToggles();

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserEmail(user.email || '');

    // Auto-release expired assignments so they return to the available pool
    try {
      await supabase.rpc('release_expired_syndicate_assignments' as any);
    } catch (e) {
      console.warn('RPC release_expired_syndicate_assignments notice:', e);
    }

    try {
      const [
        tasksRes, 
        assignmentsRes, 
        profileRes, 
        profCreditsRes, 
        settingRes, 
        rateRes, 
        payoutRes, 
        allAssignRes, 
        pausedRes
      ] = await Promise.all([
        supabase.from('syndicate_tasks').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('syndicate_task_assignments').select('*, syndicate_tasks(*)').eq('syndicate_user_id', user.id).order('created_at', { ascending: false }),
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
        if (a.status !== 'rejected' && a.status !== 'expired') {
          counts[a.task_id] = (counts[a.task_id] || 0) + 1;
        }
      });
      setAssignmentCounts(counts);
      setPaused((pausedRes.data?.value || 'false') === 'true');
      setWallet({ balance: c * r });
      const h = Number(settingRes.data?.value);
      if (!Number.isNaN(h) && h > 0) setAssignmentHours(h);

      // Show onboarding for newly approved syndicates (only once)
      const seen = localStorage.getItem('ggd_syndicate_wizard_seen') === 'true';
      if (profileRes.data && !seen) setShowWizard(true);
    } catch (err) {
      console.error('Error fetching syndicate data:', err);
    } finally {
      setLoading(false);
    }
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

      if (profileLookupError || !profileRows?.length) {
        toast.error("Could not verify your syndicate profile");
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
      toast.error("You cannot perform a task you created");
      return;
    }
    if (task?.target_state && profile?.state && task.target_state !== profile.state) {
      toast.error(`This task is restricted to ${task.target_state} only`);
      return;
    }
    const myPlatforms: string[] = profile?.verified_platforms || [];
    const taskPlatforms: string[] = task?.placements || [];
    if (taskPlatforms.length > 0 && !taskPlatforms.some(p => myPlatforms.includes(p))) {
      toast.error("You're not verified for this task's platform");
      return;
    }
    const currentCount = assignmentCounts[taskId] || 0;
    if (task && currentCount >= (task.max_syndicates || 0)) {
      toast.error("This task has reached maximum capacity");
      fetchData();
      return;
    }
    const hasPending = myAssignments.some(a => a.status === 'accepted' || a.status === 'assigned');
    if (hasPending) {
      toast.error("Please complete your current task before accepting a new one");
      setMainTab('assignments');
      setAssignmentSubTab('pending');
      return;
    }

    const { error } = await supabase.from('syndicate_task_assignments').insert({ 
      task_id: taskId, 
      syndicate_user_id: user.id 
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (error.code === '23505' && msg.includes('uniq_syndicate_one_active_task')) {
        toast.error("You already have an active task. Finish it first.");
      } else if (error.code === '23505') {
        toast.info("You have already accepted this task");
      } else if (error.code === '23514' || msg.includes('capacity')) {
        toast.error("This task was just claimed by another syndicate");
      } else {
        toast.error("Failed to accept task");
      }
      fetchData();
      return;
    }

    toast.success("Task accepted! Submit your proof within " + assignmentHours + " hours.");
    setMainTab('assignments');
    setAssignmentSubTab('pending');
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
    } catch { 
      window.open(flyerUrl, '_blank'); 
    }
  };

  const uploadProof = async (assignmentId: string, file: File) => {
    setUploading(assignmentId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      setUploading(null); 
      return; 
    }

    // Compute SHA-256 of the file to dedupe identical proof images
    let proofHash = '';
    try {
      const buf = await file.arrayBuffer();
      const h = await crypto.subtle.digest('SHA-256', buf);
      proofHash = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
      const { data: dupe } = await supabase
        .from('syndicate_task_assignments')
        .select('id,syndicate_user_id')
        .eq('proof_hash', proofHash)
        .in('status', ['submitted','approved'])
        .limit(1)
        .maybeSingle();
      if (dupe && dupe.id !== assignmentId) {
        toast.error("This exact proof screenshot has already been submitted. Please upload a fresh screenshot.");
        setUploading(null);
        return;
      }
    } catch {
      /* ignore hash failures */
    }

    const { data: userProfile } = await supabase.from('profiles').select('display_name, email').eq('user_id', user.id).maybeSingle();
    const userName = userProfile?.display_name || userProfile?.email?.split('@')[0] || 'unknown';
    const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${sanitizedName}_${assignmentId}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from('syndicate-proofs').upload(fileName, file, { upsert: true });
    if (uploadError) { 
      toast.error("Upload failed: " + uploadError.message); 
      setUploading(null); 
      return; 
    }

    const { data: { publicUrl } } = supabase.storage.from('syndicate-proofs').getPublicUrl(fileName);

    const assignment = myAssignments.find(a => a.id === assignmentId);
    const task = assignment?.syndicate_tasks;
    const autoApprove = (task as any)?.approval_mode === 'auto';

    if (autoApprove) {
      const explicit = Number((task as any)?.payout_amount || 0);
      const payout = explicit > 0 ? explicit : Number(task?.cost_per_syndicate || 50) * (payoutPct / 100);
      const payoutCredits = Math.floor(payout / exchangeRate);
      
      await supabase.from('syndicate_task_assignments').update({
        proof_url: publicUrl, 
        proof_hash: proofHash || null, 
        status: 'approved',
        submitted_at: new Date().toISOString(), 
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', assignmentId);

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
        message: `Instantly approved. ${payoutCredits} GGG credits (≈₦${payout.toLocaleString()}) credited to your wallet.`,
        type: 'credit',
      });
      toast.success(`🎉 Auto-approved! ${payoutCredits} GGG credits credited.`);
    } else {
      await supabase.from('syndicate_task_assignments').update({
        proof_url: publicUrl, 
        proof_hash: proofHash || null, 
        status: 'submitted', 
        submitted_at: new Date().toISOString(),
      } as any).eq('id', assignmentId);
      toast.success("Proof submitted! Waiting for business review.");
    }

    setUploading(null);
    fetchData();
  };

  const requestTaskMatching = async () => {
    setRequestingMatch(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      setRequestingMatch(false); 
      return; 
    }

    const hasPending = myAssignments.some(a => a.status === 'accepted' || a.status === 'assigned');
    if (hasPending) {
      toast.error("Finish your current task before requesting a new match");
      setMainTab('assignments');
      setAssignmentSubTab('pending');
      setRequestingMatch(false);
      return;
    }

    const assignedIds = myAssignments.map(a => a.task_id);
    const availableForMatch = tasks.filter(t => !assignedIds.includes(t.id));
    
    if (availableForMatch.length === 0) {
      toast.info("No tasks available for matching right now. Check back soon!");
      setRequestingMatch(false);
      return;
    }

    const taskToMatch = availableForMatch[0];
    const { error } = await supabase.from('syndicate_task_assignments').insert({
      task_id: taskToMatch.id, 
      syndicate_user_id: user.id,
    });

    if (error) {
      toast.error("Matching failed: " + error.message);
    } else {
      toast.success(`Matched to task: ${taskToMatch.title}`);
      setMainTab('assignments');
      setAssignmentSubTab('pending');
      fetchData();
    }
    setRequestingMatch(false);
  };

  const copyText = (text: string) => { 
    navigator.clipboard.writeText(text); 
    toast.success("Copied to clipboard!"); 
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading Syndicate Hub...</p>
      </div>
    );
  }

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
    if (myUserId && t.business_user_id === myUserId) return false;
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

  const renderAssignmentCard = (assignment: any) => {
    const task = assignment.syndicate_tasks;
    if (!task) return null;

    const acceptedAt = new Date(assignment.accepted_at || assignment.created_at);
    const deadlineMs = assignmentHours * 60 * 60 * 1000;
    const isExpired = Date.now() > acceptedAt.getTime() + deadlineMs && (assignment.status === 'accepted' || assignment.status === 'assigned');
    const timeLeft = acceptedAt.getTime() + deadlineMs - Date.now();
    const hoursLeft = Math.max(0, Math.floor(timeLeft / (60 * 60 * 1000)));
    const minsLeft = Math.max(0, Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)));

    return (
      <Card 
        key={assignment.id} 
        className={`border shadow-sm overflow-hidden transition-all ${
          assignment.status === 'approved' ? 'border-green-300 dark:border-green-800 bg-green-50/20 dark:bg-green-950/10' :
          assignment.status === 'rejected' ? 'border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10' :
          isExpired ? 'border-border opacity-70' : 'border-border bg-card'
        }`}
      >
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge className={`text-xs font-bold px-3 py-1 ${
              assignment.status === 'approved' ? 'bg-green-600 text-white' :
              assignment.status === 'submitted' ? 'bg-amber-500 text-white' :
              assignment.status === 'rejected' ? 'bg-red-600 text-white' :
              isExpired ? 'bg-muted text-muted-foreground' : 'bg-blue-600 text-white'
            }`}>
              {isExpired ? 'Expired' : assignment.status === 'accepted' || assignment.status === 'assigned' ? 'In Progress' : assignment.status.toUpperCase()}
            </Badge>

            {/* Time remaining countdown */}
            {(assignment.status === 'accepted' || assignment.status === 'assigned') && !isExpired && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/50">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                <span>{hoursLeft}h {minsLeft}m left</span>
              </div>
            )}
          </div>

          {/* Task Info */}
          <div>
            <h4 className="font-bold text-base text-foreground leading-snug">{task.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
              {task.description}
            </p>
          </div>

          {/* Task Flyer preview */}
          {task.flyer_url && (
            <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted aspect-video max-h-56">
              <img 
                loading="lazy" 
                src={task.flyer_url} 
                alt={task.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Placement badges */}
          <div className="flex flex-wrap gap-1.5">
            {(task.placements || []).map((p: string) => (
              <Badge key={p} variant="secondary" className="text-[11px] font-semibold px-2.5 py-0.5">
                {p.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>

          {/* Action buttons (Copy text, Open Link, Download flyer) with comfortable touch targets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {task.description && (
              <Button 
                size="sm" 
                variant="outline" 
                type="button"
                className="h-11 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted"
                onClick={() => copyText(task.description)}
              >
                <Copy className="h-4 w-4 mr-1.5" /> Copy Text
              </Button>
            )}
            {task.share_link && (
              <Button 
                size="sm" 
                variant="outline" 
                type="button"
                className="h-11 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted"
                onClick={() => window.open(task.share_link, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" /> Open Link
              </Button>
            )}
            {task.flyer_url && (
              <Button 
                size="sm" 
                variant="outline" 
                type="button"
                className="h-11 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted"
                onClick={() => downloadFlyer(task.flyer_url, task.title)}
              >
                <Download className="h-4 w-4 mr-1.5" /> Download Flyer
              </Button>
            )}
          </div>

          {/* Proof Upload Area */}
          {(assignment.status === 'accepted' || assignment.status === 'assigned') && !isExpired && (
            <div className="pt-2 border-t border-border/60">
              <input 
                type="file" 
                id={`proof-${assignment.id}`} 
                accept="image/*" 
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadProof(assignment.id, e.target.files[0])} 
              />
              <Button 
                type="button"
                className="w-full h-12 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-md flex items-center justify-center gap-2"
                disabled={uploading === assignment.id}
                onClick={() => document.getElementById(`proof-${assignment.id}`)?.click()}
              >
                {uploading === assignment.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting Proof...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-1" /> Upload Proof Screenshot</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                Upload your screenshot showing the post on WhatsApp Status, Facebook group, or channel.
              </p>
            </div>
          )}

          {/* Submitted proof display */}
          {assignment.proof_url && (
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <p className="text-xs font-bold text-foreground">Submitted Proof:</p>
              <div className="relative rounded-xl overflow-hidden border border-border bg-muted max-h-48">
                <img loading="lazy" src={assignment.proof_url} alt="Proof" className="w-full h-full object-contain" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Header Navigation */}
      {onNavigate && (
        <div className="flex items-center justify-between gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-11 px-4 rounded-xl font-bold border-border" 
            onClick={() => onNavigate('ads')}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Ads
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-11 px-4 rounded-xl text-purple-600 font-bold" 
            onClick={() => onNavigate('ads')}
          >
            <Home className="h-4 w-4 mr-1.5" /> Home
          </Button>
        </div>
      )}

      {/* Admin Notices */}
      {paused && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm p-4 font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span>Syndicate tasks are temporarily paused by admin. New claims are disabled.</span>
        </div>
      )}
      {profile?.is_suspended && (
        <div className="rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 text-xs sm:text-sm p-4 font-semibold flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span>Your account is suspended{profile?.suspended_reason ? `: ${profile.suspended_reason}` : ''}. Contact support.</span>
        </div>
      )}

      {/* HERO PROFILE CARD */}
      <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white p-5 sm:p-6 relative">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/40 shadow-md">
                {profile?.avatar_url ? (
                  <img loading="lazy" src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-white" />
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
              <button 
                onClick={() => avatarInputRef.current?.click()} 
                disabled={uploadingAvatar}
                aria-label="Upload photo"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white text-purple-800 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-400/20 text-yellow-200 border-yellow-400/40 text-[10px] font-extrabold uppercase tracking-wider">
                  <Award className="h-3 w-3 mr-1 text-yellow-300" /> Verified Syndicate
                </Badge>
              </div>
              <h2 className="text-xl sm:text-2xl font-black truncate mt-1">
                {profile?.display_name || 'Syndicate Operator'}
              </h2>
              {profile?.state && (
                <p className="text-xs opacity-90 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-yellow-300" />
                  <span>{profile.state} Station</span>
                </p>
              )}
            </div>
          </div>

          {/* Quick Find Me a Task Button in Hero for instant action */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={requestTaskMatching}
              disabled={requestingMatch || pendingAssignments.length > 0}
              className="h-12 px-5 rounded-xl font-bold bg-white text-purple-900 hover:bg-white/90 shadow-md flex items-center gap-2 w-full sm:w-auto"
            >
              {requestingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Auto-Match Task
            </Button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-5 relative">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
            <div className="text-lg sm:text-2xl font-black">{profile?.ranking_score || 0}</div>
            <div className="text-[11px] opacity-80 mt-0.5 font-medium">Rank Score</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
            <div className="text-lg sm:text-2xl font-black">{profile?.tasks_completed || 0}</div>
            <div className="text-[11px] opacity-80 mt-0.5 font-medium">Jobs Done</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10">
            <div className="text-lg sm:text-2xl font-black">₦{(wallet?.balance || 0).toLocaleString()}</div>
            <div className="text-[11px] opacity-80 mt-0.5 font-medium">Earnings</div>
          </div>
        </div>

        {/* Verified Platforms */}
        {profile?.verified_platforms?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-white/15">
            <span className="text-[11px] opacity-75 font-semibold mr-1">Verified on:</span>
            {profile.verified_platforms.map((p: string) => (
              <Badge key={p} className="text-[10px] bg-white/20 hover:bg-white/30 text-white border-0 py-0.5 px-2 font-bold">
                {p} ✓
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* PRIMARY SEGMENTED NAVIGATION TABS */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full space-y-4">
        <TabsList className="w-full grid grid-cols-4 h-14 p-1.5 bg-muted/80 rounded-2xl">
          <TabsTrigger 
            value="jobs" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-11 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Briefcase className="h-4 w-4 text-purple-600" />
            <span className="hidden sm:inline">Available</span> Jobs
            {availableTasks.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-purple-600 text-white font-bold ml-0.5">
                {availableTasks.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="assignments" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-11 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">My</span> Tasks
            {pendingAssignments.length > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-amber-500 text-white font-bold ml-0.5">
                {pendingAssignments.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="wallet" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-11 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Wallet className="h-4 w-4 text-green-600" />
            Wallet
          </TabsTrigger>

          <TabsTrigger 
            value="profile" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-xl h-11 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 text-orange-600" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* VIEW 1: AVAILABLE JOBS */}
        <TabsContent value="jobs" className="space-y-4 outline-none">
          {/* Quick Action banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-r from-purple-50/70 via-background to-indigo-50/50 dark:from-purple-950/20 dark:via-background dark:to-background">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">Available Business Campaigns</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Accept a campaign, share on your channels, and submit proof within {assignmentHours} hours.
              </p>
            </div>
            <Button 
              type="button"
              onClick={requestTaskMatching} 
              disabled={requestingMatch || pendingAssignments.length > 0}
              className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md flex items-center justify-center gap-2 flex-shrink-0"
            >
              {requestingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Find Me a Task
            </Button>
          </div>

          {/* Jobs List */}
          <div className="space-y-3.5">
            {availableTasks.map(task => (
              <Card key={task.id} className="border border-border/80 shadow-sm hover:border-purple-500/40 transition-all overflow-hidden bg-card">
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-2.5 py-1">
                          ₦{task.cost_per_syndicate || 50} per task
                        </Badge>
                        {task.target_state ? (
                          <Badge variant="outline" className="text-xs font-semibold flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" /> {task.target_state}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-semibold">
                            Nationwide
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {assignmentHours}h turnaround
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-foreground mt-1.5">{task.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {task.description}
                      </p>
                    </div>

                    {task.flyer_url && (
                      <div className="sm:w-36 h-28 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0">
                        <img loading="lazy" src={task.flyer_url} alt={task.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Placements tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(task.placements || []).map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-[11px] font-semibold px-2.5 py-0.5">
                        {p.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>

                  {/* Accept Button */}
                  <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      Remaining spots: <strong>{Math.max(0, (task.max_syndicates || 1) - (assignmentCounts[task.id] || 0))}</strong>
                    </div>
                    <Button 
                      type="button"
                      onClick={() => acceptTask(task.id)}
                      disabled={pendingAssignments.length > 0}
                      className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center justify-center gap-2"
                    >
                      Accept Task & Earn ₦{task.cost_per_syndicate || 50}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {availableTasks.length === 0 && (
              <div className="text-center py-12 px-4 space-y-3 bg-card rounded-2xl border border-dashed border-border">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">No available tasks right now</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    All current campaigns have reached capacity, or new ones are being scheduled. Check back soon or tap Find Me a Task!
                  </p>
                </div>
                <Button 
                  type="button"
                  onClick={requestTaskMatching} 
                  disabled={requestingMatch}
                  className="h-11 px-5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Check Matching Pool
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* VIEW 2: MY TASKS & SUBMISSIONS */}
        <TabsContent value="assignments" className="space-y-4 outline-none">
          {/* Sub-filter tabs with comfortable mobile touch targets */}
          <div className="grid grid-cols-5 gap-1.5 p-1 bg-muted/60 rounded-2xl">
            <button
              type="button"
              onClick={() => setAssignmentSubTab('pending')}
              className={`h-11 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                assignmentSubTab === 'pending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Pending</span>
              {pendingAssignments.length > 0 && (
                <Badge className="h-4 px-1.5 text-[9px] bg-blue-600 text-white">{pendingAssignments.length}</Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentSubTab('submitted')}
              className={`h-11 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                assignmentSubTab === 'submitted' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Review</span>
              {submittedAssignments.length > 0 && (
                <Badge className="h-4 px-1.5 text-[9px] bg-amber-500 text-white">{submittedAssignments.length}</Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentSubTab('completed')}
              className={`h-11 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                assignmentSubTab === 'completed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Done</span>
              {completedAssignments.length > 0 && (
                <Badge className="h-4 px-1.5 text-[9px] bg-green-600 text-white">{completedAssignments.length}</Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentSubTab('rejected')}
              className={`h-11 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                assignmentSubTab === 'rejected' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Rejected</span>
              {rejectedAssignments.length > 0 && (
                <Badge className="h-4 px-1.5 text-[9px] bg-red-600 text-white">{rejectedAssignments.length}</Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAssignmentSubTab('expired')}
              className={`h-11 px-1 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
                assignmentSubTab === 'expired' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Missed</span>
            </button>
          </div>

          {/* Assignments list depending on selected sub-tab */}
          <div className="space-y-3">
            {assignmentSubTab === 'pending' && (
              pendingAssignments.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3 bg-card rounded-2xl border border-dashed border-border">
                  <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-bold text-foreground">No active pending tasks</p>
                  <p className="text-xs text-muted-foreground">Select a task from Available Jobs to get started!</p>
                  <Button 
                    type="button" 
                    onClick={() => setMainTab('jobs')}
                    className="h-11 px-5 rounded-xl font-bold bg-purple-600 text-white"
                  >
                    Browse Available Jobs
                  </Button>
                </div>
              ) : (
                pendingAssignments.map(renderAssignmentCard)
              )
            )}

            {assignmentSubTab === 'submitted' && (
              submittedAssignments.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">No tasks awaiting review</div>
              ) : (
                submittedAssignments.map(renderAssignmentCard)
              )
            )}

            {assignmentSubTab === 'completed' && (
              completedAssignments.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">No completed tasks yet</div>
              ) : (
                completedAssignments.map(renderAssignmentCard)
              )
            )}

            {assignmentSubTab === 'rejected' && (
              rejectedAssignments.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">No rejected tasks</div>
              ) : (
                rejectedAssignments.map(renderAssignmentCard)
              )
            )}

            {assignmentSubTab === 'expired' && (
              expiredAssignments.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">No missed tasks</div>
              ) : (
                expiredAssignments.map(renderAssignmentCard)
              )
            )}
          </div>
        </TabsContent>

        {/* VIEW 3: SYNDICATE WALLET */}
        <TabsContent value="wallet" className="space-y-4 outline-none">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-purple-600" /> Syndicate Earnings & Payouts
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Manage your verified Nigerian bank account, security PINs, and request direct transfers.
            </p>
            <SyndicateWallet />
          </div>
        </TabsContent>

        {/* VIEW 4: PROFILE & SECURITY */}
        <TabsContent value="profile" className="space-y-4 outline-none">
          {/* Account Credentials */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" /> Account Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3.5">
              <div className="flex items-center justify-between gap-3 bg-muted/40 rounded-xl p-3.5 border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Mail className="h-3.5 w-3.5 text-purple-600" /> Syndicate Login Email
                  </p>
                  <p className="text-sm font-bold truncate mt-0.5">{userEmail}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  type="button"
                  className="h-11 px-4 text-xs sm:text-sm font-bold rounded-xl border-border hover:bg-muted" 
                  onClick={() => copyText(userEmail)}
                >
                  <Copy className="h-4 w-4 mr-1.5" /> Copy Email
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Your login password is managed from your main user account profile.
              </p>
            </CardContent>
          </Card>

          {/* YouTube Guide */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardHeader 
              className="p-4 sm:p-5 pb-3 cursor-pointer select-none"
              onClick={() => setShowTutorialVideo(!showTutorialVideo)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-red-500" /> Syndicate Training Video
                </CardTitle>
                <span className="text-xs font-semibold text-purple-600 hover:underline">
                  {showTutorialVideo ? 'Hide Video' : 'Watch Tutorial'}
                </span>
              </div>
            </CardHeader>
            {showTutorialVideo && (
              <CardContent className="p-4 sm:p-5 pt-0">
                <YouTubeEmbed section="syndicate" />
              </CardContent>
            )}
          </Card>

          {/* Syndicate Guidelines Card */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-purple-600" /> Operator Code of Conduct
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                1. <strong>Original Proofs:</strong> Only submit genuine screenshots taken from your verified social media profile, status, or group. The platform automatically scans image signatures to block duplicates.
              </p>
              <p>
                2. <strong>24-Hour Turnaround:</strong> Accepted campaigns must be posted and submitted within {assignmentHours} hours. Expired tasks are released back to the community.
              </p>
              <p>
                3. <strong>Instant Auto-Payouts:</strong> Auto-approval tasks deposit credits into your wallet immediately upon proof upload. Keep your bank details up to date in the Wallet tab.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SyndicateDashboard;
