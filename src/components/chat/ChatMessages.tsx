
import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { Message } from '@/types/chat';

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
}

const ChatMessages = ({ messages, isTyping }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 w-full">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      
      {isTyping && (
        <div className="flex gap-3 max-w-full">
          <img 
            src="/lovable-uploads/8ddaf624-8a87-493f-998f-d39c2965eb7d.png" 
            alt="GGD AI" 
            className="w-8 h-8 rounded-full bg-purple-100 p-1 flex-shrink-0"
          />
          <div className="bg-white p-3 rounded-2xl shadow-sm border">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
