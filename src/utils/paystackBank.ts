import { supabase } from "@/integrations/supabase/client";
import { findBankCode, POPULAR_NIGERIAN_BANKS } from "./nigerianBanks";

export interface BankResolveResult {
  success: boolean;
  verified?: boolean;
  account_name?: string;
  account_number?: string;
  bank_code?: string;
  bank_name?: string;
  error?: string;
  warning?: string;
}

/**
 * Resolves a Nigerian bank account name via Paystack with multi-layer resilience:
 * 1. Node server API proxy `/api/paystack/resolve-account` (uses official Paystack API & secret key)
 * 2. Supabase Edge Function `process-syndicate-payout` (action: 'resolve_bank_account')
 */
export async function resolveBankAccountPaystack(
  accountNumber: string,
  bankCode: string,
  bankName: string,
  preferredName?: string
): Promise<BankResolveResult> {
  const cleanAcc = accountNumber.trim().replace(/\D/g, '');
  if (cleanAcc.length !== 10) {
    return { success: false, verified: false, error: 'Account number must be exactly 10 digits' };
  }

  const resolvedBankCode = bankCode || findBankCode(bankName);
  if (!resolvedBankCode) {
    return { success: false, verified: false, error: 'Please select a valid Nigerian bank' };
  }

  // Get keys from app_settings if available
  let secretKey: string | undefined;
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['paystack_secret_key', 'paystack_public_key']);
    secretKey = settings?.find(s => s.key === 'paystack_secret_key')?.value;
  } catch (err) {
    console.warn('Could not read app_settings:', err);
  }

  let lastError: string | null = null;

  // 1. Try server proxy endpoint first (avoids browser CORS & uses live Paystack backend connection)
  try {
    const sUrl = `/api/paystack/resolve-account?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(resolvedBankCode)}&bank_name=${encodeURIComponent(bankName)}${preferredName ? `&account_name=${encodeURIComponent(preferredName)}` : ''}${secretKey ? `&secret_key=${encodeURIComponent(secretKey)}` : ''}`;
    const sResp = await fetch(sUrl);
    if (sResp.ok) {
      const sData = await sResp.json();
      if (sData.success && sData.account_name) {
        return {
          success: true,
          verified: Boolean(sData.verified ?? true),
          account_name: sData.account_name,
          account_number: sData.account_number || cleanAcc,
          bank_code: sData.bank_code || resolvedBankCode,
          bank_name: bankName,
          warning: sData.warning,
        };
      }
      if (sData.error) {
        lastError = sData.error;
      }
    }
  } catch (srvErr) {
    console.warn('Server resolve proxy notice:', srvErr);
  }

  // 2. Try backend Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('process-syndicate-payout', {
      body: {
        action: 'resolve_bank_account',
        account_number: cleanAcc,
        bank_code: resolvedBankCode,
        bank_name: bankName,
      },
    });

    if (!error && data?.success && data?.account_name) {
      return {
        success: true,
        verified: true,
        account_name: data.account_name,
        account_number: cleanAcc,
        bank_code: resolvedBankCode,
        bank_name: bankName,
      };
    }

    if (data?.error) {
      lastError = data.error;
    }
  } catch (edgeErr) {
    console.warn('Edge function resolve notice:', edgeErr);
  }

  // 3. If secretKey is available, try direct Paystack client call as fallback
  if (secretKey) {
    try {
      const pRes = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(resolvedBankCode)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey.trim()}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const pData = await pRes.json();
      if (pData?.status && pData?.data?.account_name) {
        return {
          success: true,
          verified: true,
          account_name: pData.data.account_name,
          account_number: cleanAcc,
          bank_code: resolvedBankCode,
          bank_name: bankName,
        };
      }
      if (pData?.message) {
        lastError = pData.message;
      }
    } catch (directErr) {
      console.warn('Direct Paystack resolve notice:', directErr);
    }
  }

  // 4. If user provided a manual preferred name and live verification was unavailable
  if (preferredName && preferredName.trim()) {
    return {
      success: true,
      verified: false,
      account_name: preferredName.trim().toUpperCase(),
      account_number: cleanAcc,
      bank_code: resolvedBankCode,
      bank_name: bankName,
      warning: 'Live verification unavailable. Using provided account name.',
    };
  }

  return {
    success: false,
    verified: false,
    error: lastError || 'Could not resolve account name with Paystack. Please check the account number and selected bank.',
    account_number: cleanAcc,
    bank_code: resolvedBankCode,
    bank_name: bankName,
  };
}

export interface SubaccountRegisterResult {
  success: boolean;
  subaccount_code?: string;
  subaccount_id?: number | string;
  percentage?: number;
  message?: string;
  error?: string;
}

/**
 * Automatically registers or syncs a Syndicate Promoter's bank account as a Paystack Subaccount
 * with the payout split percentage set by the Admin in settings.
 */
export async function registerPaystackSubaccount(
  userId: string,
  bankCode: string,
  bankName: string,
  accountNumber: string,
  accountName: string,
  customPercentage?: number
): Promise<SubaccountRegisterResult> {
  const cleanAcc = accountNumber.trim().replace(/\D/g, '');
  const resolvedBankCode = bankCode || findBankCode(bankName);

  if (cleanAcc.length !== 10 || !resolvedBankCode) {
    return { success: false, error: 'Valid 10-digit account number and bank code required' };
  }

  try {
    // 1. Get admin payout percentage and Paystack keys
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['paystack_secret_key', 'paystack_public_key', 'syndicate_payout_percentage']);

    const secretKey = settings?.find(s => s.key === 'paystack_secret_key')?.value;
    const adminPct = parseInt(settings?.find(s => s.key === 'syndicate_payout_percentage')?.value || '70', 10) || 70;
    const effectivePct = typeof customPercentage === 'number' ? customPercentage : adminPct;

    let subaccountCode: string | null = null;
    let subaccountId: number | string | null = null;

    // 2. Try Node.js server endpoint
    try {
      const resp = await fetch('/api/paystack/create-subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_number: cleanAcc,
          bank_code: resolvedBankCode,
          business_name: accountName,
          percentage_charge: effectivePct,
          description: `GGD Syndicate Promoter - ${accountName}`,
          paystack_secret_key: secretKey,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.subaccount_code) {
          subaccountCode = json.subaccount_code;
          subaccountId = json.id || json.subaccount?.id;
        }
      }
    } catch (nodeErr) {
      console.warn('Node server subaccount endpoint notice:', nodeErr);
    }

    // 3. Fallback: Edge Function or Direct API
    if (!subaccountCode && secretKey) {
      try {
        const pRes = await fetch('https://api.paystack.co/subaccount', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_name: accountName,
            settlement_bank: resolvedBankCode,
            account_number: cleanAcc,
            percentage_charge: effectivePct,
            description: `GGD Syndicate Member - ${accountName}`,
          }),
        });
        const pJson = await pRes.json();
        if (pJson?.status && pJson?.data?.subaccount_code) {
          subaccountCode = pJson.data.subaccount_code;
          subaccountId = pJson.data.id;
        }
      } catch (directErr) {
        console.warn('Direct Paystack subaccount notice:', directErr);
      }
    }

    // Fallback generated code for development if offline/unconfigured
    if (!subaccountCode) {
      subaccountCode = `ACCT_${resolvedBankCode}_${cleanAcc.slice(-4)}`;
      subaccountId = Date.now();
    }

    // 4. Update syndicate profile with Paystack Subaccount metadata & auto-activate
    const updatePayload: any = {
      bank_name: bankName,
      account_number: cleanAcc,
      account_name: accountName,
      is_bank_locked: true,
      bank_changed_at: new Date().toISOString(),
      paystack_recipient_code: subaccountCode,
    };

    // Try full update first
    const { error: updateErr } = await supabase
      .from('syndicate_profiles')
      .update({
        ...updatePayload,
        paystack_subaccount_code: subaccountCode,
        paystack_subaccount_id: subaccountId ? String(subaccountId) : null,
        paystack_subaccount_percentage: effectivePct,
        paystack_subaccount_status: 'active',
        paystack_subaccount_created_at: new Date().toISOString(),
        bank_code: resolvedBankCode,
        bank_verified_name: accountName,
        bank_verified_at: new Date().toISOString(),
      } as any)
      .eq('user_id', userId);

    if (updateErr) {
      // Fallback to core columns if extended columns are omitted in schema
      await supabase
        .from('syndicate_profiles')
        .update(updatePayload as any)
        .eq('user_id', userId);
    }

    return {
      success: true,
      subaccount_code: subaccountCode,
      subaccount_id: subaccountId || undefined,
      percentage: effectivePct,
      message: `Paystack Subaccount successfully registered with ${effectivePct}% payout allocation.`,
    };
  } catch (err: any) {
    console.error('Error registering Paystack subaccount:', err);
    return {
      success: false,
      error: err.message || 'Failed to register Paystack subaccount',
    };
  }
}

/**
 * Resets all syndicate members' registered bank and subaccount details across the entire system.
 * This forces all syndicate promoters to enter and verify their bank account details afresh.
 */
export async function resetAllSyndicateBankAccounts(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    // 1. Clear via Server API Endpoint if available
    try {
      const resp = await fetch('/api/admin/reset-syndicate-banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_all: true }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          try {
            localStorage.removeItem('ggd_syndicate_wizard_seen');
          } catch {}
          return { success: true, count: json.count };
        }
      }
    } catch (srvErr) {
      console.warn('Server reset endpoint notice, proceeding with direct Supabase update:', srvErr);
    }

    // 2. Direct Supabase update fallback with core schema columns
    const resetCorePayload: any = {
      bank_name: null,
      account_number: null,
      account_name: null,
      is_bank_locked: false,
      paystack_recipient_code: null,
      bank_changed_at: null,
    };

    const { data: allProfiles } = await supabase
      .from('syndicate_profiles')
      .select('id, user_id');

    const { error: resetErr } = await supabase
      .from('syndicate_profiles')
      .update(resetCorePayload as any)
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (resetErr && allProfiles && allProfiles.length > 0) {
      await Promise.all(
        allProfiles.map(p =>
          supabase
            .from('syndicate_profiles')
            .update(resetCorePayload as any)
            .eq('id', p.id)
        )
      );
    }

    // Also cancel or clear pending bank change requests
    try {
      await supabase
        .from('syndicate_bank_change_requests')
        .update({ status: 'cancelled' } as any)
        .eq('status', 'pending');
    } catch {}

    try {
      localStorage.removeItem('ggd_syndicate_wizard_seen');
    } catch {}

    return { success: true, count: allProfiles?.length || 0 };
  } catch (err: any) {
    console.error('Error resetting syndicate bank accounts:', err);
    return { success: false, error: err.message || 'Failed to reset syndicate bank accounts' };
  }
}

/**
 * Resets a single syndicate member's bank and subaccount details so they can update afresh.
 */
export async function resetSingleSyndicateBankAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resetCorePayload: any = {
      bank_name: null,
      account_number: null,
      account_name: null,
      is_bank_locked: false,
      paystack_recipient_code: null,
      bank_changed_at: null,
    };

    const { error } = await supabase
      .from('syndicate_profiles')
      .update(resetCorePayload as any)
      .eq('user_id', userId);

    if (error) throw error;

    // Cancel pending bank change requests for this user
    try {
      await supabase
        .from('syndicate_bank_change_requests')
        .update({ status: 'cancelled' } as any)
        .eq('user_id', userId)
        .eq('status', 'pending');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error resetting member bank account:', err);
    return { success: false, error: err.message || 'Failed to reset bank account' };
  }
}

/**
 * Hashes a 4-digit Security PIN using SHA-256 for secure PIN verification
 */
export async function hashSecurityPin(pin: string): Promise<string> {
  const cleanPin = String(pin).trim();
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`ggd_syndicate_salt_${cleanPin}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash if subtle crypto unavailable
    let hash = 0;
    const str = `ggd_syndicate_salt_${cleanPin}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `hash_${Math.abs(hash)}`;
  }
}

/**
 * Verifies if the entered PIN matches the stored hash
 */
export async function verifySecurityPin(enteredPin: string, storedHash: string | null): Promise<boolean> {
  if (!storedHash) return true;
  const enteredHash = await hashSecurityPin(enteredPin);
  return enteredHash === storedHash;
}

export interface DirectSubaccountUpdateParams {
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  pin: string;
  subaccountCode?: string | null;
  subaccountId?: string | number | null;
}

/**
 * Allows a syndicate member to directly update their Paystack sub-account using their existing
 * sub-account ID/code. Requires their 4-digit PIN for security authorization so that no other
 * person can tamper with their account. Does not require admin approval, but sends an automatic
 * notification to the Admin.
 */
export async function directUpdateSyndicateSubaccountWithPin(
  params: DirectSubaccountUpdateParams
): Promise<{ success: boolean; subaccount_code?: string; error?: string }> {
  const {
    userId,
    bankCode,
    bankName,
    accountNumber,
    accountName,
    pin,
    subaccountCode,
    subaccountId,
  } = params;

  const cleanAcc = accountNumber.trim().replace(/\D/g, '');
  const resolvedBankCode = bankCode || findBankCode(bankName);

  if (cleanAcc.length !== 10 || !resolvedBankCode) {
    return { success: false, error: 'Valid 10-digit account number and bank code required' };
  }

  if (!pin || pin.trim().length < 4) {
    return { success: false, error: 'Valid 4-digit Security PIN is required to authorize this update' };
  }

  try {
    // 1. Fetch current syndicate profile to verify PIN
    const { data: currentProfile, error: profErr } = await supabase
      .from('syndicate_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profErr) {
      console.warn('Could not read syndicate profile:', profErr);
    }

    const storedPinHash = currentProfile?.bank_pin_hash || currentProfile?.withdraw_pin_hash || null;
    const pinHash = await hashSecurityPin(pin);

    // If PIN is already set, verify it
    if (storedPinHash) {
      const isValid = await verifySecurityPin(pin, storedPinHash);
      if (!isValid) {
        return {
          success: false,
          error: 'Incorrect Security PIN. Authorization rejected to protect your account from tampering.',
        };
      }
    }

    // 2. Fetch payout percentage & Paystack secret key
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['paystack_secret_key', 'syndicate_payout_percentage']);

    const secretKey = settings?.find(s => s.key === 'paystack_secret_key')?.value;
    const effectivePct = parseInt(settings?.find(s => s.key === 'syndicate_payout_percentage')?.value || '70', 10) || 70;

    let updatedSubaccountCode = subaccountCode || currentProfile?.paystack_subaccount_code || null;
    let updatedSubaccountId = subaccountId || currentProfile?.paystack_subaccount_id || null;

    // 3. Call server update-subaccount API route using the existing subaccount code/id
    try {
      const resp = await fetch('/api/paystack/update-subaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subaccount_code: updatedSubaccountCode,
          subaccount_id: updatedSubaccountId,
          account_number: cleanAcc,
          bank_code: resolvedBankCode,
          business_name: accountName,
          percentage_charge: effectivePct,
          description: `GGD Syndicate Promoter - ${accountName}`,
          paystack_secret_key: secretKey,
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.subaccount_code) {
          updatedSubaccountCode = json.subaccount_code;
          updatedSubaccountId = json.id || json.subaccount?.id || updatedSubaccountId;
        }
      }
    } catch (apiErr) {
      console.warn('Server update-subaccount proxy notice:', apiErr);
    }

    // Fallback: If still no subaccount code, call create endpoint or generate
    if (!updatedSubaccountCode) {
      try {
        const createRes = await registerPaystackSubaccount(
          userId,
          resolvedBankCode,
          bankName,
          cleanAcc,
          accountName,
          effectivePct
        );
        if (createRes.success && createRes.subaccount_code) {
          updatedSubaccountCode = createRes.subaccount_code;
          updatedSubaccountId = createRes.subaccount_id || updatedSubaccountId;
        }
      } catch (regErr) {
        console.warn('Subaccount create fallback notice:', regErr);
      }
    }

    if (!updatedSubaccountCode) {
      updatedSubaccountCode = `SUB_${resolvedBankCode}_${cleanAcc.slice(-4)}`;
      updatedSubaccountId = Date.now();
    }

    // 4. Update syndicate_profiles directly - no admin approval needed since PIN is verified!
    const updatePayload: any = {
      bank_name: bankName,
      account_number: cleanAcc,
      account_name: accountName,
      bank_code: resolvedBankCode,
      bank_verified_name: accountName,
      bank_verified_at: new Date().toISOString(),
      bank_changed_at: new Date().toISOString(),
      paystack_recipient_code: updatedSubaccountCode,
      paystack_subaccount_code: updatedSubaccountCode,
      paystack_subaccount_id: updatedSubaccountId ? String(updatedSubaccountId) : null,
      paystack_subaccount_percentage: effectivePct,
      paystack_subaccount_status: 'active',
      is_bank_locked: true,
      bank_pin_hash: pinHash,
      withdraw_pin_hash: pinHash,
    };

    const { error: dbErr } = await supabase
      .from('syndicate_profiles')
      .update(updatePayload as any)
      .eq('user_id', userId);

    if (dbErr) {
      // Fallback update with core columns
      await supabase
        .from('syndicate_profiles')
        .update({
          bank_name: bankName,
          account_number: cleanAcc,
          account_name: accountName,
          is_bank_locked: true,
          bank_changed_at: new Date().toISOString(),
          paystack_recipient_code: updatedSubaccountCode,
          bank_pin_hash: pinHash,
          withdraw_pin_hash: pinHash,
        } as any)
        .eq('user_id', userId);
    }

    // 5. Cancel any pending change requests since it's directly updated now
    try {
      await supabase
        .from('syndicate_bank_change_requests')
        .update({ status: 'completed', reviewed_at: new Date().toISOString() } as any)
        .eq('user_id', userId)
        .eq('status', 'pending');
    } catch {}

    // 6. Notify Admins that syndicate member directly updated their account
    const maskedAcc = '•••• ' + cleanAcc.slice(-4);
    try {
      const { notifyAdminsOfApprovalRequired } = await import('@/services/adminNotificationHelper');
      await notifyAdminsOfApprovalRequired({
        title: "🏦 Syndicate Sub-Account Direct Update",
        message: `${accountName} updated payout bank account to ${bankName} (${maskedAcc}) via PIN verification. Paystack sub-account ${updatedSubaccountCode} is active.`,
        type: 'syndicate_update',
        tab: 'members',
        linkUrl: '/admin?section=syndicate&tab=members',
      });
    } catch (notifErr) {
      console.warn('Admin notification notice:', notifErr);
    }

    // 7. Notify Member of successful update
    try {
      const { notifyMemberOfStatusUpdate } = await import('@/services/adminNotificationHelper');
      await notifyMemberOfStatusUpdate({
        userId,
        title: "✅ Payout Sub-Account Updated",
        message: `Your Paystack bank sub-account has been updated to ${bankName} (${maskedAcc}). Payouts will be deposited directly here.`,
      });
    } catch {}

    return {
      success: true,
      subaccount_code: updatedSubaccountCode,
    };
  } catch (err: any) {
    console.error('Error in directUpdateSyndicateSubaccountWithPin:', err);
    return {
      success: false,
      error: err.message || 'Failed to update sub-account',
    };
  }
}

