import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Plus, Crown, Briefcase, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminUserManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const { data: roles } = await supabase.from('user_roles').select('*');
    const enriched = (profiles || []).map(p => ({
      ...p, roles: (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role),
    }));
    setUsers(enriched);
    setLoading(false);
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
    await supabase.from('profiles').update({ credits: user.credits + amount }).eq('id', profileId);
    toast.success(`Added ${amount} credits`);
    setCreditAmounts(prev => ({ ...prev, [profileId]: '' }));
    fetchUsers();
  };

  const filtered = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q);
  });

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
      </div>
      <h3 className="font-semibold text-foreground text-sm">All Users ({filtered.length})</h3>
      {filtered.map(user => (
        <Card key={user.id} className={user.is_banned ? 'border-red-300 bg-red-50' : ''}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{user.display_name || 'No Name'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {user.roles.map((r: string) => <Badge key={r} className="text-[10px]">{r}</Badge>)}
                  {user.is_banned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">{user.credits}</div>
                <div className="text-[10px] text-muted-foreground">credits</div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="Credits" value={creditAmounts[user.id] || ''}
                onChange={e => setCreditAmounts(prev => ({ ...prev, [user.id]: e.target.value }))} className="h-8 text-sm flex-1" />
              <Button size="sm" variant="outline" className="h-8" onClick={() => addCredits(user.user_id, user.id)}>
                <Plus className="h-3 w-3 mr-1" />Add
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {['premium', 'business', 'syndicate'].map(role => (
                <Button key={role} size="sm" variant={user.roles.includes(role) ? "outline" : "default"}
                  className="h-7 text-[10px]" onClick={() => toggleRole(user.user_id, role, user.roles.includes(role))}>
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
