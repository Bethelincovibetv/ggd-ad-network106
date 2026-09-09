import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  duration?: number;
  isMine?: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ src, duration = 0, isMine = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [speed, setSpeed] = useState<number>(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetTime = Number(e.target.value);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    audio.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2.5 p-2 rounded-xl select-none ${
      isMine ? 'text-white' : 'text-foreground'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 ${
          isMine
            ? 'bg-white text-orange-600 hover:bg-orange-50'
            : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90'
        }`}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      {/* Progress & Waveform bars */}
      <div className="flex-1 min-w-[130px] space-y-1">
        <div className="relative flex items-center h-5">
          {/* Simulated WhatsApp Waveform Bars */}
          <div className="absolute inset-0 flex items-center justify-between gap-0.5 px-0.5 pointer-events-none opacity-80">
            {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 75, 50, 85, 65, 40, 90, 60].map((h, i) => {
              const barPercent = (i / 18) * 100;
              const isFilled = barPercent <= progressPercent;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-colors ${
                    isFilled
                      ? isMine ? 'bg-white' : 'bg-orange-500'
                      : isMine ? 'bg-white/40' : 'bg-muted-foreground/30'
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>

          <input
            type="range"
            min={0}
            max={totalDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full opacity-0 cursor-pointer h-full z-10"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono font-medium opacity-90 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Speed multiplier button */}
      <button
        type="button"
        onClick={toggleSpeed}
        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors shrink-0 ${
          isMine
            ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            : 'bg-secondary border-border text-foreground hover:bg-secondary/80'
        }`}
        title="Change playback speed"
      >
        {speed}x
      </button>
    </div>
  );
};

export default VoiceNotePlayer;
