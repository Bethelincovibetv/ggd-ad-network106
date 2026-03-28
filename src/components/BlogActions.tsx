
import React from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";

interface BlogActionsProps {
  onCopyBlog: () => void;
  onDownloadBlog: () => void;
  onGenerateAnother: () => void;
}

const BlogActions = ({ onCopyBlog, onDownloadBlog, onGenerateAnother }: BlogActionsProps) => {
  return (
    <div className="flex gap-4 justify-center">
      <Button
        onClick={onCopyBlog}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Copy className="mr-2 h-4 w-4" />
        Copy Blog
      </Button>
      <Button
        onClick={onDownloadBlog}
        variant="outline"
        className="border-blue-600 text-blue-600 hover:bg-blue-50"
      >
        <Download className="mr-2 h-4 w-4" />
        Download Blog
      </Button>
      <Button
        onClick={onGenerateAnother}
        variant="ghost"
      >
        Generate Another
      </Button>
    </div>
  );
};

export default BlogActions;
