import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BookOpen, Clock, Store, Trash2, ArrowRight, Share2,
  Heart, ThumbsUp, MessageCircle, Megaphone, Sparkles, ExternalLink,
  MoreHorizontal, Edit3, Copy, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CommunityBlogPostData } from '@/types/blog';
import BlogArticleReaderModal from './BlogArticleReaderModal';
import { recordPostView, formatViewsCount } from '@/lib/postViews';

interface BlogFeedCardProps {
  post: any;
  blog: CommunityBlogPostData;
  currentUserId: string | null;
  onReact: (post: any, reaction: any) => void;
  onDelete: (post: any) => void;
  onEdit?: (post: any) => void;
  onPromote?: (post: any) => void;
  timeAgoStr: string;
}

const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'haha', emoji: '😂', label: 'Haha' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'angry', emoji: '😡', label: 'Angry' },
];

const reactionEmoji = (r: string | null) =>
  REACTIONS.find(x => x.key === r)?.emoji || '👍';

export const BlogFeedCard: React.FC<BlogFeedCardProps> = ({
  post,
  blog,
  currentUserId,
  onReact,
  onDelete,
  onEdit,
  onPromote,
  timeAgoStr,
}) => {
  const [readerOpen, setReaderOpen] = useState(false);

  const author = post.author;
  const authorName = author?.business_name || author?.display_name || 'GGD Creator';
  const authorAvatar = author?.business_logo_url || author?.avatar_url;
  const authorHref = author?.business_slug ? `/b/${author.business_slug}` : `/user/${post.user_id}`;

  const totalReactions = Object.values(post.reactions || {}).reduce((a: any, b: any) => a + Number(b), 0);
  const topReactions = (Object.entries(post.reactions || {}) as [string, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const coverImage = blog.cover_image || post.image_url;
  const firstSection = blog.sections?.[0];
  const isOwner = currentUserId === post.user_id;

  const [viewsCount, setViewsCount] = useState<number>(0);

  useEffect(() => {
    const v = recordPostView(post);
    setViewsCount(v);
  }, [post.id]);

  return (
    <>
      <Card className="border border-purple-500/20 shadow-md hover:shadow-lg transition-all overflow-hidden rounded-2xl bg-card">
        <CardContent className="p-0">
          {/* Top Publication Header */}
          <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3 border-b border-border/50 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link to={authorHref} className="group shrink-0">
                <Avatar className="h-10 w-10 ring-2 ring-purple-500/30 group-hover:ring-purple-500 transition-all">
                  {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold text-xs">
                    {authorName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    to={authorHref}
                    className="font-bold text-[13px] text-foreground hover:text-purple-600 hover:underline truncate"
                  >
                    {authorName}
                  </Link>
                  {author?.business_name && (
                    <Link
                      to={authorHref}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20"
                    >
                      <Store className="h-2.5 w-2.5" />
                      <span>Store</span>
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                  <span>{timeAgoStr}</span>
                  {post.updated_at && new Date(post.updated_at).getTime() > new Date(post.created_at).getTime() + 5000 && (
                    <span className="text-[10px] text-muted-foreground/80 italic font-medium">(edited)</span>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1 text-purple-600 font-semibold">
                    <Clock className="h-3 w-3" />
                    {blog.read_time || '3 min read'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {formatViewsCount(viewsCount)} views
                  </span>
                </div>
              </div>
            </div>

            {/* Badges & 3-Dot Manage Menu */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 border-0 shadow-sm hidden sm:inline-flex">
                📰 Blog Article
              </Badge>

              {/* Facebook-style 3-dot options menu */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full hover:bg-muted text-muted-foreground transition"
                    title="Article options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-1.5 rounded-xl shadow-lg border border-border bg-popover z-50">
                  {isOwner && onEdit && (
                    <button
                      onClick={() => onEdit(post)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-muted transition text-foreground text-left"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                      Edit Article
                    </button>
                  )}
                  {isOwner && onPromote && (
                    <button
                      onClick={() => onPromote(post)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-muted transition text-foreground text-left"
                    >
                      <Megaphone className="h-3.5 w-3.5 text-green-600" />
                      Promote Article
                    </button>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + authorHref);
                      toast.success('Article link copied to clipboard!');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-muted transition text-foreground text-left"
                  >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    Copy Link
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => onDelete(post)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg hover:bg-destructive/10 text-destructive transition text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Article
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Cover Banner (Showpage Visual) */}
          {coverImage && (
            <div
              className="relative w-full aspect-[21/9] sm:aspect-[2.4/1] bg-slate-900 cursor-pointer overflow-hidden group"
              onClick={() => setReaderOpen(true)}
            >
              <img
                loading="lazy"
                src={coverImage}
                alt={blog.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3">
                <Badge className="bg-black/60 backdrop-blur-md text-white border-0 text-[10px] font-bold">
                  {blog.category || 'Featured'}
                </Badge>
              </div>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-purple-600 px-3 py-1 rounded-full shadow-lg">
                  Read Full Story <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          )}

          {/* Main Story Content Showcase */}
          <div className="p-4 sm:p-5 space-y-3">
            {!coverImage && (
              <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-bold">
                {blog.category || 'Business Article'}
              </Badge>
            )}

            {/* Headline */}
            <h2
              onClick={() => setReaderOpen(true)}
              className="text-lg sm:text-xl font-black font-serif text-foreground hover:text-purple-600 transition cursor-pointer leading-snug"
            >
              {blog.title}
            </h2>

            {/* Subtitle / Lead Hook */}
            {blog.subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic line-clamp-2">
                "{blog.subtitle}"
              </p>
            )}

            {/* First section teaser quote */}
            {firstSection?.content && (
              <div
                onClick={() => setReaderOpen(true)}
                className="p-3 rounded-xl bg-purple-500/5 border-l-2 border-purple-600 cursor-pointer hover:bg-purple-500/10 transition"
              >
                <p className="text-xs font-bold text-foreground">
                  {firstSection.heading || 'Key Highlight'}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {firstSection.content}
                </p>
              </div>
            )}

            {/* Meta statistics bar & Read Article CTA Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-purple-600">
                  {blog.sections?.length || 1} Section{(blog.sections?.length || 1) > 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>Includes Photos & Analysis</span>
              </div>

              <Button
                size="sm"
                onClick={() => setReaderOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-sm h-8 px-4"
              >
                Read Full Story <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Social Stats & Reactions Footer */}
          {(totalReactions > 0 || post.commentCount > 0) && (
            <div className="px-4 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50">
              <div className="flex items-center gap-1">
                {topReactions.map(r => (
                  <span key={r}>{reactionEmoji(r)}</span>
                ))}
                {totalReactions > 0 && (
                  <span className="ml-1 font-semibold">{totalReactions}</span>
                )}
              </div>
              {post.commentCount > 0 && (
                <span onClick={() => setReaderOpen(true)} className="cursor-pointer hover:underline">
                  {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="grid grid-cols-2 px-1 py-0.5 border-t border-border/50">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1.5 h-9 ${post.myReaction ? 'text-purple-600 font-bold' : ''}`}
                >
                  {post.myReaction ? (
                    <span className="text-base">{reactionEmoji(post.myReaction)}</span>
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  <span className="text-[13px]">
                    {post.myReaction
                      ? REACTIONS.find(r => r.key === post.myReaction)?.label
                      : 'Like'}
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

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => setReaderOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-[13px]">Read & Comment</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reader Modal */}
      <BlogArticleReaderModal
        open={readerOpen}
        onOpenChange={setReaderOpen}
        blog={blog}
        post={post}
        currentUserId={currentUserId}
        onReact={onReact}
        timeAgoStr={timeAgoStr}
      />
    </>
  );
};
export default BlogFeedCard;
