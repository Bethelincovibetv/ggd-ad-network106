/**
 * URL and Video Parser Utility
 * Automatically detects, classifies, and formats web links and video URLs.
 */

export interface ParsedVideoInfo {
  isVideo: boolean;
  provider: 'youtube' | 'youtube_shorts' | 'vimeo' | 'tiktok' | 'loom' | 'dailymotion' | 'direct' | null;
  embedUrl: string | null;
  rawUrl: string;
  videoId?: string;
  titleSuggestion?: string;
}

export interface ParsedUrlInfo {
  url: string;
  isVideo: boolean;
  videoInfo?: ParsedVideoInfo;
}

// Robust regex matching http/https URLs
export const URL_REGEX = /(https?:\/\/[^\s<>'")]+)/gi;

/**
 * Extracts all valid URLs from any plain text string
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // Clean trailing punctuation often accidentally included (e.g. . , ! ? )
  return Array.from(new Set(matches.map(u => u.replace(/[.,!?;:)]+$/, ''))));
}

/**
 * Normalizes URL with https protocol if missing
 */
export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Analyzes a URL and determines whether it is a video (YouTube, Vimeo, TikTok, Loom, Direct MP4, etc.)
 * and constructs the proper embed URL.
 */
export function classifyVideoUrl(urlStr: string): ParsedVideoInfo {
  const clean = normalizeUrl(urlStr);
  try {
    const u = new URL(clean);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = u.pathname;

    // 1. YouTube Shorts (e.g. youtube.com/shorts/<id>)
    if ((host === 'youtube.com' || host === 'm.youtube.com') && pathname.includes('/shorts/')) {
      const parts = pathname.split('/shorts/')[1]?.split(/[?&#]/)[0];
      if (parts) {
        return {
          isVideo: true,
          provider: 'youtube_shorts',
          embedUrl: `https://www.youtube.com/embed/${parts}?autoplay=0&rel=0&modestbranding=1`,
          rawUrl: clean,
          videoId: parts,
          titleSuggestion: 'YouTube Short',
        };
      }
    }

    // 2. YouTube Standard (youtube.com/watch?v=... or youtu.be/<id>)
    if (host === 'youtu.be') {
      const id = pathname.slice(1).split(/[?&#]/)[0];
      if (id) {
        return {
          isVideo: true,
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`,
          rawUrl: clean,
          videoId: id,
          titleSuggestion: 'YouTube Video',
        };
      }
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) {
        return {
          isVideo: true,
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`,
          rawUrl: clean,
          videoId: id,
          titleSuggestion: 'YouTube Video',
        };
      }
      if (pathname.includes('/embed/')) {
        const id = pathname.split('/embed/')[1]?.split(/[?&#]/)[0];
        return {
          isVideo: true,
          provider: 'youtube',
          embedUrl: clean,
          rawUrl: clean,
          videoId: id,
          titleSuggestion: 'YouTube Video',
        };
      }
    }

    // 3. Vimeo (vimeo.com/<id>)
    if (host === 'vimeo.com') {
      const idMatch = pathname.match(/\/(\d+)/);
      if (idMatch && idMatch[1]) {
        return {
          isVideo: true,
          provider: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${idMatch[1]}?title=0&byline=0&portrait=0`,
          rawUrl: clean,
          videoId: idMatch[1],
          titleSuggestion: 'Vimeo Video',
        };
      }
    }

    // 4. TikTok (tiktok.com/@user/video/<id>)
    if (host.includes('tiktok.com')) {
      const idMatch = pathname.match(/\/video\/(\d+)/);
      if (idMatch && idMatch[1]) {
        return {
          isVideo: true,
          provider: 'tiktok',
          embedUrl: `https://www.tiktok.com/embed/v2/${idMatch[1]}`,
          rawUrl: clean,
          videoId: idMatch[1],
          titleSuggestion: 'TikTok Video',
        };
      }
    }

    // 5. Loom (loom.com/share/<id>)
    if (host.includes('loom.com') && pathname.includes('/share/')) {
      const id = pathname.split('/share/')[1]?.split(/[?&#]/)[0];
      if (id) {
        return {
          isVideo: true,
          provider: 'loom',
          embedUrl: `https://www.loom.com/embed/${id}`,
          rawUrl: clean,
          videoId: id,
          titleSuggestion: 'Loom Recording',
        };
      }
    }

    // 6. Dailymotion (dailymotion.com/video/<id> or dai.ly/<id>)
    if (host.includes('dailymotion.com') || host === 'dai.ly') {
      let id = '';
      if (host === 'dai.ly') {
        id = pathname.slice(1).split(/[?&#]/)[0];
      } else if (pathname.includes('/video/')) {
        id = pathname.split('/video/')[1]?.split(/[?&#]/)[0];
      }
      if (id) {
        return {
          isVideo: true,
          provider: 'dailymotion',
          embedUrl: `https://www.dailymotion.com/embed/video/${id}`,
          rawUrl: clean,
          videoId: id,
          titleSuggestion: 'Dailymotion Video',
        };
      }
    }

    // 7. Direct video files (.mp4, .webm, .mov, .ogg, .m4v)
    if (/\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(pathname)) {
      return {
        isVideo: true,
        provider: 'direct',
        embedUrl: clean,
        rawUrl: clean,
        titleSuggestion: 'Direct Video Stream',
      };
    }
  } catch {}

  return {
    isVideo: false,
    provider: null,
    embedUrl: null,
    rawUrl: clean,
  };
}

/**
 * Scans a text string and returns the first video URL and first general link found
 */
export function scanTextForMediaUrls(text: string): {
  videoUrl: string | null;
  videoInfo: ParsedVideoInfo | null;
  linkUrl: string | null;
  allUrls: string[];
} {
  const allUrls = extractUrls(text);
  let videoUrl: string | null = null;
  let videoInfo: ParsedVideoInfo | null = null;
  let linkUrl: string | null = null;

  for (const u of allUrls) {
    const v = classifyVideoUrl(u);
    if (v.isVideo) {
      if (!videoUrl) {
        videoUrl = u;
        videoInfo = v;
      }
    } else {
      if (!linkUrl) {
        linkUrl = u;
      }
    }
  }

  return { videoUrl, videoInfo, linkUrl, allUrls };
}
