import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, 
  Share2, Download, Package, Briefcase, Sparkles, ShieldCheck, 
  ExternalLink, Phone, MessageCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface ProductPhotoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  productTitle?: string;
  price?: number | string | null;
  businessName?: string;
  isVerified?: boolean;
  isService?: boolean;
  productUrl?: string;
  whatsappPhone?: string;
}

export const ProductPhotoViewerModal: React.FC<ProductPhotoViewerProps> = ({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  productTitle,
  price,
  businessName,
  isVerified,
  isService,
  productUrl,
  whatsappPhone,
}) => {
  const validImages = images.filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, validImages.length - 1)));
      setScale(1);
      setRotation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex, validImages.length]);

  const handlePrev = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
    setScale(1);
    setRotation(0);
  }, [validImages.length]);

  const handleNext = useCallback(() => {
    if (validImages.length <= 1) return;
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
    setScale(1);
    setRotation(0);
  }, [validImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === '+' || e.key === '=') setScale((s) => Math.min(s + 0.25, 3));
      else if (e.key === '-') setScale((s) => Math.max(s - 0.25, 0.5));
      else if (e.key === '0') {
        setScale(1);
        setRotation(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Auto scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeThumb = thumbnailContainerRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Touch swipe support
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  const handleShare = async () => {
    const currentImg = validImages[currentIndex];
    if (!currentImg) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: productTitle || 'Product Photo',
          text: `Check out ${productTitle || 'this product'} on GGD`,
          url: productUrl || window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(productUrl || window.location.href);
        toast.success('Product link copied to clipboard!');
      }
    } catch {
      // User cancelled share
    }
  };

  const handleDownload = () => {
    const currentImg = validImages[currentIndex];
    if (!currentImg) return;
    const a = document.createElement('a');
    a.href = currentImg;
    a.download = `${(productTitle || 'product-photo').toLowerCase().replace(/\s+/g, '-')}-${currentIndex + 1}.jpg`;
    a.target = '_blank';
    a.click();
    toast.success('Photo download initiated');
  };

  if (!isOpen || validImages.length === 0) return null;

  const currentPhoto = validImages[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Product Information */}
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="h-9 w-9 rounded-2xl bg-white/10 backdrop-blur border border-white/20 grid place-items-center shrink-0">
            {isService ? <Briefcase className="h-4 w-4 text-white" /> : <Package className="h-4 w-4 text-white" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
                {productTitle || 'Product Photo Full View'}
              </h3>
              {price && Number(price) > 0 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-[10px] border-0 rounded-full px-2 py-0">
                  ₦{Number(price).toLocaleString()}
                </Badge>
              )}
            </div>
            {businessName && (
              <p className="text-[11px] text-white/70 flex items-center gap-1 mt-0.5 truncate">
                <span>{businessName}</span>
                {isVerified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls & Cancel / Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 backdrop-blur rounded-2xl p-1 border border-white/20">
            <button
              onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
              className="h-7 w-7 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono text-white/90 px-1">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
              className="h-7 w-7 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="h-7 w-7 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Rotate image"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={handleShare}
            className="h-9 w-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
            title="Share Photo"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            onClick={handleDownload}
            className="hidden sm:flex h-9 w-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white items-center justify-center transition border border-white/20 cursor-pointer"
            title="Download full resolution photo"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Cancel / Close Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 h-9 px-3.5 rounded-2xl bg-white/20 hover:bg-rose-600 hover:text-white text-white font-bold text-xs transition border border-white/30 backdrop-blur shadow-md cursor-pointer ml-1"
            title="Close photo viewer (Esc)"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>

      {/* Main Photo Canvas Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6">
        {/* Left Slider Arrow */}
        {validImages.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous Photo"
            className="absolute left-2 sm:left-6 z-30 h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-black/60 hover:bg-orange-500 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/20 shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
          </button>
        )}

        {/* High Resolution Photo Display */}
        <div 
          className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={currentPhoto}
            alt={productTitle || `Product photo ${currentIndex + 1}`}
            className="max-h-[75vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl transition-all duration-300 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>

        {/* Right Slider Arrow */}
        {validImages.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next Photo"
            className="absolute right-2 sm:right-6 z-30 h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-black/60 hover:bg-orange-500 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/20 shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
          </button>
        )}

        {/* Photo Counter Pill in center bottom */}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow-lg">
            {currentIndex + 1} / {validImages.length}
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip & Fast Slider Controls */}
      <div className="relative z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 space-y-3">
        {/* Thumbnails */}
        {validImages.length > 1 && (
          <div 
            ref={thumbnailContainerRef}
            className="flex items-center justify-center gap-2 overflow-x-auto pb-1 max-w-2xl mx-auto no-scrollbar"
          >
            {validImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setScale(1);
                  setRotation(0);
                }}
                className={`relative flex-shrink-0 h-12 w-12 sm:h-16 sm:w-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  currentIndex === idx
                    ? 'border-orange-500 scale-105 shadow-lg ring-2 ring-orange-500/50'
                    : 'border-white/30 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[8px] font-mono px-1 rounded-sm">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Bottom CTA Row for Quick Interaction */}
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                `Hello! I am viewing your product "${productTitle || 'item'}" photo on GGD and I would like to make an inquiry.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Inquire on WhatsApp</span>
            </a>
          )}

          {productUrl && (
            <a
              href={productUrl}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur border border-white/20 shadow-md transition-all cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Product Page</span>
            </a>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white/80 hover:text-white text-xs font-bold rounded-2xl hover:bg-white/10"
          >
            Cancel / Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductPhotoViewerModal;
