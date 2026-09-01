import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signature || !secretKey) return false
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secretKey)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(rawBody)
    )
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return calculatedSignature === signature.toLowerCase()
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Retrieve Paystack secret key
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'paystack_secret_key')
      .maybeSingle()

    const paystackSecret = setting?.value || Deno.env.get('PAYSTACK_LIVE_SECRET_KEY') || Deno.env.get('PAYSTACK_SECRET_KEY')

    const rawBody = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    if (paystackSecret) {
      const isValid = await verifyPaystackSignature(rawBody, signature, paystackSecret)
      if (!isValid) {
        console.warn('Invalid Paystack webhook signature rejected')
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event
    const data = payload.data || {}

    console.log(`Received Paystack webhook event: ${event}`, { reference: data.reference, transfer_code: data.transfer_code })

    // 1. Handle Syndicate Automatic Payout Events
    if (event === 'transfer.success') {
      const reference = data.reference
      const transferCode = data.transfer_code || null

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_paystack_withdrawal', {
        p_reference: reference,
        p_transfer_code: transferCode,
        p_status: 'completed',
        p_reason: null,
      })

      if (rpcErr) console.error('Error completing paystack withdrawal via webhook:', rpcErr)
      return new Response(JSON.stringify({ status: 'ok', result: rpcRes }), { status: 200 })
    }

    if (event === 'transfer.failed' || event === 'transfer.reversed') {
      const reference = data.reference
      const transferCode = data.transfer_code || null
      const failureReason = data.reason || data.complete_message || `Transfer marked as ${event}`

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_paystack_withdrawal', {
        p_reference: reference,
        p_transfer_code: transferCode,
        p_status: 'failed',
        p_reason: failureReason,
      })

      if (rpcErr) console.error('Error failing paystack withdrawal via webhook:', rpcErr)
      return new Response(JSON.stringify({ status: 'ok', result: rpcRes }), { status: 200 })
    }

    // 2. Handle Inbound Customer Payment Success (Charge Success)
    if (event === 'charge.success') {
      const reference = data.reference
      const amountNaira = Number(data.amount) / 100
      const type = data.metadata?.type || 'credit_purchase'
      const email = data.customer?.email

      // Idempotency check in processed_payments
      const { data: existing } = await supabase
        .from('processed_payments')
        .select('id')
        .eq('reference', reference)
        .maybeSingle()

      if (!existing) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, credits')
          .eq('email', email)
          .maybeSingle()

        if (profile) {
          await supabase.from('processed_payments').insert({
            reference,
            user_id: profile.user_id,
            amount: amountNaira,
            payment_type: type,
            metadata: data.metadata || {},
          })

          if (type === 'credit_purchase') {
            const { data: rateSetting } = await supabase
              .from('app_settings')
              .select('value')
              .eq('key', 'credit_exchange_rate')
              .maybeSingle()

            const rate = parseInt(rateSetting?.value || '100') || 100
            const creditsToAdd = Math.floor(amountNaira / rate)

            await supabase.from('profiles')
              .update({ credits: (profile.credits || 0) + creditsToAdd })
              .eq('user_id', profile.user_id)

            await supabase.from('notifications').insert({
              user_id: profile.user_id,
              title: '💰 Credits Added!',
              message: `${creditsToAdd} GGG credits added from ₦${amountNaira.toLocaleString()} payment.`,
              type: 'payment',
            })
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Paystack webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
