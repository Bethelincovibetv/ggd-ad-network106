
import { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Speech recognition error");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = (onResult: (transcript: string) => void) => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported");
      return;
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = (onResult: (transcript: string) => void) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(onResult);
    }
  };

  return {
    isListening,
    speechSupported,
    toggleListening
  };
};
