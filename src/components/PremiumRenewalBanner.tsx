import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  expiresAt: string | null;
  currentTier: number;
  onRenew: () => void;
  onUpgrade: () => void;
}

const PremiumRenewalBanner: React.FC<Props> = ({ expiresAt, currentTier, onRenew, onUpgrade }) => {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const msLeft = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  // Only show in the renewal window: <=7 days remaining or already expired
  if (daysLeft > 7) return null;

  const expired = msLeft <= 0;
  const tierLabel = currentTier === 0 ? 'Free Premium' : `Tier ${currentTier}`;
  const dateText = expiry.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Card className={`mb-4 border-2 ${expired ? 'border-red-400 bg-gradient-to-r from-red-50 to-orange-50' : 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${expired ? 'bg-red-500' : 'bg-yellow-500'}`}>
            {expired ? <AlertTriangle className="h-5 w-5 text-white" /> : <Clock className="h-5 w-5 text-white" />}
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
                className="h-9 text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow"
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