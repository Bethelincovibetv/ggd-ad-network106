import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  ChevronRight,
  Video,
  Calendar,
  Share2,
  FileCheck,
  Zap,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import SyndicateOnboardingWizard from "@/components/SyndicateOnboardingWizard";
import SyndicateWallet from "@/components/SyndicateWallet";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { notifyAdminsOfApprovalRequired } from "@/services/adminNotificationHelper";

const isVideoProof = (url?: string | null) => {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/videos/') || url.includes('video');
};

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

interface SyndicateDashboardProps {
  onNavigate?: (tab: string) => void;
}

const SyndicateDashboard: React.FC<SyndicateDashboardProps> = ({ onNavigate }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [mainProfile, setMainProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  
  // App Settings
  const [assignmentHours, setAssignmentHours] = useState(24);
  const [showWizard, setShowWizard] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [payoutPct, setPayoutPct] = useState<number>(70);
  const [credits, setCredits] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  
  // Date Filtering (Default: All active campaigns)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'all' | 'custom'>('all');
  
  // Submission Form State (per-task)
  const [proofFiles, setProofFiles] = useState<Record<string, File>>({});
  const [proofLinks, setProofLinks] = useState<Record<string, string>>({});
  const [proofPreviews, setProofPreviews] = useState<Record<string, string>>({});
  
  // Primary navigation tab: 'campaigns' | 'submissions' | 'wallet' | 'profile'
  const [mainTab, setMainTab] = useState<string>('campaigns');
  // Submissions filter: 'all' | 'submitted' | 'completed' | 'rejected'
  const [submissionsFilter, setSubmissionsFilter] = useState<string>('all');
  const [showTutorialVideo, setShowTutorialVideo] = useState(false);
  
  const { isEnabled } = useFeatureToggles();

  useEffect(() => { 
    fetchData(); 
  }, [selectedDate, dateFilterMode]);

  const setDateFilter = (mode: 'today' | 'yesterday' | 'all' | 'custom', customDate?: string) => {
    setDateFilterMode(mode);
    const today = new Date();
    if (mode === 'today') {
      setSelectedDate(today.toISOString().split('T')[0]);
    } else if (mode === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setSelectedDate(y.toISOString().split('T')[0]);
    } else if (mode === 'custom' && customDate) {
      setSelectedDate(customDate);
    }
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserEmail(user.email || '');

    try {
      // Build tasks query based on date filter
      let tasksQuery = supabase
        .from('syndicate_tasks')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (dateFilterMode !== 'all') {
        tasksQuery = tasksQuery
          .gte('created_at', `${selectedDate}T00:00:00`)
          .lte('created_at', `${selectedDate}T23:59:59`);
      }

      const [
        tasksRes, 
        assignmentsRes, 
        profileRes, 
        profCreditsRes, 
        settingRes, 
        rateRes, 
        payoutRes, 
        pausedRes
      ] = await Promise.all([
        tasksQuery,
        supabase.from('syndicate_task_assignments').select('*, syndicate_tasks(*)').eq('syndicate_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('credits, avatar_url, display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_assignment_hours').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_payout_percentage').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_paused').maybeSingle(),
      ]);

      setTasks(tasksRes.data || []);
      setMyAssignments(assignmentsRes.data || []);
      setProfile(profileRes.data);
      setMainProfile(profCreditsRes.data);
      const c = Number(profCreditsRes.data?.credits || 0);
      setCredits(c);
      const r = parseInt(rateRes.data?.value || '') || 100;
      setExchangeRate(r);
      const pct = parseInt(payoutRes.data?.value || '') || 70;
      setPayoutPct(pct);
      setPaused((pausedRes.data?.value || 'false') === 'true');
      setWallet({ balance: c * r });
      const h = Number(settingRes.data?.value);
      if (!Number.isNaN(h) && h > 0) setAssignmentHours(h);

      // Show onboarding wizard for newly approved syndicates (only once)
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

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const fileName = `${user.id}/avatar-${uniqueSuffix}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        toast.error(uploadError.message || "Upload failed");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await Promise.all([
        supabase.from('profiles').update({ avatar_url: publicUrl, business_logo_url: publicUrl }).eq('user_id', user.id),
        (supabase.from('business_profiles') as any).update({ logo_url: publicUrl }).eq('user_id', user.id),
        supabase.from('syndicate_profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id),
      ]);

      setMainProfile((current: any) => ({ ...current, avatar_url: publicUrl }));
      setProfile((current: any) => current ? { ...current, avatar_url: publicUrl } : current);
      toast.success("Profile photo updated!");
      fetchData();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const copyText = (text: string) => { 
    navigator.clipboard.writeText(text); 
    toast.success("Copied to clipboard!"); 
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

  const handleProofFileSelect = (taskId: string, file: File) => {
    setProofFiles(prev => ({ ...prev, [taskId]: file }));
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setProofPreviews(prev => ({ ...prev, [taskId]: previewUrl }));
    }
  };

  const submitProofDirect = async (task: any) => {
    const file = proofFiles[task.id];
    const postLink = proofLinks[task.id] || '';

    if (!file) {
      toast.error("Please upload your screenshot or video proof first");
      return;
    }

    setSubmittingTaskId(task.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (paused) {
        toast.error("Syndicate operations are temporarily paused by admin");
        return;
      }
      if (profile?.is_suspended) {
        toast.error(`Account suspended${profile?.suspended_reason ? `: ${profile.suspended_reason}` : ''}`);
        return;
      }

      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
      const maxSizeBytes = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error(isVideo ? "Video proof must be under 50MB" : "Image proof must be under 15MB");
        return;
      }

      // 1. Calculate SHA-256 file hash to prevent duplicate submissions
      let proofHash = '';
      try {
        const buf = await file.arrayBuffer();
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
          toast.error("This exact proof has already been submitted by another member. Please upload your original post screenshot.");
          return;
        }
      } catch (err) {
        console.warn("Hash computation note:", err);
      }

      // 2. Upload file to syndicate-proofs storage bucket
      const userProfile = mainProfile?.display_name || userEmail.split('@')[0] || 'member';
      const sanitizedName = userProfile.replace(/[^a-zA-Z0-9]/g, '_');
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `${user.id}/${sanitizedName}_${task.id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('syndicate-proofs')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg')
        });

      if (uploadError) {
        toast.error("Failed to upload proof file: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('syndicate-proofs')
        .getPublicUrl(fileName);

      // 3. Upsert into syndicate_task_assignments with status 'submitted'
      const existingAssign = myAssignments.find(a => a.task_id === task.id);
      const executionDate = task.campaign_date || selectedDate || new Date().toISOString().split('T')[0];

      if (existingAssign) {
        const { error: updateErr } = await supabase
          .from('syndicate_task_assignments')
          .update({
            proof_url: publicUrl,
            proof_link: postLink || null,
            proof_hash: proofHash || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          } as any)
          .eq('id', existingAssign.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('syndicate_task_assignments')
          .insert({
            task_id: task.id,
            syndicate_user_id: user.id,
            proof_url: publicUrl,
            proof_link: postLink || null,
            proof_hash: proofHash || null,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          } as any);

        if (insertErr) throw insertErr;
      }

      // Notify Admins to review this campaign proof
      await notifyAdminsOfApprovalRequired({
        title: "📸 New Syndicate Proof Submitted",
        message: `A member submitted execution proof for campaign: "${task.title || 'Syndicate Campaign'}". Review and approve for payout.`,
        type: 'syndicate_approval',
        tab: 'proofs',
        linkUrl: '/admin?section=syndicate&tab=proofs',
      });

      toast.success("🎉 Proof submitted successfully! Your participation is recorded for team settlement.");
      
      // Clear per-task form state
      setProofFiles(prev => { const n = { ...prev }; delete n[task.id]; return n; });
      setProofLinks(prev => { const n = { ...prev }; delete n[task.id]; return n; });
      setProofPreviews(prev => { const n = { ...prev }; delete n[task.id]; return n; });
      
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit proof");
    } finally {
      setSubmittingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading Syndicate Command Hub...</p>
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

  // Map user assignments by task_id for instant O(1) status lookup
  const assignmentByTaskId: Record<string, any> = {};
  myAssignments.forEach(a => {
    assignmentByTaskId[a.task_id] = a;
  });

  // Filtered submissions for History Tab
  const filteredSubmissions = myAssignments.filter(a => {
    if (submissionsFilter === 'all') return true;
    if (submissionsFilter === 'submitted') return a.status === 'submitted';
    if (submissionsFilter === 'completed') return a.status === 'approved' || a.status === 'paid';
    if (submissionsFilter === 'rejected') return a.status === 'rejected';
    return true;
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 px-3 sm:px-4">
      {/* Mobile-Friendly Clean App Header */}
      <div className="rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs flex-shrink-0">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Syndicate</h1>
              <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                {profile?.state ? `${profile.state} Station` : 'Nationwide'}
              </Badge>
              {profile?.bank_name && (
                <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500 text-emerald-600 dark:text-emerald-400">
                  Bank Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available campaigns for member broadcast and automated settlement
            </p>
          </div>
        </div>

        {/* Compact Quick Stats Strip */}
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border border-border/60 self-start sm:self-auto">
          <div className="px-2.5 py-1 text-center">
            <span className="text-[10px] text-muted-foreground block">Campaigns</span>
            <span className="text-xs font-black text-foreground">{tasks.length}</span>
          </div>
          <div className="h-6 w-px bg-border/80" />
          <div className="px-2.5 py-1 text-center">
            <span className="text-[10px] text-muted-foreground block">Participated</span>
            <span className="text-xs font-black text-purple-600">{myAssignments.length}</span>
          </div>
          <div className="h-6 w-px bg-border/80" />
          <div className="px-2.5 py-1 text-center">
            <span className="text-[10px] text-muted-foreground block">Earnings</span>
            <span className="text-xs font-black text-emerald-600">₦{(wallet?.balance || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* PRIMARY SEGMENTED NAVIGATION TABS */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full space-y-4">
        <TabsList className="w-full grid grid-cols-4 h-12 p-1 bg-muted/80 rounded-xl border border-border">
          <TabsTrigger 
            value="campaigns" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-lg h-10 data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            <Briefcase className="h-3.5 w-3.5 text-purple-600" />
            <span className="hidden sm:inline">Available</span> Campaigns
            {tasks.length > 0 && (
              <Badge className="h-4 px-1 text-[9px] bg-purple-600 text-white font-bold ml-0.5">
                {tasks.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="submissions" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-lg h-10 data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
            Submissions
            {myAssignments.length > 0 && (
              <Badge className="h-4 px-1 text-[9px] bg-blue-600 text-white font-bold ml-0.5">
                {myAssignments.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger 
            value="wallet" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-lg h-10 data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            <Wallet className="h-3.5 w-3.5 text-green-600" />
            Payout Bank
          </TabsTrigger>

          <TabsTrigger 
            value="profile" 
            className="text-xs sm:text-sm font-bold gap-1.5 rounded-lg h-10 data-[state=active]:bg-background data-[state=active]:shadow-xs"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* VIEW 1: AVAILABLE CAMPAIGNS & PARTICIPATION */}
        <TabsContent value="campaigns" className="space-y-4 outline-none">
          {/* Date Selector & Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-border bg-card shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span>Available Campaigns</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={dateFilterMode === 'today' ? 'default' : 'outline'}
                onClick={() => setDateFilter('today')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg ${dateFilterMode === 'today' ? 'bg-purple-600 text-white' : 'border-border'}`}
              >
                Today
              </Button>

              <Button
                type="button"
                size="sm"
                variant={dateFilterMode === 'yesterday' ? 'default' : 'outline'}
                onClick={() => setDateFilter('yesterday')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg ${dateFilterMode === 'yesterday' ? 'bg-purple-600 text-white' : 'border-border'}`}
              >
                Yesterday
              </Button>

              <Button
                type="button"
                size="sm"
                variant={dateFilterMode === 'all' ? 'default' : 'outline'}
                onClick={() => setDateFilter('all')}
                className={`h-7 px-2.5 text-xs font-bold rounded-lg ${dateFilterMode === 'all' ? 'bg-purple-600 text-white' : 'border-border'}`}
              >
                All Dates
              </Button>

              <div className="flex items-center gap-1 bg-muted/70 px-2 py-0.5 rounded-lg border border-border">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateFilter('custom', e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Campaigns Feed */}
          <div className="space-y-3.5">
            {tasks.map((task) => {
              const userAssignment = assignmentByTaskId[task.id];
              const hasParticipated = Boolean(userAssignment && ['submitted', 'approved', 'paid'].includes(userAssignment.status));
              
              const explicitPayout = Number(task.payout_amount || 0);
              const settlementBase = Number(task.total_cost || ((task.cost_per_syndicate || 50) * (task.max_syndicates || 1)));
              const teamPayoutPool = Math.round(settlementBase * (payoutPct / 100));
              const eligibleMembersCount = Number(task.max_syndicates || 1);
              const taskPayoutNaira = explicitPayout > 0 ? explicitPayout : Math.max(1, Math.round(teamPayoutPool / eligibleMembersCount));

              const isSubmittingThis = submittingTaskId === task.id;
              const selectedFile = proofFiles[task.id];
              const previewUrl = proofPreviews[task.id];
              const postLink = proofLinks[task.id] || '';

              return (
                <Card 
                  key={task.id} 
                  className={`border shadow-xs overflow-hidden transition-all bg-card rounded-2xl ${
                    hasParticipated 
                      ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/15 dark:bg-emerald-950/10' 
                      : 'border-border/80 hover:border-purple-300'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3.5">
                    {/* Header: Title, Date, Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-foreground">{task.title}</h3>
                          <Badge variant="outline" className="text-[11px] font-semibold flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-purple-600" />
                            {task.target_state || 'Nationwide'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            {task.campaign_date || selectedDate}
                          </Badge>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {hasParticipated ? (
                          <Badge className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> ✓ Participated
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-600 text-white text-xs font-bold px-2.5 py-0.5">
                            Available
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Member Experience Status & Payout Grid */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Participation</span>
                        <span className={`text-xs font-bold ${hasParticipated ? 'text-emerald-600' : 'text-foreground'}`}>
                          {hasParticipated ? '✓ Participated' : 'Not Participated'}
                        </span>
                      </div>
                      <div className="border-x border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-medium">Proof Status</span>
                        <span className={`text-xs font-bold ${hasParticipated ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {hasParticipated 
                            ? (userAssignment.status === 'approved' || userAssignment.status === 'paid' ? 'Settled & Paid' : 'Submitted') 
                            : 'Not Submitted'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Payout</span>
                        <span className={`text-xs font-black ${hasParticipated ? 'text-emerald-600' : 'text-foreground'}`}>
                          {hasParticipated ? `₦${taskPayoutNaira.toLocaleString()}` : '₦0'}
                        </span>
                      </div>
                    </div>

                    {/* Short Description */}
                    {task.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                        {task.description}
                      </p>
                    )}

                    {/* Campaign Materials & Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {task.description && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyText(task.description)}
                          className="h-8 text-xs font-bold rounded-xl border-border"
                        >
                          <Copy className="h-3 w-3 mr-1 text-purple-600" /> Copy Caption
                        </Button>
                      )}

                      {task.smart_link && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyText(task.smart_link)}
                          className="h-8 text-xs font-bold rounded-xl border-border"
                        >
                          <Share2 className="h-3 w-3 mr-1 text-blue-600" /> Copy Link
                        </Button>
                      )}

                      {task.smart_link && (
                        <a 
                          href={task.smart_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-bold rounded-xl border border-border bg-background hover:bg-muted transition"
                        >
                          <ExternalLink className="h-3 w-3 mr-1 text-slate-500" /> Open Link
                        </a>
                      )}

                      {task.flyer_url && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFlyer(task.flyer_url, task.title)}
                          className="h-8 text-xs font-bold rounded-xl text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20"
                        >
                          <Download className="h-3 w-3 mr-1" /> Download Flyer
                        </Button>
                      )}
                    </div>

                    {/* Visual Flyer Thumbnail (if attached) */}
                    {task.flyer_url && (
                      <div className="relative rounded-xl overflow-hidden border border-border/70 max-w-sm max-h-48 bg-muted/40">
                        <img 
                          src={task.flyer_url} 
                          alt={task.title} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}

                    {/* PARTICIPATION & PROOF PANEL */}
                    <div className="pt-2 border-t border-border/50">
                      {hasParticipated ? (
                        /* ALREADY PARTICIPATED VIEW */
                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                              <span>Participation Recorded</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(userAssignment.submitted_at || userAssignment.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {userAssignment.proof_url && (
                            <div className="flex items-center gap-3 pt-1">
                              <a 
                                href={userAssignment.proof_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="h-12 w-16 rounded-lg overflow-hidden border border-border bg-background flex-shrink-0 block"
                              >
                                {isVideoProof(userAssignment.proof_url) ? (
                                  <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">
                                    <Video className="h-4 w-4 text-emerald-400" />
                                  </div>
                                ) : (
                                  <img 
                                    src={userAssignment.proof_url} 
                                    alt="Proof" 
                                    className="h-full w-full object-cover" 
                                  />
                                )}
                              </a>
                              <div className="text-xs">
                                <a 
                                  href={userAssignment.proof_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                                >
                                  View Submitted Proof <ExternalLink className="h-3 w-3" />
                                </a>
                                {userAssignment.proof_link && (
                                  <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                                    Post: {userAssignment.proof_link}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* DIRECT SUBMISSION FORM - NO CLAIMING OR FETCHING */
                        <div className="rounded-xl bg-muted/40 border border-border/70 p-3 sm:p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5 text-purple-600" /> Submit Proof to Participate
                            </h4>
                            <span className="text-[11px] text-emerald-600 font-bold">
                              Eligible Payout: ₦{taskPayoutNaira.toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Proof File Picker */}
                            <div>
                              <label className="text-[11px] font-semibold text-foreground block mb-1">
                                Screenshot / Video Proof <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="file"
                                id={`proof-input-${task.id}`}
                                accept="image/*,video/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleProofFileSelect(task.id, f);
                                }}
                                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer border border-input rounded-xl p-1 bg-background"
                              />
                            </div>

                            {/* Social Post URL (Optional) */}
                            <div>
                              <label className="text-[11px] font-semibold text-foreground block mb-1">
                                Social Post Link (Optional)
                              </label>
                              <Input
                                type="url"
                                placeholder="https://instagram.com/p/... or https://wa.me/..."
                                value={postLink}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProofLinks(prev => ({ ...prev, [task.id]: val }));
                                }}
                                className="h-9 text-xs rounded-xl"
                              />
                            </div>
                          </div>

                          {/* Selected File Preview */}
                          {previewUrl && (
                            <div className="flex items-center gap-2.5 bg-background p-2 rounded-lg border border-border">
                              <img src={previewUrl} alt="Preview" className="h-10 w-14 object-cover rounded-md" />
                              <div className="text-xs">
                                <p className="font-bold text-foreground truncate max-w-xs">{selectedFile?.name}</p>
                                <p className="text-[10px] text-muted-foreground">Ready for submission</p>
                              </div>
                            </div>
                          )}

                          {/* Submit Action */}
                          <div className="flex items-center justify-end pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => submitProofDirect(task)}
                              disabled={!selectedFile || isSubmittingThis}
                              className="h-9 px-5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5 text-xs"
                            >
                              {isSubmittingThis ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                                </>
                              ) : (
                                <>
                                  <FileCheck className="h-3.5 w-3.5" /> Submit Proof
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-14 px-4 space-y-3 bg-card rounded-2xl border border-dashed border-border shadow-2xs">
                <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">No Campaigns for {selectedDate}</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    There are no active campaigns scheduled for this date. Check another date above or tap "All Dates".
                  </p>
                </div>
                <Button 
                  type="button"
                  size="sm"
                  onClick={() => setDateFilter('all')} 
                  className="h-9 px-4 rounded-xl font-bold bg-purple-600 text-white text-xs"
                >
                  View All Campaigns
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* VIEW 2: SUBMISSIONS & SETTLEMENT HISTORY */}
        <TabsContent value="submissions" className="space-y-4 outline-none">
          {/* Submissions Filter Tabs */}
          <div className="grid grid-cols-4 gap-2 p-1.5 bg-muted/70 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setSubmissionsFilter('all')}
              className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                submissionsFilter === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>All Submissions</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-slate-700 text-white">{myAssignments.length}</Badge>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionsFilter('submitted')}
              className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                submissionsFilter === 'submitted' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Pending Settle</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-amber-500 text-white">
                {myAssignments.filter(a => a.status === 'submitted').length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionsFilter('completed')}
              className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                submissionsFilter === 'completed' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Settled & Paid</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-emerald-600 text-white">
                {myAssignments.filter(a => a.status === 'approved' || a.status === 'paid').length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionsFilter('rejected')}
              className={`h-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                submissionsFilter === 'rejected' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Rejected</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-red-600 text-white">
                {myAssignments.filter(a => a.status === 'rejected').length}
              </Badge>
            </button>
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.map((assignment) => {
              const task = assignment.syndicate_tasks;
              const isPaid = assignment.status === 'approved' || assignment.status === 'paid';
              const isRejected = assignment.status === 'rejected';
              
              const explicitPayout = Number(task?.payout_amount || 0);
              const settlementBase = Number(task?.total_cost || ((task?.cost_per_syndicate || 50) * (task?.max_syndicates || 1)));
              const teamPayoutPool = Math.round(settlementBase * (payoutPct / 100));
              const eligibleMembersCount = Number(task?.max_syndicates || 1);
              const payoutNaira = explicitPayout > 0 ? explicitPayout : Math.max(1, Math.round(teamPayoutPool / eligibleMembersCount));

              return (
                <Card 
                  key={assignment.id} 
                  className={`border shadow-sm rounded-2xl overflow-hidden bg-card ${
                    isPaid ? 'border-emerald-300 dark:border-emerald-800' :
                    isRejected ? 'border-red-300 dark:border-red-800' : 'border-border'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs font-bold px-3 py-1 ${
                          isPaid ? 'bg-emerald-600 text-white' :
                          isRejected ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {isPaid ? 'Settled & Paid' : isRejected ? 'Rejected' : 'Proof Recorded · Pending Settlement'}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300">
                          ₦{payoutNaira.toLocaleString()}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {new Date(assignment.submitted_at || assignment.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-foreground">{task?.title || 'Direct Campaign'}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{task?.description}</p>
                      </div>

                      {assignment.proof_url && (
                        <a
                          href={assignment.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-14 w-20 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0 block"
                        >
                          {isVideoProof(assignment.proof_url) ? (
                            <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">
                              <Video className="h-4 w-4 text-emerald-400" />
                            </div>
                          ) : (
                            <img src={assignment.proof_url} alt="Proof" className="h-full w-full object-cover" />
                          )}
                        </a>
                      )}
                    </div>

                    {isRejected && assignment.rejection_reason && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                        <strong>Reason:</strong> {assignment.rejection_reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {filteredSubmissions.length === 0 && (
              <div className="text-center py-14 px-4 space-y-2 bg-card rounded-2xl border border-dashed border-border">
                <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">No submissions found in this category</p>
                <p className="text-xs text-muted-foreground">Go to the Active Campaigns tab to participate!</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* VIEW 3: SYNDICATE WALLET & BANK */}
        <TabsContent value="wallet" className="space-y-4 outline-none">
          <div className="p-4 sm:p-6 rounded-3xl bg-card border border-border shadow-xs">
            <h3 className="font-black text-lg text-foreground flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-purple-600" /> Syndicate Earnings & Payout Account
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Verified Nigerian bank account for automated Paystack settlements. Direct team earnings are deposited directly by Admin.
            </p>
            <SyndicateWallet />
          </div>
        </TabsContent>

        {/* VIEW 4: PROFILE & SECURITY */}
        <TabsContent value="profile" className="space-y-4 outline-none">
          <Card className="border border-border shadow-xs rounded-3xl overflow-hidden">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" /> Operator Credentials & Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="flex items-center justify-between gap-3 bg-muted/40 rounded-2xl p-4 border border-border">
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
                  className="h-10 px-4 text-xs font-bold rounded-xl border-border" 
                  onClick={() => copyText(userEmail)}
                >
                  <Copy className="h-4 w-4 mr-1.5" /> Copy Email
                </Button>
              </div>

              {profile?.verified_platforms?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">Verified Broadcast Channels:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.verified_platforms.map((p: string) => (
                      <Badge key={p} className="text-xs bg-purple-600 text-white font-bold px-3 py-1">
                        {p} ✓
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* YouTube Guide */}
          <Card className="border border-border shadow-xs rounded-3xl overflow-hidden">
            <CardHeader 
              className="p-5 pb-3 cursor-pointer select-none"
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
              <CardContent className="p-5 pt-0">
                <YouTubeEmbed section="syndicate" />
              </CardContent>
            )}
          </Card>

          {/* Syndicate Guidelines Card */}
          <Card className="border border-border shadow-xs rounded-3xl">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-purple-600" /> Direct Team Operator Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                1. <strong>Original Proofs:</strong> Only submit genuine screenshots taken from your verified social media profile, status, or group. The platform automatically scans image signatures with SHA-256 to prevent duplicate submissions.
              </p>
              <p>
                2. <strong>Direct Visibility:</strong> You do not need to "claim" tasks. All active campaigns are instantly available for your state and channels.
              </p>
              <p>
                3. <strong>Automatic Settlements:</strong> Direct team payouts are calculated and disbursed directly to your verified Paystack bank account by Admin upon campaign settlement.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SyndicateDashboard;
