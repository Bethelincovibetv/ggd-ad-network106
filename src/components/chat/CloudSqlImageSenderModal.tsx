import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  X,
  Send,
  Loader2,
  Camera,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface SharedChatMessageImage {
  id: string;
  imageUrl: string;
  caption?: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
}

interface CloudSqlImageSenderModalProps {
  currentUserId: string;
  recipientUserId: string;
  recipientUserName?: string;
  taskId?: string | null;
  onImageSent?: (record: SharedChatMessageImage) => void;
  disabled?: boolean;
}

export const CloudSqlImageSenderModal: React.FC<CloudSqlImageSenderModalProps> = ({
  currentUserId,
  recipientUserId,
  recipientUserName = 'Contact',
  taskId,
  onImageSent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image size must be less than 20MB');
      return;
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setIsOpen(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Image size must be less than 20MB');
        return;
      }
      setSelectedFile(file);
      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
    }
  };

  const handleSend = async () => {
    if (!selectedFile || isSending) return;

    try {
      setIsSending(true);

      // Convert file to base64 data URL
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedFile);
      const imageData = await base64Promise;

      const response = await fetch('/api/chat/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          fileName: selectedFile.name,
          senderId: currentUserId,
          receiverId: recipientUserId,
          caption: caption.trim() || undefined,
          taskId: taskId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server failed to save image');
      }

      const data = await response.json();

      const newRecord: SharedChatMessageImage = {
        id: data.id || `msg-${Date.now()}`,
        imageUrl: data.imageUrl,
        caption: caption.trim() || undefined,
        senderId: currentUserId,
        receiverId: recipientUserId,
        createdAt: data.createdAt || new Date().toISOString(),
      };

      if (onImageSent) {
        onImageSent(newRecord);
      }

      toast.success('Image sent successfully!');
      handleClose();
    } catch (err: any) {
      console.error('Failed to send image:', err);
      toast.error(err.message || 'Failed to send image. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending) return;
    setIsOpen(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        title="Share photo / image"
        className="rounded-xl border-border hover:bg-orange-500/10 hover:text-orange-600 transition-colors shrink-0"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl bg-background border border-border shadow-2xl">
          <DialogHeader className="p-4 bg-muted/40 border-b flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-orange-500" />
                Share Image with {recipientUserName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Saved securely to database & delivered instantly.
              </DialogDescription>
            </div>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-neutral-950 flex items-center justify-center max-h-72">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-72 w-auto object-contain rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white text-[11px] font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 backdrop-blur-xs"
                >
                  <Camera className="h-3 w-3" /> Change
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-orange-500/50 rounded-2xl p-8 text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">Click or drag photo here to attach</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Supports PNG, JPG, GIF up to 20MB</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Caption (Optional)</label>
              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a message or description..."
                disabled={isSending}
                className="h-10 text-xs rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSending}
                className="text-xs rounded-xl h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSend}
                disabled={!selectedFile || isSending}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl h-9 gap-1.5 shadow-md shadow-orange-500/20"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Image</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CloudSqlImageSenderModal;
