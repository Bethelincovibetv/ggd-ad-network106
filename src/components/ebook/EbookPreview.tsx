
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, User, FileText } from "lucide-react";

interface EbookPreviewProps {
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
  onProceed: () => void;
}

const EbookPreview = ({ ebookData, onBack, onProceed }: EbookPreviewProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Preview Your Ebook</h3>
        <p className="text-gray-600">Review your ebook before final formatting and export</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cover Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Cover Design
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-lg text-white min-h-[300px] flex flex-col justify-between">
                {ebookData.coverImage && (
                  <img 
                    src={ebookData.coverImage} 
                    alt="Cover" 
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  />
                )}
                <div className="relative z-10 bg-black bg-opacity-50 p-4 rounded">
                  <h3 className="text-xl font-bold mb-2">{ebookData.topic}</h3>
                  <p className="text-sm">by {ebookData.authorName}</p>
                  <div className="mt-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                    {ebookData.category}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Author Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Author Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ebookData.authorImage && (
                <div className="flex justify-center">
                  <img 
                    src={ebookData.authorImage} 
                    alt="Author" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-100"
                  />
                </div>
              )}
              <div className="text-center">
                <h4 className="font-semibold text-lg">{ebookData.authorName}</h4>
                <p className="text-gray-600">Author</p>
              </div>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Category:</span> {ebookData.category}</div>
                <div><span className="font-medium">Tone:</span> {ebookData.tone}</div>
                <div><span className="font-medium">Pages:</span> {ebookData.pages}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Sample
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                <div className="prose prose-sm">
                  {ebookData.generatedContent.split('\n').slice(0, 10).map((line, index) => (
                    <p key={index} className="text-xs mb-2">{line}</p>
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Preview shows first few lines. Full content will be included in export.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Images Preview */}
      {ebookData.pageImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Page Images ({ebookData.pageImages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
              {ebookData.pageImages.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image} 
                    alt={`Page ${index + 1}`} 
                    className="w-full h-16 object-cover rounded border"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-xs px-1 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back to Images
        </Button>
        <Button onClick={onProceed} className="flex-1 bg-purple-600 hover:bg-purple-700">
          Proceed to Export
        </Button>
      </div>
    </div>
  );
};

export default EbookPreview;
