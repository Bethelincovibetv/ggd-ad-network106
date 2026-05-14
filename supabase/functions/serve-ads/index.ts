import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const adId = url.searchParams.get('ad_id')
    const trackEvent = url.searchParams.get('event')

    // Track impression or click
    if (trackEvent && adId) {
      await supabase.from('ad_events').insert({
        ad_id: adId,
        event_type: trackEvent,
      })

      // Update counters on ads table
      if (trackEvent === 'click') {
        const { data: ad } = await supabase.from('ads').select('clicks').eq('id', adId).single()
        if (ad) {
          await supabase.from('ads').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', adId)
        }
      } else if (trackEvent === 'impression') {
        const { data: ad } = await supabase.from('ads').select('impressions').eq('id', adId).single()
        if (ad) {
          await supabase.from('ads').update({ impressions: (ad.impressions || 0) + 1 }).eq('id', adId)
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Serve active ads
    const now = new Date().toISOString()
    const { data: ads, error } = await supabase
      .from('ads')
      .select('id, title, description, image_url, target_url, target_state, ad_type, approved')
      .eq('is_active', true)
      .eq('approved', true)
      .eq('ad_type', 'banner')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .limit(20)

    if (error) throw error

    const list = (ads && ads.length > 0) ? ads : [{
      id: 'fallback',
      title: 'Promote Your Business on GGD Ad Network',
      description: 'Reach thousands of Nigerians daily. Create your first ad in seconds.',
      image_url: null,
      target_url: 'https://ggdadnetwork.com',
    }]

    return new Response(JSON.stringify({ ads: list }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
