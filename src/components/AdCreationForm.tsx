import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CreditCard, X, Megaphone, Link2, Clock, ImagePlus, Sparkles, ArrowRight } from "lucide-react";
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
  const [step, setStep] = useState(1);

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
    if (confirm(`Create ad for ${newAd.durationDays} days at ₦${(amount * 1600).toLocaleString()}? This will redirect you to payment.`)) {
      onAdCreated(newAd);
    }
  };

  const canProceed = step === 1
    ? newAd.title.trim() && newAd.description.trim()
    : newAd.targetUrl.trim();

  const durationOptions = [
    { value: '1', label: '1 Day', price: '₦1,600' },
    { value: '3', label: '3 Days', price: '₦4,800' },
    { value: '7', label: '1 Week', price: '₦11,200' },
    { value: '14', label: '2 Weeks', price: '₦22,400' },
    { value: '30', label: '1 Month', price: '₦48,000' },
    { value: '60', label: '2 Months', price: '₦96,000' },
    { value: '90', label: '3 Months', price: '₦144,000' },
  ];

  return (
    <Card className="border border-orange-500/20 bg-gradient-to-b from-orange-500/5 to-transparent overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">New Campaign</h3>
            <p className="text-[10px] text-muted-foreground">Step {step} of 3</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="flex gap-1.5">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-muted'}`} />
          ))}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Step 1: Ad Content */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Ad Title</Label>
              <Input
                placeholder="Enter a compelling title..."
                value={newAd.title}
                onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                className="h-11 rounded-xl border-border/50 bg-background/50 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</Label>
              <Textarea
                placeholder="What makes your offer irresistible?"
                value={newAd.description}
                onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                rows={3}
                className="rounded-xl border-border/50 bg-background/50 text-sm resize-none"
              />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceed}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold"
            >
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Link & Image */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> Landing Page URL
              </Label>
              <Input
                placeholder="https://your-landing-page.com"
                value={newAd.targetUrl}
                onChange={(e) => setNewAd({ ...newAd, targetUrl: e.target.value })}
                className="h-11 rounded-xl border-border/50 bg-background/50 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ImagePlus className="h-3 w-3" /> Ad Creative (Optional)
              </Label>
              <input type="file" id="newAdImage" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {newAd.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border/50">
                  <img src={newAd.imageUrl} alt="Preview" className="w-full h-32 object-cover" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewAd({ ...newAd, imageUrl: '' })}
                    className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('newAdImage')?.click()}
                  className="w-full h-24 rounded-xl border-dashed border-2 border-border/50 flex flex-col gap-1.5"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tap to upload image</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-xl text-sm">Back</Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceed}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-semibold"
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Duration & Payment */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Campaign Duration
              </Label>
              <Select value={newAd.durationDays.toString()} onValueChange={(value) => setNewAd({ ...newAd, durationDays: parseInt(value) })}>
                <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover rounded-xl">
                  {durationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label} — {opt.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Card */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Campaign Summary</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title</span>
                  <span className="font-medium text-foreground truncate ml-4 max-w-[60%] text-right">{newAd.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{durationOptions.find(o => o.value === newAd.durationDays.toString())?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium text-foreground">₦1,600/day</span>
                </div>
                <div className="border-t border-orange-500/20 pt-2 flex justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-orange-500 text-base">₦{(getPriceForDuration(newAd.durationDays) * 1600).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 rounded-xl text-sm">Back</Button>
              <Button
                onClick={createAd}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-green-500/20"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay & Launch
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdCreationForm;
