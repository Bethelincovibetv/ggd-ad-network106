import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  AlertCircle, 
  TrendingUp, 
  BarChart2, 
  Layers,
  ArrowRight,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyndicateParticipationProps {
  campaigns: any[];
  allMembers: any[];
  assignments: any[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRefresh: () => void;
}

export const SyndicateParticipation: React.FC<SyndicateParticipationProps> = ({
  campaigns,
  allMembers,
  assignments,
  selectedDate,
  onSelectDate,
  onRefresh,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [tabFilter, setTabFilter] = useState<'all' | 'participated' | 'not_participated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Active members who are verified and active
  const activeTeamMembers = allMembers.filter(m => m.is_active && !m.is_suspended);

  // Filter campaigns for the date
  const dateCampaigns = campaigns.filter(c => (c.campaign_date || c.created_at?.split('T')[0]) === selectedDate);

  // Current active campaign for participation breakdown
  const activeCampaign = selectedCampaignId !== 'ALL' 
    ? campaigns.find(c => c.id === selectedCampaignId) 
    : dateCampaigns[0] || campaigns[0];

  // Participating user IDs for the active campaign
  const participatingUserIds = new Set(
    assignments
      .filter(a => activeCampaign ? a.task_id === activeCampaign.id : true)
      .map(a => a.syndicate_user_id)
  );

  // Split active team into participated vs not participated
  const participatedMembers = activeTeamMembers.filter(m => participatingUserIds.has(m.user_id));
  const notParticipatedMembers = activeTeamMembers.filter(m => !participatingUserIds.has(m.user_id));

  const participationRate = activeTeamMembers.length > 0 
    ? Math.round((participatedMembers.length / activeTeamMembers.length) * 100) 
    : 0;

  const handleSendReminderToNonParticipants = async () => {
    if (notParticipatedMembers.length === 0) {
      toast.info("All active operators have already submitted proofs!");
      return;
    }

    setSendingReminder(true);
    try {
      const inserts = notParticipatedMembers.map(m => ({
        user_id: m.user_id,
        title: "⚡ Campaign Action Required Today",
        message: `Direct Team: Today's campaign "${activeCampaign?.title || 'Active Campaign'}" is active. Submit your broadcast proof now to qualify for today's payout.`,
        type: 'campaign_reminder',
      }));

      const { error } = await supabase.from('notifications').insert(inserts);
      if (error) throw error;

      toast.success(`Sent broadcast reminders to ${notParticipatedMembers.length} operators!`);
    } catch (err: any) {
      toast.error("Failed to send reminders: " + err.message);
    } finally {
      setSendingReminder(false);
    }
  };

  // Filtered roster for table
  const displayedMembers = (
    tabFilter === 'participated' ? participatedMembers :
    tabFilter === 'not_participated' ? notParticipatedMembers :
    activeTeamMembers
  ).filter(m => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (m.display_name || m.user_profile?.display_name || '').toLowerCase();
      const state = (m.state || '').toLowerCase();
      return name.includes(q) || state.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Date & Campaign Select Bar */}
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Select Campaign:</span>
            <select
              aria-label="Select Campaign"
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
              className="h-9 text-xs font-bold rounded-xl border border-input bg-card px-3 max-w-xs truncate focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Active Campaigns ({dateCampaigns.length})</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.campaign_date || c.created_at?.split('T')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {notParticipatedMembers.length > 0 && (
          <Button
            type="button"
            onClick={handleSendReminderToNonParticipants}
            disabled={sendingReminder}
            className="h-10 px-4 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-2"
          >
            {sendingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Remind Non-Participants ({notParticipatedMembers.length})
          </Button>
        )}
      </div>

      {/* Participation Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="border border-border/80 rounded-2xl bg-card">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Active Team Roster</p>
            <p className="text-2xl font-black text-foreground">{activeTeamMembers.length}</p>
            <p className="text-[11px] text-muted-foreground">Verified operators</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Submitted Proofs</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{participatedMembers.length}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Participating operators</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">Pending Broadcast</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{notParticipatedMembers.length}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Not yet submitted</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-purple-50 dark:bg-purple-950/30">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-purple-800 dark:text-purple-300">Participation Rate</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{participationRate}%</p>
            <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-1.5 mt-1 overflow-hidden">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${participationRate}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border">
          <Button
            size="sm"
            variant={tabFilter === 'all' ? 'default' : 'ghost'}
            onClick={() => setTabFilter('all')}
            className={`h-8 text-xs font-bold rounded-lg ${tabFilter === 'all' ? 'bg-background text-foreground shadow-xs' : ''}`}
          >
            All Active Operators ({activeTeamMembers.length})
          </Button>
          <Button
            size="sm"
            variant={tabFilter === 'participated' ? 'default' : 'ghost'}
            onClick={() => setTabFilter('participated')}
            className={`h-8 text-xs font-bold rounded-lg ${tabFilter === 'participated' ? 'bg-emerald-600 text-white' : ''}`}
          >
            Participated ({participatedMembers.length})
          </Button>
          <Button
            size="sm"
            variant={tabFilter === 'not_participated' ? 'default' : 'ghost'}
            onClick={() => setTabFilter('not_participated')}
            className={`h-8 text-xs font-bold rounded-lg ${tabFilter === 'not_participated' ? 'bg-amber-600 text-white' : ''}`}
          >
            Not Participated ({notParticipatedMembers.length})
          </Button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search operator name or state..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Roster Table */}
      <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Broadcast Channels</th>
                <th className="py-3 px-4">Participation Status</th>
                <th className="py-3 px-4">Turnaround / Submitted</th>
                <th className="py-3 px-4 text-right">Proof Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {displayedMembers.map((member) => {
                const isParticipating = participatingUserIds.has(member.user_id);
                const assignment = assignments.find(a => a.syndicate_user_id === member.user_id);
                const displayName = member.display_name || member.user_profile?.display_name || 'Syndicate Operator';
                const avatar = member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.user_id}`;

                return (
                  <tr key={member.user_id} className="hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={avatar} 
                          alt={displayName} 
                          className="h-8 w-8 rounded-lg object-cover border border-border" 
                        />
                        <div>
                          <p className="font-bold text-foreground">{displayName}</p>
                          <p className="text-[10px] text-muted-foreground">{member.email || member.user_profile?.email || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {member.state || 'Unset'}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(member.verified_platforms || []).map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0 uppercase">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {isParticipating ? (
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                          <CheckCircle className="h-3 w-3 mr-1" /> Submitted Proof
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] font-bold">
                          <Clock className="h-3 w-3 mr-1" /> Pending Broadcast
                        </Badge>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {assignment?.submitted_at ? new Date(assignment.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {assignment?.proof_url ? (
                        <a 
                          href={assignment.proof_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-purple-600 font-bold hover:underline"
                        >
                          View Proof
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {displayedMembers.length === 0 && (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No operators matching current filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
