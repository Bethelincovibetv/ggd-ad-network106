
import { useState, useEffect } from 'react';

export const useTextToSpeech = () => {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setSpeechSupported(true);
    }
  }, []);

  const speakText = (text: string) => {
    if (!speechSupported || !voiceEnabled) return;

    // Clean text for speech (remove emojis and special characters)
    const cleanText = text.replace(/[^\w\s.,!?]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    ) || voices.find(voice => voice.lang.includes('en-US'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  return {
    voiceEnabled,
    setVoiceEnabled,
    speechSupported,
    speakText
  };
};
