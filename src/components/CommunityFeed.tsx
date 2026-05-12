import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Image as ImageIcon, Link2, Video, Loader2, Send, Trash2,
  MessageCircle, ThumbsUp, X,
} from 'lucide-react';
import { toast } from 'sonner';

type Reaction = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

const REACTIONS: { key: Reaction; emoji: string; label: string; color: string }[] = [
  { key: 'like', emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { key: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { key: 'haha', emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
  { key: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-500' },
  { key: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
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

const CommunityFeed = () => {
  const [me, setMe] = useState<{ id: string; profile?: PostAuthor } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, display_name, business_name, business_logo_url, avatar_url, business_slug')
        .eq('user_id', user.id)
        .maybeSingle();
      setMe({ id: user.id, profile: profile || undefined });
    }
    await loadFeed(user?.id);
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
      const { error } = await supabase.from('community_posts').insert({
        user_id: me.id,
        content: text || null,
        image_url,
        link_url: linkUrl.trim() || null,
        video_url: videoUrl.trim() || null,
      });
      if (error) throw error;
      setContent(''); setLinkUrl(''); setVideoUrl('');
      setShowLink(false); setShowVideo(false);
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

    // optimistic
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

  const myAvatar = me?.profile?.business_logo_url || me?.profile?.avatar_url;
  const myName = me?.profile?.business_name || me?.profile?.display_name || 'You';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Composer */}
      {me ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="flex gap-2 items-start">
              <Avatar className="h-10 w-10">
                {myAvatar && <AvatarImage src={myAvatar} alt={myName} />}
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                  {myName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`What's on your mind, ${myName.split(' ')[0]}?`}
                rows={2}
                className="flex-1 resize-none border-muted bg-muted/30"
                maxLength={2000}
              />
            </div>

            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="" className="w-full max-h-80 object-cover rounded-lg" />
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
              <Input
                placeholder="https://your-link.com"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
              />
            )}
            {showVideo && (
              <Input
                placeholder="YouTube / Vimeo URL"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
              />
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1">
                <input
                  type="file" ref={fileRef} accept="image/*" className="hidden"
                  onChange={e => onPickImage(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-1 text-green-600" /> Photo
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowLink(s => !s)}>
                  <Link2 className="h-4 w-4 mr-1 text-blue-600" /> Link
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowVideo(s => !s)}>
                  <Video className="h-4 w-4 mr-1 text-red-600" /> Video
                </Button>
              </div>
              <Button onClick={submitPost} disabled={posting} size="sm" className="bg-gradient-to-r from-orange-500 to-red-600">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />Post</>}
              </Button>
            </div>
          </CardContent>
        </Card>
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
      ) : posts.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            No posts yet. Be the first to share!
          </CardContent>
        </Card>
      ) : (
        posts.map(p => (
          <PostCard
            key={p.id}
            post={p}
            currentUserId={me?.id || null}
            onReact={react}
            onDelete={deletePost}
          />
        ))
      )}
    </div>
  );
};

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onReact: (p: Post, r: Reaction) => void;
  onDelete: (p: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onReact, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const author = post.author;
  const authorName = author?.business_name || author?.display_name || 'GGD User';
  const authorAvatar = author?.business_logo_url || author?.avatar_url;
  const authorHref = author?.business_slug ? `/business/${author.business_slug}` : `/user/${post.user_id}`;
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  const topReactions = (Object.entries(post.reactions) as [Reaction, number][])
    .filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const embed = post.video_url ? ytEmbed(post.video_url) : null;

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

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="p-3 sm:p-4 flex items-start gap-3">
          <Link to={authorHref}>
            <Avatar className="h-10 w-10">
              {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                {authorName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={authorHref} className="font-semibold text-sm text-foreground hover:underline truncate block">
              {authorName}
            </Link>
            <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
          </div>
          {currentUserId === post.user_id && (
            <button onClick={() => onDelete(post)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {post.content && (
          <p className="px-4 pb-3 text-sm whitespace-pre-wrap break-words">{post.content}</p>
        )}

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full max-h-[500px] object-cover" />
        )}

        {embed && (
          <div className="aspect-video bg-black">
            <iframe src={embed} className="w-full h-full" allowFullScreen title="video" />
          </div>
        )}

        {post.video_url && !embed && (
          <a href={post.video_url} target="_blank" rel="noopener noreferrer"
             className="block px-4 py-3 text-sm text-blue-600 hover:underline truncate">
            <Video className="h-4 w-4 inline mr-1" />{post.video_url}
          </a>
        )}

        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer"
             className="block mx-4 mb-3 px-3 py-2 bg-muted rounded-lg text-xs text-blue-600 hover:underline truncate">
            <Link2 className="h-3 w-3 inline mr-1" />{post.link_url}
          </a>
        )}

        {/* Reaction summary */}
        {(totalReactions > 0 || commentCount > 0) && (
          <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-t border-b border-border/50">
            <div className="flex items-center gap-1">
              {topReactions.map(r => <span key={r}>{reactionEmoji(r)}</span>)}
              {totalReactions > 0 && <span className="ml-1">{totalReactions}</span>}
            </div>
            {commentCount > 0 && <span>{commentCount} comment{commentCount === 1 ? '' : 's'}</span>}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 px-2 py-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={`gap-2 ${post.myReaction ? 'text-orange-600 font-semibold' : ''}`}>
                {post.myReaction ? <span className="text-base">{reactionEmoji(post.myReaction)}</span> : <ThumbsUp className="h-4 w-4" />}
                {post.myReaction ? REACTIONS.find(r => r.key === post.myReaction)?.label : 'Like'}
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
          <Button variant="ghost" size="sm" className="gap-2" onClick={toggleComments}>
            <MessageCircle className="h-4 w-4" /> Comment
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="px-4 py-3 border-t bg-muted/20 space-y-3">
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
                        <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
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
                  className="rounded-full bg-background"
                />
                <Button size="sm" onClick={submitComment} className="bg-gradient-to-r from-orange-500 to-red-600">
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
