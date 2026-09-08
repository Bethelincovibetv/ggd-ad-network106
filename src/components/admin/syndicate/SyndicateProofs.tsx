import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  Eye, 
  ExternalLink, 
  Check, 
  X, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  Layers,
  FileCheck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reviewSyndicateAssignment } from "@/services/syndicateTaskService";

interface SyndicateProofsProps {
  assignments: any[];
  campaigns: any[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRefresh: () => void;
}

export const SyndicateProofs: React.FC<SyndicateProofsProps> = ({
  assignments,
  campaigns,
  selectedDate,
  onSelectDate,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchApproving, setBatchApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const handleReview = async (assignmentId: string, approve: boolean, reason?: string) => {
    setActionLoadingId(assignmentId);
    try {
      const res = await reviewSyndicateAssignment({
        assignmentId,
        approve,
        rejectionReason: reason || null,
      });

      if (!res.success) {
        throw new Error(res.error || "Review failed");
      }

      toast.success(approve ? "Proof approved successfully!" : "Proof rejected and member notified");
      setShowRejectModal(null);
      setRejectReason('');
      onRefresh();
    } catch (err: any) {
      toast.error("Review action error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBatchApprovePending = async () => {
    const pendingList = filteredProofs.filter(p => p.status === 'submitted' || p.status === 'pending');
    if (pendingList.length === 0) {
      toast.info("No pending proofs to approve!");
      return;
    }

    setBatchApproving(true);
    try {
      let approvedCount = 0;
      for (const p of pendingList) {
        const res = await reviewSyndicateAssignment({
          assignmentId: p.id,
          approve: true,
        });
        if (res.success) approvedCount++;
      }

      toast.success(`Successfully batch-approved ${approvedCount} proofs!`);
      onRefresh();
    } catch (err: any) {
      toast.error("Batch review error: " + err.message);
    } finally {
      setBatchApproving(false);
    }
  };

  // Hash collision detector for fraudulent duplicates
  const hashCounts: { [hash: string]: number } = {};
  assignments.forEach(a => {
    if (a.image_hash) {
      hashCounts[a.image_hash] = (hashCounts[a.image_hash] || 0) + 1;
    }
  });

  const filteredProofs = assignments.filter(a => {
    if (statusFilter === 'pending' && a.status !== 'submitted' && a.status !== 'pending') return false;
    if (statusFilter === 'approved' && a.status !== 'approved' && a.status !== 'paid') return false;
    if (statusFilter === 'rejected' && a.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (a.syndicate_tasks?.title || '').toLowerCase();
      const name = (a.profiles?.display_name || a.profiles?.email || '').toLowerCase();
      if (!title.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control & Date Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-foreground">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border">
            <Button
              size="sm"
              variant={statusFilter === 'pending' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('pending')}
              className={`h-8 text-xs font-bold rounded-lg ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : ''}`}
            >
              Pending Audit
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'approved' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('approved')}
              className={`h-8 text-xs font-bold rounded-lg ${statusFilter === 'approved' ? 'bg-emerald-600 text-white' : ''}`}
            >
              Approved
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'rejected' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('rejected')}
              className={`h-8 text-xs font-bold rounded-lg ${statusFilter === 'rejected' ? 'bg-red-600 text-white' : ''}`}
            >
              Rejected
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('all')}
              className={`h-8 text-xs font-bold rounded-lg ${statusFilter === 'all' ? 'bg-background text-foreground shadow-xs' : ''}`}
            >
              All Proofs
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusFilter === 'pending' && filteredProofs.length > 0 && (
            <Button
              type="button"
              onClick={handleBatchApprovePending}
              disabled={batchApproving}
              className="h-10 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
            >
              {batchApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve All Pending ({filteredProofs.length})
            </Button>
          )}
        </div>
      </div>

      {/* Proofs Grid / Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProofs.map((item) => {
          const task = item.syndicate_tasks || {};
          const isPending = item.status === 'submitted' || item.status === 'pending';
          const isApproved = item.status === 'approved' || item.status === 'paid';
          const isRejected = item.status === 'rejected';
          const isDuplicateHash = item.image_hash && (hashCounts[item.image_hash] || 0) > 1;

          return (
            <Card key={item.id} className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between">
              <div>
                {/* Proof Media Preview */}
                <div className="relative h-48 bg-slate-950 flex items-center justify-center overflow-hidden group">
                  {item.proof_url ? (
                    item.proof_url.endsWith('.mp4') || item.proof_url.endsWith('.webm') ? (
                      <video src={item.proof_url} controls className="h-full w-full object-contain" />
                    ) : (
                      <img 
                        src={item.proof_url} 
                        alt="Proof" 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setSelectedProof(item)}
                      />
                    )
                  ) : (
                    <div className="text-center p-4 text-slate-500 text-xs">No media file uploaded</div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {isPending && <Badge className="bg-amber-500 text-white font-bold text-[10px]">Awaiting Audit</Badge>}
                    {isApproved && <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Approved</Badge>}
                    {isRejected && <Badge className="bg-red-600 text-white font-bold text-[10px]">Rejected</Badge>}
                  </div>

                  {/* Duplicate Hash Warning */}
                  {isDuplicateHash && (
                    <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                      <AlertTriangle className="h-3 w-3" /> Duplicate Hash
                    </div>
                  )}
                </div>

                {/* Proof Metadata */}
                <CardContent className="p-4 space-y-2.5">
                  <div>
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{task.title || 'Direct Campaign'}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Operator: <span className="font-bold text-foreground">{item.profiles?.display_name || item.profiles?.email || 'Member'}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                    <span>Submitted: {new Date(item.submitted_at || item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedProof(item)}
                      className="text-purple-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" /> Inspect Zoom
                    </button>
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-muted/40 border-t border-border flex items-center gap-2">
                {isPending ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleReview(item.id, true)}
                      disabled={actionLoadingId === item.id}
                      className="flex-1 h-9 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-1.5"
                    >
                      {actionLoadingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approve Proof
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setShowRejectModal(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="h-9 px-3 text-xs font-bold rounded-xl flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                ) : (
                  <div className="w-full text-center text-xs font-bold text-muted-foreground">
                    Reviewed on {new Date(item.reviewed_at || item.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredProofs.length === 0 && (
        <div className="text-center py-16 px-4 space-y-2 border border-dashed border-border rounded-2xl bg-card">
          <FileCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-bold text-foreground">No proofs found in this queue</p>
          <p className="text-xs text-muted-foreground">All proofs for {selectedDate} have been audited or none exist yet.</p>
        </div>
      )}

      {/* FULL-SIZE ZOOM MODAL */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-background rounded-3xl overflow-hidden border border-border shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-foreground">{selectedProof.syndicate_tasks?.title}</h4>
                <p className="text-xs text-muted-foreground">Operator: {selectedProof.profiles?.display_name || selectedProof.profiles?.email}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setSelectedProof(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 max-h-[75vh] flex items-center justify-center overflow-auto bg-slate-950">
              {selectedProof.proof_url?.endsWith('.mp4') ? (
                <video src={selectedProof.proof_url} controls autoPlay className="max-h-[70vh] rounded-xl" />
              ) : (
                <img src={selectedProof.proof_url} alt="Proof Full" className="max-h-[70vh] object-contain rounded-xl" />
              )}
            </div>

            <div className="p-4 bg-muted flex items-center justify-between">
              <a 
                href={selectedProof.proof_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1.5"
              >
                Open Original in New Tab <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedProof(null)} className="h-9 text-xs rounded-xl">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-background border border-border shadow-2xl rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-sm text-foreground">Specify Rejection Reason</h4>
            <textarea
              rows={3}
              placeholder="e.g. Screenshot does not show correct time, or flyer is cropped..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRejectModal(null)} className="h-9 text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReview(showRejectModal, false, rejectReason)}
                className="h-9 text-xs font-bold rounded-xl"
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
