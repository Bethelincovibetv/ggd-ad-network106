
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Square } from "lucide-react";
import { toast } from "sonner";

const VoiceWelcome = () => {
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

  const welcomeMessage = `
    Welcome to Profitmate AI! Your ultimate content creation and profit-generating suite is ready to help you build your online business. 
    To get started, simply click the "Get Started Free" button below to create your account. 
    Once you're logged in, you can generate SEO-optimized blog posts, create professional Amazon KDP-ready ebooks with AI-powered content, 
    build gaming advertisements, create high-converting sales funnels, manage ad rotations, explore CPA marketing opportunities, 
    and chat with our intelligent AI assistant. Everything you need to scale your content creation and maximize your profits is right here. 
    Let's start building your success story with Profitmate AI!
  `;

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
