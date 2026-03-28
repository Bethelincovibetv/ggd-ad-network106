
import React from 'react';
import { EbookStep } from '@/types/ebook';

interface EbookProgressIndicatorProps {
  currentStep: EbookStep;
}

const EbookProgressIndicator = ({ currentStep }: EbookProgressIndicatorProps) => {
  const steps: EbookStep[] = ['form', 'images', 'preview', 'export'];

  return (
    <div className="flex justify-center mt-6">
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === step 
                ? 'bg-purple-600 text-white' 
                : index < steps.indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1}
            </div>
            {index < 3 && (
              <div className={`w-12 h-0.5 ${
                index < steps.indexOf(currentStep)
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EbookProgressIndicator;
