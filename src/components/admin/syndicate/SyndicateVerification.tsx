import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Lock, 
  Building2, 
  UserCheck, 
  UserX, 
  Search, 
  AlertTriangle, 
  Eye, 
  Check, 
  X, 
  Loader2,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyMemberOfStatusUpdate } from "@/services/adminNotificationHelper";

interface SyndicateVerificationProps {
  bankRequests: any[];
  applications: any[];
  onRefresh: () => void;
  defaultTab?: 'bank' | 'kyc';
}

const maskAccountNumber = (acc?: string | null) => {
  if (!acc) return '—';
  const clean = String(acc).trim();
  if (clean.length <= 4) return '•••• ' + clean;
  return '•••• ' + clean.slice(-4);
};

export const SyndicateVerification: React.FC<SyndicateVerificationProps> = ({
  bankRequests,
  applications,
  onRefresh,
  defaultTab = 'bank',
}) => {
  const [activeTab, setActiveTab] = useState<'bank' | 'kyc'>(defaultTab);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Bank Change Request Actions
  const handleReviewBankRequest = async (requestId: string, approve: boolean, userId: string, reqData: any) => {
    setActionLoadingId(requestId);
    try {
      if (approve) {
        // Update request status
        await supabase
          .from('syndicate_bank_change_requests')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        // Update syndicate profile and lock
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

        // Notify member of approval
        await notifyMemberOfStatusUpdate({
          userId,
          title: "✅ Bank Details Approved & Locked",
          message: `Your updated bank account (${reqData.requested_bank_name || reqData.bank_name || 'Bank'}) has been verified and locked for secure payouts.`,
          type: 'syndicate_bank',
          navTarget: 'wallet',
        });

        toast.success("Bank details approved and locked for payout security!");
      } else {
        await supabase
          .from('syndicate_bank_change_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        // Notify member of rejection
        await notifyMemberOfStatusUpdate({
          userId,
          title: "⚠️ Bank Change Request Rejected",
          message: "Your bank details change request was reviewed and could not be verified by Admin.",
          type: 'syndicate_bank',
          navTarget: 'wallet',
        });

        toast.info("Bank change request rejected");
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Action error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // KYC Application Actions
  const handleReviewApplication = async (appId: string, approve: boolean, userId: string) => {
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

        // Ensure syndicate_profile exists and is active
        await supabase
          .from('syndicate_profiles')
          .update({ is_suspended: false })
          .eq('user_id', userId);

        // Also update main user profile role

        // Notify member
        await notifyMemberOfStatusUpdate({
          userId,
          title: "🎉 Syndicate Application Approved!",
          message: "Congratulations! Your application to join the Syndicate Direct Team has been approved. You can now execute campaigns and earn daily.",
          type: 'syndicate_status',
          navTarget: 'syndicate',
        });

        toast.success("Member approved to join Syndicate Direct Team!");
      } else {
        await supabase
          .from('syndicate_applications')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', appId);

        // Notify member
        await notifyMemberOfStatusUpdate({
          userId,
          title: "❌ Syndicate Application Update",
          message: "Your application to join the Syndicate Direct Team was reviewed and could not be approved at this time.",
          type: 'syndicate_status',
          navTarget: 'syndicate',
        });

        toast.info("Application rejected");
      }
      onRefresh();
    } catch (err: any) {
      toast.error("Action error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border">
          <Button
            size="sm"
            variant={activeTab === 'bank' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('bank')}
            className={`h-9 text-xs font-bold rounded-lg ${activeTab === 'bank' ? 'bg-purple-600 text-white' : ''}`}
          >
            <Building2 className="h-4 w-4 mr-1.5" />
            Bank Change Requests ({bankRequests.filter(b => b.status === 'pending').length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'kyc' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('kyc')}
            className={`h-9 text-xs font-bold rounded-lg ${activeTab === 'kyc' ? 'bg-purple-600 text-white' : ''}`}
          >
            <UserCheck className="h-4 w-4 mr-1.5" />
            KYC Onboarding Applications ({applications.filter(a => a.status === 'pending').length})
          </Button>
        </div>
      </div>

      {/* BANK CHANGE REQUESTS VIEW */}
      {activeTab === 'bank' && (
        <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Operator Member</th>
                  <th className="py-3.5 px-4">Current Bank</th>
                  <th className="py-3.5 px-4">Requested New Bank</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bankRequests.map((req) => {
                  const isPending = req.status === 'pending';

                  return (
                    <tr key={req.id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <p>{req.profiles?.display_name || req.profiles?.email || 'Member'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{req.user_id}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-muted-foreground font-medium">{req.current_bank_name || 'None'}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{maskAccountNumber(req.current_account_number)}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-foreground">{req.requested_bank_name || req.bank_name}</p>
                        <p className="font-mono text-[11px] text-purple-600 font-bold">{req.requested_account_number || req.account_number}</p>
                        <p className="text-[10px] text-muted-foreground">{req.requested_account_name || req.account_name}</p>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] font-bold">
                            PENDING REVIEW
                          </Badge>
                        ) : req.status === 'approved' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                            APPROVED & LOCKED
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-0 text-[10px] font-bold">
                            REJECTED
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleReviewBankRequest(req.id, true, req.user_id, req)}
                              disabled={actionLoadingId === req.id}
                              className="h-8 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve & Lock
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReviewBankRequest(req.id, false, req.user_id, req)}
                              disabled={actionLoadingId === req.id}
                              className="h-8 text-[11px] font-bold rounded-lg"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Decided</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {bankRequests.length === 0 && (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No bank change requests submitted.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* KYC ONBOARDING APPLICATIONS VIEW */}
      {activeTab === 'kyc' && (
        <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Applicant</th>
                  <th className="py-3.5 px-4">State Station</th>
                  <th className="py-3.5 px-4">Channels & Handles</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {applications.map((app) => {
                  const isPending = app.status === 'pending';

                  return (
                    <tr key={app.id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-foreground text-sm">{app.profiles?.display_name || app.profiles?.email || 'Applicant'}</p>
                        <p className="text-[11px] text-muted-foreground">{app.profiles?.phone || '—'}</p>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {app.state || 'Unset'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(app.platforms || app.verified_platforms || ['whatsapp']).map((p: string) => (
                            <Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-semibold">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0 text-[10px] font-bold">
                            PENDING KYC
                          </Badge>
                        ) : app.status === 'approved' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                            APPROVED
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-700 dark:text-red-300 border-0 text-[10px] font-bold">
                            REJECTED
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleReviewApplication(app.id, true, app.user_id)}
                              disabled={actionLoadingId === app.id}
                              className="h-8 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve Applicant
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReviewApplication(app.id, false, app.user_id)}
                              disabled={actionLoadingId === app.id}
                              className="h-8 text-[11px] font-bold rounded-lg"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Decided</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {applications.length === 0 && (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No KYC applications pending review.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
