import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { EbookData } from '@/types/ebook';

interface EbookFormProps {
  initialData?: Partial<EbookData>;
  onSubmit: (data: Partial<EbookData>) => void;
  isGenerating: boolean;
}

const EbookForm = ({ initialData, onSubmit, isGenerating }: EbookFormProps) => {
  const [formData, setFormData] = useState({
    authorName: '',
    topic: '',
    pages: 15,
    category: '',
    tone: '',
    description: '',
    authorBio: ''
  });

  useEffect(() => {
    if (initialData) {
      console.log('Setting initial form data:', initialData);
      setFormData({
        authorName: initialData.authorName || '',
        topic: initialData.topic || '',
        pages: initialData.pages || 15,
        category: initialData.category || '',
        tone: initialData.tone || '',
        description: initialData.description || '',
        authorBio: initialData.authorBio || ''
      });
    }
  }, [initialData]);

  const categories = [
    'Business & Finance',
    'Self-Help',
    'Health & Fitness',
    'Technology',
    'Education',
    'Fiction',
    'Non-Fiction',
    'Biography',
    'Travel',
    'Cooking',
    'Art & Design',
    'Science'
  ];

  const tones = [
    'Professional',
    'Conversational',
    'Educational',
    'Inspirational',
    'Authoritative',
    'Friendly',
    'Academic',
    'Casual'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission attempted with data:', formData);
    
    if (!formData.authorName || !formData.topic || !formData.category || !formData.tone) {
      console.error('Form validation failed - missing required fields');
      return;
    }
    
    console.log('Form validation passed, calling onSubmit...');
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    console.log(`Form field changed: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <CardContent className="space-y-4 p-0">
            <div>
              <Label htmlFor="authorName" className="text-sm font-medium">
                Author Name *
              </Label>
              <Input
                id="authorName"
                value={formData.authorName}
                onChange={(e) => handleInputChange('authorName', e.target.value)}
                placeholder="Enter your name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="topic" className="text-sm font-medium">
                Ebook Topic *
              </Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => handleInputChange('topic', e.target.value)}
                placeholder="e.g., How to Paint Your Shoes"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pages" className="text-sm font-medium">
                Number of Pages
              </Label>
              <Input
                id="pages"
                type="number"
                min="10"
                max="100"
                value={formData.pages}
                onChange={(e) => handleInputChange('pages', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent className="space-y-4 p-0">
            <div>
              <Label className="text-sm font-medium">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Writing Tone *</Label>
              <Select value={formData.tone} onValueChange={(value) => handleInputChange('tone', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select writing tone" />
                </SelectTrigger>
                <SelectContent>
                  {tones.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Ebook Description (Optional)
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Provide additional details about your ebook content..."
          className="mt-1 min-h-[80px]"
        />
      </div>

      <div>
        <Label htmlFor="authorBio" className="text-sm font-medium">
          Author Biography (Optional)
        </Label>
        <Textarea
          id="authorBio"
          value={formData.authorBio}
          onChange={(e) => handleInputChange('authorBio', e.target.value)}
          placeholder="Tell readers about yourself, your expertise, achievements, etc..."
          className="mt-1 min-h-[80px]"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={isGenerating || !formData.authorName || !formData.topic || !formData.category || !formData.tone}
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating Ebook with AI...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Generate Ebook with AI
          </div>
        )}
      </Button>
    </form>
  );
};

export default EbookForm;
