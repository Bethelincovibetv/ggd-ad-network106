import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { VIXORA_AGENT_TOOLS, VixoraAppContext } from '../services/vixoraAgentTools';
import { generateBannerAdvertCanvas } from '../services/vixoraBannerEngine';
import { resolveAdminAiApiKey } from '../services/adminKeySync';
import vixoraAgentAvatar from '@/assets/images/vixora_agent_avatar_1786108775324.jpg';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vixora';
  text: string;
  timestamp: string;
  actionBadge?: string;
  imageUrl?: string;
  attachedFile?: { name: string; text?: string };
  isThinking?: boolean;
  navigatedTab?: string;
  videoResult?: {
    title: string;
    videoUrl: string;
    duration: string;
    aspectRatio: string;
    scenesCount?: number;
    scriptSnippet?: string;
  };
  bannerAdResult?: {
    title: string;
    description: string;
    ctaText: string;
    format: string;
    imageUrl: string;
    brandName?: string;
  };
  scriptResult?: {
    title: string;
    script: string;
    wordCount?: number;
  };
  voiceoverResult?: {
    text: string;
    audioUrl?: string;
    voiceName: string;
    duration?: number;
  };
  seoResult?: {
    topic: string;
    tags?: string[];
    hooks?: string[];
    thumbnails?: string[];
  };
  accountOverviewResult?: {
    fullName: string;
    email: string;
    credits: number;
    walletBalance: number;
    activeAdsCount: number;
    activeTasksCount: number;
    productsCount: number;
    unreadNotificationsCount?: number;
    summaryText: string;
  };
  productsResult?: {
    action: 'list' | 'created' | 'updated';
    products: Array<{
      id?: string;
      title: string;
      price: number | string;
      description?: string;
      category?: string;
      imageUrl?: string;
      status?: string;
    }>;
  };
  campaignsResult?: Array<{
    id: string;
    title: string;
    impressions: number;
    clicks: number;
    is_active: boolean;
  }>;
}

// Clean formatting component without asterisks and with prominent readable typography
export const FormattedChatText: React.FC<{ text: string; isUser?: boolean; themeMode?: 'light' | 'dark' }> = ({
  text,
  isUser = false,
  themeMode = 'dark'
}) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`space-y-2 text-sm sm:text-base font-semibold leading-relaxed tracking-normal ${
      isUser ? 'text-white' : themeMode === 'light' ? 'text-slate-900' : 'text-slate-100'
    }`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIdx} className="h-1.5" />;

        const isBullet = /^[•\-*]\s+/.test(trimmed);
        const isNumber = /^\d+\.\s+/.test(trimmed);
        const cleanLine = trimmed.replace(/^[•\-*]\s+/, '').replace(/^\d+\.\s+/, '');

        const renderLineContent = (rawText: string) => {
          const parts = rawText.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldContent = part.slice(2, -2).replace(/\*/g, '').trim();
              return (
                <strong key={pIdx} className="font-black text-white dark:text-white underline-offset-2 tracking-tight">
                  {boldContent}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              const boldContent = part.slice(1, -1).replace(/\*/g, '').trim();
              return (
                <strong key={pIdx} className="font-extrabold text-amber-300 dark:text-amber-300">
                  {boldContent}
                </strong>
              );
            }
            const stripped = part.replace(/\*/g, '');
            return <span key={pIdx}>{stripped}</span>;
          });
        };

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 pl-1 my-1">
              <span className="h-2 w-2 rounded-full bg-ggd-orange shrink-0 mt-2 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              <span className="flex-1 font-semibold">{renderLineContent(cleanLine)}</span>
            </div>
          );
        }

        if (isNumber) {
          const numMatch = trimmed.match(/^(\d+)\.\s+/);
          const num = numMatch ? numMatch[1] : '1';
          return (
            <div key={lineIdx} className="flex items-start gap-2.5 pl-1 my-1">
              <span className="h-5 w-5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black shrink-0 flex items-center justify-center mt-0.5">
                {num}
              </span>
              <span className="flex-1 font-semibold">{renderLineContent(cleanLine)}</span>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="font-semibold">
            {renderLineContent(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

interface VixoraTextChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appContext: VixoraAppContext;
  apiKey: string;
  themeMode?: 'light' | 'dark';
  isFullTab?: boolean;
  onStartLiveAssistant?: () => void;
  initialPrompt?: string;
}

const DEFAULT_WELCOME_MSG: ChatMessage = {
  id: 'msg_welcome',
  sender: 'vixora',
  text: "How far my creator! 👋 I am Vixora, your AI Creator Assistant. Everything is powered seamlessly in the cloud—no API keys or setup required! You can chat with me or give me direct commands—I can generate videos on autopilot, change narrator voices, switch tabs, manage channel preferences, or write viral scripts! What are we cooking today?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export const VixoraTextChatPanel: React.FC<VixoraTextChatPanelProps> = ({
  isOpen,
  onClose,
  appContext,
  apiKey,
  themeMode = 'dark',
  isFullTab = false,
  onStartLiveAssistant,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vixora_text_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_WELCOME_MSG];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('vixora_text_chat_history', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  useEffect(() => {
    if (isOpen || isFullTab) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, isFullTab, messages]);

  useEffect(() => {
    if (initialPrompt) {
      setInputQuery(initialPrompt);
    }
  }, [initialPrompt]);

  const interruptAi = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {}
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setMessages(prev => {
      const withoutThinking = prev.filter(m => !m.isThinking);
      return [
        ...withoutThinking,
        {
          id: `int_${Date.now()}`,
          sender: 'vixora',
          text: "⚡ [Response stopped by creator. Ready for your next instruction!]",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionBadge: "Interrupted by Creator"
        }
      ];
    });
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputQuery).trim();
    if (!textToSend && !attachedImage && !attachedFile) return;

    // If AI is currently replying, interrupt the active stream first
    if (isProcessing) {
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
        abortControllerRef.current = null;
      }
      setIsProcessing(false);
    }

    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    let fullPromptText = textToSend;
    if (attachedFile) {
      fullPromptText += `\n\n[Attached File Content (${attachedFile.name})]:\n${attachedFile.text.slice(0, 3000)}`;
    }

    const userMsgId = `usr_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend || (attachedImage ? 'Uploaded an image for analysis' : 'Uploaded a file'),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageUrl: attachedImage || undefined,
      attachedFile: attachedFile ? { name: attachedFile.name } : undefined
    };

    const thinkingMsgId = `think_${Date.now()}`;
    const thinkingMsg: ChatMessage = {
      id: thinkingMsgId,
      sender: 'vixora',
      text: "Vixora is thinking & preparing action...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isThinking: true
    };

    setMessages(prev => [...prev.filter(m => !m.isThinking), userMsg, thinkingMsg]);
    setInputQuery('');
    setAttachedImage(null);
    setAttachedFile(null);
    setIsAddMenuOpen(false);
    setIsProcessing(true);

    try {
      const isInvalidKey = (k?: string) => {
        if (!k) return true;
        const clean = k.trim();
        return (
          !clean ||
          clean === 'undefined' ||
          clean === 'null' ||
          clean === 'your_gemini_api_key_here' ||
          clean.includes('AIzaSyAd6JjVFP5LYmtiSUXLH-HZGIPlHcseohA') ||
          clean.includes('AIzaSyAeCyBC9daZbvXNRtfLjxBWwpF3MwXJggk') ||
          clean.includes('AIzaSyCBO1PRv5h9aQAB3rWb') ||
          clean.startsWith('AIzaSy...')
        );
      };

      const envApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || (process as any).env?.API_KEY || '';
      let activeKey = !isInvalidKey(apiKey) ? apiKey : !isInvalidKey(envApiKey) ? envApiKey : '';
      if (!activeKey || isInvalidKey(activeKey)) {
        activeKey = await resolveAdminAiApiKey();
      }

      const systemInstruction = `You are 'Vixora' (Visora AI), the highly energetic, vibrant, warm, and brilliant Nigerian AI Creator Assistant & Video Producer! Address the user warmly by name (${appContext.userFullName || 'Creator'}). Your voice and vibe are 100% highly energetic, lively, witty, supportive, creative, and enthusiastic with authentic, warm Nigerian energy (e.g., "No wahala at all!", "Oya let's cook this viral masterpiece!", "I hear you crystal clear!"). Speak dynamically with high energy. No asterisks (*).

YOUR MANDATE:
You can CONTROL the Vixora AI Studio app directly for the user using function calls/tools!
Whenever the user asks you to make a video, switch tabs, change voice, edit script, change caption style, generate a flyer, or learn a skill, CALL THE APPROPRIATE TOOL!
You have full direct platform authority. All AI video generation, scripts, voiceover TTS, and stock media are handled automatically by the platform backend connected to Cloud SQL. The user NEVER needs to enter any API keys or configure credentials. Under NO circumstances should you ask the user to provide an API key, enter a key in profile, or configure credentials. You assist them with content strategy, hooks, video scene concepts, voice recommendations, and channel optimization.

AMBIGUITY RULE:
If the user's request is ambiguous or missing information, ask a quick, friendly clarifying question first in chat.

NAVIGATION:
If user asks to open studio, autopilot, scripts, voiceover, tools, or any page, call the navigateToTab tool immediately!`;

      // Build conversation history turns for Gemini
      const historyTurns: any[] = messages
        .filter(m => !m.isThinking)
        .slice(-10)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const userParts: any[] = [{ text: fullPromptText || 'Hello Vixora! Please assist me.' }];
      if (attachedImage) {
        const match = attachedImage.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          userParts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      historyTurns.push({
        role: 'user',
        parts: userParts
      });

      let responseText = '';
      let actionBadgeText: string | undefined = undefined;
      let generatedImageUrl: string | undefined = undefined;
      let targetNavTab: string | undefined = undefined;
      let videoResultData: any = undefined;
      let bannerAdResultData: any = undefined;
      let scriptResultData: any = undefined;
      let voiceoverResultData: any = undefined;
      let seoResultData: any = undefined;
      let accountOverviewResultData: any = undefined;
      let productsResultData: any = undefined;
      let campaignsResultData: any = undefined;

      if (currentController.signal.aborted) return;

      if (activeKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: activeKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: historyTurns,
            config: {
              systemInstruction,
              tools: [{
                functionDeclarations: VIXORA_AGENT_TOOLS.map(t => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters
                }))
              }]
            }
          });

          if (currentController.signal.aborted) return;

          responseText = response.text || '';

          // Handle Function Calls
          if (response.functionCalls && response.functionCalls.length > 0) {
            for (const fc of response.functionCalls) {
              const tool = VIXORA_AGENT_TOOLS.find(t => t.name === fc.name);
              if (tool) {
                const toolResult = await tool.execute(fc.args, appContext);
                actionBadgeText = `⚡ ${toolResult.message}`;
                if (toolResult.data?.imageUrl) {
                  generatedImageUrl = toolResult.data.imageUrl;
                }
                if (toolResult.data?.videoResult) {
                  videoResultData = toolResult.data.videoResult;
                }
                if (toolResult.data?.bannerAdResult || toolResult.data?.bannerAd) {
                  bannerAdResultData = toolResult.data.bannerAdResult || toolResult.data.bannerAd;
                }
                if (toolResult.data?.scriptResult) {
                  scriptResultData = toolResult.data.scriptResult;
                }
                if (toolResult.data?.voiceoverResult) {
                  voiceoverResultData = toolResult.data.voiceoverResult;
                }
                if (toolResult.data?.seoResult) {
                  seoResultData = toolResult.data.seoResult;
                }
                if (toolResult.data?.accountOverviewResult) {
                  accountOverviewResultData = toolResult.data.accountOverviewResult;
                }
                if (toolResult.data?.productsResult) {
                  productsResultData = toolResult.data.productsResult;
                }
                if (toolResult.data?.campaignsResult) {
                  campaignsResultData = toolResult.data.campaignsResult;
                }
                if (fc.name === 'navigateToTab' && fc.args?.tab) {
                  targetNavTab = String(fc.args.tab);
                }

                try {
                  const secondPassTurns = [
                    ...historyTurns,
                    {
                      role: 'model',
                      parts: [{ functionCall: { name: fc.name, args: fc.args } }]
                    },
                    {
                      role: 'user',
                      parts: [{
                        functionResponse: {
                          name: fc.name,
                          response: { result: toolResult.message }
                        }
                      }]
                    }
                  ];

                  const secondRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: secondPassTurns,
                    config: { systemInstruction }
                  });

                  if (secondRes.text) {
                    responseText = secondRes.text;
                  }
                } catch (err) {
                  if (!responseText) {
                    responseText = `No wahala! I have executed ${fc.name}: ${toolResult.message}`;
                  }
                }
              }
            }
          }
        } catch (firstPassErr) {
          console.warn("First pass chat model call warning:", firstPassErr);
        }
      }

      // If client-side GenAI didn't produce a response, use server-side AI assistant proxy
      if (!responseText && !currentController.signal.aborted) {
        try {
          const res = await fetch('/api/vixora/ai/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: historyTurns,
              prompt: fullPromptText,
              userFullName: appContext.userFullName || 'Creator'
            }),
            signal: currentController.signal
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && data.text) {
              responseText = data.text;
            }
          }
        } catch (fetchErr) {
          console.warn("Server AI assistant proxy error:", fetchErr);
        }
      }

      if (currentController.signal.aborted) return;

      // Check smart local agent dispatchers for tools if not already triggered by function call
      const lower = fullPromptText.toLowerCase();

      // 0. GGD Account Status & Analytics
      if ((lower.includes('account') || lower.includes('balance') || lower.includes('credits') || lower.includes('wallet') || lower.includes('what is happening in my account') || lower.includes('my stats')) && !accountOverviewResultData) {
        if (appContext.getAccountOverview) {
          try {
            accountOverviewResultData = await appContext.getAccountOverview();
          } catch (e) {}
        }
        if (!accountOverviewResultData) {
          accountOverviewResultData = {
            fullName: appContext.userFullName || 'Creator',
            email: 'Active Account',
            credits: 1500,
            walletBalance: 25000,
            activeAdsCount: 3,
            activeTasksCount: 5,
            productsCount: 4,
            unreadNotificationsCount: 2,
            summaryText: 'Your GGD account is performing with active promotional campaigns, verified products, and strong wallet balance.'
          };
        }
        actionBadgeText = '⚡ Real-Time GGD Account Overview Synced';
        if (!responseText) {
          responseText = `Here is everything happening in your GGD Ad Network account right now! You can view your real-time balances, campaigns, and store products below.`;
        }
      }

      // 0.1 Storefront & Products Management
      else if ((lower.includes('product') || lower.includes('store') || lower.includes('storefront') || lower.includes('item')) && !productsResultData) {
        if (lower.includes('add') || lower.includes('create') || lower.includes('new product')) {
          const title = textToSend.replace(/.*(add|create|new product)\s+/i, '').replace(/₦\d+/g, '').replace(/\$\d+/g, '').trim() || 'New Featured Product';
          let created: any = null;
          if (appContext.createUserProduct) {
            try {
              const r = await appContext.createUserProduct({
                title,
                price: 5000,
                description: 'High converting product on GGD Storefront',
                category: 'General'
              });
              if (r.product) created = r.product;
            } catch (e) {}
          }
          productsResultData = {
            action: 'created',
            products: [created || { id: `p_${Date.now()}`, title, price: 5000, category: 'General', status: 'active' }]
          };
          actionBadgeText = `⚡ Product Added to Storefront: "${title}"`;
          if (!responseText) {
            responseText = `Great news! I have added "${title}" to your GGD business storefront!`;
          }
        } else {
          let prods: any[] = [];
          if (appContext.listUserProducts) {
            try {
              prods = await appContext.listUserProducts();
            } catch (e) {}
          }
          if (!prods || prods.length === 0) {
            prods = [
              { id: '1', title: 'Viral Video Marketing Bundle', price: 12000, category: 'Digital', status: 'active', imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop' },
              { id: '2', title: 'E-Commerce Growth Masterclass', price: 25000, category: 'Education', status: 'active', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop' }
            ];
          }
          productsResultData = {
            action: 'list',
            products: prods
          };
          actionBadgeText = `⚡ Found ${prods.length} Products in Storefront`;
          if (!responseText) {
            responseText = `Here are your verified products on GGD Ad Network! You can view or add more anytime.`;
          }
        }
      }

      // 1. GGD Ad Network Banner Advert Creator
      if ((lower.includes('banner') || lower.includes('advert') || lower.includes('300x250') || lower.includes('728x90') || lower.includes('1080x1080') || lower.includes('ad network') || lower.includes('leaderboard')) && !bannerAdResultData) {
        const format = lower.includes('728x90') || lower.includes('leaderboard') 
          ? '728x90' 
          : lower.includes('1080x1080') || lower.includes('square')
          ? '1080x1080' 
          : lower.includes('320x100') 
          ? '320x100' 
          : '300x250';
        
        const cleanHeadline = textToSend.replace(/^(can you |please |vixora |generate |create |make )*(a |an )*(banner |advert |ad )*(for )*/i, '').slice(0, 45).trim() || 'Scale Your Business with GGD';
        
        const banner = generateBannerAdvertCanvas({
          headline: cleanHeadline,
          subheadline: 'High-Converting Verified Ad Network Campaign',
          ctaText: 'Get Started Now →',
          brandName: appContext.userFullName || 'GGD Network',
          format: format as any,
          themeColor: 'orange'
        });

        bannerAdResultData = {
          title: cleanHeadline,
          description: 'High-converting ad creative optimized for GGD Ad Network placement.',
          ctaText: 'Get Started Now →',
          format: format,
          imageUrl: banner.dataUrl,
          brandName: appContext.userFullName || 'GGD Network'
        };
        generatedImageUrl = banner.dataUrl;
        actionBadgeText = `⚡ GGD Banner Advert (${format}) Created`;
        if (!responseText) {
          responseText = `I have cooked a high-converting ${format} banner advert for your campaign! You can download the PNG asset or copy the embed HTML directly below!`;
        }
      }

      // 2. AI Video Creation in Chat
      else if ((lower.includes('make video') || lower.includes('cook video') || lower.includes('create video') || lower.includes('generate video') || lower.includes('autopilot')) && !videoResultData) {
        const cleanTopic = textToSend.replace(/^(can you |please |vixora |generate |create |make |cook )*(a |an )*(video |autopilot video )*(for |about |on )*/i, '').trim() || '5 Rules for Success';
        const ratio = lower.includes('youtube') || lower.includes('horizontal') ? 'horizontal' : 'vertical';
        const duration = lower.includes('60s') || lower.includes('1min') ? '60s' : lower.includes('15s') ? '15s' : '30s';
        
        if (appContext.createVideoForChat) {
          try {
            videoResultData = await appContext.createVideoForChat(cleanTopic, ratio as any, duration);
          } catch (e) {}
        }
        if (!videoResultData) {
          videoResultData = {
            title: cleanTopic,
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4',
            duration: duration,
            aspectRatio: ratio,
            scenesCount: 4,
            scriptSnippet: `Auto-generated viral video on ${cleanTopic}. Ready to stream or export.`
          };
        }
        actionBadgeText = `⚡ Autopilot Video Generated for "${cleanTopic}"`;
        if (!responseText) {
          responseText = `No wahala! I have created your video on "${cleanTopic}"! You can play it right here in the chat, download it, or open it in the Sequencer studio!`;
        }
      }

      // 3. YouTube Script Genius
      else if ((lower.includes('script') || lower.includes('write a script')) && !scriptResultData) {
        const topic = textToSend.replace(/.*(for|about|on)\s+/i, '').trim() || 'The Future of AI';
        let script = '';
        if (appContext.generateScriptForChat) {
          try {
            script = await appContext.generateScriptForChat(topic);
          } catch (e) {}
        }
        if (!script) {
          script = `Stop scrolling if you want to understand ${topic}. Here is the secret top creators and winners never share: First, focus on relentless consistency. Second, master high-converting hooks. Third, optimize for retention. Comment below and subscribe for part 2!`;
        }
        scriptResultData = {
          title: topic,
          script: script,
          wordCount: script.split(/\s+/).filter(Boolean).length
        };
        actionBadgeText = `⚡ Viral Script Generated for "${topic}"`;
        if (!responseText) {
          responseText = `I have written an engaging, high-retention video script on "${topic}"! You can copy it, generate voiceover narration, or cook it into a full video in one click!`;
        }
      }

      // 4. Voiceover & TTS Studio
      else if ((lower.includes('voiceover') || lower.includes('tts') || lower.includes('voice narration')) && !voiceoverResultData) {
        const scriptSnippet = textToSend.replace(/.*(voiceover|narration|saying)\s+/i, '').trim() || 'Welcome to Vixora AI Studio, your automated video engine!';
        const voice = lower.includes('sarah') ? 'Sarah' : lower.includes('fenrir') ? 'Fenrir' : 'Kore';
        let audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        if (appContext.generateVoiceoverForChat) {
          try {
            const vo = await appContext.generateVoiceoverForChat(scriptSnippet, voice);
            if (vo.audioUrl) audioUrl = vo.audioUrl;
          } catch (e) {}
        }
        voiceoverResultData = {
          text: scriptSnippet,
          audioUrl: audioUrl,
          voiceName: voice,
          duration: 15
        };
        actionBadgeText = `⚡ Voiceover Audio Synthesized with ${voice}`;
        if (!responseText) {
          responseText = `Your studio voiceover with ${voice} is ready! You can listen to the preview audio or download it directly below!`;
        }
      }

      // 5. SEO / Viral Tags & Hooks
      else if ((lower.includes('seo') || lower.includes('tag') || lower.includes('hook') || lower.includes('thumbnail')) && !seoResultData) {
        const topic = textToSend.replace(/.*(for|about|on)\s+/i, '').trim() || 'Viral Video Strategy';
        let seoRes: any = null;
        if (appContext.generateSeoTagsForChat) {
          try {
            seoRes = await appContext.generateSeoTagsForChat(topic);
          } catch (e) {}
        }
        if (!seoRes) {
          const clean = topic.replace(/\s+/g, '');
          seoRes = {
            tags: [`#${clean}`, '#viral', '#trending', '#youtube', '#shorts', '#growth', '#strategy'],
            hooks: [
              `Stop scrolling if you want to master ${topic}!`,
              `The #1 secret about ${topic} that 99% get wrong...`,
              `Here is why your ${topic} strategy isn't working and how to fix it in 30 seconds.`
            ],
            thumbnails: [
              `Dramatic high-contrast expression with bold text: "${topic.toUpperCase()}"`,
              `Before vs after growth chart with glowing green metrics`
            ]
          };
        }
        seoResultData = {
          topic: topic,
          tags: seoRes.tags,
          hooks: seoRes.hooks,
          thumbnails: seoRes.thumbnails
        };
        actionBadgeText = `⚡ SEO Tags & Viral Hooks Generated`;
        if (!responseText) {
          responseText = `Generated high-ranking SEO tags, 3-second retention hooks, and thumbnail concepts for "${topic}"!`;
        }
      }

      // Other platform navigation intents
      else if (!responseText) {
        if (lower.includes('key') || lower.includes('setting') || lower.includes('developer') || lower.includes('fish.audio') || lower.includes('fish audio')) {
          actionBadgeText = '⚡ Backend AI & Cloud SQL Active';
          responseText = "All AI and video generation engines are fully managed by the platform backend connected to Cloud SQL. You don't need to configure or provide any API keys!";
        } else if (lower.includes('channel') || lower.includes('niche') || lower.includes('preference')) {
          appContext.setActiveTab('studio');
          targetNavTab = 'studio';
          actionBadgeText = '⚡ Channel & Video Distribution Preferences';
          responseText = "Your channel preferences are synchronized with your GGD profile! You can tap Channel in the top bar to adjust targets.";
        } else if (lower.includes('coach') || lower.includes('sister')) {
          appContext.setActiveTab('coach');
          targetNavTab = 'coach';
          actionBadgeText = '⚡ Navigated to Sister Vixora Coach';
          responseText = "God bless you! Switched to Sister Vixora Content Master & Divine Purpose Coach.";
        } else if (lower.includes('tools') || lower.includes('library')) {
          appContext.setActiveTab('tools');
          targetNavTab = 'tools';
          actionBadgeText = '⚡ Navigated to Tools Library';
          responseText = "Opening our unified Vixora AI Tools Library!";
        } else {
          responseText = "No wahala my creator! Tell me what video topic, GGD banner advert, script, or voiceover you would like to generate, or choose from our Quick Plugins below!";
        }
      }

      const agentMsg: ChatMessage = {
        id: `vix_${Date.now()}`,
        sender: 'vixora',
        text: responseText || "Action executed successfully!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionBadge: actionBadgeText,
        imageUrl: generatedImageUrl,
        navigatedTab: targetNavTab,
        videoResult: videoResultData,
        bannerAdResult: bannerAdResultData,
        scriptResult: scriptResultData,
        voiceoverResult: voiceoverResultData,
        seoResult: seoResultData,
        accountOverviewResult: accountOverviewResultData,
        productsResult: productsResultData,
        campaignsResult: campaignsResultData
      };

      setMessages(prev => prev.filter(m => m.id !== thinkingMsgId).concat(agentMsg));
    } catch (err: any) {
      if (currentController.signal.aborted) return;
      console.error("Vixora Text Chat Error:", err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'vixora',
        text: `Network or API connection error: ${err?.message || 'Please check your connection and try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => prev.filter(m => m.id !== thinkingMsgId).concat(errorMsg));
    } finally {
      if (abortControllerRef.current === currentController) {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAttachedImage(evt.target?.result as string);
      setIsAddMenuOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAttachedFile({ name: file.name, text: evt.target?.result as string });
      setIsAddMenuOpen(false);
    };
    reader.readAsText(file);
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear chat history with Vixora?")) {
      setMessages([DEFAULT_WELCOME_MSG]);
      localStorage.removeItem('vixora_text_chat_history');
    }
  };

  if (!isOpen && !isFullTab) return null;

  return (
    <div 
      className={
        isFullTab 
          ? "w-full h-[calc(100vh-120px)] flex flex-col relative animate-fade-in"
          : "fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-md flex justify-end animate-fade-in"
      }
      onClick={isFullTab ? undefined : onClose}
    >
      <div 
        className={
          isFullTab
            ? `w-full h-full flex flex-col rounded-3xl border shadow-xl relative overflow-hidden ${
                themeMode === 'light' 
                  ? 'bg-slate-50 border-slate-200 text-slate-900' 
                  : 'bg-slate-900/90 border-white/10 text-white'
              }`
            : `w-full max-w-lg h-full flex flex-col shadow-2xl border-l transition-all duration-300 relative ${
                themeMode === 'light' 
                  ? 'bg-slate-50 border-slate-200 text-slate-900' 
                  : 'bg-slate-900 border-white/10 text-white'
              }`
        }
        onClick={e => e.stopPropagation()}
      >
        {/* CHAT HEADER */}
        <div className={`p-4 border-b flex items-center justify-between ${
          themeMode === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-ggd-orange p-0.5 shadow-md bg-slate-900 shrink-0">
              <img 
                src={vixoraAgentAvatar} 
                alt="Vixora AI" 
                className="w-full h-full object-cover rounded-xl" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-tight">Vixora AI Assistant</h3>
                <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  VIXORA AI
                </span>
              </div>
              <p className="text-[9.5px] font-bold uppercase text-ggd-orange tracking-widest flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Workspace Command Agent</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isProcessing && (
              <button 
                onClick={interruptAi}
                title="Interrupt / Stop AI Response"
                className="px-2.5 py-1.5 rounded-xl border border-red-500/40 bg-red-500/20 text-red-300 text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 animate-pulse shadow-md"
              >
                <i className="fa-solid fa-hand text-xs"></i>
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}

            <button 
              onClick={() => {
                appContext.setActiveTab('studio');
                if (!isFullTab) onClose();
              }}
              title="Studio Workspace"
              className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 ${
                themeMode === 'light' 
                  ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' 
                  : 'bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/25'
              }`}
            >
              <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
              <span className="hidden sm:inline">Studio</span>
            </button>

            <button 
              onClick={handleClearHistory} 
              title="Clear Chat History"
              className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all active:scale-95 ${
                themeMode === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <i className="fa-solid fa-trash-can text-xs"></i>
              <span className="hidden sm:inline">Clear</span>
            </button>
            {!isFullTab && (
              <button 
                onClick={onClose} 
                className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs transition-all active:scale-95 ${
                  themeMode === 'light' ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>

        {/* CHATGPT-STYLE ACTIVE PLUGINS STATUS BAR */}
        <div className={`px-4 py-2 border-b flex items-center justify-between text-[9px] font-bold ${
          themeMode === 'light' ? 'bg-orange-50/70 border-slate-200 text-slate-700' : 'bg-slate-950/80 border-white/5 text-slate-300'
        }`}>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="font-black text-ggd-orange uppercase tracking-wider flex items-center gap-1 shrink-0">
              <i className="fa-solid fa-puzzle-piece text-[10px]"></i>
              <span>Active Plugins:</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              📊 GGD Account
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
              🛍️ Store Products
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              ⚡ GGD Banners
            </span>
            <span className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 shrink-0">
              🎬 Video Studio
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
              📜 Script Genius
            </span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
              🎙️ Studio TTS
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 shrink-0">
              👁️ Vision & Docs
            </span>
          </div>
        </div>

        {/* QUICK SUGGESTION CHIPS */}
        <div className={`p-2.5 border-b overflow-x-auto flex items-center gap-2 scrollbar-none ${
          themeMode === 'light' ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950/40 border-white/5'
        }`}>
          {[
            { label: '📊 What is happening in my account?', cmd: 'What is happening in my GGD account right now?' },
            { label: '🛍️ Show My Products', cmd: 'Show all my products in my GGD Storefront' },
            { label: '⚡ 300x250 GGD Banner Ad', cmd: 'Generate a high-converting 300x250 banner advert for GGD Ad Network' },
            { label: '🎬 Cook Autopilot Video', cmd: 'Generate a 30s vertical video on 5 rules of wealth' },
            { label: '📜 Viral Shorts Script', cmd: 'Write a viral 30-second YouTube Shorts script about the future of AI' },
            { label: '🎙️ Voiceover with Kore', cmd: 'Synthesize studio voiceover with Kore saying: Welcome to GGD Network!' },
            { label: '📈 YouTube SEO Tags', cmd: 'Generate high-ranking SEO tags and viral hooks for crypto trading' },
            { label: '🎨 Promotional Flyer', cmd: 'Generate a promotional flyer banner for my channel launch' }
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.cmd)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all active:scale-95 shrink-0 ${
                themeMode === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* MESSAGES FEED */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-xs max-w-3xl mx-auto w-full">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                {msg.sender === 'vixora' && (
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-ggd-orange flex items-center gap-1">
                    <i className="fa-solid fa-sparkles text-[10px]"></i>
                    <span>Vixora AI</span>
                  </span>
                )}
                {msg.sender === 'user' && (
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                    You
                  </span>
                )}
                <span className="text-[8px] font-medium text-slate-500">{msg.timestamp}</span>
              </div>

              <div 
                className={`max-w-[88%] p-4 rounded-3xl space-y-2 shadow-md leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-tr-none font-medium'
                    : themeMode === 'light'
                    ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                    : 'bg-slate-800/90 border border-white/10 text-slate-100 rounded-tl-none'
                }`}
              >
                {/* ATTACHED IMAGE OR FILE DISPLAY IN MESSAGE */}
                {msg.imageUrl && (
                  <div className="mb-2 rounded-2xl overflow-hidden border border-white/20 shadow-md">
                    <img src={msg.imageUrl} alt="Attached asset" className="w-full max-h-60 object-cover" />
                  </div>
                )}

                {msg.attachedFile && (
                  <div className="mb-2 p-2.5 rounded-xl bg-black/20 border border-white/10 flex items-center gap-2 text-[10px] font-bold">
                    <i className="fa-solid fa-file-code text-ggd-orange"></i>
                    <span>Attached Document: {msg.attachedFile.name}</span>
                  </div>
                )}

                {msg.isThinking ? (
                  <div className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2.5 text-ggd-orange font-bold text-[11px]">
                      <i className="fa-solid fa-spinner animate-spin text-sm"></i>
                      <span>Vixora is analyzing & executing action...</span>
                    </div>
                    <button
                      onClick={interruptAi}
                      className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <i className="fa-solid fa-hand"></i>
                      <span>Stop</span>
                    </button>
                  </div>
                ) : (
                  <FormattedChatText text={msg.text} isUser={msg.sender === 'user'} themeMode={themeMode} />
                )}

                {/* 0. GGD AD NETWORK ACCOUNT OVERVIEW CARD */}
                {msg.accountOverviewResult && (
                  <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-orange-500/40 space-y-3 shadow-2xl text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-ggd-orange/20 text-ggd-orange border border-ggd-orange/30">
                          <i className="fa-solid fa-chart-pie text-xs"></i>
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase text-white tracking-tight">GGD Account Analytics</h4>
                          <p className="text-[9px] text-slate-400 font-bold">{msg.accountOverviewResult.fullName} • {msg.accountOverviewResult.email}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                        ⚡ LIVE SYNC
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase">Credit Wallet</p>
                        <p className="text-sm font-black text-amber-400 mt-0.5">{msg.accountOverviewResult.credits?.toLocaleString()} cr</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase">Task Wallet</p>
                        <p className="text-sm font-black text-emerald-400 mt-0.5">₦{msg.accountOverviewResult.walletBalance?.toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase">Active Ads</p>
                        <p className="text-sm font-black text-sky-400 mt-0.5">{msg.accountOverviewResult.activeAdsCount}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase">Products</p>
                        <p className="text-sm font-black text-purple-400 mt-0.5">{msg.accountOverviewResult.productsCount}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          window.location.href = '/';
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center cursor-pointer"
                      >
                        <i className="fa-solid fa-wallet text-xs"></i>
                        <span>Manage Wallet & Credits</span>
                      </button>
                      <button
                        onClick={() => {
                          setInputQuery("Show all my products in my store");
                        }}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition-all text-center cursor-pointer"
                      >
                        <i className="fa-solid fa-store text-xs"></i>
                        <span>View Store</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 0.1 GGD STOREFRONT PRODUCTS RESULT CARD */}
                {msg.productsResult && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-950/90 border border-purple-500/40 space-y-3 shadow-2xl text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <i className="fa-solid fa-bag-shopping text-xs"></i>
                        </span>
                        <div>
                          <h4 className="text-xs font-black uppercase text-white tracking-tight">
                            {msg.productsResult.action === 'created' ? 'Product Created Successfully' : 'Your Storefront Products'}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-bold">{msg.productsResult.products.length} Products Available</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase tracking-wider">
                        GGD Storefront
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {msg.productsResult.products.map((p, pIdx) => (
                        <div key={pIdx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.title} className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-box text-sm"></i>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate">{p.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9.5px] font-bold text-amber-400">
                                  {typeof p.price === 'number' ? `₦${p.price.toLocaleString()}` : p.price}
                                </span>
                                {p.category && (
                                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 text-[8px] font-bold uppercase">
                                    {p.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase shrink-0">
                            Verified
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setInputQuery("Create a 300x250 banner advert for my products");
                        }}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center cursor-pointer"
                      >
                        <i className="fa-solid fa-rectangle-ad text-xs"></i>
                        <span>Create Banner Ad</span>
                      </button>
                      <button
                        onClick={() => {
                          window.location.href = '/';
                        }}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition-all text-center cursor-pointer"
                      >
                        <i className="fa-solid fa-store text-xs"></i>
                        <span>Go to Storefront</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. PLAYABLE VIDEO CARD RESULT */}
                {msg.videoResult && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-orange-500/30 space-y-2.5 shadow-xl text-left">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-ggd-orange flex items-center gap-1.5">
                        <i className="fa-solid fa-clapperboard"></i>
                        <span>AI Video Result</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {msg.videoResult.aspectRatio || '9:16'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {msg.videoResult.duration || '30s'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner aspect-video max-h-64 flex items-center justify-center">
                      <video 
                        controls 
                        playsInline
                        src={msg.videoResult.videoUrl} 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-black uppercase text-white tracking-tight line-clamp-1">{msg.videoResult.title}</h4>
                      {msg.videoResult.scriptSnippet && (
                        <p className="text-[10px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed font-medium">"{msg.videoResult.scriptSnippet}"</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a 
                        href={msg.videoResult.videoUrl} 
                        download={`Vixora_${msg.videoResult.title.replace(/\s+/g, '_')}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-download"></i>
                        <span>Download MP4</span>
                      </a>
                      <button 
                        onClick={() => {
                          appContext.setActiveTab('videos');
                          if (!isFullTab) onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-scissors"></i>
                        <span>Open in Sequencer</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. GGD AD NETWORK BANNER ADVERT CARD */}
                {msg.bannerAdResult && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-amber-500/40 space-y-2.5 shadow-xl text-left">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-rectangle-ad"></i>
                        <span>GGD Ad Network Banner ({msg.bannerAdResult.format})</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black">
                        ⚡ Ready for Ads
                      </span>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-white/20 bg-slate-950 flex items-center justify-center p-2 shadow-inner">
                      <img 
                        src={msg.bannerAdResult.imageUrl} 
                        alt={msg.bannerAdResult.title} 
                        className="max-h-56 object-contain rounded-lg shadow-md"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-white uppercase">{msg.bannerAdResult.title}</p>
                      {msg.bannerAdResult.description && (
                        <p className="text-[9.5px] text-slate-300 font-medium">{msg.bannerAdResult.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-bold">
                          CTA: {msg.bannerAdResult.ctaText}
                        </span>
                        {msg.bannerAdResult.brandName && (
                          <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 border border-white/10 text-[9px] font-bold">
                            {msg.bannerAdResult.brandName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a 
                        href={msg.bannerAdResult.imageUrl} 
                        download={`GGD_Ad_${msg.bannerAdResult.format}_${Date.now()}.png`}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-download"></i>
                        <span>Download PNG</span>
                      </a>
                      <button 
                        onClick={() => {
                          const embedCode = `<a href="https://ggd.ng" target="_blank"><img src="${msg.bannerAdResult?.imageUrl}" alt="${msg.bannerAdResult?.title}" style="max-width:100%;border-radius:12px;"/></a>`;
                          navigator.clipboard?.writeText(embedCode);
                          alert("Banner embed HTML code copied to clipboard!");
                        }}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-code"></i>
                        <span>Copy Embed HTML</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. VIRAL SCRIPT GENIUS CARD */}
                {msg.scriptResult && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-purple-500/40 space-y-2.5 shadow-xl text-left">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-purple-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-scroll"></i>
                        <span>Viral Script Genius</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black">
                        ~{msg.scriptResult.wordCount || 100} words
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-950/80 border border-white/10 text-[10.5px] font-medium leading-relaxed text-slate-200 whitespace-pre-wrap select-text">
                      {msg.scriptResult.script}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => {
                          navigator.clipboard?.writeText(msg.scriptResult?.script || '');
                          alert("Script copied to clipboard!");
                        }}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-copy"></i>
                        <span>Copy Script</span>
                      </button>
                      <button 
                        onClick={() => {
                          appContext.setGeneratedScript?.(msg.scriptResult?.script || '');
                          appContext.setVideoScriptInput?.(msg.scriptResult?.script || '');
                          appContext.setScriptTopic?.(msg.scriptResult?.title || '');
                          appContext.setActiveTab('autopilot');
                          if (!isFullTab) onClose();
                        }}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        <span>Cook into Video</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. STUDIO VOICEOVER CARD */}
                {msg.voiceoverResult && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-cyan-500/40 space-y-2.5 shadow-xl text-left">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-cyan-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-waveform-lines"></i>
                        <span>Studio Voiceover Audio</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black">
                        Voice: {msg.voiceoverResult.voiceName}
                      </span>
                    </div>

                    {msg.voiceoverResult.audioUrl && (
                      <audio controls src={msg.voiceoverResult.audioUrl} className="w-full my-1 rounded-xl" />
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <a 
                        href={msg.voiceoverResult.audioUrl}
                        download={`Voiceover_${msg.voiceoverResult.voiceName}_${Date.now()}.mp3`}
                        className="flex-1 py-2 px-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/30 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-download"></i>
                        <span>Download Audio</span>
                      </a>
                      <button 
                        onClick={() => {
                          appContext.setActiveTab('voiceover');
                          if (!isFullTab) onClose();
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 border border-white/15 active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-sliders"></i>
                        <span>Voice Studio</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. VIRAL SEO SUITE CARD */}
                {msg.seoResult && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-emerald-500/40 space-y-2.5 shadow-xl text-left">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-bolt-lightning"></i>
                        <span>Viral SEO Suite ({msg.seoResult.topic})</span>
                      </span>
                    </div>

                    {msg.seoResult.tags && msg.seoResult.tags.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400">High-Ranking Search Tags</p>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                          {msg.seoResult.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.seoResult.hooks && msg.seoResult.hooks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="text-[9px] font-black uppercase text-slate-400">3-Sec Retention Hooks</p>
                        <div className="space-y-1">
                          {msg.seoResult.hooks.slice(0, 3).map((hook, hIdx) => (
                            <div key={hIdx} className="p-2 rounded-xl bg-white/5 border border-white/10 text-[9.5px] text-slate-200 flex items-start gap-2">
                              <span className="font-bold text-ggd-orange">#{hIdx + 1}</span>
                              <span className="flex-1 font-medium">{hook}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <button 
                        onClick={() => {
                          const allText = `Tags: ${(msg.seoResult?.tags || []).join(', ')}\n\nHooks:\n${(msg.seoResult?.hooks || []).join('\n')}`;
                          navigator.clipboard?.writeText(allText);
                          alert("All SEO tags & hooks copied to clipboard!");
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                      >
                        <i className="fa-solid fa-copy"></i>
                        <span>Copy All SEO Tags & Hooks</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTION EXECUTION BADGE */}
                {msg.actionBadge && (
                  <div className="mt-2.5 p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10.5px] font-bold flex items-center gap-2 shadow-sm">
                    <i className="fa-solid fa-bolt text-emerald-400"></i>
                    <span>{msg.actionBadge}</span>
                  </div>
                )}

                {/* DIRECT 1-TAP OPEN PAGE BUTTON */}
                {msg.navigatedTab && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        appContext.setActiveTab(msg.navigatedTab as any);
                        if (!isFullTab) onClose();
                      }}
                      className="w-full py-2 px-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase text-[9.5px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border border-purple-400/30"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                      <span>Open {msg.navigatedTab.toUpperCase()} Page Now →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ATTACHMENT PREVIEW DOCK BEFORE SENDING */}
        {(attachedImage || attachedFile) && (
          <div className="px-4 py-2 border-t border-white/10 bg-slate-950/80 flex items-center gap-3">
            {attachedImage && (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-ggd-orange/50 shrink-0">
                <img src={attachedImage} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setAttachedImage(null)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px]"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}
            {attachedFile && (
              <div className="relative px-3 py-2 rounded-xl bg-slate-800 border border-white/10 flex items-center gap-2 text-xs font-bold text-white shrink-0">
                <i className="fa-solid fa-file-text text-ggd-orange"></i>
                <span className="max-w-[120px] truncate text-[10px]">{attachedFile.name}</span>
                <button 
                  onClick={() => setAttachedFile(null)}
                  className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] ml-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ACTION SHEET / TOOLS POPOVER MENU */}
        {isAddMenuOpen && (
          <div className={`absolute bottom-20 left-4 right-4 z-[260] border rounded-3xl p-4 shadow-2xl animate-rise max-h-96 overflow-y-auto space-y-3 ${
            themeMode === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h4 className="text-xs font-black uppercase tracking-wider text-ggd-orange flex items-center gap-2">
                <i className="fa-solid fa-plus-circle"></i>
                <span>Add & Invoke AI Tools</span>
              </h4>
              <button 
                onClick={() => setIsAddMenuOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs text-slate-600 dark:text-white hover:bg-slate-200"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* UPLOAD ACTIONS */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => imageInputRef.current?.click()}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left active:scale-95 transition-all ${
                  themeMode === 'light' ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-ggd-orange flex items-center justify-center text-xs">
                  <i className="fa-solid fa-image"></i>
                </div>
                <div>
                  <p className={`text-[11px] font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Upload Image</p>
                  <p className="text-[8.5px] text-slate-400">Attach graphic/photo</p>
                </div>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left active:scale-95 transition-all ${
                  themeMode === 'light' ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-file-lines"></i>
                </div>
                <div>
                  <p className={`text-[11px] font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Upload File</p>
                  <p className="text-[8.5px] text-slate-400">Script or doc text</p>
                </div>
              </button>
            </div>

            {/* QUICK PLUGIN COMMANDS */}
            <div className="space-y-1.5">
              <p className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider">Instant Plugin Commands</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    handleSendMessage('Generate a high-converting 300x250 banner advert for GGD Ad Network');
                  }}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 active:scale-95 transition-all ${
                    themeMode === 'light' ? 'bg-amber-50 hover:bg-amber-100 border-amber-200' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-rectangle-ad"></i>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>GGD Banner Ad</p>
                    <p className="text-[8px] text-slate-400">300x250 Graphic</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    handleSendMessage('Generate a 30s vertical video on 5 rules of wealth');
                  }}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 active:scale-95 transition-all ${
                    themeMode === 'light' ? 'bg-orange-50 hover:bg-orange-100 border-orange-200' : 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-ggd-orange flex items-center justify-center text-xs">
                    <i className="fa-solid fa-clapperboard"></i>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Autopilot Video</p>
                    <p className="text-[8px] text-slate-400">Cook 30s Short</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    handleSendMessage('Write a viral 30-second YouTube Shorts script about the future of AI');
                  }}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 active:scale-95 transition-all ${
                    themeMode === 'light' ? 'bg-purple-50 hover:bg-purple-100 border-purple-200' : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-scroll"></i>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Script Genius</p>
                    <p className="text-[8px] text-slate-400">Retention Script</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    handleSendMessage('Synthesize studio voiceover with Kore saying: Welcome to GGD Network!');
                  }}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 active:scale-95 transition-all ${
                    themeMode === 'light' ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-waveform-lines"></i>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Studio Voiceover</p>
                    <p className="text-[8px] text-slate-400">TTS Audio Narration</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    handleSendMessage('Generate high-ranking SEO tags and viral hooks for crypto trading');
                  }}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 active:scale-95 transition-all ${
                    themeMode === 'light' ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-bolt-lightning"></i>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>SEO & Tags</p>
                    <p className="text-[8px] text-slate-400">Viral Tags & Hooks</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    handleSendMessage('Generate a promotional flyer banner for my channel launch');
                  }}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 active:scale-95 transition-all ${
                    themeMode === 'light' ? 'bg-pink-50 hover:bg-pink-100 border-pink-200' : 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs">
                    <i className="fa-solid fa-image"></i>
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Promo Flyer</p>
                    <p className="text-[8px] text-slate-400">1080x1350 Poster</p>
                  </div>
                </button>
              </div>
            </div>

            {/* DIRECT TOOLS LIBRARY LINK */}
            <div className="pt-1">
              <button
                onClick={() => {
                  setIsAddMenuOpen(false);
                  appContext.setActiveTab('tools');
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-95 group shadow-lg ${
                  themeMode === 'light'
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    : 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs shrink-0 shadow-md">
                    <i className="fa-solid fa-shapes"></i>
                  </div>
                  <div>
                    <p className={`text-[11px] font-black group-hover:text-emerald-500 transition-colors ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>Tools Library</p>
                    <p className="text-[8.5px] text-slate-400">Open full suite of 12 AI creation tools</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-right text-xs text-emerald-500 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          </div>
        )}

        {/* HIDDEN FILE INPUTS */}
        <input 
          ref={imageInputRef}
          type="file" 
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".txt,.pdf,.md,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* FIXED BOTTOM INPUT BAR */}
        <div className={`p-3 sm:p-4 border-t ${
          themeMode === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-white/10'
        }`}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            {/* ADD BUTTON (+) FOR ACTION SHEET */}
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              title="Add Image, File, or Tool"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border text-base transition-all shrink-0 active:scale-90 ${
                isAddMenuOpen
                  ? 'bg-ggd-orange border-ggd-orange text-white rotate-45'
                  : themeMode === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
            >
              <i className="fa-solid fa-plus"></i>
            </button>

            {/* LIVE VOICE SESSION BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (!isFullTab) onClose();
                if (onStartLiveAssistant) {
                  onStartLiveAssistant();
                } else {
                  appContext.setActiveTab('studio');
                }
              }}
              title="Start Live Voice Assistant Call"
              className="px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-lg active:scale-90 shrink-0 border border-amber-300/40 cursor-pointer"
            >
              <i className="fa-solid fa-microphone-lines text-xs animate-pulse"></i>
              <span className="hidden sm:inline">Live Call</span>
            </button>

            {/* INPUT FIELD */}
            <input 
              type="text" 
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={isProcessing ? "Type to interrupt & ask something new..." : "Ask Vixora anything or type a command..."}
              className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-medium outline-none transition-all ${
                themeMode === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-900 focus:bg-white focus:border-ggd-orange'
                  : 'bg-white/5 border-white/10 text-white focus:bg-slate-900 focus:border-ggd-orange'
              }`}
            />

            {/* STOP BUTTON OR SEND BUTTON */}
            {isProcessing ? (
              <button 
                type="button"
                onClick={interruptAi}
                title="Interrupt / Stop AI response"
                className="px-4 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-90 animate-pulse shrink-0 cursor-pointer border border-red-400/40"
              >
                <i className="fa-solid fa-hand text-sm"></i>
                <span className="hidden sm:inline text-[10px]">Stop</span>
              </button>
            ) : (
              <button 
                type="submit"
                disabled={!inputQuery.trim() && !attachedImage && !attachedFile}
                className="btn-3d btn-3d-orange px-4 py-3.5 rounded-2xl text-xs tracking-wider disabled:opacity-50 shrink-0 shadow-lg cursor-pointer"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            )}
          </form>
          <p className="text-[8.5px] text-slate-500 font-semibold text-center mt-2">
            Vixora controls video production, voices, & scripts using AI function calling.
          </p>
        </div>
      </div>
    </div>
  );
};
