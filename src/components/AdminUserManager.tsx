import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Search, Plus, Crown, Ban, CheckCircle, Minus, Shield, Briefcase,
  Users, Sparkles, Calendar, Wallet, Mail, Hash, Filter,
  ExternalLink, MapPin, Award, MessageCircle, ChevronRight, Loader2,
  Banknote, ArrowUpRight, ArrowDownRight, History, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const roleStyles: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  premium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  business: 'bg-blue-100 text-blue-700 border-blue-200',
  syndicate: 'bg-purple-100 text-purple-700 border-purple-200',
  co_owner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const AdminUserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [creditNotes, setCreditNotes] = useState<Record<string, string>>({});
  const [taskWalletAmounts, setTaskWalletAmounts] = useState<Record<string, string>>({});
  const [taskWalletNotes, setTaskWalletNotes] = useState<Record<string, string>>({});
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [loadingUserNotifications, setLoadingUserNotifications] = useState(false);
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(100);
  const [businessProfiles, setBusinessProfiles] = useState<Record<string, any>>({});
  const [syndicateProfiles, setSyndicateProfiles] = useState<Record<string, any>>({});
  const [shortLinkCounts, setShortLinkCounts] = useState<Record<string, number>>({});
  const [adCounts, setAdCounts] = useState<Record<string, number>>({});
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, walletsRes, bpRes, spRes, slRes, adsRes, tasksRes, rateRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
      supabase.from('task_wallets').select('*'),
      (supabase.from('business_profiles') as any).select('user_id, id, business_name, paystack_enabled, paystack_public_key, phone_number, whatsapp_link'),
      supabase.from('syndicate_profiles').select('user_id, state, tasks_completed, ranking_score, verified_platforms, account_name, account_number, bank_name'),
      supabase.from('short_links').select('user_id'),
      supabase.from('ads').select('user_id'),
      supabase.from('syndicate_tasks').select('business_user_id'),
      supabase.from('app_settings').select('value').eq('key', 'credit_exchange_rate').maybeSingle(),
    ]);
    const r = parseInt((rateRes as any)?.data?.value || '') || 100;
    setExchangeRate(r);

    const enriched = (profilesRes.data || []).map(p => ({
      ...p,
      roles: (rolesRes.data || []).filter(r => r.user_id === p.user_id).map(r => r.role),
    }));
    setUsers(enriched);

    const wMap: Record<string, any> = {};
    (walletsRes.data || []).forEach(w => { wMap[w.user_id] = w; });
    setWallets(wMap);

    const bpMap: Record<string, any> = {};
    (bpRes.data || []).forEach((b: any) => { bpMap[b.user_id] = b; });
    setBusinessProfiles(bpMap);

    const spMap: Record<string, any> = {};
    (spRes.data || []).forEach(s => { spMap[s.user_id] = s; });
    setSyndicateProfiles(spMap);

    const slCounts: Record<string, number> = {};
    (slRes.data || []).forEach((l: any) => { slCounts[l.user_id] = (slCounts[l.user_id] || 0) + 1; });
    setShortLinkCounts(slCounts);

    const adC: Record<string, number> = {};
    (adsRes.data || []).forEach((a: any) => { adC[a.user_id] = (adC[a.user_id] || 0) + 1; });
    setAdCounts(adC);

    const tC: Record<string, number> = {};
    (tasksRes.data || []).forEach((t: any) => { tC[t.business_user_id] = (tC[t.business_user_id] || 0) + 1; });
    setTaskCounts(tC);

    setLoading(false);
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('user_id', userId);
    toast.success(isBanned ? 'User unbanned' : 'User banned');
    loadAll();
  };

  const toggleRole = async (userId: string, role: any, hasRole: boolean) => {
    if (hasRole) await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    else await supabase.from('user_roles').insert({ user_id: userId, role });
    toast.success(hasRole ? `${role} removed` : `${role} added`);
    loadAll();
  };

  const togglePaystack = async (userId: string) => {
    const bp = businessProfiles[userId];
    if (!bp) return;
    await (supabase.from('business_profiles') as any).update({ paystack_enabled: !bp.paystack_enabled }).eq('id', bp.id);
    toast.success(bp.paystack_enabled ? 'Paystack disabled' : 'Paystack enabled');
    loadAll();
  };

  // Load selected user's recent wallet and credit activity
  useEffect(() => {
    if (selectedUser?.user_id) {
      setLoadingUserNotifications(true);
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', selectedUser.user_id)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          setUserNotifications(data || []);
          setLoadingUserNotifications(false);
        });
    } else {
      setUserNotifications([]);
    }
  }, [selectedUser]);

  const adjustCredits = async (sign: 1 | -1, customAmount?: number) => {
    if (!selectedUser) return;
    const raw = customAmount !== undefined ? customAmount : parseInt(creditAmounts[selectedUser.id] || '0', 10);
    const amount = Math.abs(raw) * sign;
    if (!amount) {
      toast.error("Please enter a valid credit amount");
      return;
    }

    const currentCredits = Number(selectedUser.credits) || 0;
    const newCredits = Math.max(0, currentCredits + amount);
    const reason = creditNotes[selectedUser.id]?.trim() || (amount > 0 ? 'Admin credit funding' : 'Admin credit adjustment');

    setIsAdjusting(true);
    try {
      // 1. Try atomic RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_adjust_user_credits', {
        p_target_id: selectedUser.user_id,
        p_amount: amount,
        p_reason: reason,
      });

      if (!rpcErr && rpcData && (rpcData as any).success) {
        toast.success(amount > 0 ? `🎉 Successfully added ${amount} GGG credits!` : `Debited ${Math.abs(amount)} GGG credits`);
        setCreditAmounts(prev => ({ ...prev, [selectedUser.id]: '' }));
        setCreditNotes(prev => ({ ...prev, [selectedUser.id]: '' }));
        setSelectedUser((prev: any) => prev ? { ...prev, credits: (rpcData as any).new_credits } : null);
        await loadAll();
        return;
      }

      // 2. Direct fallback update
      let { error: upErr } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('user_id', selectedUser.user_id);

      if (upErr) {
        const res2 = await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', selectedUser.id);
        upErr = res2.error;
      }

      if (upErr) {
        throw new Error(upErr.message || 'Permission denied or update failed');
      }

      // 3. Insert notification for user
      await supabase.from('notifications').insert({
        user_id: selectedUser.user_id,
        title: amount > 0 ? '🎉 Credits Added by Admin' : '⚠️ Credits Debited by Admin',
        message: amount > 0 
          ? `Admin added ${amount} GGG credits to your wallet (${reason}). New balance: ${newCredits} credits.`
          : `Admin debited ${Math.abs(amount)} GGG credits from your wallet (${reason}). New balance: ${newCredits} credits.`,
        type: 'credit',
        is_read: false,
      });

      toast.success(amount > 0 ? `🎉 Added ${amount} credits (New: ${newCredits})` : `Debited ${Math.abs(amount)} credits (New: ${newCredits})`);
      setCreditAmounts(prev => ({ ...prev, [selectedUser.id]: '' }));
      setCreditNotes(prev => ({ ...prev, [selectedUser.id]: '' }));
      setSelectedUser((prev: any) => prev ? { ...prev, credits: newCredits } : null);
      await loadAll();
    } catch (err: any) {
      toast.error('Credit adjustment error: ' + (err.message || 'Action failed'));
    } finally {
      setIsAdjusting(false);
    }
  };

  const adjustTaskWallet = async (sign: 1 | -1, customAmount?: number) => {
    if (!selectedUser) return;
    const raw = customAmount !== undefined ? customAmount : parseFloat(taskWalletAmounts[selectedUser.id] || '0');
    const amount = Math.abs(raw) * sign;
    if (!amount) {
      toast.error("Please enter a valid Naira amount (e.g. ₦1,000)");
      return;
    }

    const currentWallet = wallets[selectedUser.user_id];
    const currentBalance = Number(currentWallet?.balance || 0);
    const currentFunded = Number(currentWallet?.total_funded || 0);
    const newBalance = Math.max(0, currentBalance + amount);
    const newFunded = currentFunded + (amount > 0 ? amount : 0);
    const reason = taskWalletNotes[selectedUser.id]?.trim() || (amount > 0 ? 'Admin manual wallet funding' : 'Admin adjustment');

    setIsAdjusting(true);
    try {
      // 1. Try atomic RPC first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_fund_task_wallet', {
        p_target_id: selectedUser.user_id,
        p_amount: amount,
        p_reason: reason,
      });

      if (!rpcErr && rpcData && (rpcData as any).success) {
        toast.success(amount > 0 ? `💰 Successfully funded ₦${amount.toLocaleString()} into Task Wallet!` : `Debited ₦${Math.abs(amount).toLocaleString()} from Task Wallet`);
        setTaskWalletAmounts(prev => ({ ...prev, [selectedUser.id]: '' }));
        setTaskWalletNotes(prev => ({ ...prev, [selectedUser.id]: '' }));
        setWallets(prev => ({
          ...prev,
          [selectedUser.user_id]: {
            ...(prev[selectedUser.user_id] || {}),
            balance: (rpcData as any).new_balance,
            total_funded: (rpcData as any).new_balance,
          }
        }));
        await loadAll();
        return;
      }

      // 2. Direct fallback update
      let wErr: any = null;
      if (currentWallet) {
        const res = await supabase
          .from('task_wallets')
          .update({
            balance: newBalance,
            total_funded: newFunded,
          })
          .eq('user_id', selectedUser.user_id);
        wErr = res.error;
      } else {
        const res = await supabase
          .from('task_wallets')
          .insert({
            user_id: selectedUser.user_id,
            balance: newBalance,
            total_funded: newFunded,
          });
        wErr = res.error;
      }

      if (wErr) {
        throw new Error(wErr.message || 'Failed to update task wallet');
      }

      // 3. Insert notification for user
      await supabase.from('notifications').insert({
        user_id: selectedUser.user_id,
        title: amount > 0 ? '💼 Task Wallet Funded!' : '💼 Task Wallet Debited',
        message: amount > 0 
          ? `Admin funded your Naira Task Wallet with ₦${amount.toLocaleString()} (${reason}). New balance: ₦${newBalance.toLocaleString()}.`
          : `Admin debited ₦${Math.abs(amount).toLocaleString()} from your Naira Task Wallet (${reason}). New balance: ₦${newBalance.toLocaleString()}.`,
        type: 'wallet',
        is_read: false,
      });

      toast.success(amount > 0 ? `💰 Successfully funded ₦${amount.toLocaleString()} (New balance: ₦${newBalance.toLocaleString()})` : `Debited ₦${Math.abs(amount).toLocaleString()} (New balance: ₦${newBalance.toLocaleString()})`);
      setTaskWalletAmounts(prev => ({ ...prev, [selectedUser.id]: '' }));
      setTaskWalletNotes(prev => ({ ...prev, [selectedUser.id]: '' }));
      setWallets(prev => ({
        ...prev,
        [selectedUser.user_id]: {
          ...(prev[selectedUser.user_id] || {}),
          balance: newBalance,
          total_funded: newFunded,
        }
      }));
      await loadAll();
    } catch (err: any) {
      toast.error('Naira wallet funding error: ' + (err.message || 'Action failed'));
    } finally {
      setIsAdjusting(false);
    }
  };

  const saveProfile = async () => {
    if (!selectedUser) return;
    await supabase.from('profiles').update({
      display_name: editForm.display_name,
      business_name: editForm.business_name,
    }).eq('id', selectedUser.id);
    toast.success("Profile saved");
    loadAll();
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'all') {
      if (roleFilter === 'user' && u.roles.length > 0) return false;
      if (roleFilter !== 'user' && !u.roles.includes(roleFilter)) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q)
      || u.display_name?.toLowerCase().includes(q)
      || u.business_name?.toLowerCase().includes(q)
      || u.referral_code?.toLowerCase().includes(q);
  });

  const stats = {
    total: users.length,
    business: users.filter(u => u.roles.includes('business')).length,
    syndicate: users.filter(u => u.roles.includes('syndicate')).length,
    premium: users.filter(u => u.roles.includes('premium')).length,
    banned: users.filter(u => u.is_banned).length,
  };

  if (loading) return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-orange-500 mx-auto" /></div>;

  const initials = (u: any) => (u.display_name || u.email || 'U').slice(0, 2).toUpperCase();
  const sp = selectedUser ? syndicateProfiles[selectedUser.user_id] : null;
  const bp = selectedUser ? businessProfiles[selectedUser.user_id] : null;
  const sw = selectedUser ? wallets[selectedUser.user_id] : null;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Users', value: stats.total, color: 'from-orange-500 to-red-600', icon: Users },
          { label: 'Business', value: stats.business, color: 'from-blue-500 to-indigo-600', icon: Briefcase },
          { label: 'Syndicate', value: stats.syndicate, color: 'from-purple-500 to-fuchsia-600', icon: Sparkles },
          { label: 'Premium', value: stats.premium, color: 'from-yellow-500 to-amber-600', icon: Crown },
          { label: 'Banned', value: stats.banned, color: 'from-red-600 to-rose-700', icon: Ban },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 bg-gradient-to-br ${s.color} text-white shadow`}>
            <s.icon className="h-3.5 w-3.5 opacity-80" />
            <div className="text-xl font-black mt-1">{s.value}</div>
            <div className="text-[10px] opacity-90 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, business, code…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All</option>
          <option value="user">User</option>
          <option value="business">Business</option>
          <option value="syndicate">Syndicate</option>
          <option value="premium">Premium</option>
          <option value="admin">Admin</option>
          <option value="co_owner">Co-Owner</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground"><Filter className="h-3 w-3 inline mr-1" />{filtered.length} of {users.length}</p>

      {/* User list (mobile-card style) */}
      <div className="space-y-2">
        {filtered.map(user => {
          const wallet = wallets[user.user_id];
          return (
            <Card key={user.id}
              className={`group cursor-pointer hover:shadow-md transition active:scale-[0.99] ${user.is_banned ? 'border-red-300 bg-red-50/40' : ''}`}
              onClick={() => { setSelectedUser(user); setEditForm({ display_name: user.display_name, business_name: user.business_name }); }}>
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white shadow">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white text-sm font-bold">{initials(user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{user.display_name || 'Unnamed'}</p>
                    {user.is_banned && <Badge variant="destructive" className="text-[9px] h-4 px-1">banned</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {user.roles.length === 0 && <Badge variant="outline" className="text-[9px] h-4">user</Badge>}
                    {user.roles.map((r: string) => (
                      <Badge key={r} className={`text-[9px] h-4 ${roleStyles[r] || 'bg-gray-100 text-gray-700'}`} variant="outline">{r}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-600">₦{Number(wallet?.balance || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{user.credits}<span className="text-[9px]"> cr</span> (≈₦{(user.credits * exchangeRate).toLocaleString()})</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground inline mt-0.5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No users match.</p>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={o => { if (!o) setSelectedUser(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          {selectedUser && (
            <>
              {/* Hero */}
              <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white p-5 relative">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <SheetHeader className="text-left relative">
                  <SheetTitle className="text-white text-base">User Details & Wallets</SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-3 mt-3 relative">
                  <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                    <AvatarImage src={selectedUser.avatar_url || ''} />
                    <AvatarFallback className="bg-white text-orange-600 font-black">{initials(selectedUser)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{selectedUser.display_name || 'Unnamed'}</p>
                    <p className="text-[11px] opacity-90 truncate flex items-center gap-1"><Mail className="h-3 w-3" />{selectedUser.email}</p>
                    <p className="text-[11px] opacity-90 flex items-center gap-1"><Hash className="h-3 w-3" />{selectedUser.referral_code || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 relative">
                  <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur border border-white/20">
                    <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90">Naira Task Wallet</p>
                    <p className="text-lg font-black mt-0.5">₦{Number(sw?.balance || 0).toLocaleString()}</p>
                    <p className="text-[9px] opacity-75">Total funded: ₦{Number(sw?.total_funded || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white/15 rounded-xl p-2.5 backdrop-blur border border-white/20">
                    <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90">GGG Credits</p>
                    <p className="text-lg font-black mt-0.5">{selectedUser.credits} <span className="text-xs font-normal opacity-80">cr</span></p>
                    <p className="text-[9px] opacity-75">≈ ₦{(selectedUser.credits * exchangeRate).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Tabs defaultValue="overview">
                  <TabsList className="grid grid-cols-4 w-full text-[11px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                    <TabsTrigger value="wallet">Funding</TabsTrigger>
                    <TabsTrigger value="links">Links</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-3 pt-3">
                    <div>
                      <Label className="text-xs">Display name</Label>
                      <Input value={editForm.display_name || ''} onChange={e => setEditForm({...editForm, display_name: e.target.value})} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Business name</Label>
                      <Input value={editForm.business_name || ''} onChange={e => setEditForm({...editForm, business_name: e.target.value})} className="mt-1" />
                    </div>
                    <Button onClick={saveProfile} className="w-full text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white">Save changes</Button>

                    <div className="border-t pt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-muted rounded-lg p-2"><Calendar className="h-3 w-3 inline text-muted-foreground" /> Joined: <strong>{new Date(selectedUser.created_at).toLocaleDateString()}</strong></div>
                      <div className="bg-muted rounded-lg p-2">Ads: <strong>{adCounts[selectedUser.user_id] || 0}</strong></div>
                      <div className="bg-muted rounded-lg p-2">Tasks made: <strong>{taskCounts[selectedUser.user_id] || 0}</strong></div>
                      <div className="bg-muted rounded-lg p-2">Short links: <strong>{shortLinkCounts[selectedUser.user_id] || 0}</strong></div>
                    </div>

                    {selectedUser.roles.includes('syndicate') && sp && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3 text-purple-500" />Syndicate profile</p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {sp.state && <div className="bg-purple-50 rounded p-2"><MapPin className="h-3 w-3 inline" /> {sp.state}</div>}
                          <div className="bg-purple-50 rounded p-2"><Award className="h-3 w-3 inline" /> Score: {sp.ranking_score || 0}</div>
                          <div className="bg-purple-50 rounded p-2">Tasks: {sp.tasks_completed || 0}</div>
                          {sp.bank_name && <div className="bg-purple-50 rounded p-2 col-span-2 text-[10px]">{sp.bank_name} • {sp.account_number} ({sp.account_name})</div>}
                        </div>
                        {sp.verified_platforms?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sp.verified_platforms.map((p: string) => (
                              <Badge key={p} className="text-[9px] bg-purple-100 text-purple-700 h-4">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedUser.roles.includes('business') && bp && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><Briefcase className="h-3 w-3 text-blue-500" />Business profile</p>
                        <div className="space-y-1 text-[11px]">
                          {bp.business_name && <div className="bg-blue-50 rounded p-2">{bp.business_name}</div>}
                          {bp.phone_number && <div className="bg-blue-50 rounded p-2">📞 {bp.phone_number}</div>}
                          {bp.whatsapp_link && (
                            <a href={bp.whatsapp_link} target="_blank" rel="noopener noreferrer"
                              className="bg-green-50 rounded p-2 flex items-center gap-1 text-green-700">
                              <MessageCircle className="h-3 w-3" />WhatsApp <ExternalLink className="h-3 w-3 ml-auto" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center justify-between bg-muted rounded-lg p-2">
                          <span className="text-xs">Paystack payments</span>
                          <Switch checked={bp.paystack_enabled || false} onCheckedChange={() => togglePaystack(selectedUser.user_id)} />
                        </div>
                      </div>
                    )}

                    <Button onClick={() => toggleBan(selectedUser.user_id, selectedUser.is_banned)}
                      variant={selectedUser.is_banned ? "default" : "destructive"} className="w-full text-xs mt-2">
                      {selectedUser.is_banned ? <><CheckCircle className="h-3 w-3 mr-1" />Unban user</> : <><Ban className="h-3 w-3 mr-1" />Ban user</>}
                    </Button>
                  </TabsContent>

                  <TabsContent value="roles" className="space-y-2 pt-3">
                    <p className="text-[11px] text-muted-foreground">Toggle roles assigned to this user.</p>

                    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-3 space-y-2">
                      <p className="text-xs font-bold flex items-center gap-1"><Crown className="h-3.5 w-3.5 text-amber-600" />Subscribe to Plan (auto 1-month)</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { tier: 0, label: 'Free' },
                          { tier: 1, label: 'Tier 1' },
                          { tier: 2, label: 'Tier 2' },
                          { tier: 3, label: 'Tier 3' },
                          { tier: 4, label: 'Business' },
                        ].map(p => (
                          <Button
                            key={p.tier}
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-9 rounded-lg font-bold"
                            onClick={async () => {
                              const { error } = await supabase.rpc('admin_subscribe_user', { _user_id: selectedUser.user_id, _tier: p.tier });
                              if (error) { toast.error(error.message); return; }
                              toast.success(`Subscribed to ${p.label} (1 month)`);
                              loadAll();
                            }}
                          >
                            {p.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Plans automatically expire after 1 month. Re-subscribe to extend.</p>
                    </div>

                    {['admin', 'premium', 'business', 'syndicate', 'co_owner'].map(role => {
                      const has = selectedUser.roles.includes(role);
                      return (
                        <div key={role} className="flex items-center justify-between bg-muted rounded-lg p-2.5">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${roleStyles[role]}`} variant="outline">{role}</Badge>
                          </div>
                          <Switch checked={has} onCheckedChange={() => toggleRole(selectedUser.user_id, role, has)} />
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="wallet" className="space-y-4 pt-3">
                    {/* SECTION 1: NAIRA TASK WALLET (₦ CASH) */}
                    <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/70 to-teal-50/40">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                              <Banknote className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Naira Task Wallet</p>
                              <p className="text-[11px] text-emerald-700">Business campaigns & syndicates</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-800 font-semibold uppercase">Current Balance</span>
                            <p className="text-xl font-black text-emerald-700">₦{Number(sw?.balance || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-emerald-900 uppercase">Quick Add Presets</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[500, 1000, 2000, 5000, 10000, 20000].map(val => (
                              <Button
                                key={val}
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isAdjusting}
                                onClick={() => setTaskWalletAmounts(prev => ({ ...prev, [selectedUser.id]: String(val) }))}
                                className="h-7 text-xs font-semibold bg-white/80 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 text-emerald-800"
                              >
                                +₦{val.toLocaleString()}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Naira Amount & Reason */}
                        <div className="space-y-2 pt-1">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₦</span>
                            <Input
                              type="number"
                              placeholder="Enter Naira amount (e.g. 5000)"
                              value={taskWalletAmounts[selectedUser.id] || ''}
                              onChange={e => setTaskWalletAmounts(prev => ({ ...prev, [selectedUser.id]: e.target.value }))}
                              disabled={isAdjusting}
                              className="h-9 text-sm pl-8 font-medium bg-white"
                            />
                          </div>
                          <Input
                            placeholder="Optional reason (e.g. Bank transfer, Campaign bonus)"
                            value={taskWalletNotes[selectedUser.id] || ''}
                            onChange={e => setTaskWalletNotes(prev => ({ ...prev, [selectedUser.id]: e.target.value }))}
                            disabled={isAdjusting}
                            className="h-8 text-xs bg-white"
                          />
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={isAdjusting || !taskWalletAmounts[selectedUser.id]}
                            onClick={() => adjustTaskWallet(1)}
                            className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-1.5"
                          >
                            {isAdjusting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                            Fund Naira Wallet (+)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isAdjusting || !taskWalletAmounts[selectedUser.id]}
                            onClick={() => adjustTaskWallet(-1)}
                            className="h-9 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center justify-center gap-1.5"
                          >
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            Debit Naira (-)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* SECTION 2: GGG CREDITS WALLET */}
                    <Card className="border-orange-200 shadow-sm bg-gradient-to-br from-orange-50/70 to-amber-50/40">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-sm">
                              <Wallet className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-orange-950 uppercase tracking-wide">GGG Credits Wallet</p>
                              <p className="text-[11px] text-orange-700">In-app features, AI & transfers</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-orange-800 font-semibold uppercase">Current Credits</span>
                            <p className="text-xl font-black text-orange-600">{selectedUser.credits} <span className="text-xs font-medium">cr</span></p>
                            <p className="text-[10px] text-orange-700">≈ ₦{(selectedUser.credits * exchangeRate).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-orange-900 uppercase">Quick Add Presets</label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[10, 50, 100, 500, 1000].map(val => (
                              <Button
                                key={val}
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isAdjusting}
                                onClick={() => setCreditAmounts(prev => ({ ...prev, [selectedUser.id]: String(val) }))}
                                className="h-7 text-xs font-semibold bg-white/80 hover:bg-orange-100 hover:text-orange-900 border-orange-300 text-orange-800"
                              >
                                +{val}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Credits & Reason */}
                        <div className="space-y-2 pt-1">
                          <Input
                            type="number"
                            placeholder="Enter credit amount (e.g. 50)"
                            value={creditAmounts[selectedUser.id] || ''}
                            onChange={e => setCreditAmounts(prev => ({ ...prev, [selectedUser.id]: e.target.value }))}
                            disabled={isAdjusting}
                            className="h-9 text-sm font-medium bg-white"
                          />
                          <Input
                            placeholder="Optional reason (e.g. Welcome bonus, Compensation)"
                            value={creditNotes[selectedUser.id] || ''}
                            onChange={e => setCreditNotes(prev => ({ ...prev, [selectedUser.id]: e.target.value }))}
                            disabled={isAdjusting}
                            className="h-8 text-xs bg-white"
                          />
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            disabled={isAdjusting || !creditAmounts[selectedUser.id]}
                            onClick={() => adjustCredits(1)}
                            className="h-9 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-sm flex items-center justify-center gap-1.5"
                          >
                            {isAdjusting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            Add Credits (+)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isAdjusting || !creditAmounts[selectedUser.id]}
                            onClick={() => adjustCredits(-1)}
                            className="h-9 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center justify-center gap-1.5"
                          >
                            <Minus className="h-3.5 w-3.5" />
                            Debit Credits (-)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* SECTION 3: RECENT USER ACTIVITY / TRANSACTIONS LOG */}
                    <Card className="border-border">
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent User Transactions</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{userNotifications.length} logged events</span>
                        </div>

                        {loadingUserNotifications ? (
                          <div className="py-4 text-center">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-500 mx-auto" />
                            <p className="text-[11px] text-muted-foreground mt-1">Loading activity log…</p>
                          </div>
                        ) : userNotifications.length === 0 ? (
                          <div className="py-3 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg">
                            No recent transactions found for this user.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {userNotifications.map(notif => (
                              <div key={notif.id} className="p-2.5 rounded-lg border bg-background/80 text-xs space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] h-4 font-bold ${
                                      notif.type === 'wallet'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : notif.type === 'credit'
                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    {notif.type || 'system'}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(notif.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                </div>
                                <p className="font-semibold text-foreground text-[11px]">{notif.title}</p>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">{notif.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="links" className="pt-3 space-y-2">
                    <p className="text-[11px] text-muted-foreground">Quick shortcuts to this user's content.</p>
                    {selectedUser.roles.includes('business') && bp && (
                      <a href={`/business/${bp.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 rounded-lg p-3 transition">
                        <span className="text-xs font-medium text-blue-700"><Briefcase className="h-3 w-3 inline mr-1" />View business storefront</span>
                        <ExternalLink className="h-3 w-3 text-blue-600" />
                      </a>
                    )}
                    {bp?.whatsapp_link && (
                      <a href={bp.whatsapp_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between bg-green-50 hover:bg-green-100 rounded-lg p-3 transition">
                        <span className="text-xs font-medium text-green-700"><MessageCircle className="h-3 w-3 inline mr-1" />WhatsApp</span>
                        <ExternalLink className="h-3 w-3 text-green-600" />
                      </a>
                    )}
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                      <span className="text-xs">Short links created</span>
                      <Badge variant="outline" className="text-xs">{shortLinkCounts[selectedUser.user_id] || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                      <span className="text-xs">Ads created</span>
                      <Badge variant="outline" className="text-xs">{adCounts[selectedUser.user_id] || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                      <span className="text-xs">Syndicate tasks created</span>
                      <Badge variant="outline" className="text-xs">{taskCounts[selectedUser.user_id] || 0}</Badge>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUserManager;
