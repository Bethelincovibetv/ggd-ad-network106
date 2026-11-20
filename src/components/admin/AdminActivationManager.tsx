import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  Users,
  Wallet,
  Loader2,
  Save,
  RefreshCw,
  Sparkles,
  UserCheck,
  AlertCircle,
  Power,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVATION_UPDATED_EVENT, dispatchActivationUpdated } from '@/hooks/useActivationStatus';

interface UserActivationRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  business_name: string | null;
  credits: number;
  state: string | null;
  is_activated: boolean;
  activated_at: string | null;
  created_at: string;
}

interface ActivationPaymentRow {
  id: string;
  reference: string;
  user_id: string;
  amount: number;
  created_at: string;
}

const AdminActivationManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState<boolean>(true);
  const [feeAmount, setFeeAmount] = useState<string>('1000');
  const [bonusCredits, setBonusCredits] = useState<string>('200');
  const [grantBonusOnOverride, setGrantBonusOnOverride] = useState<boolean>(true);

  const [users, setUsers] = useState<UserActivationRow[]>([]);
  const [payments, setPayments] = useState<ActivationPaymentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unactivated' | 'activated'>('all');
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [schemaNotice, setSchemaNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setSchemaNotice(null);
    try {
      const [settingsRes, paymentsRes, profilesRes, rolesRes] = await Promise.all([
        supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'activation_fee_enabled',
            'activation_fee_amount',
            'activation_bonus_credits',
          ]),
        (supabase as any)
          .from('processed_payments')
          .select('id, reference, user_id, amount, created_at')
          .eq('payment_type', 'user_activation')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('profiles')
          .select('user_id, email, display_name, business_name, credits, state, is_activated, activated_at, created_at')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
      ]);

      const sMap = new Map<string, string>();
      (settingsRes.data || []).forEach((row: any) => {
        sMap.set(row.key, String(row.value ?? ''));
      });

      const enabledRaw = sMap.get('activation_fee_enabled');
      setFeeEnabled(
        enabledRaw === undefined
          ? true
          : ['true', '1', 'on', 'yes'].includes(enabledRaw.trim().toLowerCase())
      );
      setFeeAmount(sMap.get('activation_fee_amount') || '1000');
      setBonusCredits(sMap.get('activation_bonus_credits') || '200');

      const paymentRows = (paymentsRes.data || []) as ActivationPaymentRow[];
      setPayments(paymentRows);
      const paidUserIds = new Set(paymentRows.map((p) => p.user_id));
      const adminUserIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));

      if (profilesRes.error) {
        const msg = String(profilesRes.error.message || '').toLowerCase();
        if (profilesRes.error.code === '42703' || msg.includes('is_activated')) {
          setSchemaNotice(
            'Database migration 20261116000000_user_activation_fee.sql has not been applied on remote Postgres yet. Showing payment-inferred activation status.'
          );
          const fallback = await supabase
            .from('profiles')
            .select('user_id, email, display_name, business_name, credits, state, created_at')
            .order('created_at', { ascending: false })
            .limit(1000);

          setUsers(
            ((fallback.data || []) as any[]).map((u) => ({
              ...u,
              credits: Number(u.credits || 0),
              is_activated:
                paidUserIds.has(u.user_id) ||
                adminUserIds.has(u.user_id) ||
                ['goodgiftdigital@gmail.com', 'accessa787@gmail.com'].includes(
                  String(u.email || '').toLowerCase()
                ),
              activated_at: null,
            }))
          );
        } else {
          throw profilesRes.error;
        }
      } else {
        setUsers(
          ((profilesRes.data || []) as any[]).map((u) => ({
            ...u,
            credits: Number(u.credits || 0),
            is_activated: Boolean(u.is_activated),
            activated_at: u.activated_at || null,
          }))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load activation metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const syncActivationSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'activation_fee_enabled',
          'activation_fee_amount',
          'activation_bonus_credits',
        ]);
      const sMap = new Map<string, string>();
      (data || []).forEach((row: any) => sMap.set(row.key, String(row.value ?? '')));
      if (sMap.has('activation_fee_enabled')) {
        setFeeEnabled(['true', '1', 'on', 'yes'].includes((sMap.get('activation_fee_enabled') || '').trim().toLowerCase()));
      }
      if (sMap.has('activation_fee_amount')) {
        setFeeAmount(sMap.get('activation_fee_amount') || '1000');
      }
      if (sMap.has('activation_bonus_credits')) {
        setBonusCredits(sMap.get('activation_bonus_credits') || '200');
      }
    };
    window.addEventListener(ACTIVATION_UPDATED_EVENT, syncActivationSettings);
    return () => window.removeEventListener(ACTIVATION_UPDATED_EVENT, syncActivationSettings);
  }, []);

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  };

  const handleToggleEnabled = async (next: boolean) => {
    setFeeEnabled(next);
    try {
      await upsertSetting('activation_fee_enabled', next ? 'true' : 'false');
      dispatchActivationUpdated();
      toast.success(
        next
          ? 'Activation fee requirement enabled across the platform.'
          : 'Activation fee requirement disabled (all users can act freely).'
      );
    } catch (err: any) {
      setFeeEnabled(!next);
      toast.error(err?.message || 'Could not update master toggle');
    }
  };

  const handleSaveConfig = async () => {
    const parsedFee = parseInt(feeAmount, 10);
    const parsedBonus = parseInt(bonusCredits, 10);

    if (!Number.isFinite(parsedFee) || parsedFee < 100) {
      toast.error('Please enter a valid fee amount (minimum ₦100).');
      return;
    }
    if (!Number.isFinite(parsedBonus) || parsedBonus < 0) {
      toast.error('Starter bonus credits must be 0 or greater.');
      return;
    }

    setSavingSettings(true);
    try {
      await Promise.all([
        upsertSetting('activation_fee_enabled', feeEnabled ? 'true' : 'false'),
        upsertSetting('activation_fee_amount', String(parsedFee)),
        upsertSetting('activation_bonus_credits', String(parsedBonus)),
      ]);
      dispatchActivationUpdated();
      toast.success('Activation fee settings saved!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMarkActivated = async (targetUser: UserActivationRow) => {
    if (targetUser.is_activated) return;
    setActivatingUserId(targetUser.user_id);
    const configuredBonus = Math.max(0, parseInt(bonusCredits, 10) || 200);
    const bonusToCredit = grantBonusOnOverride ? configuredBonus : 0;

    try {
      const { data: rpcData, error: rpcErr } = await (supabase as any).rpc(
        'admin_mark_user_activated',
        {
          p_target_user_id: targetUser.user_id,
          p_grant_bonus: grantBonusOnOverride,
        }
      );

      let newCredits = targetUser.credits + bonusToCredit;

      if (rpcErr || !rpcData?.success) {
        // Fallback direct update if RPC isn't present yet
        const { error: updErr } = await (supabase as any)
          .from('profiles')
          .update({
            is_activated: true,
            activated_at: new Date().toISOString(),
            credits: newCredits,
          })
          .eq('user_id', targetUser.user_id);

        if (updErr) throw updErr;

        await supabase.from('notifications').insert({
          user_id: targetUser.user_id,
          title: '🎉 Account Activated! Starter Pack Unlocked',
          message:
            bonusToCredit > 0
              ? `Your GGD Ad Network account has been manually activated! +${bonusToCredit} GGG Starter Credits have been added.`
              : 'Your GGD Ad Network account has been manually activated! All platform actions are now unlocked.',
          type: 'activation',
          nav_target: 'tasks',
        });
      } else {
        newCredits = Number(rpcData.new_credits ?? newCredits);
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === targetUser.user_id
            ? {
                ...u,
                is_activated: true,
                activated_at: new Date().toISOString(),
                credits: newCredits,
              }
            : u
        )
      );

      dispatchActivationUpdated({ activated: true, newCredits });
      toast.success(
        `✅ ${targetUser.display_name || targetUser.email || 'User'} marked as Activated${
          bonusToCredit > 0 ? ` (+${bonusToCredit} GGG bonus)` : ''
        }!`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark user as activated');
    } finally {
      setActivatingUserId(null);
    }
  };

  const metrics = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const activatedCount = users.filter((u) => u.is_activated).length;
    const unactivatedCount = users.length - activatedCount;
    const conversionRate =
      users.length > 0 ? ((activatedCount / users.length) * 100).toFixed(1) : '0.0';

    return {
      totalRevenue,
      paymentCount: payments.length,
      activatedCount,
      unactivatedCount,
      conversionRate,
    };
  }, [payments, users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'activated' && !u.is_activated) return false;
      if (statusFilter === 'unactivated' && u.is_activated) return false;
      if (!q) return true;
      return (
        String(u.display_name || '').toLowerCase().includes(q) ||
        String(u.business_name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.state || '').toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {schemaNotice && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p>{schemaNotice}</p>
        </div>
      )}

      {/* Revenue & Conversion Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Activation Revenue</span>
              <Wallet className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-foreground mt-1.5 tabular-nums">
              ₦{metrics.totalRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              {metrics.paymentCount} verified payment{metrics.paymentCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Activated Users</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-500 mt-1.5 tabular-nums">
              {metrics.activatedCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Full access unlocked
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Unactivated Users</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-500 mt-1.5 tabular-nums">
              {metrics.unactivatedCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Browsing in Explore Mode
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Conversion Rate</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-foreground mt-1.5 tabular-nums">
              {metrics.conversionRate}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              Of {users.length.toLocaleString()} total users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activation Fee Configuration Card */}
      <Card className="border-border/60 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
                Activation Fee &amp; Starter Pack Configuration
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Control one-time onboarding verification pricing and the instant GGG credit starter reward.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-2">
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">
                  {feeEnabled ? 'Activation Gate Active' : 'Activation Gate Paused'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Master Toggle (`activation_fee_enabled`)
                </p>
              </div>
              <Switch
                checked={feeEnabled}
                onCheckedChange={handleToggleEnabled}
                aria-label="Enable Activation Fee"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold">Activation Fee Amount (₦ NGN)</Label>
              <Input
                type="number"
                min={100}
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="1000"
                className="mt-1.5 h-11 font-bold text-sm tabular-nums rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Stored in <code>app_settings.activation_fee_amount</code> (Default: ₦1,000)
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold">Starter Bonus Reward (GGG Credits)</Label>
              <Input
                type="number"
                min={0}
                value={bonusCredits}
                onChange={(e) => setBonusCredits(e.target.value)}
                placeholder="200"
                className="mt-1.5 h-11 font-bold text-sm tabular-nums rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Stored in <code>app_settings.activation_bonus_credits</code> (Default: +200 GGG)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleSaveConfig}
                disabled={savingSettings}
                className="rounded-xl bg-gradient-to-r from-[#e67e22] to-orange-600 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs h-10 px-5 cursor-pointer"
              >
                {savingSettings ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Activation Settings
              </Button>

              <Button
                type="button"
                variant={feeEnabled ? 'destructive' : 'default'}
                onClick={() => handleToggleEnabled(!feeEnabled)}
                className="rounded-xl font-bold text-xs h-10 px-4 cursor-pointer"
              >
                <Power className="h-3.5 w-3.5 mr-1.5" />
                {feeEnabled ? 'Switch Off ₦1,000 Activation' : 'Enable ₦1,000 Activation'}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              className="rounded-xl text-xs font-semibold h-10 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Searchable User Directory & Manual VIP / Offline Overrides */}
      <Card className="border-border/60 rounded-2xl">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                User Activation Directory ({filteredUsers.length})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Search accounts and manually grant VIP or offline bank-transfer activation.
              </CardDescription>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none rounded-xl border border-border px-3 py-1.5 bg-muted/30">
              <input
                type="checkbox"
                checked={grantBonusOnOverride}
                onChange={(e) => setGrantBonusOnOverride(e.target.checked)}
                className="accent-orange-500 h-3.5 w-3.5"
              />
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Award +{parseInt(bonusCredits, 10) || 200} GGG bonus on manual activation</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name, email, business name, or state..."
                className="pl-9 h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'unactivated', label: 'Unactivated' },
                  { id: 'activated', label: 'Activated' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 h-8 rounded-lg text-xs font-bold transition ${
                    statusFilter === tab.id
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No users match your current search or filter.
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredUsers.slice(0, 100).map((u) => {
                const name = u.display_name || u.business_name || 'Unnamed User';
                const busy = activatingUserId === u.user_id;
                return (
                  <div
                    key={u.user_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {name}
                        </span>
                        {u.is_activated ? (
                          <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Activated
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold">
                            <Clock className="h-3 w-3 mr-1" />
                            Unactivated
                          </Badge>
                        )}
                        <span className="text-[11px] font-semibold text-orange-500 tabular-nums flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {u.credits.toLocaleString()} cr
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        {u.email || 'No email'}
                        {u.business_name ? ` · ${u.business_name}` : ''}
                        {u.state ? ` · ${u.state}` : ''}
                      </p>

                      {u.activated_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Activated on {new Date(u.activated_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {u.is_activated ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <UserCheck className="h-3.5 w-3.5" />
                          Verified Active
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleMarkActivated(u)}
                          className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#e67e22] to-orange-600 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-sm"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Mark Activated
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length > 100 && (
                <p className="text-center text-[11px] text-muted-foreground pt-2">
                  Showing first 100 matches — refine your search to locate a specific user.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivationManager;
