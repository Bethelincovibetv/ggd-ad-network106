import React, { useState } from 'react';
import { Play, ExternalLink, Video as VideoIcon, Youtube, Volume2, ShieldCheck } from 'lucide-react';
import { classifyVideoUrl, ParsedVideoInfo } from '@/utils/urlParser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EmbeddedVideoPlayerProps {
  url: string;
  title?: string | null;
  className?: string;
  autoPlayOnClick?: boolean;
}

export const EmbeddedVideoPlayer: React.FC<EmbeddedVideoPlayerProps> = ({
  url,
  title,
  className = '',
  autoPlayOnClick = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoInfo: ParsedVideoInfo = classifyVideoUrl(url);

  if (!url || !videoInfo.isVideo) {
    return null;
  }

  const isShorts = videoInfo.provider === 'youtube_shorts' || videoInfo.provider === 'tiktok';
  const youtubeThumbnail = videoInfo.videoId && (videoInfo.provider === 'youtube' || videoInfo.provider === 'youtube_shorts')
    ? `https://img.youtube.com/vi/${videoInfo.videoId}/hqdefault.jpg`
    : null;

  const providerLabel = {
    youtube: 'YouTube Video',
    youtube_shorts: 'YouTube Short',
    vimeo: 'Vimeo',
    tiktok: 'TikTok',
    loom: 'Loom Recording',
    dailymotion: 'Dailymotion',
    direct: 'Direct Video',
  }[videoInfo.provider || 'direct'] || 'Embedded Video';

  // Render direct HTML5 video element for MP4/WebM files
  if (videoInfo.provider === 'direct') {
    return (
      <div className={`overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-lg ${className}`}>
        <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 text-[11px] text-neutral-300">
          <div className="flex items-center gap-1.5">
            <VideoIcon className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-semibold">{title || 'Video Player'}</span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-neutral-800 text-neutral-300 border-neutral-700">
            MP4 / WebM
          </Badge>
        </div>
        <video
          src={videoInfo.rawUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[500px] bg-black object-contain"
        />
      </div>
    );
  }

  // Embed URL for iframe
  const embedSrc = isPlaying && autoPlayOnClick && videoInfo.embedUrl && !videoInfo.embedUrl.includes('autoplay=1')
    ? `${videoInfo.embedUrl}${videoInfo.embedUrl.includes('?') ? '&' : '?'}autoplay=1`
    : videoInfo.embedUrl;

  return (
    <div className={`overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900/90 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2 truncate">
          {videoInfo.provider === 'youtube' || videoInfo.provider === 'youtube_shorts' ? (
            <Youtube className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <VideoIcon className="h-4 w-4 text-orange-500 shrink-0" />
          )}
          <span className="font-semibold text-white truncate text-[11px]">
            {title || videoInfo.titleSuggestion || 'Featured Video'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 border-red-500/30"
          >
            {providerLabel}
          </Badge>
          <a
            href={videoInfo.rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-white transition-colors"
            title="Open on original platform"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Video Viewport: 16:9 or 9:16 for shorts */}
      <div
        className={`relative w-full bg-black ${
          isShorts ? 'aspect-[9/16] max-h-[560px] mx-auto max-w-[320px]' : 'aspect-video'
        }`}
      >
        {!isPlaying && youtubeThumbnail ? (
          <div
            onClick={() => setIsPlaying(true)}
            className="group relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center bg-black"
          >
            <img
              src={youtubeThumbnail}
              alt={title || 'Video preview'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90"
            />
            {/* Ambient Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 group-hover:bg-black/20 transition-colors" />

            {/* Glowing Big Play Button */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-full bg-red-600 group-hover:bg-red-500 flex items-center justify-center shadow-2xl shadow-red-600/50 group-hover:scale-110 transition-all duration-300">
                <Play className="h-7 w-7 text-white fill-white ml-1" />
              </div>
              <span className="text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10">
                Click to Watch
              </span>
            </div>
          </div>
        ) : (
          <iframe
            src={embedSrc || ''}
            title={title || 'Embedded Video Player'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
};

export default EmbeddedVideoPlayer;
