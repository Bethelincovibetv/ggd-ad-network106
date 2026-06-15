// Sends an email campaign: checks credits, deducts, fans out via Gmail, tracks delivery.
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

function b64url(s: string) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function buildRaw(from: string, to: string, subject: string, html: string) {
  const b = "ggd_" + Math.random().toString(36).slice(2);
  const msg = [
    `From: ${from}`, `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${b}"`, "",
    `--${b}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: 7bit", "", html, "",
    `--${b}--`,
  ].join("\r\n");
  return b64url(msg);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) return new Response(JSON.stringify({ error: "campaign_id required" }), { status: 400, headers: corsHeaders });

    const admin = createClient(SB_URL, SB_SERVICE);

    // Feature toggle check
    const { data: ft } = await admin.from("feature_toggles").select("is_enabled").eq("feature_key", "email_campaigns").maybeSingle();
    if (ft && ft.is_enabled === false) {
      return new Response(JSON.stringify({ error: "Email campaigns are disabled" }), { status: 403, headers: corsHeaders });
    }

    const { data: campaign, error: cErr } = await admin.from("email_campaigns").select("*").eq("id", campaign_id).single();
    if (cErr || !campaign) return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: corsHeaders });
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return new Response(JSON.stringify({ error: "Campaign already processed" }), { status: 409, headers: corsHeaders });
    }

    // Resolve recipients
    let recipients: { email: string; user_id?: string | null }[] = [];
    if (campaign.target_mode === "upload") {
      const { data: uft } = await admin.from("feature_toggles").select("is_enabled").eq("feature_key", "email_custom_upload_list").maybeSingle();
      if (uft && uft.is_enabled === false) return new Response(JSON.stringify({ error: "Custom upload lists are disabled" }), { status: 403, headers: corsHeaders });
      recipients = (campaign.uploaded_emails || []).map((e: string) => ({ email: e.trim().toLowerCase() })).filter(r => r.email);
    } else {
      let q = admin.from("profiles").select("user_id,email,state,business_industry");
      if (campaign.target_mode === "filter") {
        if (campaign.filter_states?.length) q = q.in("state", campaign.filter_states);
        if (campaign.filter_industries?.length) q = q.in("business_industry", campaign.filter_industries);
      }
      const { data: profs } = await q.limit(50000);
      const ids = (profs || []).map(p => p.user_id);
      // Filter to users opted in to marketing_promo
      const { data: prefs } = await admin.from("user_email_preferences")
        .select("user_id,opted_in,marketing_opt_in")
        .eq("activity_key", "marketing_promo")
        .in("user_id", ids);
      const optedSet = new Set((prefs || []).filter(p => p.opted_in || p.marketing_opt_in).map(p => p.user_id));
      // default_opt_in=false for marketing_promo: only include users who explicitly opted in
      recipients = (profs || []).filter(p => optedSet.has(p.user_id) && p.email).map(p => ({ email: p.email, user_id: p.user_id }));
    }
    // dedupe
    const seen = new Set<string>();
    recipients = recipients.filter(r => { const k = r.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

    if (recipients.length === 0) {
      await admin.from("email_campaigns").update({ status: "failed", failed_count: 0 }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "No recipients matched" }), { status: 400, headers: corsHeaders });
    }

    // Cost
    const { data: priceRow } = await admin.from("app_settings").select("value").eq("key", "email_campaign_credit_per_recipient").maybeSingle();
    const perRecipient = parseInt(priceRow?.value || "1") || 1;
    const cost = recipients.length * perRecipient;

    // Deduct credits from owner
    const { data: profile } = await admin.from("profiles").select("credits").eq("user_id", campaign.user_id).single();
    if (!profile || (profile.credits || 0) < cost) {
      await admin.from("email_campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: `Insufficient credits. Need ${cost}, have ${profile?.credits || 0}` }), { status: 402, headers: corsHeaders });
    }
    await admin.from("profiles").update({ credits: (profile.credits || 0) - cost }).eq("user_id", campaign.user_id);

    await admin.from("email_campaigns").update({
      status: "sending",
      recipient_count: recipients.length,
      credit_cost: cost,
    }).eq("id", campaign_id);

    // Insert recipient rows
    const rows = recipients.map(r => ({ campaign_id, recipient_email: r.email, recipient_user_id: r.user_id || null, status: "pending" }));
    for (let i = 0; i < rows.length; i += 200) {
      await admin.from("email_campaign_recipients").insert(rows.slice(i, i + 200));
    }

    // Sender
    const { data: sn } = await admin.from("app_settings").select("key,value").in("key", ["email_sender_name", "email_sender_address"]);
    const senderName = sn?.find(s => s.key === "email_sender_name")?.value || "GGD Ad Network";
    const senderAddr = sn?.find(s => s.key === "email_sender_address")?.value || "me";
    const from = senderAddr && senderAddr !== "me" ? `${senderName} <${senderAddr}>` : senderName;

    // Fan out (sequential, light throttle to respect Gmail limits)
    let sent = 0, failed = 0;
    for (const r of recipients) {
      try {
        const raw = buildRaw(from, r.email, campaign.subject, campaign.html_body);
        const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": GMAIL_KEY },
          body: JSON.stringify({ raw }),
        });
        const out = await res.json();
        const ok = res.ok;
        await admin.from("email_campaign_recipients").update({
          status: ok ? "sent" : "failed",
          error_message: ok ? null : JSON.stringify(out).slice(0, 300),
          sent_at: ok ? new Date().toISOString() : null,
        }).eq("campaign_id", campaign_id).eq("recipient_email", r.email);
        await admin.from("email_send_log").insert({
          message_id: out?.id || null, source: "campaign", source_ref: campaign_id,
          template_name: campaign.name, sender_user_id: campaign.user_id,
          recipient_email: r.email, recipient_user_id: r.user_id || null,
          subject: campaign.subject, status: ok ? "sent" : "failed",
          error_message: ok ? null : JSON.stringify(out).slice(0, 500),
        });
        if (ok) sent++; else failed++;
        await new Promise(s => setTimeout(s, 120));
      } catch (err) {
        failed++;
        await admin.from("email_campaign_recipients").update({ status: "failed", error_message: String(err).slice(0, 300) })
          .eq("campaign_id", campaign_id).eq("recipient_email", r.email);
      }
    }

    await admin.from("email_campaigns").update({
      status: "sent", sent_count: sent, failed_count: failed, sent_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ ok: true, sent, failed, total: recipients.length, cost }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});