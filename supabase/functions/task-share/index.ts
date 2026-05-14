// Public OG-friendly share preview for tasks.
// Crawlers (WhatsApp, Facebook, Twitter) get HTML with OG meta tags.
// Real human browsers get a 302 redirect straight to the in-app preview page
// (/s/:slug) so they never see the raw functions URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const FALLBACK_IMG =
  'https://cilkybiebptqtuhbopyz.supabase.co/storage/v1/object/public/images/GGD%20AD%20NETWORK/01a5b45d-5b2e-4458-acc6-e6b4697174e1.png';

const CRAWLER_RE =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Embedly|Applebot|Googlebot|bingbot|DuckDuckBot|YandexBot|vkShare|W3C_Validator|SkypeUriPreview|Iframely/i;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1] === 'task-share'
      ? (url.searchParams.get('slug') || '')
      : parts[parts.length - 1];

    if (!slug || slug === 'task-share') {
      return new Response('Missing slug', { status: 400 });
    }

    const requestedApp = url.searchParams.get('app') || '';
    const fallbackApp = 'https://id-preview--973bda7e-494b-477f-9b1f-42214e756f39.lovable.app';
    const appOrigin = /^https?:\/\//i.test(requestedApp) ? requestedApp.replace(/\/$/, '') : fallbackApp;
    const previewUrl = `${appOrigin}/s/${encodeURIComponent(slug)}`;

    const ua = req.headers.get('user-agent') || '';
    const isCrawler = CRAWLER_RE.test(ua);

    // Real humans → 302 straight to the in-app preview page
    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: { location: previewUrl, 'cache-control': 'no-store' },
      });
    }

    // Crawlers → render HTML with OG tags
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: link } = await supabase
      .from('task_share_links')
      .select('id, task_id, slug, clicks')
      .eq('slug', slug)
      .maybeSingle();
    if (!link) return new Response('Link not found', { status: 404 });

    const { data: task } = await supabase
      .from('tasks')
      .select('id, title, description, share_url, flyer_url, creator_id')
      .eq('id', link.task_id)
      .maybeSingle();
    if (!task) return new Response('Campaign no longer available', { status: 404 });

    let creatorName = 'GGD Ad Network';
    if (task.creator_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, business_name')
        .eq('user_id', task.creator_id)
        .maybeSingle();
      if (profile) creatorName = profile.business_name || profile.display_name || creatorName;
    }

    const image = task.flyer_url || FALLBACK_IMG;
    const title = `${task.title} — by ${creatorName}`;
    const description = task.description ||
      `Promoted by ${creatorName} on GGD Ad Network. Tap to view.`;

    const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(previewUrl)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="GGD Ad Network" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:secure_url" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${escapeHtml(previewUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
</head><body>
<a href="${escapeHtml(previewUrl)}">${escapeHtml(title)}</a>
</body></html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  } catch (e) {
    return new Response(`Error: ${(e as Error).message}`, { status: 500 });
  }
});
