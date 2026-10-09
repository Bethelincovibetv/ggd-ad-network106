
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Sparkles, MessageSquare, X } from "lucide-react";

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
    <div className="p-3 sm:p-4 bg-card/60 backdrop-blur-md border-t border-border/80">
      {/* 3D Colorful Glowing Community-Style Chat Bar */}
      <div className="relative group p-[2px] rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 via-purple-600 to-amber-400 shadow-md hover:shadow-xl transition-all duration-300">
        <div className="bg-card/95 backdrop-blur-md rounded-[14px] p-1.5 sm:p-2 flex items-center gap-2">
          {/* 3D Colorful Icon Badge */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30 shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="h-4 w-4 sm:h-4.5 sm:w-4.5 drop-shadow" />
          </div>

          {/* Input */}
          <div className="relative flex-1 min-w-0" dir="ltr">
            <Input
              dir="ltr"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyPress}
              placeholder="Ask GGD AI about Marketing, DeepMind Science, or Ad Campaigns..."
              className="h-9 sm:h-10 border-0 bg-transparent text-xs sm:text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 px-1 text-left [direction:ltr]"
              disabled={isTyping}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {inputText && (
              <button
                type="button"
                onClick={() => onInputChange('')}
                className="h-7 w-7 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors"
                title="Clear input"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <Button
              size="sm"
              variant="ghost"
              type="button"
              className={`h-9 w-9 rounded-xl p-0 hover:bg-muted/80 transition-colors ${
                isListening ? 'text-rose-500 bg-rose-500/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={onToggleVoiceRecognition}
              disabled={isTyping}
              title={isListening ? "Listening... click to stop" : "Speak message"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4 text-rose-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              onClick={onSendMessage}
              disabled={!inputText.trim() || isTyping}
              type="button"
              className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-xl font-bold text-xs h-9 sm:h-10 px-3 sm:px-4 shadow-md shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
