import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ADMIN_EMAILS = ['goodgiftdigital@gmail.com', 'accessa787@gmail.com'];
export const OPEN_ACTIVATION_EVENT = 'ggd-open-activation-modal';
export const ACTIVATION_UPDATED_EVENT = 'ggd-activation-updated';

export interface ActivationSnapshot {
  loading: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  credits: number;
  isAdmin: boolean;
  isActivated: boolean;
  activatedAt: string | null;
  feeEnabled: boolean;
  feeAmount: number;
  bonusCredits: number;
  requiresActivation: boolean;
}

const DEFAULT_SNAPSHOT: ActivationSnapshot = {
  loading: true,
  isSignedIn: false,
  userId: null,
  userEmail: null,
  credits: 0,
  isAdmin: false,
  isActivated: false,
  activatedAt: null,
  feeEnabled: true,
  feeAmount: 1000,
  bonusCredits: 200,
  requiresActivation: false,
};

let cachedSnapshot: ActivationSnapshot = { ...DEFAULT_SNAPSHOT };
let inflightPromise: Promise<ActivationSnapshot> | null = null;
const listeners = new Set<(snap: ActivationSnapshot) => void>();

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeUserId: string | null = null;
let realtimeSeq = 0;

function syncProfileRealtimeSubscription(userId: string | null) {
  if (listeners.size === 0 || !userId) {
    if (realtimeChannel) {
      const ch = realtimeChannel;
      realtimeChannel = null;
      realtimeUserId = null;
      try {
        supabase.removeChannel(ch);
      } catch {
        // Ignore channel removal error
      }
    }
    return;
  }

  if (realtimeUserId === userId && realtimeChannel) {
    return;
  }

  if (realtimeChannel) {
    const prev = realtimeChannel;
    realtimeChannel = null;
    realtimeUserId = null;
    try {
      supabase.removeChannel(prev);
    } catch {
      // Ignore channel removal error
    }
  }

  realtimeUserId = userId;
  realtimeSeq += 1;
  const ch = supabase
    .channel(`activation-profile-${userId}-${realtimeSeq}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        fetchActivationSnapshot(true);
      }
    )
    .subscribe();

  realtimeChannel = ch;
}

function notifyListeners(snap: ActivationSnapshot) {
  cachedSnapshot = snap;
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch {
      // Ignore subscriber callback errors
    }
  });
}

export function triggerActivationGate(actionLabel?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(OPEN_ACTIVATION_EVENT, {
      detail: { actionLabel: actionLabel || null },
    })
  );
}

export function dispatchActivationUpdated(detail?: {
  activated?: boolean;
  newCredits?: number;
}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ACTIVATION_UPDATED_EVENT, {
      detail: detail || {},
    })
  );
}

export async function fetchActivationSnapshot(force = false): Promise<ActivationSnapshot> {
  if (inflightPromise && !force) return inflightPromise;

  const runner = (async (): Promise<ActivationSnapshot> => {
    try {
      const [authRes, settingsRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [
            'activation_fee_enabled',
            'activation_fee_amount',
            'activation_bonus_credits',
          ]),
      ]);

      const settingsMap = new Map<string, string>();
      (settingsRes.data || []).forEach((row: any) => {
        settingsMap.set(row.key, String(row.value ?? ''));
      });

      const feeEnabledRaw = settingsMap.get('activation_fee_enabled');
      const feeEnabled =
        feeEnabledRaw === undefined
          ? true
          : ['true', '1', 'on', 'yes'].includes(feeEnabledRaw.trim().toLowerCase());

      const parsedFee = parseInt(settingsMap.get('activation_fee_amount') || '1000', 10);
      const feeAmount = Number.isFinite(parsedFee) && parsedFee > 0 ? parsedFee : 1000;

      const parsedBonus = parseInt(settingsMap.get('activation_bonus_credits') || '200', 10);
      const bonusCredits = Number.isFinite(parsedBonus) && parsedBonus >= 0 ? parsedBonus : 200;

      const user = authRes.data?.user || null;
      if (!user) {
        const snap: ActivationSnapshot = {
          loading: false,
          isSignedIn: false,
          userId: null,
          userEmail: null,
          credits: 0,
          isAdmin: false,
          isActivated: false,
          activatedAt: null,
          feeEnabled,
          feeAmount,
          bonusCredits,
          requiresActivation: false,
        };
        notifyListeners(snap);
        return snap;
      }

      const [rolesRes, profileAttempt] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('user_id, email, credits, is_activated, activated_at')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      let profileData: any = profileAttempt.data;
      let missingActivationColumn = false;

      if (profileAttempt.error) {
        const msg = String(profileAttempt.error.message || '').toLowerCase();
        if (profileAttempt.error.code === '42703' || msg.includes('is_activated')) {
          missingActivationColumn = true;
          const fallbackProfile = await supabase
            .from('profiles')
            .select('user_id, email, credits')
            .eq('user_id', user.id)
            .maybeSingle();
          profileData = fallbackProfile.data;
        }
      }

      const userEmail = (profileData?.email || user.email || '').toLowerCase();
      const isAdmin =
        ADMIN_EMAILS.includes(userEmail) ||
        Boolean(rolesRes.data?.some((r: any) => r.role === 'admin'));

      let isActivated = isAdmin || Boolean(profileData?.is_activated);
      const activatedAt: string | null = profileData?.activated_at || null;

      // Also verify processed_payments ledger if column wasn't present or hasn't synced yet
      if (!isActivated && (missingActivationColumn || profileData?.is_activated === undefined)) {
        const { data: paidRow } = await (supabase as any)
          .from('processed_payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('payment_type', 'user_activation')
          .limit(1)
          .maybeSingle();
        if (paidRow?.id) {
          isActivated = true;
        }
      }

      const requiresActivation = feeEnabled && !isActivated && !isAdmin;

      const snap: ActivationSnapshot = {
        loading: false,
        isSignedIn: true,
        userId: user.id,
        userEmail: user.email || profileData?.email || null,
        credits: Number(profileData?.credits ?? 0),
        isAdmin,
        isActivated,
        activatedAt,
        feeEnabled,
        feeAmount,
        bonusCredits,
        requiresActivation,
      };
      notifyListeners(snap);
      return snap;
    } catch (err) {
      console.warn('Activation status lookup note:', err);
      const safeSnap: ActivationSnapshot = {
        ...cachedSnapshot,
        loading: false,
      };
      notifyListeners(safeSnap);
      return safeSnap;
    } finally {
      inflightPromise = null;
    }
  })();

  inflightPromise = runner;
  return runner;
}

export function useActivationStatus() {
  const [snapshot, setSnapshot] = useState<ActivationSnapshot>(cachedSnapshot);

  useEffect(() => {
    let active = true;
    const sub = (next: ActivationSnapshot) => {
      if (active) setSnapshot(next);
    };
    listeners.add(sub);

    fetchActivationSnapshot();

    const handleUpdated = () => {
      fetchActivationSnapshot(true);
    };

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      fetchActivationSnapshot(true);
    });

    if (typeof window !== 'undefined') {
      window.addEventListener(ACTIVATION_UPDATED_EVENT, handleUpdated);
    }

    return () => {
      active = false;
      listeners.delete(sub);
      authSub?.subscription?.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener(ACTIVATION_UPDATED_EVENT, handleUpdated);
      }
      if (listeners.size === 0) {
        syncProfileRealtimeSubscription(null);
      }
    };
  }, []);

  // Singleton realtime sync on current user's profile row
  useEffect(() => {
    syncProfileRealtimeSubscription(snapshot.userId);
  }, [snapshot.userId]);

  const refresh = useCallback(() => fetchActivationSnapshot(true), []);

  /**
   * Explore-First Gate:
   * Returns `true` if user is allowed to perform the protected action.
   * Returns `false` and opens ActivationModal if activation is required.
   */
  const requireActivation = useCallback(
    (actionLabel?: string): boolean => {
      const current = cachedSnapshot.loading ? snapshot : cachedSnapshot;
      if (current.isSignedIn && current.requiresActivation) {
        triggerActivationGate(actionLabel);
        return false;
      }
      return true;
    },
    [snapshot]
  );

  return {
    ...snapshot,
    refresh,
    requireActivation,
  };
}
