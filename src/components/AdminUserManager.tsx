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
  ExternalLink, MapPin, Award, MessageCircle, ChevronRight, Loader2
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
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [wallets, setWallets] = useState<Record<string, any>>({});
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
    const [profilesRes, rolesRes, walletsRes, bpRes, spRes, slRes, adsRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*'),
      supabase.from('task_wallets').select('*'),
      (supabase.from('business_profiles') as any).select('user_id, id, business_name, paystack_enabled, paystack_public_key, phone_number, whatsapp_link'),
      supabase.from('syndicate_profiles').select('user_id, state, tasks_completed, ranking_score, verified_platforms, account_name, account_number, bank_name'),
      supabase.from('short_links').select('user_id'),
      supabase.from('ads').select('user_id'),
      supabase.from('syndicate_tasks').select('business_user_id'),
    ]);

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

  const adjustCredits = async (profileId: string, sign: 1 | -1) => {
    const raw = parseInt(creditAmounts[profileId] || '0');
    const amount = Math.abs(raw) * sign;
    if (!amount) return;
    const user = users.find(u => u.id === profileId);
    if (!user) return;
    const newCredits = user.credits + amount;
    if (newCredits < 0) { toast.error("Cannot go below 0 credits"); return; }
    await supabase.from('profiles').update({ credits: newCredits }).eq('id', profileId);
    toast.success(amount > 0 ? `Added ${amount} credits` : `Debited ${Math.abs(amount)} credits`);
    setCreditAmounts(prev => ({ ...prev, [profileId]: '' }));
    loadAll();
  };

  const adjustWallet = async (userId: string, add: boolean) => {
    const amount = parseFloat(walletAmounts[userId] || '0');
    if (!amount || amount <= 0) return;
    const wallet = wallets[userId];
    if (!wallet) {
      await supabase.from('task_wallets').insert({ user_id: userId, balance: add ? amount : 0 });
      toast.success(add ? `Funded ₦${amount}` : 'No wallet to debit');
      loadAll(); return;
    }
    const newBalance = add ? (wallet.balance || 0) + amount : (wallet.balance || 0) - amount;
    if (newBalance < 0) { toast.error("Cannot go below ₦0"); return; }
    const updates: any = { balance: newBalance };
    if (add) updates.total_funded = (wallet.total_funded || 0) + amount;
    await supabase.from('task_wallets').update(updates).eq('id', wallet.id);
    toast.success(add ? `Funded ₦${amount}` : `Debited ₦${amount}`);
    setWalletAmounts(prev => ({ ...prev, [userId]: '' }));
    loadAll();
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
                  <p className="text-xs font-bold text-foreground">{user.credits}<span className="text-[9px] text-muted-foreground"> cr</span></p>
                  <p className="text-[10px] text-muted-foreground">₦{(wallet?.balance || 0).toLocaleString()}</p>
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
                  <SheetTitle className="text-white text-base">User Details</SheetTitle>
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
                <div className="grid grid-cols-3 gap-2 mt-4 relative">
                  <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur">
                    <p className="text-[9px] uppercase opacity-80">Credits</p>
                    <p className="text-base font-bold">{selectedUser.credits}</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur">
                    <p className="text-[9px] uppercase opacity-80">Wallet</p>
                    <p className="text-base font-bold">₦{(sw?.balance || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white/15 rounded-lg p-2 text-center backdrop-blur">
                    <p className="text-[9px] uppercase opacity-80">Earned</p>
                    <p className="text-base font-bold">₦{(sw?.total_earned || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <Tabs defaultValue="overview">
                  <TabsList className="grid grid-cols-4 w-full text-[11px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                    <TabsTrigger value="wallet">Funds</TabsTrigger>
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

                  <TabsContent value="wallet" className="space-y-3 pt-3">
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <p className="text-xs font-semibold">Credits ({selectedUser.credits})</p>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="Amount"
                            value={creditAmounts[selectedUser.id] || ''}
                            onChange={e => setCreditAmounts(prev => ({ ...prev, [selectedUser.id]: e.target.value }))}
                            className="h-9 text-sm flex-1" />
                          <Button size="sm" variant="outline" onClick={() => adjustCredits(selectedUser.id, 1)}><Plus className="h-3 w-3" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => adjustCredits(selectedUser.id, -1)}><Minus className="h-3 w-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1"><Wallet className="h-3 w-3" />Naira wallet (₦{(sw?.balance || 0).toLocaleString()})</p>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="₦ Amount"
                            value={walletAmounts[selectedUser.user_id] || ''}
                            onChange={e => setWalletAmounts(prev => ({ ...prev, [selectedUser.user_id]: e.target.value }))}
                            className="h-9 text-sm flex-1" />
                          <Button size="sm" variant="outline" onClick={() => adjustWallet(selectedUser.user_id, true)}><Plus className="h-3 w-3" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => adjustWallet(selectedUser.user_id, false)}><Minus className="h-3 w-3" /></Button>
                        </div>
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
