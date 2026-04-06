import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2, Check, X, Search, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CoOwnerApp {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_notes: string | null;
  earning_percentage: number;
  total_earnings: number;
  created_at: string;
  reviewed_at: string | null;
  email?: string;
  display_name?: string;
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
    toast.success(`Co-owner percentage updated to ${percentage}%`);
  };

  const fetchApps = async () => {
    const { data } = await (supabase.from('co_owner_applications' as any) as any).select('*').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }

    const userIds = data.map((a: any) => a.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, display_name').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched = data.map((a: any) => {
      const p = profileMap.get(a.user_id);
      return { ...a, email: p?.email, display_name: p?.display_name };
    });

    setApps(enriched);
    setLoading(false);
  };

  const approve = async (app: CoOwnerApp) => {
    setProcessing(app.id);
    try {
      await (supabase.from('co_owner_applications' as any) as any)
        .update({ status: 'approved', admin_notes: notes[app.id] || null, reviewed_at: new Date().toISOString() })
        .eq('id', app.id);

      // Add co_owner role
      await supabase.from('user_roles').insert({ user_id: app.user_id, role: 'co_owner' as any });

      // Notify user
      await supabase.from('notifications').insert({
        user_id: app.user_id,
        title: '🎉 Co-Owner Approved!',
        message: `Congratulations! Your co-owner application has been approved. You now earn ${app.earning_percentage}% of all platform revenue automatically to your bank account.`,
        type: 'co_owner',
      });

      toast.success('Co-owner approved!');
      fetchApps();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing('');
    }
  };

  const reject = async (app: CoOwnerApp) => {
    setProcessing(app.id);
    await (supabase.from('co_owner_applications' as any) as any)
      .update({ status: 'rejected', admin_notes: notes[app.id] || 'Application rejected', reviewed_at: new Date().toISOString() })
      .eq('id', app.id);

    await supabase.from('notifications').insert({
      user_id: app.user_id,
      title: '❌ Co-Owner Application Update',
      message: notes[app.id] || 'Your co-owner application was not approved at this time.',
      type: 'co_owner',
    });

    toast.success('Application rejected');
    setProcessing('');
    fetchApps();
  };

  const filtered = apps.filter(a =>
    !search || a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.account_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.bank_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      {/* Percentage Setting */}
      <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-foreground">Co-Owner Revenue Share %</label>
              <div className="flex gap-2 mt-1">
                <Input type="number" value={percentage} onChange={e => setPercentage(e.target.value)} className="w-24" min="1" max="50" />
                <Button size="sm" onClick={updatePercentage} className="bg-yellow-500 text-white">Save</Button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Co-Owners</p>
              <p className="text-2xl font-bold text-yellow-600">{apps.filter(a => a.status === 'approved').length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search co-owners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Applications */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No co-owner applications yet</CardContent></Card>
      ) : filtered.map(app => (
        <Card key={app.id} className={`border-l-4 ${app.status === 'approved' ? 'border-l-green-500' : app.status === 'rejected' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">{app.display_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{app.email}</p>
              </div>
              <Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}>
                {app.status}
              </Badge>
            </div>

            {/* Bank Details - clearly visible for admin to copy */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground mb-1">Bank Details (copy for Paystack sub-account):</p>
              <div className="grid grid-cols-1 gap-1">
                <p className="text-xs"><span className="text-muted-foreground">Bank:</span> <span className="font-mono font-semibold select-all">{app.bank_name}</span></p>
                <p className="text-xs"><span className="text-muted-foreground">Account:</span> <span className="font-mono font-semibold select-all">{app.account_number}</span></p>
                <p className="text-xs"><span className="text-muted-foreground">Name:</span> <span className="font-mono font-semibold select-all">{app.account_name}</span></p>
              </div>
            </div>

            {app.status === 'approved' && (
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                  <DollarSign className="h-4 w-4 mx-auto text-green-600" />
                  <p className="text-[10px] text-muted-foreground">Earnings</p>
                  <p className="text-sm font-bold text-green-700">₦{(app.total_earnings || 0).toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
                  <TrendingUp className="h-4 w-4 mx-auto text-blue-600" />
                  <p className="text-[10px] text-muted-foreground">Share</p>
                  <p className="text-sm font-bold text-blue-700">{app.earning_percentage}%</p>
                </div>
              </div>
            )}

            {app.status === 'pending' && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes[app.id] || ''}
                  onChange={e => setNotes({ ...notes, [app.id]: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(app)} disabled={processing === app.id}
                    className="flex-1 bg-green-600 text-white text-xs">
                    {processing === app.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Approve Co-Owner
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => reject(app)} disabled={processing === app.id} className="flex-1 text-xs">
                    <X className="h-3 w-3 mr-1" />Reject
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminCoOwnerManager;
