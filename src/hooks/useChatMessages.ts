
import { useState } from 'react';
import { Message } from '@/types/chat';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I am GGD AI — your expert Digital Marketing Mentor and Google DeepMind Science Copilot on the GGD Ad Network! 🚀\n\nI can help you with:\n• 📈 **Marketing Masterclasses:** Step-by-step copywriting (AIDA, PAS), viral video hooks, high-converting WhatsApp sales funnels, and paid advertising.\n• 🧬 **DeepMind Science Skills:** AlphaFold 3D protein predictions, UniProtKB, RCSB PDB, genomics & variants (ClinVar, gnomAD), PubChem/ChEMBL drug discovery, and biological pathways.\n• 🎯 **GGD Ad Network Scaling:** Optimize ad rotators, community deals, syndicate promoter campaigns, and credit wallet airtime redemptions.\n\nWhat would you like to learn or build today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (inputText: string, onResponse: (response: string) => void) => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Build conversation history for high-fidelity multi-turn contextual intelligence
      const historyTurns = messages
        .filter(m => m.id !== 'welcome')
        .slice(-8)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const contents = [
        ...historyTurns,
        { role: 'user', parts: [{ text: inputText }] }
      ];

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          model: 'gemini-3.8-flash',
          temperature: 0.7,
          systemInstruction: `You are GGD AI — an elite AI mentor specializing in Digital Marketing Education, E-Commerce Growth, and Google DeepMind Science Skills on the GGD Ad Network.
When the user asks about marketing: Teach them with clarity, step-by-step frameworks (AIDA, PAS, BAB), viral hooks, WhatsApp closing scripts, and practical examples.
When the user asks about DeepMind science: Provide expert scientific explanations covering AlphaFold DB (pLDDT scores, PAE matrices, 3D structures), UniProtKB, RCSB PDB, genomics (ClinVar, gnomAD pLI/LOEUF), drug discovery (PubChem, ChEMBL, Lipinski's Rule of 5), and Reactome pathways.
Always be articulate, practical, insightful, and motivating.`
        })
      });

      let aiResponseText = '';
      if (res.ok) {
        const data = await res.json();
        aiResponseText = data?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      if (!aiResponseText) {
        // High quality offline fallback
        aiResponseText = "I have processed your request! For marketing: Focus on a strong 3-second hook, agitate the specific problem, and present your offer with immediate WhatsApp call-to-action. For DeepMind science: Refer to AlphaFold DB pLDDT metrics and UniProtKB domain annotations for atomic-resolution insights.";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      onResponse(aiResponseText);
    } catch (err) {
      console.warn("AI generation note:", err);
      const fallbackText = "I'm currently optimizing my response. Try asking about a specific marketing framework (like 'Teach me AIDA copywriting' or 'Viral WhatsApp script') or a DeepMind science topic (like 'How does AlphaFold use pLDDT scores?').";
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackText,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      onResponse(fallbackText);
    }
  };

  return {
    messages,
    isTyping,
    sendMessage
  };
};
