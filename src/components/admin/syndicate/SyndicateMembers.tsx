import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Filter, 
  MapPin, 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Phone, 
  Mail, 
  Download, 
  Eye, 
  X, 
  Loader2, 
  DollarSign, 
  FileText,
  UserCheck,
  UserX,
  CreditCard,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

interface SyndicateMembersProps {
  members: any[];
  onRefresh: () => void;
  exchangeRate: number;
}

export const SyndicateMembers: React.FC<SyndicateMembersProps> = ({
  members,
  onRefresh,
  exchangeRate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended' | 'frozen' | 'verified_bank' | 'missing_bank'>('all');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Member Profile Drawer State
  const [viewingMember, setViewingMember] = useState<any | null>(null);
  const [memberProofs, setMemberProofs] = useState<any[]>([]);
  const [memberPayouts, setMemberPayouts] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const openMemberProfile = async (member: any) => {
    setViewingMember(member);
    setLoadingDetails(true);
    try {
      const [proofsRes, payoutsRes] = await Promise.all([
        supabase
          .from('syndicate_task_assignments')
          .select('*, syndicate_tasks(title, campaign_date)')
          .eq('syndicate_user_id', member.user_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', member.user_id)
          .order('created_at', { ascending: false }),
      ]);

      setMemberProofs(proofsRes.data || []);
      setMemberPayouts(payoutsRes.data || []);
    } catch (err: any) {
      toast.error("Failed to load member profile details: " + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleActive = async (member: any) => {
    setActionLoading(true);
    try {
      const nextActive = !member.is_active;
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ is_active: nextActive })
        .eq('user_id', member.user_id);

      if (error) throw error;
      toast.success(`Member ${nextActive ? 'activated' : 'deactivated'}!`);
      if (viewingMember && viewingMember.user_id === member.user_id) {
        setViewingMember({ ...viewingMember, is_active: nextActive });
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspend = async (member: any) => {
    setActionLoading(true);
    try {
      const nextSuspended = !member.is_suspended;
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ 
          is_suspended: nextSuspended,
          suspended_reason: nextSuspended ? 'Suspended by admin review' : null,
          suspended_at: nextSuspended ? new Date().toISOString() : null,
        })
        .eq('user_id', member.user_id);

      if (error) throw error;
      toast.success(`Member ${nextSuspended ? 'suspended' : 'unsuspended'}!`);
      if (viewingMember && viewingMember.user_id === member.user_id) {
        setViewingMember({ ...viewingMember, is_suspended: nextSuspended });
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFreezeWallet = async (member: any) => {
    setActionLoading(true);
    try {
      const nextFrozen = !member.wallet_frozen;
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ wallet_frozen: nextFrozen })
        .eq('user_id', member.user_id);

      if (error) throw error;
      toast.success(`Wallet ${nextFrozen ? 'frozen' : 'unfrozen'}!`);
      if (viewingMember && viewingMember.user_id === member.user_id) {
        setViewingMember({ ...viewingMember, wallet_frozen: nextFrozen });
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Operations
  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ is_active: true })
        .in('user_id', selectedIds);
      if (error) throw error;
      toast.success(`Activated ${selectedIds.length} members!`);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      toast.error("Bulk activation failed: " + err.message);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('syndicate_profiles')
        .update({ is_active: false })
        .in('user_id', selectedIds);
      if (error) throw error;
      toast.success(`Deactivated ${selectedIds.length} members!`);
      setSelectedIds([]);
      onRefresh();
    } catch (err: any) {
      toast.error("Bulk deactivation failed: " + err.message);
    }
  };

  const exportMembersCSV = () => {
    const rows = filteredMembers.map(m => ({
      Name: m.display_name || m.user_profile?.display_name || 'Member',
      Email: m.email || m.user_profile?.email || '',
      Phone: m.phone || m.user_profile?.phone || '',
      State: m.state || '',
      BankName: m.bank_name || '',
      AccountNumber: m.account_number || '',
      AccountName: m.account_name || '',
      Status: m.is_suspended ? 'Suspended' : m.is_active ? 'Active' : 'Inactive',
      TasksCompleted: m.tasks_completed || 0,
      Score: m.ranking_score || 0,
    }));

    const headers = Object.keys(rows[0] || {}).join(',');
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `syndicate_team_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported members to CSV!");
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    if (stateFilter !== 'ALL' && m.state !== stateFilter) return false;
    if (statusFilter === 'active' && (!m.is_active || m.is_suspended)) return false;
    if (statusFilter === 'inactive' && (m.is_active || m.is_suspended)) return false;
    if (statusFilter === 'suspended' && !m.is_suspended) return false;
    if (statusFilter === 'frozen' && !m.wallet_frozen) return false;
    if (statusFilter === 'verified_bank' && (!m.account_number || !m.is_bank_locked)) return false;
    if (statusFilter === 'missing_bank' && m.account_number) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (m.display_name || m.user_profile?.display_name || '').toLowerCase();
      const email = (m.email || m.user_profile?.email || '').toLowerCase();
      const phone = (m.phone || m.user_profile?.phone || '').toLowerCase();
      const state = (m.state || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !state.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search member name, email, phone, state..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter State"
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="h-11 text-xs font-semibold rounded-xl border border-input bg-card px-3 focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">All States (36 + FCT)</option>
            {NIGERIAN_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            aria-label="Filter Status"
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="h-11 text-xs font-semibold rounded-xl border border-input bg-card px-3 focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Member Statuses</option>
            <option value="active">Active Members Only</option>
            <option value="inactive">Inactive Members Only</option>
            <option value="suspended">Suspended Members</option>
            <option value="frozen">Frozen Wallets</option>
            <option value="verified_bank">Bank Locked & Verified</option>
            <option value="missing_bank">Missing Bank Details</option>
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={exportMembersCSV}
            className="h-11 px-4 text-xs font-bold rounded-xl border-border flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-purple-600" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Bulk Actions Floating Bar if selected */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-purple-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle className="h-4 w-4 text-yellow-300" />
            <span>{selectedIds.length} Members Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkActivate}
              className="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Activate Selected
            </Button>
            <Button
              size="sm"
              onClick={handleBulkDeactivate}
              className="h-8 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white"
            >
              Deactivate Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="h-8 text-xs text-white hover:bg-white/10"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Full-Width Large Members Table */}
      <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all members"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredMembers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredMembers.map(m => m.user_id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-input text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Direct Team Operator</th>
                <th className="py-3.5 px-4">State</th>
                <th className="py-3.5 px-4">Channels</th>
                <th className="py-3.5 px-4">Verified Bank (Paystack)</th>
                <th className="py-3.5 px-4">Jobs Done</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMembers.map((member) => {
                const isSelected = selectedIds.includes(member.user_id);
                const displayName = member.display_name || member.user_profile?.display_name || 'Syndicate Operator';
                const email = member.email || member.user_profile?.email || '—';
                const avatar = member.avatar_url || member.user_profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;

                return (
                  <tr key={member.user_id} className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''}`}>
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${displayName}`}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, member.user_id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== member.user_id));
                          }
                        }}
                        className="rounded border-input text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={avatar} 
                          alt={displayName} 
                          className="h-9 w-9 rounded-xl object-cover border border-border flex-shrink-0"
                          onError={(e: any) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;
                          }}
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-foreground text-sm truncate">{displayName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-xs font-semibold">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {member.state || 'Unset'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(member.verified_platforms || []).map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-semibold">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {member.bank_name ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground text-xs">{member.bank_name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">{maskAccountNumber(member.account_number)}</p>
                          {member.is_bank_locked && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0 border-0">
                              <Lock className="h-2.5 w-2.5 mr-0.5" /> Locked
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
                          Unconfigured
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {member.tasks_completed || 0}
                    </td>

                    <td className="py-3.5 px-4">
                      {member.is_suspended ? (
                        <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-0 text-[10px] font-bold">
                          Suspended
                        </Badge>
                      ) : member.is_active ? (
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/20 text-slate-700 dark:text-slate-300 border-0 text-[10px] font-bold">
                          Inactive
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMemberProfile(member)}
                        className="h-8 text-xs font-bold rounded-lg border-border"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Profile
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredMembers.length === 0 && (
            <div className="text-center py-16 px-4 space-y-2">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No members found</p>
              <p className="text-xs text-muted-foreground">Try clearing your search query or state filters.</p>
            </div>
          )}
        </div>
      </Card>

      {/* MEMBER PROFILE & AUDIT DRAWER */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl bg-background border border-border shadow-2xl rounded-3xl overflow-hidden my-6">
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={viewingMember.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${viewingMember.user_id}`}
                  alt="Avatar"
                  className="h-14 w-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                />
                <div>
                  <h3 className="font-black text-lg">
                    {viewingMember.display_name || viewingMember.user_profile?.display_name || 'Syndicate Operator'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {viewingMember.email || viewingMember.user_profile?.email} • {viewingMember.state || 'Unset'} Station
                  </p>
                </div>
              </div>

              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setViewingMember(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Administrative Status Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-muted/40 border border-border">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Account Administrative Actions</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Control active status, wallet freezes, or operator suspensions</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={viewingMember.is_active ? 'destructive' : 'default'}
                    onClick={() => handleToggleActive(viewingMember)}
                    disabled={actionLoading}
                    className="h-9 text-xs font-bold rounded-xl"
                  >
                    {viewingMember.is_active ? 'Deactivate Operator' : 'Activate Operator'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleSuspend(viewingMember)}
                    disabled={actionLoading}
                    className="h-9 text-xs font-bold rounded-xl border-border"
                  >
                    {viewingMember.is_suspended ? 'Unsuspend' : 'Suspend Member'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleFreezeWallet(viewingMember)}
                    disabled={actionLoading}
                    className="h-9 text-xs font-bold rounded-xl border-border"
                  >
                    {viewingMember.wallet_frozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                  </Button>
                </div>
              </div>

              {/* Verified Bank Details Card */}
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" /> Official Payout Bank Details
                  </span>
                  {viewingMember.is_bank_locked && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                      <Lock className="h-2.5 w-2.5 mr-1" /> Locked & Paystack Verified
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Bank Name</span>
                    <p className="font-bold text-foreground mt-0.5">{viewingMember.bank_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Account Number</span>
                    <p className="font-mono font-bold text-foreground mt-0.5">{maskAccountNumber(viewingMember.account_number)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Verified Account Name</span>
                    <p className="font-bold text-foreground mt-0.5">{viewingMember.account_name || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Proofs & Participation History */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
                  <span>Recent Broadcast Proofs ({memberProofs.length})</span>
                </h4>

                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : memberProofs.length > 0 ? (
                  <div className="space-y-2">
                    {memberProofs.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
                        <div>
                          <p className="font-bold text-foreground">{p.syndicate_tasks?.title || 'Direct Campaign'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Date: {p.syndicate_tasks?.campaign_date || p.created_at?.split('T')[0]} • Status: {p.status?.toUpperCase()}
                          </p>
                        </div>
                        {p.proof_url && (
                          <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold hover:underline">
                            View Proof
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No proofs submitted yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
