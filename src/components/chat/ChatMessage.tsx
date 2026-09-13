
import React from 'react';
import { User } from "lucide-react";
import { Message } from '@/types/chat';
import MessageStatusIndicator from './MessageStatusIndicator';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.sender === 'user';
  const effectiveStatus = message.status || (isUser ? 'seen' : 'delivered');

  return (
    <div className={`flex gap-3 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="flex-shrink-0">
        {message.sender === 'ai' ? (
          <img loading="lazy" 
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
      
      <div className={`flex-1 max-w-[70%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block p-3 rounded-2xl break-words ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-white text-gray-800 shadow-sm border rounded-bl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {isUser ? (
            <MessageStatusIndicator
              status={effectiveStatus}
              timestamp={message.timestamp}
              seenAt={message.seenAt}
              variant="on-light"
              size="xs"
            />
          ) : (
            <span className="text-[10px] text-gray-500">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

