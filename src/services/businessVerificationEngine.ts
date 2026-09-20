import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc 
} from 'firebase/firestore';
import { supabase } from '@/integrations/supabase/client';
import {
  DocumentType,
  VerificationEvaluationResult,
  VerificationSubmissionRecord,
  AdminOverridePayload,
  ExtractionDetails
} from '@/types/verification';

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
  documentNumber: string;
  submittedName: string;
  registeredProfileName: string;
}

/**
 * Evaluates identity submissions according to core marketplace verification rules.
 * Generates exact JSON evaluation schema.
 */
export function evaluateVerificationSubmission(
  input: VerificationEvaluationInput
): VerificationEvaluationResult {
  const { accountType, documentType, documentNumber, submittedName, registeredProfileName } = input;

  const isBusiness = accountType === 'registered_business' || documentType === 'CAC';

  // 1. Document Format Validation
  let docValidation: { valid: boolean; reason?: string; clean?: string } = { valid: false };

  if (documentType === 'NIN') {
    const res = validateNIN(documentNumber);
    docValidation = { valid: res.valid, reason: res.reason, clean: res.cleanNIN };
  } else if (documentType === 'CAC') {
    const res = validateCAC(documentNumber);
    docValidation = { valid: res.valid, reason: res.reason, clean: res.cleanCAC };
  } else {
    docValidation = { valid: false, reason: 'Unsupported or UNKNOWN document type provided.' };
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
  const sim = computeNameSimilarity(submittedName, registeredProfileName, isBusiness);

  const extractionDetails: ExtractionDetails = {
    submitted_name: submittedName,
    registered_profile_name: registeredProfileName,
    document_type: documentType,
    document_number: docValidation.clean || documentNumber,
    clean_document_number: docValidation.clean,
    normalized_submitted_name: sim.normSub,
    normalized_registered_name: sim.normReg,
    similarity_score: sim.similarity
  };

  // 3. Exact Matching & Confidence Evaluation Rules
  // CASE A: Exact Name Match
  if (sim.exactMatch || sim.similarity >= 0.95) {
    return {
      status: 'VERIFIED',
      verified_badge_granted: true,
      match_confidence: 'HIGH',
      extraction_details: extractionDetails,
      rejection_reason: null
    };
  }

  // CASE B: Token Subset / Missing Middle Name / Minor Discrepancy (e.g. John Doe vs John Emeka Doe)
  if (sim.similarity >= 0.70) {
    return {
      status: 'FLAGGED_FOR_MANUAL_REVIEW',
      verified_badge_granted: false,
      match_confidence: 'MEDIUM',
      extraction_details: extractionDetails,
      rejection_reason: `Minor discrepancy detected between submitted name ("${submittedName}") and registered profile name ("${registeredProfileName}"). Flagged for authorized manual review.`
    };
  }

  // CASE C: Complete Mismatch
  return {
    status: 'REJECTED',
    verified_badge_granted: false,
    match_confidence: 'LOW',
    extraction_details: extractionDetails,
    rejection_reason: `Submitted name ("${submittedName}") does not match registered profile name ("${registeredProfileName}"). Confidence score (${Math.round(sim.similarity * 100)}%) is below threshold.`
  };
}

// ============================================================================
// 4. PERSISTENCE, ADMIN OVERRIDES & WORKSPACE SYNCHRONIZATION
// ============================================================================

const VERIFICATIONS_COLLECTION = 'marketplace_verifications';

/**
 * Submits and processes a new verification request, saving the evaluation
 * to Firestore and syncing verified badges to Supabase profiles & business_profiles.
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
  });

  const now = new Date().toISOString();
  const recordId = `verif_${payload.userId}_${Date.now()}`;

  const record: VerificationSubmissionRecord = {
    id: recordId,
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
    admin_action: 'NONE',
    admin_note: null,
    submitted_at: now,
    evaluated_at: now,
    last_updated_at: now,
  };

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, VERIFICATIONS_COLLECTION, recordId);
    await setDoc(docRef, record);
  } catch (fsErr) {
    console.warn('Firestore verification save warning:', fsErr);
  }

  // 3. Sync to Supabase Profiles & Business Profiles
  await syncVerificationStatusToDatabase(payload.userId, payload.businessProfileId, {
    is_verified: evaluation.verified_badge_granted,
    verification_status: evaluation.status,
    verification_document_type: payload.documentType,
    verified_at: evaluation.verified_badge_granted ? now : null,
  });

  return { evaluation, recordId };
}

/**
 * Synchronizes verification flags across Supabase profiles and business_profiles
 */
export async function syncVerificationStatusToDatabase(
  userId: string,
  businessProfileId: string | undefined,
  data: {
    is_verified: boolean;
    verification_status: string;
    verification_document_type: string;
    verified_at: string | null;
  }
) {
  try {
    // 1. Update profiles table
    await supabase.from('profiles').update({
      is_verified: data.is_verified,
      verification_status: data.verification_status,
    } as any).eq('user_id', userId);

    // 2. Update business_profiles if exists
    const updatePayload = {
      is_verified: data.is_verified,
      verification_status: data.verification_status,
      is_directory_listed: true,
    };

    if (businessProfileId) {
      await (supabase.from('business_profiles') as any).update(updatePayload).eq('id', businessProfileId);
    } else {
      await (supabase.from('business_profiles') as any).update(updatePayload).eq('user_id', userId);
    }
  } catch (err) {
    console.error('Database verification status sync note:', err);
  }
}

/**
 * Retrieves the latest verification submission for a user
 */
export async function getUserVerificationRecord(userId: string): Promise<VerificationSubmissionRecord | null> {
  if (!userId) return null;

  try {
    const q = query(
      collection(db, VERIFICATIONS_COLLECTION),
      where('user_id', '==', userId),
      orderBy('submitted_at', 'desc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as VerificationSubmissionRecord;
    }
  } catch (err) {
    console.warn('Error querying verification record from Firestore:', err);
  }

  return null;
}

/**
 * Retrieves all verification submissions for Admin review
 */
export async function getAllVerificationRecords(): Promise<VerificationSubmissionRecord[]> {
  try {
    const q = query(
      collection(db, VERIFICATIONS_COLLECTION),
      orderBy('submitted_at', 'desc')
    );
    const snap = await getDocs(q);
    const results: VerificationSubmissionRecord[] = [];
    snap.forEach(docSnap => {
      results.push(docSnap.data() as VerificationSubmissionRecord);
    });
    return results;
  } catch (err) {
    console.error('Error fetching verification records:', err);
    return [];
  }
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

  const docRef = doc(db, VERIFICATIONS_COLLECTION, recordId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Verification submission ${recordId} not found.`);
  }

  const current = snap.data() as VerificationSubmissionRecord;

  const updatedRecord: VerificationSubmissionRecord = {
    ...current,
    status: isApproval ? 'VERIFIED' : 'REJECTED',
    verified_badge_granted: isApproval,
    admin_action: payload.admin_action,
    admin_note: payload.admin_note || (isApproval ? 'Approved by authorized Administrator.' : 'Rejected by Administrator.'),
    admin_id: payload.admin_id || null,
    admin_email: payload.admin_email || null,
    reviewed_at: now,
    last_updated_at: now,
  };

  await updateDoc(docRef, {
    status: updatedRecord.status,
    verified_badge_granted: updatedRecord.verified_badge_granted,
    admin_action: updatedRecord.admin_action,
    admin_note: updatedRecord.admin_note,
    admin_id: updatedRecord.admin_id,
    admin_email: updatedRecord.admin_email,
    reviewed_at: updatedRecord.reviewed_at,
    last_updated_at: updatedRecord.last_updated_at,
  });

  // Sync with DB
  await syncVerificationStatusToDatabase(current.user_id, current.business_profile_id, {
    is_verified: isApproval,
    verification_status: updatedRecord.status,
    verification_document_type: current.document_type,
    verified_at: isApproval ? now : null,
  });

  return updatedRecord;
}
