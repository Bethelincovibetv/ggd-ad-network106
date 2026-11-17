import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Payment service is not configured' }, 500)

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: authData, error: authError } = await authClient.auth.getUser()
    if (authError || !authData.user?.id || !authData.user.email) return json({ error: 'Invalid or expired session' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    const requestedAmount = Number(body.amount)
    const allowedTypes = new Set(['credit_purchase', 'user_activation', 'task_wallet_funding', 'premium_upgrade', 'vendor_upgrade'])
    const type = String(body.type || 'credit_purchase')
    if (!allowedTypes.has(type)) return json({ error: 'Unsupported payment type' }, 400)
    if (!Number.isSafeInteger(requestedAmount) || requestedAmount <= 0) return json({ error: 'Amount must be a positive whole number of naira' }, 400)

    let amountNaira = requestedAmount
    if (type === 'user_activation') {
      const { data: feeSetting, error: feeError } = await admin
        .from('app_settings').select('value').eq('key', 'activation_fee_amount').maybeSingle()
      if (feeError) throw new Error('Unable to validate activation fee')
      const configuredFee = Number(feeSetting?.value || 1000)
      if (!Number.isSafeInteger(configuredFee) || configuredFee <= 0) throw new Error('Invalid activation fee configuration')
      amountNaira = configuredFee
    }

    const { data: setting, error: settingError } = await admin
      .from('app_settings').select('value').eq('key', 'paystack_secret_key').maybeSingle()
    if (settingError) throw new Error('Unable to load payment configuration')
    const paystackKey = setting?.value || Deno.env.get('PAYSTACK_LIVE_SECRET_KEY') || Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackKey) return json({ error: 'Paystack not configured' }, 500)

    const suppliedCallback = typeof body.metadata?.callback_url === 'string' ? body.metadata.callback_url : ''
    const callbackUrl = suppliedCallback.startsWith('https://') ? suppliedCallback : 'https://ggd-ad-network.lovable.app'
    const reference = `ggd_${type}_${crypto.randomUUID()}`
    const metadata = {
      ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
      type,
      user_id: authData.user.id,
      expected_amount_kobo: amountNaira * 100,
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountNaira * 100,
        email: authData.user.email,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    })
    const paystackData = await paystackRes.json()
    if (!paystackRes.ok || !paystackData.status || !paystackData.data?.authorization_url) {
      return json({ error: paystackData.message || 'Unable to initialize payment' }, 502)
    }

    return json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      access_code: paystackData.data.access_code,
    })
  } catch (error) {
    console.error('Paystack initialization failed:', error)
    return json({ error: error instanceof Error ? error.message : 'Payment initialization failed' }, 500)
  }
})
