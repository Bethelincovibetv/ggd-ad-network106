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

    const payload = await req.json().catch(() => ({}))
    const action = payload.action || (payload.withdrawal_id ? 'process_withdrawal' : null)

    // Get Paystack secret key from app_settings or environment
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'paystack_secret_key')
      .maybeSingle()

    const paystackSecret = setting?.value || Deno.env.get('PAYSTACK_LIVE_SECRET_KEY') || Deno.env.get('PAYSTACK_SECRET_KEY')

    // -------------------------------------------------------------
    // ACTION: resolve_bank_account
    // -------------------------------------------------------------
    if (action === 'resolve_bank_account') {
      const { account_number, bank_code, bank_name } = payload
      if (!account_number || account_number.length < 10) {
        return new Response(JSON.stringify({ success: false, error: 'A valid 10-digit account number is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const resolvedCode = resolveBankCode(bank_name || '', bank_code)
      if (!resolvedCode) {
        return new Response(JSON.stringify({ success: false, error: 'Unsupported bank. Please select a valid Nigerian bank.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!paystackSecret) {
        return new Response(JSON.stringify({ success: false, error: 'Paystack secret key is not configured in settings.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const resolveRes = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number.trim())}&bank_code=${encodeURIComponent(resolvedCode)}`, {
        headers: { 'Authorization': `Bearer ${paystackSecret}` },
      })

      const resolveData = await resolveRes.json()

      if (!resolveData.status || !resolveData.data?.account_name) {
        return new Response(JSON.stringify({
          success: false,
          error: resolveData.message || 'Could not verify account details with Paystack. Please check the account number and bank.',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: true,
        account_name: resolveData.data.account_name,
        account_number: resolveData.data.account_number,
        bank_code: resolvedCode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // ACTION: save_initial_bank
    // -------------------------------------------------------------
    if (action === 'save_initial_bank') {
      const { bank_name, bank_code, account_number } = payload
      if (!bank_name || !account_number || account_number.length < 10) {
        return new Response(JSON.stringify({ success: false, error: 'Bank and 10-digit account number are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const resolvedCode = resolveBankCode(bank_name, bank_code)
      if (!resolvedCode) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid bank selected' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check current profile
      const { data: synProfile } = await supabase
        .from('syndicate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (synProfile?.is_bank_locked && synProfile?.account_number) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Your payout bank account is locked. Please use "Request Bank Account Change" to submit a change for admin verification.',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!paystackSecret) {
        return new Response(JSON.stringify({ success: false, error: 'Paystack secret key is not configured.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Strictly resolve account name from Paystack (no manual input!)
      const resolveRes = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number.trim())}&bank_code=${encodeURIComponent(resolvedCode)}`, {
        headers: { 'Authorization': `Bearer ${paystackSecret}` },
      })
      const resolveData = await resolveRes.json()

      if (!resolveData.status || !resolveData.data?.account_name) {
        return new Response(JSON.stringify({
          success: false,
          error: resolveData.message || 'Could not verify account with Paystack. Please check bank and account number.',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const verifiedAccountName = resolveData.data.account_name

      // Check if this member already has a matching Paystack recipient
      let recipientCode = synProfile?.paystack_recipient_code
      const isSameAccount = synProfile?.account_number === account_number.trim() && synProfile?.bank_code === resolvedCode

      if (!recipientCode || !isSameAccount) {
        // Create Paystack transfer recipient
        const createRecipientRes = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nuban',
            name: verifiedAccountName,
            account_number: account_number.trim(),
            bank_code: resolvedCode,
            currency: 'NGN',
            description: `GGD Direct Team - ${user.id.slice(0, 8)}`,
          }),
        })

        const recipientData = await createRecipientRes.json()
        if (recipientData.status && recipientData.data?.recipient_code) {
          recipientCode = recipientData.data.recipient_code
        }
      }

      // Update syndicate profile and lock bank
      const { error: updateError } = await supabase
        .from('syndicate_profiles')
        .upsert({
          user_id: user.id,
          bank_name: bank_name.trim(),
          bank_code: resolvedCode,
          account_number: account_number.trim(),
          account_name: verifiedAccountName,
          bank_verified_name: verifiedAccountName,
          paystack_recipient_code: recipientCode || null,
          paystack_recipient_status: 'verified',
          is_bank_locked: true,
          bank_verified_at: new Date().toISOString(),
          bank_changed_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' })

      if (updateError) {
        return new Response(JSON.stringify({ success: false, error: updateError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Bank account verified and locked successfully',
        account_name: verifiedAccountName,
        account_number: account_number.trim(),
        bank_name: bank_name.trim(),
        is_bank_locked: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // ACTION: request_bank_change
    // -------------------------------------------------------------
    if (action === 'request_bank_change') {
      const { requested_bank_name, requested_bank_code, requested_account_number, reason } = payload
      if (!requested_bank_name || !requested_account_number || requested_account_number.length < 10) {
        return new Response(JSON.stringify({ success: false, error: 'New bank and 10-digit account number are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const resolvedCode = resolveBankCode(requested_bank_name, requested_bank_code)
      if (!resolvedCode) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid bank selected' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Resolve new account name via Paystack
      const resolveRes = await fetch(`https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(requested_account_number.trim())}&bank_code=${encodeURIComponent(resolvedCode)}`, {
        headers: { 'Authorization': `Bearer ${paystackSecret}` },
      })
      const resolveData = await resolveRes.json()

      if (!resolveData.status || !resolveData.data?.account_name) {
        return new Response(JSON.stringify({
          success: false,
          error: resolveData.message || 'Could not verify new account details with Paystack.',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const verifiedNewName = resolveData.data.account_name

      // Get current bank details
      const { data: currentProfile } = await supabase
        .from('syndicate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // Insert change request
      const { data: changeReq, error: insertError } = await supabase
        .from('syndicate_bank_change_requests')
        .insert({
          user_id: user.id,
          current_bank_name: currentProfile?.bank_name || null,
          current_account_number: currentProfile?.account_number || null,
          current_account_name: currentProfile?.account_name || null,
          requested_bank_name: requested_bank_name.trim(),
          requested_bank_code: resolvedCode,
          requested_account_number: requested_account_number.trim(),
          requested_account_name: verifiedNewName,
          paystack_resolution_details: resolveData.data,
          admin_notes: reason ? `Member Note: ${reason}` : null,
          status: 'pending',
        })
        .select('*')
        .single()

      if (insertError) {
        return new Response(JSON.stringify({ success: false, error: insertError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Bank change request submitted successfully. Pending Admin verification.',
        request: changeReq,
        verified_name: verifiedNewName,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // ACTION: approve_bank_change (Admin only)
    // -------------------------------------------------------------
    if (action === 'approve_bank_change') {
      const { request_id } = payload
      if (!request_id) {
        return new Response(JSON.stringify({ success: false, error: 'request_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (!adminRole) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Admin privileges required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: changeReq, error: fetchErr } = await supabase
        .from('syndicate_bank_change_requests')
        .select('*')
        .eq('id', request_id)
        .single()

      if (fetchErr || !changeReq) {
        return new Response(JSON.stringify({ success: false, error: 'Change request not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (changeReq.status !== 'pending') {
        return new Response(JSON.stringify({ success: false, error: `Request already marked as ${changeReq.status}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create or reuse Paystack recipient code
      let recipientCode = null
      if (paystackSecret) {
        const createRecipientRes = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nuban',
            name: changeReq.requested_account_name,
            account_number: changeReq.requested_account_number,
            bank_code: changeReq.requested_bank_code,
            currency: 'NGN',
            description: `GGD Direct Team - ${changeReq.user_id.slice(0, 8)}`,
          }),
        })

        const recipientData = await createRecipientRes.json()
        if (recipientData.status && recipientData.data?.recipient_code) {
          recipientCode = recipientData.data.recipient_code
        }
      }

      // Update syndicate_profiles with approved bank
      await supabase
        .from('syndicate_profiles')
        .update({
          bank_name: changeReq.requested_bank_name,
          bank_code: changeReq.requested_bank_code,
          account_number: changeReq.requested_account_number,
          account_name: changeReq.requested_account_name,
          bank_verified_name: changeReq.requested_account_name,
          paystack_recipient_code: recipientCode || null,
          paystack_recipient_status: 'verified',
          is_bank_locked: true,
          bank_verified_at: new Date().toISOString(),
          bank_changed_at: new Date().toISOString(),
        } as any)
        .eq('user_id', changeReq.user_id)

      // Mark request approved
      await supabase
        .from('syndicate_bank_change_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          paystack_recipient_code: recipientCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request_id)

      // Notify user
      await supabase.from('notifications').insert({
        user_id: changeReq.user_id,
        title: '✅ Payout Bank Account Updated',
        message: `Your bank change request to ${changeReq.requested_bank_name} has been verified and approved.`,
        type: 'success',
      })

      return new Response(JSON.stringify({
        success: true,
        message: 'Bank account change approved successfully',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // ACTION: reject_bank_change (Admin only)
    // -------------------------------------------------------------
    if (action === 'reject_bank_change') {
      const { request_id, reason } = payload
      if (!request_id) {
        return new Response(JSON.stringify({ success: false, error: 'request_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (!adminRole) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Admin privileges required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: changeReq } = await supabase
        .from('syndicate_bank_change_requests')
        .select('*')
        .eq('id', request_id)
        .single()

      if (!changeReq) {
        return new Response(JSON.stringify({ success: false, error: 'Request not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabase
        .from('syndicate_bank_change_requests')
        .update({
          status: 'rejected',
          admin_notes: reason || 'Bank change request rejected by admin',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request_id)

      await supabase.from('notifications').insert({
        user_id: changeReq.user_id,
        title: '❌ Bank Change Request Rejected',
        message: `Your request was not approved: ${reason || 'Details could not be verified'}. Your previous verified bank remains active.`,
        type: 'warning',
      })

      return new Response(JSON.stringify({
        success: true,
        message: 'Bank change request rejected',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // ACTION: settle_campaign_paystack (Admin Batch Paystack Payout)
    // -------------------------------------------------------------
    if (action === 'settle_campaign_paystack' || action === 'settle_campaign_manual') {
      const { task_id, notes } = payload
      if (!task_id) {
        return new Response(JSON.stringify({ success: false, error: 'task_id is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check admin privileges
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (!adminRole) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Admin privileges required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Fetch campaign task
      const { data: task, error: taskErr } = await supabase
        .from('syndicate_tasks')
        .select('*')
        .eq('id', task_id)
        .single()

      if (taskErr || !task) {
        return new Response(JSON.stringify({ success: false, error: 'Campaign task not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Fetch payout percentage
      const { data: pctSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'syndicate_payout_percentage')
        .maybeSingle()

      const payoutPct = parseInt(pctSetting?.value || '70', 10) || 70
      const settlementBase = Number(task.total_cost || 0)
      const totalPool = settlementBase * (payoutPct / 100.0)

      // Fetch eligible participating assignments
      const { data: assignments, error: assignErr } = await supabase
        .from('syndicate_task_assignments')
        .select('*')
        .eq('task_id', task_id)
        .in('status', ['submitted', 'approved', 'accepted'])

      const participatingCount = assignments?.length || 0
      const individualPayout = participatingCount > 0 ? Math.round((totalPool / participatingCount) * 100) / 100 : 0

      // If manual settlement requested or no participants
      if (action === 'settle_campaign_manual' || participatingCount === 0 || !paystackSecret) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('settle_syndicate_campaign', {
          p_task_id: task_id,
          p_payment_mode: 'manual',
          p_admin_notes: notes || 'Admin manual settlement',
        })

        if (rpcErr) {
          return new Response(JSON.stringify({ success: false, error: rpcErr.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({
          success: true,
          settlement_base: settlementBase,
          payout_percentage: payoutPct,
          total_pool: totalPool,
          participating_count: participatingCount,
          individual_payout: individualPayout,
          message: 'Campaign settled manually successfully',
          data: rpcRes,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Paystack Batch Transfer Flow
      const results: any[] = []
      let successCount = 0
      let failedCount = 0

      for (const assignment of assignments || []) {
        try {
          const memberUserId = assignment.syndicate_user_id

          // Check if already paid
          if (assignment.payment_status === 'paid' && assignment.paystack_reference) {
            results.push({ userId: memberUserId, status: 'already_paid', reference: assignment.paystack_reference })
            successCount++
            continue
          }

          // Fetch member verified payout profile
          const { data: synProfile } = await supabase
            .from('syndicate_profiles')
            .select('*')
            .eq('user_id', memberUserId)
            .maybeSingle()

          if (!synProfile?.account_number) {
            results.push({ userId: memberUserId, status: 'failed', error: 'No bank account configured' })
            failedCount++
            continue
          }

          let recipientCode = synProfile.paystack_recipient_code
          const bankCode = resolveBankCode(synProfile.bank_name, synProfile.bank_code)

          if (!recipientCode) {
            if (!bankCode) {
              results.push({ userId: memberUserId, status: 'failed', error: 'Unknown bank code' })
              failedCount++
              continue
            }

            // Create recipient on the fly
            const rcRes = await fetch('https://api.paystack.co/transferrecipient', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${paystackSecret}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'nuban',
                name: synProfile.account_name || 'Direct Team Member',
                account_number: synProfile.account_number,
                bank_code: bankCode,
                currency: 'NGN',
                description: `GGD Direct Team Payout - ${memberUserId.slice(0, 8)}`,
              }),
            })
            const rcData = await rcRes.json()
            if (rcData.status && rcData.data?.recipient_code) {
              recipientCode = rcData.data.recipient_code
              await supabase
                .from('syndicate_profiles')
                .update({
                  paystack_recipient_code: recipientCode,
                  paystack_recipient_status: 'verified',
                  bank_code: bankCode,
                  paystack_recipient_details: rcData.data,
                })
                .eq('user_id', memberUserId)
            } else {
              results.push({ userId: memberUserId, status: 'failed', error: rcData.message || 'Failed to create recipient' })
              failedCount++
              continue
            }
          }

          // Unique idempotent reference
          const payoutReference = `GGD_SETTLE_${task_id.slice(0, 8)}_${memberUserId.slice(0, 8)}_${Date.now()}`
          const amountKobo = Math.round(individualPayout * 100)

          if (amountKobo <= 0) {
            results.push({ userId: memberUserId, status: 'skipped', reason: 'Zero payout amount' })
            continue
          }

          // Initiate transfer
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
              reason: `Direct Team Settlement: ${task.title.slice(0, 25)}`,
              reference: payoutReference,
            }),
          })

          const transferData = await transferRes.json()
          if (!transferData.status) {
            results.push({ userId: memberUserId, status: 'failed', error: transferData.message || 'Transfer failed' })
            failedCount++
            continue
          }

          const tx = transferData.data
          const transferCode = tx?.transfer_code || null
          const txStatus = tx?.status // 'success' | 'pending' | 'processing'
          const finalPayStatus = (txStatus === 'success') ? 'paid' : 'processing'

          // Update assignment
          await supabase
            .from('syndicate_task_assignments')
            .update({
              payment_status: finalPayStatus,
              payout_amount: individualPayout,
              paid_at: new Date().toISOString(),
              paystack_reference: payoutReference,
              paystack_transfer_code: transferCode,
              settlement_notes: notes || 'Paystack automated settlement',
            })
            .eq('id', assignment.id)

          // Notify member
          await supabase.from('notifications').insert({
            user_id: memberUserId,
            title: '⚡ Paystack Settlement Transferred',
            message: `₦${individualPayout.toLocaleString()} has been sent to your verified bank account for ${task.title}. Reference: ${payoutReference}`,
            type: 'success',
          })

          results.push({
            userId: memberUserId,
            status: finalPayStatus,
            reference: payoutReference,
            transferCode: transferCode,
            amount: individualPayout,
          })
          successCount++
        } catch (memErr: any) {
          results.push({ userId: assignment.syndicate_user_id, status: 'failed', error: memErr.message })
          failedCount++
        }
      }

      // Upsert persistent settlement record
      await supabase
        .from('syndicate_settlements')
        .upsert({
          task_id: task_id,
          campaign_date: task.campaign_date,
          settlement_base: settlementBase,
          payout_percentage: payoutPct,
          total_pool: totalPool,
          participating_count: participatingCount,
          individual_payout: individualPayout,
          status: failedCount > 0 && successCount === 0 ? 'failed' : 'completed',
          settled_by: user.id,
          settled_at: new Date().toISOString(),
          notes: notes || `Paystack settlement: ${successCount} paid, ${failedCount} failed`,
        }, { onConflict: 'task_id' })

      // Mark task as completed
      await supabase
        .from('syndicate_tasks')
        .update({ status: 'completed' })
        .eq('id', task_id)

      return new Response(JSON.stringify({
        success: true,
        campaign_date: task.campaign_date,
        settlement_base: settlementBase,
        payout_percentage: payoutPct,
        total_pool: totalPool,
        participating_count: participatingCount,
        individual_payout: individualPayout,
        success_count: successCount,
        failed_count: failedCount,
        results: results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------
    // ACTION: process_withdrawal (Paystack Transfer Execution)
    // -------------------------------------------------------------
    const withdrawalId = payload.withdrawal_id
    const forceRetry = payload.force_retry

    if (!withdrawalId) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid action or missing withdrawal_id' }), {
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
      .eq('id', withdrawalId)
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

    if (withdrawal.status === 'processing' && !forceRetry && !isAdmin) {
      return new Response(JSON.stringify({ success: true, message: 'Transfer is currently processing', status: 'processing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const { error: rpcError } = await supabase.rpc('complete_paystack_withdrawal', {
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
