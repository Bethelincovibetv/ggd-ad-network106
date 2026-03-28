
import React, { useState } from 'react';
import SalesFunnelForm from './SalesFunnelForm';
import FunnelPreview from './FunnelPreview';

const SalesFunnelGenerator = () => {
  const [generatedFunnel, setGeneratedFunnel] = useState<string>('');

  const handleFunnelGenerated = (funnel: string) => {
    setGeneratedFunnel(funnel);
  };

  return (
    <div className="space-y-6">
      <SalesFunnelForm onFunnelGenerated={handleFunnelGenerated} />
      <FunnelPreview generatedFunnel={generatedFunnel} />
    </div>
  );
};

export default SalesFunnelGenerator;
