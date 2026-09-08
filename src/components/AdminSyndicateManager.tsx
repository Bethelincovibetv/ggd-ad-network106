import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Banknote, 
  BarChart2, 
  Bell, 
  FileText, 
  FileCheck,
  Settings, 
  RefreshCw, 
  Calendar,
  Layers,
  ChevronRight,
  Menu,
  X,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Submodules
import { SyndicateOverview } from "./admin/syndicate/SyndicateOverview";
import { SyndicateCampaigns } from "./admin/syndicate/SyndicateCampaigns";
import { SyndicateMembers } from "./admin/syndicate/SyndicateMembers";
import { SyndicateParticipation } from "./admin/syndicate/SyndicateParticipation";
import { SyndicateProofs } from "./admin/syndicate/SyndicateProofs";
import { SyndicatePayouts } from "./admin/syndicate/SyndicatePayouts";
import { SyndicateVerification } from "./admin/syndicate/SyndicateVerification";
import { SyndicateNotifications } from "./admin/syndicate/SyndicateNotifications";
import { SyndicateAudit } from "./admin/syndicate/SyndicateAudit";
import { SyndicateSettings } from "./admin/syndicate/SyndicateSettings";
import { SyndicatePendingApprovals } from "./admin/syndicate/SyndicatePendingApprovals";

export type SyndicateAdminTab = 
  | 'overview' 
  | 'pending-approvals'
  | 'members' 
  | 'campaigns' 
  | 'participation' 
  | 'proofs' 
  | 'payments' 
  | 'bank-requests'
  | 'notifications' 
  | 'audit' 
  | 'settings'
  | 'payouts'
  | 'verification';

interface AdminSyndicateManagerProps {
  initialCampaignId?: string;
  initialTab?: SyndicateAdminTab;
  onNavigateSection?: (sectionId: string) => void;
}

export const AdminSyndicateManager: React.FC<AdminSyndicateManagerProps> = ({
  initialCampaignId,
  initialTab = 'members',
  onNavigateSection,
}) => {
  const [activeTab, setActiveTab] = useState<SyndicateAdminTab>(initialTab || 'members');
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(initialCampaignId || null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Date Filter (Default: Today)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Data collections
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [bankRequests, setBankRequests] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Settings
  const [payoutPct, setPayoutPct] = useState<number>(70);
  const [exchangeRate, setExchangeRate] = useState<number>(50);

  // Aggregated Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingApps: 0,
    pendingBankChanges: 0,
    activeCampaigns: 0,
    pendingProofs: 0,
    pendingSettlements: 0,
    pendingSettlementAmount: 0,
    totalPayouts: 0,
    successfulPayouts: 0,
    totalParticipating: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Settings
      const [pctRes, rateRes] = await Promise.all([
        supabase.from('app_settings').select('value').eq('key', 'syndicate_payout_percentage').maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
      ]);

      const curPct = parseInt(pctRes.data?.value || "70", 10) || 70;
      const curRate = parseInt(rateRes.data?.value || "50", 10) || 50;
      setPayoutPct(curPct);
      setExchangeRate(curRate);

      // 2. Fetch Syndicate Tasks (Campaigns)
      const { data: tasksData, error: tasksErr } = await supabase
        .from('syndicate_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksErr) console.warn("Failed to fetch tasks:", tasksErr);
      const allTasks = tasksData || [];
      setCampaigns(allTasks);

      // 3. Fetch Syndicate Members safely (immune to PostgREST relationship naming issues)
      const [spRes, rolesRes, appRes, profRes] = await Promise.all([
        supabase.from('syndicate_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role').eq('role', 'syndicate'),
        supabase.from('syndicate_applications').select('user_id, status, state').eq('status', 'approved'),
        supabase.from('profiles').select('user_id, display_name, email, whatsapp_number, avatar_url, credits, business_name').limit(0),
      ]);

      const spList = spRes.data || [];
      const roleUserIds = (rolesRes.data || []).map(r => r.user_id);
      const appUserIds = (appRes.data || []).map(a => a.user_id);
      const activeProfUserIds = (profRes.data || []).map(p => p.user_id);

      const allUserIds = [...new Set([
        ...spList.map(s => s.user_id), 
        ...roleUserIds,
        ...appUserIds,
        ...activeProfUserIds
      ])].filter(Boolean);

      let profilesMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, whatsapp_number, avatar_url, credits, business_name')
          .in('user_id', allUserIds);
        (profs || []).forEach(p => { profilesMap[p.user_id] = p; });
      }

      const existingUserIds = new Set(spList.map(s => s.user_id));
      const enrichedMembers: any[] = spList.map(m => {
        const p = profilesMap[m.user_id] || {};
        const isActive = !m.is_suspended;
        return {
          ...m,
          is_active: isActive,
          is_bank_locked: Boolean(m.bank_name && m.account_number),
          user_profile: p,
          display_name: p.display_name || p.business_name || m.account_name || 'Syndicate Member',
          email: p.email || '—',
          phone: (p as any).whatsapp_number || null,
          avatar_url: p.avatar_url || null,
        };
      });

      // Include syndicate role or approved members who haven't initialized their profile table record
      allUserIds.forEach(uid => {
        if (!existingUserIds.has(uid)) {
          const p = profilesMap[uid] || {};
          enrichedMembers.push({
            user_id: uid,
            is_active: true,
            is_suspended: false,
            wallet_frozen: false,
            is_bank_locked: false,
            tasks_completed: 0,
            ranking_score: 0,
            state: p.state || 'National',
            verified_platforms: [],
            account_name: null,
            account_number: null,
            bank_name: null,
            user_profile: p,
            display_name: p.display_name || p.business_name || 'Syndicate Member',
            email: p.email || '—',
            phone: (p as any).whatsapp_number || null,
            avatar_url: p.avatar_url || null,
          });
        }
      });

      setMembers(enrichedMembers);

      // 4. Fetch Assignments / Proofs safely
      const { data: assignData, error: assignErr } = await supabase
        .from('syndicate_task_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignErr) console.warn("Failed to fetch assignments:", assignErr);
      const allAssignsRaw = assignData || [];
      const taskMap: Record<string, any> = {};
      allTasks.forEach(t => { taskMap[t.id] = t; });

      const assignUserIds = allAssignsRaw.map(a => a.syndicate_user_id).filter(Boolean);
      let assignProfMap: Record<string, any> = {};
      if (assignUserIds.length > 0) {
        const { data: aProfs } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', assignUserIds);
        (aProfs || []).forEach(p => { assignProfMap[p.user_id] = p; });
      }

      const allAssignments = allAssignsRaw.map(a => ({
        ...a,
        syndicate_tasks: taskMap[a.task_id] || null,
        profiles: assignProfMap[a.syndicate_user_id] || { display_name: 'Syndicate Member', email: '—' },
      }));
      setAssignments(allAssignments);

      // 5. Fetch Payouts / Withdrawals safely
      const { data: payData, error: payErr } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (payErr) console.warn("Failed to fetch payouts:", payErr);
      const allPayRaw = payData || [];
      const payUserIds = allPayRaw.map(p => p.user_id).filter(Boolean);
      let payProfMap: Record<string, any> = {};
      if (payUserIds.length > 0) {
        const { data: pProfs } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', payUserIds);
        (pProfs || []).forEach(p => { payProfMap[p.user_id] = p; });
      }

      const allPayouts = allPayRaw.map(p => ({
        ...p,
        profiles: payProfMap[p.user_id] || { display_name: p.account_name || 'Member', email: '—' },
      }));
      setPayouts(allPayouts);

      // 6. Fetch Bank Requests & Applications safely
      let bankData: any[] = [];
      const { data: sBankData, error: sBankErr } = await supabase
        .from('syndicate_bank_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sBankErr && sBankData && sBankData.length > 0) {
        bankData = sBankData;
      } else {
        const { data: bData } = await supabase
          .from('syndicate_bank_change_requests')
          .select('*')
          .order('created_at', { ascending: false });
        bankData = bData || [];
      }

      const bankUserIds = bankData.map(b => b.user_id).filter(Boolean);
      let bankProfMap: Record<string, any> = {};
      if (bankUserIds.length > 0) {
        const { data: bProfs } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', bankUserIds);
        (bProfs || []).forEach(p => { bankProfMap[p.user_id] = p; });
      }
      const enrichedBankRequests = bankData.map(b => ({
        ...b,
        profiles: bankProfMap[b.user_id] || { display_name: b.account_name || 'Member', email: '—' },
      }));
      setBankRequests(enrichedBankRequests);

      // Fetch syndicate applications
      const { data: appData } = await supabase
        .from('syndicate_applications')
        .select('*')
        .order('created_at', { ascending: false });

      const appRaw = appData || [];
      const applicantUserIds = appRaw.map(a => a.user_id).filter(Boolean);
      let appProfMap: Record<string, any> = {};
      if (applicantUserIds.length > 0) {
        const { data: aProfs } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, whatsapp_number')
          .in('user_id', applicantUserIds);
        (aProfs || []).forEach(p => { appProfMap[p.user_id] = p; });
      }
      const enrichedApplications = appRaw.map(a => ({
        ...a,
        profiles: appProfMap[a.user_id] || { display_name: 'Applicant', email: '—', phone: null },
      }));
      setApplications(enrichedApplications);

      // 7. Calculate Stats
      const activeMemCount = enrichedMembers.filter(m => m.is_active && !m.is_suspended).length;
      const pendingBankCount = enrichedBankRequests.filter(b => b.status === 'pending').length;
      const pendingAppCount = enrichedApplications.filter(a => a.status === 'pending').length;
      
      const dateFilteredTasks = allTasks.filter(t => t.status === 'active');
      const pendingProofsCount = allAssignments.filter(a => a.status === 'submitted' || a.status === 'pending').length;
      
      const completedPayouts = allPayouts.filter(p => p.status === 'completed' || p.status === 'paid' || p.status === 'success');
      const pendingPayouts = allPayouts.filter(p => p.status === 'pending' || p.status === 'processing');
      const totalDisbursed = completedPayouts.reduce((acc, p) => acc + Number((p as any).amount_naira || p.amount || 0), 0);
      const pendingAmount = pendingPayouts.reduce((acc, p) => acc + Number((p as any).amount_naira || p.amount || 0), 0);

      const dateTaskIds = new Set(dateFilteredTasks.map(t => t.id));
      const dateParticipating = new Set(allAssignments.filter(a => dateTaskIds.has(a.task_id)).map(a => a.syndicate_user_id)).size;

      setStats({
        totalMembers: enrichedMembers.length,
        activeMembers: activeMemCount,
        pendingApps: pendingAppCount,
        pendingBankChanges: pendingBankCount,
        activeCampaigns: dateFilteredTasks.length,
        pendingProofs: pendingProofsCount,
        pendingSettlements: pendingPayouts.length,
        pendingSettlementAmount: pendingAmount,
        totalPayouts: totalDisbursed,
        successfulPayouts: completedPayouts.length,
        totalParticipating: dateParticipating,
      });

      // 8. Build Recent Activity
      const activities: any[] = [];
      completedPayouts.slice(0, 3).forEach(p => {
        activities.push({
          type: 'settlement',
          title: `Settlement Disbursed: ₦${Number((p as any).amount_naira || p.amount || 0).toLocaleString()}`,
          subtitle: `To ${p.account_name || 'Member'} (${p.bank_name || 'Bank'})`,
          time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      });
      allAssignments.slice(0, 3).forEach(a => {
        activities.push({
          type: 'proof',
          title: `Proof Submitted: "${a.syndicate_tasks?.title || 'Campaign'}"`,
          subtitle: `By ${a.profiles?.display_name || 'Member'}`,
          time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      });
      setRecentActivity(activities);

    } catch (err: any) {
      console.error("Error loading syndicate admin data:", err);
      toast.error("Failed to load syndicate operations data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPendingApprovals = (stats.pendingProofs || 0) + (stats.pendingBankChanges || 0) + (stats.pendingApps || 0);

  // Streamlined primary tabs for seamless syndicate navigation
  const navItems = [
    { 
      id: 'members', 
      label: 'Syndicate Members', 
      shortLabel: 'Members',
      icon: Users, 
      badge: `${stats.activeMembers}/${stats.totalMembers}` 
    },
    { 
      id: 'campaigns', 
      label: 'Campaigns & Tasks', 
      shortLabel: 'Campaigns',
      icon: Briefcase, 
      badge: stats.activeCampaigns ? `${stats.activeCampaigns}` : null 
    },
    { 
      id: 'pending-approvals', 
      label: 'Pending Approvals', 
      shortLabel: 'Approvals',
      icon: Clock, 
      badge: totalPendingApprovals ? `${totalPendingApprovals}` : null,
      badgeColor: 'bg-amber-600'
    },
    { 
      id: 'proofs', 
      label: 'Proofs & Reviews', 
      shortLabel: 'Proofs',
      icon: FileCheck, 
      badge: stats.pendingProofs ? `${stats.pendingProofs}` : null, 
      badgeColor: 'bg-amber-600' 
    },
    { 
      id: 'payments', 
      label: 'Payouts & Settlements', 
      shortLabel: 'Payouts',
      icon: Banknote, 
      badge: stats.pendingSettlements ? `${stats.pendingSettlements}` : null, 
      badgeColor: 'bg-emerald-600' 
    },
    { 
      id: 'bank-requests', 
      label: 'Bank Verification', 
      shortLabel: 'Bank KYC',
      icon: ShieldCheck, 
      badge: (stats.pendingBankChanges + stats.pendingApps) ? `${stats.pendingBankChanges + stats.pendingApps}` : null, 
      badgeColor: 'bg-indigo-600' 
    },
    { 
      id: 'overview', 
      label: 'Executive Overview', 
      shortLabel: 'Overview',
      icon: Layers, 
      badge: null 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      shortLabel: 'Settings',
      icon: Settings, 
      badge: null 
    },
  ];

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Top Universal Control & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs flex-shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">Syndicate Management</h2>
              <Badge variant="outline" className="text-[11px] font-semibold flex-shrink-0">
                Payout Split: <span className="font-mono text-purple-600 ml-1">{payoutPct}%</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Manage syndicate members, campaigns, proof approvals, and settlements.
            </p>
          </div>
        </div>

        {/* Global Date Filter & Sync Actions */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-muted/80 px-2.5 py-1.5 rounded-xl border border-border text-xs">
            <Calendar className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
            <span className="font-bold text-foreground">Date:</span>
            <input
              type="date"
              aria-label="Filter execution date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="h-8 px-2.5 rounded-xl text-xs font-bold border-border"
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 px-3 rounded-xl border-border text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-purple-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Modern Top Horizontal Tab Navigation Bar (Mobile-friendly, no overflow or padding break) */}
      <div className="border border-border bg-card rounded-2xl p-1.5 w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth snap-x">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isTabActive = 
              activeTab === item.id || 
              (item.id === 'payments' && activeTab === 'payouts') ||
              (item.id === 'bank-requests' && activeTab === 'verification');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SyndicateAdminTab)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 snap-start ${
                  isTabActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className={`h-4 w-4 ${isTabActive ? 'text-white' : 'text-purple-600'}`} />
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel || item.label}</span>

                {item.badge && (
                  <Badge className={`text-[9px] font-bold px-1.5 py-0 ${
                    isTabActive 
                      ? 'bg-white/20 text-white border-0' 
                      : item.badgeColor ? `${item.badgeColor} text-white` : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Module Content Area */}
      <div className="w-full min-w-0">
        {activeTab === 'overview' && (
          <SyndicateOverview
            stats={stats}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onNavigateTab={(tab) => {
              if (tab === 'verification') setActiveTab('bank-requests');
              else if (tab === 'payouts') setActiveTab('payments');
              else setActiveTab(tab as SyndicateAdminTab);
            }}
            onRefresh={fetchData}
            recentActivity={recentActivity}
            payoutPct={payoutPct}
          />
        )}

        {activeTab === 'pending-approvals' && (
          <SyndicatePendingApprovals
            assignments={assignments}
            bankRequests={bankRequests}
            applications={applications}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'campaigns' && (
          <SyndicateCampaigns
            campaigns={campaigns}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onRefresh={fetchData}
            payoutPct={payoutPct}
            allMembers={members}
          />
        )}

        {activeTab === 'members' && (
          <SyndicateMembers
            members={members}
            onRefresh={fetchData}
            exchangeRate={exchangeRate}
          />
        )}

        {activeTab === 'participation' && (
          <SyndicateParticipation
            campaigns={campaigns}
            allMembers={members}
            assignments={assignments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'proofs' && (
          <SyndicateProofs
            assignments={assignments}
            campaigns={campaigns}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onRefresh={fetchData}
          />
        )}

        {(activeTab === 'payments' || activeTab === 'payouts') && (
          <SyndicatePayouts
            payouts={payouts}
            onRefresh={fetchData}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            payoutPct={payoutPct}
          />
        )}

        {(activeTab === 'bank-requests' || activeTab === 'verification') && (
          <SyndicateVerification
            bankRequests={bankRequests}
            applications={applications}
            onRefresh={fetchData}
            defaultTab="bank"
          />
        )}

        {activeTab === 'notifications' && (
          <SyndicateNotifications
            allMembers={members}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'audit' && (
          <SyndicateAudit
            assignments={assignments}
            campaigns={campaigns}
            payouts={payouts}
            bankRequests={bankRequests}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'settings' && (
          <SyndicateSettings
            currentPayoutPct={payoutPct}
            currentExchangeRate={exchangeRate}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
};

export default AdminSyndicateManager;
