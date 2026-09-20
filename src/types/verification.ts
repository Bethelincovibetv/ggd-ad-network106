export type VerificationStatus = 'VERIFIED' | 'REJECTED' | 'FLAGGED_FOR_MANUAL_REVIEW' | 'PENDING';

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type DocumentType = 'NIN' | 'CAC' | 'UNKNOWN';

export type AdminActionType = 'APPROVE' | 'REJECT' | 'NONE';

export interface ExtractionDetails {
  submitted_name: string;
  registered_profile_name: string;
  document_type: DocumentType;
  document_number: string;
  clean_document_number?: string;
  normalized_submitted_name?: string;
  normalized_registered_name?: string;
  similarity_score?: number;
}

export interface VerificationEvaluationResult {
  status: 'VERIFIED' | 'REJECTED' | 'FLAGGED_FOR_MANUAL_REVIEW';
  verified_badge_granted: boolean;
  match_confidence: MatchConfidence;
  extraction_details: ExtractionDetails;
  rejection_reason: string | null;
}

export interface AdminOverridePayload {
  admin_action: 'APPROVE' | 'REJECT';
  admin_note?: string;
  admin_id?: string;
  admin_email?: string;
}

export interface VerificationSubmissionRecord {
  id: string;
  user_id: string;
  business_profile_id?: string;
  user_email?: string;
  account_type: 'individual' | 'registered_business';
  document_type: DocumentType;
  document_number: string;
  submitted_name: string;
  registered_profile_name: string;
  document_file_url?: string;
  status: VerificationStatus;
  verified_badge_granted: boolean;
  match_confidence: MatchConfidence;
  rejection_reason: string | null;
  extraction_details: ExtractionDetails;
  admin_action?: AdminActionType;
  admin_note?: string | null;
  admin_id?: string | null;
  admin_email?: string | null;
  submitted_at: string;
  evaluated_at: string;
  reviewed_at?: string | null;
  last_updated_at: string;
}
