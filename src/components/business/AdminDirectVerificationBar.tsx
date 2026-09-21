import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  FileCheck,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { adminDirectVerifyUser } from '@/services/businessVerificationEngine';
import { VerificationSubmissionRecord } from '@/types/verification';

interface AdminDirectVerificationBarProps {
  userId: string;
  businessProfileId?: string;
  profileName: string;
  isVerified: boolean;
  verificationRecord: VerificationSubmissionRecord | null;
  currentUser?: any;
  onStatusChanged?: () => void;
}

export const AdminDirectVerificationBar: React.FC<AdminDirectVerificationBarProps> = ({
  userId,
  businessProfileId,
  profileName,
  isVerified,
  verificationRecord,
  currentUser,
  onStatusChanged,
}) => {
  const [loading, setLoading] = useState(false);

  const handleAdminVerifyToggle = async (verify: boolean) => {
    const actionWord = verify ? 'Grant Official Verified Badge' : 'Revoke Verification';
    if (!window.confirm(`Admin Action: Are you sure you want to ${actionWord} for "${profileName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await adminDirectVerifyUser({
        userId,
        businessProfileId,
        verify,
        profileName,
        adminId: currentUser?.id,
        adminEmail: currentUser?.email,
        adminNote: verify
          ? `Directly verified by Platform Admin (${currentUser?.email || 'admin'}) from Profile Page.`
          : `Verification revoked by Admin (${currentUser?.email || 'admin'}).`
      });

      toast({
        title: verify ? "🎉 Business Directly Verified!" : "Verification Revoked",
        description: verify
          ? `"${profileName}" is now officially accredited with a Verified Badge across the network.`
          : `Verified status removed for "${profileName}".`
      });

      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      toast({
        title: "Admin Action Failed",
        description: err?.message || "Could not complete direct verification.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-800/60 px-4 py-2.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
      {/* Left info badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black tracking-wide uppercase text-indigo-200">
              Admin Direct Verification:
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[200px]">
              {profileName}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isVerified
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isVerified ? 'VERIFIED ACTIVE' : 'UNVERIFIED / PENDING'}
            </Badge>
          </div>
          {verificationRecord?.document_type && (
            <p className="text-[10px] text-indigo-300/80">
              Submission: {verificationRecord.document_type} · Confidence: {verificationRecord.match_confidence || 'N/A'}
              {verificationRecord.admin_note && ` · Note: ${verificationRecord.admin_note}`}
            </p>
          )}
        </div>
      </div>

      {/* Right action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {!isVerified ? (
          <Button
            size="sm"
            onClick={() => handleAdminVerifyToggle(true)}
            disabled={loading}
            className="h-8 px-3.5 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md gap-1.5 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            Directly Verify Profile
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAdminVerifyToggle(false)}
            disabled={loading}
            className="h-8 px-3.5 text-xs font-bold bg-white/10 hover:bg-rose-600/30 text-rose-300 hover:text-white border-rose-500/40 rounded-xl gap-1.5 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Revoke Verified Badge
          </Button>
        )}
      </div>
    </div>
  );
};
