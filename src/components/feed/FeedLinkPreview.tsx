import React, { useState } from 'react';
import { ExternalLink, Globe, Copy, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FeedLinkPreviewProps {
  url: string;
  title?: string | null;
  description?: string | null;
  className?: string;
  isInteractive?: boolean;
}

function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }
  return `https://${urlStr}`;
}

function getDomain(urlStr: string): string {
  try {
    const full = normalizeUrl(urlStr);
    const parsed = new URL(full);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

function generateSmartTitle(urlStr: string, customTitle?: string | null): string {
  if (customTitle && customTitle.trim()) return customTitle.trim();
  try {
    const full = normalizeUrl(urlStr);
    const parsed = new URL(full);
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const lastSeg = decodeURIComponent(pathSegments[pathSegments.length - 1])
        .replace(/[-_]+/g, ' ')
        .replace(/\.[a-z0-9]+$/i, '');
      if (lastSeg.length >= 3) {
        return lastSeg.charAt(0).toUpperCase() + lastSeg.slice(1);
      }
    }
    return `Visit ${parsed.hostname.replace(/^www\./, '')}`;
  } catch {
    return 'Featured Web Link';
  }
}

export const FeedLinkPreview: React.FC<FeedLinkPreviewProps> = ({
  url,
  title,
  description,
  className = '',
  isInteractive = true,
}) => {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const fullUrl = normalizeUrl(url);
  const domain = getDomain(fullUrl);
  const displayTitle = generateSmartTitle(url, title);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={isInteractive ? handleOpen : undefined}
      className={`group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-indigo-500/10 transition-all duration-300 shadow-md hover:shadow-xl ${
        isInteractive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Top Ambient Glow Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          {/* Domain & Verified Link Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
            >
              <img
                src={faviconUrl}
                alt=""
                className="h-3.5 w-3.5 rounded-xs object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="truncate max-w-[180px]">{domain}</span>
            </Badge>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              Direct Link
            </span>
          </div>

          {/* Quick Action: Copy Link */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Link"
            className="h-7 w-7 rounded-lg border border-border/80 bg-card/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Title & Preview Content */}
        <div className="mt-3">
          <h4 className="text-sm sm:text-base font-black text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {displayTitle}
          </h4>
          {description && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* URL Path & Open Action Footer */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground truncate max-w-[260px] sm:max-w-[380px] font-mono">
            {fullUrl}
          </p>

          <Button
            size="sm"
            onClick={handleOpen}
            className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 group-hover:scale-105 transition-transform"
          >
            <span>Open Link</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedLinkPreview;
