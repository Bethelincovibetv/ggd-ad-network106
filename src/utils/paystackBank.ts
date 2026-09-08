import { supabase } from "@/integrations/supabase/client";
import { findBankCode, POPULAR_NIGERIAN_BANKS } from "./nigerianBanks";

export interface BankResolveResult {
  success: boolean;
  account_name?: string;
  account_number?: string;
  bank_code?: string;
  bank_name?: string;
  error?: string;
}

/**
 * Resolves a Nigerian bank account name via Paystack with multi-layer resilience:
 * 1. Edge Function `process-syndicate-payout` (action: 'resolve_bank_account')
 * 2. Fallback via client-side resolution if edge function is unreachable or returns configuration issue
 */
export async function resolveBankAccountPaystack(
  accountNumber: string,
  bankCode: string,
  bankName: string
): Promise<BankResolveResult> {
  const cleanAcc = accountNumber.trim().replace(/\D/g, '');
  if (cleanAcc.length !== 10) {
    return { success: false, error: 'Account number must be exactly 10 digits' };
  }

  const resolvedBankCode = bankCode || findBankCode(bankName);
  if (!resolvedBankCode) {
    return { success: false, error: 'Please select a supported Nigerian bank' };
  }

  // 1. Try backend Edge Function first
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
        account_name: data.account_name,
        account_number: cleanAcc,
        bank_code: resolvedBankCode,
        bank_name: bankName,
      };
    }

    if (data?.error && !data.error.includes('configured') && !data.error.includes('Failed to fetch')) {
      return { success: false, error: data.error };
    }
  } catch (edgeErr) {
    console.warn('Edge function resolve notice:', edgeErr);
  }

  // 2. Direct fallback using app_settings keys
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['paystack_secret_key', 'paystack_public_key']);

    const secretKey = settings?.find(s => s.key === 'paystack_secret_key')?.value;
    const publicKey = settings?.find(s => s.key === 'paystack_public_key')?.value;
    const apiKey = secretKey || publicKey;

    if (apiKey) {
      const res = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(cleanAcc)}&bank_code=${encodeURIComponent(resolvedBankCode)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const json = await res.json();
      if (json?.status && json?.data?.account_name) {
        return {
          success: true,
          account_name: json.data.account_name,
          account_number: cleanAcc,
          bank_code: resolvedBankCode,
          bank_name: bankName,
        };
      } else if (json?.message) {
        return { success: false, error: json.message };
      }
    }
  } catch (directErr: any) {
    console.warn('Direct Paystack fallback notice:', directErr);
  }

  return {
    success: false,
    error: 'Could not verify account with Paystack. Please ensure Paystack Secret Key is configured in Admin > Settings.',
  };
}
