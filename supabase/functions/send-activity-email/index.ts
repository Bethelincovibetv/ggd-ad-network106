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

interface FeaturedAd {
  sponsorName: string;
  badge?: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  tagline?: string;
}

const DEFAULT_ADS: FeaturedAd[] = [
  {
    sponsorName: "GGD Creator Studio",
    badge: "🚀 VIRAL SPOTLIGHT",
    title: "Unlock 4,000 Watch Hours & 1,000 Subscribers",
    description: "Skyrocket your YouTube channel monetization with organic syndicate engagement and genuine high-retention 4K views.",
    imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80",
    ctaText: "Boost My Channel Now",
    ctaUrl: "https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=syndicate",
    tagline: "Trusted by over 10,000+ creators worldwide",
  },
  {
    sponsorName: "GGD Syndicate Elite",
    badge: "💰 70% COMMISSION OFFER",
    title: "Earn 70% Recurring Commissions as a Promoter",
    description: "Promote verified merchant campaigns and receive automatic instant Paystack subaccount direct bank payouts every single day.",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
    ctaText: "Join VIP Syndicate",
    ctaUrl: "https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=syndicate-register",
    tagline: "Zero hidden fees • Instant NUBAN settlements",
  },
  {
    sponsorName: "GGD Marketplace",
    badge: "🛍️ FEATURED MERCHANT",
    title: "Launch Your Global Digital Storefront in 60s",
    description: "Showcase digital products, courses, and business services to high-intent buyers across the entire ad network.",
    imageUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80",
    ctaText: "Explore Storefronts",
    ctaUrl: "https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=store",
    tagline: "Verified Badge & Free Escrow Protection",
  }
];

function template({
  title,
  message,
  brandName,
  recipientName = "Valued Member",
  featuredAd,
  ctaText,
  ctaUrl,
}: {
  title: string;
  message: string;
  brandName: string;
  recipientName?: string;
  featuredAd?: FeaturedAd | null;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const currentYear = new Date().getFullYear();
  const ad = featuredAd !== undefined ? featuredAd : DEFAULT_ADS[Math.floor(Math.random() * DEFAULT_ADS.length)];

  const formattedMessage = message
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#e2e8f0">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const ctaButtonHtml = ctaText && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 12px">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316 0%,#ea580c 50%,#c2410c 100%);color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;box-shadow:0 4px 14px rgba(249,115,22,0.4);text-transform:uppercase;letter-spacing:0.5px">
            ${ctaText} &rarr;
          </a>
        </td>
      </tr>
    </table>
  ` : "";

  const adHtml = ad ? `
    <!-- Featured Sponsor Ad -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px dashed #374151;padding-top:22px">
      <tr>
        <td>
          <div style="margin-bottom:10px">
            <span style="display:inline-block;font-size:10px;font-weight:900;color:#fbbf24;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px">
              ${ad.badge || "🌟 FEATURED SPONSOR AD"}
            </span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e1b4b 0%,#172554 50%,#0f172a 100%);border:1px solid #6366f1;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
            ${ad.imageUrl ? `
              <tr>
                <td>
                  <a href="${ad.ctaUrl}" target="_blank" style="text-decoration:none;display:block">
                    <img src="${ad.imageUrl}" alt="${ad.title}" width="100%" style="width:100%;max-height:180px;object-fit:cover;display:block;border-bottom:1px solid rgba(99,102,241,0.4)" />
                  </a>
                </td>
              </tr>
            ` : ""}
            <tr>
              <td style="padding:18px 20px">
                <div style="font-size:11px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${ad.sponsorName}</div>
                <h3 style="margin:0 0 8px;font-size:16px;font-weight:800;color:#ffffff;line-height:1.35">${ad.title}</h3>
                <p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#cbd5e1">${ad.description}</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <a href="${ad.ctaUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%);color:#ffffff;text-decoration:none;font-size:12px;font-weight:800;padding:10px 20px;border-radius:10px;box-shadow:0 4px 12px rgba(99,102,241,0.4)">
                        ${ad.ctaText} &rarr;
                      </a>
                    </td>
                    ${ad.tagline ? `
                      <td align="right" style="font-size:10px;color:#94a3b8;font-style:italic">${ad.tagline}</td>
                    ` : ""}
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f19;padding:32px 10px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#111827;border:1px solid #1f2937;border-radius:20px;overflow:hidden;max-width:600px;box-shadow:0 20px 40px rgba(0,0,0,0.6)">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c 0%,#f97316 50%,#fb923c 100%);padding:22px 28px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">⚡ ${brandName}</div>
                    <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.9);margin-top:2px">Activity & Partner Updates</div>
                  </td>
                  <td align="right">
                    <span style="background:rgba(0,0,0,0.25);color:#ffffff;font-size:10px;font-weight:800;padding:5px 10px;border-radius:12px;text-transform:uppercase;border:1px solid rgba(255,255,255,0.2)">
                      VERIFIED
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 28px;color:#f1f5f9">
              <div style="font-size:12px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">
                Hello, ${recipientName}
              </div>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#ffffff;line-height:1.35;letter-spacing:-0.3px">
                ${title}
              </h1>
              <div>
                ${formattedMessage}
              </div>

              ${ctaButtonHtml}

              ${adHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0c121e;padding:22px 28px;border-top:1px solid #1e293b;color:#64748b;font-size:11px;line-height:1.6">
              <p style="margin:0 0 6px;color:#94a3b8;font-weight:600">${brandName} • Secure Ad & Syndicate Network</p>
              <p style="margin:0">You received this email because activity notifications are enabled for your account.</p>
              <p style="margin:8px 0 0;color:#475569">© ${currentYear} ${brandName}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    const html = template({
      title,
      message,
      brandName: senderName,
      recipientName: profile?.display_name || "Valued Member",
    });
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