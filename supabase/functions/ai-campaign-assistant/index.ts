// AI Campaign Assistant — helps users write & plan better campaigns.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { product, audience, goal, currentTitle, currentDescription, analytics } = await req.json();
    if (!product && !currentTitle) {
      return new Response(JSON.stringify({ error: "Describe your product or advert first" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const prompt = `You are the GGD Ad Network campaign strategist for Nigerian businesses. Currency is credits (GGG) and Naira.

Business / product: ${product || "(not given)"}
Stated audience: ${audience || "(not given)"}
Campaign goal: ${goal || "more sales & traffic"}
Existing headline: ${currentTitle || "(none)"}
Existing description: ${currentDescription || "(none)"}
Recent performance data: ${analytics ? JSON.stringify(analytics) : "(no data yet)"}

Return ONLY minified JSON, no markdown, with exactly these keys:
{"headlines":[3 short punchy ad headlines, max 60 chars],
"descriptions":[2 persuasive ad descriptions, max 220 chars],
"improvements":[3 concrete improvement tips for the existing advert],
"audience":"one sentence describing the best target audience incl. Nigerian states",
"budget":"recommended budget in credits with one-line reasoning",
"duration":"recommended campaign duration in days with one-line reasoning",
"campaignType":"one of: Banner Advert, Earn Task, YouTube Watch Advert, Syndicate Social Campaign — plus a short reason"}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5.6-sol", input: prompt }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "AI is busy — please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up to keep using the assistant." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail: t.slice(0, 400) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    let text: string = data.output_text || "";
    if (!text && Array.isArray(data.output)) {
      for (const item of data.output) {
        for (const c of item?.content || []) {
          if (typeof c?.text === "string") text += c.text;
        }
      }
    }
    text = text.replace(/```json|```/g, "").trim();
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { improvements: [text] };
    }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
