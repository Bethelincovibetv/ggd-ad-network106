import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Clock, AlertTriangle, Minus, Maximize2, X } from 'lucide-react';

interface Props {
  expiresAt: string | null;
  currentTier: number;
  onRenew: () => void;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

const PremiumRenewalBanner: React.FC<Props> = ({ expiresAt, currentTier, onRenew, onUpgrade, onDismiss }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!expiresAt || isDismissed) return null;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const msLeft = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  // Only show in the renewal window: <=7 days remaining or already expired
  if (daysLeft > 7) return null;

  const expired = msLeft <= 0;
  const tierLabel = currentTier === 0 ? 'Free Premium' : `Tier ${currentTier}`;
  const dateText = expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (isMinimized) {
    return (
      <div className={`mb-4 rounded-xl border p-2.5 shadow-sm transition-all flex items-center justify-between gap-3 ${
        expired ? 'border-red-400/80 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200' : 'border-amber-400/80 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${expired ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
            {expired ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <span className="text-xs font-bold truncate">
            {expired ? `${tierLabel} Expired` : `${tierLabel} Renewal (${daysLeft}d left)`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={onRenew}
            className="h-7 text-[11px] font-bold px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          >
            <Crown className="h-3 w-3 mr-1" />
            Renew
          </Button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Expand Banner"
            aria-label="Expand banner"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <Card className={`mb-4 border-2 relative overflow-hidden transition-all ${
      expired ? 'border-red-400 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20' : 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20'
    }`}>
      <CardContent className="p-4">
        {/* Top Right Action Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Minimize banner (-)"
            aria-label="Minimize banner"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Dismiss banner"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-start gap-3 pr-16">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${expired ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
            {expired ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-foreground">
              {expired ? `${tierLabel} has expired` : `${tierLabel} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {expired ? 'Renew now to restore premium benefits.' : `Renewal date: ${dateText}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                onClick={onRenew}
                className="h-9 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow"
              >
                <Crown className="h-3.5 w-3.5 mr-1" />
                Renew {tierLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onUpgrade}
                className="h-9 text-xs font-bold"
              >
                Change Plan
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumRenewalBanner;