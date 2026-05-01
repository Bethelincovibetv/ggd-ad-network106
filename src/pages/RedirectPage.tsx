import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ExternalLink } from 'lucide-react';

const detectDevice = (ua: string) => {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
};

const RedirectPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setError('Invalid link'); return; }
    (async () => {
      const { data, error } = await supabase
        .from('short_links')
        .select('id, target_url, is_active, clicks')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) { setError('Link not found'); return; }
      if (!data.is_active) { setError('This link is no longer active'); return; }

      // Fire-and-forget tracking; don't block redirect
      const ua = navigator.userAgent;
      supabase.from('link_clicks').insert({
        short_link_id: data.id,
        referrer: document.referrer || null,
        user_agent: ua,
        device: detectDevice(ua),
      }).then(() => {});
      supabase.from('short_links').update({ clicks: (data.clicks || 0) + 1 }).eq('id', data.id).then(() => {});

      setTarget(data.target_url);
      // Redirect immediately
      window.location.replace(data.target_url);
    })();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <a href="/" className="text-orange-600 text-sm mt-2 inline-block">Go home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting…</p>
        {target && (
          <a href={target} className="text-xs text-orange-600 inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />Click here if not redirected
          </a>
        )}
      </div>
    </div>
  );
};

export default RedirectPage;
