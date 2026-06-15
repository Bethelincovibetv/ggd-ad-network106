// Sends a single email through the connected Gmail account via the connector gateway.
// Used by: admin direct-send, activity notifications, and campaign fan-out.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GMAIL_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function toBase64Url(s: string) {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRaw({ from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
  const boundary = "ggd_" + Math.random().toString(36).slice(2);
  const msg = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    subject,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
  return toBase64Url(msg);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { to, subject, html, source = "admin", source_ref = null, sender_user_id = null, recipient_user_id = null, template_name = null } = body;
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SB_URL, SB_SERVICE);

    // Sender name + address
    const { data: settings } = await admin.from("app_settings").select("key,value").in("key", ["email_sender_name", "email_sender_address"]);
    const senderName = settings?.find(s => s.key === "email_sender_name")?.value || "GGD Ad Network";
    const senderAddr = settings?.find(s => s.key === "email_sender_address")?.value || "me";
    const from = senderAddr && senderAddr !== "me" ? `${senderName} <${senderAddr}>` : senderName;

    const raw = buildRaw({ from, to, subject, html });

    const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GMAIL_KEY,
      },
      body: JSON.stringify({ raw }),
    });
    const out = await res.json();
    const ok = res.ok;

    await admin.from("email_send_log").insert({
      message_id: out?.id || null,
      source, source_ref, template_name,
      sender_user_id, recipient_email: to, recipient_user_id,
      subject,
      status: ok ? "sent" : "failed",
      error_message: ok ? null : JSON.stringify(out).slice(0, 500),
    });

    return new Response(JSON.stringify({ ok, message_id: out?.id, error: ok ? null : out }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});