import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Code2,
  UserCheck,
  AlertTriangle,
  Building2,
  User,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  VerificationSubmissionRecord,
  AdminOverridePayload,
  VerificationStatus,
  DocumentType,
  VerificationEvaluationResult
} from "@/types/verification";
import {
  getAllVerificationRecords,
  processAdminVerificationOverride,
  evaluateVerificationSubmission
} from "@/services/businessVerificationEngine";
import { BusinessVerificationBadge } from "@/components/business/BusinessVerificationBadge";

export const AdminVerificationManager: React.FC = () => {
  const [submissions, setSubmissions] = useState<VerificationSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');

  // Selected Submission for Manual Review Modal
  const [selectedSubmission, setSelectedSubmission] = useState<VerificationSubmissionRecord | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Sandbox Simulator State
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sbAccountType, setSbAccountType] = useState<'individual' | 'registered_business'>('registered_business');
  const [sbDocType, setSbDocType] = useState<DocumentType>('CAC');
  const [sbDocNumber, setSbDocNumber] = useState('RC-8492019');
  const [sbSubmittedName, setSbSubmittedName] = useState('NexTech Systems Nigeria Limited');
  const [sbRegisteredName, setSbRegisteredName] = useState('NexTech Systems Nigeria');
  const [sbResult, setSbResult] = useState<VerificationEvaluationResult | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const records = await getAllVerificationRecords();
      setSubmissions(records);
    } catch (err) {
      console.error('Error fetching verification submissions:', err);
      toast.error('Failed to load verification submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleOpenReview = (submission: VerificationSubmissionRecord) => {
    setSelectedSubmission(submission);
    setAdminNote(submission.admin_note || '');
    setReviewModalOpen(true);
  };

  const handleExecuteAdminOverride = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedSubmission) return;

    setProcessingAction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const overridePayload: AdminOverridePayload = {
        admin_action: action,
        admin_note: adminNote.trim() || (action === 'APPROVE' ? 'Approved by Administrator override.' : 'Rejected by Administrator.'),
        admin_id: user?.id,
        admin_email: user?.email || undefined
      };

      const updated = await processAdminVerificationOverride(selectedSubmission.id, overridePayload);

      toast.success(`Verification status successfully updated to ${action === 'APPROVE' ? 'VERIFIED' : 'REJECTED'}`);
      setReviewModalOpen(false);
      setSelectedSubmission(null);
      await fetchRecords();
    } catch (err: any) {
      toast.error('Failed to execute admin override: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessingAction(false);
    }
  };

  // Run Sandbox Engine Simulation
  const handleRunSandbox = () => {
    const res = evaluateVerificationSubmission({
      accountType: sbAccountType,
      documentType: sbDocType,
      documentNumber: sbDocNumber,
      submittedName: sbSubmittedName,
      registeredProfileName: sbRegisteredName
    });
    setSbResult(res);
  };

  // Filtered List
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = !searchQuery ||
      sub.submitted_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.registered_profile_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.document_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return sub.status === statusFilter;
  });

  const flaggedCount = submissions.filter(s => s.status === 'FLAGGED_FOR_MANUAL_REVIEW').length;
  const verifiedCount = submissions.filter(s => s.status === 'VERIFIED').length;
  const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header & Simulator CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white grid place-items-center shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            Automated Business Verification Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time pattern matching, identity verification status control, and manual review overrides.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleRunSandbox();
              setSandboxOpen(true);
            }}
            className="h-9 text-xs font-bold rounded-xl border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Engine Simulator
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={loading}
            className="h-9 text-xs font-bold rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer transition-all shadow-sm ${statusFilter === 'ALL' ? 'ring-2 ring-foreground/20' : ''}`}
        >
          <CardContent className="p-4">
            <span className="text-xs font-bold text-muted-foreground">Total Submissions</span>
            <p className="text-2xl font-black text-foreground mt-1">{submissions.length}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('FLAGGED_FOR_MANUAL_REVIEW')}
          className={`cursor-pointer transition-all shadow-sm border-amber-500/30 bg-amber-500/5 ${statusFilter === 'FLAGGED_FOR_MANUAL_REVIEW' ? 'ring-2 ring-amber-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Flagged For Review</span>
              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
            </div>
            <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">{flaggedCount}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('VERIFIED')}
          className={`cursor-pointer transition-all shadow-sm border-emerald-500/30 bg-emerald-500/5 ${statusFilter === 'VERIFIED' ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Verified Badges</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{verifiedCount}</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setStatusFilter('REJECTED')}
          className={`cursor-pointer transition-all shadow-sm border-rose-500/30 bg-rose-500/5 ${statusFilter === 'REJECTED' ? 'ring-2 ring-rose-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Rejected</span>
              <ShieldAlert className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, legal name, NIN/CAC number, or user email..."
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'FLAGGED_FOR_MANUAL_REVIEW', 'VERIFIED', 'REJECTED'] as const).map(tab => (
              <Button
                key={tab}
                size="sm"
                variant={statusFilter === tab ? 'default' : 'outline'}
                onClick={() => setStatusFilter(tab)}
                className={`h-9 text-xs font-bold rounded-xl whitespace-nowrap ${
                  statusFilter === tab ? 'bg-primary text-primary-foreground' : ''
                }`}
              >
                {tab === 'ALL' ? 'All' :
                 tab === 'FLAGGED_FOR_MANUAL_REVIEW' ? `Flagged (${flaggedCount})` :
                 tab === 'VERIFIED' ? `Verified (${verifiedCount})` : `Rejected (${rejectedCount})`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table / Card List */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <CardTitle className="text-sm font-black flex items-center justify-between">
            <span>Identity Submissions & Verifications ({filteredSubmissions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold">Loading verification records...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs space-y-1">
              <p className="font-bold text-foreground">No verification submissions found</p>
              <p>Submissions will appear here when merchants submit their NIN or CAC details.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 sm:p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-foreground">
                        {sub.submitted_name}
                      </span>
                      <BusinessVerificationBadge status={sub.status} isVerified={sub.verified_badge_granted} size="sm" />
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {sub.document_type}: {sub.document_number}
                      </Badge>
                      <Badge className={`text-[10px] font-bold ${
                        sub.match_confidence === 'HIGH' ? 'bg-emerald-600 text-white' :
                        sub.match_confidence === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        Confidence: {sub.match_confidence}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground/80">Registered Profile:</span> {sub.registered_profile_name}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground/80">User Email:</span> {sub.user_email || sub.user_id}
                      </div>
                    </div>

                    {sub.rejection_reason && (
                      <p className="text-xs text-rose-600 font-medium">
                        {sub.rejection_reason}
                      </p>
                    )}

                    {sub.admin_note && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                        Note: {sub.admin_note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReview(sub)}
                      className="h-9 px-3.5 text-xs font-bold rounded-xl gap-1.5"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                      Review & Override
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Review & Admin Override Modal */}
      {selectedSubmission && (
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Review Verification Submission
                </DialogTitle>
                <BusinessVerificationBadge 
                  status={selectedSubmission.status} 
                  isVerified={selectedSubmission.verified_badge_granted} 
                  size="sm" 
                />
              </div>
              <DialogDescription className="text-xs">
                Inspect automated engine output and execute authorized administrator overrides.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Comparison Details Grid */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Submitted Document Name</span>
                  <p className="text-sm font-black text-foreground mt-0.5">{selectedSubmission.submitted_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Registered Profile Name</span>
                  <p className="text-sm font-black text-foreground mt-0.5">{selectedSubmission.registered_profile_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Document Type & Number</span>
                  <p className="font-mono font-bold text-foreground mt-0.5">{selectedSubmission.document_type}: {selectedSubmission.document_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Match Confidence</span>
                  <Badge className={`mt-0.5 text-[10px] font-bold ${
                    selectedSubmission.match_confidence === 'HIGH' ? 'bg-emerald-600 text-white' :
                    selectedSubmission.match_confidence === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {selectedSubmission.match_confidence}
                  </Badge>
                </div>
              </div>

              {selectedSubmission.document_file_url && (
                <div className="p-3 rounded-xl border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Uploaded Document Proof Available
                  </div>
                  <a
                    href={selectedSubmission.document_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    View File <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Exact Clean JSON Output Display */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1">
                  Engine Evaluation Payload (Clean JSON Output)
                </Label>
                <pre className="p-3 bg-muted rounded-2xl text-[11px] font-mono overflow-x-auto text-foreground border border-border">
                  {JSON.stringify({
                    status: selectedSubmission.status,
                    verified_badge_granted: selectedSubmission.verified_badge_granted,
                    match_confidence: selectedSubmission.match_confidence,
                    extraction_details: selectedSubmission.extraction_details || {
                      submitted_name: selectedSubmission.submitted_name,
                      registered_profile_name: selectedSubmission.registered_profile_name,
                      document_type: selectedSubmission.document_type,
                      document_number: selectedSubmission.document_number,
                    },
                    rejection_reason: selectedSubmission.rejection_reason
                  }, null, 2)}
                </pre>
              </div>

              {/* Admin Note Input */}
              <div>
                <Label className="text-xs font-bold text-foreground block mb-1">
                  Admin Note / Reason for Override
                </Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Identity verified via CAC public records search and authentic director document."
                  rows={2}
                  className="text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4 gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                onClick={() => handleExecuteAdminOverride('REJECT')}
                disabled={processingAction}
                className="h-10 text-xs font-bold rounded-xl"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Force REJECT
              </Button>

              <Button
                type="button"
                onClick={() => handleExecuteAdminOverride('APPROVE')}
                disabled={processingAction}
                className="h-10 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Force APPROVE & Grant Badge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Interactive Engine Sandbox Modal */}
      <Dialog open={sandboxOpen} onOpenChange={setSandboxOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Engine Pattern Matching Sandbox
            </DialogTitle>
            <DialogDescription className="text-xs">
              Test NIN/CAC formatting and name comparison algorithms with immediate JSON response generation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold mb-1 block">Account Category</Label>
                <select
                  value={sbAccountType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSbAccountType(val);
                    setSbDocType(val === 'individual' ? 'NIN' : 'CAC');
                  }}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-input bg-background font-medium"
                >
                  <option value="registered_business">Registered Business (CAC)</option>
                  <option value="individual">Individual (NIN)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold mb-1 block">Document Number</Label>
                <Input
                  value={sbDocNumber}
                  onChange={(e) => setSbDocNumber(e.target.value)}
                  placeholder={sbDocType === 'NIN' ? '11-digit NIN' : 'RC-1234567'}
                  className="h-10 text-xs font-mono rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1 block">Submitted Name</Label>
              <Input
                value={sbSubmittedName}
                onChange={(e) => setSbSubmittedName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs font-bold mb-1 block">Registered Profile Name</Label>
              <Input
                value={sbRegisteredName}
                onChange={(e) => setSbRegisteredName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <Button
              type="button"
              onClick={handleRunSandbox}
              className="w-full h-10 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl"
            >
              Evaluate Payload
            </Button>

            {sbResult && (
              <div className="pt-2">
                <Label className="text-xs font-bold block mb-1">Generated Output (Clean JSON):</Label>
                <pre className="p-3 bg-muted rounded-2xl text-[11px] font-mono overflow-x-auto text-foreground border border-border">
                  {JSON.stringify(sbResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
