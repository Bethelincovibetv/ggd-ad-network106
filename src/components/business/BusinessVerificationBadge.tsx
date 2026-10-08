import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck, Clock, AlertCircle, ShieldAlert } from "lucide-react";
import { VerificationStatus } from "@/types/verification";

interface BusinessVerificationBadgeProps {
  status?: VerificationStatus | string | null;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BusinessVerificationBadge: React.FC<BusinessVerificationBadgeProps> = ({
  status,
  isVerified,
  size = 'md',
  showText = true,
  className = '',
  onClick
}) => {
  const effectiveStatus: VerificationStatus = 
    isVerified ? 'VERIFIED' : 
    (status as VerificationStatus) || 'PENDING';

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  if (effectiveStatus === 'VERIFIED') {
    return (
      <Badge
        onClick={onClick}
        className={`bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-sm transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''} ${sizeClasses[size]} ${className}`}
      >
        <ShieldCheck className={`${iconSizes[size]} text-white shrink-0 fill-white/20`} />
        {showText && <span>Verified Business</span>}
      </Badge>
    );
  }

  if (effectiveStatus === 'FLAGGED_FOR_MANUAL_REVIEW') {
    return (
      <Badge
        onClick={onClick}
        variant="outline"
        className={`border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold transition-all ${onClick ? 'cursor-pointer hover:bg-amber-100' : ''} ${sizeClasses[size]} ${className}`}
      >
        <Clock className={`${iconSizes[size]} text-amber-600 animate-pulse shrink-0`} />
        {showText && <span>Under Admin Review</span>}
      </Badge>
    );
  }

  if (effectiveStatus === 'REJECTED') {
    return (
      <Badge
        onClick={onClick}
        variant="outline"
        className={`border-rose-500/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold transition-all ${onClick ? 'cursor-pointer hover:bg-rose-100' : ''} ${sizeClasses[size]} ${className}`}
      >
        <ShieldAlert className={`${iconSizes[size]} text-rose-600 shrink-0`} />
        {showText && <span>Verification Required</span>}
      </Badge>
    );
  }

  return (
    <Badge
      onClick={onClick}
      variant="outline"
      className={`border-border bg-muted/50 text-muted-foreground font-semibold transition-all ${onClick ? 'cursor-pointer hover:bg-muted' : ''} ${sizeClasses[size]} ${className}`}
    >
      <AlertCircle className={`${iconSizes[size]} text-muted-foreground shrink-0`} />
      {showText && <span>Unverified</span>}
    </Badge>
  );
};
