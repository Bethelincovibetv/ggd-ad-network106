import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search, CheckCircle, XCircle, Clock, Wallet, ArrowDownCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PLATFORMS = ['WhatsApp', 'Facebook', 'Telegram', 'TikTok', 'Twitter/X'];

const AdminSyndicateManager = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [syndicates, setSyndicates] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [taskCost, setTaskCost] = useState('50');
  const [payoutMode, setPayoutMode] = useState('manual');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackSecretKey, setPaystackSecretKey] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [appsRes, syndicatesRes, withdrawalsRes, settingsRes] = await Promise.all([
      supabase.from('syndicate_applications').select('*').order('created_at', { ascending: false }),
      supabase.from('syndicate_profiles').select('*').order('ranking_score', { ascending: false }),
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('app_settings').select('*'),
    ]);

    setApplications(appsRes.data || []);
    setSyndicates(syndicatesRes.data || []);
    setWithdrawals(withdrawalsRes.data || []);

    const settings = settingsRes.data || [];
    setTaskCost(settings.find((s: any) => s.key === 'task_cost_per_syndicate')?.value || '50');
    setPayoutMode(settings.find((s: any) => s.key === 'payout_mode')?.value || 'manual');
    setPaystackPublicKey(settings.find((s: any) => s.key === 'paystack_public_key')?.value || '');
    setPaystackSecretKey(settings.find((s: any) => s.key === 'paystack_secret_key')?.value || '');
    setLoading(false);
  };

  const approveApplication = async (app: any, platforms: string[]) => {
    // Update application
    await supabase.from('syndicate_applications').update({
      status: 'approved', reviewed_at: new Date().toISOString(),
    }).eq('id', app.id);

    // Create syndicate profile
    await supabase.from('syndicate_profiles').insert({
      user_id: app.user_id, verified_platforms: platforms,
    });

    // Add syndicate role
    await supabase.from('user_roles').insert({ user_id: app.user_id, role: 'syndicate' });

    // Create wallet
    await supabase.from('task_wallets').insert({ user_id: app.user_id });

    // Notify user
    await supabase.from('notifications').insert({
      user_id: app.user_id,
      title: '🎉 Syndicate Approved!',
      message: `Your syndicate application has been approved! You're now verified for: ${platforms.join(', ')}`,
      type: 'success',
    });

    toast.success("Application approved!");
    fetchData();
  };

  const rejectApplication = async (app: any) => {
    await supabase.from('syndicate_applications').update({
      status: 'rejected', reviewed_at: new Date().toISOString(),
    }).eq('id', app.id);

    await supabase.from('notifications').insert({
      user_id: app.user_id,
      title: '❌ Application Rejected',
      message: 'Your syndicate application was not approved at this time.',
      type: 'warning',
    });

    toast.success("Application rejected");
    fetchData();
  };

  const processWithdrawal = async (id: string, approve: boolean) => {
    const status = approve ? 'completed' : 'rejected';
    const withdrawal = withdrawals.find(w => w.id === id);

    await supabase.from('withdrawal_requests').update({
      status, processed_at: new Date().toISOString(),
    }).eq('id', id);

    if (!approve && withdrawal) {
      // Refund to wallet
      const { data: wallet } = await supabase.from('task_wallets').select('*').eq('user_id', withdrawal.user_id).maybeSingle();
      if (wallet) {
        await supabase.from('task_wallets').update({ balance: wallet.balance + withdrawal.amount }).eq('user_id', withdrawal.user_id);
      }
    }

    if (withdrawal) {
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: approve ? '💰 Withdrawal Processed' : '❌ Withdrawal Rejected',
        message: approve ? `₦${withdrawal.amount} has been sent to your bank.` : `₦${withdrawal.amount} refunded to wallet.`,
        type: approve ? 'credit' : 'warning',
      });
    }

    toast.success(approve ? "Withdrawal processed" : "Withdrawal rejected & refunded");
    fetchData();
  };

  const saveSettings = async () => {
    await Promise.all([
      supabase.from('app_settings').update({ value: taskCost }).eq('key', 'task_cost_per_syndicate'),
      supabase.from('app_settings').update({ value: payoutMode }).eq('key', 'payout_mode'),
      supabase.from('app_settings').update({ value: paystackPublicKey }).eq('key', 'paystack_public_key'),
      supabase.from('app_settings').update({ value: paystackSecretKey }).eq('key', 'paystack_secret_key'),
    ]);
    toast.success("Settings saved!");
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const pendingApps = applications.filter(a => a.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  return (
    <Tabs defaultValue="applications" className="space-y-4">
      <TabsList className="w-full grid grid-cols-4">
        <TabsTrigger value="applications" className="text-[10px]">
          Apps {pendingApps.length > 0 && <Badge className="ml-1 h-4 px-1 text-[8px] bg-red-500">{pendingApps.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="syndicates" className="text-[10px]">Syndicates</TabsTrigger>
        <TabsTrigger value="withdrawals" className="text-[10px]">
          Payouts {pendingWithdrawals.length > 0 && <Badge className="ml-1 h-4 px-1 text-[8px] bg-red-500">{pendingWithdrawals.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="settings" className="text-[10px]">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="applications" className="space-y-3">
        {pendingApps.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No pending applications</p>}
        {pendingApps.map(app => (
          <ApplicationCard key={app.id} app={app} onApprove={approveApplication} onReject={rejectApplication} />
        ))}
      </TabsContent>

      <TabsContent value="syndicates" className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search syndicates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {syndicates.filter(s => !searchQuery || JSON.stringify(s).toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
          <Card key={s.id}>
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex gap-1 flex-wrap">
                    {(s.verified_platforms || []).map((p: string) => (
                      <Badge key={p} className="text-[9px] bg-purple-100 text-purple-700">{p} ✓</Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Tasks: {s.total_tasks_completed} | Score: {s.ranking_score}</p>
                </div>
                {s.is_verified && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="withdrawals" className="space-y-3">
        {pendingWithdrawals.map(w => (
          <Card key={w.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-bold text-foreground">₦{w.amount}</p>
                <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{w.bank_name} - {w.account_number} ({w.account_name})</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" onClick={() => processWithdrawal(w.id, true)}>
                  <CheckCircle className="h-3 w-3 mr-1" />Approve
                </Button>
                <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => processWithdrawal(w.id, false)}>
                  <XCircle className="h-3 w-3 mr-1" />Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingWithdrawals.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No pending withdrawals</p>}
      </TabsContent>

      <TabsContent value="settings" className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Syndicate Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Cost per Syndicate (₦)</Label>
              <Input type="number" value={taskCost} onChange={e => setTaskCost(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Payout Mode</Label>
              <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={payoutMode} onChange={e => setPayoutMode(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic (Paystack)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Paystack Public Key</Label>
              <Input value={paystackPublicKey} onChange={e => setPaystackPublicKey(e.target.value)} className="mt-1" placeholder="pk_..." />
            </div>
            <div>
              <Label className="text-xs">Paystack Secret Key</Label>
              <Input type="password" value={paystackSecretKey} onChange={e => setPaystackSecretKey(e.target.value)} className="mt-1" placeholder="sk_..." />
            </div>
            <Button onClick={saveSettings} className="w-full text-xs">Save Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

const ApplicationCard = ({ app, onApprove, onReject }: { app: any; onApprove: (app: any, platforms: string[]) => void; onReject: (app: any) => void }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const influenceFields = [
    { key: 'whatsapp_influence', label: 'WhatsApp', platform: 'WhatsApp' },
    { key: 'facebook_influence', label: 'Facebook', platform: 'Facebook' },
    { key: 'telegram_influence', label: 'Telegram', platform: 'Telegram' },
    { key: 'tiktok_influence', label: 'TikTok', platform: 'TikTok' },
    { key: 'twitter_influence', label: 'Twitter/X', platform: 'Twitter/X' },
  ];

  return (
    <Card className="border-yellow-200">
      <CardContent className="p-3 space-y-2">
        <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
        {influenceFields.map(f => app[f.key] && (
          <div key={f.key} className="flex items-center gap-2">
            <Checkbox checked={selectedPlatforms.includes(f.platform)}
              onCheckedChange={() => setSelectedPlatforms(prev => 
                prev.includes(f.platform) ? prev.filter(p => p !== f.platform) : [...prev, f.platform]
              )} />
            <div>
              <span className="text-xs font-medium">{f.label}:</span>
              <span className="text-xs text-muted-foreground ml-1">{app[f.key]}</span>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="flex-1 bg-green-600 text-white text-xs" disabled={selectedPlatforms.length === 0}
            onClick={() => onApprove(app, selectedPlatforms)}>
            <CheckCircle className="h-3 w-3 mr-1" />Approve
          </Button>
          <Button size="sm" variant="destructive" className="flex-1 text-xs" onClick={() => onReject(app)}>
            <XCircle className="h-3 w-3 mr-1" />Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSyndicateManager;
