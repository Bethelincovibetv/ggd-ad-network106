import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Copy, Trash2, BarChart3, Plus, Loader2, MousePointerClick, ExternalLink, Smartphone, Monitor, Globe, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type ShortLink = {
  id: string;
  slug: string;
  target_url: string;
  title: string | null;
  link_type: string;
  clicks: number;
  is_active: boolean;
  created_at: string;
};

const generateSlug = () => Math.random().toString(36).substring(2, 8);

const LinkShortener = () => {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', target_url: '', link_type: 'website', custom_slug: '' });
  const [analyticsLink, setAnalyticsLink] = useState<ShortLink | null>(null);
  const [clicks, setClicks] = useState<any[]>([]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('short_links').select('*').order('created_at', { ascending: false });
    setLinks((data as ShortLink[]) || []);
    setLoading(false);
  };

  const buildWhatsappUrl = (raw: string) => {
    // If user pastes a phone number, build wa.me link
    const digits = raw.replace(/[^\d+]/g, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    if (digits.length >= 7) return `https://wa.me/${digits.replace('+', '')}`;
    return raw;
  };

  const create = async () => {
    if (!form.target_url.trim()) { toast.error('Enter a destination URL or phone'); return; }
    let target = form.target_url.trim();
    if (form.link_type === 'whatsapp') target = buildWhatsappUrl(target);
    else if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

    const slug = (form.custom_slug.trim() || generateSlug())
      .toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || generateSlug();

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); toast.error('Login required'); return; }

    const { error } = await supabase.from('short_links').insert({
      user_id: user.id,
      slug,
      target_url: target.slice(0, 2000),
      title: form.title.trim().slice(0, 120) || null,
      link_type: form.link_type,
    });
    setCreating(false);
    if (error) {
      if (error.message.includes('duplicate')) toast.error('That slug is taken — try another');
      else toast.error('Failed to create link');
      return;
    }
    toast.success('Short link created');
    setForm({ title: '', target_url: '', link_type: 'website', custom_slug: '' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this short link? Click history will also be removed.')) return;
    await supabase.from('short_links').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const toggle = async (link: ShortLink) => {
    await supabase.from('short_links').update({ is_active: !link.is_active }).eq('id', link.id);
    load();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  const openAnalytics = async (link: ShortLink) => {
    setAnalyticsLink(link);
    const { data } = await supabase
      .from('link_clicks')
      .select('*')
      .eq('short_link_id', link.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setClicks(data || []);
  };

  const totalClicks = links.reduce((s, l) => s + (l.clicks || 0), 0);

  if (loading) return <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Hero */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5 text-white relative">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90"><Link2 className="h-3.5 w-3.5" /> Smart Links</div>
            <p className="text-3xl font-black mt-2">{totalClicks.toLocaleString()}</p>
            <p className="text-[11px] opacity-80">total clicks across {links.length} link{links.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </Card>

      {/* Create form */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Create short link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Link type</Label>
            <Select value={form.link_type} onValueChange={v => setForm({ ...form, link_type: v })}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="website"><Globe className="h-3 w-3 inline mr-1" />Website</SelectItem>
                <SelectItem value="whatsapp"><MessageCircle className="h-3 w-3 inline mr-1" />WhatsApp chat</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Title (optional)</Label>
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lagos campaign" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{form.link_type === 'whatsapp' ? 'Phone number or WhatsApp link' : 'Destination URL'}</Label>
            <Input value={form.target_url} onChange={e => setForm({ ...form, target_url: e.target.value })}
              placeholder={form.link_type === 'whatsapp' ? '+2348012345678' : 'https://yourwebsite.com'} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Custom slug (optional)</Label>
            <div className="flex gap-2 mt-1">
              <span className="text-xs text-muted-foreground self-center max-w-[40%] truncate">{origin}/r/</span>
              <Input value={form.custom_slug} onChange={e => setForm({ ...form, custom_slug: e.target.value })} placeholder="auto" className="flex-1" />
            </div>
          </div>
          <Button onClick={create} disabled={creating} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Create link
          </Button>
        </CardContent>
      </Card>

      {/* Link list */}
      <div className="space-y-3">
        {links.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Link2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No links yet — create your first one above.</p>
          </CardContent></Card>
        )}
        {links.map(link => {
          const shortUrl = `${origin}/r/${link.slug}`;
          return (
            <Card key={link.id} className={link.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {link.title && <p className="text-sm font-semibold text-foreground truncate">{link.title}</p>}
                    <button onClick={() => copy(shortUrl)} className="text-[12px] text-blue-600 font-mono break-all text-left">
                      {shortUrl}
                    </button>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">→ {link.target_url}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">
                    {link.link_type === 'whatsapp' ? <MessageCircle className="h-2.5 w-2.5 mr-0.5" /> : <Globe className="h-2.5 w-2.5 mr-0.5" />}
                    {link.link_type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    <strong className="text-foreground">{link.clicks}</strong> clicks
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => openAnalytics(link)}>
                      <BarChart3 className="h-3 w-3 mr-1" />Analytics
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => copy(shortUrl)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => window.open(shortUrl, '_blank')}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => toggle(link)}>
                      {link.is_active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => remove(link.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!analyticsLink} onOpenChange={o => { if (!o) { setAnalyticsLink(null); setClicks([]); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">Link analytics</DialogTitle></DialogHeader>
          {analyticsLink && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-[9px] uppercase text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{analyticsLink.clicks}</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-[9px] uppercase text-muted-foreground">Mobile</p>
                  <p className="text-lg font-bold">{clicks.filter(c => c.device === 'mobile').length}</p>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <p className="text-[9px] uppercase text-muted-foreground">Desktop</p>
                  <p className="text-lg font-bold">{clicks.filter(c => c.device === 'desktop').length}</p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {clicks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No clicks yet</p>}
                {clicks.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-[11px] p-2 bg-muted/40 rounded">
                    {c.device === 'mobile' ? <Smartphone className="h-3 w-3 text-blue-600" /> : <Monitor className="h-3 w-3 text-indigo-600" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate">{c.referrer || 'Direct'}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LinkShortener;
