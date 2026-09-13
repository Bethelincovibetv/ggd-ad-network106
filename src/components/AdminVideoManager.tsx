import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Video, Loader2, Edit3, Play, CheckCircle2, 
  ExternalLink, Search, Sparkles, Filter, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const VIDEO_SECTION_OPTIONS = [
  // Create Pages
  { value: 'create_ad', label: 'Create Ad Page (Banner & Video Ads)', group: 'Create Pages' },
  { value: 'create_task', label: 'Create Credit Task Page', group: 'Create Pages' },
  { value: 'create_blog', label: 'Create Blog Article Page', group: 'Create Pages' },
  { value: 'create_funnel', label: 'Create Marketing Funnel & App', group: 'Create Pages' },
  { value: 'create_syndicate', label: 'Create Syndicate Campaign', group: 'Create Pages' },
  { value: 'create_business', label: 'Create Business Listing', group: 'Create Pages' },

  // Guide Page & Specific Sections
  { value: 'guide', label: 'Main GGD Guide (Top Overview)', group: 'Guide & Sections' },
  { value: 'guide_getting_started', label: 'Guide: Getting Started & Growth', group: 'Guide & Sections' },
  { value: 'guide_directory', label: 'Guide: Business Directory & Discovery', group: 'Guide & Sections' },
  { value: 'guide_products', label: 'Guide: Products & Services Storefront', group: 'Guide & Sections' },
  { value: 'guide_ads', label: 'Guide: Banner Ads & Commercial Ads', group: 'Guide & Sections' },
  { value: 'guide_slider', label: 'Guide: Featured Slider vs Banner Ads', group: 'Guide & Sections' },
  { value: 'guide_syndicate', label: 'Guide: Syndicate Promoter Network', group: 'Guide & Sections' },
  { value: 'guide_tasks', label: 'Guide: Credit Tasks & Watch to Earn', group: 'Guide & Sections' },
  { value: 'guide_blog', label: 'Guide: Blog Creator & AI Drafter', group: 'Guide & Sections' },
  { value: 'guide_community', label: 'Guide: Community Feed & Networking', group: 'Guide & Sections' },
  { value: 'guide_wallet', label: 'Guide: Wallet, Credits & Payouts', group: 'Guide & Sections' },
  { value: 'guide_apps', label: 'Guide: Marketing Tools & Smart Links', group: 'Guide & Sections' },
  { value: 'guide_profile', label: 'Guide: Account & Security Best Practices', group: 'Guide & Sections' },
  { value: 'admin_guide', label: 'Admin Command Console Guide', group: 'Guide & Sections' },

  // General App Pages
  { value: 'homepage', label: 'Homepage Video Placement', group: 'General Pages' },
  { value: 'about', label: 'About GGD Platform Video', group: 'General Pages' },
  { value: 'business', label: 'Business Growth Hub', group: 'General Pages' },
  { value: 'syndicate', label: 'Syndicate Member Portal', group: 'General Pages' },
];

const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const AdminVideoManager = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  
  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    youtube_url: '',
    section: 'create_ad',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotional_videos' as any)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn("Failed to fetch promotional videos:", error);
    }
    setVideos(data || []);
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      title: '',
      youtube_url: '',
      section: 'create_ad',
      description: '',
      is_active: true,
      sort_order: (videos.length + 1) * 10,
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (v: any) => {
    setEditingId(v.id);
    setForm({
      title: v.title || '',
      youtube_url: v.youtube_url || '',
      section: v.section || 'create_ad',
      description: v.description || '',
      is_active: v.is_active !== false,
      sort_order: v.sort_order || 0,
    });
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Please enter a video title");
      return;
    }
    if (!form.youtube_url.trim()) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    const ytid = getYouTubeId(form.youtube_url);
    if (!ytid) {
      toast.error("Could not extract YouTube video ID. Ensure URL is valid (e.g. https://www.youtube.com/watch?v=...)");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('promotional_videos' as any)
          .update({
            title: form.title.trim(),
            youtube_url: form.youtube_url.trim(),
            section: form.section,
            description: form.description?.trim() || null,
            is_active: form.is_active,
            sort_order: Number(form.sort_order) || 0,
          } as any)
          .eq('id', editingId);

        if (error) throw error;
        toast.success("Video updated successfully!");
      } else {
        // Insert
        const { error } = await supabase
          .from('promotional_videos' as any)
          .insert({
            title: form.title.trim(),
            youtube_url: form.youtube_url.trim(),
            section: form.section,
            description: form.description?.trim() || null,
            is_active: form.is_active,
            sort_order: Number(form.sort_order) || 0,
          } as any);

        if (error) throw error;
        toast.success("New video added successfully!");
      }

      setIsEditorOpen(false);
      fetchVideos();
    } catch (err: any) {
      toast.error(err.message || "Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    // Optimistic
    setVideos(prev => prev.map(v => v.id === id ? { ...v, is_active: !current } : v));
    const { error } = await supabase
      .from('promotional_videos' as any)
      .update({ is_active: !current } as any)
      .eq('id', id);

    if (error) {
      toast.error("Failed to update status");
      fetchVideos();
    } else {
      toast.success(current ? "Video deactivated" : "Video activated");
    }
  };

  const deleteVideo = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const { error } = await supabase.from('promotional_videos' as any).delete().eq('id', id);
    if (error) {
      toast.error("Failed to delete video");
    } else {
      toast.success("Video deleted!");
      fetchVideos();
    }
  };

  const previewId = getYouTubeId(form.youtube_url);

  const filteredVideos = videos.filter(v => {
    const matchesSearch = !search || 
      v.title?.toLowerCase().includes(search.toLowerCase()) ||
      v.section?.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterGroup === 'create') {
      return v.section?.startsWith('create_');
    }
    if (filterGroup === 'guide') {
      return v.section?.startsWith('guide') || v.section === 'admin_guide';
    }
    if (filterGroup === 'general') {
      return !v.section?.startsWith('create_') && !v.section?.startsWith('guide') && v.section !== 'admin_guide';
    }

    return true;
  });

  const getSectionLabel = (sec: string) => {
    const opt = VIDEO_SECTION_OPTIONS.find(o => o.value === sec);
    return opt ? opt.label : sec;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with 3D Aesthetics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 p-5 rounded-2xl text-white shadow-[0_8px_20px_-6px_rgba(225,29,72,0.4)]">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
            <Video className="h-6 w-6 text-white drop-shadow" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black drop-shadow-xs">App & Guide Video Manager</h2>
            <p className="text-xs text-white/90 font-medium">
              Configure and edit tutorial videos for Create Pages, Guide sections, and Homepage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchVideos}
            variant="outline"
            size="sm"
            className="h-10 bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="h-10 bg-white text-rose-700 hover:bg-white/90 font-bold px-4 rounded-xl shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Video
          </Button>
        </div>
      </div>

      {/* Editor Modal / Card */}
      {isEditorOpen && (
        <Card className="border-2 border-red-500/30 bg-card shadow-xl rounded-2xl overflow-hidden animate-in fade-in-50 duration-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-b border-border p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-sm">
                  {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {editingId ? "Edit Video Placement" : "Add Video Placement"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose which Create Page or Guide Section will display this video
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditorOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-foreground">Video Title *</Label>
                  <Input
                    placeholder="e.g. How to Create High-Converting Banner Ads"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">YouTube Video URL *</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={form.youtube_url}
                    onChange={e => setForm({ ...form, youtube_url: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Supports standard YouTube links, Shorts, and youtu.be shortlinks.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Target Page / Section Placement *</Label>
                  <Select
                    value={form.section}
                    onValueChange={v => setForm({ ...form, section: v })}
                  >
                    <SelectTrigger className="mt-1.5 h-11 rounded-xl font-medium">
                      <SelectValue placeholder="Select target placement" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {['Create Pages', 'Guide & Sections', 'General Pages'].map(grp => (
                        <div key={grp} className="py-1">
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground bg-muted/40">
                            {grp}
                          </div>
                          {VIDEO_SECTION_OPTIONS.filter(o => o.group === grp).map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold py-2">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Description / Guide Note (Optional)</Label>
                  <Textarea
                    placeholder="Brief explanation shown below the video player..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="mt-1.5 min-h-[80px] rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <Label className="text-xs font-bold">Active & Displaying</Label>
                    <p className="text-[11px] text-muted-foreground">Show this video on the target page immediately</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={v => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="flex flex-col rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 text-red-500" /> Live Preview
                  </span>
                  {previewId && (
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      Video ID: {previewId}
                    </Badge>
                  )}
                </div>

                {previewId ? (
                  <div className="relative w-full rounded-xl overflow-hidden shadow-md bg-black" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${previewId}?rel=0`}
                      title={form.title || 'Video Preview'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-[180px] rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <Video className="h-8 w-8 mb-2 opacity-40 text-red-500" />
                    <p className="text-xs font-medium">Enter a valid YouTube URL to preview the video</p>
                  </div>
                )}

                {form.title && (
                  <div className="p-3 bg-card rounded-xl border border-border/60">
                    <p className="text-xs font-bold text-foreground">{form.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Target: <strong className="text-foreground">{getSectionLabel(form.section)}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                className="h-11 px-5 rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-11 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md hover:opacity-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {editingId ? "Save Changes" : "Publish Video"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or page..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-muted/40"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Videos' },
            { id: 'create', label: 'Create Pages' },
            { id: 'guide', label: 'Guide & Sections' },
            { id: 'general', label: 'General Pages' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterGroup(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterGroup === tab.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Video Catalogue List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVideos.map((v: any) => {
          const ytid = getYouTubeId(v.youtube_url);
          const thumb = ytid ? `https://img.youtube.com/vi/${ytid}/mqdefault.jpg` : null;

          return (
            <Card
              key={v.id}
              className={`overflow-hidden rounded-2xl border transition-all hover:shadow-md ${
                v.is_active ? 'border-border bg-card' : 'border-border/60 bg-muted/30 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Thumbnail Preview */}
                <div className="sm:w-44 h-32 relative bg-black shrink-0 overflow-hidden group">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={v.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Video className="h-8 w-8 text-red-500 opacity-60" />
                    </div>
                  )}
                  <a
                    href={v.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="h-10 w-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="h-5 w-5 ml-0.5 fill-white" />
                    </div>
                  </a>
                </div>

                {/* Video Info */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] font-bold bg-muted/60 text-foreground">
                        {getSectionLabel(v.section)}
                      </Badge>
                      <Badge className={v.is_active ? "bg-emerald-600 text-white text-[9px]" : "bg-muted text-muted-foreground text-[9px]"}>
                        {v.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{v.title}</h3>
                    {v.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {v.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={v.is_active}
                        onCheckedChange={() => toggleActive(v.id, v.is_active)}
                        className="scale-90"
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {v.is_active ? 'Live' : 'Off'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(v)}
                        className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 text-foreground"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                        Edit
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteVideo(v.id, v.title)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>

      {!loading && filteredVideos.length === 0 && (
        <Card className="border-dashed border-2 border-border p-10 text-center rounded-2xl bg-muted/20">
          <Video className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No videos found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search ? "No videos match your search term." : "Click 'Add Video' above to configure videos for Create Pages or Guide sections."}
          </p>
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="mt-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-xs rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add First Video
          </Button>
        </Card>
      )}
    </div>
  );
};

export default AdminVideoManager;
