import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({
  credits: z.number().int().positive().max(10_000_000),
  recipient: z.string().trim().min(3).max(120),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: claims, error: authErr } = await userClient.auth.getClaims(auth.replace('Bearer ', ''))
    if (authErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
    const userId = claims.claims.sub as string

    const parsed = Body.safeParse(await req.json())
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: envRow } = await admin.from('app_settings').select('value').eq('key', 'eco_environment').maybeSingle()
    const environment = envRow?.value === 'live' ? 'live' : 'sandbox'
    const apiKey = Deno.env.get(environment === 'live' ? 'ECO_LIVE_API_KEY' : 'ECO_SANDBOX_API_KEY')
    const baseUrl = Deno.env.get(environment === 'live' ? 'ECO_LIVE_BASE_URL' : 'ECO_SANDBOX_BASE_URL')
    if (!apiKey || !baseUrl) return json({ error: 'ECO rewards are not configured yet' }, 503)

    // 1. Atomically check balance and reserve credits
    const { data: res, error: rErr } = await admin.rpc('reserve_eco_redemption', {
      p_user_id: userId, p_credits: parsed.data.credits, p_recipient: parsed.data.recipient, p_environment: environment,
    })
    if (rErr) throw rErr
    if (!res?.success) return json({ success: false, error: res?.error || 'Could not reserve credits' }, 400)

    // 2. Call ECO
    let ok = false, reference: string | null = null, errorMsg: string | null = null, providerBody: unknown = {}
    try {
      const ecoRes = await fetch(`${baseUrl.replace(/\/$/, '')}${Deno.env.get('ECO_CREDIT_PATH') || '/rewards/credit'}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': res.id },
        body: JSON.stringify({ recipient: parsed.data.recipient, amount: res.eco_points, reference: res.id }),
      })
      providerBody = await ecoRes.json().catch(() => ({}))
      const b = providerBody as Record<string, any>
      const status = String(b?.status ?? b?.data?.status ?? '').toLowerCase()
      ok = ecoRes.ok && !['failed', 'error', 'declined'].includes(status)
      reference = b?.reference ?? b?.data?.reference ?? b?.transaction_id ?? b?.data?.id ?? null
      if (!ok) errorMsg = b?.message ?? `ECO returned ${ecoRes.status}`
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'ECO request failed'
    }

    // 3. Settle: confirm or refund
    await admin.rpc('settle_eco_redemption', {
      p_id: res.id, p_success: ok, p_reference: reference, p_error: errorMsg, p_response: providerBody as any,
    })

    if (!ok) return json({ success: false, refunded: true, error: errorMsg || 'Redemption failed — credits refunded' }, 502)

    await admin.from('notifications').insert({
      user_id: userId, title: '🎁 ECO Redeemed',
      message: `${parsed.data.credits} GGG converted to ${res.eco_points} ECO (≈ ₦${res.naira}).`, type: 'payment',
    })
    return json({ success: true, id: res.id, eco_points: res.eco_points, naira: res.naira, reference, environment, new_credits: res.new_credits })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500)
  }
})
