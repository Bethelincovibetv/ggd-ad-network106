// Uses the Lovable AI Gateway to produce a beautifully designed HTML email body.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { subject, businessName, callToAction, ctaUrl, tone } = await req.json();
    if (!subject) return new Response(JSON.stringify({ error: "subject required" }), { status: 400, headers: corsHeaders });

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const prompt = `Design a stunning, professional promotional HTML email.
Subject/topic: "${subject}"
Brand: ${businessName || "GGD Ad Network"}
CTA text: "${callToAction || "Learn more"}"
CTA URL: ${ctaUrl || "#"}
Tone: ${tone || "modern, premium, persuasive"}

Requirements:
- Return ONLY a complete HTML document (no markdown, no commentary, no \`\`\`).
- Use a single 600px wide table layout, all inline CSS, email-client safe.
- Dark theme background (#0f0f0f) with a white #ffffff content container OR keep dark; use orange (#e67e22 → #d35400) gradient accents.
- Include a header with brand name, a striking hero headline, supportive body paragraphs, bullet/feature list if relevant, a big orange CTA button, and a small footer.
- Use system fonts (Arial, Helvetica). No external images, no <script>, no <link>.
- Make it visually rich, beautiful, and high-converting — never plain text.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert email designer. Output only valid email-safe HTML." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    let html: string = data?.choices?.[0]?.message?.content || "";
    html = html.replace(/```html|```/g, "").trim();
    return new Response(JSON.stringify({ html }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});