import { supabase } from "@/integrations/supabase/client";
import { auth as firebaseAuth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { captureAndGetReferralCode, ensureUserProfileAndReferral } from "./referralService";
import { safeStorage } from "@/utils/safeStorage";

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

const LOCAL_SESSION_KEY = "ggd_auth_session";

export function getLocalSession(): AppSession | null {
  return safeStorage.getJSON<AppSession | null>(LOCAL_SESSION_KEY, null);
}

export function setLocalSession(session: AppSession | null): void {
  if (session) safeStorage.setJSON(LOCAL_SESSION_KEY, session);
  else safeStorage.removeItem(LOCAL_SESSION_KEY);
}

function mapFirebaseUser(user: FirebaseUser): AppUser {
  if (!user.email) throw new Error("Your authentication account does not have an email address.");
  return {
    id: user.uid,
    email: user.email,
    user_metadata: { display_name: user.displayName || undefined },
  };
}

/** Return only identities verified by a configured authentication provider. */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user?.email) {
      return {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at,
      };
    }
  } catch {
    // Continue to the independently authenticated Firebase provider.
  }

  const firebaseUser = firebaseAuth.currentUser;
  if (firebaseUser?.email) return mapFirebaseUser(firebaseUser);

  // A browser-stored profile is not proof of identity.
  setLocalSession(null);
  return null;
}

/** Sign in through a real authentication provider; never manufacture a session. */
export async function resilientSignIn(email: string, password: string): Promise<AppSession> {
  const cleanEmail = email.trim().toLowerCase();
  let supabaseError: unknown;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (!error && data.user && data.session) {
      const session: AppSession = {
        user: {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          user_metadata: data.user.user_metadata,
          created_at: data.user.created_at,
        },
        access_token: data.session.access_token,
      };
      setLocalSession(session);
      return session;
    }
    supabaseError = error;
  } catch (error) {
    supabaseError = error;
  }

  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
    const session: AppSession = { user: mapFirebaseUser(credential.user) };
    setLocalSession(session);
    return session;
  } catch (firebaseError) {
    setLocalSession(null);
    const reason = firebaseError instanceof Error ? firebaseError.message : "Authentication failed.";
    throw new Error(`Unable to sign in. No authentication provider accepted the credentials. ${reason}`, {
      cause: supabaseError,
    });
  }
}

/** Create an account through a real authentication provider; never create a local-only account. */
export async function resilientSignUp(
  email: string,
  password: string,
  displayName?: string,
  refCode?: string,
): Promise<AppSession> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName?.trim() || cleanEmail.split("@")[0];
  const activeRef = refCode?.trim() || captureAndGetReferralCode() || undefined;
  let supabaseError: unknown;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { display_name: cleanName, ref: activeRef } },
    });

    if (!error && data.user) {
      const session: AppSession = {
        user: {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          user_metadata: { display_name: cleanName, ref: activeRef },
          created_at: data.user.created_at,
        },
        access_token: data.session?.access_token,
      };
      setLocalSession(session);
      try {
        await ensureUserProfileAndReferral(data.user, cleanName, activeRef);
      } catch (profileError) {
        console.error("Account created, but profile setup needs attention:", profileError);
      }
      return session;
    }
    supabaseError = error;
  } catch (error) {
    supabaseError = error;
  }

  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
    const user = credential.user;
    const session: AppSession = {
      user: {
        ...mapFirebaseUser(user),
        user_metadata: { display_name: cleanName, ref: activeRef },
      },
    };
    setLocalSession(session);
    try {
      await setDoc(doc(db, "profiles", user.uid), {
        user_id: user.uid,
        email: cleanEmail,
        display_name: cleanName,
        referred_by: activeRef || null,
        created_at: new Date().toISOString(),
      });
    } catch (profileError) {
      console.error("Firebase account created, but profile setup needs attention:", profileError);
    }
    return session;
  } catch (firebaseError) {
    setLocalSession(null);
    const reason = firebaseError instanceof Error ? firebaseError.message : "Account creation failed.";
    throw new Error(`Unable to create your account. No authentication provider completed registration. ${reason}`, {
      cause: supabaseError,
    });
  }
}

export async function resilientSignOut(): Promise<void> {
  setLocalSession(null);
  const results = await Promise.allSettled([
    supabase.auth.signOut(),
    firebaseSignOut(firebaseAuth),
  ]);
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
}
