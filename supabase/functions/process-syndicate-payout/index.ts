import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Comprehensive mapping of Nigerian bank codes for Paystack transfer recipients
const NIGERIAN_BANK_CODES: Record<string, string> = {
  'access': '044',
  'access bank': '044',
  'access bank (diamond)': '063',
  'citibank': '023',
  'ecobank': '050',
  'ecobank nigeria': '050',
  'fidelity': '070',
  'fidelity bank': '070',
  'first bank': '011',
  'first bank of nigeria': '011',
  'first city monument bank': '214',
  'fcmb': '214',
  'gtb': '058',
  'gtbank': '058',
  'guaranty trust bank': '058',
  'heritage': '030',
  'heritage bank': '030',
  'jaiz': '301',
  'jaiz bank': '301',
  'keystone': '082',
  'keystone bank': '082',
  'kuda': '090110',
  'kuda bank': '090110',
  'kuda microfinance bank': '090110',
  'moniepoint': '090405',
  'moniepoint mfb': '090405',
  'opay': '999992',
  'opay digital services': '999992',
  'palmpay': '999991',
  'polaris': '076',
  'polaris bank': '076',
  'providus': '101',
  'providus bank': '101',
  'stanbic': '221',
  'stanbic ibtc': '221',
  'stanbic ibtc bank': '221',
  'standard chartered': '068',
  'sterling': '232',
  'sterling bank': '232',
  'suntrust': '100',
  'taj': '302',
  'taj bank': '302',
  'titan': '102',
  'titan trust bank': '102',
  'union': '032',
  'union bank': '032',
  'uba': '033',
  'united bank for africa': '033',
  'unity': '215',
  'unity bank': '215',
  'vfd': '566',
  'vfd microfinance bank': '566',
  'wema': '035',
  'wema bank': '035',
  'zenith': '057',
  'zenith bank': '057',
}

function resolveBankCode(bankName: string, bankCode?: string | null): string | null {
  if (bankCode && /^\d+$/.test(bankCode.trim())) {
    return bankCode.trim()
  }
  if (!bankName) return null
  const normalized = bankName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  if (NIGERIAN_BANK_CODES[normalized]) {
    return NIGERIAN_BANK_CODES[normalized]
  }
  for (const [name, code] of Object.entries(NIGERIAN_BANK_CODES)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return code
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authorization header required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized user token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { withdrawal_id, force_retry } = await req.json()

    if (!withdrawal_id) {
      return new Response(JSON.stringify({ success: false, error: 'withdrawal_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    const isAdmin = !!adminRole

    // Fetch withdrawal request
    const { data: withdrawal, error: wdError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single()

    if (wdError || !withdrawal) {
      return new Response(JSON.stringify({ success: false, error: 'Withdrawal request not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify ownership or admin role
    if (withdrawal.user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden. You do not own this withdrawal.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // State validation
    if (withdrawal.status === 'completed') {
      return new Response(JSON.stringify({ success: true, message: 'Withdrawal is already completed', status: 'completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (withdrawal.status === 'rejected') {
      return new Response(JSON.stringify({ success: false, error: 'Withdrawal has been rejected by admin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (withdrawal.status === 'processing' && !force_retry && !isAdmin) {
      return new Response(JSON.stringify({ success: true, message: 'Transfer is currently processing', status: 'processing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Paystack secret key
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'paystack_secret_key')
      .maybeSingle()

    const paystackSecret = setting?.value || Deno.env.get('PAYSTACK_LIVE_SECRET_KEY') || Deno.env.get('PAYSTACK_SECRET_KEY')

    if (!paystackSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Paystack secret key is not configured in settings.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch syndicate profile
    const { data: synProfile } = await supabase
      .from('syndicate_profiles')
      .select('*')
      .eq('user_id', withdrawal.user_id)
      .maybeSingle()

    let recipientCode = withdrawal.paystack_recipient_code || synProfile?.paystack_recipient_code
    const bankCode = resolveBankCode(withdrawal.bank_name || synProfile?.bank_name, synProfile?.bank_code)

    if (!recipientCode) {
      if (!bankCode) {
        return new Response(JSON.stringify({
          success: false,
          error: `Could not identify bank code for "${withdrawal.bank_name}". Please update your bank details with a supported Nigerian bank.`,
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create Paystack transfer recipient
      const createRecipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: withdrawal.account_name || synProfile?.account_name || 'Syndicate Member',
          account_number: withdrawal.account_number || synProfile?.account_number,
          bank_code: bankCode,
          currency: 'NGN',
          description: `GGD Syndicate Payout - ${withdrawal.user_id.slice(0, 8)}`,
        }),
      })

      const recipientData = await createRecipientRes.json()

      if (!recipientData.status || !recipientData.data?.recipient_code) {
        const errorMsg = recipientData.message || 'Failed to create Paystack transfer recipient'
        // Record failure reason
        await supabase
          .from('withdrawal_requests')
          .update({ failure_reason: errorMsg, updated_at: new Date().toISOString() })
          .eq('id', withdrawal.id)

        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      recipientCode = recipientData.data.recipient_code

      // Save recipient code to syndicate_profiles and withdrawal_requests
      await Promise.all([
        supabase
          .from('syndicate_profiles')
          .update({
            paystack_recipient_code: recipientCode,
            paystack_recipient_status: 'verified',
            bank_code: bankCode,
            paystack_recipient_details: recipientData.data,
          })
          .eq('user_id', withdrawal.user_id),
        supabase
          .from('withdrawal_requests')
          .update({
            paystack_recipient_code: recipientCode,
            payout_mode: 'automatic',
            updated_at: new Date().toISOString(),
          })
          .eq('id', withdrawal.id),
      ])
    }

    // Idempotency: Unique reference for transfer
    const payoutReference = withdrawal.paystack_reference || `GGD_WD_${withdrawal.id.slice(0, 8)}_${Date.now()}`

    // Update status to processing with reference before sending transfer API request
    await supabase
      .from('withdrawal_requests')
      .update({
        status: 'processing',
        paystack_reference: payoutReference,
        paystack_recipient_code: recipientCode,
        payout_mode: 'automatic',
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawal.id)

    // Amount in Kobo
    const amountKobo = Math.round(Number(withdrawal.amount) * 100)

    // Initiate Paystack transfer
    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amountKobo,
        recipient: recipientCode,
        reason: `GGD Syndicate Payout #${withdrawal.id.slice(0, 8)}`,
        reference: payoutReference,
      }),
    })

    const transferData = await transferRes.json()

    if (!transferData.status) {
      const transferError = transferData.message || 'Paystack transfer request failed'

      // Call atomic refund procedure if transfer was outright rejected
      await supabase.rpc('refund_syndicate_withdrawal', {
        p_request_id: withdrawal.id,
        p_reason: transferError,
      })

      return new Response(JSON.stringify({
        success: false,
        error: transferError,
        details: transferData,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tx = transferData.data
    const transferCode = tx?.transfer_code || null
    const txStatus = tx?.status // 'success' | 'pending' | 'processing' | 'otp'

    // Call stored procedure to finalize or keep in processing
    const rpcStatus = (txStatus === 'success') ? 'completed' : 'processing'

    const { data: updateRes, error: rpcError } = await supabase.rpc('complete_paystack_withdrawal', {
      p_reference: payoutReference,
      p_transfer_code: transferCode,
      p_status: rpcStatus,
      p_reason: null,
    })

    if (rpcError) {
      console.error('RPC complete_paystack_withdrawal error:', rpcError)
    }

    return new Response(JSON.stringify({
      success: true,
      status: rpcStatus,
      message: rpcStatus === 'completed'
        ? 'Payout transferred successfully to bank account'
        : 'Payout initiated successfully via Paystack. Awaiting final bank settlement confirmation.',
      transfer_code: transferCode,
      reference: payoutReference,
      data: tx,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
