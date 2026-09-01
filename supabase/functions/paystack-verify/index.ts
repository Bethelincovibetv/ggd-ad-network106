import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { reference } = await req.json()

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Reference required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Paystack secret key
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'paystack_secret_key')
      .maybeSingle()

    const paystackKey = setting?.value || Deno.env.get('PAYSTACK_LIVE_SECRET_KEY')

    if (!paystackKey) {
      return new Response(JSON.stringify({ error: 'Paystack not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { 'Authorization': `Bearer ${paystackKey}` },
    })

    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return new Response(JSON.stringify({ success: false, message: 'Payment not verified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const txData = verifyData.data
    const type = txData.metadata?.type || 'credit_purchase'
    const email = txData.customer?.email
    const amountNaira = Number(txData.amount) / 100

    // Check if this reference has already been processed to prevent double-crediting
    const { data: existingPayment } = await supabase
      .from('processed_payments')
      .select('id')
      .eq('reference', reference)
      .maybeSingle()

    if (existingPayment) {
      return new Response(JSON.stringify({ success: true, message: 'Transaction already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, credits')
      .eq('email', email)
      .maybeSingle()

    if (!profile) {
      return new Response(JSON.stringify({ success: false, message: 'User not found for payment' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Record reference in processed_payments ledger
    const { error: ledgerError } = await supabase
      .from('processed_payments')
      .insert({
        reference,
        user_id: profile.user_id,
        amount: amountNaira,
        payment_type: type,
        metadata: txData.metadata || {},
      })

    if (ledgerError) {
      // If unique constraint violated on reference, return already processed
      if (ledgerError.code === '23505') {
        return new Response(JSON.stringify({ success: true, message: 'Transaction already processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Failed to record payment ledger: ${ledgerError.message}`)
    }

    if (type === 'credit_purchase') {
      // Get exchange rate
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
    } else if (type === 'task_wallet_funding') {
      // Fund task wallet
      const { data: wallet } = await supabase
        .from('task_wallets')
        .select('balance, total_funded')
        .eq('user_id', profile.user_id)
        .maybeSingle()

      if (wallet) {
        await supabase.from('task_wallets')
          .update({
            balance: (wallet.balance || 0) + amountNaira,
            total_funded: (wallet.total_funded || 0) + amountNaira,
          })
          .eq('user_id', profile.user_id)
      } else {
        await supabase.from('task_wallets')
          .insert({
            user_id: profile.user_id,
            balance: amountNaira,
            total_funded: amountNaira,
          })
      }

      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        title: '💼 Task Wallet Funded!',
        message: `₦${amountNaira.toLocaleString()} added to your task wallet.`,
        type: 'payment',
      })
    } else if (type === 'premium_upgrade' || type === 'vendor_upgrade') {
      // Add premium role
      await supabase.from('user_roles')
        .insert({ user_id: profile.user_id, role: 'premium' })
        .select()

      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        title: '👑 Premium Activated!',
        message: 'You now have access to all premium features!',
        type: 'upgrade',
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
