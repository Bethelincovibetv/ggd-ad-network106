import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Loader2, Check, X, Search, DollarSign, TrendingUp, Users, Wallet, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CoOwnerApp {
  id: string; user_id: string; bank_name: string; account_number: string;
  account_name: string; status: string; admin_notes: string | null;
  earning_percentage: number; total_earnings: number; created_at: string;
  reviewed_at: string | null; email?: string; display_name?: string; avatar_url?: string;
}

const AdminCoOwnerManager = () => {
  const [apps, setApps] = useState<CoOwnerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [percentage, setPercentage] = useState('5');
  const [processing, setProcessing] = useState('');

  useEffect(() => { fetchApps(); fetchPercentage(); }, []);

  const fetchPercentage = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'co_owner_percentage').maybeSingle();
    if (data) setPercentage(data.value);
  };
  const updatePercentage = async () => {
    await supabase.from('app_settings').update({ value: percentage }).eq('key', 'co_owner_percentage');
    toast.success(`Revenue share updated to ${percentage}%`);
  };

  const fetchApps = async () => {
    const { data } = await (supabase.from('co_owner_applications' as any) as any).select('*').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const userIds = data.map((a: any) => a.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, display_name, avatar_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    setApps(data.map((a: any) => { const p = profileMap.get(a.user_id); return { ...a, email: p?.email, display_name: p?.display_name, avatar_url: p?.avatar_url }; }));
    setLoading(false);
  };

  const approve = async (app: CoOwnerApp) => {
    setProcessing(app.id);
    try {
      await (supabase.from('co_owner_applications' as any) as any).update({ status: 'approved', admin_notes: notes[app.id] || null, reviewed_at: new Date().toISOString() }).eq('id', app.id);
      await supabase.from('user_roles').insert({ user_id: app.user_id, role: 'co_owner' as any });
      await supabase.from('notifications').insert({ user_id: app.user_id, title: '🎉 Co-Owner Approved!', message: `You now earn ${app.earning_percentage}% of all platform revenue.`, type: 'co_owner' });
      toast.success('Co-owner approved!');
      fetchApps();
    } catch (err: any) { toast.error(err.message); } finally { setProcessing(''); }
  };

  const reject = async (app: CoOwnerApp) => {
    setProcessing(app.id);
    await (supabase.from('co_owner_applications' as any) as any).update({ status: 'rejected', admin_notes: notes[app.id] || 'Rejected', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.from('notifications').insert({ user_id: app.user_id, title: '❌ Co-Owner Update', message: notes[app.id] || 'Not approved at this time.', type: 'co_owner' });
    toast.success('Rejected');
    setProcessing('');
    fetchApps();
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  const filtered = apps.filter(a => !search || a.email?.toLowerCase().includes(search.toLowerCase()) || a.account_name?.toLowerCase().includes(search.toLowerCase()));
  const approvedCount = apps.filter(a => a.status === 'approved').length;
  const pendingCount = apps.filter(a => a.status === 'pending').length;
  const totalEarnings = apps.reduce((s, a) => s + (a.total_earnings || 0), 0);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <Crown className="h-8 w-8 mb-2 drop-shadow-lg" />
        <h3 className="text-base font-black">Co-Owner Hub</h3>
        <p className="text-[11px] opacity-80">Manage revenue-sharing partners</p>
        <div className="grid grid-cols-3 gap-2 mt-4 relative">
          {[
            { label: 'Active', value: approvedCount, icon: Users },
            { label: 'Pending', value: pendingCount, icon: Crown },
            { label: 'Paid Out', value: `₦${totalEarnings.toLocaleString()}`, icon: Wallet },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
              <s.icon className="h-4 w-4 mx-auto mb-1 opacity-80" />
              <p className="text-lg font-black leading-none">{s.value}</p>
              <p className="text-[9px] opacity-80 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Share Setting */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500 text-white grid place-items-center shadow"><TrendingUp className="h-5 w-5" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Revenue Share %</p>
            <p className="text-[10px] text-muted-foreground">Percentage each co-owner earns</p>
          </div>
          <div className="flex gap-2 items-center">
            <Input type="number" value={percentage} onChange={e => setPercentage(e.target.value)} className="w-20 h-9 rounded-lg text-center font-bold" min="1" max="50" />
            <Button size="sm" onClick={updatePercentage} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl h-9 shadow-md">Save</Button>
          </div>
        </div>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search co-owners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11 rounded-xl bg-secondary/50 border-0" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3"><Crown className="h-8 w-8 text-amber-400" /></div>
          <p className="text-sm font-semibold text-foreground">No co-owner applications</p>
        </div>
      ) : filtered.map(app => (
        <Card key={app.id} className="border-0 shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div className={`p-4 flex items-center gap-3 ${app.status === 'approved' ? 'bg-gradient-to-r from-emerald-50 to-green-50' : app.status === 'rejected' ? 'bg-gradient-to-r from-red-50 to-pink-50' : 'bg-gradient-to-r from-amber-50 to-orange-50'}`}>
              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                <AvatarImage src={app.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
                  {(app.display_name || app.email || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{app.display_name || 'User'}</p>
                <p className="text-[11px] text-muted-foreground truncate">{app.email}</p>
              </div>
              <Badge className={`rounded-full text-[10px] px-2.5 border-0 ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {app.status}
              </Badge>
            </div>

            <div className="p-4 space-y-3">
              {/* Bank details with copy */}
              <div className="bg-secondary/40 rounded-xl p-3 space-y-1.5">
                <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Bank Details</p>
                {[
                  { label: 'Bank', value: app.bank_name },
                  { label: 'Account', value: app.account_number },
                  { label: 'Name', value: app.account_name },
                ].map(d => (
                  <div key={d.label} className="flex items-center justify-between">
                    <p className="text-xs"><span className="text-muted-foreground">{d.label}:</span> <span className="font-mono font-semibold text-foreground">{d.value}</span></p>
                    <button onClick={() => copyText(d.value)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>

              {app.status === 'approved' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                    <p className="text-[9px] text-muted-foreground">Earnings</p>
                    <p className="text-base font-black text-emerald-700">₦{(app.total_earnings || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-[9px] text-muted-foreground">Share</p>
                    <p className="text-base font-black text-blue-700">{app.earning_percentage}%</p>
                  </div>
                </div>
              )}

              {app.status === 'pending' && (
                <div className="space-y-2">
                  <Textarea placeholder="Admin notes (optional)" value={notes[app.id] || ''} onChange={e => setNotes({ ...notes, [app.id]: e.target.value })} rows={2} className="text-xs rounded-xl" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(app)} disabled={processing === app.id}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs rounded-xl h-11 shadow-md font-semibold">
                      {processing === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(app)} disabled={processing === app.id} className="flex-1 text-xs rounded-xl h-11 font-semibold">
                      <X className="h-3.5 w-3.5 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-right">Applied {new Date(app.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminCoOwnerManager;
