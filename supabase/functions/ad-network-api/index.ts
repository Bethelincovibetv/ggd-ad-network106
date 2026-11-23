import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, idempotency-key, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AdCreateOutcome {
  status: number
  payload: Record<string, unknown>
}

// Coalesce concurrent requests with the same (user_id, idempotencyKey) within the Edge isolate
const inFlightAdSubmissions = new Map<string, Promise<AdCreateOutcome>>()

function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isMissingColumnErr(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  const msg = String(err.message || '')
  return err.code === '42703' || err.code === 'PGRST204' || msg.includes('does not exist') || msg.includes('schema cache')
}

function isDuplicateViolationErr(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  const msg = String(err.message || '').toLowerCase()
  return err.code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')
}

async function findExistingAdByKey(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  key: string,
) {
  const cols = 'id, title, description, image_url, target_url, is_active, approved, expires_at, created_at'
  // Try idempotency_key first, then external_reference, handling unmigrated columns gracefully
  const { data: byIdem, error: idemErr } = await supabase
    .from('ads')
    .select(cols)
    .eq('user_id', userId)
    .eq('idempotency_key', key)
    .maybeSingle()

  if (!idemErr && byIdem) return byIdem

  const { data: byRef, error: refErr } = await supabase
    .from('ads')
    .select(cols)
    .eq('user_id', userId)
    .eq('external_reference', key)
    .maybeSingle()

  if (!refErr && byRef) return byRef
  return null
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
        const cleanTitle = typeof body.title === 'string' ? body.title.trim() : ''
        const cleanTargetUrl = typeof body.target_url === 'string' ? body.target_url.trim() : ''
        if (!cleanTitle || cleanTitle.length > 255) {
          return new Response(JSON.stringify({ error: 'title is required and must be under 255 chars' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        if (!cleanTargetUrl || !/^https?:\/\//i.test(cleanTargetUrl)) {
          return new Response(JSON.stringify({ error: 'valid target_url (http/https) is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const durationDays = body.duration_days === undefined ? 7 : Number(body.duration_days)
        if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
          return new Response(JSON.stringify({ error: 'duration_days must be a whole number between 1 and 365' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const headerKey = normalizeIdempotencyKey(
          req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key')
        )
        const bodyIdemKey = normalizeIdempotencyKey(body.idempotency_key ?? body.idempotencyKey)
        const externalReference = normalizeIdempotencyKey(body.external_reference)

        if (headerKey && bodyIdemKey && headerKey !== bodyIdemKey) {
          return new Response(JSON.stringify({ error: 'Conflicting Idempotency-Key header and idempotency_key payload' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const effectiveKey = headerKey || bodyIdemKey || externalReference
        if (effectiveKey && effectiveKey.length > 128) {
          return new Response(JSON.stringify({ error: 'Idempotency key is too long (max 128 chars)' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const runSubmission = async (): Promise<AdCreateOutcome> => {
          if (effectiveKey) {
            const existingAd = await findExistingAdByKey(supabase, keyData.user_id, effectiveKey)
            if (existingAd) {
              return {
                status: 200,
                payload: {
                  success: true,
                  already_exists: true,
                  idempotent_replay: true,
                  idempotency_key: effectiveKey,
                  ad: existingAd,
                },
              }
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

          const baseInsert: Record<string, unknown> = {
            user_id: keyData.user_id,
            title: cleanTitle.slice(0, 255),
            description: (typeof body.description === 'string' ? body.description : '').slice(0, 1000),
            image_url: typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null,
            target_url: cleanTargetUrl,
            target_state: typeof body.target_state === 'string' && body.target_state.trim() && body.target_state !== 'all'
              ? body.target_state.trim()
              : null,
            ad_type: 'banner',
            is_active: autoApprove,
            approved: autoApprove,
            expires_at: expiresAt,
          }

          const cols = 'id, title, description, image_url, target_url, is_active, approved, expires_at, created_at'
          const candidates: Record<string, unknown>[] = []
          if (effectiveKey) {
            candidates.push({
              ...baseInsert,
              duration_days: durationDays,
              idempotency_key: effectiveKey,
              external_reference: externalReference || effectiveKey,
            })
            candidates.push({
              ...baseInsert,
              idempotency_key: effectiveKey,
            })
            candidates.push({
              ...baseInsert,
              external_reference: externalReference || effectiveKey,
            })
          }
          candidates.push(baseInsert)

          let insertedAd: any = null
          let lastError: any = null

          for (const candidate of candidates) {
            const { data, error } = await supabase.from('ads').insert(candidate).select(cols).single()
            if (!error && data) {
              insertedAd = data
              lastError = null
              break
            }
            if (isDuplicateViolationErr(error) && effectiveKey) {
              const existingAd = await findExistingAdByKey(supabase, keyData.user_id, effectiveKey)
              if (existingAd) {
                return {
                  status: 200,
                  payload: {
                    success: true,
                    already_exists: true,
                    idempotent_replay: true,
                    idempotency_key: effectiveKey,
                    ad: existingAd,
                  },
                }
              }
            }
            if (isMissingColumnErr(error)) {
              lastError = error
              continue
            }
            lastError = error
            break
          }

          if (!insertedAd) {
            throw lastError || new Error('Failed to create ad')
          }

          return {
            status: 201,
            payload: {
              success: true,
              already_exists: false,
              idempotent_replay: false,
              idempotency_key: effectiveKey || undefined,
              message: autoApprove
                ? 'Ad submitted and automatically approved! It is now live.'
                : 'Ad submitted successfully. It will be reviewed and activated by admin.',
              ad: insertedAd,
            },
          }
        }

        let outcome: AdCreateOutcome
        if (effectiveKey) {
          const lockKey = `${keyData.user_id}:${effectiveKey}`
          let inflight = inFlightAdSubmissions.get(lockKey)
          if (!inflight) {
            inflight = runSubmission().finally(() => {
              inFlightAdSubmissions.delete(lockKey)
            })
            inFlightAdSubmissions.set(lockKey, inflight)
          }
          outcome = await inflight
        } else {
          outcome = await runSubmission()
        }

        return new Response(JSON.stringify(outcome.payload), {
          status: outcome.status,
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
