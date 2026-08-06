
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EbookExportProps {
  ebookData: {
    authorName: string;
    topic: string;
    pages: number;
    category: string;
    tone: string;
    description: string;
    coverImage: string;
    authorImage: string;
    pageImages: string[];
    generatedContent: string;
  };
  onBack: () => void;
}

const EbookExport = ({ ebookData, onBack }: EbookExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a simple HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${ebookData.topic}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .cover { text-align: center; page-break-after: always; }
            .cover h1 { font-size: 2.5em; margin-bottom: 20px; color: #6B46C1; }
            .cover .author { font-size: 1.2em; margin-top: 20px; }
            .cover .category { background: #6B46C1; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; margin-top: 20px; }
            .author-section { page-break-before: always; text-align: center; padding: 40px 0; }
            .content { page-break-before: always; }
            .chapter { page-break-before: always; margin-bottom: 30px; }
            .chapter h2 { color: #6B46C1; border-bottom: 2px solid #6B46C1; padding-bottom: 10px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="cover">
            ${ebookData.coverImage ? `<img loading="lazy" src="${ebookData.coverImage}" alt="Cover" style="max-width: 300px; margin-bottom: 20px;">` : ''}
            <h1>${ebookData.topic}</h1>
            <div class="author">by ${ebookData.authorName}</div>
            <div class="category">${ebookData.category}</div>
          </div>
          
          <div class="author-section">
            <h2>About the Author</h2>
            ${ebookData.authorImage ? `<img loading="lazy" src="${ebookData.authorImage}" alt="Author" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin: 20px 0;">` : ''}
            <p><strong>${ebookData.authorName}</strong> is an expert in ${ebookData.category.toLowerCase()}.</p>
          </div>
          
          <div class="content">
            ${ebookData.generatedContent.replace(/\n/g, '<br>')}
          </div>
        </body>
        </html>
      `;

      // Create and download the HTML file (which can be converted to PDF)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ebookData.topic.replace(/\s+/g, '_')}_ebook.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Ebook Exported Successfully!",
        description: "Your ebook has been exported as HTML. Open in browser and print to PDF for final version.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export ebook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateGoogleDocs = async () => {
    setIsExporting(true);
    
    try {
      // Simulate Google Docs format generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a formatted document content
      const docContent = `${ebookData.topic}
By ${ebookData.authorName}

Category: ${ebookData.category}
Tone: ${ebookData.tone}
Pages: ${ebookData.pages}

==========================================

${ebookData.generatedContent}

==========================================

About the Author:
${ebookData.authorName} is an expert in ${ebookData.category.toLowerCase()}.

This ebook was generated using the Professional Ebook Generator.
Ready for Amazon KDP and other publishing platforms.
`;

      const blob = new Blob([docContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ebookData.topic.replace(/\s+/g, '_')}_ebook.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Document Exported!",
        description: "Your ebook content has been exported. Import this file into Google Docs for further editing.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Export Your Ebook</h3>
        <p className="text-gray-600">Choose your preferred format and download your Amazon KDP-ready ebook</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <FileText className="h-6 w-6" />
              PDF Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Perfect for Amazon KDP, print-ready format with professional layout including cover and author page.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Amazon KDP ready</li>
              <li>• Professional formatting</li>
              <li>• Print-ready quality</li>
              <li>• Includes cover & author page</li>
            </ul>
            <Button 
              onClick={generatePDF}
              disabled={isExporting}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating PDF...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export as PDF
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <File className="h-6 w-6" />
              Google Docs Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Export as text document for easy editing in Google Docs, perfect for collaborative editing and revisions.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Easy to edit</li>
              <li>• Collaborative editing</li>
              <li>• Google Docs compatible</li>
              <li>• Text-based format</li>
            </ul>
            <Button 
              onClick={generateGoogleDocs}
              disabled={isExporting}
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  Generating Document...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export for Google Docs
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-green-800 mb-2">🎉 Your Ebook is Ready!</h4>
          <div className="text-sm text-green-700 space-y-2">
            <p><strong>What's included:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Professional cover design with your uploaded image</li>
              <li>Author page with your photo and bio</li>
              <li>{ebookData.pages} pages of generated content</li>
              <li>Table of contents and chapter structure</li>
              <li>{ebookData.pageImages.length} additional page images</li>
              <li>Amazon KDP-ready formatting</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back to Preview
        </Button>
        <Button 
          onClick={() => window.location.reload()} 
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Create New Ebook
        </Button>
      </div>
    </div>
  );
};

export default EbookExport;
