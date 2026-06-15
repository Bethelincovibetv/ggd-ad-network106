import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Plus, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { toast } from 'sonner';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

const UserEmailCampaigns = () => {
  const { isEnabled, loading } = useFeatureToggles();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<'list' | 'create'>('list');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [credits, setCredits] = useState(0);
  const [pricePerRecipient, setPricePerRecipient] = useState(1);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [targetMode, setTargetMode] = useState<'opted_in' | 'filter' | 'upload'>('opted_in');
  const [states, setStates] = useState<string[]>([]);
  const [uploadEmails, setUploadEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [estimate, setEstimate] = useState({ count: 0, cost: 0 });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: cs }, { data: prof }, { data: setting }, { data: ft }] = await Promise.all([
      supabase.from('email_campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('credits').eq('user_id', user.id).single(),
      supabase.from('app_settings').select('value').eq('key', 'email_campaign_credit_per_recipient').maybeSingle(),
      supabase.from('feature_toggles').select('feature_key,is_enabled'),
    ]);
    setCampaigns(cs || []);
    setCredits(prof?.credits || 0);
    setPricePerRecipient(parseInt(setting?.value || '1') || 1);
    const map: Record<string, boolean> = {};
    (ft || []).forEach(f => { map[f.feature_key] = f.is_enabled; });
    setFeatures(map);
  })(); }, []);

  const calcEstimate = async () => {
    if (targetMode === 'upload') {
      const list = uploadEmails.split(/[\n,]+/).map(s => s.trim()).filter(s => /.+@.+\..+/.test(s));
      setEstimate({ count: list.length, cost: list.length * pricePerRecipient });
      return;
    }
    let q = supabase.from('profiles').select('user_id,email', { count: 'exact', head: false });
    if (targetMode === 'filter' && states.length) q = q.in('state', states);
    const { data: profs } = await q;
    const ids = (profs || []).map(p => p.user_id);
    const { data: prefs } = await supabase.from('user_email_preferences').select('user_id,opted_in').eq('activity_key', 'marketing_promo').in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    const opted = new Set((prefs || []).filter(p => p.opted_in).map(p => p.user_id));
    const count = (profs || []).filter(p => opted.has(p.user_id) && p.email).length;
    setEstimate({ count, cost: count * pricePerRecipient });
  };

  useEffect(() => { if (step === 'create') calcEstimate(); /* eslint-disable-next-line */ }, [targetMode, states, uploadEmails, step]);

  const aiDesign = async () => {
    if (!subject.trim()) return toast.error('Enter a subject first');
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-business-hero', {
        body: { businessName: 'Email Promotion', context: `Design a beautiful, professional promotional email about: "${subject}". Return ONLY a single HTML document with inline CSS, dark theme, orange (#e67e22) accent gradients, max 600px container, hero header, body section, and an orange CTA button. No markdown, no commentary.` },
      });
      if (error) throw error;
      const html = (data as any)?.html || (data as any)?.content || '';
      if (html) setBodyHtml(html.replace(/```html|```/g, '').trim());
      else toast.error('AI returned empty');
    } catch (e: any) { toast.error('AI failed: ' + e.message); }
    finally { setGenerating(false); }
  };

  const launch = async () => {
    if (!name || !subject || !bodyHtml) return toast.error('Fill name, subject, body');
    if (estimate.count === 0) return toast.error('No recipients matched');
    if (estimate.cost > credits) return toast.error(`Insufficient credits. Need ${estimate.cost}, have ${credits}`);
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploaded = targetMode === 'upload'
        ? uploadEmails.split(/[\n,]+/).map(s => s.trim()).filter(s => /.+@.+\..+/.test(s))
        : null;
      const { data: c, error } = await supabase.from('email_campaigns').insert({
        user_id: user!.id, name, subject, html_body: bodyHtml, preview_text: previewText,
        target_mode: targetMode,
        filter_states: targetMode === 'filter' && states.length ? states : null,
        uploaded_emails: uploaded,
        status: 'draft',
      }).select().single();
      if (error) throw error;
      const r = await supabase.functions.invoke('send-email-campaign', { body: { campaign_id: c.id } });
      if (r.error || (r.data as any)?.error) throw new Error((r.data as any)?.error || r.error?.message);
      const out = r.data as any;
      toast.success(`Campaign sent! ${out.sent}/${out.total} delivered (cost ${out.cost} credits)`);
      setStep('list'); setName(''); setSubject(''); setBodyHtml(''); setUploadEmails(''); setStates([]);
      const { data: cs } = await supabase.from('email_campaigns').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      setCampaigns(cs || []);
      const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', user!.id).single();
      setCredits(prof?.credits || 0);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSending(false); }
  };

  if (loading) return null;
  if (!isEnabled('email_campaigns')) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Email campaigns are currently disabled by admin.</CardContent></Card>;
  }

  if (step === 'list') {
    return (
      <div className="space-y-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-orange-500" />Email Campaigns</CardTitle>
            <Button size="sm" onClick={() => setStep('create')} className="bg-gradient-to-r from-orange-500 to-orange-600"><Plus className="h-3 w-3 mr-1" />New</Button>
          </CardHeader>
          <CardContent className="text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Cost: {pricePerRecipient} credit per recipient</span>
              <span>Your credits: <b className="text-orange-500">{credits}</b></span>
            </div>
          </CardContent>
        </Card>
        {campaigns.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No campaigns yet</div>}
        {campaigns.map(c => (
          <Card key={c.id}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.subject}</div>
                </div>
                <Badge variant={c.status === 'sent' ? 'default' : 'secondary'}>{c.status}</Badge>
              </div>
              <div className="text-xs mt-2 flex gap-3 text-muted-foreground">
                <span>✅ {c.sent_count}/{c.recipient_count}</span>
                <span>❌ {c.failed_count}</span>
                <span>💰 {c.credit_cost} cr</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">New Campaign</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setStep('list')}>Cancel</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Campaign name (internal)" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} />
        <Input placeholder="Preview text (optional)" value={previewText} onChange={e => setPreviewText(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={aiDesign} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
            AI design beautiful email
          </Button>
        </div>
        <Textarea rows={10} placeholder="HTML email body (or use AI design above)" value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} className="font-mono text-xs" />
        {bodyHtml && (
          <div className="border rounded p-2 bg-white max-h-64 overflow-auto">
            <iframe srcDoc={bodyHtml} className="w-full h-60 border-0" title="preview" />
          </div>
        )}
        <div>
          <Label className="text-xs">Target audience</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            <Button size="sm" variant={targetMode === 'opted_in' ? 'default' : 'outline'} onClick={() => setTargetMode('opted_in')}>All opted-in users</Button>
            <Button size="sm" variant={targetMode === 'filter' ? 'default' : 'outline'} onClick={() => setTargetMode('filter')}>Filter by state</Button>
            {features.email_custom_upload_list && (
              <Button size="sm" variant={targetMode === 'upload' ? 'default' : 'outline'} onClick={() => setTargetMode('upload')}>Upload list</Button>
            )}
          </div>
        </div>
        {targetMode === 'filter' && (
          <div className="flex flex-wrap gap-1 max-h-32 overflow-auto p-2 border rounded">
            {NIGERIAN_STATES.map(s => (
              <Badge key={s} variant={states.includes(s) ? 'default' : 'outline'} className="cursor-pointer text-xs"
                onClick={() => setStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
                {s}
              </Badge>
            ))}
          </div>
        )}
        {targetMode === 'upload' && (
          <Textarea rows={4} placeholder="Paste emails (one per line or comma-separated)" value={uploadEmails} onChange={e => setUploadEmails(e.target.value)} />
        )}
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded">
          <div className="flex justify-between text-sm">
            <span>Recipients: <b>{estimate.count}</b></span>
            <span>Cost: <b className="text-orange-500">{estimate.cost} credits</b></span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Your balance: {credits} credits</div>
        </div>
        <Button onClick={launch} disabled={sending || estimate.count === 0 || estimate.cost > credits} className="w-full bg-gradient-to-r from-orange-500 to-orange-600">
          <Send className="h-4 w-4 mr-2" />{sending ? 'Sending…' : `Send Campaign (${estimate.cost} credits)`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserEmailCampaigns;