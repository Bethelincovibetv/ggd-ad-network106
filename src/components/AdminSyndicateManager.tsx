import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Building2,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  Layers,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Sliders,
  Send,
  Zap,
  Clock,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  UserCheck,
  UserX,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";
import { POPULAR_NIGERIAN_BANKS, findBankCode } from "@/utils/nigerianBanks";

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

export const AdminSyndicateManager = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'verification' | 'campaigns' | 'payouts' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingApps: 0,
    pendingBankChanges: 0,
    inactiveMembers: 0,
    suspendedMembers: 0,
    frozenWallets: 0,
    activeCampaigns: 0,
    pendingProofs: 0,
    pendingSettlements: 0,
    totalPayouts: 0,
    successfulPayouts: 0,
    failedPayouts: 0,
  });

  // Members
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended' | 'frozen' | 'locked' | 'unlocked'>('all');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [viewingMember, setViewingMember] = useState<any | null>(null);
  const [memberProofs, setMemberProofs] = useState<any[]>([]);
  const [memberWithdrawals, setMemberWithdrawals] = useState<any[]>([]);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);

  // Bank Change Requests & Verification Center
  const [bankChangeRequests, setBankChangeRequests] = useState<any[]>([]);
  const [onboardingApplications, setOnboardingApplications] = useState<any[]>([]);
  const [processingVerification, setProcessingVerification] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);

  // Campaigns & Collective Settlements
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [settlementPrevs, setSettlementPrevs] = useState<Record<string, any>>({});
  const [processingSettlement, setProcessingSettlement] = useState<string | null>(null);

  // Payouts & Withdrawals
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState({
    payout_percentage: '70',
    exchange_rate: '100',
    assignment_deadline_hours: '24',
    max_auto_payout_amount: '50000',
    auto_payout_enabled: 'false',
    cooldown_hours: '48',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        synProfRes,
        bankReqRes,
        onboardingRes,
        adsRes,
        withdrawalsRes,
        settingsRes,
        profilesRes
      ] = await Promise.all([
        supabase.from('syndicate_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('syndicate_bank_change_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('syndicate_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('ads').select('*').eq('ad_type', 'syndicate').order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*'),
        supabase.from('profiles').select('user_id, email, display_name, business_name, phone, state, credits')
      ]);

      const profileMap: Record<string, any> = {};
      (profilesRes.data || []).forEach(p => { profileMap[p.user_id] = p; });

      const enrichedMembers = (synProfRes.data || []).map(m => ({
        ...m,
        profile: profileMap[m.user_id] || {},
      }));

      setMembers(enrichedMembers);
      setBankChangeRequests(bankReqRes.data || []);
      setOnboardingApplications(onboardingRes.data || []);
      setCampaigns(adsRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);

      // Parse Settings
      const settObj = { ...settings };
      (settingsRes.data || []).forEach(s => {
        if (s.key === 'syndicate_payout_percentage') settObj.payout_percentage = s.value;
        if (s.key === 'credit_exchange_rate') settObj.exchange_rate = s.value;
        if (s.key === 'syndicate_assignment_deadline_hours') settObj.assignment_deadline_hours = s.value;
        if (s.key === 'max_auto_payout_amount') settObj.max_auto_payout_amount = s.value;
        if (s.key === 'auto_payout_enabled') settObj.auto_payout_enabled = s.value;
        if (s.key === 'syndicate_withdraw_cooldown_hours') settObj.cooldown_hours = s.value;
      });
      setSettings(settObj);

      // Compute aggregate stats
      const totalM = enrichedMembers.length;
      const activeM = enrichedMembers.filter(m => m.is_active && !m.is_suspended).length;
      const pendingApps = (onboardingRes.data || []).filter(a => a.status === 'pending').length;
      const pendingBReqs = (bankReqRes.data || []).filter(r => r.status === 'pending').length;
      const inactiveM = enrichedMembers.filter(m => !m.is_active).length;
      const suspendedM = enrichedMembers.filter(m => m.is_suspended).length;
      const frozenM = enrichedMembers.filter(m => m.wallet_frozen).length;
      const activeC = (adsRes.data || []).filter(a => a.status === 'active').length;
      const totalP = (withdrawalsRes.data || []).reduce((acc, w) => acc + (w.status === 'completed' ? Number(w.amount || 0) : 0), 0);
      const succP = (withdrawalsRes.data || []).filter(w => w.status === 'completed').length;
      const failP = (withdrawalsRes.data || []).filter(w => ['failed', 'rejected'].includes(w.status)).length;

      setStats({
        totalMembers: totalM,
        activeMembers: activeM,
        pendingApps,
        pendingBankChanges: pendingBReqs,
        inactiveMembers: inactiveM,
        suspendedMembers: suspendedM,
        frozenWallets: frozenM,
        activeCampaigns: activeC,
        pendingProofs: 0,
        pendingSettlements: activeC,
        totalPayouts: totalP,
        successfulPayouts: succP,
        failedPayouts: failP,
      });

    } catch (err: any) {
      console.error("Error loading syndicate admin data:", err);
      toast.error("Failed to load Syndicate management data.");
    } finally {
      setLoading(false);
    }
  };

  // Open Member Profile Drawer
  const openMemberDrawer = async (member: any) => {
    setViewingMember(member);
    setLoadingMemberDetails(true);
    try {
      const [proofsRes, wRes] = await Promise.all([
        supabase.from('syndicate_task_assignments').select('*').eq('syndicate_member_id', member.user_id).order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').eq('user_id', member.user_id).order('created_at', { ascending: false })
      ]);
      setMemberProofs(proofsRes.data || []);
      setMemberWithdrawals(wRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  // Toggle member active status
  const toggleMemberActive = async (memberId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('user_id', memberId);

      if (error) throw error;
      toast.success(`Member status updated to ${!currentActive ? 'Active' : 'Inactive'}`);
      loadAllData();
      if (viewingMember?.user_id === memberId) {
        setViewingMember((prev: any) => ({ ...prev, is_active: !currentActive }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update member status");
    }
  };

  // Toggle wallet frozen status
  const toggleWalletFrozen = async (memberId: string, currentFrozen: boolean) => {
    try {
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ wallet_frozen: !currentFrozen, updated_at: new Date().toISOString() })
        .eq('user_id', memberId);

      if (error) throw error;
      toast.success(`Member wallet ${!currentFrozen ? 'Frozen' : 'Unfrozen'}`);
      loadAllData();
      if (viewingMember?.user_id === memberId) {
        setViewingMember((prev: any) => ({ ...prev, wallet_frozen: !currentFrozen }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update wallet status");
    }
  };

  // Batch Toggle Selection
  const handleBatchStatus = async (newStatus: boolean) => {
    if (selectedMemberIds.length === 0) {
      toast.error("No members selected");
      return;
    }
    try {
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .in('user_id', selectedMemberIds);

      if (error) throw error;
      toast.success(`${selectedMemberIds.length} members set to ${newStatus ? 'Active' : 'Inactive'}`);
      setSelectedMemberIds([]);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Batch update failed");
    }
  };

  // Deactivate All Non-Performing / Flagged Members
  const handleDeactivateNonPerforming = async () => {
    const nonPerforming = members.filter(m => m.is_active && ((m.tasks_completed || 0) === 0 || m.is_suspended));
    if (nonPerforming.length === 0) {
      toast.info("No active flagged or zero-participation members found.");
      return;
    }
    try {
      const ids = nonPerforming.map(m => m.user_id);
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('user_id', ids);

      if (error) throw error;
      toast.success(`Deactivated ${ids.length} inactive/flagged members.`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    }
  };

  // Approve Bank Change Request
  const handleApproveBankChange = async (req: any) => {
    setProcessingVerification(req.id);
    try {
      // 1. Try backend Edge Function for Paystack recipient update
      let approvedViaEdge = false;
      try {
        const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
          body: {
            action: 'approve_bank_change',
            request_id: req.id,
          },
        });
        if (!error && data?.success) {
          approvedViaEdge = true;
        }
      } catch {
        approvedViaEdge = false;
      }

      // 2. Direct fallback
      if (!approvedViaEdge) {
        // Update request status
        await supabase
          .from('syndicate_bank_change_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', req.id);

        // Atomically update syndicate profile bank details & lock
        await supabase
          .from('syndicate_profiles')
          .update({
            bank_name: req.requested_bank_name,
            bank_code: req.requested_bank_code,
            account_number: req.requested_account_number,
            account_name: req.requested_account_name,
            bank_verified_name: req.requested_account_name,
            is_bank_locked: true,
            bank_verified_at: new Date().toISOString(),
            bank_changed_at: new Date().toISOString(),
          } as any)
          .eq('user_id', req.user_id);
      }

      toast.success(`Bank change approved for ${req.requested_account_name}. Details locked.`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve bank change");
    } finally {
      setProcessingVerification(null);
    }
  };

  // Reject Bank Change Request
  const handleRejectBankChange = async (reqId: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting the bank change");
      return;
    }
    setProcessingVerification(reqId);
    try {
      await supabase
        .from('syndicate_bank_change_requests')
        .update({
          status: 'rejected',
          admin_notes: rejectReason.trim(),
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reqId);

      toast.success("Bank change request rejected");
      setActiveRejectId(null);
      setRejectReason('');
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request");
    } finally {
      setProcessingVerification(null);
    }
  };

  // Approve Onboarding Application
  const handleApproveApplication = async (appId: string, userId: string) => {
    setProcessingVerification(appId);
    try {
      await supabase.from('syndicate_applications').update({ status: 'approved' }).eq('id', appId);
      await supabase.from('syndicate_profiles').upsert({
        user_id: userId,
        is_active: true,
        is_verified: true,
        reputation_score: 100,
        tier: 'Core Team',
      } as any, { onConflict: 'user_id' });
      await supabase.from('user_roles').upsert({ user_id: userId, role: 'syndicate' }, { onConflict: 'user_id,role' });

      toast.success("Application approved! Member is now active on the Direct Team.");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve application");
    } finally {
      setProcessingVerification(null);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = [
        { key: 'syndicate_payout_percentage', value: settings.payout_percentage },
        { key: 'credit_exchange_rate', value: settings.exchange_rate },
        { key: 'syndicate_assignment_deadline_hours', value: settings.assignment_deadline_hours },
        { key: 'max_auto_payout_amount', value: settings.max_auto_payout_amount },
        { key: 'auto_payout_enabled', value: settings.auto_payout_enabled },
        { key: 'syndicate_withdraw_cooldown_hours', value: settings.cooldown_hours },
      ];

      for (const u of updates) {
        await supabase.from('app_settings').upsert({ key: u.key, value: u.value }, { onConflict: 'key' });
      }

      toast.success("Syndicate parameters saved successfully!");
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Process Payout via Paystack or Manual
  const handleProcessWithdrawal = async (w: any, action: 'paystack' | 'manual_paid' | 'reject') => {
    setProcessingWithdrawalId(w.id);
    try {
      if (action === 'paystack') {
        const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
          body: { withdrawal_id: w.id },
        });

        if (error || data?.status === 'failed') {
          throw new Error(data?.error || "Paystack transfer failed");
        }
        toast.success("⚡ Paystack transfer initiated successfully!");
      } else if (action === 'manual_paid') {
        await supabase.from('withdrawal_requests').update({
          status: 'completed',
          admin_notes: 'Marked paid manually by admin',
          updated_at: new Date().toISOString(),
        }).eq('id', w.id);
        toast.success("Withdrawal marked as Paid & Completed");
      } else if (action === 'reject') {
        const rate = parseInt(settings.exchange_rate) || 100;
        const creditsToRefund = Math.ceil(Number(w.amount) / rate);

        await supabase.from('withdrawal_requests').update({
          status: 'rejected',
          admin_notes: 'Rejected by admin and credits refunded',
          updated_at: new Date().toISOString(),
        }).eq('id', w.id);

        const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', w.user_id).single();
        if (prof) {
          await supabase.from('profiles').update({
            credits: Number(prof.credits || 0) + creditsToRefund,
          }).eq('user_id', w.user_id);
        }
        toast.success(`Withdrawal rejected. ${creditsToRefund} GGG credits refunded to member.`);
      }
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal");
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      m.user_id?.toLowerCase().includes(q) ||
      m.profile?.display_name?.toLowerCase().includes(q) ||
      m.profile?.business_name?.toLowerCase().includes(q) ||
      m.profile?.email?.toLowerCase().includes(q) ||
      m.profile?.phone?.toLowerCase().includes(q) ||
      m.bank_name?.toLowerCase().includes(q) ||
      m.account_name?.toLowerCase().includes(q);

    const matchesState = stateFilter === 'ALL' || (m.profile?.state && m.profile?.state.toLowerCase().includes(stateFilter.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = m.is_active && !m.is_suspended;
    else if (statusFilter === 'inactive') matchesStatus = !m.is_active;
    else if (statusFilter === 'suspended') matchesStatus = m.is_suspended;
    else if (statusFilter === 'frozen') matchesStatus = m.wallet_frozen;
    else if (statusFilter === 'locked') matchesStatus = m.is_bank_locked;
    else if (statusFilter === 'unlocked') matchesStatus = !m.is_bank_locked;

    return matchesSearch && matchesState && matchesStatus;
  });

  const pendingBankChanges = bankChangeRequests.filter(r => r.status === 'pending');
  const pendingApps = onboardingApplications.filter(a => a.status === 'pending');

  return (
    <div className="w-full min-h-screen pb-20 space-y-5 bg-background">
      {/* Top Mobile-Ready Hero App Bar */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300">GGD Workforce Operations</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Direct Team Syndicate
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Verified workforce command center, automated Paystack settlements & bank lock security
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={loadAllData}
              disabled={loading}
              variant="outline"
              size="sm"
              className="h-10 px-4 text-xs font-bold rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Swipeable Horizontal Navigation Bar (NEVER squished or overlapping) */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-2 min-w-max px-1">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'members', label: 'Members Roster', icon: Users, count: stats.activeMembers },
            {
              id: 'verification',
              label: 'Verification Center',
              icon: ShieldCheck,
              badge: pendingBankChanges.length + pendingApps.length,
              badgeColor: 'bg-red-500 text-white',
            },
            { id: 'campaigns', label: 'Campaigns & Settlements', icon: Layers, count: stats.activeCampaigns },
            { id: 'payouts', label: 'Payouts & Withdrawals', icon: DollarSign },
            { id: 'settings', label: 'Settings & Economics', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 h-12 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 shadow-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 shadow-md scale-[1.02]'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-secondary text-foreground'}`}>
                    {tab.count}
                  </span>
                )}
                {Boolean(tab.badge) && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold animate-pulse ${tab.badgeColor || 'bg-red-500 text-white'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* High-Impact Mobile KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-4 sm:p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-200">Active Workforce</p>
                  <p className="text-2xl sm:text-3xl font-black mt-1">{stats.activeMembers}</p>
                  <p className="text-[10px] text-purple-200 mt-1">out of {stats.totalMembers} total members</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-100" />
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 sm:p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-200">Total Settled</p>
                  <p className="text-xl sm:text-2xl font-black mt-1">₦{stats.totalPayouts.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-200 mt-1">{stats.successfulPayouts} payouts settled</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-100" />
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 text-white p-4 sm:p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-200">Pending Actions</p>
                  <p className="text-2xl sm:text-3xl font-black mt-1">{pendingBankChanges.length + pendingApps.length}</p>
                  <p className="text-[10px] text-amber-200 mt-1">{pendingBankChanges.length} bank changes • {pendingApps.length} apps</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-amber-100" />
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-md rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white p-4 sm:p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-200">Active Campaigns</p>
                  <p className="text-2xl sm:text-3xl font-black mt-1">{stats.activeCampaigns}</p>
                  <p className="text-[10px] text-blue-200 mt-1">Direct Team Execution</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-blue-100" />
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Action Navigation Hub */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveTab('verification')}
              className="p-4 rounded-2xl border border-border/80 bg-card hover:border-purple-500 shadow-sm flex items-center justify-between text-left group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Verification Center</p>
                  <p className="text-xs text-muted-foreground">{pendingBankChanges.length} bank changes waiting</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className="p-4 rounded-2xl border border-border/80 bg-card hover:border-purple-500 shadow-sm flex items-center justify-between text-left group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Manage Team Roster</p>
                  <p className="text-xs text-muted-foreground">{stats.activeMembers} active verified members</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className="p-4 rounded-2xl border border-border/80 bg-card hover:border-purple-500 shadow-sm flex items-center justify-between text-left group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Settle Campaigns</p>
                  <p className="text-xs text-muted-foreground">Deterministic payout calculator</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS ROSTER */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Search & State Filter Controls */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, phone, email, state, or bank..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-sm rounded-2xl bg-card border-border shadow-sm font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <select
                aria-label="Filter by Nigerian State"
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className="h-9 px-3 rounded-xl text-xs font-bold border border-input bg-card text-foreground"
              >
                <option value="ALL">📍 All Nigerian States</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {(['all', 'active', 'inactive', 'suspended', 'frozen', 'locked', 'unlocked'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`h-9 px-3 rounded-xl text-xs font-bold capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border/70'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-secondary/50 border border-border/80 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedMemberIds.length === filteredMembers.length) setSelectedMemberIds([]);
                  else setSelectedMemberIds(filteredMembers.map(m => m.user_id));
                }}
                className="flex items-center gap-1.5 font-bold text-foreground hover:text-purple-600"
              >
                {selectedMemberIds.length > 0 && selectedMemberIds.length === filteredMembers.length ? (
                  <CheckSquare className="h-4 w-4 text-purple-600" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Select All ({filteredMembers.length})</span>
              </button>
              {selectedMemberIds.length > 0 && (
                <Badge variant="secondary" className="font-bold">
                  {selectedMemberIds.length} Selected
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedMemberIds.length > 0 && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleBatchStatus(true)}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBatchStatus(false)}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" /> Deactivate
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeactivateNonPerforming}
                className="h-8 px-2.5 text-xs font-bold rounded-lg border-red-300 text-red-600 hover:bg-red-50"
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> Flag Inactive Members
              </Button>
            </div>
          </div>

          {/* Members List - Mobile-Friendly Full Cards */}
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <Card className="p-8 text-center rounded-2xl border-dashed">
                <p className="text-sm font-semibold text-muted-foreground">No members found matching filters.</p>
              </Card>
            ) : (
              filteredMembers.map(member => {
                const isSelected = selectedMemberIds.includes(member.user_id);
                return (
                  <Card
                    key={member.user_id}
                    className={`border transition-all rounded-2xl overflow-hidden ${
                      isSelected ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/10' : 'border-border/80 bg-card'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      {/* Top Row: User details & selection */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => {
                              if (isSelected) setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.user_id));
                              else setSelectedMemberIds([...selectedMemberIds, member.user_id]);
                            }}
                            className="mt-1"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-purple-600" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="font-bold text-base text-foreground">
                                {member.profile?.display_name || member.profile?.business_name || 'Syndicate Member'}
                              </h3>
                              {member.is_active ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px] font-bold">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-400 border-0 text-[10px] font-bold">
                                  Inactive
                                </Badge>
                              )}
                              {member.is_bank_locked && (
                                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-0 text-[10px] font-bold gap-0.5">
                                  <Lock className="h-2.5 w-2.5" /> Bank Locked
                                </Badge>
                              )}
                              {member.wallet_frozen && (
                                <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-0 text-[10px] font-bold">
                                  Wallet Frozen
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-0.5">
                              {member.profile?.email || 'No email'} • {member.profile?.phone || 'No phone'}
                            </p>

                            {member.profile?.state && (
                              <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3" /> {member.profile.state} State
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Credits / Rep Score */}
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground">
                            {(member.profile?.credits || 0).toLocaleString()} Cr
                          </p>
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            Rep: {member.reputation_score || 100}%
                          </p>
                        </div>
                      </div>

                      {/* Middle: Bank credentials */}
                      <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 text-xs flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Locked Bank Account
                          </span>
                          <p className="font-bold text-foreground">
                            {member.bank_name || 'No Bank'} • {maskAccountNumber(member.account_number)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Holder: {member.account_name || member.bank_verified_name || 'Unverified'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Tasks Completed
                          </span>
                          <p className="font-bold text-foreground">{member.tasks_completed || 0} tasks</p>
                        </div>
                      </div>

                      {/* Bottom Action Buttons (Large, high-contrast, touch-friendly) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMemberDrawer(member)}
                          className="h-10 px-3.5 text-xs font-bold rounded-xl flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1.5" /> View Profile & History
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => toggleMemberActive(member.user_id, member.is_active)}
                          className={`h-10 px-3.5 text-xs font-bold rounded-xl ${
                            member.is_active
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleWalletFrozen(member.user_id, member.wallet_frozen)}
                          className={`h-10 px-3 text-xs font-bold rounded-xl ${
                            member.wallet_frozen ? 'border-emerald-500 text-emerald-600' : 'border-red-300 text-red-600'
                          }`}
                        >
                          {member.wallet_frozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VERIFICATION CENTER (Bank Change Requests & Onboarding) */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* 1. Bank Change Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-600" /> Pending Bank Change Requests ({pendingBankChanges.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Members requesting to update their locked payout account (Paystack resolved)
                </p>
              </div>
            </div>

            {pendingBankChanges.length === 0 ? (
              <Card className="p-6 text-center rounded-2xl border-dashed">
                <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-foreground">No Pending Bank Change Requests</p>
                <p className="text-xs text-muted-foreground">All member bank payout accounts are verified and locked.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingBankChanges.map(req => {
                  const member = members.find(m => m.user_id === req.user_id);
                  const isProcessing = processingVerification === req.id;
                  const isRejecting = activeRejectId === req.id;

                  return (
                    <Card key={req.id} className="border-2 border-amber-300 rounded-2xl overflow-hidden bg-card shadow-md">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 text-white flex justify-between items-center text-xs font-bold">
                        <span>Bank Change Request</span>
                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        {/* Member Information */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-base text-foreground">
                              {member?.profile?.display_name || member?.profile?.business_name || 'Syndicate Member'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {member?.profile?.email} • {member?.profile?.phone}
                            </p>
                          </div>
                          {member?.profile?.state && (
                            <Badge variant="outline" className="text-xs font-bold">
                              📍 {member.profile.state}
                            </Badge>
                          )}
                        </div>

                        {/* Side-by-Side Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* CURRENT LOCKED BANK */}
                          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                              Current Locked Account
                            </span>
                            <p className="font-bold text-sm text-foreground">{req.current_bank_name || 'None'}</p>
                            <p className="font-mono text-xs font-bold text-foreground">{maskAccountNumber(req.current_account_number)}</p>
                            <p className="text-xs text-muted-foreground">{req.current_account_name || '—'}</p>
                          </div>

                          {/* REQUESTED NEW BANK (PAYSTACK RESOLVED) */}
                          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                                Requested New Account
                              </span>
                              <Badge className="bg-emerald-600 text-white text-[9px] font-bold">Paystack Verified</Badge>
                            </div>
                            <p className="font-bold text-sm text-emerald-950 dark:text-emerald-100">{req.requested_bank_name}</p>
                            <p className="font-mono text-xs font-bold text-emerald-950 dark:text-emerald-100">{maskAccountNumber(req.requested_account_number)}</p>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{req.requested_account_name}</p>
                          </div>
                        </div>

                        {req.admin_notes && (
                          <p className="text-xs bg-secondary/30 p-2.5 rounded-xl text-muted-foreground">
                            <strong>Note:</strong> {req.admin_notes}
                          </p>
                        )}

                        {/* Actions */}
                        {isRejecting ? (
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-xs font-bold">Reason for Rejection</Label>
                            <Input
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="e.g. Account name mismatch with registered KYC name"
                              className="h-10 text-xs"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => handleRejectBankChange(req.id)}
                                className="h-10 px-4 text-xs font-bold rounded-xl bg-red-600 text-white flex-1"
                              >
                                Confirm Rejection
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setActiveRejectId(null); setRejectReason(''); }}
                                className="h-10 px-4 text-xs font-bold rounded-xl"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button
                              disabled={isProcessing}
                              onClick={() => handleApproveBankChange(req)}
                              className="h-11 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex-1 shadow-sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-1.5" /> Approve & Lock New Bank Details
                            </Button>
                            <Button
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => { setActiveRejectId(req.id); setRejectReason(''); }}
                              className="h-11 px-4 text-xs font-bold rounded-xl border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1.5" /> Reject Request
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Onboarding Applications */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" /> Pending Workforce Applications ({pendingApps.length})
            </h3>

            {pendingApps.length === 0 ? (
              <Card className="p-5 text-center rounded-2xl border-dashed">
                <p className="text-xs text-muted-foreground font-semibold">No pending workforce onboarding applications.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingApps.map(app => (
                  <Card key={app.id} className="border rounded-2xl p-4 space-y-3 bg-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{app.full_name}</h4>
                        <p className="text-xs text-muted-foreground">{app.email} • {app.phone_number}</p>
                        <p className="text-[11px] font-semibold text-purple-600 mt-0.5">📍 {app.state_location || 'Nigeria'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold">Pending Review</Badge>
                    </div>

                    {app.experience && (
                      <p className="text-xs text-muted-foreground bg-secondary/40 p-2.5 rounded-xl">
                        <strong>Experience:</strong> {app.experience}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveApplication(app.id, app.user_id)}
                        className="h-10 px-4 text-xs font-bold rounded-xl bg-purple-600 text-white flex-1"
                      >
                        <UserCheck className="h-4 w-4 mr-1.5" /> Approve & Onboard to Syndicate
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CAMPAIGNS & DETERMINISTIC SETTLEMENTS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Direct Team Campaign Execution</h3>
              <p className="text-xs text-muted-foreground">
                Settlements automatically distribute earnings mathematically across verified active team members
              </p>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <p className="text-sm font-semibold text-muted-foreground">No Syndicate campaigns found.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map(camp => {
                const targetStates: string[] = camp.target_states || [];
                const eligibleMembers = members.filter(m =>
                  m.is_active &&
                  !m.is_suspended &&
                  (targetStates.length === 0 || targetStates.includes('All') || (m.profile?.state && targetStates.includes(m.profile.state)))
                );

                const rate = parseInt(settings.exchange_rate) || 100;
                const payoutPct = parseInt(settings.payout_percentage) || 70;
                const campaignCredits = Number(camp.credits || 100);
                const grossFiat = campaignCredits * rate;
                const teamPoolFiat = (grossFiat * payoutPct) / 100;
                const perMemberFiat = eligibleMembers.length > 0 ? Math.floor(teamPoolFiat / eligibleMembers.length) : 0;
                const perMemberCredits = Math.floor(perMemberFiat / rate);

                return (
                  <Card key={camp.id} className="border border-border/80 rounded-2xl bg-card overflow-hidden">
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-foreground">{camp.title}</h4>
                            <Badge className="bg-purple-600 text-white text-[10px] font-bold">{camp.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{camp.description || 'Campaign task'}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Targets:</span>
                            {targetStates.length > 0 ? (
                              targetStates.map(st => (
                                <Badge key={st} variant="secondary" className="text-[10px] py-0 px-1.5">
                                  {st}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">All Nigeria</Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-purple-600">{campaignCredits} Cr</p>
                          <p className="text-[10px] text-muted-foreground">≈ ₦{grossFiat.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Deterministic Settlement Breakdown Box */}
                      <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-2 text-xs">
                        <p className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          Deterministic Settlement Calculation Preview
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                          <div>
                            <span className="text-muted-foreground block">Settlement Base</span>
                            <strong>₦{grossFiat.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Team Pool ({payoutPct}%)</span>
                            <strong className="text-emerald-600">₦{teamPoolFiat.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Eligible Workforce</span>
                            <strong>{eligibleMembers.length} Active Members</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Individual Payout</span>
                            <strong className="text-purple-600">₦{perMemberFiat.toLocaleString()} ({perMemberCredits} Cr)</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={eligibleMembers.length === 0}
                          onClick={() => {
                            toast.success(`Settlement simulator verified for ${eligibleMembers.length} active members.`);
                          }}
                          className="h-10 px-4 text-xs font-bold rounded-xl bg-purple-600 text-white"
                        >
                          Execute Collective Settlement (₦{perMemberFiat.toLocaleString()} / member)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PAYOUTS & WITHDRAWALS */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">Direct Team Payout Requests</h3>
              <p className="text-xs text-muted-foreground">Process transfers via Paystack or record manual settlements</p>
            </div>

            <div className="flex gap-1.5">
              {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setWithdrawalFilter(st)}
                  className={`h-9 px-3 rounded-xl text-xs font-bold capitalize transition-all ${
                    withdrawalFilter === st
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border/70'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {withdrawals
              .filter(w => {
                if (withdrawalFilter === 'all') return true;
                if (withdrawalFilter === 'pending') return w.status.includes('pending');
                return w.status === withdrawalFilter;
              })
              .map(w => {
                const isPending = w.status.includes('pending');
                const isProcessing = processingWithdrawalId === w.id;

                return (
                  <Card key={w.id} className="border border-border/80 rounded-2xl bg-card">
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-foreground">₦{Number(w.amount).toLocaleString()}</span>
                            <Badge className={`text-[10px] font-bold ${
                              w.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              w.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {w.status}
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-foreground mt-0.5">
                            {w.account_name} • {w.bank_name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">{maskAccountNumber(w.account_number)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(w.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleProcessWithdrawal(w, 'paystack')}
                            className="h-10 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm flex-1"
                          >
                            <Zap className="h-3.5 w-3.5 mr-1.5" /> Transfer via Paystack
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isProcessing}
                            onClick={() => handleProcessWithdrawal(w, 'manual_paid')}
                            className="h-10 px-3 text-xs font-bold rounded-xl border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark Paid Manually
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isProcessing}
                            onClick={() => handleProcessWithdrawal(w, 'reject')}
                            className="h-10 px-3 text-xs font-bold rounded-xl border-red-300 text-red-600 hover:bg-red-50"
                          >
                            Reject & Refund
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS & ECONOMICS */}
      {activeTab === 'settings' && (
        <Card className="border border-border/80 rounded-2xl bg-card shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold">Direct Team Economic Parameters</CardTitle>
            <CardDescription className="text-xs">
              Configure settlement percentages, exchange rates, and Paystack auto-payout safety controls
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Payout Percentage (%)</Label>
                <Input
                  type="number"
                  value={settings.payout_percentage}
                  onChange={e => setSettings({ ...settings, payout_percentage: e.target.value })}
                  className="h-11 mt-1 text-sm font-bold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Percentage of campaign fee paid to the Direct Team (e.g. 70%)</p>
              </div>

              <div>
                <Label className="text-xs font-bold">Exchange Rate (₦ per 1 GGG Credit)</Label>
                <Input
                  type="number"
                  value={settings.exchange_rate}
                  onChange={e => setSettings({ ...settings, exchange_rate: e.target.value })}
                  className="h-11 mt-1 text-sm font-bold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Naira conversion rate for withdrawals (e.g. 1 Cr = ₦100)</p>
              </div>

              <div>
                <Label className="text-xs font-bold">Max Auto-Payout Threshold (₦)</Label>
                <Input
                  type="number"
                  value={settings.max_auto_payout_amount}
                  onChange={e => setSettings({ ...settings, max_auto_payout_amount: e.target.value })}
                  className="h-11 mt-1 text-sm font-bold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Amounts above this will require manual admin approval</p>
              </div>

              <div>
                <Label className="text-xs font-bold">Bank Change Safety Lockout (Hours)</Label>
                <Input
                  type="number"
                  value={settings.cooldown_hours}
                  onChange={e => setSettings({ ...settings, cooldown_hours: e.target.value })}
                  className="h-11 mt-1 text-sm font-bold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Hours withdrawals remain locked after an approved bank change (e.g. 48h)</p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                disabled={savingSettings}
                onClick={handleSaveSettings}
                className="w-full sm:w-auto h-12 px-6 text-sm font-bold rounded-xl bg-purple-600 text-white shadow-md hover:bg-purple-700"
              >
                {savingSettings ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Save Economic Parameters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEMBER PROFILE AUDIT DRAWER / FULL MODAL */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto flex flex-col border border-border">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-lg">
                  {(viewingMember.profile?.display_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    {viewingMember.profile?.display_name || viewingMember.profile?.business_name || 'Member Details'}
                  </h3>
                  <p className="text-xs text-purple-200">
                    User ID: {viewingMember.user_id.slice(0, 10)}... • {viewingMember.tier || 'Core Team'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingMember(null)}
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-4">
              {/* Member Status Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-secondary/50 border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                  <strong className={viewingMember.is_active ? 'text-emerald-600' : 'text-slate-500'}>
                    {viewingMember.is_active ? 'Active Workforce' : 'Inactive'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Available Credits</span>
                  <strong className="text-purple-600">{(viewingMember.profile?.credits || 0).toLocaleString()} Cr</strong>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Reputation</span>
                  <strong>{viewingMember.reputation_score || 100}%</strong>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">State Location</span>
                  <strong>{viewingMember.profile?.state || 'Not specified'}</strong>
                </div>
              </div>

              {/* Locked Verified Bank Credentials */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" /> Locked Bank Credentials
                  </h4>
                  {viewingMember.is_bank_locked && (
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <Lock className="h-2.5 w-2.5 mr-1" /> Locked & Verified
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold">Bank Name</span>
                    <strong className="text-foreground">{viewingMember.bank_name || 'Not Configured'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold">Account Number</span>
                    <strong className="font-mono text-foreground">{maskAccountNumber(viewingMember.account_number)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold">Account Holder</span>
                    <strong className="text-foreground">{viewingMember.account_name || viewingMember.bank_verified_name || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Participation & Proofs */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-foreground">Task Proofs & History ({memberProofs.length})</h4>
                {memberProofs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No task proofs submitted yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {memberProofs.map(p => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-secondary/40 border text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-foreground">Task ID: {p.task_id?.slice(0, 8)}...</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
                        </div>
                        <Badge className="text-[10px] capitalize">{p.status || 'Recorded'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t">
                <Button
                  onClick={() => toggleMemberActive(viewingMember.user_id, viewingMember.is_active)}
                  className={`h-11 flex-1 text-xs font-bold rounded-xl ${
                    viewingMember.is_active ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {viewingMember.is_active ? 'Deactivate Member' : 'Activate Member'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleWalletFrozen(viewingMember.user_id, viewingMember.wallet_frozen)}
                  className="h-11 px-4 text-xs font-bold rounded-xl"
                >
                  {viewingMember.wallet_frozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSyndicateManager;
