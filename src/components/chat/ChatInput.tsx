
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff } from "lucide-react";

interface ChatInputProps {
  inputText: string;
  isTyping: boolean;
  isListening: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onToggleVoiceRecognition: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

const ChatInput = ({
  inputText,
  isTyping,
  isListening,
  onInputChange,
  onSendMessage,
  onToggleVoiceRecognition,
  onKeyPress
}: ChatInputProps) => {
  return (
    <div className="p-4 bg-white border-t">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Type your message to GGD..."
            className="pr-12"
            disabled={isTyping}
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={onToggleVoiceRecognition}
            disabled={isTyping}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-red-500" />
            ) : (
              <Mic className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </div>
        <Button 
          onClick={onSendMessage} 
          disabled={!inputText.trim() || isTyping}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
