import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Users, 
  FileCheck, 
  ExternalLink, 
  Check, 
  X, 
  Loader2,
  Video,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reviewSyndicateAssignment } from "@/services/syndicateTaskService";
import { notifyMemberOfStatusUpdate } from "@/services/adminNotificationHelper";

interface SyndicatePendingApprovalsProps {
  assignments: any[];
  bankRequests: any[];
  applications: any[];
  onRefresh: () => void;
}

const isVideoProof = (url?: string | null) => {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/videos/') || url.includes('video');
};

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

export const SyndicatePendingApprovals: React.FC<SyndicatePendingApprovalsProps> = ({
  assignments,
  bankRequests,
  applications,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'proofs' | 'bank' | 'applications'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pending lists
  const pendingProofs = assignments.filter(a => a.status === 'submitted' || a.status === 'pending');
  const pendingBanks = bankRequests.filter(b => b.status === 'pending');
  const pendingApps = applications.filter(a => a.status === 'pending');

  const totalPending = pendingProofs.length + pendingBanks.length + pendingApps.length;

  // 1. Review Proof
  const handleReviewProof = async (assignmentId: string, approve: boolean) => {
    setActionLoadingId(assignmentId);
    try {
      const res = await reviewSyndicateAssignment({
        assignmentId,
        approve,
        rejectionReason: approve ? null : "Proof does not meet broadcast criteria",
      });

      if (!res.success) {
        throw new Error(res.error || "Review failed");
      }

      toast.success(approve ? "Campaign proof approved successfully!" : "Campaign proof rejected");
      onRefresh();
    } catch (err: any) {
      toast.error("Proof action failed: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Review Bank Request
  const handleReviewBank = async (requestId: string, approve: boolean, userId: string, reqData: any) => {
    setActionLoadingId(requestId);
    try {
      if (approve) {
        await supabase
          .from('bank_change_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        await supabase
          .from('syndicate_profiles')
          .update({
            bank_name: reqData.requested_bank_name || reqData.bank_name,
            account_number: reqData.requested_account_number || reqData.account_number,
            account_name: reqData.requested_account_name || reqData.account_name,
            is_bank_locked: true,
            paystack_recipient_code: reqData.recipient_code || null,
          })
          .eq('user_id', userId);

        await notifyMemberOfStatusUpdate({
          userId,
          title: "✅ Bank Details Approved",
          message: `Your bank account (${reqData.requested_bank_name || reqData.bank_name || 'Bank'}) has been verified and approved.`,
          type: 'syndicate_bank',
          navTarget: 'wallet',
        });

        toast.success("Bank request approved and locked!");
      } else {
        await supabase
          .from('bank_change_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        await notifyMemberOfStatusUpdate({
          userId,
          title: "⚠️ Bank Change Rejected",
          message: "Your bank account change request could not be approved by Admin.",
          type: 'syndicate_bank',
          navTarget: 'wallet',
        });

        toast.info("Bank request rejected");
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Bank action failed: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Review Application
  const handleReviewApp = async (appId: string, approve: boolean, userId: string) => {
    setActionLoadingId(appId);
    try {
      if (approve) {
        await supabase
          .from('syndicate_applications')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', appId);

        await supabase
          .from('syndicate_profiles')
          .update({ is_active: true })
          .eq('user_id', userId);

        await supabase
          .from('profiles')
          .update({ syndicate_status: 'active' })
          .eq('user_id', userId);

        await notifyMemberOfStatusUpdate({
          userId,
          title: "🎉 Syndicate Membership Approved!",
          message: "Welcome to the Syndicate! You can now view available campaigns and participate for payouts.",
          type: 'syndicate_approval',
          navTarget: 'syndicate',
        });

        toast.success("Syndicate member approved!");
      } else {
        await supabase
          .from('syndicate_applications')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', appId);

        await notifyMemberOfStatusUpdate({
          userId,
          title: "Syndicate Application Status",
          message: "Your application to join the Syndicate was not approved at this time.",
          type: 'syndicate_approval',
        });

        toast.info("Application rejected");
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Application action failed: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-base text-foreground">Pending Approvals</h3>
            <Badge className="bg-amber-500 text-white font-bold text-xs px-2 py-0.5 ml-1">
              {totalPending} Awaiting Action
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review and approve member proofs, bank account changes, and new member applications.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({totalPending})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('proofs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'proofs' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Proofs ({pendingProofs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('bank')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'bank' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Bank Requests ({pendingBanks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('applications')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'applications' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Applications ({pendingApps.length})
          </button>
        </div>
      </div>

      {totalPending === 0 && (
        <div className="text-center py-16 px-4 space-y-2 bg-card rounded-2xl border border-dashed border-border">
          <CheckCircle className="h-10 w-10 mx-auto text-emerald-500" />
          <h4 className="text-sm font-bold text-foreground">All Clear! No Pending Approvals</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All campaign proofs, bank requests, and membership applications have been reviewed.
          </p>
        </div>
      )}

      {/* 1. Pending Proofs */}
      {(filterType === 'all' || filterType === 'proofs') && pendingProofs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-purple-600" />
            <h4 className="text-sm font-bold text-foreground">Campaign Proofs ({pendingProofs.length})</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingProofs.map((proof) => {
              const task = proof.syndicate_tasks;
              const memberName = proof.profiles?.display_name || proof.profiles?.email || 'Syndicate Member';
              const isLoading = actionLoadingId === proof.id;

              return (
                <Card key={proof.id} className="border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {proof.proof_url && (
                        <a
                          href={proof.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-16 w-20 rounded-xl overflow-hidden border border-border bg-muted flex-shrink-0 block hover:opacity-80 transition"
                        >
                          {isVideoProof(proof.proof_url) ? (
                            <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white">
                              <Video className="h-5 w-5 text-purple-400" />
                            </div>
                          ) : (
                            <img src={proof.proof_url} alt="Proof" className="h-full w-full object-cover" />
                          )}
                        </a>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-foreground">{task?.title || 'Campaign Task'}</h5>
                          <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0">Awaiting Approval</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted by <strong>{memberName}</strong> · {new Date(proof.submitted_at || proof.created_at).toLocaleString()}
                        </p>
                        {proof.proof_link && (
                          <a
                            href={proof.proof_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-purple-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            View Post Link <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => handleReviewProof(proof.id, false)}
                        className="h-9 px-3.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleReviewProof(proof.id, true)}
                        className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Approve Proof
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Pending Bank Requests */}
      {(filterType === 'all' || filterType === 'bank') && pendingBanks.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-foreground">Bank Account Requests ({pendingBanks.length})</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingBanks.map((req) => {
              const memberName = req.profiles?.display_name || req.profiles?.email || 'Member';
              const isLoading = actionLoadingId === req.id;

              return (
                <Card key={req.id} className="border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-foreground">{memberName}</h5>
                        <Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0">Bank Change</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p>
                          <strong>Requested Bank:</strong> {req.requested_bank_name || req.bank_name}
                        </p>
                        <p>
                          <strong>Account:</strong> {maskAccountNumber(req.requested_account_number || req.account_number)} · {req.requested_account_name || req.account_name}
                        </p>
                        {req.reason && <p className="italic text-[11px]">Reason: "{req.reason}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => handleReviewBank(req.id, false, req.user_id, req)}
                        className="h-9 px-3.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleReviewBank(req.id, true, req.user_id, req)}
                        className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Approve & Lock Bank
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Pending Applications */}
      {(filterType === 'all' || filterType === 'applications') && pendingApps.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-bold text-foreground">Syndicate Applications ({pendingApps.length})</h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pendingApps.map((app) => {
              const memberName = app.full_name || app.profiles?.display_name || app.profiles?.email || 'Applicant';
              const isLoading = actionLoadingId === app.id;

              return (
                <Card key={app.id} className="border border-border/80 shadow-xs bg-card rounded-2xl overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-foreground">{memberName}</h5>
                        <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0">New Applicant</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <p>
                          <strong>State:</strong> {app.state || 'Unspecified'} · <strong>Phone:</strong> {app.phone || app.profiles?.phone || '—'}
                        </p>
                        {app.social_links && (
                          <p className="text-[11px] truncate max-w-md">
                            <strong>Platforms:</strong> {JSON.stringify(app.social_links)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Applied on {new Date(app.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => handleReviewApp(app.id, false, app.user_id)}
                        className="h-9 px-3.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleReviewApp(app.id, true, app.user_id)}
                        className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Approve Member
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
