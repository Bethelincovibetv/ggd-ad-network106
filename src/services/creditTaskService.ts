import { supabase } from "@/integrations/supabase/client";

export interface CreditTask {
  id: string;
  title: string;
  description: string | null;
  reward_credits: number;
  task_type: string;
  share_url: string | null;
  flyer_url: string | null;
  funded: boolean;
  max_completions: number | null;
  completions_count: number;
  is_active: boolean;
  creator_id: string | null;
  is_official?: boolean;
  created_at?: string;
}

export interface CompleteTaskResult {
  success: boolean;
  alreadyCompleted?: boolean;
  rewardAwarded?: number;
  newBalance?: number;
  error?: string;
}

const DEFAULT_PLATFORM_TASK_TITLE = "Share GGD Ad Network";
const DEFAULT_PLATFORM_TASK_DESC =
  "Share the GGD Ad Network platform on WhatsApp, Facebook, Telegram or Instagram. Earn promotional credits to advertise your business!";

/**
 * Ensures the official Platform Share Task exists in the database `tasks` table
 * and returns its current real configuration.
 */
export async function getOrEnsurePlatformShareTask(): Promise<CreditTask> {
  try {
    // 1. Check if an official or platform share task already exists in `tasks`
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("*")
      .or("is_official.eq.true,title.ilike.%Share GGD Ad Network%")
      .order("created_at", { ascending: true })
      .limit(1);

    if (existingTasks && existingTasks.length > 0) {
      const t = existingTasks[0];
      return {
        id: t.id,
        title: t.title,
        description: t.description || DEFAULT_PLATFORM_TASK_DESC,
        reward_credits: Number(t.reward_credits) || 100,
        task_type: t.task_type || "share",
        share_url: t.share_url || (typeof window !== "undefined" ? `${window.location.origin}/?ref=share_task` : "https://ggdadnetwork.com"),
        flyer_url: t.flyer_url || null,
        funded: true,
        max_completions: t.max_completions,
        completions_count: Number(t.completions_count) || 0,
        is_active: t.is_active !== false,
        creator_id: t.creator_id,
        is_official: true,
        created_at: t.created_at,
      };
    }

    // 2. Fetch configured default reward from app_settings if available
    let configuredReward = 100;
    try {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "platform_share_reward_credits")
        .maybeSingle();

      if (setting?.value) {
        const parsed = parseInt(setting.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
          configuredReward = parsed;
        }
      }
    } catch {
      // Fallback to default
    }

    // 3. Attempt to insert the official platform task into `tasks`
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || null;

    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/?ref=share_task` : "https://ggdadnetwork.com";

    const { data: insertedTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: DEFAULT_PLATFORM_TASK_TITLE,
        description: DEFAULT_PLATFORM_TASK_DESC,
        reward_credits: configuredReward,
        task_type: "share",
        share_url: shareUrl,
        is_official: true,
        is_active: true,
        funded: true,
        max_completions: 1000000,
        completions_count: 0,
        creator_id: currentUserId,
      })
      .select()
      .maybeSingle();

    if (!insertError && insertedTask) {
      return {
        id: insertedTask.id,
        title: insertedTask.title,
        description: insertedTask.description,
        reward_credits: Number(insertedTask.reward_credits) || configuredReward,
        task_type: "share",
        share_url: insertedTask.share_url,
        flyer_url: insertedTask.flyer_url,
        funded: true,
        max_completions: insertedTask.max_completions,
        completions_count: Number(insertedTask.completions_count) || 0,
        is_active: insertedTask.is_active !== false,
        creator_id: insertedTask.creator_id,
        is_official: true,
        created_at: insertedTask.created_at,
      };
    }

    // 4. Fallback if insert not permitted by RLS: return a structured task
    return {
      id: "platform-official-share-task",
      title: DEFAULT_PLATFORM_TASK_TITLE,
      description: DEFAULT_PLATFORM_TASK_DESC,
      reward_credits: configuredReward,
      task_type: "share",
      share_url: shareUrl,
      flyer_url: null,
      funded: true,
      max_completions: null,
      completions_count: 0,
      is_active: true,
      creator_id: null,
      is_official: true,
    };
  } catch (err) {
    console.warn("Failed to ensure official platform share task:", err);
    return {
      id: "platform-official-share-task",
      title: DEFAULT_PLATFORM_TASK_TITLE,
      description: DEFAULT_PLATFORM_TASK_DESC,
      reward_credits: 100,
      task_type: "share",
      share_url: typeof window !== "undefined" ? `${window.location.origin}/?ref=share_task` : "https://ggdadnetwork.com",
      flyer_url: null,
      funded: true,
      max_completions: null,
      completions_count: 0,
      is_active: true,
      creator_id: null,
      is_official: true,
    };
  }
}

/**
 * Completes a credit task atomically using the database task reward as source of truth.
 * Records the completion in `task_completions`, updates user balance in `profiles`,
 * and updates completion counters.
 */
export async function executeCompleteTask(taskId: string): Promise<CompleteTaskResult> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return { success: false, error: "Please sign in to complete tasks" };
  }
  const userId = authData.user.id;

  try {
    // 1. Fetch fresh task record from DB to verify reward and active status
    let taskRecord: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

    if (isUuid) {
      const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
      taskRecord = data;
    } else {
      // Look up official task
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .or("is_official.eq.true,title.ilike.%Share GGD Ad Network%")
        .order("created_at", { ascending: true })
        .limit(1);
      taskRecord = data?.[0] || null;
    }

    if (!taskRecord) {
      // Ensure official task exists if this was a share task
      taskRecord = await getOrEnsurePlatformShareTask();
    }

    const realTaskId = taskRecord.id;
    const rewardCredits = Math.max(1, Number(taskRecord.reward_credits) || 5);

    // 2. Check if already completed in task_completions
    const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realTaskId);
    if (isRealUuid) {
      const { data: existingComp } = await supabase
        .from("task_completions")
        .select("id")
        .eq("task_id", realTaskId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingComp) {
        return { success: false, alreadyCompleted: true, error: "You have already completed this task!" };
      }
    } else {
      // Fallback check in notifications
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", `task_comp_${realTaskId}`)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        return { success: false, alreadyCompleted: true, error: "You have already completed this task!" };
      }
    }

    // 3. Record completion in `task_completions` (or fallback notification if non-UUID)
    if (isRealUuid) {
      const { error: compError } = await supabase.from("task_completions").insert({
        task_id: realTaskId,
        user_id: userId,
      });

      if (compError) {
        if (compError.code === "23505") {
          return { success: false, alreadyCompleted: true, error: "You have already completed this task!" };
        }
        return { success: false, error: "Failed to record task completion: " + compError.message };
      }
    } else {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Task Completed",
        message: `Task ${realTaskId} completed for ${rewardCredits} credits`,
        type: `task_comp_${realTaskId}`,
        read: true,
      });
    }

    // 4. Fetch current user profile credits
    const { data: profileData, error: profError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", userId)
      .maybeSingle();

    if (profError || !profileData) {
      return { success: false, error: "Failed to fetch user profile" };
    }

    const currentCredits = Number(profileData.credits) || 0;
    const newBalance = currentCredits + rewardCredits;

    // 5. Update profile credits in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newBalance })
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: "Failed to credit wallet: " + updateError.message };
    }

    // 6. Increment task completions counter in tasks table
    if (isRealUuid) {
      const newCompletionsCount = (Number(taskRecord.completions_count) || 0) + 1;
      const updates: any = { completions_count: newCompletionsCount };
      if (taskRecord.max_completions && newCompletionsCount >= taskRecord.max_completions) {
        updates.is_active = false;
      }
      await supabase.from("tasks").update(updates).eq("id", realTaskId);
    }

    return {
      success: true,
      rewardAwarded: rewardCredits,
      newBalance,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "An unexpected error occurred while completing task" };
  }
}
