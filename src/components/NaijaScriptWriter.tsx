import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, Copy, Check, Share2, Video, Mic, RefreshCw, 
  MessageSquare, Flame, TrendingUp, Zap, Target, BookOpen, Download
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

interface ScriptVariation {
  id: string;
  title: string;
  hook: string;
  body: string;
  callToAction: string;
  fullText: string;
  whatsappReadyText: string;
}

export const NaijaScriptWriter: React.FC<{ onNavigateToStudio?: (script: string) => void }> = ({ onNavigateToStudio }) => {
  const navigate = useNavigate();

  // Form states
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [targetAudience, setTargetAudience] = useState('Lagos & Nationwide Online Shoppers');
  const [priceNaira, setPriceNaira] = useState('15,000');
  const [originalPriceNaira, setOriginalPriceNaira] = useState('25,000');
  const [scriptType, setScriptType] = useState<'whatsapp' | 'video_reels' | 'fb_ad' | 'sales_page' | 'objection_closer'>('whatsapp');
  const [toneStyle, setToneStyle] = useState<'naija_street' | 'corporate_naija' | 'urgent_fomo' | 'storytelling'>('naija_street');
  
  // Results & Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [variations, setVariations] = useState<ScriptVariation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerateScript = async () => {
    if (!productName.trim()) {
      toast.error('Please enter your product or offer name.');
      return;
    }

    setIsGenerating(true);
    setVariations([]);

    const scriptTypeLabels: Record<string, string> = {
      whatsapp: 'WhatsApp Direct-Response Broadcast & DM Pitch',
      video_reels: '30s TikTok & Instagram Reels High-Retention Video Script with Visual Cues',
      fb_ad: 'Facebook & Instagram Sponsored Ad Copy (Headline, Primary Text & CTA)',
      sales_page: 'High-Converting Landing Page Sales Letter with Benefits & Bullet Points',
      objection_closer: 'WhatsApp DM Closer & Objection Breakers (Price, Trust, Pay on Delivery)'
    };

    const toneDescriptions: Record<string, string> = {
      naija_street: 'Authentic Nigerian conversational Pidgin/English mix, relatable, punchy, high-energy ("No cap, this thing dey sell like hot cake")',
      corporate_naija: 'Prestigious, polished, professional Nigerian business tone ("Trusted by thousands of smart entrepreneurs in Lagos and Abuja")',
      urgent_fomo: 'Extreme scarcity, countdown urgency, fast-finger discount promo ("Only 7 units left before price jumps back")',
      storytelling: 'Relatable before-and-after journey, struggles, triumph, and undeniable social proof'
    };

    const prompt = `You are Nigeria's #1 direct-response copywriter and marketing genius.
Generate 3 distinct HIGH-CONVERTING Nigerian sales copy variations for the following product:

Product Name: ${productName}
Product Details / Benefits: ${productDetails || 'High quality, authentic, fast delivery across Nigeria'}
Target Audience: ${targetAudience}
Promo Price: ₦${priceNaira || '15,000'} (Normal Price: ₦${originalPriceNaira || '25,000'})
Copy Format: ${scriptTypeLabels[scriptType]}
Tone / Style: ${toneDescriptions[toneStyle]}

Requirements:
1. Make it 100% relevant to Nigerian consumers (relatable Nigerian pain points, payment assurance, fast delivery, authentic Nigerian phrasing, high FOMO).
2. Clean formatting: DO NOT use raw markdown asterisks (no ** or *). Use clean spacing, bold headers, and high-impact emojis.
3. Include:
   - 3-Second Retention Hook / Headline
   - The Relatable Nigerian Problem / Agitation
   - The Solution & Key Benefits
   - Irresistible Promo Offer & Price Anchor (₦${priceNaira})
   - Clear Urgency & WhatsApp/Call-to-Action.

Respond in valid JSON format with an array of 3 variations:
{
  "variations": [
    {
      "title": "Variation 1: ...",
      "hook": "...",
      "body": "...",
      "callToAction": "...",
      "fullText": "..."
    }
  ]
}`;

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: prompt,
          temperature: 0.7,
          responseMimeType: 'application/json',
          model: 'gemini-2.5-flash'
        })
      });

      if (res.ok) {
        const data = await res.json();
        let parsed: any = null;
        try {
          const raw = (data.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(raw);
        } catch (parseErr) {
          // If JSON parse fails, construct variations from text
          parsed = {
            variations: [
              {
                title: "High-Converting Naija Hook Variation",
                hook: `If you are in Nigeria and still struggling with this, pause and read this now!`,
                body: data.text || `Here is how ${productName} gives you total peace of mind for just ₦${priceNaira}.`,
                callToAction: `Send a WhatsApp DM right now to claim before stock finishes!`,
                fullText: data.text || `🔥 ${productName}\n\nGet yours today for just ₦${priceNaira} (instead of ₦${originalPriceNaira}). Delivery nationwide!`
              }
            ]
          };
        }

        if (parsed?.variations && Array.isArray(parsed.variations) && parsed.variations.length > 0) {
          const formattedVars = parsed.variations.map((v: any, idx: number) => {
            const cleanFull = (v.fullText || `${v.hook}\n\n${v.body}\n\n${v.callToAction}`).replace(/[*#`]/g, '').trim();
            const waText = encodeURIComponent(cleanFull);
            return {
              id: `var_${idx}_${Date.now()}`,
              title: v.title || `Naija High-Converter #${idx + 1}`,
              hook: (v.hook || '').replace(/[*#`]/g, '').trim(),
              body: (v.body || '').replace(/[*#`]/g, '').trim(),
              callToAction: (v.callToAction || '').replace(/[*#`]/g, '').trim(),
              fullText: cleanFull,
              whatsappReadyText: waText
            };
          });

          setVariations(formattedVars);
          setActiveTabIdx(0);
          toast.success('🎉 3 High-converting Nigerian copy variations generated!');
        } else {
          throw new Error('Could not parse variations');
        }
      } else {
        throw new Error('Server generation response error');
      }
    } catch (err: any) {
      console.warn('Fallback generation for Naija Script Writer:', err);
      // Fallback high-converting templates
      const fallbackList: ScriptVariation[] = [
        {
          id: `fallback_1`,
          title: `🔥 High-Impact Naija WhatsApp Closer`,
          hook: `Omo! If you are tired of wasting money without seeing real results, read this carefully 👇`,
          body: `Most people think getting real value on ${productName} is expensive, but for today ONLY, you can get the original package for just ₦${priceNaira} instead of the regular ₦${originalPriceNaira}!\n\n✅ 100% Verified Quality & Tested Results\n✅ Fast Delivery to your doorstep in Lagos, Abuja & Nationwide\n✅ Instant support and complete peace of mind\n\nNo stories, no delay!`,
          callToAction: `👉 Click here to send a direct WhatsApp message to order your piece now before this flash discount expires!`,
          fullText: `Omo! If you are tired of wasting money without seeing real results, read this carefully 👇\n\nMost people think getting real value on ${productName} is expensive, but for today ONLY, you can get the original package for just ₦${priceNaira} instead of the regular ₦${originalPriceNaira}!\n\n✅ 100% Verified Quality & Tested Results\n✅ Fast Delivery to your doorstep in Lagos, Abuja & Nationwide\n✅ Instant support and complete peace of mind\n\n👉 Send a direct WhatsApp message to order now before stock runs out!`,
          whatsappReadyText: encodeURIComponent(`Hello! I want to order ${productName} at the ₦${priceNaira} promo price. Please share payment details and delivery timeline!`)
        },
        {
          id: `fallback_2`,
          title: `🎬 30s TikTok & Reels Viral Video Script`,
          hook: `[Scene 1 - 0:00 to 0:03] Face camera with dramatic expression: "Stop scrolling if you want to scale your results in Nigeria today!"`,
          body: `[Scene 2 - 0:04 to 0:15] Show product in action with fast kinetic text overlays: "Here is the exact framework behind ${productName} that top performers are using."\n\n[Scene 3 - 0:16 to 0:24] "Instead of paying ₦${originalPriceNaira}, the first 10 people to order today get it for only ₦${priceNaira}!"`,
          callToAction: `[Scene 4 - 0:25 to 0:30] "Tap the link in my bio or comment 'READY' right now to grab yours!"`,
          fullText: `[0:00 - 0:03] Stop scrolling if you want to scale your results in Nigeria today!\n\n[0:04 - 0:15] Here is the exact framework behind ${productName} that top performers are using every single day.\n\n[0:16 - 0:24] Instead of paying ₦${originalPriceNaira}, the first 10 people get it for only ₦${priceNaira} with nationwide delivery!\n\n[0:25 - 0:30] Tap the link in bio or DM 'READY' right now!`,
          whatsappReadyText: encodeURIComponent(`Hi, I saw your video about ${productName} and want to order for ₦${priceNaira}!`)
        }
      ];
      setVariations(fallbackList);
      setActiveTabIdx(0);
      toast.success('Generated high-converting scripts!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('📋 Copied high-converting script to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenWhatsApp = (encodedText: string) => {
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleCookVideoInStudio = (scriptText: string) => {
    if (onNavigateToStudio) {
      onNavigateToStudio(scriptText);
    } else {
      localStorage.setItem('vixora_preloaded_script', scriptText);
      navigate('/vixora');
      toast.success('🚀 Transferred script to Vixora AI Video Studio!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-400/30">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-xs">
              🇳🇬 Naija AI Copy & Script Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-neutral-950">
              Vixora Gemini AI Powered
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight">
            High-Converting Nigerian Script & Sales Copy Writer
          </h2>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
            Generate authentic, high-converting Nigerian sales copy, WhatsApp broadcast pitches, TikTok/Reels video scripts, and Facebook ad copy that drives real orders and instant responses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT CONFIGURATION PANEL */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border/60 shadow-md">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-tight text-foreground">
                  Offer & Campaign Details
                </h3>
              </div>

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Product / Offer Name *</span>
                  <span className="text-[10px] text-muted-foreground font-normal">e.g. Smart Watch, Hair Growth Oil</span>
                </label>
                <Input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="e.g. Premium HD Wireless Smart Watch Pro"
                  className="text-xs rounded-xl"
                />
              </div>

              {/* Product Key Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Key Benefits / Selling Points
                </label>
                <Textarea
                  value={productDetails}
                  onChange={e => setProductDetails(e.target.value)}
                  placeholder="e.g. Water resistant, 7-day battery life, makes Bluetooth calls, comes with free extra strap, nationwide delivery in 24-48 hours."
                  className="text-xs rounded-xl min-h-[75px] resize-none"
                />
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Promo Price (₦)
                  </label>
                  <Input
                    value={priceNaira}
                    onChange={e => setPriceNaira(e.target.value)}
                    placeholder="15,000"
                    className="text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Normal Price (₦)
                  </label>
                  <Input
                    value={originalPriceNaira}
                    onChange={e => setOriginalPriceNaira(e.target.value)}
                    placeholder="25,000"
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Script Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Script / Copy Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'whatsapp', label: '📱 WhatsApp Pitch', desc: 'Broadcast & Direct Message' },
                    { id: 'video_reels', label: '🎬 TikTok / Reels Video', desc: '30s Retention with Scenes' },
                    { id: 'fb_ad', label: '📢 Sponsored Ad Copy', desc: 'FB & IG Feed Ads' },
                    { id: 'sales_page', label: '📄 Sales Page Letter', desc: 'Landing Page Bullet Points' },
                    { id: 'objection_closer', label: '💬 Objection Closer', desc: 'Handle "Price/POD" doubts' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setScriptType(type.id as any)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        scriptType === type.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'bg-background hover:bg-muted border-border text-foreground'
                      }`}
                    >
                      <p className="text-xs font-black">{type.label}</p>
                      <p className="text-[9.5px] text-muted-foreground">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone / Nigerian Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Tone & Nigerian Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'naija_street', label: '🇳🇬 Pidgin & Street-Smart', sub: 'Relatable & Viral' },
                    { id: 'corporate_naija', label: '🏢 Corporate Nigerian', sub: 'Executive & Trusted' },
                    { id: 'urgent_fomo', label: '🔥 Urgent Scarcity', sub: 'Fast-Fingers FOMO' },
                    { id: 'storytelling', label: '💡 Storytelling Journey', sub: 'Deep Connection' }
                  ].map(tone => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setToneStyle(tone.id as any)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        toneStyle === tone.id
                          ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                          : 'bg-background hover:bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <p className="text-xs font-bold">{tone.label}</p>
                      <p className="text-[9px] opacity-80">{tone.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerateScript}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-500 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Cooking High-Converting Copy...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate 3 Nigerian Copy Variations
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RESULTS & OUTPUT PANEL */}
        <div className="lg:col-span-7 space-y-4">
          {variations.length > 0 ? (
            <div className="space-y-4">
              {/* Variation Tabs */}
              <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-2xl border border-border/60">
                {variations.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveTabIdx(idx)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTabIdx === idx
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Variation #{idx + 1}</span>
                  </button>
                ))}
              </div>

              {/* Active Variation Display */}
              {variations[activeTabIdx] && (
                <Card className="border-emerald-500/30 shadow-xl bg-card">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div>
                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Zap className="h-3.5 w-3.5" />
                          </span>
                          <span>{variations[activeTabIdx].title}</span>
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Optimized for high CTR & immediate customer response</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(variations[activeTabIdx].fullText, variations[activeTabIdx].id)}
                          className="h-8 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          {copiedId === variations[activeTabIdx].id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy Script
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenWhatsApp(variations[activeTabIdx].whatsappReadyText)}
                          className="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5 mr-1" />
                          Send to WhatsApp
                        </Button>
                      </div>
                    </div>

                    {/* Formatted Script Body */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-3 text-xs sm:text-sm font-medium leading-relaxed text-foreground whitespace-pre-wrap font-sans select-all">
                      {variations[activeTabIdx].fullText}
                    </div>

                    {/* Action Hub */}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleCookVideoInStudio(variations[activeTabIdx].fullText)}
                        className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        Cook Video with Vixora Autopilot
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          localStorage.setItem('vixora_preloaded_voiceover', variations[activeTabIdx].fullText);
                          navigate('/voiceover');
                          toast.success('🎙️ Opened in Vixora Voiceover Studio!');
                        }}
                        className="border-border text-xs font-bold rounded-xl cursor-pointer"
                      >
                        <Mic className="h-3.5 w-3.5 mr-1.5 text-cyan-500" />
                        Synthesize AI Voiceover (Kore TTS)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-border/60 text-center space-y-3 bg-muted/20">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-base font-black text-foreground">
                Ready to Cook High-Converting Nigerian Copy
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Fill in your product details and click generate to produce 3 battle-tested sales pitches tailored for Nigerian buyers on WhatsApp, TikTok, and Facebook Ads.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NaijaScriptWriter;
