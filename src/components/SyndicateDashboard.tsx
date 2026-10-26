import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Mail, 
  ShieldCheck, 
  ArrowLeft,
  Briefcase,
  CheckSquare,
  Sparkles,
  PlayCircle,
  TrendingUp,
  MessageCircle,
  BookOpen,
  Menu,
  X,
  Shield,
  Calendar,
  Search,
  ChevronRight,
  FileCheck
} from "lucide-react";
import ProductPhotoViewerModal from '@/components/ProductPhotoViewerModal';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SyndicateOnboardingWizard from "@/components/SyndicateOnboardingWizard";
import SyndicateWallet from "@/components/SyndicateWallet";
import SyndicateGuide from "@/components/SyndicateGuide";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { notifyAdminsOfApprovalRequired } from "@/services/adminNotificationHelper";
import ggdLogo from '@/assets/ggd-logo.png';

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

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  sublabel: string;
  badge?: string | number | null;
  gradient: string;
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
  const [teamWhatsappGroupLink, setTeamWhatsappGroupLink] = useState<string>('');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'all' | 'custom'>('all');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'active' | 'completed' | 'all'>('active');
  
  // Submission Form State (per-task)
  const [proofFiles, setProofFiles] = useState<Record<string, File>>({});
  const [proofLinks, setProofLinks] = useState<Record<string, string>>({});
  const [proofPreviews, setProofPreviews] = useState<Record<string, string>>({});
  
  // Active Navigation Section ('campaigns' | 'submissions' | 'team-chat' | 'wallet' | 'profile' | 'guide')
  const [activeSection, setActiveSection] = useState<string>('campaigns');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Submissions filter: 'all' | 'submitted' | 'completed' | 'rejected'
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'submitted' | 'completed' | 'rejected'>('all');
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  const [photoViewerTitle, setPhotoViewerTitle] = useState<string>('Media Lightbox');
  
  const { isEnabled } = useFeatureToggles();

  useEffect(() => { 
    fetchData(); 
  }, [selectedDate, dateFilterMode, campaignStatusFilter]);

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
      // Build tasks query based on status and date filter
      let tasksQuery = supabase
        .from('syndicate_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignStatusFilter === 'active') {
        tasksQuery = tasksQuery.eq('status', 'active');
      } else if (campaignStatusFilter === 'completed') {
        tasksQuery = tasksQuery.neq('status', 'active');
      }

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
        pausedRes,
        waGroupRes
      ] = await Promise.all([
        tasksQuery,
        supabase.from('syndicate_task_assignments').select('*, syndicate_tasks(*)').eq('syndicate_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('credits, avatar_url, display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_assignment_hours').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_payout_percentage').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_paused').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_whatsapp_group_link').maybeSingle(),
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
      setTeamWhatsappGroupLink(waGroupRes.data?.value || '');
      setWallet({ balance: c * r });
      const h = Number(settingRes.data?.value);
      if (!Number.isNaN(h) && h > 0) setAssignmentHours(h);

      // Show onboarding wizard for newly approved syndicates
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userSeen = currentUser?.id ? localStorage.getItem(`ggd_syndicate_wizard_seen_${currentUser.id}`) === 'true' : false;
      const globalSeen = localStorage.getItem('ggd_syndicate_wizard_seen') === 'true';
      const hasBank = Boolean(profileRes.data?.bank_name && profileRes.data?.account_number);
      const hasHistory = Number(profileRes.data?.tasks_completed || 0) > 0 || Number(profileRes.data?.approved_count || 0) > 0;
      const isBankLocked = Boolean(profileRes.data?.is_bank_locked);

      const isAlreadyActivated = hasBank || hasHistory || isBankLocked || userSeen || globalSeen;

      if (profileRes.data && !isAlreadyActivated) {
        setShowWizard(true);
      } else {
        setShowWizard(false);
        try {
          localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
          if (currentUser?.id) localStorage.setItem(`ggd_syndicate_wizard_seen_${currentUser.id}`, 'true');
        } catch {}
      }
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });

      if (uploadErr) {
        toast.error("Upload failed: " + uploadErr.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

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

      // SHA-256 file hash computation
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

      // Upload file to task_proofs bucket
      const fileExt = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `${task.id}_${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('task_proofs').upload(fileName, file, { upsert: true });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage.from('task_proofs').getPublicUrl(fileName);

      // Check existing assignment
      const { data: existing } = await supabase
        .from('syndicate_task_assignments')
        .select('id')
        .eq('task_id', task.id)
        .eq('syndicate_user_id', user.id)
        .maybeSingle();

      const assignData: any = {
        task_id: task.id,
        syndicate_user_id: user.id,
        status: 'submitted',
        proof_type: isVideo ? 'video' : 'image',
        proof_url: publicUrl,
        proof_hash: proofHash || null,
        proof_submitted_at: new Date().toISOString(),
        post_link: postLink || null,
      };

      if (existing) {
        await supabase.from('syndicate_task_assignments').update(assignData).eq('id', existing.id);
      } else {
        await supabase.from('syndicate_task_assignments').insert(assignData);
      }

      // Notify Admins
      try {
        await notifyAdminsOfApprovalRequired({
          taskId: task.id,
          taskTitle: task.title,
          syndicateUserId: user.id,
          syndicateName: mainProfile?.display_name || userEmail.split('@')[0],
        });
      } catch (e) {
        console.warn('Admin notification non-blocking:', e);
      }

      toast.success("🎉 Proof submitted successfully! Admin will review and disburse your payment.");
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
      <div className="min-h-screen flex flex-col items-center justify-center space-y-3 bg-background">
        <Loader2 className="h-9 w-9 text-purple-600 animate-spin" />
        <p className="text-sm font-bold text-muted-foreground">Loading Syndicate Command Portal...</p>
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
        onComplete={() => {
          setShowWizard(false);
          try {
            localStorage.setItem('ggd_syndicate_wizard_seen', 'true');
          } catch {}
          fetchData();
        }}
      />
    );
  }

  // Map user assignments by task_id for instant O(1) status lookup
  const assignmentByTaskId: Record<string, any> = {};
  myAssignments.forEach(a => {
    assignmentByTaskId[a.task_id] = a;
  });

  // Filter tasks based on search query
  const searchedTasks = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.target_state && t.target_state.toLowerCase().includes(query)) ||
      (t.platform && t.platform.toLowerCase().includes(query))
    );
  });

  // Filtered submissions for History Tab
  const filteredSubmissions = myAssignments.filter(a => {
    if (submissionsFilter === 'all') return true;
    if (submissionsFilter === 'submitted') return a.status === 'submitted';
    if (submissionsFilter === 'completed') return a.status === 'approved' || a.status === 'paid';
    if (submissionsFilter === 'rejected') return a.status === 'rejected';
    return true;
  });

  // Navigation Groups mirroring the Admin Portal
  const navGroups: NavGroup[] = [
    {
      title: 'CORE & CAMPAIGN HUB',
      items: [
        { 
          id: 'campaigns', 
          icon: Briefcase, 
          label: 'Active Campaigns', 
          sublabel: 'Browse & earn task payouts', 
          badge: tasks.length,
          gradient: 'from-purple-600 to-indigo-700' 
        },
        { 
          id: 'submissions', 
          icon: CheckSquare, 
          label: 'My Submissions', 
          sublabel: 'Proof & payment audit trail', 
          badge: myAssignments.length,
          gradient: 'from-blue-500 to-indigo-600' 
        },
      ]
    },
    {
      title: 'TEAM & STRATEGY',
      items: [
        { 
          id: 'team-chat', 
          icon: MessageCircle, 
          label: 'Team Strategy Chat', 
          sublabel: 'Official promoter WhatsApp team', 
          badge: 'WhatsApp',
          gradient: 'from-emerald-500 to-teal-600' 
        },
        { 
          id: 'guide', 
          icon: BookOpen, 
          label: 'Syndicate Guide', 
          sublabel: 'Posting rules & payout guidelines', 
          gradient: 'from-indigo-500 to-purple-600' 
        },
      ]
    },
    {
      title: 'FINANCE & ACCOUNT',
      items: [
        { 
          id: 'wallet', 
          icon: Wallet, 
          label: 'Payout Bank & Wallet', 
          sublabel: 'Automatic settlements & balance', 
          badge: `₦${(wallet?.balance || 0).toLocaleString()}`,
          gradient: 'from-emerald-600 to-green-700' 
        },
        { 
          id: 'profile', 
          icon: ShieldCheck, 
          label: 'Station Profile', 
          sublabel: 'State verification & bank lock', 
          badge: profile?.bank_name ? 'Verified' : 'Setup',
          gradient: 'from-orange-500 to-amber-600' 
        },
      ]
    }
  ];

  const allNavItems = navGroups.flatMap(g => g.items);
  const activeNavItem = allNavItems.find(n => n.id === activeSection) || allNavItems[0];

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const active = activeSection === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveSection(item.id);
          if (isMobile) setMobileMenuOpen(false);
        }}
        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-left transition-all duration-200 cursor-pointer ${
          active
            ? `bg-gradient-to-r ${item.gradient} text-white shadow-[0_8px_18px_-4px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02] border border-white/20`
            : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground hover:shadow-xs'
        }`}
      >
        <span className={`relative inline-grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br ${item.gradient} flex-shrink-0 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.2)] ${
          active ? 'ring-2 ring-white/70 scale-105' : 'group-hover:scale-105 transition-transform'
        }`}>
          <span className="absolute inset-x-1 top-0.5 h-2 rounded-full bg-white/40 blur-[1.5px]" />
          <Icon className="h-4.5 w-4.5 text-white relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-xs font-black leading-tight ${active ? 'text-white drop-shadow-xs' : 'text-foreground'}`}>
            {item.label}
          </span>
          <span className={`block truncate text-[10px] font-medium ${active ? 'text-white/85' : 'text-muted-foreground'}`}>
            {item.sublabel}
          </span>
        </span>
        {item.badge !== undefined && item.badge !== null && (
          <Badge className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
            active ? 'bg-white/25 text-white border border-white/30' : 'bg-muted text-muted-foreground'
          }`}>
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row w-full max-w-full overflow-x-hidden">
      {/* DESKTOP SIDEBAR NAVIGATION MENU (Mirroring Admin Portal) */}
      <aside className="hidden md:flex min-h-screen w-64 lg:w-72 flex-col border-r border-border bg-card shadow-sm flex-shrink-0">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <img loading="lazy" src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg shadow-xs" />
          <div>
            <h1 className="text-sm font-black text-foreground tracking-tight">GGD Ad Network</h1>
            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Syndicate Portal</p>
          </div>
        </div>

        {/* Member Station Profile Summary Header */}
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs flex items-center gap-2.5">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-purple-500/40">
                <AvatarImage src={profile?.avatar_url || mainProfile?.avatar_url || ''} />
                <AvatarFallback className="bg-purple-600 text-white text-xs font-black">
                  {(mainProfile?.display_name || userEmail || 'P').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 h-4 w-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs cursor-pointer"
                title="Change Photo"
              >
                <Camera className="h-2.5 w-2.5" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black truncate text-foreground leading-snug">
                {mainProfile?.display_name || userEmail.split('@')[0]}
              </p>
              <div className="flex items-center gap-1 text-[10px] mt-0.5">
                <span className="text-purple-600 font-bold truncate">
                  {profile?.state ? `${profile.state} Station` : 'Nationwide'}
                </span>
                {profile?.ranking_score && <span className="text-amber-500 font-bold shrink-0">★ {profile.ranking_score}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nav Groups List */}
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3 py-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => renderNavItem(item))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Exit / Return to User Portal Footer */}
        <div className="border-t border-border p-3 bg-muted/20">
          <Button 
            variant="ghost" 
            className="h-10 w-full justify-start gap-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            onClick={() => onNavigate ? onNavigate('home') : window.location.assign('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to User Portal
          </Button>
        </div>
      </aside>

      {/* MOBILE HEADER (Sticky Top Bar with Hamburger) */}
      <header className="md:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/80 text-foreground cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-black text-foreground truncate max-w-[180px]">
                {activeNavItem?.label || 'Syndicate Portal'}
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer" 
            onClick={() => onNavigate ? onNavigate('home') : window.location.assign('/')}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Exit
          </Button>
        </div>
      </header>

      {/* MOBILE SHEET DRAWER (Mobile Navigation Menu) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[340px] border-r border-border bg-card p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="flex items-center gap-3 text-sm font-bold">
                <img loading="lazy" src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
                <div>
                  <span className="block font-black text-foreground">Syndicate Portal</span>
                  <span className="block text-[10px] text-purple-600 font-bold">Promoter Command Center</span>
                </div>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 py-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70">
                        {group.title}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(item => renderNavItem(item, true))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-3 bg-muted/20">
              <Button
                variant="ghost"
                className="h-10 w-full justify-start gap-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate ? onNavigate('home') : window.location.assign('/');
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to User Portal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-h-screen min-w-0 bg-background overflow-x-hidden">
        <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-12 space-y-5">
          
          {/* Top Real-time Navigation & Quick Stats Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search campaign title, description, state or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl bg-background border-border"
              />
            </div>

            {/* Quick Stats Strip */}
            <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border border-border/60 shrink-0 self-start sm:self-auto">
              <div className="px-2.5 py-1 text-center">
                <span className="text-[10px] text-muted-foreground block font-medium">Campaigns</span>
                <span className="text-xs font-black text-foreground">{tasks.length}</span>
              </div>
              <div className="h-6 w-px bg-border/80" />
              <div className="px-2.5 py-1 text-center">
                <span className="text-[10px] text-muted-foreground block font-medium">Submitted</span>
                <span className="text-xs font-black text-purple-600">{myAssignments.length}</span>
              </div>
              <div className="h-6 w-px bg-border/80" />
              <div className="px-2.5 py-1 text-center">
                <span className="text-[10px] text-muted-foreground block font-medium">Earnings</span>
                <span className="text-xs font-black text-emerald-600">₦{(wallet?.balance || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Top Active Section Banner */}
          <div className={`rounded-2xl bg-gradient-to-r ${activeNavItem.gradient} text-white p-4 sm:p-5 shadow-lg flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3">
              <activeNavItem.icon className="h-6 w-6 text-white drop-shadow" />
              <div>
                <h1 className="text-base sm:text-xl font-black drop-shadow tracking-tight">{activeNavItem.label}</h1>
                <p className="text-xs text-white/85">{activeNavItem.sublabel}</p>
              </div>
            </div>
            {profile?.state && (
              <Badge className="bg-white/20 text-white border border-white/30 text-xs font-extrabold shrink-0 hidden sm:inline-flex">
                <MapPin className="h-3 w-3 mr-1" />
                {profile.state} Station
              </Badge>
            )}
          </div>

          {/* RENDER ACTIVE SECTION CONTENT */}
          <div className="w-full min-w-0 space-y-4">

            {/* SECTION: CAMPAIGNS */}
            {activeSection === 'campaigns' && (
              <div className="space-y-4">
                {/* Filter Controls */}
                <div className="flex flex-col gap-3 p-3.5 rounded-2xl border border-border bg-card shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      <span>Campaign Status Filter</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCampaignStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          campaignStatusFilter === 'active'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Active Campaigns
                      </button>
                      <button
                        type="button"
                        onClick={() => setCampaignStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          campaignStatusFilter === 'completed'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Completed / Past
                      </button>
                      <button
                        type="button"
                        onClick={() => setCampaignStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          campaignStatusFilter === 'all'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        All Statuses
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-purple-600" />
                      <span>Date Filter:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDateFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          dateFilterMode === 'all' ? 'bg-purple-600/15 text-purple-600 dark:text-purple-300 font-bold' : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        All Time
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateFilter('today')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          dateFilterMode === 'today' ? 'bg-purple-600/15 text-purple-600 dark:text-purple-300 font-bold' : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateFilter('yesterday')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          dateFilterMode === 'yesterday' ? 'bg-purple-600/15 text-purple-600 dark:text-purple-300 font-bold' : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Yesterday
                      </button>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setDateFilter('custom', e.target.value)}
                        className="h-8 text-xs w-32 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Task Cards List */}
                {searchedTasks.length === 0 ? (
                  <Card className="border border-border shadow-xs rounded-2xl p-8 text-center">
                    <Briefcase className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm font-bold text-foreground">No matching campaigns found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchQuery 
                        ? 'No campaigns matched your search term. Try adjusting your search query.'
                        : 'There are currently no active campaigns available for your state/channel. Check back shortly as new business campaigns are added continuously.'}
                    </p>
                    {(dateFilterMode !== 'all' || campaignStatusFilter !== 'active' || searchQuery) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDateFilterMode('all');
                          setCampaignStatusFilter('active');
                          setSearchQuery('');
                        }}
                        className="mt-4 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {searchedTasks.map(task => {
                      const assignment = assignmentByTaskId[task.id];
                      const isSubmitted = assignment?.status === 'submitted';
                      const isApproved = assignment?.status === 'approved' || assignment?.status === 'paid';
                      const isRejected = assignment?.status === 'rejected';
                      const isSubmittingThis = submittingTaskId === task.id;
                      const previewUrl = proofPreviews[task.id];

                      return (
                        <Card key={task.id} className="border border-border/80 shadow-xs rounded-2xl overflow-hidden bg-card hover:border-purple-500/40 transition">
                          <CardHeader className="p-4 sm:p-5 bg-muted/20 border-b border-border/50 pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                                    {task.platform || 'WhatsApp Status'}
                                  </Badge>
                                  {task.target_state && (
                                    <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-600 dark:text-purple-300 font-bold">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {task.target_state} Only
                                    </Badge>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    Posted {new Date(task.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <CardTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                                  {task.title}
                                </CardTitle>
                              </div>

                              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-right shrink-0 self-start">
                                <span className="text-[10px] uppercase font-extrabold tracking-wider block">Your Reward</span>
                                <span className="text-lg font-black leading-none">₦{(task.payout_amount || task.cost_per_syndicate || 50).toLocaleString()}</span>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 sm:p-5 space-y-4">
                            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                              {task.description}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                              {task.flyer_url && (
                                <div className="relative group shrink-0">
                                  <img
                                    src={task.flyer_url}
                                    alt="Campaign Flyer"
                                    className="h-28 w-28 sm:h-32 sm:w-32 object-cover rounded-xl border border-border cursor-pointer shadow-xs group-hover:opacity-90 transition"
                                    onClick={() => {
                                      setPhotoViewerUrl(task.flyer_url);
                                      setPhotoViewerTitle(task.title);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => downloadFlyer(task.flyer_url, task.title)}
                                    className="absolute bottom-1.5 right-1.5 bg-black/80 text-white p-1.5 rounded-lg text-[10px] font-bold shadow-xs hover:bg-black flex items-center gap-1 cursor-pointer"
                                    title="Download Flyer"
                                  >
                                    <Download className="h-3 w-3" /> Save
                                  </button>
                                </div>
                              )}

                              <div className="flex-1 space-y-2">
                                {task.target_url && (
                                  <div className="p-3 bg-muted/60 rounded-xl border border-border/80 space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Target Link / URL to include in caption:</span>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        readOnly
                                        value={task.target_url}
                                        className="h-8 text-xs font-mono bg-background rounded-lg border-border flex-1"
                                      />
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => copyText(task.target_url)}
                                        className="h-8 px-3 text-xs font-bold rounded-lg shrink-0 cursor-pointer"
                                      >
                                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Submission Status or Upload Box */}
                            <div className="pt-2 border-t border-border/60">
                              {isApproved ? (
                                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                    <span>Proof Approved! ₦{(task.payout_amount || 50).toLocaleString()} credited to payout bank.</span>
                                  </div>
                                  <Badge className="bg-emerald-600 text-white">Paid</Badge>
                                </div>
                              ) : isSubmitted ? (
                                <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-bold">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-purple-500 animate-pulse" />
                                    <span>Proof Submitted — Admin verification in progress.</span>
                                  </div>
                                  <Badge className="bg-purple-600 text-white">Under Review</Badge>
                                </div>
                              ) : (
                                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/80">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Upload Screenshot or Video Proof:</span>
                                    {isRejected && (
                                      <Badge className="bg-red-500 text-white text-[10px]">
                                        Previous attempt rejected — Re-upload available
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="grid sm:grid-cols-2 gap-3">
                                    <div>
                                      <Input
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={(e) => e.target.files?.[0] && handleProofFileSelect(task.id, e.target.files[0])}
                                        className="h-10 text-xs rounded-xl bg-background border-border"
                                      />
                                      <p className="text-[10px] text-muted-foreground mt-1">
                                        Upload clear uncropped status screenshot or screen recording (Max 15MB Image / 50MB Video).
                                      </p>
                                    </div>

                                    <div>
                                      <Input
                                        type="url"
                                        placeholder="Optional post URL (e.g. social link)"
                                        value={proofLinks[task.id] || ''}
                                        onChange={(e) => setProofLinks(prev => ({ ...prev, [task.id]: e.target.value }))}
                                        className="h-10 text-xs rounded-xl bg-background border-border"
                                      />
                                    </div>
                                  </div>

                                  {previewUrl && (
                                    <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
                                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                    </div>
                                  )}

                                  <Button
                                    onClick={() => submitProofDirect(task)}
                                    disabled={isSubmittingThis}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black h-11 text-xs rounded-xl shadow-md cursor-pointer"
                                  >
                                    {isSubmittingThis ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Verifying & Uploading Proof...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Submit Proof for Verification & Payment
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION: SUBMISSIONS HISTORY */}
            {activeSection === 'submissions' && (
              <div className="space-y-4">
                <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
                  <CardHeader className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                        Task Submissions & Proof Audit Trail
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Track submitted proofs, verification status, and admin settlement responses
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'submitted', label: 'Pending' },
                        { id: 'completed', label: 'Approved' },
                        { id: 'rejected', label: 'Rejected' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSubmissionsFilter(f.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            submissionsFilter === f.id
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {filteredSubmissions.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <CheckSquare className="h-10 w-10 mx-auto opacity-40 mb-2" />
                        <p className="text-xs font-bold text-foreground">No submissions found</p>
                        <p className="text-[11px] mt-0.5">Participate in active campaigns above to see your proof audit trail here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredSubmissions.map(a => {
                          const t = a.syndicate_tasks || {};
                          const isApproved = a.status === 'approved' || a.status === 'paid';
                          const isRejected = a.status === 'rejected';

                          return (
                            <div key={a.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">{t.title || 'Campaign Task'}</h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    Submitted {new Date(a.proof_submitted_at || a.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <Badge className={
                                  isApproved ? 'bg-emerald-600 text-white' :
                                  isRejected ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'
                                }>
                                  {isApproved ? 'Approved ✓' : isRejected ? 'Rejected ✕' : 'Pending Verification'}
                                </Badge>
                              </div>

                              {a.proof_url && (
                                <div className="flex items-center gap-3">
                                  {isVideoProof(a.proof_url) ? (
                                    <div className="h-16 w-24 bg-black/80 rounded-lg flex items-center justify-center text-white text-[10px] font-bold border border-border">
                                      <PlayCircle className="h-6 w-6 text-purple-400" /> Video
                                    </div>
                                  ) : (
                                    <img
                                      src={a.proof_url}
                                      alt="Proof"
                                      className="h-16 w-16 object-cover rounded-lg border border-border cursor-pointer"
                                      onClick={() => {
                                        setPhotoViewerUrl(a.proof_url);
                                        setPhotoViewerTitle(t.title || 'Proof Image');
                                      }}
                                    />
                                  )}
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <p className="font-semibold text-foreground">Proof Asset Uploaded</p>
                                    {a.rejection_reason && (
                                      <p className="text-red-500 font-semibold bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-[11px]">
                                        Rejection Reason: {a.rejection_reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SECTION: TEAM CHAT & STRATEGY */}
            {activeSection === 'team-chat' && (
              <div className="space-y-4">
                <Card className="border border-emerald-500/30 shadow-md rounded-2xl overflow-hidden bg-card">
                  <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Users className="h-3.5 w-3.5" /> Official Team Strategy Hub
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight">Promoter Team Strategy & WhatsApp Group</h2>
                    <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                      Connect directly with fellow verified promoters, access official campaign posting strategies, receive instant WhatsApp ad plans, and coordinate execution with admin leads.
                    </p>
                    <div className="pt-2">
                      <Button
                        size="lg"
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-6 rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer text-sm"
                        onClick={() => {
                          if (teamWhatsappGroupLink) {
                            window.open(teamWhatsappGroupLink, '_blank');
                          } else {
                            toast.info("The Admin is setting up the WhatsApp group link. Check back shortly.");
                          }
                        }}
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Join Official Team WhatsApp Group
                        <ExternalLink className="h-4 w-4 ml-2 opacity-80" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-bold text-foreground">WhatsApp Ad Strategy & Execution Rules</h3>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-emerald-600">
                          <CheckCircle className="h-4 w-4" /> 1. Authentic Status Posts
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Post business flyers to your main WhatsApp Status with the approved caption and direct link intact. Keep posts active for at least 24 hours.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-purple-600">
                          <CheckCircle className="h-4 w-4" /> 2. Uncropped Screenshot Proof
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Take clear, uncropped screenshots showing the view count after post maturity, then upload directly to your task submission view.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-blue-600">
                          <CheckCircle className="h-4 w-4" /> 3. Group Broadcasts
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          For group task assignments, post in active Nigerian community groups and capture proof showing group name and post time.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-orange-600">
                          <CheckCircle className="h-4 w-4" /> 4. Automated Settlements
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Once approved by reviewers, cash payouts settle into your registered Paystack bank subaccount or syndicate wallet automatically.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SECTION: GUIDE */}
            {activeSection === 'guide' && (
              <div className="space-y-4">
                <SyndicateGuide />
              </div>
            )}

            {/* SECTION: WALLET & PAYOUT BANK */}
            {activeSection === 'wallet' && (
              <div className="space-y-4">
                <SyndicateWallet />
              </div>
            )}

            {/* SECTION: STATION PROFILE */}
            {activeSection === 'profile' && (
              <div className="space-y-4">
                <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
                  <CardHeader className="p-4 bg-muted/30 border-b border-border">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-orange-600" />
                      Station Promoter Profile & Account Status
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-16 w-16 border-2 border-purple-500/40 shadow-sm">
                          <AvatarImage src={profile?.avatar_url || mainProfile?.avatar_url || ''} />
                          <AvatarFallback className="bg-purple-600 text-white font-black text-lg">
                            {(mainProfile?.display_name || userEmail || 'P').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="absolute -bottom-1 -right-1 h-6 w-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs shadow-md cursor-pointer"
                          title="Upload Photo"
                        >
                          <Camera className="h-3 w-3" />
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                        />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-base font-bold text-foreground truncate">
                          {mainProfile?.display_name || userEmail.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground">{userEmail}</p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <Badge className="bg-purple-600 text-white text-[10px]">
                            {profile?.state ? `${profile.state} Station` : 'Nationwide Station'}
                          </Badge>
                          {profile?.ranking_score && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 font-bold">
                              ★ {profile.ranking_score} Score
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-bold text-foreground">Payout Bank Account</span>
                        </div>
                        {profile?.bank_name ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Verified Bank</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500">Unregistered</Badge>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Bank Name</span>
                          <span className="font-bold text-foreground">{profile?.bank_name || '—'}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Account Number</span>
                          <span className="font-mono font-bold text-foreground">{maskAccountNumber(profile?.account_number)}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60">
                          <span className="text-[10px] text-muted-foreground block">Verified Account Name</span>
                          <span className="font-bold text-foreground">{profile?.account_name || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Mail className="h-3.5 w-3.5 text-purple-600" /> Syndicate Member Email
                        </p>
                        <p className="text-sm font-bold truncate mt-0.5">{userEmail}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        type="button"
                        className="h-10 px-4 text-xs font-bold rounded-xl border-border cursor-pointer shrink-0" 
                        onClick={() => copyText(userEmail)}
                      >
                        <Copy className="h-4 w-4 mr-1.5" /> Copy Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-2xl safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: 'campaigns', label: 'Campaigns', icon: Briefcase, grad: 'from-purple-600 to-indigo-700' },
            { id: 'submissions', label: 'Proofs', icon: CheckSquare, grad: 'from-blue-500 to-indigo-600' },
            { id: 'team-chat', label: 'Team', icon: MessageCircle, grad: 'from-emerald-500 to-teal-600' },
            { id: 'wallet', label: 'Payouts', icon: Wallet, grad: 'from-emerald-600 to-green-700' },
            { id: 'profile', label: 'Station', icon: ShieldCheck, grad: 'from-orange-500 to-amber-600' },
          ].map(item => {
            const active = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex min-w-0 flex-col items-center gap-1 px-2.5 py-1 rounded-xl transition-all duration-200 cursor-pointer ${
                  active ? 'scale-105 font-black text-foreground' : 'text-muted-foreground hover:text-foreground opacity-85'
                }`}
              >
                <span className={`relative inline-grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br ${item.grad} shadow-[0_3px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)] ${
                  active ? 'ring-2 ring-purple-600 ring-offset-1 ring-offset-background' : ''
                }`}>
                  <span className="absolute inset-x-1 top-0.5 h-2 rounded-full bg-white/40 blur-[1px]" />
                  <Icon className="h-4 w-4 text-white relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
                </span>
                <span className="max-w-[64px] truncate text-[10px] leading-tight font-bold">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* In-App Photo Lightbox */}
      <ProductPhotoViewerModal
        isOpen={!!photoViewerUrl}
        onClose={() => setPhotoViewerUrl(null)}
        images={photoViewerUrl ? [photoViewerUrl] : []}
        productTitle={photoViewerTitle}
      />
    </div>
  );
};

export default SyndicateDashboard;
