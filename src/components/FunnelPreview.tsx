
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Eye } from "lucide-react";
import { toast } from "sonner";

interface FunnelPreviewProps {
  generatedFunnel: string;
}

const FunnelPreview = ({ generatedFunnel }: FunnelPreviewProps) => {
  const copyFunnelCode = () => {
    navigator.clipboard.writeText(generatedFunnel);
    toast.success("Sales funnel HTML code copied to clipboard!");
  };

  const previewFunnel = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(generatedFunnel);
    }
  };

  if (!generatedFunnel) return null;

  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Generated Enhanced Sales Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={copyFunnelCode} className="flex-1">
            <Code className="mr-2 h-4 w-4" />
            Copy HTML Code
          </Button>
          <Button onClick={previewFunnel} variant="outline" className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            Preview Funnel
          </Button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">{generatedFunnel}</pre>
        </div>
      </CardContent>
    </Card>
  );
};

export default FunnelPreview;
