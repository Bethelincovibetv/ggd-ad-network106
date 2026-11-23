import { supabase } from "@/integrations/supabase/client";
import {
  BannerAdRecord,
  coalesceIdempotentRequest,
  generateBannerIdempotencyKey,
  isDuplicateIdempotencyError,
  isMissingSchemaColumnError,
  normalizeIdempotencyKey,
  resolveIdempotencyHeaders,
} from "@/lib/bannerAds";

export interface CreateBannerAdInput {
  idempotencyKey?: string;
  title: string;
  description?: string;
  image_url?: string | null;
  target_url: string;
  target_state?: string | null;
  ad_type?: "banner" | "watch";
  duration_days?: number;
  is_active?: boolean;
  approved?: boolean;
  expires_at?: string | null;
  deduct_credits?: boolean;
  billing_mode?: "standard" | "daily_banner";
  allow_draft_url?: boolean;
  owner_user_id?: string;
  youtube_url?: string | null;
  watch_duration_seconds?: number | null;
  reward_credits?: number | null;
  budget_credits?: number | null;
}

export interface CreateBannerAdResult {
  success: boolean;
  ad?: BannerAdRecord;
  alreadyExists?: boolean;
  idempotentReplay?: boolean;
  idempotencyKey: string;
  credits?: number;
  error?: string;
}

const clientInFlightCreations = new Map<string, Promise<CreateBannerAdResult>>();

async function findExistingAdInSupabase(userId: string, key: string): Promise<BannerAdRecord | null> {
  for (const col of ["idempotency_key", "external_reference"] as const) {
    try {
      const { data, error } = await (supabase.from("ads") as any)
        .select("*")
        .eq("user_id", userId)
        .eq(col, key)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        return data as BannerAdRecord;
      }
    } catch {
      // Column might not exist yet on older database instances
    }
  }
  return null;
}

function notifyAdminPendingBanner(ad: BannerAdRecord, input: CreateBannerAdInput): void {
  if (input.approved || ad.approved) return;
  if (typeof (supabase as any).channel !== "function") return;

  void import("@/services/adminNotificationHelper")
    .then(({ notifyAdminsSystemUpdate }) =>
      notifyAdminsSystemUpdate({
        title: `New Banner Ad Pending Approval: ${ad.title || input.title}`,
        summary: `A new ${input.ad_type || "banner"} advert ("${ad.title || input.title}") is awaiting moderation in Banner Ad Management.`,
        category: "ad_approval",
        section: "ads",
        itemId: ad.id,
        userId: ad.user_id,
        actionLabel: "Review Ad",
        urgent: false,
      })
    )
    .catch(() => {});
}

/**
 * Creates a banner (or watch) advert idempotently.
 * - Generates a unique idempotency key if not provided.
 * - Sends BOTH `Idempotency-Key` HTTP header and `idempotency_key` JSON payload field.
 * - Coalesces duplicate in-flight client triggers with the same key.
 * - Uses the Express `/api/banner-ads` server guard as primary enforcement,
 *   falling back cleanly to the `create_banner_ad_idempotent` RPC or guarded insert
 *   only when running without the backend server (e.g., static hosting / network 404).
 */
export async function createBannerAdIdempotent(
  input: CreateBannerAdInput
): Promise<CreateBannerAdResult> {
  const key =
    normalizeIdempotencyKey(input.idempotencyKey) || generateBannerIdempotencyKey("banner");

  return coalesceIdempotentRequest(clientInFlightCreations, key, async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session?.access_token || !session.user?.id) {
      return {
        success: false,
        idempotencyKey: key,
        error: "Authentication required to create banner adverts.",
      };
    }

    const requestBody = {
      ...input,
      idempotency_key: key,
    };

    // 1. Primary path: Express backend /api/banner-ads
    let shouldFallbackToSupabase = false;
    try {
      const resp = await fetch("/api/banner-ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...resolveIdempotencyHeaders(key),
        },
        body: JSON.stringify(requestBody),
      });

      const contentType = resp.headers.get("content-type") || "";
      if (resp.status === 404 || resp.status === 405 || !contentType.includes("application/json")) {
        shouldFallbackToSupabase = true;
      } else {
        const payload = await resp.json().catch(() => null);
        if (!payload) {
          shouldFallbackToSupabase = resp.status >= 500;
        } else if (resp.ok && payload.success && payload.ad) {
          const alreadyExists = Boolean(payload.already_exists || payload.idempotent_replay);
          if (!alreadyExists) {
            notifyAdminPendingBanner(payload.ad as BannerAdRecord, input);
          }
          return {
            success: true,
            ad: payload.ad as BannerAdRecord,
            alreadyExists,
            idempotentReplay: Boolean(payload.idempotent_replay || payload.already_exists),
            idempotencyKey: key,
            credits: typeof payload.credits === "number" ? payload.credits : undefined,
          };
        } else {
          // Do NOT fallback on authoritative 4xx validation/credit/auth responses
          return {
            success: false,
            idempotencyKey: key,
            credits: typeof payload.credits === "number" ? payload.credits : undefined,
            error: payload.error || "Failed to create banner advert",
          };
        }
      }
    } catch {
      // Backend unreachable (e.g. static deployment without Express) -> fall back safely
      shouldFallbackToSupabase = true;
    }

    if (!shouldFallbackToSupabase) {
      return {
        success: false,
        idempotencyKey: key,
        error: "Unable to complete banner advert creation.",
      };
    }

    // 2. Fallback path: Database atomic RPC `create_banner_ad_idempotent`
    const durationDays = Math.min(Math.max(Number(input.duration_days) || 7, 1), 365);
    const computedExpiresAt =
      input.ad_type === "watch"
        ? null
        : input.expires_at ?? new Date(Date.now() + durationDays * 86400000).toISOString();

    try {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "create_banner_ad_idempotent",
        {
          p_idempotency_key: key,
          p_title: input.title.trim(),
          p_description: (input.description || "").trim(),
          p_image_url: input.image_url || null,
          p_target_url: input.target_url.trim(),
          p_target_state:
            input.target_state && input.target_state !== "all" ? input.target_state : null,
          p_ad_type: input.ad_type || "banner",
          p_duration_days: durationDays,
          p_is_active: input.is_active ?? true,
          p_approved: input.approved ?? false,
          p_expires_at: computedExpiresAt,
          p_deduct_credits: input.deduct_credits !== false,
          p_youtube_url: input.youtube_url || null,
          p_watch_duration_seconds: input.watch_duration_seconds ?? null,
          p_reward_credits: input.reward_credits ?? null,
          p_budget_credits: input.budget_credits ?? null,
        }
      );

      if (!rpcError && rpcData) {
        if (rpcData.success && rpcData.ad) {
          const alreadyExists = Boolean(rpcData.already_exists || rpcData.idempotent_replay);
          if (!alreadyExists) {
            notifyAdminPendingBanner(rpcData.ad as BannerAdRecord, input);
          }
          return {
            success: true,
            ad: rpcData.ad as BannerAdRecord,
            alreadyExists,
            idempotentReplay: Boolean(rpcData.idempotent_replay || rpcData.already_exists),
            idempotencyKey: key,
            credits: typeof rpcData.credits === "number" ? rpcData.credits : undefined,
          };
        }
        if (rpcData.success === false) {
          return {
            success: false,
            idempotencyKey: key,
            error: rpcData.error || "Failed to create banner advert",
          };
        }
      }
    } catch {
      // RPC may not be migrated yet; proceed to guarded direct insert below
    }

    // 3. Final fallback: Direct table check + guarded insert with progressive column compatibility
    const targetUserId = input.owner_user_id || session.user.id;
    const existing = await findExistingAdInSupabase(targetUserId, key);
    if (existing) {
      return {
        success: true,
        ad: existing,
        alreadyExists: true,
        idempotentReplay: true,
        idempotencyKey: key,
      };
    }

    const baseRow: Record<string, any> = {
      user_id: targetUserId,
      title: input.title.trim(),
      description: (input.description || "").trim(),
      image_url: input.image_url || null,
      target_url: input.target_url.trim(),
      target_state: input.target_state && input.target_state !== "all" ? input.target_state : null,
      ad_type: input.ad_type || "banner",
      is_active: input.is_active ?? true,
      approved: Boolean(input.approved),
      expires_at: computedExpiresAt,
    };

    if (input.ad_type === "watch") {
      baseRow.youtube_url = input.youtube_url || null;
      baseRow.watch_duration_seconds = input.watch_duration_seconds ?? 30;
      baseRow.reward_credits = input.reward_credits ?? 5;
      baseRow.budget_credits = input.budget_credits ?? 500;
    }

    const candidates: Record<string, any>[] = [
      { ...baseRow, idempotency_key: key, duration_days: durationDays },
      { ...baseRow, idempotency_key: key },
      { ...baseRow, external_reference: key },
      baseRow,
    ];

    for (const candidate of candidates) {
      const { data: inserted, error: insertError } = await (supabase.from("ads") as any)
        .insert(candidate)
        .select("*")
        .single();

      if (!insertError && inserted) {
        notifyAdminPendingBanner(inserted as BannerAdRecord, input);
        return {
          success: true,
          ad: inserted as BannerAdRecord,
          alreadyExists: false,
          idempotentReplay: false,
          idempotencyKey: key,
        };
      }

      if (isDuplicateIdempotencyError(insertError)) {
        const dup = await findExistingAdInSupabase(targetUserId, key);
        if (dup) {
          return {
            success: true,
            ad: dup,
            alreadyExists: true,
            idempotentReplay: true,
            idempotencyKey: key,
          };
        }
      }

      if (isMissingSchemaColumnError(insertError)) {
        continue;
      }

      return {
        success: false,
        idempotencyKey: key,
        error: insertError?.message || "Failed to create banner advert",
      };
    }

    return {
      success: false,
      idempotencyKey: key,
      error: "Failed to create banner advert",
    };
  });
}
