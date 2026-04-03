import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Search, Plus, Crown, Ban, CheckCircle, Minus, Eye, Shield, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminUserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [wallets, setWallets] = useState<Record<string, any>>({});
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { fetchUsers(); fetchWallets(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('*');
    const enriched = (profiles || []).map(p => ({
      ...p, roles: (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role),
    }));
    setUsers(enriched);
    setLoading(false);
  };

  const fetchWallets = async () => {
    const { data } = await supabase.from('task_wallets').select('*');
    const map: Record<string, any> = {};
    (data || []).forEach(w => { map[w.user_id] = w; });
    setWallets(map);
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('user_id', userId);
    toast.success(isBanned ? 'User unbanned' : 'User banned');
    fetchUsers();
  };

  const toggleRole = async (userId: string, role: any, hasRole: boolean) => {
    if (hasRole) {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    } else {
      await supabase.from('user_roles').insert({ user_id: userId, role });
    }
    toast.success(hasRole ? `${role} removed` : `${role} added`);
    fetchUsers();
  };

  const addCredits = async (userId: string, profileId: string) => {
    const amount = parseInt(creditAmounts[profileId] || '0');
    if (!amount) return;
    const user = users.find(u => u.id === profileId);
    if (!user) return;
    const newCredits = user.credits + amount;
    if (newCredits < 0) { toast.error("Cannot go below 0 credits"); return; }
    await supabase.from('profiles').update({ credits: newCredits }).eq('id', profileId);
    toast.success(amount > 0 ? `Added ${amount} credits` : `Debited ${Math.abs(amount)} credits`);
    setCreditAmounts(prev => ({ ...prev, [profileId]: '' }));
    fetchUsers();
  };

  const fundWallet = async (userId: string, add: boolean) => {
    const amount = parseFloat(walletAmounts[userId] || '0');
    if (!amount || amount <= 0) return;
    const wallet = wallets[userId];
    if (!wallet) {
      await supabase.from('task_wallets').insert({ user_id: userId, balance: add ? amount : 0 });
      toast.success(add ? `Funded ₦${amount}` : 'No wallet to debit');
      fetchWallets(); return;
    }
    const newBalance = add ? (wallet.balance || 0) + amount : (wallet.balance || 0) - amount;
    if (newBalance < 0) { toast.error("Cannot go below ₦0"); return; }
    const updates: any = { balance: newBalance };
    if (add) updates.total_funded = (wallet.total_funded || 0) + amount;
    await supabase.from('task_wallets').update(updates).eq('id', wallet.id);
    toast.success(add ? `Funded ₦${amount}` : `Debited ₦${amount}`);
    setWalletAmounts(prev => ({ ...prev, [userId]: '' }));
    fetchWallets();
  };

  const saveUserProfile = async () => {
    if (!viewingUser) return;
    await supabase.from('profiles').update({
      display_name: editForm.display_name,
      email: editForm.email,
      business_name: editForm.business_name,
    }).eq('id', viewingUser.id);
    toast.success("Profile updated!");
    setViewingUser(null);
    fetchUsers();
  };

  const filtered = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q) || u.business_name?.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, email, business..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>
      <h3 className="font-semibold text-foreground text-sm">All Users ({filtered.length})</h3>

      {/* User Detail Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={open => { if (!open) setViewingUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">User Details</DialogTitle></DialogHeader>
          {viewingUser && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input value={editForm.display_name || ''} onChange={e => setEditForm({...editForm, display_name: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Business Name</Label>
                <Input value={editForm.business_name || ''} onChange={e => setEditForm({...editForm, business_name: e.target.value})} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Credits:</span> <strong>{viewingUser.credits}</strong></div>
                <div><span className="text-muted-foreground">Wallet:</span> <strong>₦{wallets[viewingUser.user_id]?.balance || 0}</strong></div>
                <div><span className="text-muted-foreground">Joined:</span> {new Date(viewingUser.created_at).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Referral:</span> {viewingUser.referral_code || 'N/A'}</div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {viewingUser.roles.map((r: string) => <Badge key={r} className="text-[10px]">{r}</Badge>)}
              </div>
              <Button onClick={saveUserProfile} className="w-full text-xs">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filtered.map(user => (
        <Card key={user.id} className={user.is_banned ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">{user.display_name || 'No Name'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {user.roles.map((r: string) => <Badge key={r} className="text-[10px]">{r}</Badge>)}
                  {user.is_banned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setViewingUser(user); setEditForm({ display_name: user.display_name, email: user.email, business_name: user.business_name }); }}>
                  <Eye className="h-3 w-3" />
                </Button>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{user.credits}</div>
                  <div className="text-[10px] text-muted-foreground">credits</div>
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="Credits (+/-)" value={creditAmounts[user.id] || ''}
                onChange={e => setCreditAmounts(prev => ({ ...prev, [user.id]: e.target.value }))} className="h-8 text-sm flex-1" />
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addCredits(user.user_id, user.id)}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => {
                setCreditAmounts(prev => ({ ...prev, [user.id]: '-' + Math.abs(parseInt(prev[user.id] || '0')).toString() }));
                setTimeout(() => addCredits(user.user_id, user.id), 100);
              }}>
                <Minus className="h-3 w-3 mr-1" />Debit
              </Button>
            </div>

            {/* Task Wallet */}
            {(user.roles.includes('business') || user.roles.includes('syndicate')) && (
              <div className="border-t pt-2 mt-1">
                <p className="text-[10px] text-muted-foreground mb-1">Task Wallet: ₦{wallets[user.user_id]?.balance || 0}</p>
                <div className="flex gap-2 items-center">
                  <Input type="number" placeholder="₦ Amount" value={walletAmounts[user.user_id] || ''}
                    onChange={e => setWalletAmounts(prev => ({ ...prev, [user.user_id]: e.target.value }))} className="h-8 text-sm flex-1" />
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fundWallet(user.user_id, true)}>
                    <Plus className="h-3 w-3 mr-1" />Fund
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => fundWallet(user.user_id, false)}>
                    <Minus className="h-3 w-3 mr-1" />Debit
                  </Button>
                </div>
              </div>
            )}

            {/* Roles */}
            <div className="flex gap-1 flex-wrap">
              {['admin', 'premium', 'business', 'syndicate'].map(role => (
                <Button key={role} size="sm" variant={user.roles.includes(role) ? "outline" : "default"}
                  className="h-7 text-[10px]" onClick={() => toggleRole(user.user_id, role, user.roles.includes(role))}>
                  {role === 'admin' && <Shield className="h-3 w-3 mr-0.5" />}
                  {user.roles.includes(role) ? `- ${role}` : `+ ${role}`}
                </Button>
              ))}
              <Button size="sm" variant={user.is_banned ? "default" : "destructive"} className="h-7 text-[10px]"
                onClick={() => toggleBan(user.user_id, user.is_banned)}>
                {user.is_banned ? <><CheckCircle className="h-3 w-3 mr-1" />Unban</> : <><Ban className="h-3 w-3 mr-1" />Ban</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminUserManager;
