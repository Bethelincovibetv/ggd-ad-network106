import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { businessName, category, description } = body;

    const prompt = `Ultra-premium, award-winning hero banner for "${businessName}"${category ? `, a ${category} business` : ''}. ${description || ''}.

Style: cinematic editorial photography, magazine-cover quality, dramatic studio lighting with soft rim light and golden-hour glow, shallow depth of field, rich saturated colors, glossy luxurious finish, contemporary high-end brand aesthetic inspired by Apple, Nike and Vogue campaigns.

Composition: 16:9 ultra-wide cinematic banner, hero subject placed using rule-of-thirds with clean negative space on the right for future text overlay, layered foreground/midground/background depth, subtle bokeh, professional color grading (teal & orange or moody cinematic palette appropriate to the industry).

Quality: hyper-detailed, sharp focus, 8K, photoreal, professional product/lifestyle photography, NO text, NO logos, NO watermarks, NO writing of any kind, NO low-quality or amateur look.`;

    const aiKey = Deno.env.get('LOVABLE_API_KEY');
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(JSON.stringify({ error: 'AI failed', detail: txt }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiResp.json();
    const imgUrl = aiJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imgUrl) return new Response(JSON.stringify({ error: 'No image generated' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Decode base64 data URL and upload to storage
    const base64 = imgUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const path = `${user.id}/hero_${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from('business-logos').upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(path);

    await supabase.from('business_profiles').update({ hero_image_url: publicUrl }).eq('user_id', user.id);

    return new Response(JSON.stringify({ url: publicUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
