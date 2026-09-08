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

export type SyndicateAdminTab = 
  | 'overview' 
  | 'campaigns' 
  | 'members' 
  | 'participation' 
  | 'proofs' 
  | 'payouts' 
  | 'verification' 
  | 'notifications' 
  | 'audit' 
  | 'settings';

interface AdminSyndicateManagerProps {
  initialCampaignId?: string;
  initialTab?: SyndicateAdminTab;
  onNavigateSection?: (sectionId: string) => void;
}

export const AdminSyndicateManager: React.FC<AdminSyndicateManagerProps> = ({
  initialCampaignId,
  initialTab = 'overview',
  onNavigateSection,
}) => {
  const [activeTab, setActiveTab] = useState<SyndicateAdminTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(initialCampaignId || null);

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

      // 2. Fetch Syndicate Tasks (with campaign_date support)
      const { data: tasksData, error: tasksErr } = await supabase
        .from('syndicate_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksErr) console.warn("Failed to fetch tasks:", tasksErr);
      const allTasks = tasksData || [];
      setCampaigns(allTasks);

      // 3. Fetch Members
      const { data: membersData, error: memErr } = await supabase
        .from('syndicate_profiles')
        .select('*, user_profile:profiles!syndicate_profiles_user_id_fkey(display_name, email, phone, avatar_url, credits)')
        .order('created_at', { ascending: false });

      if (memErr) console.warn("Failed to fetch members:", memErr);
      const allMembers = membersData || [];
      setMembers(allMembers);

      // 4. Fetch Assignments / Proofs
      const { data: assignData, error: assignErr } = await supabase
        .from('syndicate_task_assignments')
        .select('*, syndicate_tasks(title, campaign_date, payout_amount, total_cost, cost_per_syndicate), profiles:syndicate_user_id(display_name, email)')
        .order('created_at', { ascending: false });

      if (assignErr) console.warn("Failed to fetch assignments:", assignErr);
      const allAssignments = assignData || [];
      setAssignments(allAssignments);

      // 5. Fetch Payouts / Withdrawals
      const { data: payData, error: payErr } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles:user_id(display_name, email)')
        .order('created_at', { ascending: false });

      if (payErr) console.warn("Failed to fetch payouts:", payErr);
      const allPayouts = payData || [];
      setPayouts(allPayouts);

      // 6. Fetch Bank Requests & Applications
      const [bankRes, appRes] = await Promise.all([
        supabase
          .from('bank_change_requests')
          .select('*, profiles:user_id(display_name, email)')
          .order('created_at', { ascending: false }),
        supabase
          .from('syndicate_applications')
          .select('*, profiles:user_id(display_name, email, phone)')
          .order('created_at', { ascending: false }),
      ]);

      setBankRequests(bankRes.data || []);
      setApplications(appRes.data || []);

      // 7. Calculate Stats
      const activeMemCount = allMembers.filter(m => m.is_active && !m.is_suspended).length;
      const pendingBankCount = (bankRes.data || []).filter(b => b.status === 'pending').length;
      const pendingAppCount = (appRes.data || []).filter(a => a.status === 'pending').length;
      
      const dateFilteredTasks = allTasks.filter(t => (t.campaign_date || t.created_at?.split('T')[0]) === selectedDate);
      const pendingProofsCount = allAssignments.filter(a => a.status === 'submitted' || a.status === 'pending').length;
      
      const completedPayouts = allPayouts.filter(p => p.status === 'completed' || p.status === 'paid' || p.status === 'success');
      const pendingPayouts = allPayouts.filter(p => p.status === 'pending' || p.status === 'processing');
      const totalDisbursed = completedPayouts.reduce((acc, p) => acc + Number(p.amount_naira || p.amount || 0), 0);
      const pendingAmount = pendingPayouts.reduce((acc, p) => acc + Number(p.amount_naira || p.amount || 0), 0);

      // Distinct participating users for date
      const dateTaskIds = new Set(dateFilteredTasks.map(t => t.id));
      const dateParticipating = new Set(allAssignments.filter(a => dateTaskIds.has(a.task_id)).map(a => a.syndicate_user_id)).size;

      setStats({
        totalMembers: allMembers.length,
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
          title: `Settlement Disbursed: ₦${Number(p.amount_naira || p.amount || 0).toLocaleString()}`,
          subtitle: `To ${p.account_name || 'Member'} (${p.bank_name || 'Bank'})`,
          time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      });
      allAssignments.slice(0, 3).forEach(a => {
        activities.push({
          type: 'proof',
          title: `Proof Submitted: "${a.syndicate_tasks?.title || 'Campaign'}"`,
          subtitle: `By ${a.profiles?.display_name || 'Operator'}`,
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

  // Tab navigation items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Layers, badge: null },
    { id: 'campaigns', label: 'Campaigns', icon: Briefcase, badge: stats.activeCampaigns ? `${stats.activeCampaigns}` : null },
    { id: 'members', label: 'Team Members', icon: Users, badge: `${stats.activeMembers}/${stats.totalMembers}` },
    { id: 'participation', label: 'Participation', icon: BarChart2, badge: null },
    { id: 'proofs', label: 'Proof Audits', icon: Clock, badge: stats.pendingProofs ? `${stats.pendingProofs}` : null, badgeColor: 'bg-amber-600' },
    { id: 'payouts', label: 'Settlements', icon: Banknote, badge: stats.pendingSettlements ? `${stats.pendingSettlements}` : null, badgeColor: 'bg-emerald-600' },
    { id: 'verification', label: 'Bank & KYC', icon: ShieldCheck, badge: (stats.pendingBankChanges + stats.pendingApps) ? `${stats.pendingBankChanges + stats.pendingApps}` : null, badgeColor: 'bg-indigo-600' },
    { id: 'notifications', label: 'Broadcasts', icon: Bell, badge: null },
    { id: 'audit', label: 'Audit Trail', icon: FileText, badge: null },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Top Universal Control & Context Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md flex-shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-foreground">Syndicate Direct Team</h2>
              <Badge className="bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Command Engine
              </Badge>
              <Badge variant="outline" className="text-[11px] font-semibold">
                Payout Split: <span className="font-mono text-purple-600 ml-1">{payoutPct}%</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Coordinated broadcast operations, proof auditing, and deterministic Paystack batch payouts.
            </p>
          </div>
        </div>

        {/* Global Date Filter & Sync Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-muted/80 px-3 py-1.5 rounded-xl border border-border text-xs">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="font-bold text-foreground">Date:</span>
            <input
              type="date"
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
            className="h-9 px-3 rounded-xl text-xs font-bold border-border"
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl border-border text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-purple-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Modern Top Horizontal Tab Navigation Bar */}
      <div className="border-b border-border bg-card/60 rounded-2xl p-1.5 backdrop-blur-xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as SyndicateAdminTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-purple-600'}`} />
                <span>{item.label}</span>

                {item.badge && (
                  <Badge className={`text-[9px] font-bold px-1.5 py-0 ${
                    isActive 
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
            onNavigateTab={(tab) => setActiveTab(tab as SyndicateAdminTab)}
            onRefresh={fetchData}
            recentActivity={recentActivity}
            payoutPct={payoutPct}
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

        {activeTab === 'payouts' && (
          <SyndicatePayouts
            payouts={payouts}
            onRefresh={fetchData}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            payoutPct={payoutPct}
          />
        )}

        {activeTab === 'verification' && (
          <SyndicateVerification
            bankRequests={bankRequests}
            applications={applications}
            onRefresh={fetchData}
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
