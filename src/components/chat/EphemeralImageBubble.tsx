import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  Trash2,
  Maximize2,
  ShieldCheck,
  Download,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EphemeralImageRecord, deleteEphemeralImage, getRemainingHours } from '@/utils/ephemeralImageDB';

interface EphemeralImageBubbleProps {
  image: EphemeralImageRecord;
  onDeleted?: (id: string) => void;
}

export const EphemeralImageBubble: React.FC<EphemeralImageBubbleProps> = ({
  image,
  onDeleted,
}) => {
  const [objectUrl, setObjectUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remainingText, setRemainingText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let url = '';
    if (image.blob) {
      url = URL.createObjectURL(image.blob);
      setObjectUrl(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [image.blob]);

  useEffect(() => {
    const updateRemaining = () => {
      const remainingMs = Math.max(0, image.timestamp + 24 * 60 * 60 * 1000 - Date.now());
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      if (remainingMs <= 0) {
        setRemainingText('Expired');
        handleDelete();
      } else {
        setRemainingText(`${hours}h ${mins}m`);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 60000);
    return () => clearInterval(interval);
  }, [image.timestamp]);

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDeleting(true);
    await deleteEphemeralImage(image.id);
    onDeleted?.(image.id);
  };

  if (!objectUrl) return null;

  return (
    <>
      <div
        className={`group relative max-w-sm rounded-2xl overflow-hidden border shadow-sm transition-all hover:shadow-md cursor-pointer ${
          image.isMine
            ? 'bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-transparent border-orange-400/40'
            : 'bg-card border-border'
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Top Badges: Ephemeral (24h) + Expiry Timer */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
          <Badge className="bg-black/75 hover:bg-black/75 backdrop-blur-md text-amber-300 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 gap-1 shadow-sm">
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
            <span>P2P Ephemeral</span>
          </Badge>

          <Badge className="bg-black/75 hover:bg-black/75 backdrop-blur-md text-zinc-200 border-white/20 text-[10px] font-mono px-2 py-0.5 gap-1 shadow-sm">
            <Clock className="h-3 w-3 text-orange-400" />
            <span>{remainingText}</span>
          </Badge>
        </div>

        {/* Image Display */}
        <div className="relative aspect-video sm:aspect-[4/3] w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          <img
            src={objectUrl}
            alt={image.caption || image.filename}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Quick Hover Action Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-md pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              title="View Full Size"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-9 w-9 rounded-full bg-red-600 hover:bg-red-700 shadow-md pointer-events-auto"
              disabled={isDeleting}
              onClick={handleDelete}
              title="Delete Now (Removes immediately from device)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Details Footer */}
        <div className="p-2.5 bg-card/90 backdrop-blur-sm border-t border-border/60">
          {image.caption && (
            <p className="text-xs font-semibold text-foreground mb-1 leading-snug">
              {image.caption}
            </p>
          )}

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>Zero server storage (P2P)</span>
            </span>
            <span className="text-[10px]">
              {(image.size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      </div>

      {/* Full Size Modal Viewer */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-zinc-800 text-white">
          <DialogHeader className="p-4 border-b border-zinc-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <DialogTitle className="text-sm font-bold text-white">
                Ephemeral P2P Image
              </DialogTitle>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                Expires in {remainingText}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  handleDelete();
                  setIsModalOpen(false);
                }}
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete Now</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="p-4 flex flex-col items-center justify-center max-h-[75vh] overflow-auto">
            <img
              src={objectUrl}
              alt={image.caption || image.filename}
              className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl border border-zinc-800"
            />
            {image.caption && (
              <p className="mt-3 text-sm text-zinc-300 text-center font-medium">
                {image.caption}
              </p>
            )}
          </div>

          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 px-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Streamed peer-to-peer via WebRTC DataChannels. Not saved on any server.
            </span>
            <span className="font-mono text-[11px]">
              {(image.size / 1024).toFixed(1)} KB • {image.mimeType}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
