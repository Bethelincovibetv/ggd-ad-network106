import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Get or create a smart share link for a task.
 *
 * Returns the public edge-function URL so social crawlers (WhatsApp, Facebook,
 * Twitter) can read OG tags and show the task flyer + business attribution as
 * the link preview. Humans following the link are immediately redirected to
 * the in-app preview page (/s/:slug) which logs the click and counts down
 * before forwarding to the real share URL.
 */
export async function getOrCreateTaskShareUrl(taskId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('task_share_links')
    .select('slug')
    .eq('task_id', taskId)
    .eq('sharer_user_id', user.id)
    .maybeSingle();

  const slug = existing?.slug
    ?? (await (async () => {
      const { data: created, error } = await supabase
        .from('task_share_links')
        .insert({ task_id: taskId, sharer_user_id: user.id })
        .select('slug')
        .single();
      if (error || !created) return null;
      return created.slug as string;
    })());

  if (!slug) return null;
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const query = appOrigin ? `?app=${encodeURIComponent(appOrigin)}` : '';
  return `${SUPABASE_URL}/functions/v1/task-share/${slug}${query}`;
}
