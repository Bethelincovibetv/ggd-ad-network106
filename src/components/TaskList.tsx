import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ClipboardList, 
  Gift, 
  CheckCircle, 
  Share2, 
  Coins, 
  Wallet, 
  ArrowRight, 
  X, 
  Crown, 
  Zap, 
  Lock, 
  Megaphone, 
  Users, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  Timer, 
  Facebook, 
  Instagram, 
  Send, 
  MessageCircle, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SlideCarousel from "@/components/SlideCarousel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { playRewardSound } from "@/lib/soundEffects";
import { getOrCreateTaskShareUrl } from "@/lib/taskShare";
import {
  CreditTask,
  getOrEnsurePlatformShareTask,
  executeCompleteTask,
} from "@/services/creditTaskService";

interface TaskListProps {
  onCreditsUpdate: (newCredits: number) => void;
  credits: number;
  onNavigate?: (tab: string) => void;
}

const SHARE_PLATFORMS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp Status',
    icon: MessageCircle,
    color: 'bg-[#25D366] hover:bg-[#20bd5a]',
    build: (text: string, url: string) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n\n👉 View & Join: ${url}`)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook Post',
    icon: Facebook,
    color: 'bg-[#1877F2] hover:bg-[#166fe5]',
    build: (text: string, url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  {
    key: 'x',
    label: 'X (Twitter)',
    icon: Share2,
    color: 'bg-black hover:bg-neutral-800',
    build: (text: string, url: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: Send,
    color: 'bg-[#229ED9] hover:bg-[#1f8ec3]',
    build: (text: string, url: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

const TaskList: React.FC<TaskListProps> = ({ onCreditsUpdate, credits, onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  // Activation & Syndicate Profile State
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [hasPendingApp, setHasPendingApp] = useState(false);
  const [syndicateProfile, setSyndicateProfile] = useState<any>(null);

  // Official Platform Task State
  const [platformTask, setPlatformTask] = useState<CreditTask | null>(null);
  const [completions, setCompletions] = useState<string[]>([]);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [platformShareTarget, setPlatformShareTarget] = useState<CreditTask | null>(null);

  // Syndicate Broadcast Campaigns State
  const [syndicateTasks, setSyndicateTasks] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);

  // Proof Submission Modal State
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFilePreview, setProofFilePreview] = useState<string | null>(null);
  const [proofPostLink, setProofPostLink] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  // Load all foundation data
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUid(user.id);

      // 1. Fetch Official Platform Task
      try {
        const pTask = await getOrEnsurePlatformShareTask();
        setPlatformTask(pTask);
      } catch (err) {
        console.warn("Platform share task check note:", err);
      }

      // 2. Fetch User Platform Completions
      const { data: comps } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', user.id);
      setCompletions((comps || []).map(c => c.task_id));

      // 3. Check Syndicate Activation Status
      const [synProfRes, synAppRes] = await Promise.all([
        supabase
          .from('syndicate_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('syndicate_applications')
          .select('id, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const synProf = synProfRes.data;
      setSyndicateProfile(synProf);

      const activated = Boolean(
        (synProf && !synProf.is_suspended) ||
        synAppRes.data?.status === 'approved'
      );
      setIsActivated(activated);
      setHasPendingApp(synAppRes.data?.status === 'pending');

      // 4. If user is activated (or has profile), fetch active Syndicate Broadcast Campaigns and user assignments
      const [tasksRes, assignmentsRes] = await Promise.all([
        supabase
          .from('syndicate_tasks')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('syndicate_task_assignments')
          .select('*')
          .eq('syndicate_user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setSyndicateTasks(tasksRes.data || []);
      setMyAssignments(assignmentsRes.data || []);
    } catch (err) {
      console.error("Error loading task data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Copy caption helper
  const copyCaption = (text: string, taskId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTaskId(taskId);
    toast.success("Caption & instructions copied to clipboard!");
    setTimeout(() => setCopiedTaskId(null), 2500);
  };

  // Download flyer helper
  const handleDownloadFlyer = async (flyerUrl: string, title: string) => {
    try {
      toast.info("Preparing flyer download...");
      const response = await fetch(flyerUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Syndicate_Flyer_${title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Flyer downloaded successfully!");
    } catch (e) {
      window.open(flyerUrl, '_blank');
      toast.info("Opened flyer in new tab. Long press or right-click to save image.");
    }
  };

  // Quick share to external platform for syndicate task
  const openPlatformShare = (task: any, platformKey: string) => {
    const platform = SHARE_PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

    const shareUrl = task.link_url || window.location.origin;
    const caption = task.caption || task.description || task.title;
    const fullText = `${task.title}\n\n${caption}`;

    const finalUrl = platform.build(fullText, shareUrl);
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
    toast.success(`Opened ${platform.label}. Share to your feed or status, then submit your proof!`);
  };

  // Official Platform Task Verification Flow
  const startPlatformVerification = (task: CreditTask, platformKey: string) => {
    const platform = SHARE_PLATFORMS.find(p => p.key === platformKey);
    if (platform && task.share_url) {
      const text = `${task.title} — ${task.description || ''}`;
      window.open(platform.build(text, task.share_url), '_blank', 'noopener,noreferrer');
    }
    setPlatformShareTarget(null);
    setVerifyingTaskId(task.id);
    toast.info("⏳ Sharing... Verifying in 15 seconds. Stay on page!", { duration: 15000 });

    setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setVerifyingTaskId(null);
          return;
        }

        const res = await executeCompleteTask(task.id);
        setVerifyingTaskId(null);

        if (res.alreadyCompleted) {
          toast.info(res.error || "You have already completed this task today!");
          setCompletions(prev => Array.from(new Set([...prev, task.id])));
          return;
        }

        if (!res.success) {
          toast.error(res.error || "Failed to complete task");
          return;
        }

        if (res.newBalance !== undefined) {
          onCreditsUpdate(res.newBalance);
        }
        setCompletions(prev => Array.from(new Set([...prev, task.id])));
        playRewardSound();
        toast.success(`🎉 Task completed! +${res.rewardAwarded} credits credited to your wallet!`);
        loadData();
      } catch (err) {
        setVerifyingTaskId(null);
        toast.error("Verification timed out. Please try again.");
      }
    }, 15000);
  };

  // Proof Submission Handler
  const handleSubmitProof = async () => {
    if (!selectedTaskForProof) return;
    if (!proofFile && !proofPostLink.trim()) {
      toast.error("Please upload a screenshot or paste a link to your post/status");
      return;
    }

    setSubmittingProof(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let uploadedProofUrl: string | null = null;
      let proofHash = '';

      // Upload screenshot if provided
      if (proofFile) {
        // Calculate hash to prevent duplicate submissions
        try {
          const buf = await proofFile.arrayBuffer();
          const h = await crypto.subtle.digest('SHA-256', buf);
          proofHash = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');

          const { data: dupe } = await supabase
            .from('syndicate_task_assignments')
            .select('id, syndicate_user_id')
            .eq('proof_hash', proofHash)
            .in('status', ['submitted', 'approved'])
            .limit(1)
            .maybeSingle();

          if (dupe && dupe.syndicate_user_id !== user.id) {
            toast.error("This exact screenshot has already been submitted by another member. Please upload your own original screenshot.");
            setSubmittingProof(false);
            return;
          }
        } catch (e) {
          console.warn("Hash computation note:", e);
        }

        const ext = proofFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${selectedTaskForProof.id}_${Date.now()}.${ext}`;

        let uploadRes = await supabase.storage
          .from('syndicate-proofs')
          .upload(fileName, proofFile, { upsert: true });

        // Fallback to task-flyers bucket if syndicate-proofs is not configured
        if (uploadRes.error) {
          uploadRes = await supabase.storage
            .from('task-flyers')
            .upload(fileName, proofFile, { upsert: true });
        }

        if (uploadRes.error) {
          throw new Error("Failed to upload screenshot: " + uploadRes.error.message);
        }

        const { data: urlData } = supabase.storage
          .from(uploadRes.data ? 'syndicate-proofs' : 'task-flyers')
          .getPublicUrl(fileName);
        uploadedProofUrl = urlData.publicUrl;
      }

      // Check existing assignment
      const existingAssign = myAssignments.find(a => a.task_id === selectedTaskForProof.id);
      const executionDate = selectedTaskForProof.campaign_date || new Date().toISOString().split('T')[0];

      if (existingAssign) {
        const { error: updateErr } = await supabase
          .from('syndicate_task_assignments')
          .update({
            proof_url: uploadedProofUrl || existingAssign.proof_url,
            proof_link: proofPostLink.trim() || existingAssign.proof_link || null,
            proof_hash: proofHash || existingAssign.proof_hash || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          } as any)
          .eq('id', existingAssign.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('syndicate_task_assignments')
          .insert({
            task_id: selectedTaskForProof.id,
            syndicate_user_id: user.id,
            proof_url: uploadedProofUrl,
            proof_link: proofPostLink.trim() || null,
            proof_hash: proofHash || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            execution_date: executionDate,
          } as any);

        if (insertErr) throw insertErr;
      }

      toast.success("✓ Proof submitted successfully! Admin will verify and settle your payout.");
      playRewardSound();
      setSelectedTaskForProof(null);
      setProofFile(null);
      setProofFilePreview(null);
      setProofPostLink('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proof. Please try again.");
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Optional Slides Carousel */}
      {isEnabled('slides') && <SlideCarousel />}

      {/* Top Universal Status Header */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Tasks & Campaigns</h2>
              {isActivated ? (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Activated
                </Badge>
              ) : hasPendingApp ? (
                <Badge variant="outline" className="text-amber-600 border-amber-600/40 text-[10px] font-bold px-2 py-0.5">
                  <Clock className="h-3 w-3 mr-1" />
                  Review Pending
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] font-semibold px-2 py-0.5">
                  Standard Member
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Official platform promotions & verified syndicate broadcasts
            </p>
          </div>
        </div>

        {/* User Balance & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/80 border border-border text-xs font-bold text-foreground">
            <Wallet className="h-3.5 w-3.5 text-purple-600" />
            <span>{credits.toLocaleString()} Credits</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 w-8 p-0 rounded-xl border-border"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 1. FEATURED OFFICIAL PLATFORM TASK (Available to all users to earn credits) */}
      {platformTask && (() => {
        const platformCompleted = completions.includes(platformTask.id);
        const isVerifying = verifyingTaskId === platformTask.id;
        const rewardAmount = platformTask.reward_credits || 100;

        return (
          <Card className="overflow-hidden border-2 border-orange-500/40 bg-gradient-to-br from-orange-500/5 via-background to-amber-500/10 shadow-xs rounded-2xl">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-3.5 py-1.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-yellow-200 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">Official Platform Mission</span>
              </div>
              <span className="text-[11px] font-black bg-white text-orange-600 px-2 py-0.5 rounded-full shadow-xs">
                +{rewardAmount} CREDITS
              </span>
            </div>

            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
                  <Share2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground leading-snug">
                    {platformTask.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {platformTask.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/70">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Coins className="h-3.5 w-3.5 text-orange-500" />
                  <span>Instant reward: <strong className="text-foreground font-bold">{rewardAmount} Credits</strong></span>
                </div>

                {platformCompleted ? (
                  <Button
                    size="sm"
                    disabled
                    className="bg-green-600 text-white font-bold text-xs rounded-xl px-3.5 h-8 opacity-95"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Completed Today ✓
                  </Button>
                ) : isVerifying ? (
                  <Button
                    size="sm"
                    disabled
                    className="bg-orange-500 text-white font-bold text-xs rounded-xl px-3.5 h-8"
                  >
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Verifying (15s)...
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setPlatformShareTarget(platformTask)}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl px-3.5 h-8 shadow-xs"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share & Earn {rewardAmount} Credits
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 2. SYNDICATE BROADCAST CAMPAIGNS SECTION */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />
            <h3 className="text-sm font-bold text-foreground">Syndicate Paid Broadcast Campaigns</h3>
          </div>
          {isActivated && (
            <span className="text-xs font-semibold text-muted-foreground">
              {syndicateTasks.length} Active {syndicateTasks.length === 1 ? 'Campaign' : 'Campaigns'}
            </span>
          )}
        </div>

        {/* ACTIVATION CHECK: What users see based on their activation status */}
        {!isActivated ? (
          <Card className="border border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-background to-purple-500/10 rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      {hasPendingApp ? 'Syndicate Activation Under Review' : 'Syndicate Activation Required'}
                    </h4>
                    <Badge variant="outline" className="text-purple-600 border-purple-500/30 text-[10px] font-bold">
                      Direct Payouts
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {hasPendingApp 
                      ? 'Your application to become a verified Syndicate member is currently being reviewed by administrators. Once approved, all active paid broadcast campaigns will appear directly here for participation and daily settlements.'
                      : 'Paid broadcast campaigns on GGD are distributed directly to verified Syndicate members. When a campaign is broadcast, members share the flyer to their WhatsApp status and social channels, submit proof, and receive direct cash settlements.'
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-xs">1</div>
                  <span className="font-semibold text-foreground">Activate Profile</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center font-bold text-xs">2</div>
                  <span className="font-semibold text-foreground">Broadcast Daily</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
                  <span className="font-semibold text-foreground">Direct Bank Payout</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                {hasPendingApp ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onNavigate?.('syndicate')}
                    className="h-9 px-4 rounded-xl text-xs font-bold border-border"
                  >
                    View Application Status
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => onNavigate?.('syndicate-join')}
                      className="h-9 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Apply for Syndicate Activation
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onNavigate?.('syndicate')}
                      className="h-9 px-3.5 rounded-xl text-xs font-bold border-border"
                    >
                      Learn More
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ACTIVATED USER: DIRECT ACCESS TO BROADCAST CAMPAIGNS (No assignment barriers) */
          <div className="space-y-3">
            {syndicateTasks.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-2xl border border-border">
                <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-foreground">No Broadcast Campaigns Active Right Now</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  New verified campaigns are broadcast throughout the day. Check back soon or ensure your notifications are on!
                </p>
              </div>
            ) : (
              syndicateTasks.map(task => {
                const userAssign = myAssignments.find(a => a.task_id === task.id);
                const isSubmitted = userAssign && userAssign.status === 'submitted';
                const isApproved = userAssign && userAssign.status === 'approved';
                const isRejected = userAssign && userAssign.status === 'rejected';

                const rewardText = task.reward_amount 
                  ? `₦${Number(task.reward_amount).toLocaleString()}` 
                  : 'Cash Reward';

                const platforms = Array.isArray(task.target_platforms) 
                  ? task.target_platforms 
                  : (task.target_platforms || 'WhatsApp, Facebook').split(',');

                return (
                  <Card key={task.id} className="border border-border bg-card rounded-2xl overflow-hidden shadow-xs hover:border-purple-500/30 transition-all">
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      {/* Top Bar: Title & Reward */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md">
                              Syndicate Campaign
                            </span>
                            {task.target_state && task.target_state !== 'ALL' && (
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                📍 {task.target_state} State
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                            {task.title}
                          </h4>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-emerald-600 block">
                            {rewardText}
                          </span>
                          <span className="text-[10px] text-muted-foreground">per verified post</span>
                        </div>
                      </div>

                      {/* Flyer / Visual Preview (if available) */}
                      {task.flyer_url && (
                        <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/30">
                          <img 
                            loading="lazy" 
                            src={task.flyer_url} 
                            alt={task.title} 
                            className="w-full max-h-56 object-cover" 
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadFlyer(task.flyer_url, task.title)}
                            className="absolute bottom-2 right-2 h-7 px-2.5 rounded-lg text-[11px] font-bold bg-black/70 hover:bg-black/90 text-white backdrop-blur flex items-center gap-1 shadow-md"
                          >
                            <Download className="h-3 w-3" />
                            Download Flyer
                          </Button>
                        </div>
                      )}

                      {/* Description / Post Caption */}
                      {(task.caption || task.description) && (
                        <div className="p-3 rounded-xl bg-muted/50 border border-border/60 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                            <span>Caption to Broadcast:</span>
                            <button
                              type="button"
                              onClick={() => copyCaption(task.caption || task.description, task.id)}
                              className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-[11px] font-semibold"
                            >
                              {copiedTaskId === task.id ? (
                                <><Check className="h-3 w-3 text-emerald-600" /> Copied!</>
                              ) : (
                                <><Copy className="h-3 w-3" /> Copy Caption</>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                            {task.caption || task.description}
                          </p>
                        </div>
                      )}

                      {/* Quick 1-Tap Share Bar */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          Broadcast to your audience:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPlatformShare(task, 'whatsapp')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold shadow-2xs hover:opacity-95 transition"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp Status
                          </button>

                          <button
                            type="button"
                            onClick={() => openPlatformShare(task, 'facebook')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2] text-white text-xs font-bold shadow-2xs hover:opacity-95 transition"
                          >
                            <Facebook className="h-3.5 w-3.5" />
                            Facebook
                          </button>

                          <button
                            type="button"
                            onClick={() => openPlatformShare(task, 'telegram')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] text-white text-xs font-bold shadow-2xs hover:opacity-95 transition"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Telegram
                          </button>

                          <button
                            type="button"
                            onClick={() => openPlatformShare(task, 'x')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold shadow-2xs hover:opacity-95 transition"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            X / Twitter
                          </button>
                        </div>
                      </div>

                      {/* Bottom Status / Direct Submission Bar */}
                      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          {isApproved ? (
                            <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approved & Paid ({rewardText})
                            </Badge>
                          ) : isSubmitted ? (
                            <Badge className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1">
                              <Clock className="h-3.5 w-3.5 mr-1" />
                              Proof Submitted — In Review
                            </Badge>
                          ) : isRejected ? (
                            <Badge variant="destructive" className="text-xs font-bold px-2.5 py-1">
                              <AlertCircle className="h-3.5 w-3.5 mr-1" />
                              Rejected ({userAssign?.rejection_reason || 'Incomplete proof'})
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-purple-600" />
                              Ready for submission
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            setSelectedTaskForProof(task);
                            setProofFile(null);
                            setProofFilePreview(null);
                            setProofPostLink(userAssign?.proof_link || '');
                          }}
                          className={`h-9 px-4 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 ${
                            isApproved 
                              ? 'bg-muted text-muted-foreground hover:bg-muted' 
                              : isSubmitted 
                                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {isSubmitted ? 'Update Proof' : isRejected ? 'Re-submit Proof' : 'Submit Proof of Broadcast'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 3. BUSINESS / ADVERTISER FOOTER SECTION */}
      <Card className="border border-border/80 bg-muted/40 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">Want to Broadcast Your Own Business?</h4>
              <p className="text-[11px] text-muted-foreground">
                Launch an official Syndicate Campaign to broadcast your flyer across thousands of verified Nigerian status viewers.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('business-tasks')}
            className="h-8 px-3.5 text-xs font-bold rounded-xl border-border shrink-0 self-start sm:self-auto"
          >
            Launch Campaign
          </Button>
        </div>
      </Card>

      {/* Proof Submission Dialog */}
      <Dialog open={!!selectedTaskForProof} onOpenChange={(open) => { if (!open) setSelectedTaskForProof(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Upload className="h-4 w-4 text-purple-600" />
              Submit Proof of Broadcast
            </DialogTitle>
          </DialogHeader>

          {selectedTaskForProof && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs space-y-1">
                <p className="font-bold text-foreground">{selectedTaskForProof.title}</p>
                <p className="text-muted-foreground text-[11px]">
                  Eligible Payout: <strong className="text-emerald-600 font-bold">₦{Number(selectedTaskForProof.reward_amount || 0).toLocaleString()}</strong>
                </p>
              </div>

              {/* Upload Screenshot / Image */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  1. Upload Screenshot of Your Status / Post *
                </label>
                <input
                  type="file"
                  id="proofScreenshotInput"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProofFile(file);
                      setProofFilePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />

                {proofFilePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img 
                      src={proofFilePreview} 
                      alt="Proof preview" 
                      className="w-full max-h-48 object-cover" 
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setProofFile(null);
                        setProofFilePreview(null);
                      }}
                      className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('proofScreenshotInput')?.click()}
                    className="w-full h-24 rounded-xl border-dashed border-2 border-border/80 flex flex-col items-center justify-center gap-1 hover:bg-muted/40"
                  >
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Tap to upload screenshot (PNG, JPG)
                    </span>
                  </Button>
                )}
              </div>

              {/* Post Link (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  2. Post Link (Optional for Facebook / X / TikTok)
                </label>
                <Input
                  placeholder="https://facebook.com/... or https://x.com/..."
                  value={proofPostLink}
                  onChange={(e) => setProofPostLink(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                  Proof Verification Note:
                </p>
                <p>
                  Screenshots are verified using image fingerprinting. Make sure your screenshot clearly shows the flyer posted to your audience or status viewers.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTaskForProof(null)}
                  className="flex-1 h-10 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitProof}
                  disabled={submittingProof || (!proofFile && !proofPostLink.trim())}
                  className="flex-1 h-10 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {submittingProof ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Confirm Submission
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Platform Task Share Platform Picker Dialog */}
      <Dialog open={!!platformShareTarget} onOpenChange={(o) => { if (!o) setPlatformShareTarget(null); }}>
        <DialogContent className="max-w-sm rounded-2xl p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Select Sharing Platform</DialogTitle>
          </DialogHeader>
          {platformShareTarget && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/60 text-xs space-y-1">
                <p className="font-bold text-foreground">{platformShareTarget.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{platformShareTarget.description}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Pick a platform to share the official GGD mission. Return in 15 seconds to claim credits!
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {SHARE_PLATFORMS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.key}
                      onClick={() => startPlatformVerification(platformShareTarget, p.key)}
                      className={`${p.color} text-white rounded-xl p-3 flex flex-col items-center gap-1.5 hover:opacity-95 transition text-xs font-bold`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskList;
