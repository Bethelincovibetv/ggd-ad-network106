import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Key, Smartphone, ShieldCheck, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, Search, Filter, Download, Coins, 
  TrendingUp, ExternalLink, Copy, Check, Eye, Lock, Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AdminSabussManager: React.FC = () => {
  const [config, setConfig] = useState({
    apiKey: '',
    apiPin: '0000',
    isActive: true,
    minAmount: 100,
    maxAmount: 10000,
    environment: 'production',
  });
  const [stats, setStats] = useState({
    totalRedemptions: 0,
    successCount: 0,
    pendingCount: 0,
    failedCount: 0,
    totalAmountDispatched: 0,
    totalCreditsRedeemed: 0,
    exchangeRate: 100,
  });
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed' | 'reversed'>('all');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/airtime/admin/all');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.config) {
            setConfig({
              apiKey: data.config.apiKey || '',
              apiPin: data.config.apiPin || '0000',
              isActive: data.config.isActive === 'true' || data.config.isActive === true,
              minAmount: data.config.minAmount || 100,
              maxAmount: data.config.maxAmount || 10000,
              environment: data.config.environment || 'production',
            });
          }
          if (data.stats) {
            setStats(data.stats);
          }
          if (Array.isArray(data.redemptions)) {
            setRedemptions(data.redemptions);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin airtime data:', err);
      toast.error('Failed to load Sabuss admin records');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.apiKey.trim()) {
      toast.error('Sabuss API Key cannot be empty');
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch('/api/airtime/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || '🎉 Sabuss API configuration saved successfully to Cloud SQL!');
      } else {
        toast.error(data.error || 'Failed to save config');
      }
    } catch (err: any) {
      toast.error('Network error saving config: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAction = async (id: string, action: 'refund' | 'mark_success') => {
    try {
      const res = await fetch(`/api/airtime/admin/retry/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchAdminData();
        setSelectedRecord(null);
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (err: any) {
      toast.error('Error executing action: ' + err.message);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const exportCsv = () => {
    if (redemptions.length === 0) return;
    const header = 'Date,Reference,User Email,Phone,Network,Amount (NGN),Credits Deducted,Status,API Code\n';
    const rows = redemptions
      .map(r => `${r.createdAt},${r.reference},"${r.userEmail || ''}",${r.phoneNumber},${r.network},${r.amountNgn},${r.creditsDeducted},${r.status},${r.apiStatusCode || ''}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airtime-redemptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Airtime redemptions CSV exported!');
  };

  const filteredList = redemptions.filter(r => {
    const matchesSearch = 
      (r.phoneNumber && r.phoneNumber.includes(searchQuery)) ||
      (r.reference && r.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.network && r.network.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <Card className="border-border/80 shadow-md rounded-3xl bg-card overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 grid place-items-center text-white shadow-md shrink-0">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">Sabuss VTU & Airtime API Manager</h2>
                <Badge className="bg-white/25 text-white border-0 text-[10px] font-bold">
                  Cloud SQL Backed
                </Badge>
              </div>
              <p className="text-xs text-white/90 mt-0.5">
                Manage your Sabuss API key, error code handling (200, 400, 800, 900), and all user airtime redemptions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdminData}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Analytics KPIs Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-muted/20 text-xs">
          <div className="p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Dispatched</p>
            <p className="text-xl font-black text-foreground mt-0.5">₦{stats.totalAmountDispatched.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{stats.successCount} successful deliveries</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Credits Redeemed</p>
            <p className="text-xl font-black text-orange-600 mt-0.5">{stats.totalCreditsRedeemed.toLocaleString()} Cr</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">1 Cr = ₦{stats.exchangeRate}</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Success Rate</p>
            <p className="text-xl font-black text-foreground mt-0.5">
              {stats.totalRedemptions > 0 ? ((stats.successCount / stats.totalRedemptions) * 100).toFixed(1) : 100}%
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{stats.totalRedemptions} total requests</p>
          </div>
          <div className="p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending / Failed</p>
            <p className="text-xl font-black text-amber-600 mt-0.5">{stats.pendingCount} / {stats.failedCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Auto-refund on 800/900</p>
          </div>
        </div>
      </Card>

      {/* 2-Col Layout: Configuration Form + Error Code Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sabuss API Key & Config */}
        <div className="lg:col-span-2">
          <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
            <CardHeader className="p-4 sm:p-5 border-b border-border/60 pb-3">
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-500" />
                Sabuss API Credentials & Limits
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your Sabuss VTU endpoint key: <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">https://sabuss.com/vtu/api/buy/{'{API_KEY}'}</code>
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* API Key */}
                <div className="space-y-1.5">
                  <Label htmlFor="apiKey" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Sabuss Live API Key *
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Sabuss API Key (e.g. sab_live_...)"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="h-11 rounded-2xl bg-muted/20 border-border/80 font-mono text-xs font-bold"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Get your key from your Sabuss Vendor / Developer Dashboard at sabuss.com.
                  </p>
                </div>

                {/* API PIN & Status Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="apiPin" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Transaction PIN (Default: 0000)
                    </Label>
                    <Input
                      id="apiPin"
                      value={config.apiPin}
                      onChange={(e) => setConfig({ ...config, apiPin: e.target.value })}
                      placeholder="0000"
                      className="h-11 rounded-2xl bg-muted/20 border-border/80 font-mono text-xs font-bold text-center"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/70 self-end h-11">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Redemption Active</p>
                      <p className="text-[9px] text-muted-foreground">Allow users to redeem</p>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={(c) => setConfig({ ...config, isActive: c })}
                    />
                  </div>
                </div>

                {/* Min / Max Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="minAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Minimum Amount (₦)
                    </Label>
                    <Input
                      id="minAmount"
                      type="number"
                      min={50}
                      value={config.minAmount}
                      onChange={(e) => setConfig({ ...config, minAmount: Number(e.target.value) })}
                      className="h-11 rounded-2xl bg-muted/20 border-border/80 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="maxAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Maximum Amount (₦)
                    </Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      max={100000}
                      value={config.maxAmount}
                      onChange={(e) => setConfig({ ...config, maxAmount: Number(e.target.value) })}
                      className="h-11 rounded-2xl bg-muted/20 border-border/80 text-xs font-bold"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {savingConfig ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving to Cloud SQL…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Save Sabuss API Configuration
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Error Codes & Protocol Guide */}
        <div>
          <Card className="border-border/80 shadow-xs rounded-3xl overflow-hidden bg-card h-full flex flex-col justify-between">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <CardTitle className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-orange-500" />
                Sabuss API Error Codes Spec
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>200 » Success</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Airtime delivered to phone number, transaction completed.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>400 » Pending</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Queued on telco network or awaiting gateway dispatch.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>800 » Failed</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Insufficient VTU wallet or invalid number -> Credits auto-refunded.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                  <span>900 » Reversed</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Provider reversed transaction -> Credits auto-refunded to user.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Airtime Redemptions Table */}
      <Card className="border-border/80 shadow-md rounded-3xl overflow-hidden bg-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-black flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-orange-500" />
                All User Airtime Redemptions
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time transactions recorded across Cloud SQL and Sabuss VTU
              </CardDescription>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'success', 'pending', 'failed', 'reversed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by recipient phone, reference, or user email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-card text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center space-y-2">
              <RefreshCw className="h-6 w-6 text-orange-500 animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-semibold">Loading transactions from Cloud SQL…</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Smartphone className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-bold text-foreground">No transactions match your filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/70 sticky top-0 border-b border-border/80 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left p-3.5">Date</th>
                    <th className="text-left p-3.5">User</th>
                    <th className="text-left p-3.5">Network</th>
                    <th className="text-left p-3.5">Recipient</th>
                    <th className="text-right p-3.5">Amount (₦)</th>
                    <th className="text-right p-3.5">Credits</th>
                    <th className="text-center p-3.5">Code / Status</th>
                    <th className="text-right p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-medium">
                  {filteredList.map((r) => {
                    const isSuccess = r.status === 'success' || r.apiStatusCode === '200';
                    const isPending = r.status === 'pending' || r.apiStatusCode === '400';
                    const isFailed = r.status === 'failed' || r.apiStatusCode === '800';
                    const isReversed = r.status === 'reversed' || r.apiStatusCode === '900';

                    return (
                      <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 font-bold text-foreground truncate max-w-[150px]">
                          {r.userEmail || r.userId.slice(0, 8)}
                        </td>
                        <td className="p-3.5 font-black uppercase text-foreground">
                          {r.network}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-foreground">
                          {r.phoneNumber}
                        </td>
                        <td className="p-3.5 text-right font-black text-foreground">
                          ₦{Number(r.amountNgn).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-bold text-orange-600">
                          -{r.creditsDeducted} Cr
                        </td>
                        <td className="p-3.5 text-center">
                          {isSuccess && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              200 Success
                            </Badge>
                          )}
                          {isPending && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              400 Pending
                            </Badge>
                          )}
                          {isFailed && (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              800 Failed
                            </Badge>
                          )}
                          {isReversed && (
                            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              900 Reversed
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRecord(r)}
                            className="h-7 px-2 text-[11px] font-bold rounded-lg"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-md rounded-3xl p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-orange-500" />
                Airtime Redemption Details
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                Ref: {selectedRecord.reference}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-muted/40">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Network</p>
                  <p className="font-black text-foreground uppercase">{selectedRecord.network} (Plan #{selectedRecord.planId})</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Recipient</p>
                  <p className="font-mono font-bold text-foreground">{selectedRecord.phoneNumber}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Amount</p>
                  <p className="font-black text-foreground">₦{Number(selectedRecord.amountNgn).toLocaleString()}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Credits Deducted</p>
                  <p className="font-bold text-orange-600">-{selectedRecord.creditsDeducted} Credits</p>
                </div>
              </div>

              {/* Raw API Response Log */}
              {selectedRecord.apiResponse && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Sabuss API Raw Log</p>
                  <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-32">
                    {selectedRecord.apiResponse}
                  </pre>
                </div>
              )}

              {/* Admin Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(selectedRecord.id, 'refund')}
                  className="flex-1 h-9 rounded-xl text-xs font-bold border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  Refund Credits to User
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(selectedRecord.id, 'mark_success')}
                  className="flex-1 h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Mark as Success (200)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminSabussManager;
