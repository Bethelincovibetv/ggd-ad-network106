import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search, 
  Download, 
  Calendar, 
  ShieldCheck, 
  Banknote, 
  Briefcase, 
  UserCheck, 
  Clock, 
  RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

interface SyndicateAuditProps {
  assignments: any[];
  campaigns: any[];
  payouts: any[];
  bankRequests: any[];
  onRefresh: () => void;
}

export const SyndicateAudit: React.FC<SyndicateAuditProps> = ({
  assignments,
  campaigns,
  payouts,
  bankRequests,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'settlement' | 'proof' | 'campaign' | 'bank'>('all');

  // Synthesize unified audit entries
  const auditEntries: any[] = [];

  // Payout entries
  payouts.forEach(p => {
    auditEntries.push({
      id: `payout-${p.id}`,
      type: 'settlement',
      title: `Settlement Disbursed: ₦${Number(p.amount_naira || p.amount || 0).toLocaleString()}`,
      subtitle: `Recipient: ${p.account_name || 'Member'} (${p.bank_name || 'Bank'})`,
      timestamp: p.created_at || new Date().toISOString(),
      status: p.status,
      details: p.paystack_transfer_code || p.paystack_reference || 'Manual Settle',
    });
  });

  // Proof review entries
  assignments.filter(a => a.reviewed_at).forEach(a => {
    auditEntries.push({
      id: `proof-${a.id}`,
      type: 'proof',
      title: `Proof ${a.status === 'approved' ? 'Approved' : 'Rejected'}: ${a.syndicate_tasks?.title || 'Campaign'}`,
      subtitle: `Operator: ${a.profiles?.display_name || 'Member'}`,
      timestamp: a.reviewed_at || a.created_at,
      status: a.status,
      details: a.rejection_reason || 'Approved by audit admin',
    });
  });

  // Campaign creation entries
  campaigns.forEach(c => {
    auditEntries.push({
      id: `camp-${c.id}`,
      type: 'campaign',
      title: `Campaign Created & Activated: "${c.title}"`,
      subtitle: `Date: ${c.campaign_date || c.created_at?.split('T')[0]} • Slots: ${c.max_syndicates || 50}`,
      timestamp: c.created_at,
      status: c.status,
      details: `Target: ${c.target_state || 'Nationwide'}`,
    });
  });

  // Bank change requests entries
  bankRequests.forEach(b => {
    auditEntries.push({
      id: `bank-${b.id}`,
      type: 'bank',
      title: `Bank Change Request ${b.status?.toUpperCase()}`,
      subtitle: `Member: ${b.profiles?.display_name || 'Member'} → ${b.requested_bank_name || b.bank_name}`,
      timestamp: b.reviewed_at || b.created_at,
      status: b.status,
      details: `Account: •••• ${(b.requested_account_number || b.account_number || '').slice(-4)}`,
    });
  });

  // Sort descending
  auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const exportAuditCSV = () => {
    const rows = filteredEntries.map(e => ({
      Timestamp: e.timestamp,
      Category: e.type,
      Title: e.title,
      Subtitle: e.subtitle,
      Status: e.status,
      Details: e.details,
    }));

    const headers = Object.keys(rows[0] || {}).join(',');
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `syndicate_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported audit trail to CSV!");
  };

  const filteredEntries = auditEntries.filter(e => {
    if (categoryFilter !== 'all' && e.type !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = e.title.toLowerCase();
      const subtitle = e.subtitle.toLowerCase();
      const details = (e.details || '').toLowerCase();
      if (!title.includes(q) && !subtitle.includes(q) && !details.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search audit trail events..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter Audit Category"
            value={categoryFilter}
            onChange={(e: any) => setCategoryFilter(e.target.value)}
            className="h-11 text-xs font-semibold rounded-xl border border-input bg-card px-3 focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Audit Categories</option>
            <option value="settlement">Settlements & Payouts</option>
            <option value="proof">Proof Reviews</option>
            <option value="campaign">Campaign Lifecycle</option>
            <option value="bank">Bank Verifications</option>
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={exportAuditCSV}
            className="h-11 px-4 text-xs font-bold rounded-xl border-border flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-purple-600" /> Export Audit CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="h-11 w-11 rounded-xl border-border"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Audit Timeline Table */}
      <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Event Type</th>
                <th className="py-3.5 px-4">Operation Summary</th>
                <th className="py-3.5 px-4">Actor / Target</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Audit Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                      {entry.type}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-foreground">{entry.title}</p>
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground text-xs">
                    {entry.subtitle}
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge className="text-[9px] font-bold uppercase" variant="secondary">
                      {entry.status}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground">
                    {entry.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-16 text-xs text-muted-foreground">
              No audit trail events recorded matching filters.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
