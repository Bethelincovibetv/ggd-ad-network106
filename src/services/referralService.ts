import { supabase } from "@/integrations/supabase/client";

export interface ReferrerProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  referral_code: string | null;
  avatar_url: string | null;
  business_name: string | null;
  business_phone: string | null;
  business_website: string | null;
  business_logo_url: string | null;
  business_location: string | null;
  business_slug: string | null;
  created_at: string | null;
}

export interface ReferredMember {
  user_id: string;
  display_name: string | null;
  email: string | null;
  referral_code: string | null;
  avatar_url: string | null;
  business_name?: string | null;
  business_slug?: string | null;
  created_at: string | null;
}

const STORAGE_KEY = "ggd_referral_code";

/**
 * Captures referral code from current URL and persists to localStorage.
 * Always returns the active referral code if available.
 */
export function captureAndGetReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get("ref");
    if (codeFromUrl && codeFromUrl.trim()) {
      const clean = codeFromUrl.trim().toUpperCase();
      localStorage.setItem(STORAGE_KEY, clean);
      return clean;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? stored.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * Manually sets the stored referral code.
 */
export function setStoredReferralCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    if (code && code.trim()) {
      localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear stored referral code after successful attribution.
 */
export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Generates a unique, standardized GGD referral code.
 */
export function generateReferralCode(): string {
  return "GGD" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Resolves a sponsor by their referral code (case-insensitive).
 */
export async function resolveReferrerByCode(code: string): Promise<ReferrerProfile | null> {
  if (!code || !code.trim()) return null;
  const cleanCode = code.trim();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, email, referral_code, avatar_url, business_name, business_phone, business_website, business_logo_url, business_location, business_slug, created_at"
    )
    .ilike("referral_code", cleanCode)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReferrerProfile;
}

/**
 * Links a referred user to a sponsor using the sponsor's referral code.
 * Enforces single source of truth in public.profiles (referred_by_user_id & referred_by).
 */
export async function linkReferralToUser(
  userId: string,
  refCode: string
): Promise<{ success: boolean; referrer?: ReferrerProfile; error?: string }> {
  if (!userId || !refCode.trim()) {
    return { success: false, error: "Invalid user or referral code" };
  }

  // 1. Check current profile status
  const { data: currentProf, error: curErr } = await supabase
    .from("profiles")
    .select("user_id, referral_code, referred_by_user_id, referred_by")
    .eq("user_id", userId)
    .maybeSingle();

  if (curErr) {
    return { success: false, error: "Failed to read user profile" };
  }

  if (currentProf?.referred_by_user_id) {
    // Already linked
    const { data: existingSponsor } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, referral_code, avatar_url, business_name, business_phone, business_website, business_logo_url, business_location, business_slug, created_at")
      .eq("user_id", currentProf.referred_by_user_id)
      .maybeSingle();

    return {
      success: true,
      referrer: (existingSponsor as ReferrerProfile) || undefined,
    };
  }

  // 2. Resolve sponsor
  const sponsor = await resolveReferrerByCode(refCode);
  if (!sponsor) {
    return { success: false, error: "Referral code not found. Please double-check the code." };
  }

  if (sponsor.user_id === userId) {
    return { success: false, error: "You cannot refer yourself." };
  }

  // 3. Atomically persist single relationship in public.profiles
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      referred_by_user_id: sponsor.user_id,
      referred_by: sponsor.referral_code,
    })
    .eq("user_id", userId);

  if (updateError) {
    return { success: false, error: updateError.message || "Failed to link sponsor" };
  }

  clearStoredReferralCode();
  return { success: true, referrer: sponsor };
}

/**
 * Ensures user profile exists, has a unique referral code, and establishes referral attribution.
 * This guarantees resilient registration even if database triggers don't run.
 */
export async function ensureUserProfileAndReferral(
  user: { id: string; email?: string | null },
  displayName?: string,
  preferredRefCode?: string
): Promise<{ profile: any; referrer: ReferrerProfile | null }> {
  const activeRefCode = preferredRefCode?.trim() || captureAndGetReferralCode();

  // 1. Check existing profile
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let referrer: ReferrerProfile | null = null;

  if (existingProfile) {
    let needsUpdate = false;
    const updates: Record<string, any> = {};

    // Ensure referral_code exists
    if (!existingProfile.referral_code) {
      updates.referral_code = generateReferralCode();
      needsUpdate = true;
    }

    // Resolve sponsor if referred_by_user_id is missing
    if (!existingProfile.referred_by_user_id) {
      const codeToTry = activeRefCode || existingProfile.referred_by;
      if (codeToTry) {
        referrer = await resolveReferrerByCode(codeToTry);
        if (referrer && referrer.user_id !== user.id) {
          updates.referred_by_user_id = referrer.user_id;
          updates.referred_by = referrer.referral_code;
          needsUpdate = true;
          clearStoredReferralCode();
        }
      }
    } else {
      // Fetch existing sponsor profile
      const { data: sp } = await supabase
        .from("profiles")
        .select("user_id, display_name, email, referral_code, avatar_url, business_name, business_phone, business_website, business_logo_url, business_location, business_slug, created_at")
        .eq("user_id", existingProfile.referred_by_user_id)
        .maybeSingle();
      referrer = sp as ReferrerProfile;
    }

    if (needsUpdate) {
      const { data: updated } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      return { profile: updated || { ...existingProfile, ...updates }, referrer };
    }

    return { profile: existingProfile, referrer };
  }

  // 2. Profile does not exist: create it with referral attribution
  if (activeRefCode) {
    referrer = await resolveReferrerByCode(activeRefCode);
    if (referrer?.user_id === user.id) {
      referrer = null; // Do not self-refer
    }
  }

  const newReferralCode = generateReferralCode();
  const nameToUse = displayName || user.email?.split("@")[0] || "GGD Member";

  const { data: createdProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      email: user.email || "",
      display_name: nameToUse,
      referral_code: newReferralCode,
      referred_by_user_id: referrer ? referrer.user_id : null,
      referred_by: referrer ? referrer.referral_code : null,
      credits: 10,
    })
    .select()
    .single();

  if (referrer) {
    clearStoredReferralCode();
  }

  // Ensure default roles exist
  try {
    await supabase.from("user_roles").insert({ user_id: user.id, role: "business" });
  } catch {
    // Ignore conflict
  }

  return { profile: createdProfile, referrer };
}

/**
 * Loads two-way referral information for the current user:
 * - User's sponsor ("Who Referred You")
 * - User's community members ("Referred Members")
 */
export async function loadTwoWayReferralData(userId: string): Promise<{
  referralCode: string;
  referrer: ReferrerProfile | null;
  members: ReferredMember[];
}> {
  // 1. Fetch current profile
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("user_id, referral_code, referred_by_user_id, referred_by")
    .eq("user_id", userId)
    .maybeSingle();

  let referrer: ReferrerProfile | null = null;

  // 2. Resolve sponsor: check referred_by_user_id first, then self-heal with referred_by code
  if (myProfile?.referred_by_user_id) {
    const { data: sponsorData } = await supabase
      .from("profiles")
      .select(
        "user_id, display_name, email, referral_code, avatar_url, business_name, business_phone, business_website, business_logo_url, business_location, business_slug, created_at"
      )
      .eq("user_id", myProfile.referred_by_user_id)
      .maybeSingle();
    referrer = sponsorData as ReferrerProfile;
  } else if (myProfile?.referred_by) {
    referrer = await resolveReferrerByCode(myProfile.referred_by);
    if (referrer && referrer.user_id !== userId) {
      // Self-heal the foreign key connection in database
      await supabase
        .from("profiles")
        .update({ referred_by_user_id: referrer.user_id })
        .eq("user_id", userId);
    }
  }

  // 3. Query all referred members (people who have referred_by_user_id === userId)
  const { data: memberRows } = await supabase
    .from("profiles")
    .select("user_id, display_name, email, referral_code, avatar_url, business_name, business_slug, created_at")
    .eq("referred_by_user_id", userId)
    .order("created_at", { ascending: false });

  return {
    referralCode: myProfile?.referral_code || "",
    referrer,
    members: (memberRows as ReferredMember[]) || [],
  };
}
