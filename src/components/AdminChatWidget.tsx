import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, ExternalLink, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = 'ggd_admin_chat_pos_v2';

const AdminChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('2348131107416');
  const [adminBio, setAdminBio] = useState('GGD Ad Network Support');
  const [adminLogo, setAdminLogo] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 16, y: 200 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Sit clear of the floating Create button and the mobile footer nav.
    return { x: window.innerWidth - 72, y: Math.max(80, window.innerHeight - 300) };
  });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ ox: number; oy: number; px: number; py: number; moved: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    supabase.from('app_settings').select('*').then(({ data }) => {
      data?.forEach(s => {
        if (s.key === 'admin_whatsapp') setAdminWhatsapp(String(s.value).replace(/[^\d]/g, '') || '2348131107416');
        if (s.key === 'admin_bio') setAdminBio(s.value);
        if (s.key === 'admin_logo_url' && s.value) setAdminLogo(s.value);
      });
    });
  }, []);

  const openChat = (message: string) => {
    const msg = encodeURIComponent(message);
    window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, '_blank');
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    startRef.current = { ox: pos.x, oy: pos.y, px: e.clientX, py: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !startRef.current) return;
    const dx = e.clientX - startRef.current.px;
    const dy = e.clientY - startRef.current.py;
    if (Math.abs(dx) + Math.abs(dy) > 5) startRef.current.moved = true;
    const w = btnRef.current?.offsetWidth || 56;
    const h = btnRef.current?.offsetHeight || 56;
    const nx = Math.max(8, Math.min(window.innerWidth - w - 8, startRef.current.ox + dx));
    const ny = Math.max(8, Math.min(window.innerHeight - h - 8, startRef.current.oy + dy));
    setPos({ x: nx, y: ny });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    const moved = startRef.current?.moved;
    if (startRef.current) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    }
    startRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!moved) setIsOpen(true);
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
      <div style={{ left: pos.x, top: pos.y, touchAction: 'none' }} className="fixed z-[60] select-none">
        <button
          ref={btnRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="WhatsApp support — drag to move, tap to chat"
          className={`h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-2xl shadow-green-500/40 flex items-center justify-center active:scale-95 transition-transform ${dragging ? 'cursor-grabbing scale-110' : 'cursor-grab animate-bounce'}`}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-white/90 bg-black/50 px-1.5 py-0.5 rounded-full pointer-events-none flex items-center gap-0.5">
          <GripVertical className="h-2 w-2" />drag
        </span>
      </div>
    );
  }

  return (
    <div style={{ left: Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 360) - 296), top: Math.max(8, pos.y - 280) }} className="fixed z-[60] w-72">
      <Card className="shadow-2xl border-green-200">
        <CardHeader className="pb-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {adminLogo ? (
                <img loading="lazy" src={adminLogo} alt="Admin" className="h-8 w-8 rounded-full object-cover border-2 border-white" />
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
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quick messages</p>
          <div className="space-y-1.5">
            {quickMessages.map((msg, i) => (
              <button key={i} onClick={() => openChat(msg)}
                className="w-full text-left text-xs p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 transition-colors">
                {msg}
              </button>
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pt-1">Or type your own</p>
          <textarea
            id="custom-wa-msg"
            placeholder="Type your message..."
            rows={2}
            className="w-full text-xs p-2 rounded-lg border border-green-200 bg-green-50/40"
          />
          <Button onClick={() => {
              const v = (document.getElementById('custom-wa-msg') as HTMLTextAreaElement)?.value.trim();
              openChat(v || 'Hello! I need assistance.');
            }}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />Send to WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChatWidget;
