import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  ShieldCheck, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Wallet, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  ArrowRight,
  Send,
  Zap,
  RefreshCw,
  Layers,
  Banknote,
  DollarSign
} from "lucide-react";

interface SyndicateOverviewProps {
  stats: any;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNavigateTab: (tab: string) => void;
  onRefresh: () => void;
  recentActivity: any[];
  payoutPct: number;
}

export const SyndicateOverview: React.FC<SyndicateOverviewProps> = ({
  stats,
  selectedDate,
  onSelectDate,
  onNavigateTab,
  onRefresh,
  recentActivity,
  payoutPct,
}) => {
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/40 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Direct Team Command Hub
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold">
                {payoutPct}% Payout Pool
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Syndicate Direct Operations</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time central command for campaigns, verified team members, proof audits, deterministic settlement calculations, and Paystack disbursements.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              onClick={() => onNavigateTab('campaigns')}
              className="h-11 px-5 rounded-xl font-bold bg-white text-purple-900 hover:bg-slate-100 shadow-md flex items-center gap-2 text-xs"
            >
              <Briefcase className="h-4 w-4" /> Manage Campaigns
            </Button>
            <Button
              type="button"
              onClick={() => onNavigateTab('payouts')}
              className="h-11 px-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 text-xs"
            >
              <Banknote className="h-4 w-4" /> Settle Payouts
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="h-11 w-11 rounded-xl border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-bold text-foreground">Active Filter Date:</span>
          <Badge variant="outline" className="text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
            {selectedDate} {isToday && '(Today)'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={isToday ? 'default' : 'outline'}
            onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
            className={`h-8 text-xs font-bold rounded-lg ${isToday ? 'bg-purple-600 text-white' : ''}`}
          >
            Today
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const y = new Date();
              y.setDate(y.getDate() - 1);
              onSelectDate(y.toISOString().split('T')[0]);
            }}
            className="h-8 text-xs font-bold rounded-lg"
          >
            Yesterday
          </Button>

          <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg border border-border">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Members */}
        <Card 
          className="border border-border/80 shadow-xs hover:border-purple-400 transition-all cursor-pointer bg-card rounded-2xl"
          onClick={() => onNavigateTab('members')}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Members</span>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.totalMembers}</div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="text-emerald-600 font-bold">{stats.activeMembers} Active</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">{stats.pendingApps} Pending</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card 
          className="border border-border/80 shadow-xs hover:border-blue-400 transition-all cursor-pointer bg-card rounded-2xl"
          onClick={() => onNavigateTab('campaigns')}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Campaigns ({selectedDate})</span>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.activeCampaigns}</div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="text-blue-600 font-bold">{stats.totalParticipating || 0} Participating</span>
            </div>
          </CardContent>
        </Card>

        {/* Proofs Awaiting Audit */}
        <Card 
          className="border border-border/80 shadow-xs hover:border-amber-400 transition-all cursor-pointer bg-card rounded-2xl"
          onClick={() => onNavigateTab('proofs')}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Proofs</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.pendingProofs}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-bold">
              <span>Ready for Review</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Bank Verifications Pending */}
        <Card 
          className="border border-border/80 shadow-xs hover:border-indigo-400 transition-all cursor-pointer bg-card rounded-2xl"
          onClick={() => onNavigateTab('verification')}
        >
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Bank Requests</span>
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">{stats.pendingBankChanges}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-bold">
              <span>{stats.pendingApps} KYC Apps</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Settlement Pools Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-1">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs font-bold">
            <span>TOTAL SETTLED PAYOUTS</span>
            <CheckCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100">
            ₦{(stats.totalPayouts || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {stats.successfulPayouts || 0} Successful Paystack Transfers
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-1">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-bold">
            <span>PENDING SETTLEMENT POOL</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-100">
            ₦{(stats.pendingSettlementAmount || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {stats.pendingSettlements || 0} Members Pending Settle
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-300 dark:border-purple-800 space-y-1">
          <div className="flex items-center justify-between text-purple-800 dark:text-purple-300 text-xs font-bold">
            <span>DIRECT SETTLEMENT MODEL</span>
            <Zap className="h-4 w-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900 dark:text-purple-100">
            {payoutPct}% Split
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-400">
            Deterministic pool calculation active
          </p>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" /> Recent Syndicate Operations Feed
          </h3>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigateTab('audit')} 
            className="text-xs text-purple-600 font-bold hover:bg-purple-50"
          >
            View Full Audit Log <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="space-y-2.5">
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map((act, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                    {act.type === 'settlement' ? '₦' : act.type === 'proof' ? '📷' : '⚡'}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{act.title}</p>
                    <p className="text-[11px] text-muted-foreground">{act.subtitle}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{act.time}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No recent activity recorded for {selectedDate}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
