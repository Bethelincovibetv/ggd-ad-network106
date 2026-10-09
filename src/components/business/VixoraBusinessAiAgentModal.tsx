import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, Sparkles, Send, Loader2, Store, Package, Briefcase, Plus, 
  TrendingUp, RefreshCw, CheckCircle2, ShieldCheck, Download, 
  ExternalLink, MessageCircle, AlertCircle, Trash2, Edit3, X
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchUserBusinessContext, 
  createProductOrService, 
  updateProductOrService, 
  updateBusinessProfileDetails,
  generateProductPromoCanvas,
  BusinessOverviewContext,
  BusinessListingItem,
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
  productResult?: BusinessListingItem;
  profileResult?: any;
  flyerUrl?: string;
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
  const [messages, setMessages] = useState<BusinessChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('vixora_business_agent_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome',
        sender: 'agent',
        text: "Hello! I am Vixora AI Business Copilot! I am your autonomous store manager on GGD Ad Network.\n\nTell me what you need done:\n• Add new products or services (e.g., 'Add a product: Luxury Leather Shoes for ₦35,000')\n• Update existing prices or descriptions\n• Update your business profile, WhatsApp contact, or store address\n• Generate promotional marketing flyers for your catalog\n\nHow can I help grow your business today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionBadge: "Vixora Autonomous Business Engine"
      }
    ];
  });

  const [input, setInput] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState<BusinessOverviewContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      loadContext();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [isOpen]);

  const loadContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ctx = await fetchUserBusinessContext(user.id);
      setBusinessContext(ctx);
    } catch (e) {
      console.warn("Could not load business context:", e);
    }
  };

  const clearChat = () => {
    const welcome: BusinessChatMessage = {
      id: `w_${Date.now()}`,
      sender: 'agent',
      text: "Chat cleared! I am ready to manage your products, services, pricing, and business profile. What would you like to update?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionBadge: "Ready for Instructions"
    };
    setMessages([welcome]);
    try {
      localStorage.removeItem('vixora_business_agent_history');
    } catch {}
  };

  const handleSendMessage = async (promptText?: string) => {
    const query = (promptText || input).trim();
    if (!query || loading) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to manage your business with Vixora AI Agent.");
      return;
    }

    const userMsg: BusinessChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
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
      const lower = query.toLowerCase();

      let actionBadge = '';
      let productResult: BusinessListingItem | undefined;
      let profileResult: any;
      let flyerUrl: string | undefined;
      let responseText = '';

      // Direct Pattern & Intent Extraction (Zero latency, 100% resilient)
      // 1. CREATE PRODUCT OR SERVICE INTENT
      const isCreateIntent = lower.includes('create') || lower.includes('add') || lower.includes('new product') || lower.includes('new service') || lower.includes('publish');
      const isServiceIntent = lower.includes('service');
      const isProductIntent = lower.includes('product') || lower.includes('item') || (!isServiceIntent && isCreateIntent);

      if (isCreateIntent && (isProductIntent || isServiceIntent)) {
        // Extract Price (e.g. ₦35,000, 35000 naira, 50k, etc.)
        let price = 5000;
        const priceMatch = query.match(/(?:₦|naira|ngn|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)(?:\s*(?:k|thousand))?/i);
        if (priceMatch) {
          const rawNum = priceMatch[1].replace(/,/g, '');
          let num = parseFloat(rawNum);
          if (query.toLowerCase().includes(`${rawNum}k`)) num *= 1000;
          if (!isNaN(num) && num > 0) price = num;
        }

        // Extract Title
        let title = query
          .replace(/^(can you |please |vixora |add |create |publish |new |a |an |product |service |called |named )+/i, '')
          .replace(/(?:for|at|price|worth|costing)\s*(?:₦|naira|\$)?[0-9,k]+/i, '')
          .replace(/(?:with description|description:).*/i, '')
          .trim();
        
        if (!title || title.length < 2) {
          title = isServiceIntent ? 'Professional Service' : 'Exclusive Product Offer';
        }

        // Clean quotes if present
        title = title.replace(/^["']|["']$/g, '').trim();

        const res = await createProductOrService(user.id, {
          title,
          price,
          description: `Verified ${isServiceIntent ? 'service' : 'product'} offered by ${currentCtx.profile?.business_name || currentCtx.displayName}. Order or book directly via WhatsApp.`,
          listing_type: isServiceIntent ? 'service' : 'product'
        });

        if (res.success && res.item) {
          productResult = res.item;
          actionBadge = `⚡ New ${isServiceIntent ? 'Service' : 'Product'} Published to Storefront`;
          responseText = `Super sharp! I have created and published "${res.item.title}" to your GGD business storefront at ₦${res.item.price.toLocaleString()}!\n\nYour customers can now discover it in the directory and place direct orders via WhatsApp.`;
          toast.success(`Published "${res.item.title}" to storefront!`);
          if (onRefreshData) onRefreshData();
          loadContext();
        } else {
          responseText = `I couldn't finish adding that item: ${res.message}. Please try again with the title and price.`;
        }
      }

      // 2. UPDATE PRODUCT OR SERVICE (PRICE / NAME / DESCRIPTION)
      else if ((lower.includes('update') || lower.includes('change') || lower.includes('edit')) && (lower.includes('price') || lower.includes('cost') || lower.includes('product') || lower.includes('service'))) {
        let price: number | undefined;
        const priceMatch = query.match(/(?:to|for|at|new price)?\s*(?:₦|naira|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)(?:\s*(?:k|thousand))?/i);
        if (priceMatch) {
          const rawNum = priceMatch[1].replace(/,/g, '');
          let num = parseFloat(rawNum);
          if (query.toLowerCase().includes(`${rawNum}k`)) num *= 1000;
          if (!isNaN(num) && num > 0) price = num;
        }

        // Identify product from catalog or query
        let matchedProduct = currentCtx.listings[0];
        for (const item of currentCtx.listings) {
          if (lower.includes(item.title.toLowerCase())) {
            matchedProduct = item;
            break;
          }
        }

        if (matchedProduct && price !== undefined) {
          const res = await updateProductOrService(user.id, {
            id: matchedProduct.id,
            price
          });

          if (res.success && res.item) {
            productResult = res.item;
            actionBadge = `⚡ Product Price Updated in Database`;
            responseText = `Done! I have updated the price of "${res.item.title}" to ₦${res.item.price.toLocaleString()} on your live storefront!\n\nAll public catalog views and checkout totals now reflect this new price immediately.`;
            toast.success(`Updated price of "${res.item.title}" to ₦${res.item.price.toLocaleString()}`);
            if (onRefreshData) onRefreshData();
            loadContext();
          }
        } else {
          responseText = `I hear you! To update a product or service, tell me the item name and the new price or details. For example: "Update price of ${currentCtx.listings[0]?.title || 'Sneakers'} to ₦20,000".`;
        }
      }

      // 3. UPDATE BUSINESS PROFILE (NAME / WHATSAPP / ADDRESS / BIO)
      else if (lower.includes('business name') || lower.includes('store name') || lower.includes('whatsapp') || lower.includes('phone') || lower.includes('address') || lower.includes('update profile')) {
        const updatePayload: any = {};

        // Phone / WhatsApp match
        const phoneMatch = query.match(/(?:\+?234|0)[0-9]{10}/);
        if (phoneMatch) {
          updatePayload.phone_number = phoneMatch[0];
        }

        // Business Name match
        const nameMatch = query.match(/(?:name to|called|store name:?)\s*([a-zA-Z0-9\s&'-]{3,40})/i);
        if (nameMatch) {
          updatePayload.business_name = nameMatch[1].trim();
        }

        // Address match
        if (lower.includes('address to')) {
          const addr = query.split(/address to\s*/i)[1]?.trim();
          if (addr) updatePayload.address = addr;
        }

        if (Object.keys(updatePayload).length > 0) {
          const res = await updateBusinessProfileDetails(user.id, updatePayload);
          if (res.success && res.profile) {
            profileResult = res.profile;
            actionBadge = "⚡ Business Profile Synchronized";
            responseText = `Great news! I have updated your official storefront details:\n• Business Name: ${res.profile.business_name}\n• Phone/WhatsApp: ${res.profile.phone_number || 'Updated'}\n• Address: ${res.profile.address || 'Updated'}\n\nYour public business profile is now live with these details!`;
            toast.success("Business profile updated!");
            if (onRefreshData) onRefreshData();
            loadContext();
          }
        } else {
          responseText = "I can update your business profile right away! Tell me your new business name, phone number, or address. E.g., 'Update my business name to Apex Digital Hub and phone to 08012345678'.";
        }
      }

      // 4. GENERATE PROMOTIONAL FLYER
      else if (lower.includes('flyer') || lower.includes('banner') || lower.includes('poster') || lower.includes('ad creative')) {
        const targetTitle = currentCtx.listings[0]?.title || currentCtx.profile?.business_name || 'Exclusive Special Offer';
        const targetPrice = currentCtx.listings[0]?.price || 15000;

        flyerUrl = generateProductPromoCanvas({
          title: targetTitle,
          price: targetPrice,
          businessName: currentCtx.profile?.business_name || currentCtx.displayName,
          themeColor: lower.includes('purple') ? 'purple' : lower.includes('emerald') || lower.includes('green') ? 'emerald' : lower.includes('gold') ? 'gold' : 'orange'
        });

        actionBadge = "⚡ High-Converting Flyer Generated";
        responseText = `Here is your high-impact Instagram & WhatsApp marketing flyer for "${targetTitle}"!\n\nYou can download it directly below or share it to your WhatsApp status to drive instant customer inquiries!`;
      }

      // 5. GENERAL INTELLIGENT AI MODEL CALL WITH TOOLS
      else {
        try {
          const apiKey = await resolveAdminAiApiKey();
          if (apiKey && apiKey.length > 10) {
            const ai = new GoogleGenAI({ apiKey });
            const systemInstruction = `You are 'Vixora AI Business Copilot', an elite autonomous AI business manager and store optimization assistant for African & international merchants on GGD Ad Network.
User Name: ${currentCtx.displayName}
Business Name: ${currentCtx.profile?.business_name || 'Not set'}
Active Products: ${currentCtx.activeProductsCount}
Active Services: ${currentCtx.activeServicesCount}
Credits: ${currentCtx.credits}

YOUR POWERS:
1. You can create products and services for the user.
2. You can update existing product prices, titles, or descriptions.
3. You can update business profile details (business name, phone, address).
4. You give smart, realistic Nigerian and African commerce advice (pricing psychology, WhatsApp closing scripts, syndicate promotions).
5. Always speak with warm, enthusiastic, highly knowledgeable, and encouraging Nigerian business energy ("No wahala at all!", "Oya let's scale this business!", "Super sharp!").
6. Never output asterisks (no * or **). Keep typography clean and readable.`;

            const historyTurns = messages
              .filter(m => !m.isThinking && m.id !== 'welcome')
              .slice(-6)
              .map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
              }));

            const contents = [
              ...historyTurns,
              { role: 'user', parts: [{ text: query }] }
            ];

            const res = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents,
              config: { systemInstruction }
            });

            if (res.text) {
              responseText = res.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
            }
          }
        } catch (genErr) {
          console.warn("Gemini model call notice:", genErr);
        }

        if (!responseText) {
          responseText = `I hear you crystal clear, ${currentCtx.displayName}! As your Vixora Business Copilot, I am here to help you manage your store, add high-yield products and services, set optimal prices, and drive WhatsApp customer inquiries.\n\nWhat would you like us to work on next?`;
        }
      }

      const agentResponse: BusinessChatMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionBadge: actionBadge || undefined,
        productResult,
        profileResult,
        flyerUrl
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
      <DialogContent className="max-w-2xl w-[95vw] h-[85vh] max-h-[780px] p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl flex flex-col rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-4 sm:px-6 bg-gradient-to-r from-violet-900/90 via-purple-900/80 to-slate-900 text-white border-b border-white/10 shrink-0 flex flex-row items-center justify-between">
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
                  Online Agent
                </Badge>
              </div>
              <p className="text-[11px] text-violet-200/80">
                Autonomous Store & Product Manager • Independent Module
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={clearChat}
              className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-xl px-2.5"
              title="Reset conversation"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>
        </DialogHeader>

        {/* Quick Action Badges */}
        <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Quick Actions:
          </span>
          <button
            onClick={() => handleSendMessage("Create a new product: Premium Fashion Item for ₦25,000")}
            className="text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 px-2.5 py-1 rounded-xl transition border border-violet-500/20 shrink-0"
          >
            + Add Product
          </button>
          <button
            onClick={() => handleSendMessage("Create a new service: Professional Consulting for ₦50,000")}
            className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-xl transition border border-emerald-500/20 shrink-0"
          >
            + Add Service
          </button>
          <button
            onClick={() => handleSendMessage("Update product price to ₦20,000")}
            className="text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl transition border border-amber-500/20 shrink-0"
          >
            Update Price
          </button>
          <button
            onClick={() => handleSendMessage("Generate a marketing flyer for my products")}
            className="text-[11px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 px-2.5 py-1 rounded-xl transition border border-orange-500/20 shrink-0"
          >
            🎨 Marketing Flyer
          </button>
        </div>

        {/* Messages Stream */}
        <ScrollArea className="flex-1 p-4 sm:p-5">
          <div className="space-y-4 max-w-xl mx-auto">
            {messages.map(msg => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <img
                      src={vixoraAgentAvatar}
                      alt="Vixora"
                      className="h-8 w-8 rounded-xl object-cover shrink-0 ring-2 ring-violet-500/20 shadow-xs"
                    />
                  )}

                  <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {msg.actionBadge && (
                      <div className="inline-flex items-center gap-1.5 bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {msg.actionBadge}
                      </div>
                    )}

                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-tr-xs'
                          : 'bg-card border border-border text-foreground rounded-tl-xs'
                      }`}
                    >
                      {msg.isThinking ? (
                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{msg.text}</span>
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>

                    {/* Rich Interactive Cards */}
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

                    {msg.flyerUrl && (
                      <div className="p-3 rounded-2xl bg-card border border-border space-y-2 shadow-md">
                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                          <img
                            src={msg.flyerUrl}
                            alt="Generated Marketing Flyer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={msg.flyerUrl}
                            download="ggd_product_flyer.jpg"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs"
                          >
                            <Download className="h-3.5 w-3.5" /> Download Flyer
                          </a>
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
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 max-w-xl mx-auto"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Vixora to add products, change prices, update profile..."
              disabled={loading}
              className="h-11 rounded-2xl bg-secondary/40 border-border text-xs sm:text-sm font-medium focus-visible:ring-violet-500"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
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
            Vixora Business Copilot directly modifies your GGD storefront database • Safe, real-time & reversible
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VixoraBusinessAiAgentModal;
