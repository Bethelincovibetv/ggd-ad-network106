import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, Share2, Eye, Plus, BookOpen, Clock, Copy, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { CommunityBlogPostData } from '@/types/blog';
import { playCelebrationSound } from '@/utils/audio';

interface BlogCreationSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blog: CommunityBlogPostData | null;
  postId?: string | null;
  onViewFeed?: () => void;
  onCreateAnother?: () => void;
}

export const BlogCreationSuccessModal: React.FC<BlogCreationSuccessModalProps> = ({
  open,
  onOpenChange,
  blog,
  postId,
  onViewFeed,
  onCreateAnother,
}) => {
  useEffect(() => {
    if (open) {
      playCelebrationSound();
    }
  }, [open]);

  if (!blog) return null;

  const handleCopyLink = () => {
    const url = postId ? `${window.location.origin}/?post=${postId}` : window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Article link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-purple-500/30 shadow-2xl rounded-2xl bg-card">
        {/* Top celebratory banner */}
        <div className="relative p-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 text-white text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />
          
          <div className="relative z-10 space-y-2">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles className="h-7 w-7 text-amber-300" />
            </div>
            
            <Badge className="bg-white/20 text-white border-0 text-xs px-3 py-1 font-black uppercase tracking-wider backdrop-blur-sm">
              🎉 Published Successfully
            </Badge>

            <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Congratulations! Your Blog is Live!
            </DialogTitle>
            
            <DialogDescription className="text-purple-100 text-xs sm:text-sm max-w-sm mx-auto">
              Your article is now live on the GGD community feed and visible to businesses and readers worldwide.
            </DialogDescription>
          </div>
        </div>

        {/* Article Summary Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-3">
            {blog.cover_image && (
              <div className="relative h-36 w-full rounded-lg overflow-hidden border border-border">
                <img
                  src={blog.cover_image}
                  alt={blog.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <Badge className="bg-purple-600/90 text-white text-[10px] font-bold border-0">
                    {blog.category || 'General'}
                  </Badge>
                  <Badge variant="secondary" className="bg-black/70 text-white text-[10px] font-bold border-0 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {blog.reading_time_minutes || 3} min read
                  </Badge>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-base text-foreground line-clamp-2">
                {blog.title}
              </h4>
              {blog.subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {blog.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                {blog.sections?.length || 1} Sections
              </span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Indexed in Feed
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                if (onViewFeed) onViewFeed();
              }}
              className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold h-11 rounded-xl shadow-md text-sm flex items-center justify-center gap-2"
            >
              <Eye className="h-4 w-4" /> View in Feed
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="h-10 text-xs font-bold rounded-xl border-border hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5 text-purple-600" /> Copy Link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  if (onCreateAnother) onCreateAnother();
                }}
                className="h-10 text-xs font-bold rounded-xl border-border hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5 text-pink-600" /> Write Another
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogCreationSuccessModal;
