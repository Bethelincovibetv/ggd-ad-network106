import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  X,
  Loader2,
  Image as ImageIcon,
  Palette,
  Tag,
  Link2,
  Video,
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CommunityBlogPostData, parseBlogPost, serializeBlogPost, BlogSection } from '@/types/blog';

export interface Template {
  id: string;
  name: string;
  background: string;
  textColor: string;
}

export const TEMPLATES: Template[] = [
  { id: 'gradient-orange', name: 'Sunset Glow', background: 'linear-gradient(135deg, #ff7a18, #af002d 90%)', textColor: 'text-white' },
  { id: 'gradient-purple', name: 'Neon Purple', background: 'linear-gradient(135deg, #7F00FF, #E100FF)', textColor: 'text-white' },
  { id: 'gradient-blue', name: 'Deep Ocean', background: 'linear-gradient(135deg, #0052D4, #4364F7, #6FB1FC)', textColor: 'text-white' },
  { id: 'gradient-emerald', name: 'Emerald Forest', background: 'linear-gradient(135deg, #0ba360, #3cba92)', textColor: 'text-white' },
  { id: 'gradient-fire', name: 'Electric Flame', background: 'linear-gradient(135deg, #f12711, #f5af19)', textColor: 'text-white' },
  { id: 'gradient-dark', name: 'Midnight Pitch', background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', textColor: 'text-white' },
];

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: any | null;
  onPostUpdated: (updatedPost: any) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  open,
  onOpenChange,
  post,
  onPostUpdated,
}) => {
  // Normal post state
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Blog post state
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSubtitle, setBlogSubtitle] = useState('');
  const [blogCategory, setBlogCategory] = useState('Business Growth');
  const [blogSections, setBlogSections] = useState<BlogSection[]>([]);
  const [blogAuthorNote, setBlogAuthorNote] = useState('');
  const [blogCoverUrl, setBlogCoverUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blogData = useMemo(() => (post?.content ? parseBlogPost(post.content) : null), [post?.content]);
  const isBlog = Boolean(blogData);

  // Initialize state when post changes or modal opens
  useEffect(() => {
    if (!post) return;
    if (blogData) {
      setBlogTitle(blogData.title || '');
      setBlogSubtitle(blogData.subtitle || '');
      setBlogCategory(blogData.category || 'Business Growth');
      setBlogSections(blogData.sections || []);
      setBlogAuthorNote(blogData.author_note || '');
      setBlogCoverUrl(blogData.cover_image || post.image_url || null);
    } else {
      setContent(post.content || '');
      setTags(Array.isArray(post.tags) ? post.tags : []);
      setTemplateId(post.background_template || null);
      setImageUrl(post.image_url || null);
      setImagePreview(post.image_url || null);
      setLinkUrl(post.link_url || '');
      setVideoUrl(post.video_url || '');
    }
  }, [post, blogData, open]);

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handlePickImage = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setTemplateId(null); // Templates only work with text-only posts
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
  };

  const handleUpdateSection = (index: number, field: keyof BlogSection, value: any) => {
    setBlogSections(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddSection = () => {
    setBlogSections(prev => [
      ...prev,
      { heading: `Section ${prev.length + 1}`, content: '', imageUrl: null, imageAlt: '' },
    ]);
  };

  const handleRemoveSection = (index: number) => {
    if (blogSections.length <= 1) {
      toast.error('A blog post must have at least one section');
      return;
    }
    setBlogSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;

      // If user uploaded a new image file
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `posts/${post.user_id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('community_media')
          .upload(path, imageFile, { upsert: true });

        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('community_media').getPublicUrl(path);
          finalImageUrl = pub.publicUrl;
        } else {
          // Fallback to task-proofs bucket if community_media not configured
          const fallbackPath = `posts_${Date.now()}.${ext}`;
          const { error: fbErr } = await supabase.storage
            .from('task-proofs')
            .upload(fallbackPath, imageFile, { upsert: true });
          if (!fbErr) {
            const { data: pub } = supabase.storage.from('task-proofs').getPublicUrl(fallbackPath);
            finalImageUrl = pub.publicUrl;
          }
        }
      }

      let updatedContent = content.trim();
      let updatedTemplate = templateId;
      const nowIso = new Date().toISOString();

      if (isBlog) {
        if (!blogTitle.trim()) {
          toast.error('Blog title cannot be empty');
          setSaving(false);
          return;
        }
        const updatedBlog: CommunityBlogPostData = {
          title: blogTitle.trim(),
          subtitle: blogSubtitle.trim(),
          category: blogCategory,
          cover_image: blogCoverUrl || finalImageUrl,
          sections: blogSections.map(s => ({
            heading: s.heading.trim(),
            content: s.content.trim(),
            imageUrl: s.imageUrl || null,
            imageAlt: s.imageAlt || '',
          })),
          author_note: blogAuthorNote.trim() || undefined,
          read_time: blogData?.read_time || '3 min read',
        };
        updatedContent = serializeBlogPost(updatedBlog);
        updatedTemplate = null;
      } else {
        if (!updatedContent && !finalImageUrl && !videoUrl.trim() && !linkUrl.trim()) {
          toast.error('Post cannot be completely empty');
          setSaving(false);
          return;
        }
      }

      const updatePayload: any = {
        content: updatedContent,
        tags: tags,
        background_template: finalImageUrl ? null : updatedTemplate,
        image_url: finalImageUrl,
        link_url: linkUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        updated_at: nowIso,
      };

      const { error } = await supabase
        .from('community_posts')
        .update(updatePayload)
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully!');
      onPostUpdated({
        ...post,
        ...updatePayload,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to update post: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const activeTemplate = templateId ? TEMPLATES.find(t => t.id === templateId) : null;

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-card">
        <DialogHeader className="p-4 border-b border-border/50 sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {isBlog ? (
                <>
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Edit Blog Article
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Edit Community Post
                </>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {isBlog ? (
            /* Blog Editor Form */
            <div className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold text-foreground">Article Title</Label>
                <Input
                  value={blogTitle}
                  onChange={e => setBlogTitle(e.target.value)}
                  placeholder="Article Headline..."
                  className="mt-1 font-bold text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Subtitle / Summary</Label>
                <Input
                  value={blogSubtitle}
                  onChange={e => setBlogSubtitle(e.target.value)}
                  placeholder="Brief introductory summary..."
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Category</Label>
                <Input
                  value={blogCategory}
                  onChange={e => setBlogCategory(e.target.value)}
                  placeholder="e.g. Business Growth, Marketing..."
                  className="mt-1 text-xs"
                />
              </div>

              {/* Sections Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black text-foreground">Article Sections</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddSection}
                    className="h-7 text-xs font-bold rounded-lg"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Section
                  </Button>
                </div>

                {blogSections.map((sec, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={sec.heading}
                        onChange={e => handleUpdateSection(idx, 'heading', e.target.value)}
                        placeholder={`Section ${idx + 1} Heading`}
                        className="h-8 text-xs font-bold bg-background"
                      />
                      {blogSections.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSection(idx)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={sec.content}
                      onChange={e => handleUpdateSection(idx, 'content', e.target.value)}
                      placeholder="Write this section's body content..."
                      rows={3}
                      className="text-xs bg-background"
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">Author Note / Call to Action (Optional)</Label>
                <Input
                  value={blogAuthorNote}
                  onChange={e => setBlogAuthorNote(e.target.value)}
                  placeholder="e.g. Contact us at 080... or visit our store"
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          ) : (
            /* Standard Post Editor Form */
            <div className="space-y-3.5">
              {/* Main Content Area */}
              <div>
                <Label className="text-xs font-bold text-foreground mb-1 block">Post Text Content</Label>
                {activeTemplate && !imagePreview ? (
                  <div
                    className="rounded-xl p-4 min-h-[140px] flex items-center justify-center relative transition-all"
                    style={{ background: activeTemplate.background }}
                  >
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="What's on your mind?..."
                      className={`w-full bg-transparent border-0 resize-none text-center font-extrabold text-base focus:outline-none placeholder:text-white/60 ${activeTemplate.textColor}`}
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={() => setTemplateId(null)}
                      className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition"
                      title="Clear Background Style"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="What's on your mind?..."
                    rows={4}
                    className="text-sm font-normal rounded-xl border border-input focus-visible:ring-1 focus-visible:ring-orange-500"
                  />
                )}
              </div>

              {/* Background Templates Picker */}
              {!imagePreview && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Palette className="h-3.5 w-3.5" /> Background Canvas Style
                    </Label>
                    {templateId && (
                      <button
                        type="button"
                        onClick={() => setTemplateId(null)}
                        className="text-[10px] text-orange-600 font-bold hover:underline"
                      >
                        Reset to Plain
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateId(t.id)}
                        className={`h-7 w-7 rounded-lg shrink-0 border-2 transition-transform hover:scale-105 ${
                          templateId === t.id ? 'border-orange-500 scale-110 shadow-sm' : 'border-transparent'
                        }`}
                        style={{ background: t.background }}
                        title={t.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Image Preview & Upload */}
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
                  <img
                    src={imagePreview}
                    alt="Post media preview"
                    className="w-full max-h-56 object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 h-7 px-2 text-xs rounded-full shadow-md"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remove Image
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handlePickImage(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9 text-xs font-semibold rounded-xl border-dashed"
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                    Attach / Change Image
                  </Button>
                </div>
              )}

              {/* Links & Video URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Link2 className="h-3 w-3" /> Web Link (Optional)
                  </Label>
                  <Input
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                    <Video className="h-3 w-3" /> Video / YouTube URL
                  </Label>
                  <Input
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Tags Manager */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags / Topics
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tag and press Enter (e.g. deals)"
                    className="h-8 text-xs rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddTag}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg"
                  >
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tags.map(t => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 rounded-full flex items-center gap-1"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/50 sticky bottom-0 bg-card flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 px-4 text-xs font-semibold rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 text-xs font-bold rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostModal;
