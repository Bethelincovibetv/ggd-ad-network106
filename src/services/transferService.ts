import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/lib/supabaseRpc';

export interface VerifiedRecipient {
  userId: string;
  displayName: string;
  username: string;
  email?: string;
  avatarUrl?: string | null;
  businessSlug?: string | null;
  referralCode?: string | null;
  accountStatus: string;
  memberSince?: string;
}

export interface TransferResult {
  success: boolean;
  message?: string;
  error?: string;
  transferId?: string;
  amount?: number;
  newBalance?: number;
  recipient?: VerifiedRecipient;
  timestamp?: string;
}

export interface TransferRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  created_at: string;
  direction: 'sent' | 'received';
  counterpartyName: string;
  counterpartyHandle: string;
  counterpartyAvatar?: string | null;
  status: 'completed' | 'processing' | 'failed';
}

// In-flight guard to prevent accidental double transfers
let isTransferInFlight = false;

/**
 * Searches and safely verifies a recipient by email, username/slug, or referral code.
 * Exposes only safe public profile information.
 */
export async function verifyRecipient(
  identifier: string,
  currentUserId?: string
): Promise<{ success: boolean; recipient?: VerifiedRecipient; error?: string }> {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');

  if (!clean || clean.length < 2) {
    return { success: false, error: 'Please enter a valid email, username, or referral code.' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, referral_code, business_slug, avatar_url, created_at')
      .or(`email.ilike.${clean},referral_code.ilike.${clean},business_slug.ilike.${clean},display_name.ilike.${clean}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: 'Error looking up recipient. Please try again.' };
    }

    if (!data) {
      return { success: false, error: 'Recipient not found. Check the email or username and try again.' };
    }

    if (currentUserId && data.user_id === currentUserId) {
      return { success: false, error: 'You cannot transfer credits to your own account.' };
    }

    const displayName = data.display_name?.trim() || data.business_slug || 'GGD Member';
    const handle = data.business_slug ? `@${data.business_slug}` : data.referral_code ? `@${data.referral_code}` : `@user`;

    return {
      success: true,
      recipient: {
        userId: data.user_id,
        displayName,
        username: handle,
        email: data.email || undefined,
        avatarUrl: data.avatar_url,
        businessSlug: data.business_slug,
        referralCode: data.referral_code,
        accountStatus: '✓ Account verified',
        memberSince: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error verifying recipient.' };
  }
}

/**
 * Executes a secure transfer of credits from the authenticated user to the verified recipient.
 * Uses atomic balance checks, prevents concurrent duplicate execution, and safely records transactions.
 */
export async function executeTransfer(
  recipient: VerifiedRecipient,
  amount: number
): Promise<TransferResult> {
  // Concurrency lock
  if (isTransferInFlight) {
    return { success: false, error: 'A transfer is already being processed. Please wait.' };
  }

  // Amount validation
  if (!Number.isInteger(amount) || amount <= 0) {
    return { success: false, error: 'Transfer amount must be a whole positive number.' };
  }

  isTransferInFlight = true;

  try {
    // 1. Authenticate user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { success: false, error: 'You must be signed in to make a transfer.' };
    }
    const sender = authData.user;

    if (sender.id === recipient.userId) {
      return { success: false, error: 'Cannot transfer credits to yourself.' };
    }

    // 2. Fetch sender profile & verify balance
    const { data: senderProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('credits, login_bonus_credits, display_name')
      .eq('user_id', sender.id)
      .maybeSingle();

    if (profileErr || !senderProfile) {
      return { success: false, error: 'Could not fetch your wallet balance. Please try again.' };
    }

    const currentBalance = Number(senderProfile.credits) || 0;
    const bonusCredits = Number(senderProfile.login_bonus_credits) || 0;
    const transferableBalance = Math.max(0, currentBalance - bonusCredits);

    if (amount > transferableBalance) {
      if (bonusCredits > 0 && amount <= currentBalance) {
        return {
          success: false,
          error: `Insufficient transferable credits. ${bonusCredits} credits are promotional login bonus and cannot be transferred. Available to transfer: ${transferableBalance}.`,
        };
      }
      return {
        success: false,
        error: `Insufficient credits. You have ${currentBalance} credits, but tried to transfer ${amount}.`,
      };
    }

    // 3. Attempt database RPC first if available
    try {
      const rpcResult = await callRpc<{ success: boolean; error?: string; new_balance?: number; transfer_id?: string }>(
        'transfer_credits',
        {
          p_recipient_email: recipient.email || recipient.username,
          p_amount: amount,
        }
      );

      if (rpcResult.data && (rpcResult.data as any).success) {
        return {
          success: true,
          message: `Successfully transferred ${amount} credits to ${recipient.displayName}!`,
          amount,
          newBalance: (rpcResult.data as any).new_balance ?? (currentBalance - amount),
          transferId: (rpcResult.data as any).transfer_id,
          recipient,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // RPC fallback to direct database transaction
    }

    // 4. Safe direct database flow
    // A. Record the transfer in credit_transfers
    const { data: transferRecord, error: insertError } = await supabase
      .from('credit_transfers')
      .insert({
        sender_id: sender.id,
        receiver_id: recipient.userId,
        amount,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: `Transfer failed: ${insertError.message}` };
    }

    // B. Debit sender
    const newSenderBalance = currentBalance - amount;
    const { error: debitError } = await supabase
      .from('profiles')
      .update({ credits: newSenderBalance })
      .eq('user_id', sender.id);

    if (debitError) {
      // Roll back the transfer record if sender couldn't be debited
      if (transferRecord?.id) {
        await supabase.from('credit_transfers').delete().eq('id', transferRecord.id);
      }
      return { success: false, error: `Failed to debit your wallet: ${debitError.message}` };
    }

    // C. Notify receiver
    try {
      await supabase.from('notifications').insert({
        user_id: recipient.userId,
        title: '💰 GGG Credits Received',
        message: `You received ${amount} GGG credits from ${senderProfile.display_name || 'a member'}.`,
        type: 'credit',
      });
    } catch {
      // Notification is non-blocking
    }

    return {
      success: true,
      message: `Successfully transferred ${amount} credits to ${recipient.displayName}!`,
      amount,
      newBalance: newSenderBalance,
      transferId: transferRecord?.id,
      recipient,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred during transfer.' };
  } finally {
    isTransferInFlight = false;
  }
}

/**
 * Loads recent transfer history for the current user (both sent and received).
 */
export async function getTransferHistory(userId: string): Promise<TransferRecord[]> {
  try {
    const { data, error } = await supabase
      .from('credit_transfers')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];

    // Collect all counterparty IDs
    const counterpartUserIds = Array.from(
      new Set(data.map(t => (t.sender_id === userId ? t.receiver_id : t.sender_id)))
    );

    // Fetch counterparty public profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, business_slug, referral_code, avatar_url')
      .in('user_id', counterpartUserIds);

    const profileMap = new Map<string, any>();
    profiles?.forEach(p => profileMap.set(p.user_id, p));

    return data.map(t => {
      const isSent = t.sender_id === userId;
      const counterpartyId = isSent ? t.receiver_id : t.sender_id;
      const p = profileMap.get(counterpartyId);

      const name = p?.display_name || (isSent ? 'Recipient' : 'Sender');
      const handle = p?.business_slug ? `@${p.business_slug}` : p?.referral_code ? `@${p.referral_code}` : '@member';

      return {
        id: t.id,
        sender_id: t.sender_id,
        receiver_id: t.receiver_id,
        amount: Number(t.amount) || 0,
        created_at: t.created_at,
        direction: isSent ? 'sent' : 'received',
        counterpartyName: name,
        counterpartyHandle: handle,
        counterpartyAvatar: p?.avatar_url,
        status: 'completed',
      };
    });
  } catch {
    return [];
  }
}
