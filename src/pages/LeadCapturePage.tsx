import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

const LeadCapturePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { (async () => {
    if (!slug) return;
    const { data } = await supabase.from('email_capture_pages').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
    setPage(data); setLoading(false);
    if (data) supabase.from('email_capture_pages').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);
  })(); }, [slug]);

  const submit = async () => {
    if (!/.+@.+\..+/.test(email)) return toast.error('Valid email required');
    setSubmitting(true);
    const { error } = await supabase.from('email_capture_leads').insert({
      page_id: page.id, owner_user_id: page.user_id, email: email.trim().toLowerCase(), name: name || null,
    });
    if (!error) {
      await supabase.from('email_capture_pages').update({ lead_count: (page.lead_count || 0) + 1 }).eq('id', page.id);
      setDone(true);
    } else toast.error(error.message);
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>;
  if (!page) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Page not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-orange-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900/80 backdrop-blur border border-orange-500/20 rounded-2xl p-8 shadow-2xl">
        {done ? (
          <div className="text-center text-white">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">You're in! 🎉</h1>
            <p className="text-zinc-400">Check your inbox shortly.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">{page.headline}</h1>
              {page.subheadline && <p className="text-zinc-300 mt-3">{page.subheadline}</p>}
            </div>
            <div className="space-y-3">
              <Input placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
              <Input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
              <Button onClick={submit} disabled={submitting} className="w-full h-12 text-base bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : page.cta_text}
              </Button>
              <p className="text-xs text-zinc-500 text-center">We respect your privacy. Unsubscribe anytime.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadCapturePage;