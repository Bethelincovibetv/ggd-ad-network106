import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const auth = req.headers.get('Authorization') || ''
    const token = auth.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } })
    const { data: userRes, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userRes.user) return json({ error: 'Unauthorized' }, 401)
    const userId = userRes.user.id

    const body = await req.json().catch(() => ({}))
    const adId = body?.ad_id
    if (!adId || typeof adId !== 'string') return json({ error: 'ad_id required' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    // Get ad
    const { data: ad, error: adErr } = await admin.from('ads').select('*').eq('id', adId).maybeSingle()
    if (adErr || !ad) return json({ error: 'Ad not found' }, 404)
    if (ad.ad_type !== 'watch' || !ad.approved || !ad.is_active) return json({ error: 'Ad not eligible' }, 400)
    if (ad.user_id === userId) return json({ error: 'Cannot claim own ad' }, 400)
    if ((ad.budget_credits || 0) < (ad.reward_credits || 0)) return json({ error: 'Budget exhausted' }, 400)

    // Reserve a claim (unique constraint prevents double-claim)
    const { error: claimErr } = await admin.from('ad_watch_claims').insert({ ad_id: adId, user_id: userId })
    if (claimErr) {
      if (claimErr.code === '23505') return json({ error: 'Already claimed' }, 409)
      return json({ error: claimErr.message }, 500)
    }

    // Credit user
    const { data: prof } = await admin.from('profiles').select('credits').eq('user_id', userId).maybeSingle()
    const newCredits = (prof?.credits || 0) + (ad.reward_credits || 0)
    await admin.from('profiles').update({ credits: newCredits }).eq('user_id', userId)

    // Decrement budget
    const newBudget = (ad.budget_credits || 0) - (ad.reward_credits || 0)
    const updates: any = { budget_credits: newBudget }
    if (newBudget < (ad.reward_credits || 0)) updates.is_active = false
    await admin.from('ads').update(updates).eq('id', adId)

    return json({ success: true, credits_earned: ad.reward_credits, new_balance: newCredits })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}