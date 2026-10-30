import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Users, Search, CheckCircle, XCircle, Clock, Wallet, DollarSign, MapPin, Eye,
  TrendingUp, Briefcase, Star, ArrowRight, Loader2, Ban, Snowflake, Sun,
  PauseCircle, PlayCircle, RotateCw, Zap, AlertTriangle, RefreshCw, CreditCard,
  ExternalLink, Copy, Check, Image as ImageIcon, ChevronLeft, ShieldCheck,
  Megaphone, AlertCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";
import { reviewSyndicateAssignment } from "@/services/syndicateTaskService";
import { registerPaystackSubaccount, resetAllSyndicateBankAccounts, resetSingleSyndicateBankAccount } from "@/utils/paystackBank";
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

const PLATFORMS = ['WhatsApp Status', 'WhatsApp Group', 'WhatsApp Channel', 'Facebook', 'Telegram', 'TikTok', 'Instagram', 'Twitter/X'];

const DEFAULT_PLATFORM_LIST = [
  { platform_key: 'whatsapp', platform_name: 'WhatsApp Status', price_per_task: 50, is_active: true },
  { platform_key: 'whatsapp_group', platform_name: 'WhatsApp Group', price_per_task: 70, is_active: true },
  { platform_key: 'whatsapp_channel', platform_name: 'WhatsApp Channel', price_per_task: 60, is_active: true },
  { platform_key: 'facebook', platform_name: 'Facebook', price_per_task: 50, is_active: true },
  { platform_key: 'telegram', platform_name: 'Telegram', price_per_task: 50, is_active: true },
  { platform_key: 'tiktok', platform_name: 'TikTok', price_per_task: 60, is_active: true },
  { platform_key: 'instagram', platform_name: 'Instagram', price_per_task: 60, is_active: true },
  { platform_key: 'twitter', platform_name: 'Twitter/X', price_per_task: 50, is_active: true },
];

const PRESET_REJECTION_REASONS = [
  "Proof screenshot is blurry, incomplete, or illegible",
  "Target link / website URL is missing from your post caption",
  "Screenshot does not match the required social platform",
  "Post has been deleted or cannot be verified",
  "Duplicate screenshot already used by another member",
  "Required hashtags, flyer image, or tags are missing",
];

const AdminSyndicateManager = (_props: { initialCampaignId?: string; initialTab?: string; onNavigateSection?: (sectionId: string, extraProps?: any) => void } = {}) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [syndicates, setSyndicates] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<any[]>([]);
  const [platformPricing, setPlatformPricing] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'pending' | 'completed' | 'failed' | 'all'>('pending');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [platformCategoryFilter, setPlatformCategoryFilter] = useState<string>('all');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected' | 'assigned'>('all');
  const [submissionPlatformFilter, setSubmissionPlatformFilter] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [syndicatePayoutPercentage, setSyndicatePayoutPercentage] = useState<number>(70);
  const [savingPercentage, setSavingPercentage] = useState(false);
  const [syncingSubaccountId, setSyncingSubaccountId] = useState<string | null>(null);
  const [promoterTeamWhatsappGroupLink, setPromoterTeamWhatsappGroupLink] = useState<string>('');
  const [savingGroupLink, setSavingGroupLink] = useState(false);

  // Modal Dialogs State
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [imageModalTitle, setImageModalTitle] = useState<string>('');

  // Rejection modal
  const [rejectingAssignment, setRejectingAssignment] = useState<any | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Suspend modal
  const [suspendingSyndicate, setSuspendingSyndicate] = useState<any | null>(null);
  const [suspendReasonText, setSuspendReasonText] = useState('');

  // Reassign modal
  const [reassignAssignmentId, setReassignAssignmentId] = useState<string | null>(null);

  // Withdrawal Reject modal
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<any | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState('');

  // Reset Banks Modal State
  const [showResetBanksModal, setShowResetBanksModal] = useState(false);
  const [resettingBanks, setResettingBanks] = useState(false);
  const [resettingMemberId, setResettingMemberId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [appsRes, syndicatesRes, withdrawalsRes, tasksRes, pricingRes, profilesRes, pausedRes, assignmentsRes, pctRes, waGroupRes] = await Promise.all([
        supabase.from('syndicate_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('syndicate_profiles').select('*').order('ranking_score', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('syndicate_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('platform_pricing').select('*').order('platform_name'),
        supabase.from('profiles').select('user_id, email, display_name, avatar_url'),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_paused').maybeSingle(),
        supabase.from('syndicate_task_assignments').select('task_id, status'),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_payout_percentage').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'syndicate_whatsapp_group_link').maybeSingle(),
      ]);

      if (pctRes.data?.value) {
        setSyndicatePayoutPercentage(parseInt(pctRes.data.value, 10) || 70);
      }

      if (waGroupRes.data?.value) {
        setPromoterTeamWhatsappGroupLink(waGroupRes.data.value);
      }

      const profileMap: Record<string, any> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      // Aggregate assignments stats per task
      const statsMap: Record<string, { total: number; pending: number; approved: number; rejected: number; assigned: number }> = {};
      (assignmentsRes.data || []).forEach((a: any) => {
        if (!statsMap[a.task_id]) {
          statsMap[a.task_id] = { total: 0, pending: 0, approved: 0, rejected: 0, assigned: 0 };
        }
        statsMap[a.task_id].total++;
        if (a.status === 'submitted') statsMap[a.task_id].pending++;
        else if (a.status === 'approved') statsMap[a.task_id].approved++;
        else if (a.status === 'rejected') statsMap[a.task_id].rejected++;
        else statsMap[a.task_id].assigned++;
      });

      setApplications((appsRes.data || []).map((a: any) => ({ ...a, _profile: profileMap[a.user_id] })));
      setSyndicates((syndicatesRes.data || []).map((s: any) => ({ ...s, _profile: profileMap[s.user_id] })));
      setWithdrawals((withdrawalsRes.data || []).map((w: any) => ({ ...w, _profile: profileMap[w.user_id] })));
      setAllTasks((tasksRes.data || []).map((t: any) => ({
        ...t,
        _businessProfile: profileMap[t.business_user_id],
        _stats: statsMap[t.id] || { total: 0, pending: 0, approved: 0, rejected: 0, assigned: 0 },
      })));
      const existingPricing = pricingRes.data || [];
      const mergedPricing: any[] = [...existingPricing];
      DEFAULT_PLATFORM_LIST.forEach(dp => {
        if (!mergedPricing.some(p => p.platform_key === dp.platform_key)) {
          mergedPricing.push({ id: `default-${dp.platform_key}`, ...dp });
        }
      });
      setPlatformPricing(mergedPricing);
      setPaused((pausedRes.data?.value || 'false') === 'true');
    } catch (err: any) {
      toast.error(err.message || "Failed to load syndicate data");
    } finally {
      setLoading(false);
    }
  };

  const togglePauseAll = async (next: boolean) => {
    await supabase.from('app_settings').upsert({ key: 'syndicate_paused', value: next ? 'true' : 'false' }, { onConflict: 'key' });
    setPaused(next);
    toast.success(next ? "All syndicate tasks paused" : "Syndicate tasks resumed");
  };

  const openSuspendModal = (s: any) => {
    if (s.is_suspended) {
      // Unsuspend immediately
      handleConfirmSuspend(s, false, null);
    } else {
      setSuspendingSyndicate(s);
      setSuspendReasonText("Policy violation or low-quality submissions");
    }
  };

  const handleConfirmSuspend = async (s: any, shouldSuspend: boolean, reason: string | null) => {
    try {
      await supabase.from('syndicate_profiles').update({
        is_suspended: shouldSuspend,
        suspended_reason: shouldSuspend ? reason : null,
        failed_streak: shouldSuspend ? s.failed_streak : 0,
      } as any).eq('user_id', s.user_id);

      await supabase.from('notifications').insert({
        user_id: s.user_id,
        title: shouldSuspend ? '🚫 Account Suspended' : '✅ Account Reinstated',
        message: shouldSuspend ? `Your syndicate account was suspended: ${reason}` : 'Your syndicate account is active again.',
        type: shouldSuspend ? 'warning' : 'success',
      });

      toast.success(shouldSuspend ? "Syndicate suspended" : "Suspension lifted");
      setSuspendingSyndicate(null);
      fetchData();
    } catch {
      toast.error("Failed to update suspension status");
    }
  };

  const toggleFreezeWallet = async (s: any) => {
    const next = !s.wallet_frozen;
    await supabase.from('syndicate_profiles').update({ wallet_frozen: next } as any).eq('user_id', s.user_id);
    await supabase.from('notifications').insert({
      user_id: s.user_id,
      title: next ? '🧊 Wallet Frozen' : '🔥 Wallet Unfrozen',
      message: next ? 'Withdrawals are temporarily disabled on your account.' : 'You can request withdrawals again.',
      type: next ? 'warning' : 'success',
    });
    toast.success(next ? "Wallet frozen" : "Wallet unfrozen");
    fetchData();
  };

  const handleConfirmReassign = async () => {
    if (!reassignAssignmentId) return;
    try {
      await supabase.from('syndicate_task_assignments').update({
        status: 'reassigned',
        reassigned_by_admin: true,
        reviewed_at: new Date().toISOString(),
      } as any).eq('id', reassignAssignmentId);

      toast.success("Task released for reassignment");
      setReassignAssignmentId(null);
      if (viewingTaskId) viewTaskSubmissions(viewingTaskId);
    } catch {
      toast.error("Failed to reassign task");
    }
  };

  const approveApplication = async (app: any, platforms: string[]) => {
    await supabase.from('syndicate_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.from('syndicate_profiles').insert({ user_id: app.user_id, verified_platforms: platforms, state: app.state || null });
    await supabase.from('user_roles').insert({ user_id: app.user_id, role: 'syndicate' });
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

  const openWithdrawalRejectModal = (w: any) => {
    setRejectingWithdrawal(w);
    setWithdrawalRejectReason("Bank details invalid or account name mismatch");
  };

  const processWithdrawal = async (id: string, approve: boolean, reason?: string) => {
    try {
      const { data, error } = await callRpc('admin_process_withdrawal', {
        p_request_id: id,
        p_approve: approve,
        p_rejection_reason: reason || null,
      });

      if (error) throw error;
      const res = data as any;
      if (res && !res.success) {
        throw new Error(res.error || 'Failed to process withdrawal');
      }

      toast.success(approve ? "Withdrawal marked as paid manually" : "Withdrawal rejected & refunded");
      setRejectingWithdrawal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal");
    }
  };

  const triggerPaystackPayout = async (withdrawalId: string) => {
    setProcessingPayoutId(withdrawalId);
    try {
      const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
        body: { withdrawal_id: withdrawalId },
      });

      if (error) throw error;
      if (data && !data.success) {
        throw new Error(data.error || 'Paystack transfer failed');
      }

      if (data.status === 'completed') {
        toast.success("⚡ Paystack transfer successful! Funds sent to bank.");
      } else {
        toast.info(data.message || "⚡ Payout initiated via Paystack (processing)");
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Paystack transfer failed");
      fetchData();
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const updatePlatformPrice = async (item: any, newPrice: number) => {
    if (String(item.id).startsWith('default-')) {
      await supabase.from('platform_pricing').upsert({
        platform_key: item.platform_key,
        platform_name: item.platform_name,
        price_per_task: newPrice,
        is_active: item.is_active !== false,
      }, { onConflict: 'platform_key' });
    } else {
      await supabase.from('platform_pricing').update({ price_per_task: newPrice }).eq('id', item.id);
    }
    toast.success("Price updated!");
    fetchData();
  };

  const togglePlatformActive = async (item: any, currentStatus: boolean) => {
    if (String(item.id).startsWith('default-')) {
      await supabase.from('platform_pricing').upsert({
        platform_key: item.platform_key,
        platform_name: item.platform_name,
        price_per_task: item.price_per_task || 50,
        is_active: !currentStatus,
      }, { onConflict: 'platform_key' });
    } else {
      await supabase.from('platform_pricing').update({ is_active: !currentStatus }).eq('id', item.id);
    }
    toast.success(`Platform ${!currentStatus ? 'activated' : 'deactivated'}`);
    fetchData();
  };

  const savePayoutPercentage = async () => {
    if (syndicatePayoutPercentage < 1 || syndicatePayoutPercentage > 99) {
      toast.error('Payout percentage must be between 1% and 99%');
      return;
    }
    setSavingPercentage(true);
    try {
      await supabase.from('app_settings').upsert({
        key: 'syndicate_payout_percentage',
        value: String(syndicatePayoutPercentage),
      }, { onConflict: 'key' });
      toast.success(`Default syndicate payout split set to ${syndicatePayoutPercentage}%`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payout percentage');
    } finally {
      setSavingPercentage(false);
    }
  };

  const savePromoterTeamWhatsappGroupLink = async () => {
    if (!promoterTeamWhatsappGroupLink.trim()) {
      toast.error('Group link cannot be empty');
      return;
    }
    setSavingGroupLink(true);
    try {
      await supabase.from('app_settings').upsert({
        key: 'syndicate_whatsapp_group_link',
        value: promoterTeamWhatsappGroupLink.trim(),
      }, { onConflict: 'key' });
      toast.success('Promoter Team WhatsApp Group Link updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update WhatsApp group link');
    } finally {
      setSavingGroupLink(false);
    }
  };

  const syncMemberSubaccount = async (member: any) => {
    if (!member.account_number || !member.bank_code) {
      toast.error('Member has not registered bank details yet');
      return;
    }
    setSyncingSubaccountId(member.user_id);
    try {
      const res = await registerPaystackSubaccount(
        member.user_id,
        member.bank_code,
        member.bank_name || 'Bank',
        member.account_number,
        member.account_name || member.bank_verified_name || member._profile?.display_name || 'Promoter',
        syndicatePayoutPercentage
      );
      if (res.success) {
        toast.success(`Paystack Subaccount registered: ${res.subaccount_code} (${res.percentage}% split)`);
        fetchData();
      } else {
        toast.error(res.error || 'Failed to sync Paystack subaccount');
      }
    } catch (err: any) {
      toast.error(err.message || 'Subaccount registration failed');
    } finally {
      setSyncingSubaccountId(null);
    }
  };

  const handleResetAllBanks = async () => {
    setResettingBanks(true);
    try {
      const res = await resetAllSyndicateBankAccounts();
      if (res.success) {
        toast.success(`All ${res.count || syndicates.length} syndicate member bank registrations have been reset. Promoters will update details afresh.`);
        setShowResetBanksModal(false);
        fetchData();
      } else {
        toast.error(res.error || 'Failed to reset bank accounts');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset bank accounts');
    } finally {
      setResettingBanks(false);
    }
  };

  const handleResetSingleMemberBank = async (s: any) => {
    const memberName = s._profile?.display_name || s._profile?.email || 'this promoter';
    if (!window.confirm(`Reset registered bank details for ${memberName}? They will be prompted to re-verify their bank account and create a fresh Paystack subaccount.`)) {
      return;
    }
    setResettingMemberId(s.user_id);
    try {
      const res = await resetSingleSyndicateBankAccount(s.user_id);
      if (res.success) {
        toast.success(`Bank details reset for ${memberName}`);
        fetchData();
      } else {
        toast.error(res.error || 'Failed to reset bank details');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset bank details');
    } finally {
      setResettingMemberId(null);
    }
  };

  const viewTaskSubmissions = async (taskId: string) => {
    setViewingTaskId(taskId);
    try {
      const { data, error } = await supabase
        .from('syndicate_task_assignments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = Array.from(new Set((data || []).map(a => a.syndicate_user_id)));
      if (userIds.length > 0) {
        const [pRes, spRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name, email, avatar_url').in('user_id', userIds),
          supabase.from('syndicate_profiles').select('user_id, ranking_score, state, tasks_completed').in('user_id', userIds),
        ]);

        const pMap: Record<string, any> = {};
        const spMap: Record<string, any> = {};
        (pRes.data || []).forEach((p: any) => { pMap[p.user_id] = p; });
        (spRes.data || []).forEach((sp: any) => { spMap[sp.user_id] = sp; });

        setTaskAssignments((data || []).map(a => ({
          ...a,
          _profile: pMap[a.syndicate_user_id],
          _syndicateProfile: spMap[a.syndicate_user_id],
        })));
      } else {
        setTaskAssignments([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load submissions");
    }
  };

  const handleApproveAssignment = async (assignmentId: string) => {
    setProcessingReview(true);
    try {
      const res = await reviewSyndicateAssignment({
        assignmentId,
        approve: true,
      });

      if (!res.success) {
        throw new Error(res.error || 'Approval failed');
      }

      toast.success("Submission approved & promoter paid!");
      if (viewingTaskId) {
        viewTaskSubmissions(viewingTaskId);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Review failed');
    } finally {
      setProcessingReview(false);
    }
  };

  const openRejectModal = (assignment: any) => {
    setRejectingAssignment(assignment);
    setRejectionReasonText(PRESET_REJECTION_REASONS[0]);
  };

  const handleConfirmReject = async () => {
    if (!rejectingAssignment) return;
    if (!rejectionReasonText.trim()) {
      toast.error("Please provide a rejection reason for the promoter");
      return;
    }

    setProcessingReview(true);
    try {
      const res = await reviewSyndicateAssignment({
        assignmentId: rejectingAssignment.id,
        approve: false,
        rejectionReason: rejectionReasonText.trim(),
      });

      if (!res.success) {
        throw new Error(res.error || 'Rejection failed');
      }

      toast.success("Proof rejected");
      setRejectingAssignment(null);
      if (viewingTaskId) {
        viewTaskSubmissions(viewingTaskId);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setProcessingReview(false);
    }
  };

  const toggleCampaignStatus = async (task: any) => {
    const nextStatus = task.status === 'paused' ? 'active' : 'paused';
    try {
      const { error } = await supabase
        .from('syndicate_tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);

      if (error) throw error;
      toast.success(`Campaign ${nextStatus === 'active' ? 'resumed' : 'paused'}`);
      fetchData();
    } catch {
      toast.error("Failed to update campaign status");
    }
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success("Product link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
        <p className="text-xs text-muted-foreground">Loading Syndicate Console...</p>
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  const selectedCampaign = viewingTaskId ? allTasks.find(t => t.id === viewingTaskId) : null;

  return (
    <div className="space-y-5">
      {/* Global Pause Control */}
      <Card className="border-amber-500/40 bg-amber-500/10 rounded-2xl shadow-xs">
        <CardContent className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {paused ? (
              <PauseCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <PlayCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground">
                {paused ? 'All Syndicate Tasks Globally Paused' : 'Syndicate Network Live & Active'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {paused ? 'Promoters cannot claim new tasks until unpaused' : 'Promoters are actively claiming and submitting verified social posts'}
              </p>
            </div>
          </div>
          <Switch checked={paused} onCheckedChange={togglePauseAll} />
        </CardContent>
      </Card>

      {/* Top Stats Overview */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 p-5 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="flex items-center justify-between relative">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-yellow-300" /> Syndicate Management Console
            </h3>
            <p className="text-xs text-purple-200 mt-0.5">Paid promoter network, campaigns, product details & payouts</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchData}
            className="text-white hover:bg-white/15 h-8 text-xs rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 relative">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/15">
            <Users className="h-4 w-4 mx-auto mb-1 text-purple-200" />
            <p className="text-xl font-black leading-none">{syndicates.length}</p>
            <p className="text-[10px] text-purple-200 mt-1 font-semibold">Promoters</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/15">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-300" />
            <p className="text-xl font-black leading-none">{pendingApps.length}</p>
            <p className="text-[10px] text-purple-200 mt-1 font-semibold">Pending Apps</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/15">
            <Briefcase className="h-4 w-4 mx-auto mb-1 text-emerald-300" />
            <p className="text-xl font-black leading-none">{allTasks.length}</p>
            <p className="text-[10px] text-purple-200 mt-1 font-semibold">Campaigns</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/15">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-cyan-300" />
            <p className="text-xl font-black leading-none">{pendingWithdrawals.length}</p>
            <p className="text-[10px] text-purple-200 mt-1 font-semibold">Pending Payouts</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="w-full flex overflow-x-auto no-scrollbar gap-1.5 h-auto p-1.5 rounded-2xl bg-secondary/80 border border-border/50">
          <TabsTrigger value="tasks" className="flex-1 min-w-max h-10 px-3.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md cursor-pointer">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Campaigns ({allTasks.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex-1 min-w-max h-10 px-3.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md cursor-pointer">
            <Clock className="h-3.5 w-3.5 mr-1.5 text-amber-300" /> Applications {pendingApps.length > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-red-500 text-white border-0 font-black animate-pulse">{pendingApps.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="syndicates" className="flex-1 min-w-max h-10 px-3.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md cursor-pointer">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Team ({syndicates.length})
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex-1 min-w-max h-10 px-3.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md cursor-pointer">
            <Wallet className="h-3.5 w-3.5 mr-1.5 text-cyan-300" /> Payouts {pendingWithdrawals.length > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-red-500 text-white border-0 font-black animate-pulse">{pendingWithdrawals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex-1 min-w-max h-10 px-3.5 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md cursor-pointer">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" /> Pricing
          </TabsTrigger>
        </TabsList>

        {/* CAMPAIGNS & PRODUCT DETAILS TAB */}
        <TabsContent value="tasks" className="space-y-4">
          {viewingTaskId && selectedCampaign ? (
            /* ================= EXPANDED PRODUCT DETAILS & SUBMISSIONS VIEW (STRICT MOBILE-FRIENDLY) ================= */
            <div className="w-full max-w-full overflow-x-hidden min-w-0 space-y-4 animate-in fade-in duration-200">
              {/* Back button & quick navigation bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 w-full min-w-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingTaskId(null)}
                  className="rounded-xl text-xs font-bold gap-1.5 text-foreground bg-card hover:bg-muted border-border/80 h-9 px-3.5 shadow-xs active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 text-purple-600" /> Back to All Campaigns
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleCampaignStatus(selectedCampaign)}
                    className="rounded-xl text-xs font-bold h-9 px-3 border-border/80 shadow-xs active:scale-95 cursor-pointer"
                  >
                    {selectedCampaign.status === 'paused' ? (
                      <>
                        <PlayCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Resume Campaign
                      </>
                    ) : (
                      <>
                        <PauseCircle className="h-3.5 w-3.5 mr-1 text-amber-500" /> Pause Campaign
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => viewTaskSubmissions(selectedCampaign.id)}
                    className="rounded-xl text-xs font-bold h-9 px-3 border-border/80 shadow-xs active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1 text-purple-600" /> Refresh
                  </Button>
                </div>
              </div>

              {/* RICH PRODUCT DETAILS CARD */}
              <Card className="border-purple-500/40 bg-card rounded-2xl overflow-hidden shadow-lg w-full max-w-full">
                <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 p-4 sm:p-5 text-white w-full max-w-full">
                  <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-start w-full min-w-0">
                    {/* Product Flyer Image */}
                    {selectedCampaign.flyer_url ? (
                      <div
                        onClick={() => {
                          setImageModalUrl(selectedCampaign.flyer_url);
                          setImageModalTitle(selectedCampaign.title);
                        }}
                        className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-white/25 bg-black/20 shrink-0 cursor-pointer group relative shadow-md self-center sm:self-start"
                      >
                        <img
                          src={selectedCampaign.flyer_url}
                          alt={selectedCampaign.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border border-white/20 bg-white/10 shrink-0 flex items-center justify-center text-purple-200 self-center sm:self-start">
                        <ImageIcon className="h-10 w-10 opacity-60" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 w-full space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-white break-words">{selectedCampaign.title}</h2>
                        <Badge className={`text-[10px] font-bold border-0 shadow-xs ${
                          selectedCampaign.status === 'active' ? 'bg-emerald-500 text-white' :
                          selectedCampaign.status === 'completed' ? 'bg-blue-500 text-white' :
                          'bg-amber-500 text-white'
                        }`}>
                          {selectedCampaign.status?.toUpperCase() || 'ACTIVE'}
                        </Badge>
                        <span className="text-[10px] font-mono opacity-80 bg-black/30 px-2 py-0.5 rounded-md">
                          ID: {selectedCampaign.id.substring(0, 8)}
                        </span>
                      </div>

                      <p className="text-xs text-purple-100 leading-relaxed break-words">
                        {selectedCampaign.description || 'No description provided.'}
                      </p>

                      {/* Destination / Target link */}
                      {selectedCampaign.share_link && (
                        <div className="flex items-center gap-1.5 pt-1.5 min-w-0 max-w-full flex-wrap">
                          <span className="text-[11px] font-bold text-purple-200 shrink-0">Target URL:</span>
                          <div className="flex items-center gap-1.5 bg-black/30 border border-white/15 px-2.5 py-1 rounded-xl min-w-0 max-w-full">
                            <a
                              href={selectedCampaign.share_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-yellow-300 hover:underline font-mono truncate max-w-[180px] sm:max-w-xs md:max-w-md break-all"
                            >
                              {selectedCampaign.share_link}
                            </a>
                            <button
                              onClick={() => copyShareLink(selectedCampaign.share_link)}
                              className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0 active:scale-95 cursor-pointer"
                              title="Copy link"
                            >
                              {copiedLink ? <Check className="h-3.5 w-3.5 text-green-300" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta details & budget metrics */}
                <CardContent className="p-3.5 sm:p-5 space-y-4 w-full min-w-0">
                  {/* Channels & Location badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4 w-full min-w-0">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Required Social Channels</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedCampaign.placements || []).map((p: string) => (
                          <Badge key={p} className="text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border-0 rounded-lg px-2.5 py-1">
                            {p.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Geographic Target</p>
                      <Badge variant="outline" className="text-xs rounded-lg px-2.5 py-1 font-semibold flex items-center gap-1 border-border">
                        <MapPin className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">{selectedCampaign.target_state ? `Target: ${selectedCampaign.target_state}` : 'National (All Nigeria)'}</span>
                      </Badge>
                    </div>

                    {/* Business Advertiser Card */}
                    <div className="space-y-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Merchant / Advertiser</p>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 border border-border shrink-0">
                          <AvatarImage src={selectedCampaign._businessProfile?.avatar_url} />
                          <AvatarFallback className="text-[10px] bg-purple-600 text-white font-bold">
                            {(selectedCampaign._businessProfile?.display_name || selectedCampaign._businessProfile?.email || 'M').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-xs min-w-0 truncate">
                          <p className="font-bold text-foreground leading-tight truncate">
                            {selectedCampaign._businessProfile?.display_name || 'Business User'}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {selectedCampaign._businessProfile?.email || selectedCampaign.business_user_id?.substring(0, 8)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Slots KPI row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full min-w-0">
                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/60 min-w-0">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Campaign Budget</p>
                      <p className="text-base sm:text-lg font-black text-foreground mt-0.5 truncate">
                        ₦{Number(selectedCampaign.total_cost || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/60 min-w-0">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Promoter Payout</p>
                      <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                        ₦{Number(selectedCampaign.payout_amount || selectedCampaign.cost_per_syndicate || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/60 min-w-0">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Slots Capacity</p>
                      <p className="text-base sm:text-lg font-black text-foreground mt-0.5 truncate">
                        {taskAssignments.length} / {selectedCampaign.max_syndicates || '∞'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/60 min-w-0">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">Approved & Paid</p>
                      <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                        {taskAssignments.filter(a => a.status === 'approved').length} settled
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PROOFS & SUBMISSIONS SECTION */}
              <div className="space-y-3 pt-2 w-full min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2 w-full min-w-0">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>Promoter Submissions & Proofs ({taskAssignments.length})</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Review screenshots submitted by verified promoters. Approving automatically disburses funds to their wallet.
                    </p>
                  </div>
                </div>

                {/* TACTILE CATEGORY BUTTONS: Submission Status (Active styled buttons, not ordinary text) */}
                <div className="w-full overflow-x-auto no-scrollbar py-1">
                  <div className="flex items-center gap-2 min-w-max">
                    {[
                      { key: 'all', label: 'All Proofs', icon: Eye, count: taskAssignments.length, color: 'from-purple-600 to-indigo-600' },
                      { key: 'submitted', label: 'Pending Review', icon: Clock, count: taskAssignments.filter(a => a.status === 'submitted').length, color: 'from-amber-500 to-orange-600' },
                      { key: 'approved', label: 'Approved & Paid', icon: CheckCircle, count: taskAssignments.filter(a => a.status === 'approved').length, color: 'from-emerald-600 to-teal-600' },
                      { key: 'rejected', label: 'Rejected', icon: XCircle, count: taskAssignments.filter(a => a.status === 'rejected').length, color: 'from-red-600 to-rose-600' },
                      { key: 'assigned', label: 'In Progress', icon: RotateCw, count: taskAssignments.filter(a => a.status === 'accepted' || a.status === 'assigned').length, color: 'from-blue-600 to-cyan-600' },
                    ].map(f => {
                      const Icon = f.icon;
                      const isActive = submissionFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setSubmissionFilter(f.key as any)}
                          className={`h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 ${
                            isActive
                              ? `bg-gradient-to-r ${f.color} text-white shadow-md ring-2 ring-white/30 scale-[1.02]`
                              : 'bg-card text-foreground/80 hover:text-foreground hover:bg-muted border border-border shadow-xs'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                          <span>{f.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            isActive ? 'bg-white/25 text-white' : 'bg-secondary text-foreground'
                          }`}>
                            {f.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submissions List */}
                {(() => {
                  const filteredSubs = taskAssignments.filter(a => {
                    if (submissionFilter === 'all') return true;
                    if (submissionFilter === 'submitted') return a.status === 'submitted';
                    if (submissionFilter === 'approved') return a.status === 'approved';
                    if (submissionFilter === 'rejected') return a.status === 'rejected';
                    if (submissionFilter === 'assigned') return a.status === 'accepted' || a.status === 'assigned';
                    return true;
                  });

                  if (filteredSubs.length === 0) {
                    return (
                      <div className="text-center py-10 bg-secondary/20 rounded-2xl border border-dashed border-border/60">
                        <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-bold text-foreground">No submissions in this filter</p>
                        <p className="text-[11px] text-muted-foreground">
                          {taskAssignments.length === 0 ? 'No promoters have claimed or submitted proofs for this product yet' : 'Change the filter to view other records'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {filteredSubs.map(a => {
                        const isPending = a.status === 'submitted';
                        const isApproved = a.status === 'approved';
                        const isRejected = a.status === 'rejected';
                        const isInProgress = a.status === 'accepted' || a.status === 'assigned';

                        return (
                          <Card key={a.id} className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
                            <CardContent className="p-4 space-y-3">
                              {/* Header: Promoter Profile + Status */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/30 pb-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-border">
                                    <AvatarImage src={a._profile?.avatar_url} />
                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs">
                                      {(a._profile?.display_name || a._profile?.email || 'P').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-foreground">
                                        {a._profile?.display_name || 'Promoter'}
                                      </p>
                                      {a._syndicateProfile?.ranking_score && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-600 dark:text-amber-400 font-semibold border-amber-500/30">
                                          ★ {a._syndicateProfile.ranking_score}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{a._profile?.email}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge className={`rounded-full text-[10px] px-3 py-0.5 border-0 font-bold ${
                                    isApproved ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                                    isRejected ? 'bg-red-500/15 text-red-700 dark:text-red-300' :
                                    isPending ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                                    'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                  }`}>
                                    {isPending ? '⏳ Submitted Proof' :
                                     isApproved ? '✅ Approved & Paid' :
                                     isRejected ? '❌ Rejected' :
                                     '🔵 Assigned'}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : 'Claimed'}
                                  </span>
                                </div>
                              </div>

                              {/* Proof Content */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                {/* Proof Screenshot */}
                                <div className="md:col-span-1">
                                  {a.proof_url ? (
                                    <div
                                      onClick={() => {
                                        setImageModalUrl(a.proof_url);
                                        setImageModalTitle(`Proof from ${a._profile?.display_name || 'Promoter'}`);
                                      }}
                                      className="group relative rounded-xl overflow-hidden border border-border/60 bg-muted/20 aspect-video flex items-center justify-center cursor-pointer shadow-xs"
                                    >
                                      <img
                                        src={a.proof_url}
                                        alt="Proof Screenshot"
                                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Eye className="h-6 w-6 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-muted-foreground text-xs">
                                      No screenshot uploaded yet
                                    </div>
                                  )}
                                </div>

                                {/* Proof Link & Meta */}
                                <div className="md:col-span-2 space-y-2 text-xs">
                                  {a.proof_link && (
                                    <div className="flex items-center gap-1.5 bg-secondary/30 p-2.5 rounded-xl">
                                      <span className="text-[11px] font-semibold text-muted-foreground">Live Post Link:</span>
                                      <a
                                        href={a.proof_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono truncate"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {a.proof_link}
                                      </a>
                                    </div>
                                  )}

                                  {isRejected && a.rejection_reason && (
                                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-700 dark:text-red-300 space-y-0.5">
                                      <p className="font-bold">Rejection Reason:</p>
                                      <p className="text-[11px]">{a.rejection_reason}</p>
                                    </div>
                                  )}

                                  {isApproved && (
                                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                      <CheckCircle className="h-4 w-4" />
                                      Paid ₦{Number(a.payout_amount || selectedCampaign.payout_amount || 0).toLocaleString()} to promoter
                                    </div>
                                  )}

                                  {/* Review Actions */}
                                  {isPending && (
                                    <div className="flex gap-2 pt-1">
                                      <Button
                                        size="sm"
                                        disabled={processingReview}
                                        className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs rounded-xl h-10 shadow-md font-bold"
                                        onClick={() => handleApproveAssignment(a.id)}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                        Approve & Pay (₦{Number(selectedCampaign.payout_amount || selectedCampaign.cost_per_syndicate || 0).toLocaleString()})
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={processingReview}
                                        className="flex-1 text-xs rounded-xl h-10 font-bold"
                                        onClick={() => openRejectModal(a)}
                                      >
                                        <XCircle className="h-4 w-4 mr-1.5" /> Reject Proof
                                      </Button>
                                    </div>
                                  )}

                                  {isInProgress && (
                                    <div className="flex justify-end pt-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs rounded-xl h-9 font-semibold text-amber-600"
                                        onClick={() => setReassignAssignmentId(a.id)}
                                      >
                                        <RotateCw className="h-3.5 w-3.5 mr-1" /> Force Reassign (Release Slot)
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* ================= ALL CAMPAIGNS / PRODUCTS LIST VIEW ================= */
            <div className="space-y-4 w-full max-w-full overflow-x-hidden min-w-0">
              {/* Search input & Header Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns by product title, advertiser, or location..."
                    value={campaignSearch}
                    onChange={e => setCampaignSearch(e.target.value)}
                    className="h-10 pl-9 text-xs rounded-xl bg-card border-border/80 w-full"
                  />
                </div>
              </div>

              {/* TACTILE CATEGORY BUTTONS: Status Filters (Shown as tactile active buttons, not ordinary text) */}
              <div className="w-full overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-2 min-w-max">
                  {[
                    { key: 'all', label: 'All Campaigns', icon: Briefcase, count: allTasks.length, color: 'from-purple-600 to-indigo-600' },
                    { key: 'active', label: 'Active', icon: PlayCircle, count: allTasks.filter(t => t.status === 'active' || !t.status).length, color: 'from-emerald-600 to-teal-600' },
                    { key: 'paused', label: 'Paused', icon: PauseCircle, count: allTasks.filter(t => t.status === 'paused').length, color: 'from-amber-500 to-orange-600' },
                    { key: 'completed', label: 'Completed', icon: CheckCircle, count: allTasks.filter(t => t.status === 'completed').length, color: 'from-blue-600 to-indigo-600' },
                  ].map(s => {
                    const Icon = s.icon;
                    const isActive = campaignStatusFilter === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setCampaignStatusFilter(s.key as any)}
                        className={`h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all duration-200 cursor-pointer active:scale-95 ${
                          isActive
                            ? `bg-gradient-to-r ${s.color} text-white shadow-md ring-2 ring-white/30 scale-[1.02]`
                            : 'bg-card text-foreground/80 hover:text-foreground hover:bg-muted border border-border shadow-xs'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                        <span>{s.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isActive ? 'bg-white/25 text-white' : 'bg-secondary text-foreground'
                        }`}>
                          {s.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TACTILE SOCIAL PLATFORM CATEGORY BUTTONS */}
              <div className="w-full overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-1.5 min-w-max">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1 shrink-0">Category / Platform:</span>
                  {[
                    { key: 'all', label: 'All Platforms' },
                    { key: 'whatsapp', label: 'WhatsApp Status' },
                    { key: 'whatsapp_group', label: 'WhatsApp Group' },
                    { key: 'whatsapp_channel', label: 'WhatsApp Channel' },
                    { key: 'facebook', label: 'Facebook' },
                    { key: 'telegram', label: 'Telegram' },
                    { key: 'tiktok', label: 'TikTok' },
                    { key: 'instagram', label: 'Instagram' },
                    { key: 'twitter', label: 'Twitter/X' },
                  ].map(plat => {
                    const isSelected = platformCategoryFilter === plat.key;
                    const matchCount = plat.key === 'all'
                      ? allTasks.length
                      : allTasks.filter(t => (t.placements || []).some((p: string) => p.toLowerCase().includes(plat.key.toLowerCase()))).length;

                    return (
                      <button
                        key={plat.key}
                        type="button"
                        onClick={() => setPlatformCategoryFilter(plat.key)}
                        className={`h-8 px-3 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                            : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span>{plat.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-background/80 text-foreground'
                        }`}>
                          {matchCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campaign Cards */}
              {(() => {
                const filteredCampaigns = allTasks.filter(t => {
                  const matchesSearch = !campaignSearch ||
                    t.title.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                    (t.description && t.description.toLowerCase().includes(campaignSearch.toLowerCase())) ||
                    (t.target_state && t.target_state.toLowerCase().includes(campaignSearch.toLowerCase())) ||
                    (t._businessProfile?.display_name && t._businessProfile.display_name.toLowerCase().includes(campaignSearch.toLowerCase()));

                  const matchesStatus =
                    campaignStatusFilter === 'all' ? true :
                    campaignStatusFilter === 'active' ? (t.status === 'active' || !t.status) :
                    t.status === campaignStatusFilter;

                  const matchesCategory = platformCategoryFilter === 'all' ||
                    (t.placements && Array.isArray(t.placements) && t.placements.some((p: string) =>
                      p.toLowerCase().replace(/_/g, ' ').includes(platformCategoryFilter.toLowerCase().replace(/_/g, ' '))
                    ));

                  return matchesSearch && matchesStatus && matchesCategory;
                });

                if (filteredCampaigns.length === 0) {
                  return (
                    <Card className="border-dashed border-border/60 bg-muted/10 p-10 text-center rounded-2xl w-full">
                      <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-bold text-foreground">No syndicate campaigns found in this category</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaignSearch || platformCategoryFilter !== 'all' ? 'Try changing your category filter or search query' : 'When businesses launch syndicate campaigns, they appear here.'}
                      </p>
                    </Card>
                  );
                }

                return (
                  <div className="space-y-3 w-full min-w-0">
                    {filteredCampaigns.map(task => {
                      const isActive = task.status === 'active' || !task.status;
                      const pendingProofs = task._stats?.pending || 0;

                      return (
                        <Card
                          key={task.id}
                          className="border border-border/70 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden bg-card w-full max-w-full"
                        >
                          <CardContent className="p-3.5 sm:p-5 w-full min-w-0">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full min-w-0">
                              {/* Product Thumbnail & Core Info */}
                              <div className="flex items-start gap-3 sm:gap-3.5 flex-1 min-w-0 w-full">
                                {task.flyer_url ? (
                                  <div
                                    onClick={() => {
                                      setImageModalUrl(task.flyer_url);
                                      setImageModalTitle(task.title);
                                    }}
                                    className="h-18 w-18 sm:h-20 sm:w-20 rounded-xl overflow-hidden border border-border/60 bg-muted/30 shrink-0 cursor-pointer group relative shadow-xs"
                                  >
                                    <img
                                      src={task.flyer_url}
                                      alt={task.title}
                                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-18 w-18 sm:h-20 sm:w-20 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 flex items-center justify-center border border-purple-500/20">
                                    <Megaphone className="h-7 w-7" />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-bold text-foreground truncate max-w-full">{task.title}</h3>
                                    <Badge className={`text-[9px] font-bold border-0 shadow-xs ${
                                      isActive ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
                                      task.status === 'completed' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300' :
                                      'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                    }`}>
                                      {task.status?.toUpperCase() || 'ACTIVE'}
                                    </Badge>
                                    {pendingProofs > 0 && (
                                      <Badge className="bg-red-500 text-white text-[9px] font-black border-0 animate-pulse">
                                        {pendingProofs} Proofs To Review
                                      </Badge>
                                    )}
                                  </div>

                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                                    {task.description}
                                  </p>

                                  {/* Channel tags & Location */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                    {(task.placements || []).map((p: string) => (
                                      <span key={p} className="bg-secondary px-2 py-0.5 rounded-md font-semibold text-foreground">
                                        {p.replace(/_/g, ' ')}
                                      </span>
                                    ))}
                                    {task.target_state && (
                                      <span className="text-muted-foreground flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3 text-purple-600" /> {task.target_state}
                                      </span>
                                    )}
                                    {task._businessProfile && (
                                      <span className="text-muted-foreground truncate max-w-[200px]">
                                        • By: <strong className="text-foreground">{task._businessProfile.display_name || task._businessProfile.email}</strong>
                                      </span>
                                    )}
                                  </div>

                                  {/* Budget & Slots Bar */}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-xs">
                                    <span className="font-bold text-foreground">
                                      ₦{Number(task.total_cost || 0).toLocaleString()} budget
                                    </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      ₦{Number(task.payout_amount || task.cost_per_syndicate || 0).toLocaleString()} / post
                                    </span>
                                    <span className="text-muted-foreground">
                                      {task._stats?.total || 0} / {task.max_syndicates || '∞'} slots
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons: strictly mobile-friendly */}
                              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                                <Button
                                  size="sm"
                                  onClick={() => viewTaskSubmissions(task.id)}
                                  className="flex-1 md:flex-none h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm active:scale-95 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1.5" /> View Product & Proofs
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleCampaignStatus(task)}
                                  className="h-9 px-3 rounded-xl text-xs font-semibold active:scale-95 cursor-pointer"
                                >
                                  {isActive ? 'Pause' : 'Resume'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* APPLICATIONS TAB */}
        <TabsContent value="applications" className="space-y-3">
          {pendingApps.length === 0 && (
            <div className="text-center py-12 bg-secondary/10 rounded-2xl border border-dashed border-border/60">
              <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-bold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-0.5">No pending promoter applications</p>
            </div>
          )}
          {pendingApps.map(app => (
            <ApplicationCard key={app.id} app={app} onApprove={approveApplication} onReject={rejectApplication} />
          ))}
        </TabsContent>

        {/* TEAM / SYNDICATES TAB */}
        <TabsContent value="syndicates" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name, email, or state..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-secondary/50 border-0 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResetBanksModal(true)}
              className="h-10 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 shrink-0"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Reset All Member Banks
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">{syndicates.length} active syndicate members</p>
            <p className="text-[11px] text-muted-foreground">
              {syndicates.filter(s => s.account_number).length} verified bank accounts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {syndicates
              .filter(s =>
                !searchQuery ||
                s._profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s._profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.state?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(s => (
                <Card key={s.id} className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 border border-border">
                        <AvatarImage src={s._profile?.avatar_url} />
                        <AvatarFallback className="bg-purple-600 text-white font-bold text-xs">
                          {(s._profile?.display_name || s._profile?.email || 'S').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{s._profile?.display_name || 'Member'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s._profile?.email}</p>
                        {s.state && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{s.state}</p>}
                      </div>
                      <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-0 text-[10px] font-bold">
                        ★ {s.ranking_score || 5.0}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(s.verified_platforms || []).map((p: string) => (
                        <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>
                      ))}
                    </div>

                    {/* Bank & Paystack Subaccount Status */}
                    <div className="bg-secondary/30 rounded-xl p-2.5 space-y-1.5 text-[11px] border border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Bank Details</span>
                        <div className="flex items-center gap-1">
                          {s.account_number ? (
                            <>
                              <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Verified
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={resettingMemberId === s.user_id}
                                onClick={() => handleResetSingleMemberBank(s)}
                                className="h-5 text-[9px] px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                {resettingMemberId === s.user_id ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                  <RotateCw className="h-2.5 w-2.5 mr-0.5" />
                                )}
                                Reset
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">
                              No Bank Set
                            </Badge>
                          )}
                        </div>
                      </div>
                      {s.account_number ? (
                        <div>
                          <p className="font-bold text-foreground truncate">{s.bank_name || 'Bank'} • {s.account_number}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.account_name || s.bank_verified_name}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Member has not locked payout account</p>
                      )}

                      {/* Paystack Subaccount Info & Sync */}
                      <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1">
                        <div>
                          <span className="text-[9px] text-muted-foreground uppercase block font-semibold">Paystack Subaccount</span>
                          <span className="font-mono text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            {s.paystack_subaccount_code || 'Not Registered'}
                          </span>
                        </div>
                        {s.paystack_subaccount_code ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                            <Check className="h-3 w-3 mr-0.5" /> Active
                          </Badge>
                        ) : s.account_number ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!s.account_number || syncingSubaccountId === s.user_id}
                            onClick={() => syncMemberSubaccount(s)}
                            className="h-6 text-[10px] px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-semibold"
                          >
                            {syncingSubaccountId === s.user_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3 mr-0.5" />
                            )}
                            Register
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {(s.is_suspended || s.wallet_frozen) && (
                      <div className="flex flex-wrap gap-1">
                        {s.is_suspended && (
                          <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-0 text-[9px]">
                            <Ban className="h-3 w-3 mr-1" /> Suspended{s.suspended_reason ? `: ${s.suspended_reason}` : ''}
                          </Badge>
                        )}
                        {s.wallet_frozen && (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-0 text-[9px]">
                            <Snowflake className="h-3 w-3 mr-1" /> Wallet Frozen
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] rounded-xl font-semibold"
                        onClick={() => openSuspendModal(s)}
                      >
                        {s.is_suspended ? <><Sun className="h-3.5 w-3.5 mr-1" /> Unsuspend</> : <><Ban className="h-3.5 w-3.5 mr-1 text-red-500" /> Suspend</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] rounded-xl font-semibold"
                        onClick={() => toggleFreezeWallet(s)}
                      >
                        {s.wallet_frozen ? <><Sun className="h-3.5 w-3.5 mr-1" /> Unfreeze</> : <><Snowflake className="h-3.5 w-3.5 mr-1 text-blue-500" /> Freeze</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* PAYOUTS / WITHDRAWALS TAB */}
        <TabsContent value="withdrawals" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl">
              {[
                { key: 'pending', label: '⏳ Pending' },
                { key: 'completed', label: '✅ Completed' },
                { key: 'failed', label: '⚠️ Failed' },
                { key: 'all', label: '📋 All' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setWithdrawalFilter(f.key as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
                    withdrawalFilter === f.key ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button size="sm" variant="outline" onClick={fetchData} className="rounded-xl h-8 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {(() => {
            const filtered = withdrawals.filter(w => {
              const s = w.status || 'pending';
              if (withdrawalFilter === 'pending') return ['pending', 'pending_admin', 'pending_automatic', 'processing'].includes(s);
              if (withdrawalFilter === 'completed') return s === 'completed';
              if (withdrawalFilter === 'failed') return ['failed', 'rejected', 'cancelled'].includes(s);
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-12 bg-secondary/10 rounded-2xl border border-dashed border-border/60">
                  <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-foreground">No withdrawals in this filter</p>
                </div>
              );
            }

            return filtered.map(w => {
              const isProcessingThis = processingPayoutId === w.id;
              const isPendingOrProcessing = ['pending', 'pending_admin', 'pending_automatic', 'processing'].includes(w.status || 'pending');
              const isCompleted = w.status === 'completed';
              const isFailed = ['failed', 'rejected', 'cancelled'].includes(w.status);

              return (
                <Card key={w.id} className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
                  <CardContent className="p-0">
                    <div className={`p-4 text-white ${
                      isCompleted ? 'bg-gradient-to-r from-emerald-600 to-teal-600' :
                      isFailed ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                      w.status === 'processing' ? 'bg-gradient-to-r from-cyan-600 to-blue-600' :
                      'bg-gradient-to-r from-amber-500 to-orange-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-85">Withdrawal Payout</p>
                          <p className="text-2xl font-black mt-0.5">₦{Number(w.amount)?.toLocaleString()}</p>
                          <p className="text-xs opacity-90">{w._profile?.display_name || w._profile?.email}</p>
                        </div>
                        <Badge className="bg-white/25 text-white border-0 text-[10px] font-bold">
                          {w.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="bg-secondary/40 rounded-xl p-3 space-y-1 text-xs">
                        <p className="font-bold text-sm text-foreground">{w.bank_name} — {w.account_number}</p>
                        <p className="text-muted-foreground">{w.account_name}</p>
                        {w.failure_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 font-semibold pt-1">
                            Error: {w.failure_reason}
                          </p>
                        )}
                      </div>

                      {isPendingOrProcessing && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={isProcessingThis}
                            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs rounded-xl h-10 font-bold"
                            onClick={() => triggerPaystackPayout(w.id)}
                          >
                            {isProcessingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                            Pay via Paystack
                          </Button>
                          <Button
                            size="sm"
                            disabled={isProcessingThis}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700 text-white text-xs rounded-xl h-10 font-bold"
                            onClick={() => processWithdrawal(w.id, true)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Paid Manually
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isProcessingThis}
                            className="text-xs rounded-xl h-10 px-3.5 font-bold"
                            onClick={() => openWithdrawalRejectModal(w)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </TabsContent>

        {/* PRICING & SOCIAL PLATFORM CONTROLS TAB */}
        <TabsContent value="pricing" className="space-y-4">
          {/* Promoter Team WhatsApp Group Configuration */}
          <Card className="border border-emerald-500/30 shadow-xs rounded-2xl overflow-hidden bg-card">
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-900 p-4 text-white">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-300" /> Syndicate Promoter Team WhatsApp Group Link
              </h4>
              <p className="text-[11px] opacity-90 mt-0.5">
                Configure the official WhatsApp group link accessible in all Syndicate member dashboards for team strategy, planning & ad coordination
              </p>
            </div>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="url"
                    placeholder="https://chat.whatsapp.com/..."
                    value={promoterTeamWhatsappGroupLink}
                    onChange={e => setPromoterTeamWhatsappGroupLink(e.target.value)}
                    className="h-10 text-xs rounded-xl font-medium pl-9"
                  />
                  <Users className="h-4 w-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <Button
                  disabled={savingGroupLink}
                  onClick={savePromoterTeamWhatsappGroupLink}
                  className="h-10 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                >
                  {savingGroupLink ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Group Link'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                This link will be displayed prominently on all syndicate promoter dashboards so members can join the team strategy chat.
              </p>
            </CardContent>
          </Card>

          {/* Automated Paystack Subaccount Split Controller */}
          <Card className="border border-purple-500/30 shadow-xs rounded-2xl overflow-hidden bg-card">
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 p-4 text-white">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-yellow-300" /> Paystack Sub-Account & Payout Split Configuration
              </h4>
              <p className="text-[11px] opacity-80 mt-0.5">
                Automatically allocate campaign payouts to syndicate promoters' bank subaccounts via Paystack
              </p>
            </div>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-secondary/30 p-3.5 rounded-xl border border-border/50">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Promoter Split Percentage</p>
                  <p className="text-[11px] text-muted-foreground">
                    Percentage of the campaign budget paid to syndicate promoters. Remaining percentage is retained by the platform.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={syndicatePayoutPercentage}
                      onChange={e => setSyndicatePayoutPercentage(parseInt(e.target.value, 10) || 0)}
                      className="h-10 w-24 text-sm rounded-xl font-bold pr-7"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                  <Button
                    size="sm"
                    disabled={savingPercentage}
                    onClick={savePayoutPercentage}
                    className="h-10 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {savingPercentage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Split'}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                <Zap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Every syndicate member's verified account is registered as an active subaccount on Paystack with this split percentage. When payments are cleared, Paystack directly credits their accounts.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Social Platform Pricing and On/Off Toggles */}
          <Card className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-400" /> Platform Availability & Unit Pricing
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Toggle social channels ON/OFF. Deactivated channels will be hidden from advertisers.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-400">
                {platformPricing.filter(p => p.is_active !== false).length} Active Channels
              </Badge>
            </div>
            <CardContent className="p-4 space-y-3">
              {platformPricing.map(p => {
                const isActive = p.is_active !== false;
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition ${
                      isActive ? 'bg-secondary/30 border-border/60' : 'bg-muted/10 border-border/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => togglePlatformActive(p, isActive)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{p.platform_name}</span>
                          <Badge
                            className={`text-[9px] font-bold ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isActive ? 'Available' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {isActive ? 'Visible to advertisers creating campaigns' : 'Hidden from task creation forms'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-xs font-bold text-muted-foreground">Price per task: ₦</span>
                      <Input
                        type="number"
                        defaultValue={p.price_per_task}
                        disabled={!isActive}
                        className="h-9 w-24 text-xs rounded-xl font-bold bg-background"
                        onBlur={e => {
                          const v = parseFloat(e.target.value);
                          if (v > 0 && v !== p.price_per_task) updatePlatformPrice(p, v);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* LIGHTBOX / IMAGE ZOOM MODAL */}
      <Dialog open={!!imageModalUrl} onOpenChange={open => !open && setImageModalUrl(null)}>
        <DialogContent className="max-w-2xl p-2 rounded-2xl bg-black/95 border-border/40 text-white">
          <div className="flex justify-between items-center px-3 py-2 border-b border-white/10">
            <h4 className="text-xs font-bold truncate">{imageModalTitle || 'Image Preview'}</h4>
            {imageModalUrl && (
              <a
                href={imageModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Full View
              </a>
            )}
          </div>
          {imageModalUrl && (
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={imageModalUrl}
                alt="Enlarged"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PROOF REJECTION MODAL */}
      <Dialog open={!!rejectingAssignment} onOpenChange={open => !open && setRejectingAssignment(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Reject Promoter Proof
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select or specify the reason why this screenshot or post was rejected. This will be sent directly to the promoter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Quick Reasons</p>
              <div className="space-y-1">
                {PRESET_REJECTION_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonText(reason)}
                    className={`w-full text-left p-2 rounded-xl border text-[11px] transition ${
                      rejectionReasonText === reason
                        ? 'border-destructive bg-destructive/10 font-semibold text-destructive'
                        : 'border-border/60 bg-muted/20 text-foreground hover:bg-muted/40'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">Custom Rejection Note</p>
              <Textarea
                placeholder="Write specific feedback for the promoter..."
                value={rejectionReasonText}
                onChange={e => setRejectionReasonText(e.target.value)}
                className="h-20 text-xs rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRejectingAssignment(null)} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={processingReview || !rejectionReasonText.trim()}
              onClick={handleConfirmReject}
              className="h-9 rounded-xl text-xs font-bold"
            >
              {processingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUSPEND SYNDICATE MEMBER MODAL */}
      <Dialog open={!!suspendingSyndicate} onOpenChange={open => !open && setSuspendingSyndicate(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <Ban className="h-5 w-5" /> Suspend Syndicate Member
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will pause their ability to claim tasks and request withdrawals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-xs font-bold">Reason for Suspension</p>
            <Input
              value={suspendReasonText}
              onChange={e => setSuspendReasonText(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSuspendingSyndicate(null)} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleConfirmSuspend(suspendingSyndicate, true, suspendReasonText)}
              className="h-9 rounded-xl text-xs font-bold"
            >
              Suspend Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAWAL REJECTION MODAL */}
      <Dialog open={!!rejectingWithdrawal} onOpenChange={open => !open && setRejectingWithdrawal(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Reject Withdrawal Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              The requested credits will be refunded back to the promoter's wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-xs font-bold">Reason for Rejection</p>
            <Input
              value={withdrawalRejectReason}
              onChange={e => setWithdrawalRejectReason(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRejectingWithdrawal(null)} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => processWithdrawal(rejectingWithdrawal.id, false, withdrawalRejectReason)}
              className="h-9 rounded-xl text-xs font-bold"
            >
              Reject & Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REASSIGN TASK CONFIRM MODAL */}
      <Dialog open={!!reassignAssignmentId} onOpenChange={open => !open && setReassignAssignmentId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <RotateCw className="h-5 w-5 text-amber-500" /> Release Slot for Reassignment?
            </DialogTitle>
            <DialogDescription className="text-xs">
              This will release the promoter's claim so another active syndicate member can claim and fulfill this task.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setReassignAssignmentId(null)} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button onClick={handleConfirmReassign} className="h-9 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
              Release to Pool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESET ALL SYNDICATE BANKS CONFIRMATION MODAL */}
      <Dialog open={showResetBanksModal} onOpenChange={open => !open && !resettingBanks && setShowResetBanksModal(false)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Reset All Syndicate Member Banks?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This action will <strong>clear all registered payout bank accounts</strong> and Paystack subaccount codes across all {syndicates.length} syndicate promoters.
              <br /><br />
              All members will be required to input their bank details afresh and pass live Paystack verification on their next visit to the Syndicate Wallet or Onboarding screen.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-600" /> Clean Slate Re-Registration
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Useful for refreshing bank validation rules, clearing test records, or updating Paystack subaccount setups system-wide.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="ghost"
              disabled={resettingBanks}
              onClick={() => setShowResetBanksModal(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={resettingBanks}
              onClick={handleResetAllBanks}
              className="h-9 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              {resettingBanks ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Resetting {syndicates.length} Records...
                </>
              ) : (
                <>
                  <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Confirm Reset All Banks
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
    <Card className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 p-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-amber-300">
              <AvatarImage src={app._profile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                {(app._profile?.display_name || app._profile?.email || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{app._profile?.display_name || 'New Applicant'}</p>
              <p className="text-xs text-muted-foreground truncate">{app._profile?.email}</p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-0 rounded-full text-[10px] px-2.5">
              <Clock className="h-3 w-3 mr-1" /> Pending Review
            </Badge>
          </div>
          {app.state && <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-2"><MapPin className="h-3 w-3" />{app.state}</p>}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">Social Channels & Follower Reach</p>
          {influenceFields.map(f => app[f.key] && (
            <div key={f.key} className="flex items-start gap-3 bg-secondary/30 rounded-xl p-3">
              <Checkbox
                checked={selectedPlatforms.includes(f.platform)}
                onCheckedChange={() => setSelectedPlatforms(prev =>
                  prev.includes(f.platform) ? prev.filter(p => p !== f.platform) : [...prev, f.platform]
                )}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-foreground">{f.label}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{app[f.key]}</p>
              </div>
            </div>
          ))}
          {app.other_platforms && (
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Other Platforms</p>
              <p className="text-xs text-foreground mt-0.5">{app.other_platforms}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs h-10 rounded-xl shadow-md font-bold"
              disabled={selectedPlatforms.length === 0}
              onClick={() => onApprove(app, selectedPlatforms)}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve Channels ({selectedPlatforms.length})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 text-xs h-10 rounded-xl font-bold"
              onClick={() => onReject(app)}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSyndicateManager;
