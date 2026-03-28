
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EbookImageUploadProps {
  onImageUpload: (imageData: { coverImage: string; authorImage: string; pageImages: string[] }) => void;
  onBack: () => void;
}

const EbookImageUpload = ({ onImageUpload, onBack }: EbookImageUploadProps) => {
  const [coverImage, setCoverImage] = useState<string>('');
  const [authorImage, setAuthorImage] = useState<string>('');
  const [pageImages, setPageImages] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageUpload = (file: File, type: 'cover' | 'author' | 'page') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      if (type === 'cover') {
        setCoverImage(result);
      } else if (type === 'author') {
        setAuthorImage(result);
      } else if (type === 'page') {
        setPageImages(prev => [...prev, result]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'author' | 'page') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      handleImageUpload(file, type);
    }
  };

  const removePageImage = (index: number) => {
    setPageImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProceed = () => {
    if (!coverImage || !authorImage) {
      toast({
        title: "Required Images Missing",
        description: "Please upload both cover image and author image to proceed.",
        variant: "destructive",
      });
      return;
    }
    
    onImageUpload({
      coverImage,
      authorImage,
      pageImages
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Add Your Ebook Images</h3>
        <p className="text-gray-600">Upload your cover image and author photo (required), plus optional page images</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5" />
              Cover Image *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                id="coverImage"
                accept="image/*"
                onChange={(e) => handleFileInput(e, 'cover')}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('coverImage')?.click()}
                className="w-full h-32 border-dashed"
              >
                {coverImage ? (
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span>Upload Cover Image</span>
                  </div>
                )}
              </Button>
              <p className="text-xs text-gray-500">Recommended: 1600x2560px (Amazon KDP standard)</p>
            </div>
          </CardContent>
        </Card>

        {/* Author Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Image className="h-5 w-5" />
              Author Photo *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                id="authorImage"
                accept="image/*"
                onChange={(e) => handleFileInput(e, 'author')}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('authorImage')?.click()}
                className="w-full h-32 border-dashed"
              >
                {authorImage ? (
                  <img src={authorImage} alt="Author" className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span>Upload Author Photo</span>
                  </div>
                )}
              </Button>
              <p className="text-xs text-gray-500">Professional headshot recommended</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Page Images (Optional)
          </CardTitle>
          <p className="text-sm text-gray-600">Add images to enhance your ebook pages</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              id="pageImages"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => handleImageUpload(file, 'page'));
              }}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('pageImages')?.click()}
              className="w-full border-dashed"
            >
              <Upload className="mr-2 h-4 w-4" />
              Add Page Images
            </Button>

            {pageImages.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {pageImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img src={image} alt={`Page ${index + 1}`} className="w-full h-24 object-cover rounded" />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removePageImage(index)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back to Form
        </Button>
        <Button onClick={handleProceed} className="flex-1 bg-purple-600 hover:bg-purple-700">
          Continue to Preview
        </Button>
      </div>
    </div>
  );
};

export default EbookImageUpload;
