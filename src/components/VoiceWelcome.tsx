
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Square } from "lucide-react";
import { toast } from "sonner";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

const VoiceWelcome = () => {
  const { isEnabled } = useFeatureToggles();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  useEffect(() => {
    // Check if speech synthesis is supported
    if ('speechSynthesis' in window) {
      setSpeechSupported(true);
    }
  }, []);

  useEffect(() => {
    // Auto-play the welcome message when component mounts
    if (speechSupported && !hasAutoPlayed) {
      // Delay to ensure voices are loaded
      setTimeout(() => {
        playWelcomeMessage(true);
        setHasAutoPlayed(true);
      }, 1000);
    }
  }, [speechSupported, hasAutoPlayed]);

  const welcomeMessage = (() => {
    const capabilities: string[] = [];
    if (isEnabled('business_directory')) capabilities.push("list your verified business in the directory");
    if (isEnabled('syndicate_non_whatsapp_channels')) {
      capabilities.push("launch paid multi-platform promoter campaigns with verified proof");
    } else {
      capabilities.push("launch paid WhatsApp Status campaigns with verified screenshot proof");
    }
    if (isEnabled('banner_ads')) capabilities.push("launch commercial banner advertising");
    if (isEnabled('credit_tasks')) capabilities.push("complete promotional tasks for credits");
    if (isEnabled('blogmate_ai')) capabilities.push("generate SEO-optimized blog posts");

    const capString = capabilities.length > 0 ? capabilities.join(", ") : "grow your brand with verified audience reach";

    return `Welcome to GGD Ad Network! Your premier platform to ${capString}. Everything you need to scale your reach is right here. Let's start building your success story with GGD Ad Network!`;
  })();

  const playWelcomeMessage = (autoPlay = false) => {
    if (!speechSupported) {
      if (!autoPlay) {
        toast.error("Speech synthesis is not supported in your browser");
      }
      return;
    }

    if (isPlaying) {
      // Stop the current speech
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(welcomeMessage);
    
    // Configure voice settings
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.includes('en-US'));
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      if (!autoPlay) {
        toast.error("Failed to play welcome message");
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  if (!speechSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <Button
        onClick={() => playWelcomeMessage()}
        className={`rounded-full p-4 shadow-lg transition-all duration-200 ${
          isPlaying 
            ? 'bg-purple-500 hover:bg-purple-600 animate-pulse' 
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
        title={isPlaying ? "Welcome message playing..." : "Play welcome message"}
      >
        {isPlaying ? <Volume2 className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
      </Button>
      
      {isPlaying && (
        <Button
          onClick={stopSpeech}
          className="rounded-full p-4 shadow-lg bg-red-500 hover:bg-red-600 transition-all duration-200"
          title="Stop welcome message"
        >
          <Square className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default VoiceWelcome;
