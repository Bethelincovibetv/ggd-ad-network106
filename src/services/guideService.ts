import { supabase } from "@/integrations/supabase/client";

const LOCAL_STORAGE_KEY_PREFIX = "ggd_guide_progress_";

/**
 * Guide Completion Service
 * Persists guide and walkthrough step completions to Supabase database
 * so they survive page refreshes, re-logins, navigation, and device changes.
 */
export const guideService = {
  /**
   * Fetch all completed step IDs for the authenticated user from the database.
   */
  async getCompletedSteps(userId: string): Promise<string[]> {
    if (!userId) return [];

    try {
      // Query the database for guide step completion records
      const { data, error } = await supabase
        .from('notifications')
        .select('nav_target')
        .eq('user_id', userId)
        .eq('type', 'guide_step_completion');

      if (!error && data) {
        const dbCompleted = data
          .map(row => row.nav_target)
          .filter((target): target is string => Boolean(target));

        // Cache locally for instant offline rendering
        try {
          localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(dbCompleted));
        } catch {
          // ignore localStorage errors
        }

        return dbCompleted;
      }
    } catch (err) {
      console.warn("Error fetching guide progress from database:", err);
    }

    // Fallback to local cache if database query fails or offline
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }

    return [];
  },

  /**
   * Save a single guide step completion state to the database.
   */
  async setStepCompletion(userId: string, stepId: string, completed: boolean): Promise<boolean> {
    if (!userId || !stepId) return false;

    try {
      if (completed) {
        // First check if already exists to ensure idempotency
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'guide_step_completion')
          .eq('nav_target', stepId)
          .maybeSingle();

        if (!existing) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'guide_step_completion',
            title: 'Guide Step Completed',
            nav_target: stepId,
            message: JSON.stringify({ completedAt: new Date().toISOString() }),
            is_read: true,
          });
        }
      } else {
        // Remove completion record if unchecking
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId)
          .eq('type', 'guide_step_completion')
          .eq('nav_target', stepId);
      }

      // Update local storage cache
      try {
        const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
        const currentList: string[] = cached ? JSON.parse(cached) : [];
        const nextList = completed
          ? Array.from(new Set([...currentList, stepId]))
          : currentList.filter(id => id !== stepId);
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(nextList));
      } catch {
        // ignore
      }

      return true;
    } catch (err) {
      console.error("Error saving guide step completion:", err);
      return false;
    }
  },

  /**
   * Mark all provided steps as completed in batch.
   */
  async markAllStepsCompleted(userId: string, stepIds: string[]): Promise<boolean> {
    if (!userId || stepIds.length === 0) return false;

    try {
      const currentCompleted = await this.getCompletedSteps(userId);
      const toInsert = stepIds.filter(id => !currentCompleted.includes(id));

      if (toInsert.length > 0) {
        const rows = toInsert.map(stepId => ({
          user_id: userId,
          type: 'guide_step_completion',
          title: 'Guide Step Completed',
          nav_target: stepId,
          message: JSON.stringify({ completedAt: new Date().toISOString() }),
          is_read: true,
        }));

        await supabase.from('notifications').insert(rows);
      }

      // Also update profiles.profile_setup_complete
      await supabase.from('profiles').update({ profile_setup_complete: true }).eq('user_id', userId);

      // Update local cache
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(stepIds));
      } catch {
        // ignore
      }

      return true;
    } catch (err) {
      console.error("Error marking all guide steps completed:", err);
      return false;
    }
  }
};
