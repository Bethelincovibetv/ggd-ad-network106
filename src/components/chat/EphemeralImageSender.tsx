import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Upload,
  Clock,
  Loader2,
  CheckCircle2,
  X,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { p2pImageTransfer } from '@/services/webrtcDataChannel';
import { connectChatP2PDataChannel } from '@/services/webrtcService';
import { EphemeralImageRecord } from '@/utils/ephemeralImageDB';

interface EphemeralImageSenderProps {
  currentUserId: string;
  currentUserName?: string;
  recipientUserId: string;
  recipientUserName?: string;
  onImageSent?: (record: EphemeralImageRecord) => void;
  disabled?: boolean;
}

export const EphemeralImageSender: React.FC<EphemeralImageSenderProps> = ({
  currentUserId,
  currentUserName = 'Me',
  recipientUserId,
  recipientUserName = 'Contact',
  onImageSent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object url
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Subscribe to progress events
  useEffect(() => {
    const unsub = p2pImageTransfer.onProgress((id, percent, direction) => {
      if (direction === 'sending') {
        setProgress(percent);
        setStatusMessage(`Streaming chunks (${percent}%)...`);
      }
    });
    return () => unsub();
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Image size exceeds 25MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSend = async () => {
    if (!selectedFile) return;

    setIsSending(true);
    setProgress(0);
    setStatusMessage('Connecting WebRTC DataChannel...');

    try {
      // If not yet ready, perform direct P2P data handshake
      if (!p2pImageTransfer.isReady()) {
        setStatusMessage('Establishing peer-to-peer connection...');
        await connectChatP2PDataChannel({
          myUserId: currentUserId,
          otherUserId: recipientUserId,
        });

        // Wait up to 3 seconds for channel open state if handshake is completing
        let attempts = 0;
        while (!p2pImageTransfer.isReady() && attempts < 15) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }
      }

      setStatusMessage('Slicing into 16KB chunks...');
      const record = await p2pImageTransfer.sendImage(
        selectedFile,
        selectedFile.name,
        currentUserId,
        recipientUserId,
        currentUserName,
        caption.trim() || undefined
      );

      toast.success('P2P image streamed successfully!');
      onImageSent?.(record);
      handleClose();
    } catch (err: any) {
      console.error('Failed to send P2P image:', err);
      toast.error(err.message || 'Peer-to-peer connection failed. Ensure contact is online.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending) return;
    setIsOpen(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setCaption('');
    setProgress(0);
    setStatusMessage('');
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="h-9 w-9 rounded-full text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
        title="Share Real-time Ephemeral Image (P2P DataChannel)"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !isSending && (open ? setIsOpen(true) : handleClose())}>
        <DialogContent className="max-w-md p-5 sm:rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Share Ephemeral Image
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Direct peer-to-peer stream to {recipientUserName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Privacy & Zero-Server Storage Guarantee */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">Zero Cloud Storage</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Streamed directly in 16KB WebRTC chunks without touching any server or database. Automatically self-destructs after 24 hours.
              </p>
            </div>
          </div>

          {/* Image Selection Area */}
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                e.currentTarget.value = '';
              }}
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-amber-500/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-amber-500/5 flex flex-col items-center justify-center gap-2"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">Click or drag image here</p>
                  <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP, GIF</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-border bg-black/40">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-56 object-contain bg-zinc-950"
                />
                {!isSending && (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => {
                      setSelectedFile(null);
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setPreviewUrl('');
                    }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}

            {/* Optional Caption */}
            {selectedFile && !isSending && (
              <Input
                placeholder="Add an optional caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="text-xs h-9"
              />
            )}

            {/* Live Progress Bar when transmitting */}
            {isSending && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/40 border">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                    <span>{statusMessage}</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-600">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-[10px] text-muted-foreground text-center">
                  Transmitting 16KB ArrayBuffer chunks peer-to-peer...
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSending}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!selectedFile || isSending}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 font-bold"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Streaming...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Stream P2P Image</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
