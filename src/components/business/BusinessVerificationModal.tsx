import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Building2,
  User,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Loader2,
  Code2,
  ChevronRight,
  Info,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DocumentType,
  VerificationEvaluationResult,
  VerificationSubmissionRecord
} from "@/types/verification";
import {
  evaluateVerificationSubmission,
  submitVerificationToEngine,
  getUserVerificationRecord,
  validateNIN,
  validateCAC
} from "@/services/businessVerificationEngine";
import { BusinessVerificationBadge } from "./BusinessVerificationBadge";

interface BusinessVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  businessProfileId?: string;
  currentProfileName?: string;
  currentBusinessName?: string;
  onVerificationComplete?: () => void;
}

export const BusinessVerificationModal: React.FC<BusinessVerificationModalProps> = ({
  open,
  onOpenChange,
  userId,
  businessProfileId,
  currentProfileName = '',
  currentBusinessName = '',
  onVerificationComplete
}) => {
  const [accountType, setAccountType] = useState<'individual' | 'registered_business'>('registered_business');
  const [documentType, setDocumentType] = useState<DocumentType>('CAC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [registeredProfileName, setRegisteredProfileName] = useState('');
  const [documentFileUrl, setDocumentFileUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [evaluating, setEvaluating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [existingRecord, setExistingRecord] = useState<VerificationSubmissionRecord | null>(null);

  const [evaluationResult, setEvaluationResult] = useState<VerificationEvaluationResult | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);

  // Sync profile names on open
  useEffect(() => {
    if (open && userId) {
      const defaultRegName = (accountType === 'registered_business' ? currentBusinessName : currentProfileName) 
        || currentBusinessName 
        || currentProfileName 
        || '';
      setRegisteredProfileName(defaultRegName);
      if (!submittedName) {
        setSubmittedName(defaultRegName);
      }
      fetchExistingRecord();
    }
  }, [open, userId, accountType, currentProfileName, currentBusinessName]);

  const fetchExistingRecord = async () => {
    setLoadingRecord(true);
    try {
      const rec = await getUserVerificationRecord(userId);
      if (rec) {
        setExistingRecord(rec);
        if (rec.account_type) setAccountType(rec.account_type);
        if (rec.document_type) setDocumentType(rec.document_type);
        if (rec.document_number) setDocumentNumber(rec.document_number);
        if (rec.submitted_name) setSubmittedName(rec.submitted_name);
        if (rec.registered_profile_name) setRegisteredProfileName(rec.registered_profile_name);
        if (rec.document_file_url) setDocumentFileUrl(rec.document_file_url);
      }
    } catch (err) {
      console.warn('Could not load existing record:', err);
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleAccountTypeChange = (type: 'individual' | 'registered_business') => {
    setAccountType(type);
    setEvaluationResult(null);
    if (type === 'individual') {
      setDocumentType('NIN');
      const targetName = currentProfileName || currentBusinessName || '';
      setRegisteredProfileName(targetName);
      setSubmittedName(targetName);
    } else {
      setDocumentType('CAC');
      const targetName = currentBusinessName || currentProfileName || '';
      setRegisteredProfileName(targetName);
      setSubmittedName(targetName);
    }
  };

  // Upload certificate or ID slip
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `verification-docs/${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setDocumentFileUrl(publicUrl);
      toast.success("Document uploaded successfully! 📄");
    } catch (err: any) {
      toast.error("Document upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploadingDoc(false);
    }
  };

  // Live Dry Run / Test Evaluation
  const handleTestEvaluation = () => {
    if (!documentNumber.trim()) {
      toast.error(`Please enter your ${documentType === 'NIN' ? '11-digit NIN' : 'CAC Registration Number'}`);
      return;
    }
    if (!submittedName.trim()) {
      toast.error("Please enter the name appearing on your document.");
      return;
    }

    setEvaluating(true);
    try {
      const evalRes = evaluateVerificationSubmission({
        accountType,
        documentType,
        documentNumber: documentNumber.trim(),
        submittedName: submittedName.trim(),
        registeredProfileName: registeredProfileName.trim() || submittedName.trim()
      });

      setEvaluationResult(evalRes);

      if (evalRes.status === 'VERIFIED') {
        toast.success("Match verified! High confidence detected. Ready to submit.");
      } else if (evalRes.status === 'FLAGGED_FOR_MANUAL_REVIEW') {
        toast.info("Evaluation complete: Minor name variation flagged for manual review.");
      } else {
        toast.error(`Evaluation failed: ${evalRes.rejection_reason || 'Format or name mismatch.'}`);
      }
    } finally {
      setEvaluating(false);
    }
  };

  // Final Submission to Verification Engine
  const handleSubmitVerification = async () => {
    if (!documentNumber.trim()) {
      toast.error(`Please enter your ${documentType === 'NIN' ? '11-digit NIN' : 'CAC Registration Number'}`);
      return;
    }
    if (!submittedName.trim()) {
      toast.error("Please enter the name on your document.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      const { evaluation, recordId } = await submitVerificationToEngine({
        userId,
        businessProfileId,
        userEmail,
        accountType,
        documentType,
        documentNumber: documentNumber.trim(),
        submittedName: submittedName.trim(),
        registeredProfileName: registeredProfileName.trim() || submittedName.trim(),
        documentFileUrl: documentFileUrl || undefined
      });

      setEvaluationResult(evaluation);
      await fetchExistingRecord();

      if (evaluation.status === 'VERIFIED') {
        toast.success("🎉 Verification successful! Verified Business Badge has been activated on your storefront!");
      } else if (evaluation.status === 'FLAGGED_FOR_MANUAL_REVIEW') {
        toast.info("Submission received! Your identity has been queued for quick manual review by our team.");
      } else {
        toast.error(`Verification rejected: ${evaluation.rejection_reason}`);
      }

      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err: any) {
      toast.error("Failed to process verification: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const ninValidation = documentType === 'NIN' ? validateNIN(documentNumber) : null;
  const cacValidation = documentType === 'CAC' ? validateCAC(documentNumber) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </div>
              Automated Business Verification
            </DialogTitle>
            {existingRecord && (
              <BusinessVerificationBadge 
                status={existingRecord.status} 
                isVerified={existingRecord.verified_badge_granted} 
                size="sm" 
              />
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Get your official Verified Business Badge with automated pattern matching and instant identity checks.
          </DialogDescription>
        </DialogHeader>

        {loadingRecord ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <p className="text-xs font-semibold">Loading verification status...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Existing Status Banner if already processed */}
            {existingRecord && (
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                existingRecord.status === 'VERIFIED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                  : existingRecord.status === 'FLAGGED_FOR_MANUAL_REVIEW'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
              }`}>
                <div className="flex items-center justify-between font-black text-sm">
                  <span className="flex items-center gap-1.5">
                    {existingRecord.status === 'VERIFIED' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {existingRecord.status === 'FLAGGED_FOR_MANUAL_REVIEW' && <Clock className="h-4 w-4 text-amber-600 animate-pulse" />}
                    {existingRecord.status === 'REJECTED' && <ShieldAlert className="h-4 w-4 text-rose-600" />}
                    Current Status: {existingRecord.status}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase">
                    Confidence: {existingRecord.match_confidence}
                  </Badge>
                </div>
                {existingRecord.rejection_reason && (
                  <p className="text-[11px] opacity-90">{existingRecord.rejection_reason}</p>
                )}
                {existingRecord.admin_note && (
                  <p className="text-[11px] font-semibold italic">Admin Note: {existingRecord.admin_note}</p>
                )}
              </div>
            )}

            {/* Account Type Selection */}
            <div>
              <Label className="text-xs font-bold text-foreground block mb-1.5">
                Verification Category
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('registered_business')}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                    accountType === 'registered_business'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-border/70 hover:border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${
                    accountType === 'registered_business' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Registered Business</p>
                    <p className="text-[10px] text-muted-foreground">CAC Certificate & RC/BN</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleAccountTypeChange('individual')}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                    accountType === 'individual'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-border/70 hover:border-border text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${
                    accountType === 'individual' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Individual Merchant</p>
                    <p className="text-[10px] text-muted-foreground">National ID Number (NIN)</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Document Details Form */}
            <div className="space-y-3 pt-1">
              {/* Document Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-bold text-foreground">
                    {documentType === 'NIN' ? 'National Identification Number (NIN)' : 'CAC Registration / RC Number'}
                  </Label>
                  {documentType === 'NIN' && (
                    <span className={`text-[10px] font-bold ${
                      documentNumber.length === 11 ? 'text-emerald-600' : 'text-muted-foreground'
                    }`}>
                      {documentNumber.length}/11 Digits
                    </span>
                  )}
                </div>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder={documentType === 'NIN' ? 'Enter 11-digit NIN (e.g. 12345678901)' : 'e.g. RC-1234567 or BN-1234567'}
                  className={`h-10 text-xs font-mono font-semibold rounded-xl ${
                    documentType === 'NIN' && documentNumber && (!ninValidation?.valid ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-emerald-500')
                  }`}
                />
                {documentType === 'NIN' && documentNumber && !ninValidation?.valid && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {ninValidation?.reason}
                  </p>
                )}
                {documentType === 'CAC' && documentNumber && !cacValidation?.valid && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {cacValidation?.reason}
                  </p>
                )}
              </div>

              {/* Submitted Legal / Business Name */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1">
                  {documentType === 'NIN' ? 'Full Legal Name on NIN' : 'Official Business Name on CAC Document'}
                </Label>
                <Input
                  value={submittedName}
                  onChange={(e) => setSubmittedName(e.target.value)}
                  placeholder={documentType === 'NIN' ? 'e.g. Emeka John Okon' : 'e.g. Acme Innovations Nigeria Limited'}
                  className="h-10 text-xs rounded-xl font-medium"
                />
              </div>

              {/* Registered Account Profile Name (Comparison Base) */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1">
                  Target Storefront / Account Profile Name
                </Label>
                <Input
                  value={registeredProfileName}
                  onChange={(e) => setRegisteredProfileName(e.target.value)}
                  placeholder="Storefront / Profile Name"
                  className="h-10 text-xs rounded-xl font-medium bg-muted/40"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  The automated engine compares your submitted document name against this registered profile name.
                </p>
              </div>

              {/* Document Certificate Upload (Optional) */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1">
                  Upload Document Slip / Certificate (Optional Image/PDF)
                </Label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="border border-dashed border-border/80 hover:border-emerald-500 rounded-xl p-3 text-center transition-all bg-muted/20 hover:bg-muted/40 flex items-center justify-center gap-2">
                      {uploadingDoc ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className="text-xs font-semibold text-foreground">
                        {documentFileUrl ? 'Change Document File' : 'Upload CAC / NIN File'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploadingDoc}
                    />
                  </label>
                  {documentFileUrl && (
                    <Badge variant="outline" className="text-xs font-semibold text-emerald-600 border-emerald-400 bg-emerald-50">
                      Uploaded ✓
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Test Evaluation Result Card */}
            {evaluationResult && (
              <Card className="border border-border shadow-sm overflow-hidden rounded-2xl mt-3">
                <div className={`p-3 border-b flex items-center justify-between ${
                  evaluationResult.status === 'VERIFIED'
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : evaluationResult.status === 'FLAGGED_FOR_MANUAL_REVIEW'
                    ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
                }`}>
                  <span className="text-xs font-black flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Engine Evaluation: {evaluationResult.status}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[10px] font-bold ${
                      evaluationResult.match_confidence === 'HIGH' ? 'bg-emerald-600 text-white' :
                      evaluationResult.match_confidence === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      Confidence: {evaluationResult.match_confidence}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3.5 text-xs space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Submitted:</span>
                      <span className="font-bold text-foreground">{evaluationResult.extraction_details.submitted_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Registered:</span>
                      <span className="font-bold text-foreground">{evaluationResult.extraction_details.registered_profile_name}</span>
                    </div>
                  </div>

                  {evaluationResult.rejection_reason && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      {evaluationResult.rejection_reason}
                    </p>
                  )}

                  {/* Toggle Raw JSON Output */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowJsonRaw(!showJsonRaw)}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-mono inline-flex items-center gap-1"
                    >
                      <Code2 className="h-3 w-3" />
                      {showJsonRaw ? 'Hide JSON Output' : 'View Clean JSON Response'}
                    </button>
                    {showJsonRaw && (
                      <pre className="mt-1.5 p-2.5 bg-muted rounded-xl text-[10px] font-mono overflow-x-auto text-foreground border">
                        {JSON.stringify(evaluationResult, null, 2)}
                      </pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestEvaluation}
            disabled={evaluating || submitting || !documentNumber.trim()}
            className="h-10 text-xs font-bold rounded-xl"
          >
            {evaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Evaluating...
              </>
            ) : (
              <>
                <FileCheck2 className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                Dry-Run Test Match
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSubmitVerification}
            disabled={submitting || evaluating || !documentNumber.trim() || !submittedName.trim()}
            className="h-10 text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 rounded-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Submitting to Engine...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Submit Verification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
