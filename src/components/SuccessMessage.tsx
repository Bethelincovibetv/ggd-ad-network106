
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const SuccessMessage = () => {
  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-green-700 mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-bold text-lg">Congratulations!</span>
          </div>
          <p className="text-green-600">
            Your blog has been successfully generated and is ready to rank on Google!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuccessMessage;
