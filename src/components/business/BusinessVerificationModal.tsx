import React, { useState, useEffect, useRef } from 'react';
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
  Info,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Eye,
  Trash2,
  ExternalLink,
  HelpCircle,
  X,
  FileText,
  Lock,
  ZoomIn
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
  subscribeToUserVerification,
  validateNIN,
  validateCAC
} from "@/services/businessVerificationEngine";
import { BusinessVerificationBadge } from "./BusinessVerificationBadge";

// Generated Sample Visual Assets
import sampleCacCertImg from "@/assets/images/sample_cac_cert_1789944933734.jpg";
import sampleNinSlipImg from "@/assets/images/sample_nin_slip_1789944945843.jpg";

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
  
  // File Upload States
  const [documentFileUrl, setDocumentFileUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [uploadedFileType, setUploadedFileType] = useState<string>('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Engine & Record States
  const [evaluating, setEvaluating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [existingRecord, setExistingRecord] = useState<VerificationSubmissionRecord | null>(null);

  const [evaluationResult, setEvaluationResult] = useState<VerificationEvaluationResult | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState(false);
  
  // Sample Guide Modal & Lightbox
  const [showSampleGuide, setShowSampleGuide] = useState(false);
  const [previewLightboxImg, setPreviewLightboxImg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync profile names on modal open & subscribe in real-time
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

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

      unsubscribe = subscribeToUserVerification(userId, (rec) => {
        if (rec) {
          setExistingRecord(rec);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
        if (rec.document_file_url) {
          setDocumentFileUrl(rec.document_file_url);
          setUploadedFileName('Verified_Document');
        }
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

  // Process and upload file with dual fallback (Supabase bucket + Base64 storage)
  const processAndUploadFile = async (file: File) => {
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
      toast.error("Please upload a valid Image (JPG, PNG, WEBP) or PDF document.");
      return;
    }

    setUploadingDoc(true);
    const sizeFormatted = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    setUploadedFileName(file.name);
    setUploadedFileSize(sizeFormatted);
    setUploadedFileType(file.type.startsWith('image/') ? 'image' : 'pdf');

    try {
      let finalUrl = '';
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const path = `verification-docs/${userId}/${cleanFileName}`;

      // 1. Try Supabase Storage upload
      try {
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true });

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          if (publicUrl) {
            finalUrl = publicUrl;
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload attempt note:', storageErr);
      }

      // 2. Base64 / Data URL Fallback if storage public URL not obtained
      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      }

      setDocumentFileUrl(finalUrl);
      toast.success("Document uploaded & verified for processing! 📄");
    } catch (err: any) {
      toast.error("Upload error: " + (err?.message || "Could not process document."));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeUploadedDocument = () => {
    setDocumentFileUrl('');
    setUploadedFileName('');
    setUploadedFileSize('');
    setUploadedFileType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    toast.info("Uploaded document removed.");
  };

  // Dry-run live test evaluation
  const handleTestEvaluation = () => {
    if (!documentFileUrl) {
      toast.error(`Please upload your ${documentType === 'CAC' ? 'CAC Certificate' : 'National ID / NIN Slip'} document.`);
      return;
    }
    if (!submittedName.trim()) {
      toast.error("Please enter the legal name appearing on your document.");
      return;
    }

    setEvaluating(true);
    try {
      const evalRes = evaluateVerificationSubmission({
        accountType,
        documentType,
        documentNumber: documentNumber.trim() || (documentType === 'CAC' ? 'CAC-UPLOAD' : 'NIN-UPLOAD'),
        submittedName: submittedName.trim(),
        registeredProfileName: registeredProfileName.trim() || submittedName.trim(),
        documentFileUrl: documentFileUrl || undefined
      });

      setEvaluationResult(evalRes);

      if (evalRes.status === 'VERIFIED') {
        toast.success("Match verified! High confidence score detected. Ready to submit for instant activation.");
      } else if (evalRes.status === 'FLAGGED_FOR_MANUAL_REVIEW') {
        toast.info("Evaluation note: Minor name variation flagged for quick manual compliance review.");
      } else {
        toast.error(`Evaluation failed: ${evalRes.rejection_reason || 'Format or name mismatch.'}`);
      }
    } finally {
      setEvaluating(false);
    }
  };

  // Final submission to verification engine
  const handleSubmitVerification = async () => {
    if (!documentFileUrl) {
      toast.error(`Please upload your ${documentType === 'CAC' ? 'CAC Certificate' : 'National ID / NIN Slip'} document first.`);
      return;
    }
    if (!submittedName.trim()) {
      toast.error("Please enter the official name on your document.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      const { evaluation } = await submitVerificationToEngine({
        userId,
        businessProfileId,
        userEmail,
        accountType,
        documentType,
        documentNumber: documentNumber.trim() || (documentType === 'CAC' ? 'CAC-CERT-UPLOAD' : 'NIN-SLIP-UPLOAD'),
        submittedName: submittedName.trim(),
        registeredProfileName: registeredProfileName.trim() || submittedName.trim(),
        documentFileUrl: documentFileUrl || undefined
      });

      setEvaluationResult(evaluation);
      await fetchExistingRecord();

      if (evaluation.status === 'VERIFIED') {
        toast.success("🎉 Verification successful! Your official Verified Business Badge is now active on your storefront!");
      } else if (evaluation.status === 'FLAGGED_FOR_MANUAL_REVIEW') {
        toast.info("Submission received! Your identity document has been queued for quick compliance review.");
      } else {
        toast.error(`Verification note: ${evaluation.rejection_reason}`);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-card text-card-foreground">
          <DialogHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-md shadow-emerald-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                Business Identity Verification
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
              Verify your business with CAC or National Identity (NIN). Verified accounts receive the official green Trust Badge, higher search visibility, and increased customer confidence.
            </DialogDescription>
          </DialogHeader>

          {loadingRecord ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Retrieving verification status...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Existing Status Banner */}
              {existingRecord && (
                <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  existingRecord.status === 'VERIFIED'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                    : existingRecord.status === 'FLAGGED_FOR_MANUAL_REVIEW'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-black text-sm">
                    <span className="flex items-center gap-1.5">
                      {existingRecord.status === 'VERIFIED' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {existingRecord.status === 'FLAGGED_FOR_MANUAL_REVIEW' && <Clock className="h-4 w-4 text-amber-600 animate-pulse" />}
                      {existingRecord.status === 'REJECTED' && <ShieldAlert className="h-4 w-4 text-rose-600" />}
                      Current Status: {existingRecord.status}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase border-current">
                      Confidence: {existingRecord.match_confidence}
                    </Badge>
                  </div>
                  {existingRecord.rejection_reason && (
                    <p className="text-[11px] opacity-90">{existingRecord.rejection_reason}</p>
                  )}
                  {existingRecord.admin_note && (
                    <p className="text-[11px] font-semibold italic">Admin Note: {existingRecord.admin_note}</p>
                  )}
                  <div className="pt-1 flex items-center gap-2 text-[10px] opacity-80">
                    <span>Document: {existingRecord.document_type} ({existingRecord.document_number})</span>
                    <span>•</span>
                    <span>Submitted: {new Date(existingRecord.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Strict Badge Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-muted/40 border border-border/80 text-xs">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Verified Badge Policy:</strong> To protect buyers across Nigeria, the official Verified Badge is <span className="text-emerald-600 font-bold">never granted automatically</span> until your document numbers and identity names match our compliance criteria or pass manual review.
                </p>
              </div>

              {/* Category Selection */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1.5">
                  Choose Verification Category
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange('registered_business')}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      accountType === 'registered_business'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-border/70 hover:border-border text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${
                      accountType === 'registered_business' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black">Registered Business</p>
                      <p className="text-[10px] text-muted-foreground">CAC Certificate (RC / BN)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccountTypeChange('individual')}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      accountType === 'individual'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-border/70 hover:border-border text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${
                      accountType === 'individual' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'
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

              {/* Visual Sample Guide Callout */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white grid place-items-center shrink-0">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Where to find your {documentType === 'CAC' ? 'CAC RC/BN number' : '11-digit NIN'}?
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      View our official sample document with highlighted guide boxes.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSampleGuide(!showSampleGuide)}
                  className="h-8 text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 shrink-0 gap-1 rounded-xl cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showSampleGuide ? 'Hide Sample' : 'View Sample Guide'}
                </Button>
              </div>

              {/* Sample Document Visual Preview Box */}
              {showSampleGuide && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      Sample {documentType === 'CAC' ? 'CAC Certificate of Registration' : 'NIMC National Identification Slip'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewLightboxImg(documentType === 'CAC' ? sampleCacCertImg : sampleNinSlipImg)}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <ZoomIn className="h-3 w-3" /> Enlarge Sample
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    {/* Sample Image */}
                    <div 
                      onClick={() => setPreviewLightboxImg(documentType === 'CAC' ? sampleCacCertImg : sampleNinSlipImg)}
                      className="relative rounded-xl overflow-hidden border border-border/80 shadow-sm cursor-pointer group bg-black/5"
                    >
                      <img
                        src={documentType === 'CAC' ? sampleCacCertImg : sampleNinSlipImg}
                        alt="Sample Document"
                        referrerPolicy="no-referrer"
                        className="w-full h-44 object-cover group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <ZoomIn className="h-4 w-4" /> Tap to Zoom
                      </div>
                      <span className="absolute bottom-2 left-2 bg-neutral-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                        Official Standard Sample
                      </span>
                    </div>

                    {/* Highlights & Tips */}
                    <div className="space-y-2 text-xs">
                      {documentType === 'CAC' ? (
                        <>
                          <div className="p-2 rounded-xl bg-card border border-border/70">
                            <span className="text-[10px] font-bold text-emerald-600 block">1. RC / BN Number</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Located at top left or top right header (e.g. <strong>RC-1234567</strong> or <strong>BN-1234567</strong>).
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-card border border-border/70">
                            <span className="text-[10px] font-bold text-emerald-600 block">2. Official Business Name</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Must match your registered business title exactly.
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-card border border-border/70">
                            <span className="text-[10px] font-bold text-emerald-600 block">3. Seal & Stamp</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Clear certificate image with official CAC seal.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2 rounded-xl bg-card border border-border/70">
                            <span className="text-[10px] font-bold text-emerald-600 block">1. 11-Digit NIN Number</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Located in the central framed box of your NIMC slip (e.g. <strong>12345678901</strong>).
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-card border border-border/70">
                            <span className="text-[10px] font-bold text-emerald-600 block">2. Legal Full Name</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Enter First, Middle & Surname as written on your NIN slip.
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-card border border-border/70">
                            <span className="text-[10px] font-bold text-emerald-600 block">3. Clear Photo or Slip</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Upload digital slip, standard ID card, or clear photo.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Input Details */}
              <div className="space-y-3 pt-1">
                {/* Optional CAC Registration Number (Only for Registered Business / CAC) */}
                {documentType === 'CAC' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-bold text-foreground">
                        CAC Registration / RC Number (Optional if Document is Uploaded)
                      </Label>
                    </div>
                    <Input
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="e.g. RC-1234567 or BN-1234567"
                      className="h-10 text-xs font-mono font-semibold rounded-xl"
                    />
                    {documentNumber && !cacValidation?.valid && (
                      <p className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        {cacValidation?.reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Submitted Legal / Business Name */}
                <div>
                  <Label className="text-xs font-bold text-foreground block mb-1">
                    {documentType === 'NIN' ? 'Full Legal Name on NIN Slip' : 'Official Registered Business Name on CAC Document'}
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
                    The engine calculates name similarity between your document name and this profile name.
                  </p>
                </div>

                {/* Enhanced Document Upload Zone with Gallery / File / Camera Support */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">
                      Upload Certificate or Identity Slip (JPG, PNG, PDF)
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Max size: 10MB</span>
                  </div>

                  {/* Hidden file & camera inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingDoc}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingDoc}
                  />

                  {documentFileUrl ? (
                    /* Uploaded File Preview Card */
                    <div className="p-3.5 rounded-2xl bg-card border-2 border-emerald-500/50 shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {uploadedFileType === 'image' || documentFileUrl.startsWith('data:image') || documentFileUrl.includes('avatars') ? (
                          <div 
                            onClick={() => setPreviewLightboxImg(documentFileUrl)}
                            className="h-12 w-12 rounded-xl overflow-hidden border border-border/80 shrink-0 cursor-pointer group relative bg-black/10"
                          >
                            <img
                              src={documentFileUrl}
                              alt="Uploaded doc"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover group-hover:scale-105 transition-all"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                              <ZoomIn className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                            <FileText className="h-6 w-6" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                            {uploadedFileName || 'Verification_Document'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            {uploadedFileSize && <span>{uploadedFileSize}</span>}
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Ready for Verification
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewLightboxImg(documentFileUrl)}
                          className="h-8 text-xs font-bold px-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeUploadedDocument}
                          className="h-8 text-xs font-bold px-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Drag & Drop Upload Container */
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                        isDragOver
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-4 ring-emerald-500/20'
                          : 'border-border/80 hover:border-emerald-500/70 bg-muted/20 hover:bg-muted/40'
                      }`}
                    >
                      {uploadingDoc ? (
                        <div className="py-4 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                          <p className="text-xs font-bold text-foreground">Processing document file...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="mx-auto h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 grid place-items-center">
                            <Upload className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Drag and drop your document here, or choose an upload method
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Supports JPG, PNG, WEBP and PDF certificates
                            </p>
                          </div>

                          {/* Multi-source buttons */}
                          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-8 text-xs font-bold rounded-xl border-border bg-card hover:bg-muted gap-1.5 cursor-pointer shadow-xs"
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                              Browse Gallery / Files
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => cameraInputRef.current?.click()}
                              className="h-8 text-xs font-bold rounded-xl border-border bg-card hover:bg-muted gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Camera className="h-3.5 w-3.5 text-emerald-600" />
                              Scan with Camera
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

          <DialogFooter className="border-t border-border/80 pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEvaluation}
              disabled={evaluating || submitting || !documentNumber.trim()}
              className="h-10 text-xs font-bold rounded-xl cursor-pointer"
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
              className="h-10 text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 rounded-xl cursor-pointer"
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

      {/* Lightbox Modal for Sample Documents and Uploaded Files */}
      {previewLightboxImg && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewLightboxImg(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-card rounded-3xl p-4 shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <h3 className="text-sm font-black text-foreground flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                Document Visual Preview
              </h3>
              <button
                type="button"
                onClick={() => setPreviewLightboxImg(null)}
                className="p-1 rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-black/5">
              <img
                src={previewLightboxImg}
                alt="Document Preview"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setPreviewLightboxImg(null)}
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
