import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AICampaignAssistant from "@/components/AICampaignAssistant";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CreditCard, X, Megaphone, Link2, Clock, ImagePlus, Sparkles, ArrowRight, Zap, Eye, MousePointerClick, TrendingUp, MapPin, Youtube, Image as ImageIcon, Coins } from "lucide-react";
import { toast } from "sonner";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";

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
    isActive: true,
    targetState: 'all',
    adType: 'banner' as 'banner' | 'watch',
    youtubeUrl: '',
    watchDurationSeconds: 30,
    rewardCredits: 5,
    budgetCredits: 500,
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
    if (newAd.adType === 'watch') {
      if (!newAd.title.trim() || !newAd.youtubeUrl.trim()) { toast.error("Title and YouTube URL are required"); return; }
      if (newAd.watchDurationSeconds < 5) { toast.error("Minimum watch duration is 5 seconds"); return; }
      if (newAd.rewardCredits < 1 || newAd.budgetCredits < newAd.rewardCredits) { toast.error("Reward and budget must be valid"); return; }
      onAdCreated(newAd);
      return;
    }
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

  const totalPrice = getPriceForDuration(newAd.durationDays) * 1600;

  return (
    <div className="space-y-4">
      {/* Ad Type Selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setNewAd({ ...newAd, adType: 'banner' })}
          className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${newAd.adType === 'banner' ? 'border-orange-500 bg-orange-500/10' : 'border-border bg-muted/30'}`}
        >
          <ImageIcon className="h-5 w-5 text-orange-500" />
          <div className="text-left">
            <p className="text-xs font-bold text-foreground">Banner Ad</p>
            <p className="text-[9px] text-muted-foreground">Image + link</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setNewAd({ ...newAd, adType: 'watch' })}
          className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${newAd.adType === 'watch' ? 'border-red-500 bg-red-500/10' : 'border-border bg-muted/30'}`}
        >
          <Youtube className="h-5 w-5 text-red-500" />
          <div className="text-left">
            <p className="text-xs font-bold text-foreground">Watch & Earn</p>
            <p className="text-[9px] text-muted-foreground">YouTube reward</p>
          </div>
        </button>
      </div>

      {/* Watch Video Ad Flow */}
      {newAd.adType === 'watch' && (
        <Card className="border-0 shadow-lg bg-card/80 overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                <Youtube className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">YouTube Watch Ad</h4>
                <p className="text-[10px] text-muted-foreground">Pay viewers to watch your video</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Campaign Title</Label>
              <Input value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} placeholder="e.g. Watch our new product video" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">YouTube URL</Label>
              <Input value={newAd.youtubeUrl} onChange={e => setNewAd({ ...newAd, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Watch (seconds)</Label>
                <Input type="number" min={5} value={newAd.watchDurationSeconds} onChange={e => setNewAd({ ...newAd, watchDurationSeconds: parseInt(e.target.value) || 0 })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" />Reward / view</Label>
                <Input type="number" min={1} value={newAd.rewardCredits} onChange={e => setNewAd({ ...newAd, rewardCredits: parseInt(e.target.value) || 0 })} className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Budget (credits)</Label>
              <Input type="number" min={newAd.rewardCredits} value={newAd.budgetCredits} onChange={e => setNewAd({ ...newAd, budgetCredits: parseInt(e.target.value) || 0 })} className="h-11 rounded-xl" />
              <p className="text-[10px] text-muted-foreground">≈ {Math.floor(newAd.budgetCredits / Math.max(newAd.rewardCredits, 1))} viewers can earn</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Target State</Label>
              <Select value={newAd.targetState} onValueChange={v => setNewAd({ ...newAd, targetState: v })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All Nigeria</SelectItem>
                  {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl">Cancel</Button>
              <Button onClick={createAd} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-bold">
                <Youtube className="h-4 w-4 mr-2" /> Submit for Review
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Watch ads need admin approval before going live.</p>
          </CardContent>
        </Card>
      )}

      {newAd.adType === 'banner' && <>
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-600 via-red-500 to-pink-600 p-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-yellow-400/15 blur-xl" />
        
        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Create Campaign</h3>
              <p className="text-[10px] text-white/70 font-medium">Step {step} of 3 — {step === 1 ? 'Content' : step === 2 ? 'Media & Link' : 'Review & Pay'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="relative flex items-center gap-2">
          {[
            { num: 1, label: 'Content' },
            { num: 2, label: 'Media' },
            { num: 3, label: 'Payment' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-1.5">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  s.num < step ? 'bg-white text-orange-600' :
                  s.num === step ? 'bg-white/90 text-orange-600 ring-2 ring-white/50 shadow-lg' :
                  'bg-white/15 text-white/60'
                }`}>
                  {s.num < step ? '✓' : s.num}
                </div>
                <span className={`text-[10px] font-semibold ${s.num <= step ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${s.num < step ? 'bg-white/80' : 'bg-white/15'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Ad Content */}
      {step === 1 && (
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Campaign Details</h4>
                <p className="text-[10px] text-muted-foreground">Tell us about your promotion</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Campaign Title</Label>
              <Input
                placeholder="e.g. 50% Off All Products This Week"
                value={newAd.title}
                onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                className="h-12 rounded-2xl border-border/40 bg-muted/30 text-sm font-medium placeholder:text-muted-foreground/50 focus:bg-background transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Textarea
                placeholder="Describe what makes your offer irresistible..."
                value={newAd.description}
                onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                rows={3}
                className="rounded-2xl border-border/40 bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus:bg-background resize-none transition-colors"
              />
            </div>

            <AICampaignAssistant
              currentTitle={newAd.title}
              currentDescription={newAd.description}
              onApplyTitle={(v) => setNewAd(prev => ({ ...prev, title: v }))}
              onApplyDescription={(v) => setNewAd(prev => ({ ...prev, description: v }))}
            />

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Eye, label: 'Impressions', value: '10K+' },
                { icon: MousePointerClick, label: 'Avg Clicks', value: '500+' },
                { icon: TrendingUp, label: 'ROI', value: '300%' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-muted/30 rounded-xl p-2.5 text-center">
                  <Icon className="h-3.5 w-3.5 mx-auto mb-1 text-orange-500" />
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!canProceed}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-all"
            >
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Link & Image */}
      {step === 2 && (
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Media & Link</h4>
                <p className="text-[10px] text-muted-foreground">Add your landing page and creative</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> Landing Page URL
              </Label>
              <Input
                placeholder="https://your-landing-page.com"
                value={newAd.targetUrl}
                onChange={(e) => setNewAd({ ...newAd, targetUrl: e.target.value })}
                className="h-12 rounded-2xl border-border/40 bg-muted/30 text-sm font-medium placeholder:text-muted-foreground/50 focus:bg-background transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ImagePlus className="h-3 w-3" /> Ad Creative
              </Label>
              <input type="file" id="newAdImage" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {newAd.imageUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-sm">
                  <img src={newAd.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewAd({ ...newAd, imageUrl: '' })}
                    className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <p className="absolute bottom-2 left-3 text-[10px] text-white/80 font-medium">✓ Image uploaded</p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('newAdImage')?.click()}
                  className="w-full h-28 rounded-2xl border-dashed border-2 border-border/40 flex flex-col gap-2 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Tap to upload image</span>
                  <span className="text-[10px] text-muted-foreground/60">JPG, PNG up to 5MB</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-2xl text-sm font-semibold border-border/40">Back</Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceed}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-bold shadow-lg shadow-orange-500/25"
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Duration & Payment */}
      {step === 3 && (
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Review & Pay</h4>
                <p className="text-[10px] text-muted-foreground">Confirm your campaign details</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Campaign Duration
              </Label>
              <Select value={newAd.durationDays.toString()} onValueChange={(value) => setNewAd({ ...newAd, durationDays: parseInt(value) })}>
                <SelectTrigger className="h-12 rounded-2xl border-border/40 bg-muted/30 text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover rounded-xl">
                  {durationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground ml-2">— {opt.price}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Target State
              </Label>
              <Select value={newAd.targetState} onValueChange={v => setNewAd({ ...newAd, targetState: v })}>
                <SelectTrigger className="h-12 rounded-2xl border-border/40 bg-muted/30 text-sm font-medium"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover rounded-xl max-h-72">
                  <SelectItem value="all">🇳🇬 All Nigeria</SelectItem>
                  {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Card */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 border border-orange-500/20 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 px-4 py-2.5 border-b border-orange-500/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Campaign Summary</span>
                </div>
              </div>
              <div className="p-4 space-y-2.5">
                {newAd.imageUrl && (
                  <div className="rounded-xl overflow-hidden mb-3">
                    <img src={newAd.imageUrl} alt="Ad preview" className="w-full h-24 object-cover" />
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Campaign</span>
                  <span className="text-xs font-semibold text-foreground truncate ml-4 max-w-[55%] text-right">{newAd.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="text-xs font-semibold text-foreground">{durationOptions.find(o => o.value === newAd.durationDays.toString())?.label}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Daily Rate</span>
                  <span className="text-xs font-semibold text-foreground">₦1,600/day</span>
                </div>
                <div className="border-t border-orange-500/15 pt-3 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">Total Amount</span>
                    <div className="text-right">
                      <span className="text-lg font-black bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">₦{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-2xl text-sm font-semibold border-border/40">Back</Button>
              <Button
                onClick={createAd}
                className="flex-1 h-13 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold shadow-lg shadow-green-500/25 transition-all"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay & Launch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      </>}
    </div>
  );
};

export default AdCreationForm;
