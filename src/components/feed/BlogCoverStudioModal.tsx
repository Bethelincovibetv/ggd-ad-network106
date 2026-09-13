import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Check,
  Palette,
  Sliders,
  Layers,
  Wand2,
  RefreshCw,
  Search,
  Type,
  Layout,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BLOG_IMAGE_TEMPLATES,
  BLOG_TEMPLATE_CATEGORIES,
  BlogImageTemplate,
} from '@/data/blogImageTemplates';
import { generateImageWithGemini } from '@/services/geminiImageService';

interface BlogCoverStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
  initialSubtitle?: string;
  initialCategory?: string;
  authorName?: string;
  onSelectCover: (imageUrl: string, templateMeta?: any) => void;
}

const GRADIENT_PRESETS = [
  { id: 'dark-purple', name: 'Royal Purple', grad: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(88, 28, 135, 0.85) 60%, rgba(15, 23, 42, 0.95) 100%)' },
  { id: 'cyber-emerald', name: 'Cyber Emerald', grad: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9) 0%, rgba(13, 148, 136, 0.8) 60%, rgba(2, 6, 23, 0.95) 100%)' },
  { id: 'crimson-fire', name: 'Crimson Surge', grad: 'linear-gradient(135deg, rgba(153, 27, 27, 0.85) 0%, rgba(220, 38, 38, 0.75) 60%, rgba(15, 23, 42, 0.95) 100%)' },
  { id: 'deep-blue', name: 'Executive Navy', grad: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 58, 138, 0.85) 60%, rgba(15, 23, 42, 0.95) 100%)' },
  { id: 'sunset-amber', name: 'Amber Gold', grad: 'linear-gradient(135deg, rgba(120, 53, 15, 0.9) 0%, rgba(217, 119, 6, 0.8) 60%, rgba(15, 23, 42, 0.95) 100%)' },
  { id: 'stealth-dark', name: 'Obsidian Minimal', grad: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)' },
];

export const BlogCoverStudioModal: React.FC<BlogCoverStudioModalProps> = ({
  open,
  onOpenChange,
  initialTitle = '',
  initialSubtitle = '',
  initialCategory = 'Business Growth',
  authorName = 'GGD Creator',
  onSelectCover,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<BlogImageTemplate>(BLOG_IMAGE_TEMPLATES[0]);
  const [selectedCategory, setSelectedCategory] = useState('All Templates');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customizer fields
  const [headline, setHeadline] = useState(initialTitle || BLOG_IMAGE_TEMPLATES[0].headlinePlaceholder);
  const [subtitle, setSubtitle] = useState(initialSubtitle || BLOG_IMAGE_TEMPLATES[0].subtitlePlaceholder);
  const [categoryBadge, setCategoryBadge] = useState(initialCategory || BLOG_IMAGE_TEMPLATES[0].badge);
  const [authorTag, setAuthorTag] = useState(authorName || 'GGD Creator');
  const [overlayStyle, setOverlayStyle] = useState(GRADIENT_PRESETS[0].grad);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9'>('16:9');
  
  // AI Generator state
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  // Canvas ref for exporting high-res composited banner
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (initialTitle) setHeadline(initialTitle);
    if (initialSubtitle) setSubtitle(initialSubtitle);
    if (initialCategory) setCategoryBadge(initialCategory);
  }, [initialTitle, initialSubtitle, initialCategory, open]);

  const filteredTemplates = BLOG_IMAGE_TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === 'All Templates' || tpl.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (tpl: BlogImageTemplate) => {
    setSelectedTemplate(tpl);
    if (!initialTitle) setHeadline(tpl.headlinePlaceholder);
    if (!initialSubtitle) setSubtitle(tpl.subtitlePlaceholder);
    if (!initialCategory) setCategoryBadge(tpl.badge);
    setOverlayStyle(tpl.overlayGradient);
  };

  // Generate AI Image Background
  const handleGenerateAiBg = async () => {
    const prompt = aiCustomPrompt.trim() || headline || 'modern vibrant 3d business tech innovation background';
    setIsAiGenerating(true);
    try {
      toast.info('✨ Generating bespoke 3D blog cover with AI...');
      const url = await generateImageWithGemini(prompt);
      if (url) {
        setSelectedTemplate((prev) => ({
          ...prev,
          id: `ai-custom-${Date.now()}`,
          title: 'AI Generated Artwork',
          imageUrl: url,
        }));
        toast.success('🎉 AI Background generated!');
      } else {
        toast.error('Could not generate AI image. Using template background.');
      }
    } catch (err) {
      console.warn('AI cover generator error:', err);
      toast.error('AI image generation failed. Try another prompt.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Render to Canvas and Apply
  const generateCanvasImage = async (): Promise<string> => {
    const canvas = canvasRef.current;
    if (!canvas) return selectedTemplate.imageUrl;

    const ctx = canvas.getContext('2d');
    if (!ctx) return selectedTemplate.imageUrl;

    const width = aspectRatio === '21:9' ? 1400 : 1200;
    const height = aspectRatio === '21:9' ? 600 : 675;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background Image
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = selectedTemplate.imageUrl;
      });
      ctx.drawImage(img, 0, 0, width, height);
    } catch (err) {
      // Fallback solid gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#581c87');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw Gradient Overlay
    const overlayGrad = ctx.createLinearGradient(0, 0, width, height);
    overlayGrad.addColorStop(0, `rgba(15, 23, 42, ${overlayOpacity})`);
    overlayGrad.addColorStop(0.5, `rgba(30, 41, 59, ${overlayOpacity * 0.85})`);
    overlayGrad.addColorStop(1, `rgba(2, 6, 23, ${Math.min(1, overlayOpacity + 0.1)})`);
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Draw Category Badge
    const badgeText = (categoryBadge || 'EDITORIAL').toUpperCase();
    ctx.font = 'bold 20px sans-serif';
    const textMetrics = ctx.measureText(badgeText);
    const badgeWidth = textMetrics.width + 36;
    const badgeHeight = 40;
    const badgeX = 60;
    const badgeY = 70;

    ctx.fillStyle = 'rgba(147, 51, 234, 0.9)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 20);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, badgeX + 18, badgeY + 27);

    // 4. Draw Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Georgia, serif';
    const displayHeadline = headline || selectedTemplate.title;
    
    // Word wrap headline
    const words = displayHeadline.split(' ');
    let line = '';
    let startY = 180;
    const maxWidth = width - 120;
    const lineHeight = 64;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 60, startY);
        line = words[n] + ' ';
        startY += lineHeight;
        if (startY > height - 160) break; // prevent overflowing
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 60, startY);

    // 5. Draw Subtitle
    if (subtitle && startY < height - 120) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'italic 24px sans-serif';
      ctx.fillText(subtitle.slice(0, 110) + (subtitle.length > 110 ? '...' : ''), 60, startY + 50);
    }

    // 6. Draw Footer Branding & Author
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`⚡ GGD Ad Network • By ${authorTag || 'GGD Creator'}`, 60, height - 50);

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleApplyCover = async () => {
    setIsRendering(true);
    try {
      const finalUrl = await generateCanvasImage();
      onSelectCover(finalUrl, {
        templateId: selectedTemplate.id,
        category: categoryBadge,
        headline,
      });
      toast.success('🎉 Feature image applied to blog!');
      onOpenChange(false);
    } catch (err) {
      console.warn('Canvas export note, using raw template:', err);
      onSelectCover(selectedTemplate.imageUrl, { templateId: selectedTemplate.id });
      onOpenChange(false);
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadCover = async () => {
    setIsRendering(true);
    try {
      const dataUrl = await generateCanvasImage();
      const link = document.createElement('a');
      link.download = `blog-cover-${selectedTemplate.id}.jpg`;
      link.href = dataUrl;
      link.click();
      toast.success('💾 High-resolution blog cover downloaded!');
    } catch (err) {
      toast.error('Could not download cover');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border border-purple-500/30 bg-card shadow-2xl flex flex-col max-h-[92vh]">
        {/* Hidden Canvas for High-Resolution Compositing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 shrink-0 border-b border-white/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  Blog Feature Image Studio & Templates
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] font-bold">
                    <Crown className="h-3 w-3 mr-1" /> HD Studio
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-purple-200/80">
                  Select a 3D template, customize typography overlays, or generate AI artwork for your blog post.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadCover}
                disabled={isRendering}
                className="h-8 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download HD
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyCover}
                disabled={isRendering}
                className="h-8 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-md"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" /> Use Cover Image
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Body: Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Live Interactive Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layout className="h-3.5 w-3.5 text-purple-600" />
                Live Studio Canvas Preview
              </label>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    aspectRatio === '16:9' ? 'bg-background text-purple-600 shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  16:9 Standard
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('21:9')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    aspectRatio === '21:9' ? 'bg-background text-purple-600 shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  21:9 Cinematic Banner
                </button>
              </div>
            </div>

            {/* Visual Canvas Display */}
            <div
              className={`w-full relative rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-xl bg-slate-950 transition-all ${
                aspectRatio === '21:9' ? 'aspect-[21/9]' : 'aspect-[16/9]'
              }`}
            >
              <img
                src={selectedTemplate.imageUrl}
                alt={selectedTemplate.title}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 transition-all"
                style={{
                  background: overlayStyle,
                  opacity: overlayOpacity,
                }}
              />

              <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-between text-white z-10 pointer-events-none">
                {/* Top Badge */}
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-600/90 text-white backdrop-blur-md shadow-md">
                    {categoryBadge || 'BUSINESS GROWTH'}
                  </span>
                </div>

                {/* Center Content */}
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-xl sm:text-3xl lg:text-4xl font-black font-serif text-white drop-shadow-md leading-tight line-clamp-2">
                    {headline || selectedTemplate.headlinePlaceholder}
                  </h2>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-white/90 line-clamp-2 italic font-sans drop-shadow-xs">
                      {subtitle}
                    </p>
                  )}
                </div>

                {/* Footer Brand */}
                <div className="flex items-center justify-between text-[11px] font-bold text-white/70 pt-2 border-t border-white/15">
                  <span>⚡ GGD Ad Network • By {authorTag || 'GGD Creator'}</span>
                  <span>Featured Editorial</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Controls: Template Gallery vs Studio Customizer */}
          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-2xl h-11">
              <TabsTrigger value="gallery" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-purple-600">
                <Layers className="h-3.5 w-3.5" /> 1. Template Gallery ({BLOG_IMAGE_TEMPLATES.length})
              </TabsTrigger>
              <TabsTrigger value="customize" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-purple-600">
                <Sliders className="h-3.5 w-3.5" /> 2. Headline & Style
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-purple-600">
                <Wand2 className="h-3.5 w-3.5" /> 3. Gemini AI Cover
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TEMPLATE GALLERY */}
            <TabsContent value="gallery" className="space-y-4 pt-3">
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {BLOG_TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56 shrink-0">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search templates…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background rounded-xl"
                  />
                </div>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplate.id === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`group relative aspect-[16/9] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                        isSelected
                          ? 'border-purple-600 ring-2 ring-purple-400/50 shadow-purple-500/20'
                          : 'border-border/60 hover:border-purple-500/60'
                      }`}
                    >
                      <img
                        src={tpl.imageUrl}
                        alt={tpl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2.5 flex flex-col justify-between text-white">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs">
                            {tpl.badge}
                          </span>
                          {isSelected && (
                            <span className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                            {tpl.title}
                          </p>
                          <p className="text-[9px] text-white/70 truncate">{tpl.category}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 2: HEADLINE & STYLE CUSTOMIZER */}
            <TabsContent value="customize" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                      <Type className="h-3.5 w-3.5 text-purple-600" /> Headline Title
                    </label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Enter blog cover headline…"
                      className="bg-background h-10 rounded-xl font-bold"
                      maxLength={120}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                      Lead Subtitle (Hook)
                    </label>
                    <Input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Enter secondary hook…"
                      className="bg-background h-10 rounded-xl"
                      maxLength={140}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Category Badge</label>
                      <Input
                        value={categoryBadge}
                        onChange={(e) => setCategoryBadge(e.target.value)}
                        className="bg-background h-10 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground mb-1 block">Author Tag</label>
                      <Input
                        value={authorTag}
                        onChange={(e) => setAuthorTag(e.target.value)}
                        className="bg-background h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">Gradient Overlay Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GRADIENT_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setOverlayStyle(p.grad)}
                          className={`p-2 rounded-xl text-[10px] font-bold text-white border transition-all text-center ${
                            overlayStyle === p.grad ? 'ring-2 ring-purple-600 border-white' : 'border-border/40 opacity-80 hover:opacity-100'
                          }`}
                          style={{ background: p.grad }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: GEMINI AI COVER GENERATOR */}
            <TabsContent value="ai" className="space-y-4 pt-3">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h4 className="text-sm font-bold text-foreground">Gemini AI Cover Artist</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Describe the scene, aesthetic, or 3D object you want as your blog backdrop. Gemini AI will generate a unique high-resolution image in seconds.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 3D holographic gold coins and glowing graph in futuristic glass room"
                    value={aiCustomPrompt}
                    onChange={(e) => setAiCustomPrompt(e.target.value)}
                    className="bg-background h-10 rounded-xl text-xs"
                    disabled={isAiGenerating}
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateAiBg}
                    disabled={isAiGenerating}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold h-10 px-4 shrink-0"
                  >
                    {isAiGenerating ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                    Generate
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-muted/40 border-t border-border/80 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadCover}
              disabled={isRendering}
              className="rounded-xl text-xs font-bold h-10"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download HD Image
            </Button>
            <Button
              type="button"
              onClick={handleApplyCover}
              disabled={isRendering}
              className="rounded-xl text-xs font-bold h-10 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" /> Apply Cover to Article
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogCoverStudioModal;
