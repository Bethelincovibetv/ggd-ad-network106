import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
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
    
    // Get API key from header or query param
    const apiKey = req.headers.get('x-api-key') || url.searchParams.get('api_key')
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing API key. Include x-api-key header or api_key query parameter.',
        docs: 'See /api-docs for documentation'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active, domain, requests_count')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Increment request count
    await supabase.from('api_keys').update({ 
      requests_count: (keyData.requests_count || 0) + 1 
    }).eq('id', keyData.id)

    // === GET: Fetch active ads ===
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)
      const now = new Date().toISOString()
      
      const { data: ads, error } = await supabase
        .from('ads')
        .select('id, title, description, image_url, target_url')
        .eq('is_active', true)
        .eq('approved', true)
        .eq('ad_type', 'banner')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(limit)

      if (error) throw error

      return new Response(JSON.stringify({ 
        success: true,
        ads: ads || [],
        count: (ads || []).length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === POST: Submit ad or track event ===
    if (req.method === 'POST') {
      const body = await req.json()
      
      // Track impression/click
      if (body.event_type && body.ad_id) {
        if (!['impression', 'click'].includes(body.event_type)) {
          return new Response(JSON.stringify({ error: 'event_type must be "impression" or "click"' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        await supabase.from('ad_events').insert({
          ad_id: body.ad_id,
          event_type: body.event_type,
        })

        if (body.event_type === 'click') {
          const { data: ad } = await supabase.from('ads').select('clicks').eq('id', body.ad_id).single()
          if (ad) await supabase.from('ads').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', body.ad_id)
        } else {
          const { data: ad } = await supabase.from('ads').select('impressions').eq('id', body.ad_id).single()
          if (ad) await supabase.from('ads').update({ impressions: (ad.impressions || 0) + 1 }).eq('id', body.ad_id)
        }

        return new Response(JSON.stringify({ success: true, event: body.event_type }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Submit a new ad
      if (body.title && body.target_url) {
        if (!body.title || body.title.length > 255) {
          return new Response(JSON.stringify({ error: 'title is required and must be under 255 chars' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        if (!body.target_url || !body.target_url.startsWith('http')) {
          return new Response(JSON.stringify({ error: 'valid target_url (http/https) is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const durationDays = Number(body.duration_days)
        if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
          return new Response(JSON.stringify({ error: 'duration_days must be a whole number between 1 and 365' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const externalReference = typeof body.external_reference === 'string' ? body.external_reference.trim() : null
        if (externalReference && externalReference.length > 100) {
          return new Response(JSON.stringify({ error: 'external_reference is too long' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        if (externalReference) {
          const { data: existingAd } = await supabase.from('ads')
            .select('id, title, is_active, approved, expires_at, created_at')
            .eq('user_id', keyData.user_id)
            .eq('external_reference', externalReference)
            .maybeSingle()
          if (existingAd) {
            return new Response(JSON.stringify({ success: true, already_exists: true, ad: existingAd }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        }

        // The serving endpoint requires BOTH flags, so keep them in sync.
        const { data: toggleData } = await supabase
          .from('feature_toggles')
          .select('is_enabled')
          .eq('feature_key', 'auto_approve_api_ads')
          .maybeSingle()
        const autoApprove = toggleData?.is_enabled === true
        const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString()

        const { data: newAd, error: insertError } = await supabase.from('ads').insert({
          user_id: keyData.user_id,
          title: body.title.slice(0, 255),
          description: (body.description || '').slice(0, 1000),
          image_url: body.image_url || null,
          target_url: body.target_url,
          duration_days: durationDays,
          external_reference: externalReference,
          ad_type: 'banner',
          is_active: autoApprove,
          approved: autoApprove,
          expires_at: expiresAt,
        }).select('id, title, is_active, approved, expires_at, created_at').single()

        if (insertError) {
          if (externalReference) {
            const { data: existingAd } = await supabase.from('ads')
              .select('id, title, is_active, approved, expires_at, created_at')
              .eq('user_id', keyData.user_id)
              .eq('external_reference', externalReference)
              .maybeSingle()
            if (existingAd) return new Response(JSON.stringify({ success: true, already_exists: true, ad: existingAd }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
          throw insertError
        }

        return new Response(JSON.stringify({
          success: true,
          message: autoApprove
            ? 'Ad submitted and automatically approved! It is now live.'
            : 'Ad submitted successfully. It will be reviewed and activated by admin.',
          ad: newAd
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ 
        error: 'Invalid request body. Provide {title, target_url} to submit an ad, or {ad_id, event_type} to track.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
