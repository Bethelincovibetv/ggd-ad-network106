import { Type } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";
import {
  getAllVerificationRecords,
  processAdminVerificationOverride,
  adminDirectVerifyUser,
} from "@/services/businessVerificationEngine";
import { reviewSyndicateAssignment } from "@/services/syndicateTaskService";
import { createBannerAdIdempotent } from "@/services/bannerAdService";
import {
  notifyAdOrBusinessStatusPush,
  notifyTaskStatusPush,
} from "@/services/pushNotificationService";
import { generateBannerIdempotencyKey, isBannerAdvert } from "@/lib/bannerAds";
import {
  buildBannerAdvertInput,
  parseAdminNaturalLanguageIntent,
} from "@/lib/vixoraAdminTools";
import {
  BusinessOverviewContext,
  BusinessToolExecutionResult,
  generateProductPromoCanvas,
  uploadAgentDataUrl,
} from "@/services/vixoraBusinessAgentService";

const SUPER_ADMIN_EMAILS = new Set([
  "goodgiftdigital@gmail.com",
  "accessa787@gmail.com",
  "bethelincovibetv@gmail.com",
]);

export interface AdminVerificationItem {
  id: string;
  user_id: string;
  user_email?: string;
  submitted_name?: string;
  business_name?: string;
  document_type?: string;
  document_number?: string;
  status: string;
  account_type?: string;
  created_at?: string;
}

export interface AdminTaskProofItem {
  id: string;
  task_id: string;
  user_id: string;
  member_name: string;
  task_title: string;
  reward_credits: number;
  proof_url?: string | null;
  proof_text?: string | null;
  status: string;
  created_at: string;
  source: "credit_task" | "syndicate_task";
}

export interface AdminSyndicateAppItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  platforms: string[];
  state?: string | null;
  status: string;
  created_at: string;
}

export interface AdminPlatformOverview {
  pendingVerifications: number;
  pendingTaskProofs: number;
  pendingSyndicateProofs: number;
  pendingSyndicateApps: number;
  pendingAds: number;
  pendingWithdrawals: number;
}

export interface AdminToolExecutionResult extends BusinessToolExecutionResult {
  data?: BusinessToolExecutionResult["data"] & {
    adminVerifications?: AdminVerificationItem[];
    adminTaskProofs?: AdminTaskProofItem[];
    adminSyndicateApps?: AdminSyndicateAppItem[];
    adminOverview?: AdminPlatformOverview;
    adminBannerAds?: any[];
    adminWithdrawals?: any[];
    adminUsers?: any[];
    navigateAdminSection?: string;
  };
}

export async function verifyIsCurrentUserAdmin(): Promise<{
  isAdmin: boolean;
  userId?: string;
  email?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { isAdmin: false };

    const email = (user.email || "").toLowerCase().trim();
    if (SUPER_ADMIN_EMAILS.has(email)) {
      return { isAdmin: true, userId: user.id, email };
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    return {
      isAdmin: Array.isArray(roles) && roles.length > 0,
      userId: user.id,
      email,
    };
  } catch {
    return { isAdmin: false };
  }
}

export const ADMIN_AGENT_TOOL_DEFINITIONS = [
  {
    name: "getAdminPlatformOverview",
    description:
      "Fetches a live count of all pending admin queues: business verifications, submitted credit task proofs, submitted syndicate proofs, syndicate applications, pending banner ads, and withdrawal requests.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "verifyBusinessOrReview",
    description:
      "Lists pending/flagged business verifications, approves or rejects a business verification record, or directly verifies a user/business by email or name.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["list_pending", "approve", "reject", "direct_verify"],
          description: "Action to take on business verification",
        },
        recordIdOrQuery: {
          type: Type.STRING,
          description: "Verification record ID, user ID, email, or business name",
        },
        note: {
          type: Type.STRING,
          description: "Optional admin review note or rejection reason",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "reviewSubmittedCreditTasks",
    description:
      "Lists pending community credit task proof submissions or approves/rejects a submitted task proof and credits the earner.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["list_pending", "approve", "reject"],
          description: "Whether to list pending proofs, approve & pay, or reject",
        },
        submissionIdOrQuery: {
          type: Type.STRING,
          description: "Submission ID, task title, or earner name/email",
        },
        reason: {
          type: Type.STRING,
          description: "Rejection reason when action is reject",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "reviewSyndicateSubmissions",
    description:
      "Lists pending Syndicate promoter submitted task proofs or approves/rejects a submitted syndicate assignment.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["list_pending", "approve", "reject"],
          description: "Whether to list submitted syndicate proofs, approve & pay, or reject",
        },
        assignmentIdOrQuery: {
          type: Type.STRING,
          description: "Assignment ID, task title, or promoter name",
        },
        reason: {
          type: Type.STRING,
          description: "Rejection reason when action is reject",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "reviewSyndicateApplications",
    description:
      "Lists pending Syndicate promoter applications or confirms/approves or rejects an applicant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["list_pending", "approve", "reject"],
          description: "List pending applications, approve/confirm applicant, or reject",
        },
        applicationIdOrQuery: {
          type: Type.STRING,
          description: "Application ID, user ID, email, or applicant name",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "manageBannerAdvertsAdmin",
    description:
      "Creates and publishes a live pre-approved banner advert for GGD Ad Network, lists pending banner ads, or approves/rejects/pauses existing banner ads.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["create", "list_pending", "approve", "reject", "pause"],
          description: "Banner advert admin action",
        },
        title: { type: Type.STRING, description: "Banner advert headline when creating" },
        description: { type: Type.STRING, description: "Ad description copy" },
        targetUrl: { type: Type.STRING, description: "Destination URL for ad clicks" },
        durationDays: { type: Type.NUMBER, description: "Number of days the ad runs" },
        format: {
          type: Type.STRING,
          enum: ["banner_landscape", "banner_square", "flyer_portrait"],
        },
        themeColor: {
          type: Type.STRING,
          enum: ["orange", "purple", "emerald", "gold", "blue"],
        },
        adIdOrQuery: {
          type: Type.STRING,
          description: "Existing Ad ID or title when moderating ads",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "manageUsersAndWithdrawalsAdmin",
    description:
      "Lists/approves/rejects withdrawal requests, searches users, grants GGG credits, or activates a user account.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: [
            "list_withdrawals",
            "approve_withdrawal",
            "reject_withdrawal",
            "search_users",
            "grant_credits",
            "activate_user",
          ],
        },
        targetIdOrQuery: {
          type: Type.STRING,
          description: "Withdrawal ID, user ID, email, or display name",
        },
        amount: { type: Type.NUMBER, description: "Credits amount when granting credits" },
        reason: { type: Type.STRING, description: "Optional reason for withdrawal rejection" },
      },
      required: ["action"],
    },
  },
  {
    name: "navigateAdminSection",
    description:
      "Opens a specific Admin Portal section for the administrator (verification, task-proofs, syndicate, ads, users, activation-fee, analytics, settings).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        section: { type: Type.STRING, description: "Admin portal section slug" },
      },
      required: ["section"],
    },
  },
];

async function resolveProfileMap(userIds: string[]): Promise<Record<string, any>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, email, business_name, credits, is_activated")
    .in("user_id", unique);
  const map: Record<string, any> = {};
  (data || []).forEach((p: any) => {
    map[p.user_id] = p;
  });
  return map;
}

export async function executeAdminAgentTool(
  toolName: string,
  args: any,
  context: BusinessOverviewContext,
  uploadedMediaUrl?: string
): Promise<AdminToolExecutionResult> {
  const adminCheck = await verifyIsCurrentUserAdmin();
  if (!adminCheck.isAdmin || !adminCheck.userId) {
    return {
      toolName,
      success: false,
      badge: "🔒 Admin Authorization Required",
      message: "Only authenticated GGD administrators can execute platform-wide admin tools.",
    };
  }

  switch (toolName) {
    case "getAdminPlatformOverview": {
      const [verifAll, taskProofsRes, synProofsRes, synAppsRes, adsRes, withdrawRes] =
        await Promise.all([
          getAllVerificationRecords(),
          (supabase.from as any)("task_proof_submissions")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("syndicate_task_assignments")
            .select("id", { count: "exact", head: true })
            .eq("status", "submitted"),
          supabase
            .from("syndicate_applications")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase.from("ads").select("*"),
          supabase
            .from("withdrawal_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);

      const pendingVerifications = verifAll.filter(
        (r) => r.status === "PENDING_REVIEW" || r.status === "MANUAL_REVIEW_REQUIRED"
      ).length;
      const pendingAds = (adsRes.data || []).filter(
        (a: any) => isBannerAdvert(a) && !a.approved && a.is_active !== false
      ).length;

      const overview: AdminPlatformOverview = {
        pendingVerifications,
        pendingTaskProofs: taskProofsRes.count || 0,
        pendingSyndicateProofs: synProofsRes.count || 0,
        pendingSyndicateApps: synAppsRes.count || 0,
        pendingAds,
        pendingWithdrawals: withdrawRes.count || 0,
      };

      return {
        toolName,
        success: true,
        badge: "📊 Admin Operations Audit",
        message: `Platform queue snapshot ready: ${overview.pendingVerifications} business verifications, ${overview.pendingTaskProofs} credit task proofs, ${overview.pendingSyndicateProofs} syndicate task proofs, ${overview.pendingSyndicateApps} syndicate applications, ${overview.pendingAds} pending banner ads, and ${overview.pendingWithdrawals} pending withdrawals.`,
        data: { adminOverview: overview },
      };
    }

    case "verifyBusinessOrReview": {
      const action = args?.action || "list_pending";
      const queryStr = String(args?.recordIdOrQuery || "").trim().toLowerCase();
      const records = await getAllVerificationRecords();
      const pendingRecords = records.filter(
        (r) => r.status === "PENDING_REVIEW" || r.status === "MANUAL_REVIEW_REQUIRED"
      );

      if (action === "list_pending") {
        const mapped: AdminVerificationItem[] = pendingRecords.slice(0, 10).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          user_email: r.user_email,
          submitted_name: r.submitted_name,
          business_name: r.registered_name || r.submitted_name,
          document_type: r.document_type,
          document_number: r.document_number,
          status: r.status,
          account_type: r.account_type,
          created_at: r.created_at,
        }));

        return {
          toolName,
          success: true,
          badge: "🛡️ Business Verifications Queue",
          message:
            mapped.length > 0
              ? `Found ${pendingRecords.length} pending business verification(s). You can approve or reject any record directly below.`
              : "All submitted business verifications have been reviewed — zero pending records right now.",
          data: { adminVerifications: mapped },
        };
      }

      if (action === "approve" || action === "reject") {
        const match = records.find(
          (r) =>
            r.id === args?.recordIdOrQuery ||
            r.user_id === args?.recordIdOrQuery ||
            (queryStr &&
              ((r.user_email || "").toLowerCase().includes(queryStr) ||
                (r.submitted_name || "").toLowerCase().includes(queryStr) ||
                (r.registered_name || "").toLowerCase().includes(queryStr)))
        );

        if (match) {
          await processAdminVerificationOverride(match.id, {
            admin_action: action === "approve" ? "APPROVE" : "REJECT",
            admin_note:
              args?.note ||
              (action === "approve"
                ? "Verified by Administrator via Vixora Admin Copilot."
                : "Rejected by Administrator via Vixora Admin Copilot."),
            admin_id: adminCheck.userId,
            admin_email: adminCheck.email,
          });
          return {
            toolName,
            success: true,
            badge: action === "approve" ? "✅ Business Verified" : "❌ Verification Rejected",
            message: `${action === "approve" ? "Approved" : "Rejected"} verification for "${
              match.registered_name || match.submitted_name || match.user_email
            }".`,
          };
        }
      }

      if ((action === "direct_verify" || action === "approve") && queryStr) {
        const { data: matchedUsers } = await supabase
          .from("profiles")
          .select("user_id, email, display_name, business_name")
          .or(
            `email.ilike.%${queryStr}%,business_name.ilike.%${queryStr}%,display_name.ilike.%${queryStr}%`
          )
          .limit(3);

        const targetUser = matchedUsers?.[0];
        if (targetUser) {
          await adminDirectVerifyUser({
            userId: targetUser.user_id,
            verify: true,
            adminEmail: adminCheck.email,
            note: args?.note || "Direct business verification via Vixora Admin Copilot",
          });
          return {
            toolName,
            success: true,
            badge: "✅ Business Directly Verified",
            message: `Verified business account "${
              targetUser.business_name || targetUser.display_name || targetUser.email
            }" successfully.`,
          };
        }
      }

      return {
        toolName,
        success: false,
        badge: "Notice",
        message: "Could not find a matching verification record or business account. Try listing pending verifications first.",
      };
    }

    case "reviewSubmittedCreditTasks": {
      const action = args?.action || "list_pending";
      const queryStr = String(args?.submissionIdOrQuery || "").trim().toLowerCase();

      const { data: rows, error } = await (supabase.from as any)("task_proof_submissions")
        .select("*, tasks(title, reward_credits)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return {
          toolName,
          success: false,
          badge: "Error",
          message: `Failed to fetch submitted credit tasks: ${error.message}`,
        };
      }

      const list = rows || [];
      const profileMap = await resolveProfileMap(list.map((r: any) => r.user_id));

      if (action === "list_pending") {
        const items: AdminTaskProofItem[] = list.map((r: any) => {
          const prof = profileMap[r.user_id];
          return {
            id: r.id,
            task_id: r.task_id,
            user_id: r.user_id,
            member_name: prof?.display_name || prof?.email || "Earner",
            task_title: r.tasks?.title || "Community Task",
            reward_credits: Number(r.tasks?.reward_credits || 0),
            proof_url: r.proof_url,
            proof_text: r.proof_text,
            status: r.status,
            created_at: r.created_at,
            source: "credit_task",
          };
        });

        return {
          toolName,
          success: true,
          badge: "📋 Submitted Credit Tasks",
          message:
            items.length > 0
              ? `Found ${items.length} pending credit task submission(s) waiting for confirmation. Approve & Pay or Reject directly below.`
              : "No pending community credit task submissions waiting for review.",
          data: { adminTaskProofs: items },
        };
      }

      const match = list.find((r: any) => {
        if (r.id === args?.submissionIdOrQuery) return true;
        if (!queryStr) return false;
        const prof = profileMap[r.user_id];
        return (
          (r.tasks?.title || "").toLowerCase().includes(queryStr) ||
          (prof?.display_name || "").toLowerCase().includes(queryStr) ||
          (prof?.email || "").toLowerCase().includes(queryStr)
        );
      });

      if (!match) {
        return {
          toolName,
          success: false,
          badge: "Notice",
          message: "No matching pending credit task submission found. Ask me to list pending task submissions to inspect IDs.",
        };
      }

      const approve = action === "approve";
      const reason = approve ? null : args?.reason || "Proof did not meet task verification requirements.";
      const { data: rpcRes, error: rpcErr } = await callRpc<any>("review_task_proof", {
        p_submission_id: match.id,
        p_approve: approve,
        p_reason: reason,
      });

      if (rpcErr || !rpcRes?.success) {
        return {
          toolName,
          success: false,
          badge: "Review Failed",
          message: rpcRes?.error || rpcErr?.message || "Failed to review task proof.",
        };
      }

      if (match.user_id) {
        notifyTaskStatusPush({
          userId: match.user_id,
          taskTitle: match.tasks?.title || "Credit Task",
          approved: approve,
          rewardCredits: approve ? Number(match.tasks?.reward_credits) || 0 : undefined,
          reason: approve ? undefined : reason || undefined,
        }).catch(() => {});
      }

      const prof = profileMap[match.user_id];
      return {
        toolName,
        success: true,
        badge: approve ? "✅ Task Confirmed & Credited" : "❌ Task Submission Rejected",
        message: approve
          ? `Confirmed "${match.tasks?.title || "Credit Task"}" for ${
              prof?.display_name || prof?.email || "earner"
            } and paid +${match.tasks?.reward_credits || 0} GGG credits.`
          : `Rejected task submission for ${prof?.display_name || prof?.email || "earner"}.`,
      };
    }

    case "reviewSyndicateSubmissions": {
      const action = args?.action || "list_pending";
      const queryStr = String(args?.assignmentIdOrQuery || "").trim().toLowerCase();

      const { data: rows, error } = await supabase
        .from("syndicate_task_assignments")
        .select("*, syndicate_tasks(title, payout_amount)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(20);

      if (error) {
        return {
          toolName,
          success: false,
          badge: "Error",
          message: `Failed to load submitted syndicate proofs: ${error.message}`,
        };
      }

      const list = rows || [];
      const profileMap = await resolveProfileMap(list.map((r: any) => r.syndicate_user_id));

      if (action === "list_pending") {
        const items: AdminTaskProofItem[] = list.map((r: any) => {
          const prof = profileMap[r.syndicate_user_id];
          return {
            id: r.id,
            task_id: r.task_id,
            user_id: r.syndicate_user_id,
            member_name: prof?.display_name || prof?.email || "Promoter",
            task_title: (r as any).syndicate_tasks?.title || "Syndicate Campaign",
            reward_credits: Number((r as any).syndicate_tasks?.payout_amount || 0),
            proof_url: r.proof_url,
            proof_text: r.proof_notes || null,
            status: r.status,
            created_at: r.submitted_at || r.created_at,
            source: "syndicate_task",
          };
        });

        return {
          toolName,
          success: true,
          badge: "⚡ Syndicate Submitted Tasks",
          message:
            items.length > 0
              ? `Found ${items.length} submitted syndicate task proof(s) awaiting confirmation.`
              : "No pending syndicate task submissions right now.",
          data: { adminTaskProofs: items },
        };
      }

      const match = list.find((r: any) => {
        if (r.id === args?.assignmentIdOrQuery) return true;
        if (!queryStr) return false;
        const prof = profileMap[r.syndicate_user_id];
        return (
          ((r as any).syndicate_tasks?.title || "").toLowerCase().includes(queryStr) ||
          (prof?.display_name || "").toLowerCase().includes(queryStr) ||
          (prof?.email || "").toLowerCase().includes(queryStr)
        );
      });

      if (!match) {
        return {
          toolName,
          success: false,
          badge: "Notice",
          message: "No matching submitted syndicate assignment found. Ask me to list syndicate submissions first.",
        };
      }

      const approve = action === "approve";
      const res = await reviewSyndicateAssignment({
        assignmentId: match.id,
        approve,
        rejectionReason: approve ? null : args?.reason || "Proof did not meet syndicate guidelines.",
      });

      if (!res.success) {
        return {
          toolName,
          success: false,
          badge: "Review Failed",
          message: res.error || "Failed to review syndicate submission.",
        };
      }

      const prof = profileMap[match.syndicate_user_id];
      return {
        toolName,
        success: true,
        badge: approve ? "✅ Syndicate Proof Confirmed" : "❌ Syndicate Proof Rejected",
        message: approve
          ? `Approved syndicate task for ${prof?.display_name || prof?.email || "promoter"}${
              res.payout_credits ? ` (+${res.payout_credits} GGG credits)` : ""
            }.`
          : `Rejected syndicate proof for ${prof?.display_name || prof?.email || "promoter"}.`,
      };
    }

    case "reviewSyndicateApplications": {
      const action = args?.action || "list_pending";
      const queryStr = String(args?.applicationIdOrQuery || "").trim().toLowerCase();

      const { data: apps, error } = await supabase
        .from("syndicate_applications")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) {
        return {
          toolName,
          success: false,
          badge: "Error",
          message: `Failed to fetch syndicate applications: ${error.message}`,
        };
      }

      const list = apps || [];
      const profileMap = await resolveProfileMap(list.map((a: any) => a.user_id));

      const normalized: AdminSyndicateAppItem[] = list.map((a: any) => {
        const prof = profileMap[a.user_id];
        const platforms = Array.isArray(a.platforms)
          ? a.platforms
          : Array.isArray(a.requested_platforms)
          ? a.requested_platforms
          : ["whatsapp_status"];
        return {
          id: a.id,
          user_id: a.user_id,
          full_name: a.full_name || prof?.display_name || prof?.email || "Applicant",
          email: a.email || prof?.email || "",
          platforms,
          state: a.state || null,
          status: a.status,
          created_at: a.created_at,
        };
      });

      if (action === "list_pending") {
        return {
          toolName,
          success: true,
          badge: "👑 Pending Syndicate Applications",
          message:
            normalized.length > 0
              ? `Found ${normalized.length} pending syndicate application(s). Click Confirm or Reject directly below.`
              : "No pending syndicate applications in the queue right now.",
          data: { adminSyndicateApps: normalized },
        };
      }

      const matchIdx = list.findIndex((a: any, idx: number) => {
        const norm = normalized[idx];
        if (a.id === args?.applicationIdOrQuery || a.user_id === args?.applicationIdOrQuery) {
          return true;
        }
        if (!queryStr) return false;
        return (
          norm.full_name.toLowerCase().includes(queryStr) ||
          norm.email.toLowerCase().includes(queryStr)
        );
      });

      if (matchIdx === -1) {
        return {
          toolName,
          success: false,
          badge: "Notice",
          message: "No matching pending syndicate application found. List pending applications to select one directly.",
        };
      }

      const app = list[matchIdx];
      const norm = normalized[matchIdx];

      if (action === "approve") {
        await supabase
          .from("syndicate_applications")
          .update({ status: "approved", reviewed_at: new Date().toISOString() })
          .eq("id", app.id);

        const { data: existingSyn } = await supabase
          .from("syndicate_profiles")
          .select("id")
          .eq("user_id", app.user_id)
          .maybeSingle();

        if (!existingSyn) {
          await supabase.from("syndicate_profiles").insert({
            user_id: app.user_id,
            verified_platforms: norm.platforms,
            state: app.state || null,
          });
        }

        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", app.user_id)
          .eq("role", "syndicate")
          .maybeSingle();

        if (!existingRole) {
          await supabase.from("user_roles").insert({
            user_id: app.user_id,
            role: "syndicate",
          });
        }

        await supabase.from("notifications").insert({
          user_id: app.user_id,
          title: "🎉 Syndicate Approved!",
          message: `Approved for: ${norm.platforms.join(", ")}. Start earning now!`,
          type: "success",
        });

        return {
          toolName,
          success: true,
          badge: "✅ Syndicate Application Confirmed",
          message: `Confirmed Syndicate application for "${norm.full_name}" (${norm.email || norm.user_id}) and activated their promoter profile.`,
        };
      } else {
        await supabase
          .from("syndicate_applications")
          .update({ status: "rejected", reviewed_at: new Date().toISOString() })
          .eq("id", app.id);

        await supabase.from("notifications").insert({
          user_id: app.user_id,
          title: "❌ Application Rejected",
          message: "Your syndicate application was not approved at this time.",
          type: "warning",
        });

        return {
          toolName,
          success: true,
          badge: "❌ Syndicate Application Rejected",
          message: `Rejected syndicate application for "${norm.full_name}".`,
        };
      }
    }

    case "manageBannerAdvertsAdmin": {
      const action = args?.action || "list_pending";

      if (action === "create") {
        const rawBanner = generateProductPromoCanvas({
          title: args?.title || "GGD Official Spotlight Banner",
          price: args?.price !== undefined ? Number(args.price) : undefined,
          businessName: context.profile?.business_name || "GGD AD NETWORK",
          themeColor: args?.themeColor || "orange",
          format: args?.format || "banner_landscape",
          ctaText: args?.ctaText || "Learn More",
        });

        let finalImageUrl = args?.imageUrl || uploadedMediaUrl || rawBanner;
        if (!args?.imageUrl && !uploadedMediaUrl && rawBanner.startsWith("data:")) {
          const uploadedUrl = await uploadAgentDataUrl(rawBanner, context.userId);
          if (uploadedUrl) finalImageUrl = uploadedUrl;
        }

        const normalized = buildBannerAdvertInput({
          args,
          businessName: context.profile?.business_name || "GGD Official",
          userId: context.userId,
          uploadedMediaUrl: finalImageUrl,
          canvasDataUrl: rawBanner,
          isAdmin: true,
        });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + normalized.durationDays);

        const res = await createBannerAdIdempotent({
          idempotencyKey: generateBannerIdempotencyKey("vixora_admin_banner"),
          title: normalized.title,
          description: normalized.description,
          image_url: normalized.imageUrl,
          target_url: normalized.targetUrl,
          ad_type: "banner",
          duration_days: normalized.durationDays,
          is_active: true,
          approved: true,
          expires_at: expiresAt.toISOString(),
          deduct_credits: false,
          owner_user_id: context.userId,
        });

        if (!res.success || !res.ad) {
          return {
            toolName,
            success: false,
            badge: "Banner Creation Notice",
            message: res.error || "Could not publish banner advert.",
            data: { flyerUrl: rawBanner },
          };
        }

        return {
          toolName,
          success: true,
          badge: "📢 Live Banner Advert Published",
          message: `Created and published live pre-approved banner advert "${res.ad.title}" for ${normalized.durationDays} days.`,
          data: {
            flyerUrl: rawBanner,
            bannerAdResult: {
              ...res.ad,
              format: normalized.format,
              imageUrl: res.ad.image_url || rawBanner,
            },
          },
        };
      }

      const { data: allAds } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      const bannerAds = (allAds || []).filter(isBannerAdvert);

      if (action === "list_pending") {
        const pending = bannerAds.filter((a: any) => !a.approved && a.is_active !== false);
        return {
          toolName,
          success: true,
          badge: "📢 Banner Ad Moderation Queue",
          message:
            pending.length > 0
              ? `Found ${pending.length} pending banner advert(s) waiting for approval.`
              : "No pending banner adverts waiting for approval right now.",
          data: { adminBannerAds: pending },
        };
      }

      const q = String(args?.adIdOrQuery || "").trim().toLowerCase();
      const targetAd = bannerAds.find(
        (a: any) => a.id === args?.adIdOrQuery || (q && (a.title || "").toLowerCase().includes(q))
      );

      if (!targetAd) {
        return {
          toolName,
          success: false,
          badge: "Notice",
          message: "Could not find a matching banner advert to moderate.",
        };
      }

      if (action === "approve") {
        await supabase.from("ads").update({ approved: true, is_active: true }).eq("id", targetAd.id);
        if (targetAd.user_id) {
          notifyAdOrBusinessStatusPush({
            userId: targetAd.user_id,
            itemTitle: targetAd.title,
            itemType: "ad",
            approved: true,
          }).catch(() => {});
        }
        return {
          toolName,
          success: true,
          badge: "✅ Banner Ad Approved",
          message: `Approved banner advert "${targetAd.title}" — it is now live across GGD Ad Network.`,
        };
      }

      if (action === "reject" || action === "pause") {
        await supabase
          .from("ads")
          .update({ approved: action === "pause" ? targetAd.approved : false, is_active: false })
          .eq("id", targetAd.id);
        return {
          toolName,
          success: true,
          badge: action === "pause" ? "⏸️ Banner Ad Paused" : "❌ Banner Ad Rejected",
          message: `${action === "pause" ? "Paused" : "Rejected"} banner advert "${targetAd.title}".`,
        };
      }

      return { toolName, success: false, message: "Unsupported banner ad action." };
    }

    case "manageUsersAndWithdrawalsAdmin": {
      const action = args?.action || "list_withdrawals";
      const q = String(args?.targetIdOrQuery || "").trim();

      if (action === "list_withdrawals") {
        const { data: rows } = await supabase
          .from("withdrawal_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20);
        const list = rows || [];
        const profileMap = await resolveProfileMap(list.map((w: any) => w.user_id));
        const enriched = list.map((w: any) => ({
          ...w,
          member_name: profileMap[w.user_id]?.display_name || profileMap[w.user_id]?.email || "Member",
        }));

        return {
          toolName,
          success: true,
          badge: "💳 Pending Withdrawals",
          message:
            enriched.length > 0
              ? `Found ${enriched.length} pending withdrawal request(s) ready for review.`
              : "No pending withdrawal requests right now.",
          data: { adminWithdrawals: enriched },
        };
      }

      if (action === "approve_withdrawal" || action === "reject_withdrawal") {
        const approve = action === "approve_withdrawal";
        const { data, error } = await callRpc<any>("admin_process_withdrawal", {
          p_request_id: q,
          p_approve: approve,
          p_rejection_reason: approve ? null : args?.reason || "Details require verification",
        });
        if (error || (data && !data.success)) {
          return {
            toolName,
            success: false,
            badge: "Notice",
            message: data?.error || error?.message || "Failed to process withdrawal.",
          };
        }
        return {
          toolName,
          success: true,
          badge: approve ? "✅ Withdrawal Approved" : "❌ Withdrawal Rejected",
          message: approve
            ? `Withdrawal request ${q.slice(0, 8)} marked as approved/paid.`
            : `Withdrawal request ${q.slice(0, 8)} rejected and refunded.`,
        };
      }

      if (action === "search_users" || action === "grant_credits" || action === "activate_user") {
        if (!q) {
          return {
            toolName,
            success: false,
            badge: "Notice",
            message: "Please specify a user email, name, or user ID.",
          };
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
        const queryBuilder = supabase
          .from("profiles")
          .select("user_id, email, display_name, business_name, credits, is_activated");
        const { data: matched } = isUuid
          ? await queryBuilder.eq("user_id", q).limit(5)
          : await queryBuilder
              .or(`email.ilike.%${q}%,display_name.ilike.%${q}%,business_name.ilike.%${q}%`)
              .limit(8);

        const users = matched || [];
        if (action === "search_users") {
          return {
            toolName,
            success: true,
            badge: "👥 User Lookup Results",
            message:
              users.length > 0
                ? `Found ${users.length} matching account(s) for "${q}".`
                : `No user accounts matched "${q}".`,
            data: { adminUsers: users },
          };
        }

        const target = users[0];
        if (!target) {
          return {
            toolName,
            success: false,
            badge: "Notice",
            message: `No user found matching "${q}".`,
          };
        }

        if (action === "activate_user") {
          await supabase
            .from("profiles")
            .update({ is_activated: true, activated_at: new Date().toISOString() } as any)
            .eq("user_id", target.user_id);
          return {
            toolName,
            success: true,
            badge: "✅ Account Activated",
            message: `Activated account for ${target.display_name || target.email}.`,
          };
        }

        if (action === "grant_credits") {
          const amt = Number(args?.amount) || 200;
          const nextCredits = Number(target.credits || 0) + amt;
          await supabase
            .from("profiles")
            .update({ credits: nextCredits })
            .eq("user_id", target.user_id);
          await supabase.from("notifications").insert({
            user_id: target.user_id,
            title: "🎁 Credits Added by Admin",
            message: `An administrator credited +${amt.toLocaleString()} GGG credits to your account.`,
            type: "credit",
          });
          return {
            toolName,
            success: true,
            badge: "💰 Credits Granted",
            message: `Added +${amt.toLocaleString()} GGG credits to ${
              target.display_name || target.email
            } (New balance: ${nextCredits.toLocaleString()}).`,
          };
        }
      }

      return { toolName, success: false, message: "Unknown user/withdrawal admin action." };
    }

    case "navigateAdminSection": {
      const section = String(args?.section || "syndicate").trim();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ggd-admin-navigate", { detail: { section } }));
      }
      return {
        toolName,
        success: true,
        badge: "🧭 Navigated Admin Portal",
        message: `Opened the "${section}" section in your Admin Portal.`,
        data: { navigateAdminSection: section },
      };
    }

    default:
      return {
        toolName,
        success: false,
        message: "Unsupported admin tool.",
      };
  }
}

export async function parseAndExecuteAdminIntent(
  query: string,
  context: BusinessOverviewContext,
  uploadedMediaUrl?: string
): Promise<AdminToolExecutionResult | null> {
  const intent = parseAdminNaturalLanguageIntent(query);
  if (!intent) return null;
  return executeAdminAgentTool(intent.toolName, intent.args, context, uploadedMediaUrl);
}
