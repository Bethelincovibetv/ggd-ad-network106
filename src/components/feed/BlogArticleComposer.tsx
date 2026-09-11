import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Image as ImageIcon, Sparkles, Plus, Trash2, X, Send,
  Loader2, Eye, BookOpen, Clock, Tag, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BlogSection, CommunityBlogPostData, calculateReadTime, getCategoryCover, DEFAULT_CATEGORY_COVERS } from '@/types/blog';
import { generateBlogPost } from '@/services/blogGenerator';
import BlogCreationSuccessModal from '@/components/feed/BlogCreationSuccessModal';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';

const FEATURE_PHOTO_PRESETS = [
  { label: 'Business Growth', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Marketing & Ads', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Tech & Innovation', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Finance & Strategy', url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Store & Products', url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Team & Success', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80' },
];

interface BlogArticleComposerProps {
  userId: string;
  authorProfile?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const PRESET_CATEGORIES = [
  'Business Growth',
  'Marketing & Ads',
  'Tips & Guides',
  'Technology & AI',
  'Product Spotlight',
  'Finance & Wealth',
  'Success Story',
  'Industry News',
];

export const BlogArticleComposer: React.FC<BlogArticleComposerProps> = ({
  userId,
  authorProfile,
  onSuccess,
  onCancel,
}) => {
  const { isEnabled } = useFeatureToggles();
  const isAiDrafterEnabled = isEnabled('blog_ai_drafter');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string | null>(null);

  // Structured Sections
  const [sections, setSections] = useState<BlogSection[]>([
    { heading: 'Introduction & Core Insight', content: '', imageUrl: null, imageAlt: '' },
    { heading: 'Key Strategies for Success', content: '', imageUrl: null, imageAlt: '' },
  ]);
  const [sectionFiles, setSectionFiles] = useState<{ [index: number]: File }>({});

  const [authorNote, setAuthorNote] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTopicPrompt, setAiTopicPrompt] = useState('');
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [publishedBlog, setPublishedBlog] = useState<CommunityBlogPostData | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const coverFileRef = useRef<HTMLInputElement>(null);
  const sectionFileRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const [photoTab, setPhotoTab] = useState<'upload' | 'pexels' | 'presets'>('presets');
  const [pexelsQuery, setPexelsQuery] = useState('business');
  const [pexelsPhotos, setPexelsPhotos] = useState<any[]>([]);
  const [loadingPexels, setLoadingPexels] = useState(false);

  // Search Pexels / Curated Photos
  const handleSearchPexels = async (queryToSearch?: string) => {
    const q = (queryToSearch || pexelsQuery).trim() || 'business';
    setLoadingPexels(true);
    try {
      const res = await fetch(`/api/search-pexels?query=${encodeURIComponent(q)}&per_page=12`);
      const data = await res.json();
      if (data.photos && data.photos.length > 0) {
        setPexelsPhotos(data.photos);
      }
    } catch (e) {
      console.warn('Pexels search note:', e);
    } finally {
      setLoadingPexels(false);
    }
  };

  const handlePickCover = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Cover image must be under 5MB');
      return;
    }
    setCoverFile(f);
    setSelectedPresetUrl(null);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleSelectPresetCover = (url: string) => {
    setCoverFile(null);
    setSelectedPresetUrl(url);
    setCoverPreview(url);
    toast.success('Feature photo selected!');
  };

  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      { heading: `Section ${prev.length + 1}`, content: '', imageUrl: null, imageAlt: '' },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length <= 1) {
      toast.info('A blog post needs at least one section');
      return;
    }
    setSections(prev => prev.filter((_, i) => i !== index));
    const nextFiles = { ...sectionFiles };
    delete nextFiles[index];
    setSectionFiles(nextFiles);
  };

  const handleUpdateSection = (index: number, field: keyof BlogSection, value: any) => {
    setSections(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handlePickSectionImage = (index: number, f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Section image must be under 5MB');
      return;
    }
    const previewUrl = URL.createObjectURL(f);
    setSectionFiles(prev => ({ ...prev, [index]: f }));
    handleUpdateSection(index, 'imageUrl', previewUrl);
  };

  // AI Assistant generator
  const handleAiDraft = async () => {
    const topic = aiTopicPrompt.trim() || title.trim();
    if (!topic) {
      toast.error('Please enter a topic for the AI blog generator');
      return;
    }
    setIsAiGenerating(true);
    try {
      toast.info('✨ Generating comprehensive blog draft with AI...');
      const blog = await generateBlogPost(topic);
      if (blog && blog.title) {
        setTitle(blog.title);
        setSubtitle(blog.metaDescription || '');
        if (blog.sections && blog.sections.length > 0) {
          setSections(
            blog.sections.map(s => ({
              heading: s.heading,
              content: s.content,
              imageUrl: s.imageUrl || null,
              imageAlt: s.imageAlt || s.heading,
            }))
          );
        }
        toast.success('🎉 Blog draft generated! Review and customize below.');
        setShowAiHelper(false);
      }
    } catch (err: any) {
      console.warn('AI blog draft error:', err);
      toast.error('Could not generate AI draft. You can continue writing manually.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Publish Blog Article
  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Please provide an article title');
      return;
    }
    const hasContent = sections.some(s => s.content.trim().length > 0);
    if (!hasContent) {
      toast.error('Please add content to at least one section');
      return;
    }

    setPublishing(true);
    try {
      let coverImageUrl: string | null = null;
      // 1. Upload Cover Image if present
      if (coverFile) {
        const ext = coverFile.name.split('.').pop() || 'jpg';
        const path = `${userId}/blog-covers/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('community-posts')
          .upload(path, coverFile, { upsert: false });
        if (!upErr) {
          coverImageUrl = supabase.storage.from('community-posts').getPublicUrl(path).data.publicUrl;
        } else {
          console.warn('Cover upload fallback:', upErr);
        }
      }

      // 2. Upload any section images
      const processedSections: BlogSection[] = [];
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        let secImageUrl = sec.imageUrl || null;

        if (sectionFiles[i]) {
          const file = sectionFiles[i];
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${userId}/blog-sections/${Date.now()}-${i}.${ext}`;
          const { error: sUpErr } = await supabase.storage
            .from('community-posts')
            .upload(path, file, { upsert: false });
          if (!sUpErr) {
            secImageUrl = supabase.storage.from('community-posts').getPublicUrl(path).data.publicUrl;
          }
        }

        processedSections.push({
          heading: sec.heading.trim(),
          content: sec.content.trim(),
          imageUrl: secImageUrl,
          imageAlt: sec.imageAlt?.trim() || sec.heading.trim(),
        });
      }

      const activeCategory = customCategory.trim() || category;
      const finalCoverImageUrl = coverImageUrl || selectedPresetUrl || getCategoryCover(activeCategory, null);
      const readTime = calculateReadTime({
        title,
        subtitle,
        sections: processedSections,
      });

      // 3. Package Structured Blog Payload
      const blogData: CommunityBlogPostData = {
        is_blog: true,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        category: activeCategory,
        read_time: readTime,
        cover_image: finalCoverImageUrl,
        sections: processedSections,
        author_note: authorNote.trim() || undefined,
        tags: [
          'blog',
          activeCategory.toLowerCase().replace(/[^a-z0-9]/g, ''),
          'article',
        ],
      };

      const tags = Array.from(
        new Set([
          'blog',
          'article',
          activeCategory.toLowerCase().replace(/[^a-z0-9]/g, ''),
        ])
      );

      // 4. Save into community_posts table
      const { data: insertedData, error: insertErr } = await supabase.from('community_posts').insert({
        user_id: userId,
        content: JSON.stringify(blogData),
        image_url: finalCoverImageUrl,
        link_url: null,
        video_url: null,
        background_template: null,
        tags,
      }).select().maybeSingle();

      if (insertErr) throw insertErr;

      setPublishedBlog(blogData);
      setPublishedPostId(insertedData?.id || null);
      setShowSuccessModal(true);
      toast.success('🎉 Congratulations! Your blog article is published!');
    } catch (err: any) {
      console.error('Failed to publish blog:', err);
      toast.error(err.message || 'Failed to publish blog article');
    } finally {
      setPublishing(false);
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setSubtitle('');
    setCategory(PRESET_CATEGORIES[0]);
    setCustomCategory('');
    setCoverFile(null);
    setCoverPreview(null);
    setSections([
      { heading: 'Introduction & Core Insight', content: '', imageUrl: null, imageAlt: '' },
      { heading: 'Key Strategies for Success', content: '', imageUrl: null, imageAlt: '' },
    ]);
    setSectionFiles({});
    setAuthorNote('');
    setShowPreview(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Modes & AI Assistant */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white font-bold text-xs px-3 py-1 border-0">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Professional Blog Post
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Create a publication-ready article with cover & section photos
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAiDrafterEnabled && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAiHelper(s => !s)}
              className="rounded-full text-xs font-bold border-purple-500/30 text-purple-600 hover:bg-purple-500/10 h-8"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-600" />
              {showAiHelper ? 'Close AI Helper' : 'AI Draft Helper'}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowPreview(s => !s)}
            className="rounded-full text-xs font-bold h-8"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            {showPreview ? 'Edit Article' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Optional AI Assistant Panel */}
      {isAiDrafterEnabled && showAiHelper && (
        <Card className="border-purple-500/30 bg-purple-500/5 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-bold text-foreground">AI Blog Article Generator</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAiHelper(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter any topic, product or business theme. Gemini will automatically compose an SEO-ready title, subtitle, and multi-section article with headings and paragraphs.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. How to Gain 1,000 Paying Customers in 30 Days"
                value={aiTopicPrompt}
                onChange={e => setAiTopicPrompt(e.target.value)}
                className="bg-background text-sm h-10 rounded-xl"
                disabled={isAiGenerating}
              />
              <Button
                onClick={handleAiDraft}
                disabled={isAiGenerating || !aiTopicPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl h-10 px-4 shrink-0"
              >
                {isAiGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Generate Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Composer View vs Preview View */}
      {showPreview ? (
        <Card className="border-border rounded-2xl bg-card overflow-hidden shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white font-bold">PREVIEW SHOWPAGE</Badge>
                <span className="text-xs text-muted-foreground">This is how your article will look in the feed</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowPreview(false)}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Edit
              </Button>
            </div>

            {/* Cover Preview */}
            {coverPreview && (
              <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden bg-slate-900 relative">
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <Badge className="bg-purple-600 text-white font-bold text-xs mb-2">
                    {customCategory || category}
                  </Badge>
                  <h1 className="text-2xl sm:text-3xl font-black font-serif">{title || 'Untitled Article'}</h1>
                </div>
              </div>
            )}

            {!coverPreview && (
              <div>
                <Badge className="bg-purple-600 text-white font-bold text-xs mb-2">
                  {customCategory || category}
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-black font-serif text-foreground">
                  {title || 'Untitled Article'}
                </h1>
              </div>
            )}

            {subtitle && (
              <p className="text-base text-muted-foreground italic border-l-4 border-purple-500 pl-4 py-1">
                "{subtitle}"
              </p>
            )}

            {/* Sections */}
            <div className="space-y-6">
              {sections.map((sec, idx) => (
                <div key={idx} className="space-y-3">
                  {sec.heading && (
                    <h2 className="text-xl font-bold font-serif text-foreground">{sec.heading}</h2>
                  )}
                  {sec.imageUrl && (
                    <div className="rounded-xl overflow-hidden border">
                      <img src={sec.imageUrl} alt={sec.imageAlt || sec.heading} className="w-full max-h-96 object-cover" />
                      {sec.imageAlt && <p className="text-xs text-muted-foreground text-center p-2">{sec.imageAlt}</p>}
                    </div>
                  )}
                  <p className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {sec.content || <span className="text-muted-foreground italic">No content in this section yet.</span>}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Cover Photo Drag & Drop / Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-purple-600" />
                Feature Photo (Required Cover Banner)
              </label>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                Guaranteed on Feed
              </span>
            </div>

            <input
              type="file"
              ref={coverFileRef}
              accept="image/*"
              className="hidden"
              onChange={e => handlePickCover(e.target.files?.[0] || null)}
            />

            {coverPreview ? (
              <div className="relative w-full aspect-[21/9] max-h-64 rounded-2xl overflow-hidden border border-border group bg-slate-900 shadow-md">
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => coverFileRef.current?.click()}
                    className="rounded-full text-xs font-bold"
                  >
                    Change Image
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setCoverFile(null);
                      setSelectedPresetUrl(null);
                      setCoverPreview(null);
                    }}
                    className="rounded-full text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mode Tabs */}
                <div className="flex bg-secondary/50 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setPhotoTab('presets')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      photoTab === 'presets' ? 'bg-background shadow-xs text-purple-600' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Curated Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoTab('pexels');
                      if (pexelsPhotos.length === 0) {
                        handleSearchPexels();
                      }
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      photoTab === 'pexels' ? 'bg-background shadow-xs text-purple-600' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🔍 Pexels Stock Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoTab('upload')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      photoTab === 'upload' ? 'bg-background shadow-xs text-purple-600' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Custom Upload
                  </button>
                </div>

                {/* Presets Tab */}
                {photoTab === 'presets' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Tap a high-impact feature photo:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {FEATURE_PHOTO_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPresetCover(preset.url)}
                          className={`group relative aspect-[16/9] rounded-xl overflow-hidden border-2 transition-all text-left ${
                            selectedPresetUrl === preset.url
                              ? 'border-purple-600 ring-2 ring-purple-400 scale-[1.02]'
                              : 'border-border/60 hover:border-purple-500/60'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                            <span className="text-[10px] font-bold text-white line-clamp-1">
                              {preset.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pexels Search Tab */}
                {photoTab === 'pexels' && (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search stock photos (e.g., fashion, tech, business, finance)..."
                        value={pexelsQuery}
                        onChange={e => setPexelsQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearchPexels()}
                        className="bg-background text-xs h-9 rounded-xl"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSearchPexels()}
                        disabled={loadingPexels}
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold h-9 px-3 shrink-0"
                      >
                        {loadingPexels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                      </Button>
                    </div>

                    {loadingPexels ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {pexelsPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => handleSelectPresetCover(photo.url)}
                            className="group relative aspect-[16/9] rounded-xl overflow-hidden border border-border hover:border-purple-600 transition-all text-left"
                          >
                            <img
                              src={photo.thumbnail || photo.url}
                              alt={photo.alt}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5">
                              <span className="text-[9px] text-white/90 truncate">
                                📷 {photo.photographer || 'Pexels'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Upload Tab */}
                {photoTab === 'upload' && (
                  <div
                    onClick={() => coverFileRef.current?.click()}
                    className="w-full border-2 border-dashed border-purple-500/40 hover:border-purple-600 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-purple-500/5 hover:bg-purple-500/10 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Upload Custom Feature Photo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Click or drop banner file (16:9 or 21:9 ratio, up to 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-purple-600" />
              Category / Topic
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    setCustomCategory('');
                  }}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    category === cat && !customCategory
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border-border/60 hover:border-purple-500/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or enter a custom category (e.g. Real Estate Tips, Logistics)..."
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              className="text-xs h-9 bg-muted/20 rounded-xl"
            />
          </div>

          {/* Article Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Article Headline / Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter a compelling, high-converting article title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-base sm:text-lg font-bold font-serif h-12 bg-background border-border rounded-xl"
              maxLength={180}
            />
          </div>

          {/* Subtitle / Hook */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Lead Hook / Subtitle (Summary)
            </label>
            <Textarea
              placeholder="A captivating 1-2 sentence lead paragraph that introduces the story or problem to readers…"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              rows={2}
              className="text-sm bg-background border-border rounded-xl resize-none"
              maxLength={300}
            />
          </div>

          {/* Article Story Sections */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Article Sections (Story & Images)
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAddSection}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Section
              </Button>
            </div>

            <div className="space-y-4">
              {sections.map((sec, idx) => (
                <Card key={idx} className="border border-border/80 bg-card rounded-2xl shadow-sm overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <Input
                          placeholder={`Section ${idx + 1} Subheading (e.g. 1. Why Visuals Matter)...`}
                          value={sec.heading}
                          onChange={e => handleUpdateSection(idx, 'heading', e.target.value)}
                          className="font-bold text-sm bg-muted/20 h-9 rounded-lg"
                        />
                      </div>

                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                          title="Remove Section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Textarea
                      placeholder="Write this section's content. Share actionable advice, insights, or story points..."
                      value={sec.content}
                      onChange={e => handleUpdateSection(idx, 'content', e.target.value)}
                      rows={4}
                      className="text-sm bg-background border-border rounded-xl leading-relaxed"
                    />

                    {/* Section Image Attachment */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <input
                        type="file"
                        ref={el => (sectionFileRefs.current[idx] = el)}
                        accept="image/*"
                        className="hidden"
                        onChange={e => handlePickSectionImage(idx, e.target.files?.[0] || null)}
                      />

                      {sec.imageUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={sec.imageUrl}
                            alt=""
                            className="h-10 w-14 object-cover rounded-lg border"
                          />
                          <Input
                            placeholder="Image caption / alt text…"
                            value={sec.imageAlt || ''}
                            onChange={e => handleUpdateSection(idx, 'imageAlt', e.target.value)}
                            className="h-8 text-xs bg-muted/20 w-48"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateSection(idx, 'imageUrl', null);
                              const copy = { ...sectionFiles };
                              delete copy[idx];
                              setSectionFiles(copy);
                            }}
                            className="text-destructive hover:opacity-80 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => sectionFileRefs.current[idx]?.click()}
                          className="h-8 text-xs rounded-lg border-dashed"
                        >
                          <ImageIcon className="h-3.5 w-3.5 mr-1 text-purple-600" />
                          Attach Photo for Section {idx + 1}
                        </Button>
                      )}

                      <span className="text-[11px] text-muted-foreground">
                        {sec.content ? `${sec.content.split(/\s+/).filter(Boolean).length} words` : '0 words'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddSection}
              className="w-full rounded-xl border-dashed h-10 text-xs font-bold text-purple-600 hover:bg-purple-500/5"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Another Section
            </Button>
          </div>

          {/* Author Note / Call to Action */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
              Author Closing Note / Call to Action (Optional)
            </label>
            <Input
              placeholder="e.g. Looking to elevate your brand? Contact us through our Storefront link above!"
              value={authorNote}
              onChange={e => setAuthorNote(e.target.value)}
              className="text-xs bg-background h-10 rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/80">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={publishing}
          className="w-full sm:w-auto text-xs text-muted-foreground hover:text-foreground rounded-xl h-10 order-2 sm:order-1"
        >
          Cancel
        </Button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(s => !s)}
            disabled={publishing || !title.trim()}
            className="rounded-xl text-xs font-bold h-10 px-4 justify-center"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {showPreview ? 'Edit Article' : 'Preview Article'}
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !title.trim()}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-xs rounded-xl h-10 px-6 shadow-md justify-center sm:min-w-[180px]"
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Publishing…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Publish Blog Article
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Celebration Dialog */}
      <BlogCreationSuccessModal
        open={showSuccessModal}
        onOpenChange={(isOpen) => {
          setShowSuccessModal(isOpen);
          if (!isOpen) {
            onSuccess();
          }
        }}
        blog={publishedBlog}
        postId={publishedPostId}
        onViewFeed={() => {
          onSuccess();
        }}
        onCreateAnother={() => {
          handleResetForm();
        }}
      />
    </div>
  );
};
export default BlogArticleComposer;
