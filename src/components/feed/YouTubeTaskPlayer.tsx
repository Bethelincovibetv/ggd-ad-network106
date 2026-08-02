import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

const loadYT = (): Promise<any> =>
  new Promise(resolve => {
    if (window.YT?.Player) return resolve(window.YT);
    const existing = document.getElementById('yt-iframe-api');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'yt-iframe-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const iv = setInterval(() => { if (window.YT?.Player) { clearInterval(iv); resolve(window.YT); } }, 300);
  });

export const youtubeId = (url: string): string | null => {
  const m = String(url || '').match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
};

interface Props {
  videoId: string;
  /** Seconds of playback required before the reward unlocks. */
  requiredSeconds: number;
  disabled?: boolean;
  onProgress?: (watched: number) => void;
  onEligible?: () => void;
}

/** Native in-feed YouTube player that monitors real watch duration and
 *  completion, so users never leave the Community Feed to do the task. */
const YouTubeTaskPlayer: React.FC<Props> = ({ videoId, requiredSeconds, disabled, onProgress, onEligible }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const watchedRef = useRef(0);
  const firedRef = useRef(false);
  const [watched, setWatched] = useState(0);

  useEffect(() => {
    let timer: any;
    let cancelled = false;

    (async () => {
      const YT = await loadYT();
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onStateChange: (e: any) => {
            const playing = e.data === YT.PlayerState.PLAYING;
            clearInterval(timer);
            if (playing) {
              timer = setInterval(() => {
                watchedRef.current += 1;
                setWatched(watchedRef.current);
                onProgress?.(watchedRef.current);
                if (!firedRef.current && watchedRef.current >= requiredSeconds) {
                  firedRef.current = true;
                  onEligible?.();
                }
              }, 1000);
            }
            if (e.data === YT.PlayerState.ENDED && !firedRef.current) {
              firedRef.current = true;
              onEligible?.();
            }
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      try { playerRef.current?.destroy?.(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, requiredSeconds]);

  const pct = Math.min(100, Math.round((watched / Math.max(1, requiredSeconds)) * 100));

  return (
    <div>
      <div className="aspect-video bg-black">
        <div ref={hostRef} className="w-full h-full" />
      </div>
      {!disabled && (
        <div className="px-3 pt-2">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Watched {Math.min(watched, requiredSeconds)}s of {requiredSeconds}s required
          </p>
        </div>
      )}
    </div>
  );
};

export default YouTubeTaskPlayer;