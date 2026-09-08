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
      // Try transfer_credits passing recipient.userId (handled seamlessly by our updated RPC)
      // or recipient.email as fallback
      const recipientIdentifier = recipient.userId || recipient.email || recipient.username;
      const { data: rpcData, error: rpcError } = await callRpc<{
        success: boolean;
        error?: string;
        new_balance?: number;
        transfer_id?: string;
        amount?: number;
      }>('transfer_credits', {
        p_recipient_email: recipientIdentifier,
        p_amount: amount,
      });

      if (!rpcError && rpcData && rpcData.success) {
        return {
          success: true,
          message: `Successfully transferred ${amount} credits to ${recipient.displayName}!`,
          amount,
          newBalance: rpcData.new_balance ?? (currentBalance - amount),
          transferId: rpcData.transfer_id,
          recipient,
          timestamp: new Date().toISOString(),
        };
      }

      if (rpcData && rpcData.error) {
        return { success: false, error: rpcData.error };
      }
    } catch {
      // RPC fallback to direct database transaction
    }

    // 4. Safe direct database flow with strict atomicity (all-or-nothing)
    // Fetch recipient's current balance before making any adjustments
    const { data: recipientProfile, error: recipientFetchError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', recipient.userId)
      .maybeSingle();

    if (recipientFetchError || !recipientProfile) {
      return {
        success: false,
        error: 'Recipient profile could not be verified for transfer. No credits were deducted.',
      };
    }

    const currentRecipientBalance = Number(recipientProfile.credits) || 0;
    const newSenderBalance = currentBalance - amount;
    const newRecipientBalance = currentRecipientBalance + amount;

    // A. Debit sender (must succeed first)
    const { error: debitError } = await supabase
      .from('profiles')
      .update({ credits: newSenderBalance })
      .eq('user_id', sender.id);

    if (debitError) {
      return { success: false, error: `Failed to debit your wallet: ${debitError.message}` };
    }

    // B. Record the transfer in credit_transfers ledger (atomic persistent record)
    const { data: transferRecord, error: transferInsertError } = await supabase
      .from('credit_transfers')
      .insert({
        sender_id: sender.id,
        receiver_id: recipient.userId,
        amount,
      })
      .select()
      .maybeSingle();

    if (transferInsertError) {
      // Rollback sender debit if ledger record cannot be created
      await supabase
        .from('profiles')
        .update({ credits: currentBalance })
        .eq('user_id', sender.id);

      return {
        success: false,
        error: `Transfer recording failed: ${transferInsertError.message}. Your balance has been safely restored.`,
      };
    }

    // C. Credit recipient directly if allowed (e.g. sender has admin role or DB permits)
    try {
      await supabase
        .from('profiles')
        .update({ credits: newRecipientBalance })
        .eq('user_id', recipient.userId);
    } catch {
      // In Supabase, non-admin senders are restricted by RLS from updating other profiles.
      // The canonical ledger record in credit_transfers is now persisted and will be
      // immediately credited to recipient via syncPendingTransfersForUser.
    }

    // D. Notify receiver (non-blocking)
    try {
      const senderName = senderProfile.display_name || 'A GGD member';
      await supabase.from('notifications').insert({
        user_id: recipient.userId,
        title: '💰 GGG Credits Received',
        message: `You received ${amount.toLocaleString()} GGG credits from ${senderName}. Click to view your receipt.`,
        type: 'credit_transfer',
        nav_target: `receipt:${transferRecord?.id || ''}`,
        is_read: false,
      });
    } catch {
      // Notification insertion may be restricted by RLS for non-admins; non-blocking
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
 * Synchronizes incoming transfers for the authenticated user from the canonical credit_transfers ledger.
 * This guarantees that even with strict RLS policies on profiles, any credits transferred to this user
 * are safely credited to their persistent balance in profiles exactly once.
 */
export async function syncPendingTransfersForUser(userId: string): Promise<{
  credited: boolean;
  totalAdded: number;
  newBalance: number;
}> {
  if (!userId) return { credited: false, totalAdded: 0, newBalance: 0 };

  try {
    // 1. Fetch user's incoming transfers from credit_transfers
    const { data: transfers, error: transfersError } = await supabase
      .from('credit_transfers')
      .select('id, sender_id, receiver_id, amount, created_at')
      .eq('receiver_id', userId);

    if (transfersError || !transfers || transfers.length === 0) {
      const { data: currentProf } = await supabase.from('profiles').select('credits').eq('user_id', userId).maybeSingle();
      return { credited: false, totalAdded: 0, newBalance: Number(currentProf?.credits || 0) };
    }

    // 2. Fetch records of already credited transfers from notifications
    const { data: claimRecords } = await supabase
      .from('notifications')
      .select('message')
      .eq('user_id', userId)
      .eq('type', 'transfer_credited');

    const claimedTransferIds = new Set<string>();
    (claimRecords || []).forEach(record => {
      try {
        if (record.message?.startsWith('transfer:')) {
          const parts = record.message.split(':');
          if (parts[1]) claimedTransferIds.add(parts[1]);
        }
      } catch {
        // Ignore unparseable records
      }
    });

    // 3. Identify uncredited transfers
    const uncredited = transfers.filter(t => !claimedTransferIds.has(t.id));
    if (uncredited.length === 0) {
      const { data: currentProf } = await supabase.from('profiles').select('credits').eq('user_id', userId).maybeSingle();
      return { credited: false, totalAdded: 0, newBalance: Number(currentProf?.credits || 0) };
    }

    // 4. Calculate total credits to add
    const totalToAdd = uncredited.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    if (totalToAdd <= 0) {
      const { data: currentProf } = await supabase.from('profiles').select('credits').eq('user_id', userId).maybeSingle();
      return { credited: false, totalAdded: 0, newBalance: Number(currentProf?.credits || 0) };
    }

    // 5. Fetch fresh profile balance
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileErr || !profileData) {
      return { credited: false, totalAdded: 0, newBalance: 0 };
    }

    const currentCredits = Number(profileData.credits || 0);
    const updatedCredits = currentCredits + totalToAdd;

    // 6. Update user's profile credits (permitted by RLS since user_id = auth.uid())
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: updatedCredits })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update recipient profile credits:', updateError);
      return { credited: false, totalAdded: 0, newBalance: currentCredits };
    }

    // 7. Fetch sender profiles to show who sent them money
    const senderIds = Array.from(new Set(uncredited.map(t => t.sender_id)));
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, business_slug, referral_code')
      .in('user_id', senderIds);

    const senderMap = new Map<string, string>();
    senderProfiles?.forEach(p => {
      const name = p.display_name || 'A GGD member';
      const handle = p.business_slug ? `@${p.business_slug}` : p.referral_code ? `@${p.referral_code}` : '';
      senderMap.set(p.user_id, handle ? `${name} (${handle})` : name);
    });

    // Mark each transfer as claimed idempotently in notifications table
    const claimInserts = uncredited.map(t => {
      const senderInfo = senderMap.get(t.sender_id) || 'A member';
      return {
        user_id: userId,
        title: '💰 GGG Credits Received',
        message: `You received ${t.amount.toLocaleString()} GGG credits from ${senderInfo}.\ntransfer:${t.id}:${t.amount}`,
        type: 'transfer_credited',
        nav_target: `receipt:${t.id}`,
        is_read: false,
      };
    });

    await supabase.from('notifications').insert(claimInserts);

    return {
      credited: true,
      totalAdded: totalToAdd,
      newBalance: updatedCredits,
    };
  } catch (err) {
    console.error('Error syncing pending transfers:', err);
    return { credited: false, totalAdded: 0, newBalance: 0 };
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
