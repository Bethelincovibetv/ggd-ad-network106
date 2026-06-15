import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, ExternalLink, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { toast } from 'sonner';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const UserEmailCapturePages = () => {
  const { isEnabled, loading } = useFeatureToggles();
  const [pages, setPages] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [sub, setSub] = useState('');
  const [cta, setCta] = useState('Get Free Access');

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('email_capture_pages').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPages(data || []);
  })(); }, []);

  const create = async () => {
    if (!title || !headline) return toast.error('Title and headline required');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const baseSlug = slugify(title) + '-' + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from('email_capture_pages').insert({
      user_id: user.id, slug: baseSlug, title, headline, subheadline: sub, cta_text: cta,
    }).select().single();
    if (error) return toast.error(error.message);
    setPages([data, ...pages]);
    setCreating(false); setTitle(''); setHeadline(''); setSub(''); setCta('Get Free Access');
    toast.success('Page created');
  };

  const del = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    await supabase.from('email_capture_pages').delete().eq('id', id);
    setPages(pages.filter(p => p.id !== id));
  };

  if (loading) return null;
  if (!isEnabled('email_capture_pages')) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Email capture pages are disabled by admin.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-orange-500" />Lead Capture Pages</CardTitle>
          <Button size="sm" onClick={() => setCreating(!creating)} className="bg-gradient-to-r from-orange-500 to-orange-600"><Plus className="h-3 w-3 mr-1" />New</Button>
        </CardHeader>
      </Card>
      {creating && (
        <Card><CardContent className="p-3 space-y-2">
          <Input placeholder="Page title (internal)" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="Big headline" value={headline} onChange={e => setHeadline(e.target.value)} />
          <Textarea placeholder="Subheadline / pitch" rows={2} value={sub} onChange={e => setSub(e.target.value)} />
          <Input placeholder="CTA button text" value={cta} onChange={e => setCta(e.target.value)} />
          <Button onClick={create} className="w-full bg-gradient-to-r from-orange-500 to-orange-600">Create Page</Button>
        </CardContent></Card>
      )}
      {pages.map(p => (
        <Card key={p.id}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground truncate">{p.headline}</div>
                <div className="text-xs mt-1 flex gap-2"><Badge variant="outline">👁 {p.view_count}</Badge><Badge variant="outline">📥 {p.lead_count}</Badge></div>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => window.open(`/lead/${p.slug}`, '_blank')}><ExternalLink className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {pages.length === 0 && !creating && <div className="text-sm text-muted-foreground text-center py-4">No pages yet</div>}
    </div>
  );
};

export default UserEmailCapturePages;