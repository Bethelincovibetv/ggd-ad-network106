
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Code, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { AdvertData } from "@/types/advert";
import { gameAdvertTypes, searchGameAdvertTypes, generateAdvertStyle, GameAdvertType } from "@/utils/gameAdvertTypes";

const AdvertGenerator = () => {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productLink, setProductLink] = useState('');
  const [flyerImage, setFlyerImage] = useState<string>('');
  const [selectedAdvertType, setSelectedAdvertType] = useState<string>('retro-arcade');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAdvert, setGeneratedAdvert] = useState<string>('');

  const filteredAdvertTypes = useMemo(() => {
    return searchGameAdvertTypes(searchQuery);
  }, [searchQuery]);

  const selectedType = gameAdvertTypes.find(type => type.id === selectedAdvertType) || gameAdvertTypes[0];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFlyerImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAnimatedAdvert = async () => {
    if (!productName.trim() || !productDescription.trim() || !productLink.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    
    try {
      const advertStyle = generateAdvertStyle(selectedType);
      
      const advertHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${productName} - ${selectedType.name} Advert</title>
    <style>
        ${advertStyle}
        
        .gaming-advert::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: sweep 3s infinite;
        }
        @keyframes sweep {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
        
        .product-image {
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 10px;
            margin: 10px auto;
            border: 2px solid ${selectedType.style.borderColor};
            animation: ${selectedType.style.animations.includes('pulse') ? 'pulse 2s infinite' : ''};
        }
        
        .product-description {
            font-size: 14px;
            line-height: 1.4;
            margin: 15px 0;
            color: ${selectedType.style.textColor === '#333333' ? '#666666' : '#cccccc'};
        }
        
        .corner-tl { top: 10px; left: 10px; border-right: none; border-bottom: none; }
        .corner-tr { top: 10px; right: 10px; border-left: none; border-bottom: none; }
        .corner-bl { bottom: 10px; left: 10px; border-right: none; border-top: none; }
        .corner-br { bottom: 10px; right: 10px; border-left: none; border-top: none; }
    </style>
</head>
<body>
    <div class="gaming-advert" onclick="window.open('${productLink}', '_blank')">
        <div class="corner-effects corner-tl"></div>
        <div class="corner-effects corner-tr"></div>
        <div class="corner-effects corner-bl"></div>
        <div class="corner-effects corner-br"></div>
        
        ${flyerImage ? `<img src="${flyerImage}" alt="${productName}" class="product-image">` : `<div class="product-image" style="background: ${selectedType.style.buttonStyle}; display: flex; align-items: center; justify-content: center; font-size: 40px;">🎮</div>`}
        
        <div class="product-title">${productName}</div>
        <div class="product-description">${productDescription}</div>
        
        <button class="play-button">🎮 PLAY NOW & WIN! 🏆</button>
        
        <div style="position: absolute; top: 5px; right: 15px; background: ${selectedType.style.accentColor}; color: ${selectedType.style.textColor === '#333333' ? '#ffffff' : '#000000'}; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">HOT!</div>
    </div>
</body>
</html>`;

      setGeneratedAdvert(advertHtml);
      toast.success(`🎮 ${selectedType.name} advert generated successfully!`);
    } catch (error) {
      toast.error("Failed to generate advert. Please try again.");
      console.error("Advert generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAdvertCode = () => {
    navigator.clipboard.writeText(generatedAdvert);
    toast.success("Advert HTML code copied to clipboard!");
  };

  const previewAdvert = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(generatedAdvert);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            🎮 Gaming Advert Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="advertType" className="text-lg font-medium">Game Advert Type *</Label>
            <div className="mt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search advert types (e.g., loud game, cyberpunk...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedAdvertType} onValueChange={setSelectedAdvertType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a game advert type" />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-white">
                  {filteredAdvertTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-xs text-gray-500">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Selected:</strong> {selectedType.name} - {selectedType.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="productName" className="text-lg font-medium">Product Name *</Label>
            <Input
              id="productName"
              placeholder="Enter your product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="productDescription" className="text-lg font-medium">Product Description *</Label>
            <Textarea
              id="productDescription"
              placeholder="Describe your product in an engaging way..."
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="productLink" className="text-lg font-medium">Product Link *</Label>
            <Input
              id="productLink"
              placeholder="https://your-product-link.com"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label htmlFor="flyerImage" className="text-lg font-medium">Product Image (Optional)</Label>
            <div className="mt-2">
              <input
                type="file"
                id="flyerImage"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('flyerImage')?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Product Image
              </Button>
              {flyerImage && (
                <div className="mt-4 text-center">
                  <img src={flyerImage} alt="Preview" className="max-w-32 h-32 object-cover rounded mx-auto" />
                </div>
              )}
            </div>
          </div>
          
          <Button
            onClick={generateAnimatedAdvert}
            disabled={isGenerating}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating {selectedType.name} Advert...
              </>
            ) : (
              <>
                🎮 Generate {selectedType.name} Advert
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedAdvert && (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Generated {selectedType.name} Advert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={copyAdvertCode} className="flex-1">
                <Code className="mr-2 h-4 w-4" />
                Copy HTML Code
              </Button>
              <Button onClick={previewAdvert} variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Preview Advert
              </Button>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{generatedAdvert}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvertGenerator;
