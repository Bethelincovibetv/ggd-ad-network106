// Sends an activity email if (a) admin has the activity_key enabled and (b) user has opted in.
// Called by DB trigger on notifications insert (via pg_net) or directly from app code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GMAIL_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY")!;

const TYPE_TO_KEY: Record<string, string> = {
  task: "task_assigned",
  task_approved: "task_approved",
  task_rejected: "task_rejected",
  withdrawal: "withdrawal_status",
  syndicate: "syndicate_application",
  referral: "new_referral",
  follower: "new_follower",
  review: "new_review",
  credit_low: "low_credits",
  premium: "premium_expiring",
  comment: "new_comment",
  reaction: "new_reaction",
  login: "login_alert",
  admin: "admin_announcement",
  warning: "task_rejected",
};

function b64url(s: string) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }

function template({ title, message, brandName }: { title: string; message: string; brandName: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0f0f0f;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;max-width:600px">
        <tr><td style="background:linear-gradient(135deg,#e67e22,#d35400);padding:20px 24px;color:#fff;font-weight:700;font-size:18px">${brandName}</td></tr>
        <tr><td style="padding:28px 24px;color:#f1f1f1">
          <h1 style="margin:0 0 12px;font-size:22px;color:#fff">${title}</h1>
          <p style="margin:0;line-height:1.6;color:#ccc;white-space:pre-wrap">${message}</p>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #2a2a2a;color:#777;font-size:12px">
          You're receiving this because you enabled activity emails. Manage preferences in your account settings.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, activity_key, notification_type, title, message } = await req.json();
    const key = activity_key || TYPE_TO_KEY[notification_type as string];
    if (!user_id || !key || !title || !message) {
      return new Response(JSON.stringify({ skipped: "missing fields" }), { status: 200, headers: corsHeaders });
    }

    const admin = createClient(SB_URL, SB_SERVICE);

    // Global feature toggle
    const { data: ft } = await admin.from("feature_toggles").select("is_enabled").eq("feature_key", "activity_emails").maybeSingle();
    if (ft && ft.is_enabled === false) return new Response(JSON.stringify({ skipped: "feature off" }), { headers: corsHeaders });

    // Admin per-activity toggle
    const { data: act } = await admin.from("email_activity_types").select("is_enabled,default_opt_in,label").eq("activity_key", key).maybeSingle();
    if (!act || !act.is_enabled) return new Response(JSON.stringify({ skipped: "activity disabled" }), { headers: corsHeaders });

    // User preference
    const { data: pref } = await admin.from("user_email_preferences").select("opted_in").eq("user_id", user_id).eq("activity_key", key).maybeSingle();
    const optedIn = pref ? pref.opted_in : act.default_opt_in;
    if (!optedIn) return new Response(JSON.stringify({ skipped: "user opted out" }), { headers: corsHeaders });

    // Recipient
    const { data: profile } = await admin.from("profiles").select("email,display_name").eq("user_id", user_id).maybeSingle();
    if (!profile?.email) return new Response(JSON.stringify({ skipped: "no email" }), { headers: corsHeaders });

    const { data: sn } = await admin.from("app_settings").select("key,value").in("key", ["email_sender_name", "email_sender_address"]);
    const senderName = sn?.find(s => s.key === "email_sender_name")?.value || "GGD Ad Network";
    const senderAddr = sn?.find(s => s.key === "email_sender_address")?.value || "me";
    const from = senderAddr && senderAddr !== "me" ? `${senderName} <${senderAddr}>` : senderName;

    const html = template({ title, message, brandName: senderName });
    const b = "ggd_" + Math.random().toString(36).slice(2);
    const raw = b64url([
      `From: ${from}`, `To: ${profile.email}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(title)))}?=`,
      "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${b}"`, "",
      `--${b}`, 'Content-Type: text/html; charset="UTF-8"', "", html, "", `--${b}--`,
    ].join("\r\n"));

    const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GMAIL_KEY },
      body: JSON.stringify({ raw }),
    });
    const out = await res.json();
    await admin.from("email_send_log").insert({
      message_id: out?.id || null, source: "activity", template_name: key,
      recipient_email: profile.email, recipient_user_id: user_id, subject: title,
      status: res.ok ? "sent" : "failed", error_message: res.ok ? null : JSON.stringify(out).slice(0, 500),
    });
    return new Response(JSON.stringify({ ok: res.ok }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});