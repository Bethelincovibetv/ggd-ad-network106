
import React from 'react';
import { CardHeader, CardTitle } from "@/components/ui/card";

const FormHeader = () => {
  return (
    <CardHeader className="text-center pb-6">
      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        🚀 Sales Funnel Generator
      </CardTitle>
    </CardHeader>
  );
};

export default FormHeader;
