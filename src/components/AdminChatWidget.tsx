import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('2348131107416');
  const [adminBio, setAdminBio] = useState('GGD Ad Network Support');
  const [adminLogo, setAdminLogo] = useState('');

  useEffect(() => {
    supabase.from('app_settings').select('*').then(({ data }) => {
      data?.forEach(s => {
        if (s.key === 'admin_whatsapp') setAdminWhatsapp(s.value);
        if (s.key === 'admin_bio') setAdminBio(s.value);
        if (s.key === 'admin_logo_url' && s.value) setAdminLogo(s.value);
      });
    });
  }, []);

  const openChat = (message: string) => {
    const msg = encodeURIComponent(message);
    window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, '_blank');
  };

  const quickMessages = [
    'I need help with my account',
    'I want to fund my wallet',
    'I have a question about ads',
    'I want to upgrade to Premium',
    'I need support with a task',
  ];

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all animate-bounce">
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-72">
      <Card className="shadow-2xl border-green-200">
        <CardHeader className="pb-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {adminLogo ? (
                <img src={adminLogo} alt="Admin" className="h-8 w-8 rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4" />
                </div>
              )}
              <div>
                <CardTitle className="text-sm text-white">Chat with Admin</CardTitle>
                <p className="text-[10px] text-green-100">Online • Quick Response</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground text-center">{adminBio}</p>
          <div className="space-y-1.5">
            {quickMessages.map((msg, i) => (
              <button key={i} onClick={() => openChat(msg)}
                className="w-full text-left text-xs p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 transition-colors">
                {msg}
              </button>
            ))}
          </div>
          <Button onClick={() => openChat('Hello! I need assistance.')}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />Open WhatsApp Chat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChatWidget;
