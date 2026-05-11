import { supabase } from "@/integrations/supabase/client";

/**
 * Get or create a smart share link for a task.
 * Returns the full public URL (https://host/s/:slug) the user should share.
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

  if (existing?.slug) return `${window.location.origin}/s/${existing.slug}`;

  const { data: created, error } = await supabase
    .from('task_share_links')
    .insert({ task_id: taskId, sharer_user_id: user.id })
    .select('slug')
    .single();
  if (error || !created) return null;

  return `${window.location.origin}/s/${created.slug}`;
}