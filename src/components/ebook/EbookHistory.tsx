
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Copy, Calendar } from "lucide-react";
import { EbookData } from '@/types/ebook';

interface EbookHistoryProps {
  ebookHistory: EbookData[];
  onDeleteEbook: (id: string) => void;
  onRemixEbook: (ebook: EbookData) => void;
  onBack: () => void;
}

const EbookHistory = ({ ebookHistory, onDeleteEbook, onRemixEbook, onBack }: EbookHistoryProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-purple-800">Your Ebook History</h2>
        <Button onClick={onBack} variant="outline">
          Create New Ebook
        </Button>
      </div>

      {ebookHistory.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 text-lg">No ebooks created yet.</p>
            <p className="text-gray-400 mt-2">Start by creating your first ebook!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ebookHistory.map((ebook) => (
            <Card key={ebook.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg text-purple-700">
                      {ebook.topic}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      by {ebook.authorName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{ebook.pages} pages</span>
                      <span>{ebook.category}</span>
                      <span className="capitalize">{ebook.tone} tone</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemixEbook(ebook)}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Remix
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ebook.id && onDeleteEbook(ebook.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {ebook.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {ebook.description}
                  </p>
                )}
                {ebook.createdAt && (
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    Created {formatDate(ebook.createdAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EbookHistory;
