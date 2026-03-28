
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Book, History, ArrowLeft } from "lucide-react";
import { EbookData, EbookStep } from '@/types/ebook';
import { useEbookHistory } from '@/hooks/useEbookHistory';
import EbookForm from './ebook/EbookForm';
import EbookImageUpload from './ebook/EbookImageUpload';
import EbookPreview from './ebook/EbookPreview';
import EbookExport from './ebook/EbookExport';
import EbookHistory from './ebook/EbookHistory';
import EbookProgressIndicator from './ebook/EbookProgressIndicator';
import { generateEbookWithGemini } from '@/services/geminiEbookService';

const EbookGenerator = () => {
  const [ebookData, setEbookData] = useState<EbookData>({
    authorName: '',
    topic: '',
    pages: 15,
    category: '',
    tone: '',
    description: '',
    authorBio: '',
    coverImage: '',
    authorImage: '',
    pageImages: [],
    generatedContent: ''
  });
  
  const [currentStep, setCurrentStep] = useState<EbookStep>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const { ebookHistory, saveEbook, deleteEbook, remixEbook } = useEbookHistory();

  const handleFormSubmit = async (formData: Partial<EbookData>) => {
    console.log('Form submitted with data:', formData);
    setIsGenerating(true);
    
    try {
      toast({
        title: "Generating Ebook...",
        description: "AI is creating your professional ebook content. This may take a moment.",
      });

      console.log('Calling Gemini API to generate ebook...');
      const generatedContent = await generateEbookWithGemini({
        topic: formData.topic!,
        authorName: formData.authorName!,
        pages: formData.pages!,
        category: formData.category!,
        tone: formData.tone!,
        description: formData.description,
        authorBio: formData.authorBio
      });

      console.log('Ebook content generated successfully, updating state...');
      setEbookData(prev => ({
        ...prev,
        ...formData,
        generatedContent
      }));
      
      console.log('Moving to images step...');
      setCurrentStep('images');
      toast({
        title: "Ebook Generated Successfully!",
        description: "Your AI-powered ebook content has been created. Now add your images.",
      });
    } catch (error) {
      console.error('Ebook generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate ebook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (imageData: { coverImage: string; authorImage: string; pageImages: string[] }) => {
    console.log('Images uploaded, saving ebook...');
    const updatedEbookData = {
      ...ebookData,
      ...imageData
    };
    setEbookData(updatedEbookData);
    
    // Save to history when images are uploaded
    const savedEbook = saveEbook(updatedEbookData);
    setEbookData(savedEbook);
    
    console.log('Moving to preview step...');
    setCurrentStep('preview');
  };

  const handleRemixEbook = (ebook: EbookData) => {
    console.log('Remixing ebook:', ebook.topic);
    const remixedEbook = remixEbook(ebook);
    setEbookData(remixedEbook);
    setCurrentStep('form');
    setShowHistory(false);
  };

  const resetToForm = () => {
    console.log('Resetting to form...');
    setEbookData({
      authorName: '',
      topic: '',
      pages: 15,
      category: '',
      tone: '',
      description: '',
      authorBio: '',
      coverImage: '',
      authorImage: '',
      pageImages: [],
      generatedContent: ''
    });
    setCurrentStep('form');
    setShowHistory(false);
  };

  if (showHistory) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Book className="h-8 w-8 text-purple-600" />
              <CardTitle className="text-3xl font-bold text-purple-800">
                Profitmate Ebook Generator
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <EbookHistory
              ebookHistory={ebookHistory}
              onDeleteEbook={deleteEbook}
              onRemixEbook={handleRemixEbook}
              onBack={() => setShowHistory(false)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCurrentStep = () => {
    console.log('Rendering step:', currentStep);
    switch (currentStep) {
      case 'form':
        return (
          <EbookForm
            initialData={ebookData}
            onSubmit={handleFormSubmit}
            isGenerating={isGenerating}
          />
        );
      case 'images':
        return (
          <EbookImageUpload
            onImageUpload={handleImageUpload}
            onBack={() => setCurrentStep('form')}
          />
        );
      case 'preview':
        return (
          <EbookPreview
            ebookData={ebookData}
            onBack={() => setCurrentStep('images')}
            onProceed={() => setCurrentStep('export')}
          />
        );
      case 'export':
        return (
          <EbookExport
            ebookData={ebookData}
            onBack={() => setCurrentStep('preview')}
          />
        );
      default:
        console.error('Unknown step:', currentStep);
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              View History
            </Button>
            
            <div className="flex items-center gap-2">
              <Book className="h-8 w-8 text-purple-600" />
              <CardTitle className="text-3xl font-bold text-purple-800">
                Profitmate Ebook Generator
              </CardTitle>
            </div>
            
            {currentStep !== 'form' && (
              <Button
                variant="outline"
                onClick={resetToForm}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Start Over
              </Button>
            )}
          </div>
          
          <p className="text-gray-600">
            Create professional, Amazon KDP-ready ebooks with AI-powered content generation
          </p>
          
          <EbookProgressIndicator currentStep={currentStep} />
        </CardHeader>

        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>
    </div>
  );
};

export default EbookGenerator;
