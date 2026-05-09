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

    const prompt = `Cinematic, vibrant hero banner for a business called "${businessName}"${category ? ` in the ${category} industry` : ''}. ${description || ''}. Modern, professional, eye-catching marketing photo, no text, 16:9 wide composition, premium brand quality.`;

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
