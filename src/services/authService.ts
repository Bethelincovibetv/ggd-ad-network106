import { supabase } from "@/integrations/supabase/client";
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

/**
 * Returns only a user authenticated by Supabase.
 * Local storage is not an authentication provider and must never grant access.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: data.user.user_metadata,
    created_at: data.user.created_at,
  };
}

export async function resilientSignIn(email: string, password: string): Promise<AppSession> {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error("Sign-in did not create an authenticated session. Please verify your email and try again.");
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

export async function resilientSignUp(
  email: string,
  password: string,
  displayName?: string,
  refCode?: string
): Promise<AppSession> {
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

  if (error) throw error;
  if (!data.user) throw new Error("Account creation did not return a user.");

  // Email confirmation may be enabled. Do not create a local session in that case.
  if (!data.session) {
    throw new Error("Account created. Please confirm your email before signing in.");
  }

  try {
    await ensureUserProfileAndReferral(data.user, cleanName, activeRef);
  } catch (profileError) {
    // Authentication succeeded; profile provisioning can be retried independently.
    console.error("Unable to provision the user profile:", profileError);
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      user_metadata: {
        ...data.user.user_metadata,
        display_name: cleanName,
        ref: activeRef,
      },
      created_at: data.user.created_at,
    },
    access_token: data.session.access_token,
  };
}

export async function resilientSignOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
