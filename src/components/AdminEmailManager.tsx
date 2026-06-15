import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Activity, ListChecks, BarChart3, Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminEmailManager = () => {
  return (
    <Tabs defaultValue="send" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 bg-muted/40">
        <TabsTrigger value="send"><Send className="h-3.5 w-3.5 mr-1" />Send</TabsTrigger>
        <TabsTrigger value="activity"><Activity className="h-3.5 w-3.5 mr-1" />Activity</TabsTrigger>
        <TabsTrigger value="campaigns"><ListChecks className="h-3.5 w-3.5 mr-1" />Campaigns</TabsTrigger>
        <TabsTrigger value="logs"><BarChart3 className="h-3.5 w-3.5 mr-1" />Logs</TabsTrigger>
      </TabsList>
      <TabsContent value="send"><AdminSendEmail /></TabsContent>
      <TabsContent value="activity"><AdminActivityToggles /></TabsContent>
      <TabsContent value="campaigns"><AdminCampaignsReview /></TabsContent>
      <TabsContent value="logs"><AdminEmailLogs /></TabsContent>
    </Tabs>
  );
};

const AdminSendEmail: React.FC = () => {
  const [mode, setMode] = useState<'all' | 'specific'>('all');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (search.length >= 2) supabase.from('profiles').select('user_id,email,display_name').or(`email.ilike.%${search}%,display_name.ilike.%${search}%`).limit(10).then(({ data }) => setUsers(data || []));
    else setUsers([]);
  }, [search]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) return toast.error('Subject and body required');
    setSending(true);
    try {
      const html = `<!doctype html><html><body style="margin:0;background:#0f0f0f;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;max-width:600px"><tr><td style="background:linear-gradient(135deg,#e67e22,#d35400);padding:20px 24px;color:#fff;font-weight:700">GGD Ad Network</td></tr><tr><td style="padding:28px 24px;color:#eee"><h1 style="margin:0 0 12px;color:#fff">${subject}</h1><div style="line-height:1.6;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</div></td></tr></table></td></tr></table></body></html>`;
      let recipients: string[] = [];
      let recipientIds: (string | null)[] = [];
      if (mode === 'specific') {
        if (!selected) return toast.error('Pick a user');
        recipients = [selected.email]; recipientIds = [selected.user_id];
      } else {
        const { data } = await supabase.from('profiles').select('user_id,email').not('email', 'is', null);
        recipients = (data || []).map(d => d.email);
        recipientIds = (data || []).map(d => d.user_id);
      }
      let ok = 0, fail = 0;
      for (let i = 0; i < recipients.length; i++) {
        const r = await supabase.functions.invoke('send-email-gmail', {
          body: { to: recipients[i], subject, html, source: 'admin', recipient_user_id: recipientIds[i] },
        });
        if (r.error || (r.data as any)?.ok === false) fail++; else ok++;
      }
      toast.success(`Sent ${ok}, failed ${fail}`);
      setSubject(''); setBody(''); setSelected(null);
    } finally { setSending(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-orange-500" />Send Email via Gmail</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button size="sm" variant={mode === 'all' ? 'default' : 'outline'} onClick={() => { setMode('all'); setSelected(null); }}>All users</Button>
          <Button size="sm" variant={mode === 'specific' ? 'default' : 'outline'} onClick={() => setMode('specific')}>Specific user</Button>
        </div>
        {mode === 'specific' && (
          selected ? (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded border border-green-500/30">
              <User className="h-4 w-4 text-green-500" />
              <span className="text-sm">{selected.display_name || selected.email}</span>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(null)}>change</Button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search user…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {users.length > 0 && (
                <div className="border rounded mt-2 divide-y max-h-48 overflow-auto">
                  {users.map(u => (
                    <button key={u.user_id} onClick={() => { setSelected(u); setUsers([]); setSearch(''); }} className="w-full text-left p-2 text-sm hover:bg-muted">
                      {u.display_name || u.email} <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        <Input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <Textarea placeholder="Message body…" rows={6} value={body} onChange={e => setBody(e.target.value)} />
        <Button onClick={send} disabled={sending} className="w-full bg-gradient-to-r from-orange-500 to-orange-600">
          <Send className="h-4 w-4 mr-2" />{sending ? 'Sending…' : mode === 'all' ? 'Send to All Users' : `Send to ${selected?.display_name || 'user'}`}
        </Button>
      </CardContent>
    </Card>
  );
};

const AdminActivityToggles: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from('email_activity_types').select('*').order('category').order('label').then(({ data }) => setItems(data || [])); }, []);
  const toggle = async (id: string, current: boolean) => {
    await supabase.from('email_activity_types').update({ is_enabled: !current }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_enabled: !current } : i));
    toast.success('Updated');
  };
  const cats = ['core', 'engagement', 'all'];
  return (
    <div className="space-y-4">
      {cats.map(cat => (
        <Card key={cat}>
          <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{cat} activity emails</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.filter(i => i.category === cat).map(i => (
              <div key={i.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{i.label}</div>
                  {i.description && <div className="text-xs text-muted-foreground">{i.description}</div>}
                </div>
                <Switch checked={i.is_enabled} onCheckedChange={() => toggle(i.id, i.is_enabled)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const AdminCampaignsReview: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  useEffect(() => { supabase.from('email_campaigns').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setCampaigns(data || [])); }, []);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">All Campaigns</CardTitle></CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-auto">
        {campaigns.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No campaigns yet</div>}
        {campaigns.map(c => (
          <div key={c.id} className="p-3 border rounded">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{c.name}</div>
              <Badge variant={c.status === 'sent' ? 'default' : 'secondary'}>{c.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{c.subject}</div>
            <div className="text-xs mt-1">📤 {c.sent_count}/{c.recipient_count} · ❌ {c.failed_count} · 💰 {c.credit_cost} cr</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const AdminEmailLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0 });
  useEffect(() => {
    supabase.from('email_send_log').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      const d = data || []; setLogs(d);
      setStats({ sent: d.filter(x => x.status === 'sent').length, failed: d.filter(x => x.status === 'failed').length, total: d.length });
    });
  }, []);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-green-500">{stats.sent}</div><div className="text-xs text-muted-foreground">Sent</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold text-red-500">{stats.failed}</div><div className="text-xs text-muted-foreground">Failed</div></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><div className="text-xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total (last 100)</div></CardContent></Card>
      </div>
      <Card><CardContent className="p-2 max-h-[400px] overflow-auto space-y-1">
        {logs.map(l => (
          <div key={l.id} className="text-xs p-2 border rounded flex items-center gap-2">
            <Badge variant={l.status === 'sent' ? 'default' : 'destructive'} className="text-[9px]">{l.status}</Badge>
            <Badge variant="outline" className="text-[9px]">{l.source}</Badge>
            <span className="truncate flex-1">{l.recipient_email}</span>
            <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
};

export default AdminEmailManager;