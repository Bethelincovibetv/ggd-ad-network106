import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, AlertTriangle, Download, Megaphone, Sparkles } from "lucide-react";
import ggdLogo from '@/assets/ggd-logo.png';
import MetaTags from '@/components/MetaTags';

const SharePreviewPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [task, setTask] = useState<any>(null);
  const [linkRow, setLinkRow] = useState<any>(null);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [sponsoredAd, setSponsoredAd] = useState<any>(null);
  const adImpressionLogged = useRef(false);

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

      // Fetch active sponsored banner ad
      try {
        const { data: adsList } = await supabase
          .from('ads')
          .select('id, title, description, image_url, target_url, impressions, clicks')
          .eq('is_active', true)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (adsList && adsList.length > 0) {
          const randomAd = adsList[Math.floor(Math.random() * adsList.length)];
          setSponsoredAd(randomAd);
          if (!adImpressionLogged.current) {
            adImpressionLogged.current = true;
            supabase.from('ads').update({ impressions: (randomAd.impressions || 0) + 1 }).eq('id', randomAd.id).then(() => {});
            supabase.from('ad_events').insert({ ad_id: randomAd.id, event_type: 'impression' }).then(() => {});
          }
        } else {
          // Default Network Sponsored Banner if no custom ad exists yet
          setSponsoredAd({
            id: 'network-banner',
            title: 'Boost Your Brand on GGD Ad Network',
            description: 'Get guaranteed real human traffic, WhatsApp broadcasts, and high-converting clicks across thousands of promoters.',
            image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
            target_url: 'https://ggdadnetwork.com',
          });
        }
      } catch (err) {
        // graceful ad loading
      }

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

  const handleSponsoredAdClick = async () => {
    if (!sponsoredAd || sponsoredAd.id === 'network-banner') return;
    try {
      await supabase.from('ads').update({ clicks: (sponsoredAd.clicks || 0) + 1 }).eq('id', sponsoredAd.id);
      await supabase.from('ad_events').insert({ ad_id: sponsoredAd.id, event_type: 'click' });
    } catch {
      // safe fallback
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <div className="text-center space-y-3">
          <img loading="lazy" src={ggdLogo} alt="GGD" className="h-14 w-14 mx-auto rounded-xl" />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex flex-col items-center justify-center p-3 sm:p-5">
      <MetaTags
        title={`${task.title} | GGD AD NETWORK`}
        description={task.description || 'Promoted campaign on GGD AD NETWORK.'}
        imageUrl={task.flyer_url}
        badge="SYNDICATE CAMPAIGN"
      />
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img loading="lazy" src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
          <span className="text-white font-black tracking-wide text-base">GGD AD NETWORK</span>
        </div>

        <div className="bg-white dark:bg-card rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          {/* Main Campaign Flyer Banner — Full Flyer without cropping */}
          {task.flyer_url && (
            <div className="w-full bg-black/5 dark:bg-black/30 border-b border-border/40 flex items-center justify-center overflow-hidden">
              <img
                loading="lazy"
                src={task.flyer_url}
                alt={task.title}
                className="w-full h-auto max-h-[520px] object-contain block"
              />
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-4">
            {task.creator && (
              <a
                href={task.creator.business_slug ? `/business/${task.creator.business_slug}` : `/user/${task.creator.user_id}`}
                className="flex items-center gap-2.5 pb-3 border-b border-border/40 hover:opacity-80 transition-opacity"
              >
                {(task.creator.business_logo_url || task.creator.avatar_url) ? (
                  <img
                    loading="lazy"
                    src={task.creator.business_logo_url || task.creator.avatar_url}
                    alt={task.creator.business_name || task.creator.display_name || 'Creator'}
                    className="h-10 w-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-white font-bold text-sm shadow-sm">
                    {(task.creator.business_name || task.creator.display_name || 'G')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none">Promoted by</p>
                  <p className="text-sm font-bold text-foreground truncate mt-0.5">
                    {task.creator.business_name || task.creator.display_name || 'GGD User'}
                  </p>
                </div>
              </a>
            )}

            <div>
              <h1 className="text-lg sm:text-xl font-black text-foreground leading-snug">{task.title}</h1>
              {task.description && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              )}
            </div>

            {canRedirect ? (
              <a
                href={safeShareUrl}
                className="block w-full text-center bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all text-sm sm:text-base"
              >
                <ExternalLink className="h-4 w-4 inline mr-2" />Continue to Destination
              </a>
            ) : (
              <div className="rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 px-3.5 py-2.5 text-orange-700 dark:text-orange-400 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>This promotion is active. View the full flyer and details above.</span>
              </div>
            )}

            {task.flyer_url && (
              <a
                href={task.flyer_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-muted/60 hover:bg-muted text-foreground font-semibold py-2.5 rounded-2xl text-xs sm:text-sm border border-border/50 transition-colors"
              >
                <Download className="h-4 w-4 inline mr-2" />Download Full Flyer
              </a>
            )}

            {/* Countdown Counter Reader */}
            {canRedirect && (
              <div className="text-center py-1">
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-full py-1.5 px-3 inline-block">
                  Auto-redirecting in <span className="font-bold text-orange-600 dark:text-orange-400">{countdown}</span>s…
                </p>
              </div>
            )}

            {/* Sponsored Banner Ad — Under the Counter Reader, Full Banner Not Cropped */}
            {sponsoredAd && (
              <div className="pt-4 border-t border-border/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                      SPONSORED BANNER AD
                    </span>
                  </div>
                  {sponsoredAd.target_url && (
                    <a
                      href={sponsoredAd.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleSponsoredAdClick}
                      className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      Visit Sponsor <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <a
                  href={sponsoredAd.target_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleSponsoredAdClick}
                  className="group block bg-muted/30 hover:bg-orange-500/5 transition-all rounded-2xl border border-border/70 hover:border-orange-500/40 p-2.5 overflow-hidden shadow-sm hover:shadow-md"
                >
                  {/* Full Banner Ad — not cropped */}
                  {sponsoredAd.image_url && (
                    <div className="w-full rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 flex items-center justify-center">
                      <img
                        loading="lazy"
                        src={sponsoredAd.image_url}
                        alt={sponsoredAd.title || 'Sponsored Advertisement'}
                        className="w-full h-auto max-h-[420px] object-contain block group-hover:scale-[1.01] transition-transform"
                      />
                    </div>
                  )}

                  {(sponsoredAd.title || sponsoredAd.description) && (
                    <div className="mt-2.5 px-1 space-y-1">
                      {sponsoredAd.title && (
                        <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                          {sponsoredAd.title}
                        </p>
                      )}
                      {sponsoredAd.description && (
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">
                          {sponsoredAd.description}
                        </p>
                      )}
                    </div>
                  )}
                </a>
              </div>
            )}
          </div>

          <div className="bg-muted/40 px-4 py-2.5 text-center border-t border-border/40">
            <p className="text-[10px] text-muted-foreground">
              Sponsored Campaign · Powered by <span className="font-semibold text-foreground">GGD AD NETWORK</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePreviewPage;
