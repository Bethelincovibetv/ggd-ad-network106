import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VoiceNoteRecorderProps {
  onSendVoice: (audioDataUrl: string, durationSeconds: number) => Promise<void> | void;
  disabled?: boolean;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSendVoice, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Voice recording is not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || String(err?.message || '').toLowerCase().includes('denied')) {
        toast.error('Microphone permission denied. Please allow microphone access in your browser settings (or open app in a new tab).', {
          duration: 5000,
        });
        console.warn('Microphone access denied:', err?.message || err);
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        toast.error('No microphone device found on this system.');
      } else {
        toast.error('Microphone unavailable: ' + (err?.message || 'Check audio permissions'));
        console.warn('Audio recording error:', err);
      }
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSend = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    if (recordingSeconds < 1) {
      toast.info('Voice note too short');
      cancelRecording();
      return;
    }

    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    const finalSeconds = recordingSeconds;

    recorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        // Convert blob to base64 Data URL so it is retained persistently in chat history
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            await onSendVoice(base64Audio, finalSeconds);
          } finally {
            setIsProcessing(false);
            setIsRecording(false);
            setRecordingSeconds(0);
            audioChunksRef.current = [];
          }
        };
        reader.readAsDataURL(audioBlob);
      } catch (err: any) {
        console.error('Failed to process voice note', err);
        toast.error('Failed to encode voice note');
        setIsProcessing(false);
        setIsRecording(false);
      }
    };

    recorder.stop();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-transparent p-1.5 rounded-full border border-red-500/30 w-full animate-fadeIn">
        {/* Cancel button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={cancelRecording}
          disabled={isProcessing}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
          title="Cancel recording"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* Pulsing indicator & timer */}
        <div className="flex items-center gap-2 flex-1 px-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
          </span>
          <span className="font-mono text-xs font-bold text-red-600">
            {formatTime(recordingSeconds)}
          </span>
          <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
            Recording voice note...
          </span>
        </div>

        {/* Stop & Send button */}
        <Button
          type="button"
          size="sm"
          onClick={stopAndSend}
          disabled={isProcessing}
          className="h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs gap-1 px-3 shrink-0 shadow-sm"
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Send</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={startRecording}
      disabled={disabled}
      className="h-9 w-9 rounded-full text-muted-foreground hover:text-orange-600 hover:bg-orange-50 shrink-0 transition-colors"
      title="Hold or click to record voice note"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};

export default VoiceNoteRecorder;
