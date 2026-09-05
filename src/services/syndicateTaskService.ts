import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";

export interface CreateSyndicateTaskParams {
  title: string;
  description: string;
  share_link?: string | null;
  flyer_url?: string | null;
  placements: string[];
  target_state?: string | null;
  max_syndicates: number;
  approval_mode?: "manual" | "automatic";
}

export interface SyndicateTaskResult {
  success: boolean;
  task_id?: string;
  credits_debited?: number;
  total_cost?: number;
  error?: string;
}

export interface ReviewAssignmentParams {
  assignmentId: string;
  approve: boolean;
  rejectionReason?: string | null;
}

export interface ReviewAssignmentResult {
  success: boolean;
  payout_credits?: number;
  error?: string;
}

/**
 * Creates a syndicate task using RPC when available, with resilient
 * direct-database fallback matching the server-authoritative financial rules.
 */
export async function createSyndicateTask(
  params: CreateSyndicateTaskParams
): Promise<SyndicateTaskResult> {
  const {
    title,
    description,
    share_link,
    flyer_url,
    placements,
    target_state,
    max_syndicates,
    approval_mode = "manual",
  } = params;

  if (!title.trim()) {
    return { success: false, error: "Task title is required" };
  }
  if (!placements || placements.length === 0) {
    return { success: false, error: "At least one placement platform is required" };
  }
  if (max_syndicates <= 0) {
    return { success: false, error: "Max syndicates must be at least 1" };
  }

  // 1. Attempt database RPC first
  try {
    const { data, error } = await callRpc<any>("create_syndicate_task", {
      p_title: title.trim(),
      p_description: description.trim(),
      p_share_link: share_link?.trim() || null,
      p_flyer_url: flyer_url || null,
      p_placements: placements,
      p_target_state: target_state?.trim() || null,
      p_max_syndicates: max_syndicates,
      p_approval_mode: approval_mode || "manual",
    });

    if (!error && data) {
      if (data.success) {
        return {
          success: true,
          task_id: data.task_id,
          credits_debited: data.credits_debited,
          total_cost: data.total_cost,
        };
      }
      if (data.error) {
        return { success: false, error: data.error };
      }
    }

    // If error is not a "function not found" schema error, return it
    if (error && error.code !== "PGRST202" && !error.message?.includes("schema cache")) {
      return { success: false, error: error.message };
    }
  } catch (rpcErr: any) {
    console.warn("create_syndicate_task RPC unavailable, falling back to direct database flow:", rpcErr);
  }

  // 2. Resilient Direct Database Fallback Flow
  // Ensures financial integrity and adherence to platform rules
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in to create a task" };
  }

  try {
    // A. Fetch current user profile, platform pricing, and settings in parallel
    const [profileRes, pricingRes, rateRes, pctRes] = await Promise.all([
      supabase.from("profiles").select("credits, login_bonus_credits").eq("user_id", user.id).maybeSingle(),
      supabase.from("platform_pricing").select("platform_key, price_per_task"),
      supabase.from("app_settings").select("value").eq("key", "credit_exchange_rate").maybeSingle(),
      supabase.from("app_settings").select("value").eq("key", "syndicate_payout_percentage").maybeSingle(),
    ]);

    if (profileRes.error) {
      return { success: false, error: "Failed to verify user profile" };
    }

    const currentCredits = Number(profileRes.data?.credits || 0);
    const loginBonusCredits = Number((profileRes.data as any)?.login_bonus_credits || 0);
    const eligibleCredits = Math.max(0, currentCredits - loginBonusCredits);

    // B. Calculate placement costs
    const pricingList = pricingRes.data || [];
    let costPerSyndicate = 0;
    placements.forEach((pkey) => {
      const match = pricingList.find((p) => p.platform_key === pkey);
      costPerSyndicate += match ? Number(match.price_per_task) : 50;
    });
    if (costPerSyndicate <= 0) costPerSyndicate = 50;

    const totalCost = costPerSyndicate * max_syndicates;

    // C. Exchange rate & payout percentage
    const exchangeRate = parseInt(rateRes.data?.value || "50", 10) || 50;
    const payoutPct = parseInt(pctRes.data?.value || "75", 10) || 75;
    const payoutAmount = costPerSyndicate * (payoutPct / 100.0);
    const creditsNeeded = Math.ceil(totalCost / exchangeRate);

    // D. Validate eligible credits (login bonus cannot be spent on campaigns)
    if (eligibleCredits < creditsNeeded) {
      return {
        success: false,
        error: `Insufficient eligible credits. Need ${creditsNeeded} credits (₦${totalCost.toLocaleString()}). Promotional login bonus cannot be used for tasks.`,
      };
    }

    // E. Debit user credits
    const { error: debitError } = await supabase
      .from("profiles")
      .update({ credits: currentCredits - creditsNeeded })
      .eq("user_id", user.id);

    if (debitError) {
      return { success: false, error: "Failed to debit credits: " + debitError.message };
    }

    // F. Insert syndicate task
    const { data: createdTask, error: insertError } = await supabase
      .from("syndicate_tasks")
      .insert({
        business_user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        share_link: share_link?.trim() || null,
        flyer_url: flyer_url || null,
        placements: placements,
        target_state: target_state?.trim() || null,
        max_syndicates: max_syndicates,
        cost_per_syndicate: costPerSyndicate,
        total_cost: totalCost,
        payout_amount: payoutAmount,
        approval_mode: approval_mode || "manual",
        status: "active",
      })
      .select()
      .single();

    if (insertError || !createdTask) {
      // Rollback debit if insert fails
      await supabase
        .from("profiles")
        .update({ credits: currentCredits })
        .eq("user_id", user.id);

      return {
        success: false,
        error: "Failed to create task record: " + (insertError?.message || "Unknown error"),
      };
    }

    return {
      success: true,
      task_id: createdTask.id,
      credits_debited: creditsNeeded,
      total_cost: totalCost,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create task" };
  }
}

/**
 * Reviews a syndicate task assignment with RPC fallback to direct flow
 */
export async function reviewSyndicateAssignment(
  params: ReviewAssignmentParams
): Promise<ReviewAssignmentResult> {
  const { assignmentId, approve, rejectionReason } = params;

  // 1. Try RPC
  try {
    const { data, error } = await callRpc<any>("review_syndicate_assignment", {
      p_assignment_id: assignmentId,
      p_approve: approve,
      p_rejection_reason: rejectionReason || null,
    });

    if (!error && data) {
      if (data.success) {
        return {
          success: true,
          payout_credits: data.payout_credits,
        };
      }
      if (data.error) {
        return { success: false, error: data.error };
      }
    }

    if (error && error.code !== "PGRST202" && !error.message?.includes("schema cache")) {
      return { success: false, error: error.message };
    }
  } catch (rpcErr: any) {
    console.warn("review_syndicate_assignment RPC unavailable, falling back to direct database flow:", rpcErr);
  }

  // 2. Direct database review flow
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Fetch assignment with task
    const { data: assignment, error: aErr } = await supabase
      .from("syndicate_task_assignments")
      .select("*, syndicate_tasks(*)")
      .eq("id", assignmentId)
      .single();

    if (aErr || !assignment) return { success: false, error: "Assignment not found" };

    const task = assignment.syndicate_tasks as any;
    if (!task) return { success: false, error: "Associated task not found" };

    if (assignment.status === "approved") {
      return { success: false, error: "Assignment is already approved" };
    }

    if (!approve) {
      // Reject
      const { error: updErr } = await supabase
        .from("syndicate_task_assignments")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", assignmentId);

      if (updErr) return { success: false, error: updErr.message };

      // Notify promoter
      await supabase.from("notifications").insert({
        user_id: assignment.syndicate_user_id,
        title: "❌ Task Submission Rejected",
        message: `Your submission for "${task.title}" was rejected: ${rejectionReason || "Proof invalid or unclear"}`,
        type: "warning",
      });

      return { success: true };
    }

    // Approve & Pay
    const [rateRes, promoterProfileRes, promoterSynRes] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "credit_exchange_rate").maybeSingle(),
      supabase.from("profiles").select("credits").eq("user_id", assignment.syndicate_user_id).single(),
      supabase.from("syndicate_profiles").select("tasks_completed, ranking_score").eq("user_id", assignment.syndicate_user_id).maybeSingle(),
    ]);

    const exchangeRate = parseInt(rateRes.data?.value || "50", 10) || 50;
    const payoutNaira = Number(task.payout_amount || (Number(task.cost_per_syndicate || 50) * 0.7));
    const payoutCredits = Math.max(1, Math.floor(payoutNaira / exchangeRate));

    // Update assignment status
    const { error: updErr } = await supabase
      .from("syndicate_task_assignments")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", assignmentId);

    if (updErr) return { success: false, error: updErr.message };

    // Credit promoter
    const currentPromoterCredits = Number(promoterProfileRes.data?.credits || 0);
    await supabase
      .from("profiles")
      .update({ credits: currentPromoterCredits + payoutCredits })
      .eq("user_id", assignment.syndicate_user_id);

    // Update syndicate stats
    if (promoterSynRes.data) {
      await supabase
        .from("syndicate_profiles")
        .update({
          tasks_completed: (promoterSynRes.data.tasks_completed || 0) + 1,
          ranking_score: (promoterSynRes.data.ranking_score || 0) + 5,
        })
        .eq("user_id", assignment.syndicate_user_id);
    }

    // Notify promoter
    await supabase.from("notifications").insert({
      user_id: assignment.syndicate_user_id,
      title: "🎉 Task Approved & Credits Paid!",
      message: `Your proof for "${task.title}" was approved! +${payoutCredits} credits added to your balance.`,
      type: "credit",
    });

    return { success: true, payout_credits: payoutCredits };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review assignment" };
  }
}
