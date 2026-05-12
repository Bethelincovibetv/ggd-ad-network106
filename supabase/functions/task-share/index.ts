// Public OG-friendly share preview for tasks.
// Crawlers (WhatsApp, Facebook, Twitter) read the meta tags; humans get redirected
// to the in-app preview page (/s/:slug) which logs the click and counts down to
// the actual share URL.

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

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    // path looks like /task-share/<slug> when invoked directly,
    // or /functions/v1/task-share/<slug> via the gateway.
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1] === 'task-share'
      ? (url.searchParams.get('slug') || '')
      : parts[parts.length - 1];

    if (!slug || slug === 'task-share') {
      return new Response('Missing slug', { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: link } = await supabase
      .from('task_share_links')
      .select('id, task_id, slug, clicks')
      .eq('slug', slug)
      .maybeSingle();

    if (!link) {
      return new Response('Link not found', { status: 404 });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id, title, description, share_url, flyer_url, creator_id')
      .eq('id', link.task_id)
      .maybeSingle();

    if (!task) {
      return new Response('Campaign no longer available', { status: 404 });
    }

    // Pull creator/business info for attribution
    let creatorName = 'GGD AD NETWORK';
    let businessName: string | null = null;
    if (task.creator_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, business_name')
        .eq('user_id', task.creator_id)
        .maybeSingle();
      if (profile) {
        businessName = profile.business_name || null;
        creatorName = profile.business_name || profile.display_name || creatorName;
      }
    }

    const requestedApp = url.searchParams.get('app') || '';
    const fallbackApp = 'https://id-preview--973bda7e-494b-477f-9b1f-42214e756f39.lovable.app';
    const appOrigin = /^https?:\/\//i.test(requestedApp) ? requestedApp.replace(/\/$/, '') : fallbackApp;
    const previewUrl = `${appOrigin}/s/${encodeURIComponent(slug)}`;
    const image = task.flyer_url || FALLBACK_IMG;
    const title = `${task.title} — by ${creatorName}`;
    const description =
      task.description ||
      `Promoted by ${creatorName} on GGD AD NETWORK. Tap to view.`;

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(previewUrl)}" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="GGD AD NETWORK" />
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

<meta http-equiv="refresh" content="0; url=${escapeHtml(previewUrl)}" />
<style>
  body{margin:0;font-family:system-ui,sans-serif;background:#0b0b0b;color:#fff;display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center}
  img{max-width:420px;width:100%;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  a{display:inline-block;margin-top:18px;background:linear-gradient(90deg,#f97316,#dc2626);color:#fff;padding:12px 24px;border-radius:14px;font-weight:700;text-decoration:none}
  h1{font-size:20px;margin:18px 0 6px}
  p{opacity:.8;font-size:14px;margin:4px 0}
</style>
</head>
<body>
  <div>
    <img src="${escapeHtml(image)}" alt="${escapeHtml(task.title)}" />
    <h1>${escapeHtml(task.title)}</h1>
    <p>by <strong>${escapeHtml(creatorName)}</strong></p>
    <a href="${escapeHtml(previewUrl)}">Continue →</a>
  </div>
  <script>window.location.replace(${JSON.stringify(previewUrl)});</script>
</body>
</html>`;

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
