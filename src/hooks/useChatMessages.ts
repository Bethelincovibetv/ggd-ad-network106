
import { useState } from 'react';
import { Message } from '@/types/chat';
import {
  formatLegacyDirectResponse,
  getStoredVixoraModel,
  normalizeSelectedVixoraModel,
} from '@/lib/vixoraModels';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi there! I'm GGD AI, your server-side assistant powered by Gemini & Gemma models. Ask me about blog content, banner ads, campaigns, or business growth anytime.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (
    inputText: string,
    onResponse: (response: string) => void,
    modelOverride?: string
  ) => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'user',
      timestamp: new Date()
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setIsTyping(true);

    const activeModel = normalizeSelectedVixoraModel(modelOverride || getStoredVixoraModel());

    try {
      const response = await fetch('/api/vixora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assistant',
          model: activeModel,
          prompt: trimmed,
          messages: nextHistory.slice(-10).map((m) => ({
            sender: m.sender === 'user' ? 'user' : 'model',
            text: m.text,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      const rawReply =
        payload?.text ||
        payload?.error ||
        'Unable to reach GGD AI right now. Please try again in a moment.';
      const formattedReply = formatLegacyDirectResponse(String(rawReply)) || String(rawReply);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: formattedReply,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiMessage]);
      onResponse(formattedReply);
    } catch {
      const fallbackReply = 'Network error reaching the AI service. Please try again shortly.';
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackReply,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMessage]);
      onResponse(fallbackReply);
    } finally {
      setIsTyping(false);
    }
  };

  return {
    messages,
    isTyping,
    sendMessage
  };
};
