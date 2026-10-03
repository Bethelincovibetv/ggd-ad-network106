import { supabase } from '@/integrations/supabase/client';
import {
  DocumentType,
  VerificationEvaluationResult,
  VerificationSubmissionRecord,
  AdminOverridePayload,
  ExtractionDetails
} from '@/types/verification';
import { notifyVerificationStatusChange } from '@/services/automatedEmailNotificationService';

// ============================================================================
// 1. PATTERN MATCHING & VALIDATION UTILITIES
// ============================================================================

/**
 * Validates Nigerian National Identification Number (NIN)
 * Must be exactly 11 numeric digits and pass basic entropy checks
 */
export function validateNIN(input: string): { valid: boolean; reason?: string; cleanNIN: string } {
  if (!input) {
    return { valid: false, reason: 'NIN is required for individual verification.', cleanNIN: '' };
  }

  const clean = input.replace(/[\s\-_]/g, '').trim();

  if (!/^\d+$/.test(clean)) {
    return { valid: false, reason: 'NIN must contain only numeric digits (0-9).', cleanNIN: clean };
  }

  if (clean.length !== 11) {
    return { 
      valid: false, 
      reason: `NIN must be exactly 11 digits (provided ${clean.length} digits).`, 
      cleanNIN: clean 
    };
  }

  // Check for dummy / synthetic repeating sequences
  const allIdentical = /^(\d)\1{10}$/.test(clean);
  if (allIdentical) {
    return { valid: false, reason: 'Invalid synthetic repeating NIN sequence detected.', cleanNIN: clean };
  }

  const sequential = ['01234567890', '12345678901', '98765432109', '09876543210'];
  if (sequential.includes(clean)) {
    return { valid: false, reason: 'Invalid sequential test NIN provided.', cleanNIN: clean };
  }

  // Verify digit entropy (must contain at least 4 unique digits)
  const uniqueDigits = new Set(clean.split('')).size;
  if (uniqueDigits < 4) {
    return { valid: false, reason: 'Invalid or dummy NIN format detected.', cleanNIN: clean };
  }

  return { valid: true, cleanNIN: clean };
}

/**
 * Validates Nigerian Corporate Affairs Commission (CAC) Registration / RC / BN Number
 */
export function validateCAC(input: string): { valid: boolean; reason?: string; cleanCAC: string; prefix?: string } {
  if (!input) {
    return { valid: false, reason: 'CAC Registration Number is required for registered businesses.', cleanCAC: '' };
  }

  const clean = input.replace(/[\s/._-]/g, '').toUpperCase().trim();

  // Pattern match: RC1234567, BN1234567, IT1234567 or pure digits (6-9 digits)
  const cacPattern = /^(RC|BN|IT)?(\d{6,9})$/;
  const match = clean.match(cacPattern);

  if (!match) {
    return {
      valid: false,
      reason: 'CAC format invalid. Expected format: RC-1234567, BN-1234567, or 6 to 9 registration digits.',
      cleanCAC: clean
    };
  }

  const prefix = match[1] || 'RC';
  const digits = match[2];

  // Check repeated digits
  if (/^(\d)\1{5,}$/.test(digits)) {
    return { valid: false, reason: 'Invalid synthetic repeating CAC number.', cleanCAC: `${prefix}-${digits}` };
  }

  return { valid: true, cleanCAC: `${prefix}-${digits}`, prefix };
}

// ============================================================================
// 2. NAME NORMALIZATION & STRING SIMILARITY ALGORITHMS
// ============================================================================

const BUSINESS_STOP_WORDS = new Set([
  'ltd', 'limited', 'plc', 'enterprises', 'enterprise', 'ventures', 'services', 
  'concept', 'concepts', 'global', 'hub', 'nigeria', 'nig', 'intl', 'international', 
  'company', 'co', 'group', 'farms', 'farm', 'tech', 'technologies', 'solutions', 
  'logistics', 'stores', 'store', 'integrated', 'holdings', 'and', 'the', 'inc', 
  'corp', 'consult', 'consulting', 'digital', 'agency', 'studio', 'mart', 'market'
]);

/**
 * Normalizes names by converting to lower-case, stripping punctuation & entity qualifiers
 */
export function normalizeName(name: string, isBusiness = false): string {
  if (!name) return '';

  let cleaned = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();

  if (isBusiness) {
    const tokens = cleaned.split(' ').filter(token => !BUSINESS_STOP_WORDS.has(token) && token.length > 0);
    cleaned = tokens.join(' ');
  }

  return cleaned.trim();
}

/**
 * Standard Levenshtein Distance Calculation
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Computes Name Similarity Ratio between 0.0 and 1.0 using Levenshtein & Token Overlap
 */
export function computeNameSimilarity(submitted: string, registered: string, isBusiness = false): {
  similarity: number;
  exactMatch: boolean;
  tokenOverlap: number;
  normSub: string;
  normReg: string;
} {
  const normSub = normalizeName(submitted, isBusiness);
  const normReg = normalizeName(registered, isBusiness);

  if (!normSub || !normReg) {
    return { similarity: 0, exactMatch: false, tokenOverlap: 0, normSub, normReg };
  }

  if (normSub === normReg) {
    return { similarity: 1.0, exactMatch: true, tokenOverlap: 1.0, normSub, normReg };
  }

  // Token-level matching (handles middle names missing or inverted name orders)
  const tokensSub = normSub.split(' ').filter(Boolean);
  const tokensReg = normReg.split(' ').filter(Boolean);

  const setSub = new Set(tokensSub);
  const setReg = new Set(tokensReg);

  let matchCount = 0;
  tokensSub.forEach(t => {
    if (setReg.has(t)) matchCount++;
  });

  const tokenOverlap = (2 * matchCount) / (tokensSub.length + tokensReg.length);

  // String Levenshtein Similarity
  const maxLen = Math.max(normSub.length, normReg.length);
  const dist = levenshteinDistance(normSub, normReg);
  const stringSim = Math.max(0, (maxLen - dist) / maxLen);

  // Combined score giving strong weight to token overlap for multi-word names
  const combinedScore = tokenOverlap >= 0.7 ? Math.max(tokenOverlap, stringSim) : (tokenOverlap * 0.4 + stringSim * 0.6);

  return {
    similarity: Math.round(combinedScore * 100) / 100,
    exactMatch: normSub === normReg,
    tokenOverlap,
    normSub,
    normReg
  };
}

// ============================================================================
// 3. CORE AUTOMATED BUSINESS VERIFICATION ENGINE
// ============================================================================

export interface VerificationEvaluationInput {
  accountType: 'individual' | 'registered_business';
  documentType: DocumentType;
  documentNumber?: string;
  submittedName: string;
  registeredProfileName: string;
  documentFileUrl?: string;
}

/**
 * Evaluates identity submissions according to core marketplace verification rules.
 * Generates exact JSON evaluation schema.
 */
export function evaluateVerificationSubmission(
  input: VerificationEvaluationInput
): VerificationEvaluationResult {
  const { accountType, documentType, documentNumber = '', submittedName, registeredProfileName, documentFileUrl } = input;

  const isBusiness = accountType === 'registered_business' || documentType === 'CAC';

  // 1. Document Format & Upload Validation
  let docValidation: { valid: boolean; reason?: string; clean?: string } = { valid: false };

  // If user uploaded a document slip/image/pdf, we permit upload-first verification
  const hasUploadedDoc = !!(documentFileUrl && documentFileUrl.length > 5);

  if (documentType === 'NIN') {
    if (documentNumber && documentNumber.trim()) {
      const res = validateNIN(documentNumber);
      docValidation = { valid: res.valid, reason: res.reason, clean: res.cleanNIN };
    } else if (hasUploadedDoc) {
      // Document upload mode for NIN
      docValidation = { valid: true, clean: 'NIN-SLIP-UPLOADED' };
    } else {
      docValidation = { valid: false, reason: 'Please upload your National ID / NIN slip.' };
    }
  } else if (documentType === 'CAC') {
    if (documentNumber && documentNumber.trim()) {
      const res = validateCAC(documentNumber);
      docValidation = { valid: res.valid, reason: res.reason, clean: res.cleanCAC };
    } else if (hasUploadedDoc) {
      // Document upload mode for CAC
      docValidation = { valid: true, clean: 'CAC-CERT-UPLOADED' };
    } else {
      docValidation = { valid: false, reason: 'Please upload your CAC Registration Certificate.' };
    }
  } else {
    if (hasUploadedDoc) {
      docValidation = { valid: true, clean: 'OFFICIAL-DOC-UPLOADED' };
    } else {
      docValidation = { valid: false, reason: 'Unsupported or UNKNOWN document type provided.' };
    }
  }

  // Format Rejection Check
  if (!docValidation.valid) {
    const extractionDetails: ExtractionDetails = {
      submitted_name: submittedName || '',
      registered_profile_name: registeredProfileName || '',
      document_type: documentType,
      document_number: documentNumber || '',
      clean_document_number: docValidation.clean || documentNumber || '',
    };

    return {
      status: 'REJECTED',
      verified_badge_granted: false,
      match_confidence: 'LOW',
      extraction_details: extractionDetails,
      rejection_reason: docValidation.reason || 'Invalid document format.'
    };
  }

  // 2. Name Matching & Similarity Evaluation
  const effectiveSubName = submittedName || registeredProfileName;
  const sim = computeNameSimilarity(effectiveSubName, registeredProfileName, isBusiness);

  const extractionDetails: ExtractionDetails = {
    submitted_name: effectiveSubName,
    registered_profile_name: registeredProfileName,
    document_type: documentType,
    document_number: docValidation.clean || documentNumber || 'DOC-UPLOADED',
    clean_document_number: docValidation.clean,
    normalized_submitted_name: sim.normSub,
    normalized_registered_name: sim.normReg,
    similarity_score: sim.similarity
  };

  // 3. Exact Matching & Confidence Evaluation Rules
  // CASE A: Exact Name Match with document attached
  if (sim.exactMatch || sim.similarity >= 0.90) {
    return {
      status: 'VERIFIED',
      verified_badge_granted: true,
      match_confidence: 'HIGH',
      extraction_details: extractionDetails,
      rejection_reason: null
    };
  }

  // CASE B: Token Subset / Missing Middle Name / Minor Discrepancy (e.g. John Doe vs John Emeka Doe)
  if (sim.similarity >= 0.65) {
    return {
      status: 'FLAGGED_FOR_MANUAL_REVIEW',
      verified_badge_granted: false,
      match_confidence: 'MEDIUM',
      extraction_details: extractionDetails,
      rejection_reason: `Minor discrepancy detected between submitted name ("${effectiveSubName}") and registered profile name ("${registeredProfileName}"). Flagged for authorized manual review.`
    };
  }

  // CASE C: Complete Mismatch
  return {
    status: 'REJECTED',
    verified_badge_granted: false,
    match_confidence: 'LOW',
    extraction_details: extractionDetails,
    rejection_reason: `Submitted name ("${effectiveSubName}") does not match registered profile name ("${registeredProfileName}"). Confidence score (${Math.round(sim.similarity * 100)}%) is below threshold.`
  };
}

// ============================================================================
// 4. PERSISTENCE, ADMIN OVERRIDES & WORKSPACE SYNCHRONIZATION
// ============================================================================

/**
 * Submits and processes a new verification request, saving the evaluation
 * to Lovable Cloud and syncing verified badges through the database trigger.
 */
export async function submitVerificationToEngine(payload: {
  userId: string;
  businessProfileId?: string;
  userEmail?: string;
  accountType: 'individual' | 'registered_business';
  documentType: DocumentType;
  documentNumber: string;
  submittedName: string;
  registeredProfileName: string;
  documentFileUrl?: string;
  metadata?: Record<string, any>;
}): Promise<{ evaluation: VerificationEvaluationResult; recordId: string }> {
  // 1. Run Automated Evaluation
  const evaluation = evaluateVerificationSubmission({
    accountType: payload.accountType,
    documentType: payload.documentType,
    documentNumber: payload.documentNumber,
    submittedName: payload.submittedName,
    registeredProfileName: payload.registeredProfileName,
    documentFileUrl: payload.documentFileUrl,
  });

  const now = new Date().toISOString();
  const recordInput = {
    user_id: payload.userId,
    business_profile_id: payload.businessProfileId,
    user_email: payload.userEmail,
    account_type: payload.accountType,
    document_type: payload.documentType,
    document_number: payload.documentNumber,
    submitted_name: payload.submittedName,
    registered_profile_name: payload.registeredProfileName,
    document_file_url: payload.documentFileUrl,
    status: evaluation.status,
    verified_badge_granted: evaluation.verified_badge_granted,
    match_confidence: evaluation.match_confidence,
    rejection_reason: evaluation.rejection_reason,
    extraction_details: evaluation.extraction_details,
    metadata: payload.metadata || {},
    admin_action: 'NONE',
    admin_note: null,
    submitted_at: now,
    evaluated_at: now,
    last_updated_at: now,
  };

  const { data: savedRecord, error } = await supabase
    .from('business_verifications')
    .insert(recordInput)
    .select()
    .single();

  if (error || !savedRecord) {
    throw new Error(error?.message || 'Unable to save verification submission.');
  }

  const record = savedRecord as VerificationSubmissionRecord;

  // The database trigger updates profile and business verification flags.
  broadcastVerificationChange({
    userId: payload.userId,
    businessProfileId: payload.businessProfileId,
    isVerified: evaluation.verified_badge_granted,
    status: evaluation.status,
    record,
  });

  // 5. Dispatch automated email notification via SMTP gateway & targeted push notification
  try {
    notifyVerificationStatusChange({
      userId: payload.userId,
      userEmail: payload.userEmail,
      businessName: payload.submittedName || payload.registeredProfileName || 'Business Member',
      status: evaluation.status as any,
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      rejectionReason: evaluation.rejection_reason || undefined,
    }).catch((err) => console.warn('Automated verification email notification note:', err));
  } catch (notifErr) {
    console.warn('Notification dispatch non-blocking note:', notifErr);
  }

  return { evaluation, recordId: record.id };
}

/**
 * Broadcasts verification state update across active browser tabs and components in real time
 */
export function broadcastVerificationChange(payload: {
  userId: string;
  businessProfileId?: string;
  isVerified: boolean;
  status: string;
  record?: VerificationSubmissionRecord | null;
}) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ggd_verification_updated', { detail: payload }));
      localStorage.setItem('ggd_last_verif_change', JSON.stringify({ ...payload, timestamp: Date.now() }));
    }
  } catch (e) {
    console.warn('Could not broadcast verification update event:', e);
  }
}

/**
 * Retrieves the latest verification submission for a user
 */
export async function getUserVerificationRecord(userId: string): Promise<VerificationSubmissionRecord | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('business_verifications')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Error querying verification record:', error);
    return null;
  }

  return data ? (data as VerificationSubmissionRecord) : null;
}

/**
 * Real-time listener for a user's verification record via Lovable Cloud Realtime
 */
export function subscribeToUserVerification(
  userId: string,
  onUpdate: (record: VerificationSubmissionRecord | null) => void,
  onError?: (err: any) => void
): () => void {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  void getUserVerificationRecord(userId).then(onUpdate);

  const channel = supabase
    .channel(`business-verification-user-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'business_verifications',
      filter: `user_id=eq.${userId}`,
    }, () => {
      void getUserVerificationRecord(userId).then(onUpdate).catch((error) => onError?.(error));
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Verification realtime subscription ${status.toLowerCase()}.`));
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Retrieves all verification submissions for Admin review
 */
export async function getAllVerificationRecords(): Promise<VerificationSubmissionRecord[]> {
  const { data, error } = await supabase
    .from('business_verifications')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching verification records:', error);
    return [];
  }

  return (data || []) as VerificationSubmissionRecord[];
}

/**
 * Real-time listener for all verification submissions for Admin dashboard
 */
export function subscribeToAllVerifications(
  onUpdate: (records: VerificationSubmissionRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  void getAllVerificationRecords().then(onUpdate);

  const channel = supabase
    .channel('business-verifications-admin')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'business_verifications',
    }, () => {
      void getAllVerificationRecords().then(onUpdate).catch((error) => onError?.(error));
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError?.(new Error(`Verification realtime subscription ${status.toLowerCase()}.`));
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Executes an Admin Override on a verification submission
 * Handles APPROVE and REJECT actions according to core engine rules.
 */
export async function processAdminVerificationOverride(
  recordId: string,
  payload: AdminOverridePayload
): Promise<VerificationSubmissionRecord> {
  const now = new Date().toISOString();
  const isApproval = payload.admin_action === 'APPROVE';

  const { data: current, error: fetchError } = await supabase
    .from('business_verifications')
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!current) {
    throw new Error(`Verification submission ${recordId} not found.`);
  }

  const { data: savedRecord, error: updateError } = await supabase
    .from('business_verifications')
    .update({
      status: isApproval ? 'VERIFIED' : 'REJECTED',
      verified_badge_granted: isApproval,
      admin_action: payload.admin_action,
      admin_note: payload.admin_note || (isApproval ? 'Approved by authorized Administrator.' : 'Rejected by Administrator.'),
      admin_id: payload.admin_id || null,
      admin_email: payload.admin_email || null,
      reviewed_at: now,
      last_updated_at: now,
    })
    .eq('id', recordId)
    .select()
    .single();

  if (updateError || !savedRecord) {
    throw new Error(updateError?.message || 'Unable to update verification submission.');
  }

  const updatedRecord = savedRecord as VerificationSubmissionRecord;

  // 4. Dispatch automated email notification via SMTP gateway & targeted push notification
  try {
    notifyVerificationStatusChange({
      userId: current.user_id,
      userEmail: current.user_email || undefined,
      businessName: current.submitted_name || current.registered_profile_name || 'Business Member',
      status: updatedRecord.status as any,
      documentType: current.document_type,
      documentNumber: current.document_number,
      adminNote: updatedRecord.admin_note || undefined,
    }).catch((err) => console.warn('Admin override automated email note:', err));
  } catch (notifErr) {
    console.warn('Admin override notification non-blocking note:', notifErr);
  }

  return updatedRecord;
}

/**
 * Direct Admin Verification for any User or Business Profile
 * Allows Admin to directly verify or revoke a merchant with 1-click directly from their profile page.
 */
export async function adminDirectVerifyUser(payload: {
  userId: string;
  businessProfileId?: string;
  verify: boolean;
  adminNote?: string;
  adminId?: string;
  adminEmail?: string;
  profileName?: string;
}): Promise<VerificationSubmissionRecord> {
  const { userId, businessProfileId, verify, adminNote, adminId, adminEmail, profileName } = payload;
  const now = new Date().toISOString();

  // 1. Check if an existing record exists for this user in Lovable Cloud
  let existing = await getUserVerificationRecord(userId);
  const recordInput = {
    user_id: userId,
    business_profile_id: businessProfileId || existing?.business_profile_id,
    user_email: adminEmail,
    account_type: existing?.account_type || 'registered_business',
    document_type: existing?.document_type || 'CAC',
    document_number: existing?.document_number || (verify ? 'ADMIN-DIRECT-VERIFIED' : 'UNVERIFIED'),
    submitted_name: existing?.submitted_name || profileName || 'Verified Merchant',
    registered_profile_name: existing?.registered_profile_name || profileName || 'Verified Merchant',
    document_file_url: existing?.document_file_url,
    status: verify ? 'VERIFIED' : 'REJECTED',
    verified_badge_granted: verify,
    match_confidence: 'HIGH',
    rejection_reason: verify ? null : 'Verification revoked by platform administrator.',
    extraction_details: existing?.extraction_details || {
      submitted_name: profileName || 'Merchant',
      registered_profile_name: profileName || 'Merchant',
      document_type: 'CAC',
      document_number: 'ADMIN-DIRECT-VERIFIED',
      similarity_score: 1.0,
    },
    admin_action: verify ? 'APPROVE' : 'REJECT',
    admin_note: adminNote || (verify ? 'Directly verified by Platform Administrator.' : 'Verification revoked by Administrator.'),
    admin_id: adminId || null,
    admin_email: adminEmail || null,
    submitted_at: existing?.submitted_at || now,
    evaluated_at: now,
    reviewed_at: now,
    last_updated_at: now,
  };

  let updatedRecord: VerificationSubmissionRecord;
  if (existing) {
    const { data, error } = await supabase
      .from('business_verifications')
      .update(recordInput)
      .eq('id', existing.id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message || 'Unable to update direct verification.');
    updatedRecord = data as VerificationSubmissionRecord;
  } else {
    const { data, error } = await supabase
      .from('business_verifications')
      .insert(recordInput)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message || 'Unable to create direct verification.');
    updatedRecord = data as VerificationSubmissionRecord;
  }

  // 4. Dispatch automated email notification via SMTP gateway & targeted push notification
  try {
    notifyVerificationStatusChange({
      userId,
      userEmail: adminEmail || existing?.user_email || undefined,
      businessName: updatedRecord.submitted_name || profileName || 'Business Member',
      status: (verify ? 'VERIFIED' : 'REVOKED') as any,
      documentType: updatedRecord.document_type,
      documentNumber: updatedRecord.document_number,
      adminNote: updatedRecord.admin_note || undefined,
    }).catch((err) => console.warn('Admin direct verify email note:', err));
  } catch (notifErr) {
    console.warn('Admin direct verify notification non-blocking note:', notifErr);
  }

  return updatedRecord;
}

