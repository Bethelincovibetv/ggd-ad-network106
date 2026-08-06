
import React from 'react';
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX } from "lucide-react";

interface ChatHeaderProps {
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

const ChatHeader = ({ voiceEnabled, onToggleVoice }: ChatHeaderProps) => {
  return (
    <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img loading="lazy" 
              src="/lovable-uploads/8ddaf624-8a87-493f-998f-d39c2965eb7d.png" 
              alt="GGD AI" 
              className="w-10 h-10 rounded-full bg-white p-1"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <CardTitle className="text-lg">GGD AI Assistant</CardTitle>
            <p className="text-purple-100 text-sm">Your friendly BlogMate AI companion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            Online
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
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
