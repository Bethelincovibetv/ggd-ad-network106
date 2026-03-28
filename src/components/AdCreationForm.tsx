
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CreditCard, X } from "lucide-react";
import { toast } from "sonner";

interface AdCreationFormProps {
  onAdCreated: (adData: any) => void;
  onCancel: () => void;
}

const AdCreationForm: React.FC<AdCreationFormProps> = ({ onAdCreated, onCancel }) => {
  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    durationDays: 7,
    isActive: true
  });

  const getPriceForDuration = (days: number) => days * 1.00;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setNewAd({ ...newAd, imageUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const createAd = () => {
    if (!newAd.title.trim() || !newAd.description.trim() || !newAd.targetUrl.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = getPriceForDuration(newAd.durationDays);
    
    if (confirm(`Create ad for ${newAd.durationDays} days at $${amount.toFixed(2)}? This will redirect you to payment.`)) {
      onAdCreated(newAd);
    }
  };

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Create New Ad Campaign</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="newTitle" className="text-sm font-medium">Ad Title *</Label>
            <Input
              id="newTitle"
              placeholder="Enter compelling ad title"
              value={newAd.title}
              onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="newDescription" className="text-sm font-medium">Ad Description *</Label>
            <Textarea
              id="newDescription"
              placeholder="Write a compelling ad description..."
              value={newAd.description}
              onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="newTargetUrl" className="text-sm font-medium">Target URL *</Label>
            <Input
              id="newTargetUrl"
              placeholder="https://your-landing-page.com"
              value={newAd.targetUrl}
              onChange={(e) => setNewAd({ ...newAd, targetUrl: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Campaign Duration</Label>
            <Select value={newAd.durationDays.toString()} onValueChange={(value) => setNewAd({ ...newAd, durationDays: parseInt(value) })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="1">1 Day - $1.00</SelectItem>
                <SelectItem value="3">3 Days - $3.00</SelectItem>
                <SelectItem value="7">1 Week - $7.00</SelectItem>
                <SelectItem value="14">2 Weeks - $14.00</SelectItem>
                <SelectItem value="30">1 Month - $30.00</SelectItem>
                <SelectItem value="60">2 Months - $60.00</SelectItem>
                <SelectItem value="90">3 Months - $90.00</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-lg font-bold text-green-700">
              Total: ${getPriceForDuration(newAd.durationDays).toFixed(2)}
            </div>
            <div className="text-sm text-green-600">
              ${getPriceForDuration(newAd.durationDays) / newAd.durationDays} per day
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Ad Image (Optional)</Label>
            <div className="mt-1">
              <input
                type="file"
                id="newAdImage"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('newAdImage')?.click()}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Ad Image
              </Button>
              {newAd.imageUrl && (
                <div className="mt-3 text-center">
                  <img src={newAd.imageUrl} alt="Preview" className="max-w-24 h-24 object-cover rounded mx-auto" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={createAd} className="flex-1 bg-gradient-to-r from-green-600 to-green-700">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ${getPriceForDuration(newAd.durationDays).toFixed(2)} & Launch
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdCreationForm;
