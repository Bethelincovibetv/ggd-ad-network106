
import React from 'react';
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX } from "lucide-react";
import { VIXORA_CHAT_MODELS, DEFAULT_VIXORA_MODEL } from "@/lib/vixoraModels";

interface ChatHeaderProps {
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
}

const ChatHeader = ({
  voiceEnabled,
  onToggleVoice,
  selectedModel = DEFAULT_VIXORA_MODEL,
  onModelChange,
}: ChatHeaderProps) => {
  return (
    <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img loading="lazy" 
              src="/lovable-uploads/8ddaf624-8a87-493f-998f-d39c2965eb7d.png" 
              alt="GGD AI" 
              className="w-10 h-10 rounded-full bg-white p-1"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">GGD AI Assistant</CardTitle>
            <p className="text-purple-100 text-xs sm:text-sm truncate">Server-side Gemini &amp; Gemma Chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onModelChange && (
            <select
              aria-label="Select AI Model"
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="h-8 max-w-[155px] rounded-lg bg-white/15 border border-white/30 text-white text-xs font-bold px-2 outline-none cursor-pointer"
            >
              {VIXORA_CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="text-slate-900 bg-white">
                  {m.shortLabel}
                </option>
              ))}
            </select>
          )}
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            Online
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={onToggleVoice}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
