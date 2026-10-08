import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  X, Share2, Heart, ThumbsUp, MessageCircle, Store,
  Calendar, Clock, Bookmark, Sparkles, Send, Loader2, Check, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CommunityBlogPostData } from '@/types/blog';
import EmojiReactionBar from '@/components/EmojiReactionBar';

interface BlogArticleReaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog: CommunityBlogPostData;
  post: any;
  currentUserId: string | null;
  onReact: (post: any, reaction: any) => void;
  timeAgoStr?: string;
}

const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'haha', emoji: '😂', label: 'Haha' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'angry', emoji: '😡', label: 'Angry' },
];

export const BlogArticleReaderModal: React.FC<BlogArticleReaderModalProps> = ({
  open,
  onOpenChange,
  blog,
  post,
  currentUserId,
  onReact,
  timeAgoStr,
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);
  const [commentCount, setCommentCount] = useState(post?.commentCount || 0);

  const author = post?.author;
  const authorName = author?.business_name || author?.display_name || 'GGD Creator';
  const authorAvatar = author?.business_logo_url || author?.avatar_url;
  const authorHref = author?.business_slug ? `/b/${author.business_slug}` : `/user/${post?.user_id}`;

  const loadComments = useCallback(async () => {
    if (!post?.id) return;
    setLoadingComments(true);
    try {
      const { data: cs } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      const userIds = Array.from(new Set((cs || []).map((c: any) => c.user_id)));
      const { data: profs } = userIds.length
        ? await supabase
            .from('profiles')
            .select('user_id, display_name, business_name, business_logo_url, avatar_url, business_slug')
            .in('user_id', userIds)
        : { data: [] as any[] };

      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setComments((cs || []).map((c: any) => ({ ...c, author: map.get(c.user_id) })));
      setCommentCount((cs || []).length);
    } catch (_err) {
      // Non-blocking
    } finally {
      setLoadingComments(false);
    }
  }, [post?.id]);

  useEffect(() => {
    if (open && post?.id) {
      loadComments();
    }
  }, [open, post?.id, loadComments]);

  const submitComment = async () => {
    if (!currentUserId) {
      toast.error('Please sign in to comment');
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    try {
      const { error } = await supabase.from('post_comments').insert({
        post_id: post.id,
        user_id: currentUserId,
        content: text,
      });
      if (error) throw error;
      setCommentText('');
      toast.success('Comment posted!');
      await loadComments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    }
  };

  const handleShare = (platform?: 'whatsapp' | 'twitter' | 'copy') => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/#feed` : '';
    const shareText = `📰 "${blog.title}" by ${authorName} on GGD Ad Network`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(`${shareText} — ${url}`);
      setCopied(true);
      toast.success('Article link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const totalReactions = Object.values(post?.reactions || {}).reduce((a: any, b: any) => a + Number(b), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border-border bg-card text-card-foreground shadow-2xl">
        {/* Cover Photo Header */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[380px] bg-slate-900 overflow-hidden">
          {blog.cover_image || post.image_url ? (
            <img
              src={blog.cover_image || post.image_url}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-950 flex items-center justify-center p-6 text-center">
              <Sparkles className="h-16 w-16 text-purple-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 h-9 w-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition z-10"
            aria-label="Close article"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Category & Read Time Pills */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-10">
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[11px] px-3 py-1 border-0 shadow-lg uppercase tracking-wider">
              📰 {blog.category || 'Editorial Blog'}
            </Badge>
            {blog.read_time && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/90 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                {blog.read_time}
              </span>
            )}
          </div>

          {/* Title on banner */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 text-white">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black font-serif tracking-tight drop-shadow-md leading-tight">
              {blog.title}
            </h1>
          </div>
        </div>

        {/* Content Container */}
        <div className="px-5 sm:px-8 py-6 space-y-8">
          {/* Author Byline & Social Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Link to={authorHref} className="group shrink-0" onClick={() => onOpenChange(false)}>
                <Avatar className="h-12 w-12 ring-2 ring-purple-500/30 group-hover:ring-purple-500 transition-all">
                  {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
                    {authorName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={authorHref}
                    onClick={() => onOpenChange(false)}
                    className="font-bold text-base text-foreground hover:text-purple-600 transition"
                  >
                    {authorName}
                  </Link>
                  {author?.business_name && (
                    <Badge variant="outline" className="text-purple-600 border-purple-500/30 bg-purple-500/10 text-[10px] font-bold">
                      <Store className="h-2.5 w-2.5 mr-1" /> Verified Business
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {timeAgoStr || new Date(post.created_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>Published on GGD Network</span>
                </div>
              </div>
            </div>

            {/* Share & Visit Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {author?.business_slug && (
                <Link to={`/b/${author.business_slug}`} onClick={() => onOpenChange(false)}>
                  <Button size="sm" variant="outline" className="rounded-full text-xs font-bold border-purple-500/30 text-purple-600 hover:bg-purple-500/10">
                    <Store className="h-3.5 w-3.5 mr-1.5" /> Visit Store
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShare('whatsapp')}
                className="rounded-full text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-500/30"
              >
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleShare('copy')}
                className="rounded-full text-xs font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
                {copied ? 'Copied' : 'Share'}
              </Button>
            </div>
          </div>

          {/* Subtitle / Excerpt Lead */}
          {blog.subtitle && (
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
              <p className="text-base sm:text-lg font-medium text-foreground/90 italic leading-relaxed">
                "{blog.subtitle}"
              </p>
            </div>
          )}

          {/* Article Sections (Story flow) */}
          <div className="space-y-8 text-foreground/90 leading-relaxed font-sans">
            {blog.sections && blog.sections.length > 0 ? (
              blog.sections.map((sec, idx) => (
                <article key={idx} className="space-y-4">
                  {sec.heading && (
                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-6 w-1.5 rounded-full bg-purple-600" />
                      <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                        {sec.heading}
                      </h2>
                    </div>
                  )}

                  {/* Optional Section Image */}
                  {sec.imageUrl && (
                    <div className="my-5 rounded-2xl overflow-hidden border border-border/60 shadow-md">
                      <img
                        loading="lazy"
                        src={sec.imageUrl}
                        alt={sec.imageAlt || sec.heading}
                        className="w-full max-h-[460px] object-cover"
                      />
                      {sec.imageAlt && (
                        <p className="text-center text-xs text-muted-foreground p-2.5 bg-muted/40 italic">
                          {sec.imageAlt}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section Paragraphs */}
                  <div className="space-y-3 text-[15px] sm:text-base leading-relaxed text-foreground/90">
                    {sec.content.split('\n').map((paragraph, pIdx) =>
                      paragraph.trim() ? (
                        <p key={pIdx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      ) : null
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
            )}
          </div>

          {/* Author Note / Call to Action Box */}
          {blog.author_note && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-transparent border border-orange-500/20 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-600">Note From Author</p>
              <p className="text-sm text-foreground/90 italic">{blog.author_note}</p>
            </div>
          )}

          {/* Article Footer & Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="pt-4 flex flex-wrap gap-1.5 border-t border-border/60">
              {blog.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full"
                >
                  #{t.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Interactive Community Engagement Bar */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full gap-2 border-purple-500/30 hover:bg-purple-500/10"
                  >
                    <Heart className="h-4 w-4 text-red-500 fill-red-500/30" />
                    <span className="font-bold text-xs">{totalReactions > 0 ? `${totalReactions} Reactions` : 'React to Story'}</span>
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

              <span className="text-xs text-muted-foreground">
                💬 {commentCount} reader comments
              </span>
            </div>

            <Button
              size="sm"
              onClick={() => handleShare('whatsapp')}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-md"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Full Article
            </Button>
          </div>

          {/* Reader Discussion / Comments Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-lg font-bold font-serif text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              Reader Discussion ({commentCount})
            </h3>

            {/* Post a Comment Input */}
            {currentUserId ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Share your thoughts on this story…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                  className="rounded-full bg-background h-10 text-sm"
                />
                <Button
                  size="sm"
                  onClick={submitComment}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-5 h-10 font-bold"
                >
                  <Send className="h-4 w-4 mr-1.5" /> Post
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sign in to participate in the discussion.</p>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <div className="py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic">Be the first to share your thoughts on this story.</p>
            ) : (
              <div className="space-y-3 pt-2">
                {comments.map(c => {
                  const cn = c.author?.business_name || c.author?.display_name || 'Reader';
                  const ca = c.author?.business_logo_url || c.author?.avatar_url;
                  const cHref = c.author?.business_slug ? `/b/${c.author.business_slug}` : `/user/${c.user_id}`;
                  return (
                    <div key={c.id} className="flex gap-2.5 items-start p-3 rounded-2xl bg-muted/30 border border-border/50">
                      <Link to={cHref} onClick={() => onOpenChange(false)}>
                        <Avatar className="h-8 w-8 ring-1 ring-purple-500/20">
                          {ca && <AvatarImage src={ca} alt={cn} />}
                          <AvatarFallback className="text-xs bg-purple-600 text-white">
                            {cn[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Link to={cHref} onClick={() => onOpenChange(false)} className="text-xs font-bold hover:text-purple-600 truncate">
                            {cn}
                          </Link>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default BlogArticleReaderModal;
