
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface GenerateButtonProps {
  isGenerating: boolean;
  onClick: () => void;
}

const GenerateButton = ({ isGenerating, onClick }: GenerateButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isGenerating}
      className="w-full h-12 text-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Generating Enhanced Sales Funnel...
        </>
      ) : (
        <>
          🚀 Generate Enhanced Sales Funnel
        </>
      )}
    </Button>
  );
};

export default GenerateButton;
