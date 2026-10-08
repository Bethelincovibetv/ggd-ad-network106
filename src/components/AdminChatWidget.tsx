import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, ExternalLink, Sparkles, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('2348131107416');
  const [adminBio, setAdminBio] = useState('GGD Ad Network Support');
  const [adminLogo, setAdminLogo] = useState('');
  const [customMsg, setCustomMsg] = useState('');

  useEffect(() => {
    supabase.from('app_settings').select('*').then(({ data }) => {
      data?.forEach(s => {
        if (s.key === 'admin_whatsapp') setAdminWhatsapp(String(s.value).replace(/[^\d]/g, '') || '2348131107416');
        if (s.key === 'admin_bio') setAdminBio(s.value);
        if (s.key === 'admin_logo_url' && s.value) setAdminLogo(s.value);
      });
    });

    // Listen for custom trigger to open support chat from any part of the app
    const openHandler = (e: any) => {
      setIsOpen(true);
      if (e?.detail?.message) {
        setCustomMsg(e.detail.message);
      }
    };
    window.addEventListener('ggd-open-support-chat', openHandler);

    // Show contextual recommendation notification once per session if not dismissed
    const isDismissed = sessionStorage.getItem('ggd_chat_recommendation_dismissed');
    if (!isDismissed) {
      const timer = setTimeout(() => {
        setShowRecommendation(true);
      }, 6000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('ggd-open-support-chat', openHandler);
      };
    }

    return () => {
      window.removeEventListener('ggd-open-support-chat', openHandler);
    };
  }, []);

  const openChat = (message: string) => {
    const msg = encodeURIComponent(message || 'Hello! I need assistance with GGD Ad Network.');
    window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, '_blank');
    setIsOpen(false);
    setShowRecommendation(false);
  };

  const dismissRecommendation = () => {
    setShowRecommendation(false);
    sessionStorage.setItem('ggd_chat_recommendation_dismissed', 'true');
  };

  const quickMessages = [
    'I need help with my account',
    'I want to fund my wallet',
    'I have a question about ads',
    'I want to upgrade to Premium',
    'I need support with a task',
  ];

  return (
    <>
      {/* 1. Contextual Recommendation Notification (Non-persistent, elegant toast-style card) */}
      {showRecommendation && !isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-card/95 backdrop-blur-md border border-green-500/30 rounded-2xl p-3.5 shadow-2xl shadow-green-950/20 text-card-foreground flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold text-foreground">GGD Support Assistant</span>
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Need quick assistance with your wallet, ads, or syndicate account?
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsOpen(true)}
                  className="h-7 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-3 shadow-sm"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat with Admin
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissRecommendation}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              onClick={dismissRecommendation}
              aria-label="Close notification"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Support Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm shadow-2xl border-green-500/30 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {adminLogo ? (
                    <img loading="lazy" src={adminLogo} alt="Admin" className="h-9 w-9 rounded-full object-cover border-2 border-white/80" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">Chat with Admin</CardTitle>
                    <p className="text-[11px] text-green-100 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-ping" />
                      Active • Quick Response
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground text-center">{adminBio}</p>
              
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Quick Topics
                </p>
                <div className="space-y-1.5">
                  {quickMessages.map((msg, i) => (
                    <button
                      key={i}
                      onClick={() => openChat(msg)}
                      className="w-full text-left text-xs p-2.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-foreground border border-green-500/20 transition-all flex items-center justify-between group"
                    >
                      <span>{msg}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-green-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Custom Message
                </p>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Describe what you need help with..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/40 focus:outline-hidden focus:ring-1 focus:ring-green-500"
                />
                <Button
                  onClick={() => openChat(customMsg || 'Hello! I need assistance.')}
                  className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-medium h-9 shadow-md"
                >
                  <Send className="h-3 w-3 mr-1.5" />
                  Continue on WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default AdminChatWidget;
