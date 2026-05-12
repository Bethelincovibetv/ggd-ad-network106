import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import ggdLogo from '@/assets/ggd-logo.png';

const SharePreviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [task, setTask] = useState<any>(null);
  const [linkRow, setLinkRow] = useState<any>(null);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: link } = await supabase
        .from('task_share_links')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (!link) { setError('Link not found'); return; }
      setLinkRow(link);

      const { data: t } = await supabase
        .from('tasks')
        .select('id,title,description,share_url,flyer_url,creator_id')
        .eq('id', link.task_id)
        .maybeSingle();
      if (!t) { setError('Campaign no longer available'); return; }

      // Fetch creator/business attribution
      let creator: any = null;
      if (t.creator_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, display_name, business_name, business_logo_url, avatar_url, business_slug')
          .eq('user_id', t.creator_id)
          .maybeSingle();
        creator = profile;
      }
      setTask({ ...t, creator });

      // Update OG/SEO tags so socials show the banner
      document.title = `${t.title} | GGD AD NETWORK`;
      const setMeta = (prop: string, content: string, isProp = true) => {
        const sel = isProp ? `meta[property="${prop}"]` : `meta[name="${prop}"]`;
        let el = document.head.querySelector(sel) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          if (isProp) el.setAttribute('property', prop); else el.setAttribute('name', prop);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };
      setMeta('og:title', t.title);
      setMeta('og:description', t.description || 'Check this out on GGD AD NETWORK');
      if (t.flyer_url) setMeta('og:image', t.flyer_url);
      setMeta('og:type', 'website');
      setMeta('description', t.description || 'Promoted via GGD AD NETWORK', false);

      // Log click + increment counter
      await supabase.from('task_share_clicks').insert({
        share_link_id: link.id,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
      await supabase
        .from('task_share_links')
        .update({ clicks: (link.clicks || 0) + 1 })
        .eq('id', link.id);
    };
    load();
  }, [slug]);

  useEffect(() => {
    const destination = typeof task?.share_url === 'string' ? task.share_url.trim() : '';
    if (!/^https?:\/\//i.test(destination)) return;
    if (countdown <= 0) {
      window.location.assign(destination);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, task]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="text-center space-y-3">
          <img src={ggdLogo} alt="GGD" className="h-14 w-14 mx-auto rounded-xl" />
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <a href="/" className="text-sm text-orange-600 underline">Back to GGD AD NETWORK</a>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const safeShareUrl = typeof task.share_url === 'string' ? task.share_url.trim() : '';
  const canRedirect = /^https?:\/\//i.test(safeShareUrl);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
          <span className="text-white font-black tracking-wide">GGD AD NETWORK</span>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          {task.flyer_url && (
            <img src={task.flyer_url} alt={task.title} className="w-full h-64 object-cover" />
          )}
          <div className="p-5 space-y-3">
            {task.creator && (
              <a
                href={task.creator.business_slug ? `/business/${task.creator.business_slug}` : `/user/${task.creator.user_id}`}
                className="flex items-center gap-2 pb-2 border-b border-gray-100 hover:opacity-80"
              >
                {(task.creator.business_logo_url || task.creator.avatar_url) ? (
                  <img
                    src={task.creator.business_logo_url || task.creator.avatar_url}
                    alt={task.creator.business_name || task.creator.display_name || 'Creator'}
                    className="h-9 w-9 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-white font-bold text-sm">
                    {(task.creator.business_name || task.creator.display_name || 'G')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-500 leading-none">Posted by</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {task.creator.business_name || task.creator.display_name || 'GGD User'}
                  </p>
                </div>
              </a>
            )}
            <h1 className="text-xl font-black text-gray-900">{task.title}</h1>
            {task.description && <p className="text-sm text-gray-600">{task.description}</p>}

            {canRedirect ? <a
              href={safeShareUrl}
              className="block w-full text-center bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 rounded-2xl shadow-lg active:scale-95 transition"
            >
              <ExternalLink className="h-4 w-4 inline mr-2" />Continue Now
            </a> : <div className="rounded-2xl bg-orange-50 border border-orange-200 px-3 py-2 text-orange-700 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>This campaign has no valid destination link yet.</span>
            </div>}

            {canRedirect && <p className="text-xs text-center text-gray-500">
              Auto-redirecting in <span className="font-bold text-orange-600">{countdown}</span>s…
            </p>}
          </div>
          <div className="bg-gray-50 px-4 py-2 text-center border-t">
            <p className="text-[10px] text-gray-500">
              Sponsored · Powered by <span className="font-semibold">GGD AD NETWORK</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePreviewPage;