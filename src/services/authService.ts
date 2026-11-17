import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/utils/safeStorage";
import { captureAndGetReferralCode, ensureUserProfileAndReferral } from "./referralService";

export interface AppUser {
  id: string;
  email: string;
  user_metadata?: {
    display_name?: string;
    ref?: string;
    [key: string]: any;
  };
  created_at?: string;
}

export interface AppSession {
  user: AppUser;
  access_token?: string;
}

const LEGACY_LOCAL_SESSION_KEY = "ggd_auth_session";

function clearLegacyLocalSession(): void {
  try {
    safeStorage.removeItem(LEGACY_LOCAL_SESSION_KEY);
  } catch {
    // Non-blocking cleanup
  }
}

export function getLocalSession(): AppSession | null {
  clearLegacyLocalSession();
  return null;
}

export function setLocalSession(_session: AppSession | null): void {
  clearLegacyLocalSession();
}

/**
 * Single-source-of-truth user lookup backed strictly by Supabase Auth.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  clearLegacyLocalSession();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      return {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
        created_at: session.user.created_at,
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
      return {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Sign in strictly through Supabase Auth.
 */
export async function resilientSignIn(email: string, password: string): Promise<AppSession> {
  clearLegacyLocalSession();
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data?.user || !data?.session) {
    throw new Error("Unable to establish a valid Supabase session.");
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at,
    },
    access_token: data.session.access_token,
  };
}

/**
 * Sign up strictly through Supabase Auth.
 */
export async function resilientSignUp(
  email: string,
  password: string,
  displayName?: string,
  refCode?: string
): Promise<AppSession> {
  clearLegacyLocalSession();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName?.trim() || cleanEmail.split("@")[0];
  const activeRef = refCode?.trim() || captureAndGetReferralCode() || undefined;

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        display_name: cleanName,
        ref: activeRef,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error("Sign up failed. Please try again.");
  }

  try {
    await ensureUserProfileAndReferral(data.user, cleanName, activeRef);
  } catch {
    // Non-blocking profile/referral sync
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      user_metadata: {
        display_name: cleanName,
        ref: activeRef,
        ...data.user.user_metadata,
      },
      created_at: data.user.created_at,
    },
    access_token: data.session?.access_token,
  };
}

/**
 * Sign out strictly through Supabase Auth.
 */
export async function resilientSignOut(): Promise<void> {
  clearLegacyLocalSession();
  await supabase.auth.signOut();
}
