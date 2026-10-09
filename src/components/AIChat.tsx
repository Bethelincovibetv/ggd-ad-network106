
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatHeader from './chat/ChatHeader';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

const AIChat = () => {
  const [inputText, setInputText] = useState('');
  
  const { messages, isTyping, sendMessage } = useChatMessages();
  const { isListening, toggleListening } = useSpeechRecognition();
  const { voiceEnabled, setVoiceEnabled, speakText } = useTextToSpeech();

  const handleSendMessage = () => {
    sendMessage(inputText, (response) => {
      speakText(response);
    });
    setInputText('');
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

  const suggestionChips = [
    { label: "📈 Teach Me Marketing (AIDA & Hooks)", prompt: "Teach me how to use the AIDA marketing framework and viral hooks to sell products on WhatsApp and social media with practical examples." },
    { label: "🧬 DeepMind Science (AlphaFold & pLDDT)", prompt: "Explain Google DeepMind's AlphaFold DB: How does it predict 3D protein structures, what do pLDDT confidence scores mean, and how does the PAE matrix work?" },
    { label: "🧪 Drug Discovery (Lipinski & PubChem)", prompt: "Teach me medicinal chemistry and drug discovery: Explain Lipinski's Rule of 5, Veber rules, and how PubChem/ChEMBL screening works." },
    { label: "💬 WhatsApp Sales Closer Script", prompt: "Give me an elite, high-converting WhatsApp sales closing script for an e-commerce store with objection handling and urgency triggers." },
    { label: "🔬 Genomics: gnomAD pLI & ClinVar", prompt: "Explain human genomics and variant curation using ClinVar ACMG standards and gnomAD gene constraint metrics like pLI and LOEUF." },
    { label: "🎯 Scale My GGD Ad Network Campaigns", prompt: "How do I optimize my ad campaigns on GGD Ad Network using the Ad Rotator and Syndicate WhatsApp Promoters to maximize ROAS?" }
  ];

  const handleChipClick = (prompt: string) => {
    setInputText(prompt);
    sendMessage(prompt, (response) => {
      speakText(response);
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[660px] flex flex-col">
      <Card className="flex-1 flex flex-col h-full max-w-full overflow-hidden border border-border shadow-xl">
        <ChatHeader 
          voiceEnabled={voiceEnabled}
          onToggleVoice={handleToggleVoice}
        />

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Quick Marketing & DeepMind Science Chips */}
          <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 shrink-0">
              ⚡ Explore Skills:
            </span>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip.prompt)}
                disabled={isTyping}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-background hover:bg-orange-500/10 hover:text-orange-600 border border-border/80 transition-all text-muted-foreground active:scale-95 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

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
