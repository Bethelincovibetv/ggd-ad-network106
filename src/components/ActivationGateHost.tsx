import React, { useState, useEffect } from 'react';
import ActivationModal from '@/components/ActivationModal';
import {
  OPEN_ACTIVATION_EVENT,
  useActivationStatus,
} from '@/hooks/useActivationStatus';

const ActivationGateHost: React.FC = () => {
  const { feeAmount, bonusCredits, refresh } = useActivationStatus();
  const [open, setOpen] = useState(false);
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const custom = event as CustomEvent<{ actionLabel?: string | null }>;
      setActionLabel(custom.detail?.actionLabel || null);
      refresh();
      setOpen(true);
    };

    window.addEventListener(OPEN_ACTIVATION_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_ACTIVATION_EVENT, handleOpen);
    };
  }, [refresh]);

  return (
    <ActivationModal
      open={open}
      onOpenChange={setOpen}
      actionLabel={actionLabel}
      feeAmount={feeAmount}
      bonusCredits={bonusCredits}
      onActivated={() => {
        refresh();
      }}
    />
  );
};

export default ActivationGateHost;
