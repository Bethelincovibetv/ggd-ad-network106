import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Banknote, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  Zap, 
  Building2, 
  Loader2,
  ExternalLink,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyndicatePayoutsProps {
  payouts: any[];
  onRefresh: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  payoutPct: number;
}

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

export const SyndicatePayouts: React.FC<SyndicatePayoutsProps> = ({
  payouts,
  onRefresh,
  selectedDate,
  onSelectDate,
  payoutPct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [executingBatch, setExecutingBatch] = useState(false);

  // Metrics
  const completedPayouts = payouts.filter(p => p.status === 'completed' || p.status === 'paid' || p.status === 'success');
  const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'processing');
  const failedPayouts = payouts.filter(p => p.status === 'failed' || p.status === 'rejected');

  const totalCompletedAmount = completedPayouts.reduce((acc, p) => acc + Number((p as any).amount_naira || p.amount || 0), 0);
  const totalPendingAmount = pendingPayouts.reduce((acc, p) => acc + Number((p as any).amount_naira || p.amount || 0), 0);

  const handleMarkManualPaid = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          admin_notes: 'Marked as completed by Direct Admin Settlement',
        })
        .eq('id', payoutId);

      if (error) throw error;
      toast.success("Payout marked as completed!");
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to update payout: " + err.message);
    }
  };

  const handleRetryPaystackTransfer = async (payout: any) => {
    try {
      toast.info("Triggering Paystack transfer retry...");
      const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
        body: {
          action: 'retry_single_payout',
          withdrawal_id: payout.id,
        }
      });

      if (error) throw error;
      toast.success("Transfer retry submitted to Paystack!");
      onRefresh();
    } catch (err: any) {
      toast.error("Retry failed: " + err.message);
    }
  };

  const exportPayoutsCSV = () => {
    const rows = filteredPayouts.map(p => ({
      ID: p.id,
      RecipientName: p.account_name || p.profiles?.display_name || 'Member',
      BankName: p.bank_name || '',
      AccountNumber: p.account_number || '',
      AmountNaira: p.amount_naira || p.amount || 0,
      Status: p.status,
      Date: p.created_at?.split('T')[0],
      Reference: p.paystack_transfer_code || p.paystack_reference || p.reference || '—',
    }));

    const headers = Object.keys(rows[0] || {}).join(',');
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `syndicate_payouts_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported payouts ledger to CSV!");
  };

  const filteredPayouts = payouts.filter(p => {
    if (statusFilter === 'completed' && p.status !== 'completed' && p.status !== 'paid' && p.status !== 'success') return false;
    if (statusFilter === 'pending' && p.status !== 'pending' && p.status !== 'processing') return false;
    if (statusFilter === 'failed' && p.status !== 'failed' && p.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (p.account_name || p.profiles?.display_name || p.profiles?.email || '').toLowerCase();
      const bank = (p.bank_name || '').toLowerCase();
      const ref = (p.paystack_reference || p.reference || '').toLowerCase();
      if (!name.includes(q) && !bank.includes(q) && !ref.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Financial Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <Card className="border border-border/80 rounded-2xl bg-card">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Disbursed</p>
            <p className="text-2xl font-black text-emerald-600">₦{totalCompletedAmount.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{completedPayouts.length} successful transfers</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-card">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending Settlements</p>
            <p className="text-2xl font-black text-amber-600">₦{totalPendingAmount.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{pendingPayouts.length} queued payouts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-card">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Failed / Blocked</p>
            <p className="text-2xl font-black text-red-600">{failedPayouts.length}</p>
            <p className="text-[11px] text-muted-foreground">Bank errors or frozen</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase text-purple-800 dark:text-purple-300">Deterministic Pool</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{payoutPct}%</p>
            <p className="text-[11px] text-purple-600 dark:text-purple-400">Direct Paystack subaccounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipient name, bank, or Paystack reference..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter Status"
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="h-11 text-xs font-semibold rounded-xl border border-input bg-card px-3 focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Payout Statuses</option>
            <option value="completed">Completed / Settled</option>
            <option value="pending">Pending Processing</option>
            <option value="failed">Failed / Needs Retry</option>
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={exportPayoutsCSV}
            className="h-11 px-4 text-xs font-bold rounded-xl border-border flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-purple-600" /> Export CSV
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

      {/* Payouts Full-Width Ledger Table */}
      <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Recipient Member</th>
                <th className="py-3.5 px-4">Bank Account</th>
                <th className="py-3.5 px-4">Disbursed Amount</th>
                <th className="py-3.5 px-4">Paystack Reference</th>
                <th className="py-3.5 px-4">Initiated Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPayouts.map((p) => {
                const isCompleted = p.status === 'completed' || p.status === 'paid' || p.status === 'success';
                const isPending = p.status === 'pending' || p.status === 'processing';
                const isFailed = p.status === 'failed' || p.status === 'rejected';

                return (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-foreground text-sm">
                        {p.account_name || p.profiles?.display_name || 'Syndicate Operator'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{p.profiles?.email || '—'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-foreground text-xs">{p.bank_name || 'Bank'}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{maskAccountNumber(p.account_number)}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-black text-foreground text-sm">
                        ₦{Number((p as any).amount_naira || p.amount || 0).toLocaleString()}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {p.paystack_transfer_code || p.paystack_reference || p.reference || '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>

                    <td className="py-3.5 px-4">
                      {isCompleted && (
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                          <CheckCircle className="h-3 w-3 mr-1" /> COMPLETED
                        </Badge>
                      )}
                      {isPending && (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] font-bold">
                          <Clock className="h-3 w-3 mr-1" /> QUEUED
                        </Badge>
                      )}
                      {isFailed && (
                        <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-0 text-[10px] font-bold">
                          <XCircle className="h-3 w-3 mr-1" /> FAILED
                        </Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isPending && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkManualPaid(p.id)}
                            className="h-8 text-[11px] font-bold rounded-lg"
                          >
                            Mark Paid
                          </Button>
                        )}
                        {isFailed && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRetryPaystackTransfer(p)}
                            className="h-8 text-[11px] font-bold rounded-lg"
                          >
                            Retry Transfer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredPayouts.length === 0 && (
            <div className="text-center py-16 text-xs text-muted-foreground">
              No payout records match your search or filter.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
