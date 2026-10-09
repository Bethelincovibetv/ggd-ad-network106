import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bot, Sparkles, Send, Loader2, Store, Package, Briefcase, Plus, 
  TrendingUp, RefreshCw, CheckCircle2, ShieldCheck, Download, 
  ExternalLink, MessageCircle, AlertCircle, Trash2, Edit3, X,
  Image as ImageIcon, Upload, Brain, Megaphone, Share2, FileText,
  CreditCard, Phone, MapPin, ArrowRight, Check, Zap, ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchUserBusinessContext, 
  createProductOrService, 
  updateProductOrService, 
  updateBusinessProfileDetails,
  generateProductPromoCanvas,
  publishCommunityPostOnBehalf,
  createAdCampaignOnBehalf,
  generateBusinessGrowthStrategy,
  generateCustomerSupportClosingReply,
  generateOrderClosingInvoice,
  uploadAgentMedia,
  getUserBusinessMemory,
  saveUserBusinessMemory,
  executeBusinessAgentTool,
  parseAndExecuteNaturalLanguageIntent,
  BusinessOverviewContext,
  BusinessListingItem,
  BusinessAgentMemory,
  BUSINESS_AGENT_TOOL_DEFINITIONS
} from "@/services/vixoraBusinessAgentService";
import { resolveAdminAiApiKey } from "@/vixora/services/adminKeySync";
import vixoraAgentAvatar from "@/assets/images/vixora_agent_avatar_1786108775324.jpg";

export interface BusinessChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  actionBadge?: string;
  imageUrl?: string;
  productResult?: BusinessListingItem;
  profileResult?: any;
  flyerUrl?: string;
  bannerAdResult?: any;
  communityPostResult?: any;
  strategyResult?: any;
  accountOverviewResult?: any;
  isThinking?: boolean;
}

interface VixoraBusinessAiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  initialPrompt?: string;
}

export const VixoraBusinessAiAgentModal: React.FC<VixoraBusinessAiAgentModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  initialPrompt = ''
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'account'>('chat');
  const [messages, setMessages] = useState<BusinessChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vixora_business_agent_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome',
        sender: 'agent',
        text: "Hello! I am Vixora AI Business Copilot! I am your autonomous store manager, advertising strategist, and WhatsApp sales closer on GGD Ad Network.\n\nTell me what you need done:\n• Add new products/services with photos (upload or describe them)\n• Update pricing, store details, WhatsApp phone, or address\n• Generate marketing flyers & banner adverts\n• Post directly to Community Feed on your behalf\n• Diagnose store strategy & give a 7-day revenue sprint plan\n• Close customer WhatsApp chats & prepare instant invoices\n\nHow can I help grow your business today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionBadge: "Vixora Autonomous Business Engine"
      }
    ];
  });

  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState<BusinessOverviewContext | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageFile, setAttachedImageFile] = useState<File | null>(null);
  const [userMemory, setUserMemory] = useState<BusinessAgentMemory>({
    brandVoice: 'naija_energetic',
    targetAudience: 'African shoppers, wholesale buyers, and WhatsApp customers',
    bankDetails: '',
    whatsappHotline: '',
    deliveryTerms: 'Fast nationwide doorstep delivery',
    returnPolicy: '7-day inspection and exchange guarantee',
    keySellingPoints: ['Verified quality', 'Direct WhatsApp support', 'Fair pricing'],
    customLearnedNotes: []
  });
  const [newMemoryNote, setNewMemoryNote] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    try {
      localStorage.setItem('vixora_business_agent_history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('ggd-ai-chat-open'));
      loadContext();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      window.dispatchEvent(new CustomEvent('ggd-ai-chat-close'));
    }

    return () => {
      window.dispatchEvent(new CustomEvent('ggd-ai-chat-close'));
    };
  }, [isOpen]);

  const loadContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ctx = await fetchUserBusinessContext(user.id);
      setBusinessContext(ctx);
      const mem = getUserBusinessMemory(user.id);
      setUserMemory(mem);
    } catch (e) {
      console.warn("Could not load business context:", e);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be under 10MB");
      return;
    }

    setAttachedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    toast.success("Image attached! You can now ask Vixora to analyze it or create a product.");
  };

  const clearChat = () => {
    const welcome: BusinessChatMessage = {
      id: `w_${Date.now()}`,
      sender: 'agent',
      text: "Chat refreshed! I am ready to manage your products, post to community, run strategic growth plans, and close WhatsApp sales. What would you like to do next?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionBadge: "Ready for Instructions"
    };
    setMessages([welcome]);
    try {
      localStorage.removeItem('vixora_business_agent_history');
    } catch {}
  };

  const handleSaveMemoryField = (field: keyof BusinessAgentMemory, val: any) => {
    if (!businessContext?.userId) return;
    const updated = saveUserBusinessMemory(businessContext.userId, { [field]: val });
    setUserMemory(updated);
    toast.success("AI Memory & Brand Voice updated!");
  };

  const handleAddMemoryNote = () => {
    if (!newMemoryNote.trim() || !businessContext?.userId) return;
    const notes = [...(userMemory.customLearnedNotes || []), newMemoryNote.trim()];
    const updated = saveUserBusinessMemory(businessContext.userId, { customLearnedNotes: notes });
    setUserMemory(updated);
    setNewMemoryNote('');
    toast.success("Saved note to Vixora AI permanent memory!");
  };

  const handleSendMessage = async (promptText?: string) => {
    const query = (promptText || input).trim();
    if ((!query && !attachedImage) || loading) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to manage your business with Vixora AI Agent.");
      return;
    }

    const currentImg = attachedImage;
    const currentFile = attachedImageFile;

    // Reset attachments immediately
    setAttachedImage(null);
    setAttachedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const userMsg: BusinessChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query || (currentImg ? "Uploaded an image for analysis & store action" : ''),
      imageUrl: currentImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const thinkingMsg: BusinessChatMessage = {
      id: `think_${Date.now()}`,
      sender: 'agent',
      text: "Vixora Business Copilot is evaluating your request & executing store actions...",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isThinking: true
    };

    setMessages(prev => [...prev.filter(m => !m.isThinking), userMsg, thinkingMsg]);
    setInput('');
    setLoading(true);

    try {
      const currentCtx = businessContext || await fetchUserBusinessContext(user.id);
      const activeMemory = getUserBusinessMemory(user.id);
      const lower = query.toLowerCase();

      let actionBadge = '';
      let productResult: BusinessListingItem | undefined;
      let profileResult: any;
      let flyerUrl: string | undefined;
      let bannerAdResult: any;
      let communityPostResult: any;
      let strategyResult: any;
      let accountOverviewResult: any;
      let responseText = '';

      // Upload image to Supabase/Cloud SQL storage if present
      let uploadedPublicUrl = '';
      if (currentFile) {
        try {
          uploadedPublicUrl = await uploadAgentMedia(currentFile, user.id);
        } catch (e) {
          console.warn("Storage upload notice:", e);
        }
      }

      // Step 1: AI-First Execution with Gemini Function Calling & Tool Invocation
      let toolExecuted = false;
      const apiKey = await resolveAdminAiApiKey();

      if (apiKey && apiKey.length > 10) {
        try {
          const ai = new GoogleGenAI({ apiKey });

          const brandVoicePrompt = 
            activeMemory.brandVoice === 'luxury_elite' ? 'Tone: High-end luxury, exclusive, ultra-refined, premium aesthetics.' :
            activeMemory.brandVoice === 'urgent_closer' ? 'Tone: High-urgency sales closer, fast-paced, action-oriented, clear calls-to-action.' :
            activeMemory.brandVoice === 'corporate_friendly' ? 'Tone: Corporate, trustworthy, professional, precise.' :
            'Tone: Warm, enthusiastic, highly knowledgeable, street-smart Nigerian business energy ("No wahala at all!", "Oya let\'s scale this business!", "Super sharp!").';

          const memoryList = (activeMemory.customLearnedNotes || []).map(n => `• ${n}`).join('\n');

          const systemInstruction = `You are 'Vixora AI Business Copilot', an elite autonomous AI business manager and store optimization assistant for African & international merchants on GGD Ad Network.
User Name: ${currentCtx.displayName}
Business Name: ${currentCtx.profile?.business_name || 'Not set'}
Active Products: ${currentCtx.activeProductsCount}
Active Services: ${currentCtx.activeServicesCount}
Credits: ${currentCtx.credits}
Running Ads: ${currentCtx.activeAdsCount}
Brand Voice: ${brandVoicePrompt}
Bank Details: ${activeMemory.bankDetails || 'Not set'}
WhatsApp Hotline: ${activeMemory.whatsappHotline || currentCtx.profile?.phone_number || 'Not set'}
Delivery Terms: ${activeMemory.deliveryTerms}
Return Policy: ${activeMemory.returnPolicy}

SAVED BRAND MEMORY & LEARNED RULES:
${memoryList || 'None yet'}

YOUR MANDATE:
1. You have direct database authority to execute commands for the merchant using function calls/tools!
2. When the user asks to add or create a product/service, update prices, update profile, post to community, audit their store, create a banner, or close an order, YOU MUST CALL THE APPROPRIATE TOOL! Do not merely give advice when action is requested.
3. If an image is provided, inspect it visually (identify item, recommend retail price, draft marketing hooks).
4. Never output asterisks (no * or **). Keep typography clean and readable.`;

          const historyTurns: any[] = messages
            .filter(m => !m.isThinking && m.id !== 'welcome')
            .slice(-6)
            .map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
            }));

          const userParts: any[] = [{ text: query || 'Please analyze this attached photo and execute appropriate store action.' }];
          if (currentImg) {
            const match = currentImg.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              userParts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              });
            }
          }

          const contents = [
            ...historyTurns,
            { role: 'user', parts: userParts }
          ];

          const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
              systemInstruction,
              tools: [{
                functionDeclarations: BUSINESS_AGENT_TOOL_DEFINITIONS
              }]
            }
          });

          // Check if Gemini invoked any function calls
          if (res.functionCalls && res.functionCalls.length > 0) {
            for (const fc of res.functionCalls) {
              const execRes = await executeBusinessAgentTool(fc.name, fc.args, currentCtx, uploadedPublicUrl);
              toolExecuted = true;
              if (execRes.badge) actionBadge = execRes.badge;
              if (execRes.data?.productResult) productResult = execRes.data.productResult;
              if (execRes.data?.profileResult) profileResult = execRes.data.profileResult;
              if (execRes.data?.flyerUrl) flyerUrl = execRes.data.flyerUrl;
              if (execRes.data?.communityPostResult) communityPostResult = execRes.data.communityPostResult;
              if (execRes.data?.strategyResult) strategyResult = execRes.data.strategyResult;
              if (execRes.data?.accountOverviewResult) accountOverviewResult = execRes.data.accountOverviewResult;

              // 2nd pass with Gemini to provide natural confirming commentary
              try {
                const secondPass = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: [
                    ...contents,
                    {
                      role: 'model',
                      parts: [{ functionCall: { name: fc.name, args: fc.args } }]
                    },
                    {
                      role: 'user',
                      parts: [{
                        functionResponse: {
                          name: fc.name,
                          response: { result: execRes.message }
                        }
                      }]
                    }
                  ],
                  config: { systemInstruction }
                });
                if (secondPass.text) {
                  responseText = secondPass.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
                }
              } catch {
                responseText = execRes.message;
              }

              if (!responseText) {
                responseText = execRes.message;
              }
            }
          } else if (res.text) {
            responseText = res.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
          }
        } catch (aiErr) {
          console.warn("Gemini execution notice, running resilient intent parser:", aiErr);
        }
      }

      // Step 2: Resilient Natural Language Execution (if no tool was called by Gemini or if Gemini errored)
      if (!toolExecuted) {
        const nlpRes = await parseAndExecuteNaturalLanguageIntent(query, currentCtx, uploadedPublicUrl);
        if (nlpRes) {
          toolExecuted = true;
          if (nlpRes.badge) actionBadge = nlpRes.badge;
          if (nlpRes.data?.productResult) productResult = nlpRes.data.productResult;
          if (nlpRes.data?.profileResult) profileResult = nlpRes.data.profileResult;
          if (nlpRes.data?.flyerUrl) flyerUrl = nlpRes.data.flyerUrl;
          if (nlpRes.data?.communityPostResult) communityPostResult = nlpRes.data.communityPostResult;
          if (nlpRes.data?.strategyResult) strategyResult = nlpRes.data.strategyResult;
          if (nlpRes.data?.accountOverviewResult) accountOverviewResult = nlpRes.data.accountOverviewResult;
          
          if (!responseText) {
            responseText = nlpRes.message;
          }
        }
      }

      // Step 3: Proactive, action-oriented response if no text was generated
      if (!responseText) {
        if (currentCtx.listings.length > 0) {
          responseText = `Ready for your next business command! Your catalog currently has ${currentCtx.activeProductsCount} products and ${currentCtx.activeServicesCount} services.\n\nTell me what to execute:\n• "Add product: [Name] for [₦Price]"\n• "Update price of ${currentCtx.listings[0]?.title} to [₦Price]"\n• "Post on community about our latest products"\n• "Plan strategy and audit my store"\n• "Create a 1200x628 banner advert"`;
        } else {
          responseText = `Welcome! I am ready to build and scale your storefront catalog right now.\n\nTry sending:\n• "Add product: Luxury Wristwatch for ₦25,000"\n• "Post our new arrival announcement on the community feed"\n• "Run growth strategy for my business"\n• "Create a banner advert for my store"`;
        }
      }

      if (toolExecuted) {
        if (onRefreshData) onRefreshData();
        loadContext();
      }

      const agentResponse: BusinessChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionBadge: actionBadge || undefined,
        productResult,
        profileResult,
        flyerUrl,
        bannerAdResult,
        communityPostResult,
        strategyResult,
        accountOverviewResult
      };

      setMessages(prev => [...prev.filter(m => !m.isThinking), agentResponse]);
    } catch (err: any) {
      toast.error("Vixora agent encountered an error: " + err.message);
      setMessages(prev => [
        ...prev.filter(m => !m.isThinking),
        {
          id: `err_${Date.now()}`,
          sender: 'agent',
          text: "I encountered a minor glitch while processing that instruction. Please restate what you'd like me to update or create!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionBadge: "Attention Needed"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent 
        data-ai-modal-open="true"
        className="w-full max-w-5xl h-[95vh] sm:h-[92vh] max-h-[900px] p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl flex flex-col rounded-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <DialogHeader className="p-3 sm:px-5 bg-gradient-to-r from-violet-950 via-purple-900 to-slate-950 text-white border-b border-white/10 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={vixoraAgentAvatar}
                alt="Vixora AI"
                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-violet-400/50 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  Vixora Business Copilot <Sparkles className="h-4 w-4 text-amber-300" />
                </DialogTitle>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold py-0">
                  Online Copilot
                </Badge>
              </div>
              <p className="text-[11px] text-violet-200/80">
                Autonomous Store & Product Manager • Social Marketing • Sales Closer
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-white/10 p-1 rounded-xl text-xs font-bold border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-2.5 py-1 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('memory')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${activeTab === 'memory' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                <Brain className="h-3 w-3" /> Voice & Memory
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${activeTab === 'account' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                <Store className="h-3 w-3" /> Store Hub
              </button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={clearChat}
              className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-xl px-2"
              title="Reset conversation"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        {/* TAB 1: MAIN CONVERSATIONAL COPILOT */}
        {activeTab === 'chat' && (
          <>
            {/* Quick Autonomous Routines / Action Chips */}
            <div className="bg-muted/40 border-b border-border px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" /> Actions:
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 px-2.5 py-1 rounded-xl transition border border-violet-500/20 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <ImageIcon className="h-3 w-3" /> Upload Photo & Add
              </button>
              <button
                onClick={() => handleSendMessage("Publish a promotional showcase post to the community on my behalf")}
                className="text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 px-2.5 py-1 rounded-xl transition border border-blue-500/20 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Megaphone className="h-3 w-3" /> Auto-Post to Community
              </button>
              <button
                onClick={() => handleSendMessage("Save memory: Remember that we deliver within 24-48 hours nationwide with free return within 7 days")}
                className="text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 px-2.5 py-1 rounded-xl transition border border-purple-500/20 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Brain className="h-3 w-3" /> Save Memory Direct
              </button>
              <button
                onClick={() => handleSendMessage("Perform an audit and plan business growth strategy for my store")}
                className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-xl transition border border-emerald-500/20 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <TrendingUp className="h-3 w-3" /> Plan Growth Strategy
              </button>
              <button
                onClick={() => handleSendMessage("Generate a 1200x628 banner advert for my store")}
                className="text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 px-2.5 py-1 rounded-xl transition border border-orange-500/20 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                🎨 Create Banner Ad
              </button>
              <button
                onClick={() => handleSendMessage("Customer wants to buy: 2 pairs of Sneakers. Prepare order invoice and WhatsApp closing script")}
                className="text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl transition border border-amber-500/20 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                💬 Close Order in WhatsApp
              </button>
            </div>

            {/* Messages Stream */}
            <ScrollArea className="flex-1 p-3 sm:p-4">
              <div className="space-y-3.5 max-w-4xl mx-auto w-full">
                {messages.map(msg => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <img
                          src={vixoraAgentAvatar}
                          alt="Vixora"
                          className="h-8 w-8 rounded-xl object-cover shrink-0 ring-2 ring-violet-500/30 shadow-xs"
                        />
                      )}

                      <div className={`space-y-1.5 max-w-[92%] sm:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                        {msg.actionBadge && (
                          <div className="inline-flex items-center gap-1.5 bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            {msg.actionBadge}
                          </div>
                        )}

                        {/* Image Preview in Message Bubble */}
                        {msg.imageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-border shadow-xs max-w-sm">
                            <img
                              src={msg.imageUrl}
                              alt="Attached visual"
                              className="w-full h-auto max-h-64 object-cover"
                            />
                          </div>
                        )}

                        <div
                          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-bold leading-relaxed tracking-normal whitespace-pre-wrap shadow-xs ${
                            isUser
                              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-xs font-semibold'
                              : 'bg-card border-2 border-border/80 text-foreground dark:text-slate-100 rounded-tl-xs font-bold'
                          }`}
                        >
                          {msg.isThinking ? (
                            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-black">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{msg.text}</span>
                            </div>
                          ) : (
                            msg.text
                          )}
                        </div>

                        {/* Rich Product Result Card */}
                        {msg.productResult && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-background to-purple-500/10 border-2 border-violet-500/30 space-y-2 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 tracking-wider">
                                  Verified {msg.productResult.listing_type === 'service' ? 'Service' : 'Product'}
                                </span>
                                <h4 className="text-sm font-bold text-foreground">
                                  {msg.productResult.title}
                                </h4>
                              </div>
                              <Badge className="bg-emerald-600 text-white font-bold text-xs">
                                ₦{msg.productResult.price.toLocaleString()}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {msg.productResult.description}
                            </p>
                            <div className="pt-1 flex items-center justify-between border-t border-border/40 text-[11px]">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Live on Storefront
                              </span>
                              <span className="text-muted-foreground">ID: {msg.productResult.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        )}

                        {/* Rich Community Post Card */}
                        {msg.communityPostResult && (
                          <div className="p-3.5 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1">
                                <Share2 className="h-3.5 w-3.5" /> Published to Community Feed
                              </span>
                              <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                                Active Post
                              </Badge>
                            </div>
                            <p className="text-xs font-semibold text-foreground/90 bg-card p-2.5 rounded-xl border border-border">
                              "{msg.communityPostResult.content}"
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">
                                Visible to entire GGD Network
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onClose();
                                  window.location.hash = '#community';
                                }}
                                className="h-7 text-[11px] rounded-lg"
                              >
                                View in Community <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Rich 7-Day Strategy Card */}
                        {msg.strategyResult && (
                          <div className="p-4 rounded-2xl bg-card border-2 border-emerald-500/30 space-y-3 shadow-md">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                              <div>
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                  Growth Diagnostic
                                </span>
                                <h4 className="text-sm font-bold text-foreground">
                                  Store Health & 7-Day Revenue Sprint
                                </h4>
                              </div>
                              <Badge className="bg-emerald-600 text-white font-extrabold text-sm px-3 py-1">
                                {msg.strategyResult.healthScore}% Health
                              </Badge>
                            </div>

                            {/* What is Working */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" /> What is Working:
                              </p>
                              {msg.strategyResult.wins.map((w: string, idx: number) => (
                                <p key={idx} className="text-xs text-foreground/90 pl-3">
                                  ✓ {w}
                                </p>
                              ))}
                            </div>

                            {/* Bottlenecks */}
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Bottlenecks to Fix:
                              </p>
                              {msg.strategyResult.bottlenecks.map((b: string, idx: number) => (
                                <p key={idx} className="text-xs text-foreground/90 pl-3">
                                  • {b}
                                </p>
                              ))}
                            </div>

                            {/* Sprint Table */}
                            <div className="pt-2 border-t border-border space-y-1.5">
                              <p className="text-[11px] font-black uppercase text-foreground">
                                7-Day Action Checklist:
                              </p>
                              <div className="space-y-1 text-xs">
                                {msg.strategyResult.sevenDaySprint.slice(0, 4).map((s: any, idx: number) => (
                                  <div key={idx} className="flex items-start justify-between bg-muted/40 p-2 rounded-xl">
                                    <span className="font-bold text-violet-600 dark:text-violet-400 mr-2 shrink-0">{s.day}:</span>
                                    <span className="flex-1 text-foreground">{s.task}</span>
                                    <Badge variant="outline" className="text-[9px] shrink-0 ml-1">{s.impact}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Rich Banner Ad & Flyer Card */}
                        {msg.flyerUrl && (
                          <div className="p-3 rounded-2xl bg-card border border-border space-y-2 shadow-md">
                            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                              <img
                                src={msg.flyerUrl}
                                alt="Generated Marketing Creative"
                                className="w-full h-auto object-cover max-h-72"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={msg.flyerUrl}
                                download="ggd_marketing_banner.jpg"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs"
                              >
                                <Download className="h-3.5 w-3.5" /> Download Creative
                              </a>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendMessage("Publish this banner advert to the community feed")}
                                className="text-xs font-bold rounded-xl"
                              >
                                Post to Community
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="text-[9px] text-muted-foreground px-1">
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Footer */}
            <div className="p-3 sm:p-4 bg-card border-t border-border shrink-0">
              {/* Attachment Preview Dock */}
              {attachedImage && (
                <div className="mb-2 p-2 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-between max-w-2xl mx-auto">
                  <div className="flex items-center gap-2">
                    <img
                      src={attachedImage}
                      alt="Attachment"
                      className="h-10 w-10 rounded-xl object-cover border border-violet-500/30"
                    />
                    <div>
                      <p className="text-xs font-bold text-foreground">Attached Photo</p>
                      <p className="text-[10px] text-muted-foreground">Ready for AI visual analysis or store publishing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedImage(null);
                      setAttachedImageFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="h-7 w-7 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-600 flex items-center justify-center text-xs"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 max-w-4xl mx-auto w-full"
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 w-11 rounded-2xl shrink-0 p-0 hover:bg-violet-500/10 hover:border-violet-500/40 text-violet-600 dark:text-violet-400"
                  title="Upload product or banner photo"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={attachedImage ? "Describe this item or tell Vixora the price..." : "Ask Vixora to add products, post to community, plan strategy, close orders..."}
                  disabled={loading}
                  className="h-11 rounded-2xl bg-secondary/40 border-border text-xs sm:text-sm font-medium focus-visible:ring-violet-500"
                />

                <Button
                  type="submit"
                  disabled={(!input.trim() && !attachedImage) || loading}
                  className="h-11 w-11 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="text-[10px] text-center text-muted-foreground mt-2">
                Vixora AI modifies your storefront catalog, community posts & ads in real time • Connected to Cloud SQL
              </p>
            </div>
          </>
        )}

        {/* TAB 2: BRAND VOICE & MEMORY SYSTEM */}
        {activeTab === 'memory' && (
          <ScrollArea className="flex-1 p-4 sm:p-6">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-600" />
                  Brand Voice & Permanent Memory
                </h3>
                <p className="text-xs text-muted-foreground">
                  Teach Vixora your store voice, payment bank details, delivery terms, and custom business rules. The AI remembers them across all interactions.
                </p>
              </div>

              {/* Brand Voice Style Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Select Brand Voice Tone:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'naija_energetic', label: '🇳🇬 Naija Warm & Energetic', desc: 'Street-smart, enthusiastic, warm Pidgin/English energy' },
                    { id: 'luxury_elite', label: '💎 Luxury & Exclusive', desc: 'Refined, high-end, premium vocabulary, elite vibe' },
                    { id: 'urgent_closer', label: '⚡ Urgent WhatsApp Closer', desc: 'Fast-paced, action-oriented, quick checkout closing' },
                    { id: 'corporate_friendly', label: '💼 Corporate & Trustworthy', desc: 'Professional, structured, high credibility' },
                  ].map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSaveMemoryField('brandVoice', v.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        userMemory.brandVoice === v.id
                          ? 'border-violet-600 bg-violet-500/10 shadow-sm'
                          : 'border-border bg-card hover:bg-muted/50'
                      }`}
                    >
                      <p className="text-xs font-bold text-foreground">{v.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Details for Instant Invoices */}
              <div className="space-y-2 bg-card p-4 rounded-2xl border border-border">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-violet-600" /> Bank Details for Closing Sales:
                </label>
                <Input
                  value={userMemory.bankDetails || ''}
                  onChange={e => handleSaveMemoryField('bankDetails', e.target.value)}
                  placeholder="e.g. GTBank 0123456789 (Emeka Enterprise)"
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used by Vixora when drafting WhatsApp order invoices and checkout confirmation texts.
                </p>
              </div>

              {/* Delivery Terms */}
              <div className="space-y-2 bg-card p-4 rounded-2xl border border-border">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" /> Delivery Policy & Terms:
                </label>
                <Input
                  value={userMemory.deliveryTerms || ''}
                  onChange={e => handleSaveMemoryField('deliveryTerms', e.target.value)}
                  placeholder="e.g. Fast 24h delivery within Lagos, 48h nationwide waybill"
                  className="rounded-xl"
                />
              </div>

              {/* Custom Learned Notes */}
              <div className="space-y-3 bg-card p-4 rounded-2xl border border-border">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-500" /> Learned Facts & Custom Rules:
                </label>
                <div className="space-y-1.5">
                  {(userMemory.customLearnedNotes || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No custom notes saved yet. Tell Vixora what to remember below!</p>
                  ) : (
                    userMemory.customLearnedNotes.map((note, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-xl text-xs">
                        <span>• {note}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = userMemory.customLearnedNotes.filter((_, i) => i !== idx);
                            handleSaveMemoryField('customLearnedNotes', updated);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Input
                    value={newMemoryNote}
                    onChange={e => setNewMemoryNote(e.target.value)}
                    placeholder="e.g. Give 5% discount for orders above 3 items..."
                    className="rounded-xl text-xs"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMemoryNote();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddMemoryNote}
                    className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs px-3"
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* TAB 3: STORE HUB & ACCOUNT OVERVIEW */}
        {activeTab === 'account' && (
          <ScrollArea className="flex-1 p-4 sm:p-6">
            <div className="max-w-xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <Store className="h-5 w-5 text-violet-600" />
                  Store Hub & Account Activities
                </h3>
                <p className="text-xs text-muted-foreground">
                  Overview of your live products, advertising reach, and business credentials on GGD Network.
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-card p-3 rounded-2xl border border-border text-center">
                  <p className="text-lg font-black text-violet-600">{businessContext?.activeProductsCount || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Products</p>
                </div>
                <div className="bg-card p-3 rounded-2xl border border-border text-center">
                  <p className="text-lg font-black text-emerald-600">{businessContext?.activeServicesCount || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Services</p>
                </div>
                <div className="bg-card p-3 rounded-2xl border border-border text-center">
                  <p className="text-lg font-black text-amber-600">{businessContext?.credits.toLocaleString() || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Credits</p>
                </div>
                <div className="bg-card p-3 rounded-2xl border border-border text-center">
                  <p className="text-lg font-black text-blue-600">{businessContext?.activeAdsCount || 0}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Ads</p>
                </div>
              </div>

              {/* Storefront Details */}
              <div className="bg-card p-4 rounded-2xl border border-border space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Storefront Profile
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Business Name:</span>
                    <span className="font-bold text-foreground">{businessContext?.profile?.business_name || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">WhatsApp Phone:</span>
                    <span className="font-bold text-foreground">{businessContext?.profile?.phone_number || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground">Store Address:</span>
                    <span className="font-bold text-foreground">{businessContext?.profile?.address || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-muted-foreground">Merchant Status:</span>
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      {businessContext?.isVerified ? 'Verified Merchant' : 'Registered Merchant'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Active Products List */}
              <div className="bg-card p-4 rounded-2xl border border-border space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Current Catalog Items ({(businessContext?.listings || []).length})</span>
                  <button
                    onClick={() => {
                      setActiveTab('chat');
                      fileInputRef.current?.click();
                    }}
                    className="text-violet-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                  >
                    <Plus className="h-3 w-3" /> Add with Photo
                  </button>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {(businessContext?.listings || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No products yet. Ask Vixora in chat to add your first product!</p>
                  ) : (
                    (businessContext?.listings || []).slice(0, 8).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/40 text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-violet-500 shrink-0" />
                          <span className="font-bold text-foreground truncate max-w-[200px]">{item.title}</span>
                        </div>
                        <Badge variant="outline" className="font-bold text-[11px]">
                          ₦{item.price.toLocaleString()}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VixoraBusinessAiAgentModal;
