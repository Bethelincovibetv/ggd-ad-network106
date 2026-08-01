import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Image as ImageIcon, Link2, Video, Loader2, Send, Trash2,
  MessageCircle, ThumbsUp, X, Palette, Search, Heart,
  Coins, Gift, Youtube, Share2, ArrowRight, PenLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { POST_TEMPLATES, TEMPLATE_CATEGORIES, findTemplate, extractHashtags } from '@/lib/postTemplates';
import EmojiReactionBar from '@/components/EmojiReactionBar';
import { getOrCreateTaskShareUrl } from '@/lib/taskShare';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';

type Reaction = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

const REACTIONS: { key: Reaction; emoji: string; label: string }[] = [
  { key: 'like',  emoji: '👍', label: 'Like' },
  { key: 'love',  emoji: '❤️', label: 'Love' },
  { key: 'haha',  emoji: '😂', label: 'Haha' },
  { key: 'wow',   emoji: '😮', label: 'Wow' },
  { key: 'sad',   emoji: '😢', label: 'Sad' },
  { key: 'angry', emoji: '😡', label: 'Angry' },
];

const reactionEmoji = (r: Reaction | null) => REACTIONS.find(x => x.key === r)?.emoji || '👍';

interface PostAuthor {
  user_id: string;
  display_name: string | null;
  business_name: string | null;
  business_logo_url: string | null;
  avatar_url: string | null;
  business_slug: string | null;
}
interface Post {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  video_url: string | null;
  background_template: string | null;
  tags: string[] | null;
  created_at: string;
  author?: PostAuthor;
  reactions: Record<Reaction, number>;
  myReaction: Reaction | null;
  commentCount: number;
}

const ytEmbed = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {}
  return null;
};

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
};

// Share destinations reused for Credit Task posts inside the feed.
const FEED_SHARE_PLATFORMS = [
  { key: 'whatsapp', label: 'WhatsApp', build: (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
  { key: 'facebook', label: 'Facebook', build: (_t: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: 'telegram', label: 'Telegram', build: (text: string, url: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { key: 'twitter', label: 'X / Twitter', build: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
];

// Render content with hashtags as clickable chips.
const RichContent: React.FC<{ text: string; onTagClick: (tag: string) => void; className?: string }> = ({ text, onTagClick, className }) => {
  const parts = text.split(/(#[\p{L}0-9_]{2,40})/gu);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('#')) {
          const tag = p.slice(1);
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onTagClick(tag.toLowerCase()); }}
              className="text-orange-600 font-semibold hover:underline"
            >
              #{tag}
            </button>
          );
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </span>
  );
};

interface CommunityFeedProps {
  onNavigate?: (tab: string) => void;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [me, setMe] = useState<{ id: string; profile?: PostAuthor } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [taskPosts, setTaskPosts] = useState<any[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [credits, setCredits] = useState(0);
  const [shareTarget, setShareTarget] = useState<any | null>(null);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTplCategory, setActiveTplCategory] = useState<string>(TEMPLATE_CATEGORIES[0]);
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, display_name, business_name, business_logo_url, avatar_url, business_slug, credits')
        .eq('user_id', user.id)
        .maybeSingle();
      setMe({ id: user.id, profile: (profile as any) || undefined });
      setCredits((profile as any)?.credits || 0);
    }
    await loadFeed(user?.id);
    await loadTasks(user?.id);
  };

  // Credit Tasks are surfaced inside the community feed while remaining in the
  // Task Feed. Reuses the existing tasks table / rules (no new task system).
  const loadTasks = async (userId?: string) => {
    if (!userId) { setTaskPosts([]); return; }
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .neq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setTaskPosts(data || []);
    const { data: comps } = await supabase.from('task_completions').select('task_id').eq('user_id', userId);
    setCompletedTaskIds((comps || []).map((c: any) => c.task_id));
  };

  // Same share → verify → reward flow used by the Task Feed.
  const startTaskVerification = async (task: any, platformKey: string) => {
    const platform = FEED_SHARE_PLATFORMS.find(p => p.key === platformKey);
    setShareTarget(null);
    if (!platform) return;
    const smartUrl = (await getOrCreateTaskShareUrl(task.id)) || task.share_url || '';
    const text = `${task.title}${task.description ? ` — ${task.description}` : ''}`;
    window.open(platform.build(text, smartUrl), '_blank', 'noopener,noreferrer');

    setVerifyingTaskId(task.id);
    toast.info('⏳ Sharing... Verifying in 15 seconds. Stay on the share page!', { duration: 15000 });
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setVerifyingTaskId(null); return; }
      const { error } = await supabase.from('task_completions').insert({ task_id: task.id, user_id: user.id });
      if (error) {
        setVerifyingTaskId(null);
        if (error.code === '23505') { toast.info('Already completed!'); return; }
        toast.error('Failed to complete task');
        return;
      }
      await supabase.from('tasks').update({ completions_count: (task.completions_count || 0) + 1 }).eq('id', task.id);
      if (task.max_completions && (task.completions_count || 0) + 1 >= task.max_completions) {
        await supabase.from('tasks').update({ is_active: false }).eq('id', task.id);
      }
      const updated = credits + (task.reward_credits || 0);
      await supabase.from('profiles').update({ credits: updated }).eq('user_id', user.id);
      setCredits(updated);
      setCompletedTaskIds(prev => [...prev, task.id]);
      setVerifyingTaskId(null);
      toast.success(`🎉 Earned ${task.reward_credits} credits!`);
      loadTasks(user.id);
    }, 15000);
  };

  const loadFeed = async (userId?: string) => {
    setLoading(true);
    const { data: rawPosts } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const list = rawPosts || [];
    const ids = list.map(p => p.id);
    const userIds = Array.from(new Set(list.map(p => p.user_id)));

    const [{ data: authors }, { data: reactions }, { data: comments }] = await Promise.all([
      userIds.length
        ? supabase.from('profiles')
            .select('user_id, display_name, business_name, business_logo_url, avatar_url, business_slug')
            .in('user_id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from('post_reactions').select('post_id, user_id, reaction').in('post_id', ids)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from('post_comments').select('post_id').in('post_id', ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const authorMap = new Map((authors || []).map((a: any) => [a.user_id, a]));
    const enriched: Post[] = list.map((p: any) => {
      const counts: Record<Reaction, number> = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
      let mine: Reaction | null = null;
      (reactions || []).filter((r: any) => r.post_id === p.id).forEach((r: any) => {
        counts[r.reaction as Reaction] = (counts[r.reaction as Reaction] || 0) + 1;
        if (userId && r.user_id === userId) mine = r.reaction;
      });
      return {
        ...p,
        author: authorMap.get(p.user_id),
        reactions: counts,
        myReaction: mine,
        commentCount: (comments || []).filter((c: any) => c.post_id === p.id).length,
      };
    });

    setPosts(enriched);
    setLoading(false);
  };

  const onPickImage = (f: File | null) => {
    if (!f) { setImageFile(null); setImagePreview(null); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    // Disable template when an image is attached — templates are for text posts.
    setTemplateId(null);
  };

  const submitPost = async () => {
    if (!me) { toast.error('Please sign in to post'); return; }
    const text = content.trim();
    if (!text && !imageFile && !linkUrl.trim() && !videoUrl.trim()) {
      toast.error('Add some text, an image, a link or a video');
      return;
    }
    setPosting(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const path = `${me.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('community-posts').upload(path, imageFile, { upsert: false });
        if (upErr) throw upErr;
        image_url = supabase.storage.from('community-posts').getPublicUrl(path).data.publicUrl;
      }
      const tags = extractHashtags(text);
      const { error } = await supabase.from('community_posts').insert({
        user_id: me.id,
        content: text || null,
        image_url,
        link_url: linkUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        background_template: image_url ? null : templateId,
        tags,
      });
      if (error) throw error;
      setContent(''); setLinkUrl(''); setVideoUrl('');
      setShowLink(false); setShowVideo(false);
      setTemplateId(null);
      onPickImage(null);
      toast.success('Posted!');
      await loadFeed(me.id);
    } catch (e: any) {
      toast.error(e.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const react = async (post: Post, reaction: Reaction) => {
    if (!me) { toast.error('Please sign in to react'); return; }
    const same = post.myReaction === reaction;

    setPosts(prev => prev.map(p => {
      if (p.id !== post.id) return p;
      const counts = { ...p.reactions };
      if (p.myReaction) counts[p.myReaction] = Math.max(0, counts[p.myReaction] - 1);
      if (!same) counts[reaction] = (counts[reaction] || 0) + 1;
      return { ...p, reactions: counts, myReaction: same ? null : reaction };
    }));

    if (same) {
      await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', me.id);
    } else {
      await supabase.from('post_reactions').upsert(
        { post_id: post.id, user_id: me.id, reaction },
        { onConflict: 'post_id,user_id' },
      );
    }
  };

  const deletePost = async (post: Post) => {
    if (!confirm('Delete this post?')) return;
    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
    if (error) return toast.error(error.message);
    setPosts(prev => prev.filter(p => p.id !== post.id));
    toast.success('Post deleted');
  };

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (activeTag) list = list.filter(p => (p.tags || []).map(t => t.toLowerCase()).includes(activeTag));
    const q = filterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        (p.content || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (p.author?.business_name || p.author?.display_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [posts, filterQuery, activeTag]);

  const visibleTasks = useMemo(() => {
    if (activeTag) return [];
    const q = filterQuery.trim().toLowerCase();
    if (!q) return taskPosts;
    return taskPosts.filter(t =>
      (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [taskPosts, filterQuery, activeTag]);

  // Merged chronological feed of community posts + credit task posts.
  const feedItems = useMemo(() => {
    const items: { kind: 'post' | 'task'; created_at: string; data: any }[] = [
      ...visiblePosts.map(p => ({ kind: 'post' as const, created_at: p.created_at, data: p })),
      ...visibleTasks.map(t => ({ kind: 'task' as const, created_at: t.created_at, data: t })),
    ];
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [visiblePosts, visibleTasks]);

  const myAvatar = me?.profile?.business_logo_url || me?.profile?.avatar_url;
  const myName = me?.profile?.business_name || me?.profile?.display_name || 'You';
  const activeTpl = findTemplate(templateId);

  return (
    <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          placeholder="Search posts, #hashtags, businesses…"
          className="pl-9 h-10 rounded-full bg-muted/40 border-0"
        />
        {activeTag && (
          <button
            onClick={() => setActiveTag(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full"
          >
            #{activeTag} <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Composer */}
      {me ? (
        !composerOpen ? (
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Create</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setComposerOpen(true)}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 hover:border-orange-500/50 p-3 text-left transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center shrink-0">
                    <PenLine className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">Normal Post</p>
                    <p className="text-[11px] text-muted-foreground">Share an update with the community</p>
                  </div>
                </button>
                <button
                  onClick={() => (onNavigate ? onNavigate('tasks') : toast.info('Open the Task Feed to create a credit task'))}
                  className="flex items-center gap-3 rounded-2xl border border-green-500/40 hover:border-green-500/70 p-3 text-left transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Credit Task</p>
                    <p className="text-[11px] text-muted-foreground">Pay users to share your link or YouTube video</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-3 space-y-3">
            <div className="flex gap-2 items-start">
              <Avatar className="h-10 w-10 flex-shrink-0">
                {myAvatar && <AvatarImage src={myAvatar} alt={myName} />}
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-sm font-bold">
                  {myName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {activeTpl && !imagePreview ? (
                <div
                  className="flex-1 rounded-xl flex items-center justify-center min-h-[140px] p-4 relative overflow-hidden"
                  style={{ background: activeTpl.background }}
                >
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Type something…"
                    rows={3}
                    maxLength={300}
                    className={`w-full bg-transparent border-0 outline-none text-center font-bold text-lg sm:text-xl resize-none placeholder:opacity-70 ${activeTpl.textColor}`}
                  />
                  <button
                    onClick={() => setTemplateId(null)}
                    type="button"
                    className="absolute top-1.5 right-1.5 bg-black/40 text-white rounded-full p-1"
                    aria-label="Remove template"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={`What's on your mind, ${myName.split(' ')[0]}? Use #hashtags to be discovered.`}
                  rows={2}
                  className="flex-1 resize-none border-muted bg-muted/30"
                  maxLength={2000}
                />
              )}
            </div>

            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="" className="w-full max-h-72 object-cover rounded-lg" />
                <button
                  onClick={() => onPickImage(null)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {showLink && (
              <Input placeholder="https://your-link.com" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
            )}
            {showVideo && (
              <Input placeholder="YouTube / Vimeo URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            )}

            {/* Template picker */}
            {showTemplatePicker && !imagePreview && (
              <div className="border rounded-xl p-2 bg-muted/30">
                <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveTplCategory(cat)}
                      className={`flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full ${
                        activeTplCategory === cat
                          ? 'bg-orange-500 text-white'
                          : 'bg-background text-muted-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-1">
                  <button
                    onClick={() => setTemplateId(null)}
                    className={`aspect-square rounded-lg border-2 flex items-center justify-center text-[10px] font-bold ${
                      !templateId ? 'border-orange-500 text-orange-500' : 'border-border text-muted-foreground'
                    }`}
                  >
                    None
                  </button>
                  {POST_TEMPLATES.filter(t => t.category === activeTplCategory).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={`aspect-square rounded-lg border-2 overflow-hidden relative ${
                        templateId === t.id ? 'border-orange-500 ring-2 ring-orange-300' : 'border-transparent'
                      }`}
                      style={{ background: t.background }}
                      title={t.name}
                    >
                      <span className={`absolute inset-x-0 bottom-0 text-[9px] font-bold py-0.5 bg-black/30 ${t.textColor}`}>
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex gap-0.5 flex-wrap">
                <input
                  type="file" ref={fileRef} accept="image/*" className="hidden"
                  onChange={e => onPickImage(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => fileRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-1 text-green-600" /> <span className="text-xs">Photo</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2"
                        onClick={() => setShowTemplatePicker(s => !s)}>
                  <Palette className="h-4 w-4 mr-1 text-fuchsia-500" /> <span className="text-xs">Theme</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setShowLink(s => !s)}>
                  <Link2 className="h-4 w-4 mr-1 text-blue-600" /> <span className="text-xs">Link</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setShowVideo(s => !s)}>
                  <Video className="h-4 w-4 mr-1 text-red-600" /> <span className="text-xs">Video</span>
                </Button>
              </div>
              <Button onClick={submitPost} disabled={posting} size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full px-4">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />Post</>}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
        )
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Sign in to share posts with the community.
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" /></div>
      ) : feedItems.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {filterQuery || activeTag ? 'No posts match your search.' : 'No posts yet. Be the first to share!'}
          </CardContent>
        </Card>
      ) : (
        feedItems.map(item => item.kind === 'post' ? (
          <PostCard
            key={item.data.id}
            post={item.data}
            currentUserId={me?.id || null}
            onReact={react}
            onDelete={deletePost}
            onTagClick={(t) => { setActiveTag(t); setFilterQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onImageOpen={(url) => setLightboxUrl(url)}
          />
        ) : (
          <TaskFeedCard
            key={`task-${item.data.id}`}
            task={item.data}
            completed={completedTaskIds.includes(item.data.id)}
            verifying={verifyingTaskId === item.data.id}
            onStart={(t) => setShareTarget(t)}
          />
        ))
      )}

      {/* Share platform picker for credit tasks opened from the feed */}
      <Dialog open={!!shareTarget} onOpenChange={(o) => !o && setShareTarget(null)}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-bold text-foreground">Share to earn</p>
              <p className="text-[11px] text-muted-foreground">{shareTarget?.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FEED_SHARE_PLATFORMS.map(p => (
                <Button
                  key={p.key}
                  variant="outline"
                  className="h-11 rounded-xl text-xs font-bold"
                  onClick={() => startTaskVerification(shareTarget, p.key)}
                >
                  <Share2 className="h-4 w-4 mr-1.5" />{p.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black border-0">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="" className="w-full h-auto max-h-[90vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onReact: (p: Post, r: Reaction) => void;
  onDelete: (p: Post) => void;
  onTagClick: (tag: string) => void;
  onImageOpen: (url: string) => void;
}

interface TaskFeedCardProps {
  task: any;
  completed: boolean;
  verifying: boolean;
  onStart: (task: any) => void;
}

const TaskFeedCard: React.FC<TaskFeedCardProps> = ({ task, completed, verifying, onStart }) => {
  const embed = task.share_url ? ytEmbed(task.share_url) : null;
  const isYouTube = task.task_type === 'youtube' || !!embed;
  return (
    <Card className="border border-green-500/30 shadow-sm overflow-hidden rounded-xl">
      <CardContent className="p-0">
        <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            {isYouTube ? <Youtube className="h-4 w-4 text-white" /> : <Gift className="h-4 w-4 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-[13px] truncate">{task.title}</p>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 shrink-0">EARN CREDITS</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{timeAgo(task.created_at)} · +{task.reward_credits} credits</p>
          </div>
        </div>
        {task.description && (
          <p className="px-3 pb-2 text-[14px] whitespace-pre-wrap break-words leading-snug">{task.description}</p>
        )}
        {embed ? (
          <div className="aspect-video bg-black">
            <iframe src={embed} className="w-full h-full" allowFullScreen title={task.title} />
          </div>
        ) : task.flyer_url ? (
          <img src={task.flyer_url} alt={task.title} className="w-full max-h-[420px] object-cover" />
        ) : null}
        <div className="p-3">
          <Button
            className="w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold"
            disabled={completed || verifying}
            onClick={() => onStart(task)}
          >
            {completed ? '✅ Completed' : verifying ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Verifying…</> : <><Coins className="h-4 w-4 mr-1.5" />Do task & earn {task.reward_credits}</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onReact, onDelete, onTagClick, onImageOpen }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef<number>(0);

  const author = post.author;
  const authorName = author?.business_name || author?.display_name || 'GGD User';
  const authorAvatar = author?.business_logo_url || author?.avatar_url;
  const authorHref = `/user/${post.user_id}`;
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  const topReactions = (Object.entries(post.reactions) as [Reaction, number][])
    .filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const embed = post.video_url ? ytEmbed(post.video_url) : null;
  const template = findTemplate(post.background_template);

  const loadComments = async () => {
    setLoadingComments(true);
    const { data: cs } = await supabase
      .from('post_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    const userIds = Array.from(new Set((cs || []).map((c: any) => c.user_id)));
    const { data: profs } = userIds.length
      ? await supabase.from('profiles').select('user_id, display_name, business_name, business_logo_url, avatar_url').in('user_id', userIds)
      : { data: [] as any[] };
    const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
    setComments((cs || []).map((c: any) => ({ ...c, author: map.get(c.user_id) })));
    setLoadingComments(false);
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) await loadComments();
  };

  const submitComment = async () => {
    if (!currentUserId) { toast.error('Please sign in'); return; }
    const text = commentText.trim();
    if (!text) return;
    const { error } = await supabase.from('post_comments').insert({
      post_id: post.id, user_id: currentUserId, content: text,
    });
    if (error) return toast.error(error.message);
    setCommentText('');
    setCommentCount(c => c + 1);
    await loadComments();
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('post_comments').delete().eq('id', id);
    if (error) return toast.error(error.message);
    setComments(prev => prev.filter(c => c.id !== id));
    setCommentCount(c => Math.max(0, c - 1));
  };

  const handleImageTap = (url: string) => {
    const now = Date.now();
    const since = now - lastTapRef.current;
    lastTapRef.current = now;
    if (since < 300) {
      // Double tap → like + heart burst
      if (post.myReaction !== 'love') onReact(post, 'love');
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    } else {
      // Single tap with delay → open lightbox
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 290) onImageOpen(url);
      }, 300);
    }
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden rounded-xl">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
          <Link to={authorHref}>
            <Avatar className="h-9 w-9">
              {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
                {authorName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={authorHref} className="font-bold text-[13px] text-foreground hover:underline truncate block">
              {authorName}
            </Link>
            <p className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</p>
          </div>
          {currentUserId === post.user_id && (
            <button onClick={() => onDelete(post)} className="text-muted-foreground hover:text-destructive p-1.5">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Templated text post */}
        {template && !post.image_url ? (
          <div
            className="mx-3 mb-2 rounded-xl flex items-center justify-center min-h-[180px] p-5"
            style={{ background: template.background }}
          >
            <p className={`text-center font-extrabold text-lg sm:text-xl leading-snug whitespace-pre-wrap break-words ${template.textColor}`}>
              {post.content && <RichContent text={post.content} onTagClick={onTagClick} />}
            </p>
          </div>
        ) : (
          post.content && (
            <p className="px-3 pb-2 text-[14px] whitespace-pre-wrap break-words leading-snug">
              <RichContent text={post.content} onTagClick={onTagClick} />
            </p>
          )
        )}

        {/* Image with double-tap-to-like */}
        {post.image_url && (
          <div
            className="relative cursor-pointer select-none bg-muted"
            onClick={() => handleImageTap(post.image_url!)}
          >
            <img src={post.image_url} alt="" className="w-full max-h-[480px] object-cover" />
            {heartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="h-24 w-24 text-white fill-red-500 drop-shadow-2xl animate-scale-in" />
              </div>
            )}
          </div>
        )}

        {embed && (
          <div className="aspect-video bg-black">
            <iframe src={embed} className="w-full h-full" allowFullScreen title="video" />
          </div>
        )}

        {post.video_url && !embed && (
          <a href={post.video_url} target="_blank" rel="noopener noreferrer"
             className="block px-3 py-2 text-xs text-blue-600 hover:underline truncate">
            <Video className="h-3.5 w-3.5 inline mr-1" />{post.video_url}
          </a>
        )}

        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer"
             className="block mx-3 mb-2 px-3 py-2 bg-muted rounded-lg text-xs text-blue-600 hover:underline truncate">
            <Link2 className="h-3 w-3 inline mr-1" />{post.link_url}
          </a>
        )}

        {/* Tag chips */}
        {(post.tags && post.tags.length > 0) && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {post.tags.slice(0, 6).map(t => (
              <button
                key={t}
                onClick={() => onTagClick(t.toLowerCase())}
                className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-0.5 rounded-full hover:bg-orange-200"
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Reaction summary */}
        {(totalReactions > 0 || commentCount > 0) && (
          <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-b border-border/50">
            <div className="flex items-center gap-1">
              {topReactions.map(r => <span key={r}>{reactionEmoji(r)}</span>)}
              {totalReactions > 0 && <span className="ml-1 font-semibold">{totalReactions}</span>}
            </div>
            {commentCount > 0 && <span>{commentCount} comment{commentCount === 1 ? '' : 's'}</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 px-1 py-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={`gap-1.5 h-9 ${post.myReaction ? 'text-orange-600 font-bold' : ''}`}>
                {post.myReaction ? <span className="text-base">{reactionEmoji(post.myReaction)}</span> : <ThumbsUp className="h-4 w-4" />}
                <span className="text-[13px]">
                  {post.myReaction ? REACTIONS.find(r => r.key === post.myReaction)?.label : 'Like'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 flex gap-1" side="top">
              {REACTIONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => onReact(post, r.key)}
                  className="text-2xl hover:scale-125 transition-transform p-1"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" className="gap-1.5 h-9" onClick={toggleComments}>
            <MessageCircle className="h-4 w-4" /> <span className="text-[13px]">Comment</span>
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="px-3 py-3 border-t bg-muted/20 space-y-3">
            {loadingComments ? (
              <div className="text-center"><Loader2 className="h-4 w-4 animate-spin inline" /></div>
            ) : (
              comments.map(c => {
                const cn = c.author?.business_name || c.author?.display_name || 'User';
                const ca = c.author?.business_logo_url || c.author?.avatar_url;
                return (
                  <div key={c.id} className="flex gap-2 items-start">
                    <Avatar className="h-7 w-7">
                      {ca && <AvatarImage src={ca} alt={cn} />}
                      <AvatarFallback className="text-xs bg-gradient-to-br from-orange-500 to-red-600 text-white">
                        {cn[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-background rounded-2xl px-3 py-1.5 inline-block max-w-full">
                        <p className="text-xs font-semibold">{cn}</p>
                        <p className="text-[13px] whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground px-2">
                        <span>{timeAgo(c.created_at)}</span>
                        {currentUserId === c.user_id && (
                          <button onClick={() => deleteComment(c.id)} className="hover:text-destructive">Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {currentUserId && (
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  className="rounded-full bg-background h-9"
                />
                <Button size="sm" onClick={submitComment} className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommunityFeed;
