
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatHeader from './chat/ChatHeader';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { getStoredVixoraModel, setStoredVixoraModel } from '@/lib/vixoraModels';

const AIChat = () => {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => getStoredVixoraModel());

  useEffect(() => {
    const syncModel = (evt: any) => {
      setSelectedModel(evt?.detail?.model || getStoredVixoraModel());
    };
    window.addEventListener('vixora-model-changed', syncModel);
    return () => window.removeEventListener('vixora-model-changed', syncModel);
  }, []);

  const handleModelChange = (modelId: string) => {
    const next = setStoredVixoraModel(modelId);
    setSelectedModel(next);
  };

  const { messages, isTyping, sendMessage } = useChatMessages();
  const { isListening, toggleListening } = useSpeechRecognition();
  const { voiceEnabled, setVoiceEnabled, speakText } = useTextToSpeech();

  const handleSendMessage = () => {
    const text = inputText;
    if (!text.trim()) return;
    setInputText('');
    sendMessage(text, (response) => {
      speakText(response);
    }, selectedModel);
  };

  const handleToggleVoiceRecognition = () => {
    toggleListening((transcript) => {
      setInputText(transcript);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleToggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <Card className="flex-1 flex flex-col h-full max-w-full">
        <ChatHeader 
          voiceEnabled={voiceEnabled}
          onToggleVoice={handleToggleVoice}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />

        <CardContent className="flex-1 flex flex-col p-0">
          <ChatMessages 
            messages={messages}
            isTyping={isTyping}
          />

          <ChatInput
            inputText={inputText}
            isTyping={isTyping}
            isListening={isListening}
            onInputChange={setInputText}
            onSendMessage={handleSendMessage}
            onToggleVoiceRecognition={handleToggleVoiceRecognition}
            onKeyPress={handleKeyPress}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AIChat;
