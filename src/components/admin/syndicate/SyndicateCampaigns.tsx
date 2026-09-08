import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Download, 
  Zap, 
  Loader2, 
  Eye, 
  X, 
  Trash2, 
  Play, 
  Pause,
  Banknote,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";
import { createSyndicateTask, settleSyndicateCampaign, calculateCampaignSettlementPreview } from "@/services/syndicateTaskService";

interface SyndicateCampaignsProps {
  campaigns: any[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRefresh: () => void;
  payoutPct: number;
  allMembers: any[];
}

export const SyndicateCampaigns: React.FC<SyndicateCampaignsProps> = ({
  campaigns,
  selectedDate,
  onSelectDate,
  onRefresh,
  payoutPct,
  allMembers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFlyerUrl, setNewFlyerUrl] = useState('');
  const [newSmartLink, setNewSmartLink] = useState('');
  const [newTargetState, setNewTargetState] = useState('');
  const [newPlacements, setNewPlacements] = useState<string[]>(['whatsapp', 'telegram', 'tiktok']);
  const [newMaxSlots, setNewMaxSlots] = useState('50');
  const [newCostPerSyndicate, setNewCostPerSyndicate] = useState('100');
  const [newCampaignDate, setNewCampaignDate] = useState(selectedDate);

  // Detail Drawer State
  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);
  const [campaignAssignments, setCampaignAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleMode, setSettleMode] = useState<'paystack' | 'manual'>('paystack');

  const openCampaignDetails = async (campaign: any) => {
    setViewingCampaign(campaign);
    setLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('syndicate_task_assignments')
        .select('*, profiles:syndicate_user_id(display_name, email), syndicate_profiles:syndicate_user_id(*)')
        .eq('task_id', campaign.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaignAssignments(data || []);
    } catch (err: any) {
      toast.error("Failed to load campaign participants: " + err.message);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter campaign title");
      return;
    }
    if (newPlacements.length === 0) {
      toast.error("Select at least one placement channel");
      return;
    }

    setCreating(true);
    try {
      const res = await createSyndicateTask({
        title: newTitle.trim(),
        description: newDescription.trim(),
        flyer_url: newFlyerUrl.trim() || null,
        share_link: newSmartLink.trim() || null,
        target_state: newTargetState || null,
        placements: newPlacements,
        max_syndicates: parseInt(newMaxSlots) || 50,
        campaign_date: newCampaignDate || selectedDate,
        approval_mode: 'manual',
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to create campaign");
      }

      toast.success("🎉 Campaign created and activated for Syndicate direct team!");
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewFlyerUrl('');
      setNewSmartLink('');
      setNewTargetState('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleSettleCampaign = async (campaignId: string) => {
    setSettling(true);
    try {
      const res = await settleSyndicateCampaign({
        taskId: campaignId,
        mode: settleMode,
        notes: `Admin settlement executed on ${new Date().toISOString()}`,
      });

      if (!res.success) {
        throw new Error(res.error || "Settlement failed");
      }

      toast.success(res.message || "Campaign settled successfully!");
      if (viewingCampaign) {
        openCampaignDetails(viewingCampaign);
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to settle campaign");
    } finally {
      setSettling(false);
    }
  };

  const toggleCampaignStatus = async (campaign: any) => {
    try {
      const nextStatus = campaign.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase
        .from('syndicate_tasks')
        .update({ status: nextStatus })
        .eq('id', campaign.id);

      if (error) throw error;
      toast.success(`Campaign ${nextStatus === 'active' ? 'activated' : 'paused'}!`);
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (stateFilter !== 'ALL' && c.target_state !== stateFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchDesc = (c.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Action Header & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-foreground">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
            className="h-9 text-xs font-bold rounded-xl"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-11 px-5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-2 text-xs"
          >
            <Plus className="h-4 w-4" /> Create New Campaign
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns by title or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-xs rounded-xl bg-card"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter State"
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="h-11 text-xs font-semibold rounded-xl border border-input bg-card px-3 focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">All States / Nationwide</option>
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
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Full-Width Large Campaigns Table */}
      <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Campaign Info</th>
                <th className="py-3.5 px-4">Target Location</th>
                <th className="py-3.5 px-4">Execution Date</th>
                <th className="py-3.5 px-4">Cost / Pool</th>
                <th className="py-3.5 px-4">Calculated Payout</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCampaigns.map((camp) => {
                const settlementBase = Number(camp.total_cost || ((camp.cost_per_syndicate || 50) * (camp.max_syndicates || 1)));
                const pool = Math.round(settlementBase * (payoutPct / 100));
                const slots = Number(camp.max_syndicates || 1);
                const explicit = Number(camp.payout_amount || 0);
                const payoutPerMember = explicit > 0 ? explicit : Math.max(1, Math.round(pool / slots));

                return (
                  <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {camp.flyer_url ? (
                          <img 
                            src={camp.flyer_url} 
                            alt={camp.title} 
                            className="h-10 w-12 object-cover rounded-lg border border-border flex-shrink-0" 
                          />
                        ) : (
                          <div className="h-10 w-12 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                            <Briefcase className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 max-w-xs sm:max-w-sm">
                          <p className="font-bold text-foreground text-sm truncate">{camp.title}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(camp.placements || []).map((p: string) => (
                              <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-xs font-semibold">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {camp.target_state || 'Nationwide'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                      {camp.campaign_date || camp.created_at?.split('T')[0]}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-foreground">₦{settlementBase.toLocaleString()}</p>
                      <p className="text-[10px] text-purple-600 font-semibold">{payoutPct}% Pool: ₦{pool.toLocaleString()}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge className="bg-emerald-600 text-white font-bold text-xs">
                        ₦{payoutPerMember.toLocaleString()} / member
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge className={`text-[10px] font-bold ${
                        camp.status === 'active' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                        'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}>
                        {camp.status?.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCampaignDetails(camp)}
                          className="h-8 text-xs font-bold rounded-lg border-border"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCampaignStatus(camp)}
                          className="h-8 w-8 p-0 rounded-lg"
                        >
                          {camp.status === 'active' ? <Pause className="h-3.5 w-3.5 text-amber-600" /> : <Play className="h-3.5 w-3.5 text-emerald-600" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-16 px-4 space-y-2">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No campaigns found</p>
              <p className="text-xs text-muted-foreground">Adjust your search or create a new campaign for {selectedDate}.</p>
            </div>
          )}
        </div>
      </Card>

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-background border border-border shadow-2xl rounded-3xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-300" />
                <h3 className="font-bold text-base">Create Syndicate Direct Campaign</h3>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">Campaign Execution Date</Label>
                  <Input
                    type="date"
                    value={newCampaignDate}
                    onChange={e => setNewCampaignDate(e.target.value)}
                    className="mt-1.5 h-11 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Target Location</Label>
                  <select
                    aria-label="Target State"
                    value={newTargetState}
                    onChange={e => setNewTargetState(e.target.value)}
                    className="mt-1.5 w-full h-11 text-xs font-semibold rounded-xl border border-input bg-background px-3"
                  >
                    <option value="">Nationwide (All States)</option>
                    {NIGERIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Campaign Title</Label>
                <Input
                  placeholder="e.g. Lagos Grand Store Opening Promotion"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="mt-1.5 h-11 text-sm font-bold rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Promotional Caption / Description</Label>
                <textarea
                  rows={3}
                  placeholder="Write the exact message operators should broadcast..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="mt-1.5 w-full text-xs rounded-xl border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">Flyer Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newFlyerUrl}
                    onChange={e => setNewFlyerUrl(e.target.value)}
                    className="mt-1.5 h-11 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Smart Target URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newSmartLink}
                    onChange={e => setNewSmartLink(e.target.value)}
                    className="mt-1.5 h-11 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">Maximum Operator Slots</Label>
                  <Input
                    type="number"
                    value={newMaxSlots}
                    onChange={e => setNewMaxSlots(e.target.value)}
                    className="mt-1.5 h-11 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Base Cost per Slot (₦)</Label>
                  <Input
                    type="number"
                    value={newCostPerSyndicate}
                    onChange={e => setNewCostPerSyndicate(e.target.value)}
                    className="mt-1.5 h-11 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Placement Channels Selection */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-2">Allowed Broadcast Channels</Label>
                <div className="flex flex-wrap gap-2">
                  {['whatsapp', 'telegram', 'tiktok', 'instagram', 'twitter', 'facebook'].map(plat => {
                    const isSelected = newPlacements.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewPlacements(prev => prev.filter(p => p !== plat));
                          } else {
                            setNewPlacements(prev => [...prev, plat]);
                          }
                        }}
                        className={`h-9 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          isSelected ? 'bg-purple-600 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>{plat.toUpperCase()}</span>
                        {isSelected && <CheckCircle className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                <p className="font-bold">⚡ Instant Direct Visibility</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Eligible verified active team members in the target location will instantly see this campaign upon creation without needing to claim tasks.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="h-11 text-xs font-bold rounded-xl">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={creating}
                  className="h-11 px-6 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-2"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create & Activate Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CAMPAIGN INSPECT & SETTLEMENT DRAWER */}
      {viewingCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl bg-background border border-border shadow-2xl rounded-3xl overflow-hidden my-6">
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">{viewingCampaign.title}</h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  Execution Date: {viewingCampaign.campaign_date || viewingCampaign.created_at?.split('T')[0]} • Location: {viewingCampaign.target_state || 'Nationwide'}
                </p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setViewingCampaign(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Settlement Preview & Trigger */}
              <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-950/40 via-background to-background border border-emerald-300 dark:border-emerald-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-base text-foreground flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-emerald-600" /> Direct Team Settlement Engine
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Calculate collective payouts and disburse directly to members' verified Paystack bank accounts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Settlement Mode"
                      value={settleMode}
                      onChange={(e: any) => setSettleMode(e.target.value)}
                      className="h-10 text-xs font-bold rounded-xl border border-input bg-card px-3"
                    >
                      <option value="paystack">⚡ Paystack Transfers</option>
                      <option value="manual">💵 Mark Manually Settled</option>
                    </select>

                    <Button
                      type="button"
                      onClick={() => handleSettleCampaign(viewingCampaign.id)}
                      disabled={settling || campaignAssignments.length === 0}
                      className="h-10 px-5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
                    >
                      {settling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                      Execute Settlement
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="bg-card p-3 rounded-xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Settlement Base</p>
                    <p className="text-base font-black text-foreground mt-0.5">
                      ₦{Number(viewingCampaign.total_cost || 5000).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Team Pool ({payoutPct}%)</p>
                    <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-0.5">
                      ₦{Math.round(Number(viewingCampaign.total_cost || 5000) * (payoutPct / 100)).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Participating Members</p>
                    <p className="text-base font-black text-blue-600 mt-0.5">{campaignAssignments.length} submitted</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800">
                    <p className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Payout / Member</p>
                    <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                      ₦{campaignAssignments.length > 0 
                        ? Math.round(Number(viewingCampaign.total_cost || 5000) * (payoutPct / 100) / campaignAssignments.length).toLocaleString()
                        : '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participating Members Table */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
                  <span>Participating Operators ({campaignAssignments.length})</span>
                  <Badge variant="outline" className="text-xs">{viewingCampaign.max_syndicates || 50} Max Slots</Badge>
                </h4>

                {loadingAssignments ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : campaignAssignments.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Member</th>
                          <th className="py-2.5 px-3">Submitted At</th>
                          <th className="py-2.5 px-3">Proof</th>
                          <th className="py-2.5 px-3">Bank Details</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {campaignAssignments.map(a => (
                          <tr key={a.id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-bold text-foreground">
                              {a.profiles?.display_name || a.profiles?.email || 'Member'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                              {new Date(a.submitted_at || a.created_at).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              {a.proof_url ? (
                                <a href={a.proof_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold hover:underline">
                                  View Proof
                                </a>
                              ) : (
                                <span className="text-muted-foreground">No proof file</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {a.syndicate_profiles?.bank_name ? (
                                <span className="text-[11px]">
                                  {a.syndicate_profiles.bank_name} (•••• {a.syndicate_profiles.account_number?.slice(-4)})
                                </span>
                              ) : (
                                <Badge variant="outline" className="text-[9px] text-amber-600">Bank Missing</Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge className={`text-[10px] font-bold ${
                                a.status === 'approved' || a.status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                              }`}>
                                {a.status?.toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                    No operator submissions received yet for this campaign.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
