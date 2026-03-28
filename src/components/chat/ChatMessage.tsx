
import React from 'react';
import { User } from "lucide-react";
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex gap-3 w-full ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0">
        {message.sender === 'ai' ? (
          <img 
            src="/lovable-uploads/8ddaf624-8a87-493f-998f-d39c2965eb7d.png" 
            alt="GGD AI" 
            className="w-8 h-8 rounded-full bg-purple-100 p-1"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
      
      <div className={`flex-1 max-w-[70%] ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block p-3 rounded-2xl break-words ${
            message.sender === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-800 shadow-sm border'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        <p className="text-xs text-gray-500 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
