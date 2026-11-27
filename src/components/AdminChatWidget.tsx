import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, ExternalLink, Send, Minimize2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

const POS_STORAGE_KEY = 'ggd_landing_wa_bubble_pos_v1';
const SCREEN_MARGIN = 12;
const TOP_SAFE = 72;

const openExternalUrl = (url: string) => {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const clampBubblePos = (x: number, y: number, w: number, h: number) => {
  if (typeof window === 'undefined') return { x, y };
  const maxX = Math.max(SCREEN_MARGIN, window.innerWidth - w - SCREEN_MARGIN);
  const maxY = Math.max(TOP_SAFE, window.innerHeight - h - SCREEN_MARGIN);
  return {
    x: Math.max(SCREEN_MARGIN, Math.min(maxX, x)),
    y: Math.max(TOP_SAFE, Math.min(maxY, y)),
  };
};

const AdminChatWidget = () => {
  const { isEnabled } = useFeatureToggles();
  const [isOpen, setIsOpen] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('2348131107416');
  const [adminBio, setAdminBio] = useState('GGD Ad Network Support');
  const [adminLogo, setAdminLogo] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragTracker = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    hasMoved: false,
    pointerId: -1,
  });

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 240, y: 540 };
    const estW = window.innerWidth < 640 ? 116 : 196;
    const estH = 44;
    const defX = window.innerWidth - estW - (window.innerWidth < 640 ? 14 : 24);
    const defY = window.innerHeight - estH - (window.innerWidth < 640 ? 22 : 24);

    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return clampBubblePos(parsed.x, parsed.y, estW, estH);
        }
      }
    } catch {}

    return clampBubblePos(defX, defY, estW, estH);
  });

  const getBubbleSize = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    return {
      w: rect?.width && rect.width > 0 ? rect.width : (typeof window !== 'undefined' && window.innerWidth < 640 ? 116 : 196),
      h: rect?.height && rect.height > 0 ? rect.height : 44,
    };
  }, []);

  useEffect(() => {
    // Re-clamp cleanly once mounted and on viewport resize
    const reclamp = () => {
      const { w, h } = getBubbleSize();
      setPosition(prev => clampBubblePos(prev.x, prev.y, w, h));
    };
    const raf = requestAnimationFrame(reclamp);
    window.addEventListener('resize', reclamp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reclamp);
    };
  }, [getBubbleSize]);

  useEffect(() => {
    supabase.from('app_settings').select('*').then(({ data }) => {
      data?.forEach(s => {
        if (s.key === 'admin_whatsapp') setAdminWhatsapp(String(s.value).replace(/[^\d]/g, '') || '2348131107416');
        if (s.key === 'admin_bio') setAdminBio(s.value);
        if (s.key === 'admin_logo_url' && s.value) setAdminLogo(s.value);
      });
    });

    const openHandler = (e: any) => {
      setIsOpen(true);
      if (e?.detail?.message) {
        setCustomMsg(e.detail.message);
      }
    };
    window.addEventListener('ggd-open-support-chat', openHandler);

    let isDismissed = false;
    try {
      isDismissed = Boolean(
        (typeof window !== 'undefined' && window.localStorage?.getItem('ggd_chat_recommendation_dismissed')) ||
        (typeof window !== 'undefined' && window.sessionStorage?.getItem('ggd_chat_recommendation_dismissed'))
      );
    } catch {}

    if (!isDismissed && typeof window !== 'undefined' && window.innerWidth >= 640) {
      const timer = setTimeout(() => {
        setShowRecommendation(true);
      }, 7000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('ggd-open-support-chat', openHandler);
      };
    }

    return () => {
      window.removeEventListener('ggd-open-support-chat', openHandler);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragTracker.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
      hasMoved: false,
      pointerId: e.pointerId,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragTracker.current.active || dragTracker.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragTracker.current.startX;
    const dy = e.clientY - dragTracker.current.startY;
    if (!dragTracker.current.hasMoved && Math.hypot(dx, dy) > 6) {
      dragTracker.current.hasMoved = true;
      setIsDragging(true);
    }
    if (dragTracker.current.hasMoved) {
      const { w, h } = getBubbleSize();
      const clamped = clampBubblePos(
        dragTracker.current.originX + dx,
        dragTracker.current.originY + dy,
        w,
        h
      );
      setPosition(clamped);
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragTracker.current.active || dragTracker.current.pointerId !== e.pointerId) return;
    const wasDragged = dragTracker.current.hasMoved;
    dragTracker.current.active = false;
    dragTracker.current.pointerId = -1;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (wasDragged) {
      const dx = e.clientX - dragTracker.current.startX;
      const dy = e.clientY - dragTracker.current.startY;
      const { w, h } = getBubbleSize();
      const finalPos = clampBubblePos(
        dragTracker.current.originX + dx,
        dragTracker.current.originY + dy,
        w,
        h
      );
      setPosition(finalPos);
      try {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(finalPos));
      } catch {}
      setTimeout(() => {
        dragTracker.current.hasMoved = false;
      }, 60);
    }
  };

  const handleBubbleClick = () => {
    if (dragTracker.current.hasMoved) {
      dragTracker.current.hasMoved = false;
      return;
    }
    setIsOpen(true);
  };

  const openChat = (message: string) => {
    const msg = encodeURIComponent(message || 'Hello! I need assistance with GGD Ad Network.');
    openExternalUrl(`https://wa.me/${adminWhatsapp}?text=${msg}`);
    setIsOpen(false);
    setShowRecommendation(false);
  };

  const dismissRecommendation = () => {
    setShowRecommendation(false);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('ggd_chat_recommendation_dismissed', 'true');
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('ggd_chat_recommendation_dismissed', 'true');
      }
    } catch {}
  };

  const quickMessages = [
    'I need help with my account',
    'I want to fund my wallet',
    ...(isEnabled('banner_ads') ? ['I have a question about banner ads'] : []),
    ...(isEnabled('premium_vip_upgrade') ? ['I want to upgrade to Premium'] : []),
    ...(isEnabled('credit_tasks') ? ['I need support with a task'] : []),
    'I have a question about Syndicate campaigns',
  ];

  // Position recommendation card safely relative to the draggable bubble
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 844;
  const recWidth = Math.min(340, screenW - 24);
  const recLeft = Math.max(SCREEN_MARGIN, Math.min(screenW - recWidth - SCREEN_MARGIN, position.x - recWidth + 160));
  const placeRecAbove = position.y > 220;
  const recTop = placeRecAbove
    ? Math.max(TOP_SAFE, position.y - 148)
    : Math.min(screenH - 156, position.y + 56);

  return (
    <>
      {/* 1. Draggable Landing-Page WhatsApp Support Bubble */}
      {!isOpen && (
        <div
          className="fixed z-40"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            touchAction: 'none',
          }}
        >
          <button
            ref={buttonRef}
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onClick={handleBubbleClick}
            style={{ touchAction: 'none', userSelect: 'none' }}
            className={`group flex items-center gap-2 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm px-3.5 py-2.5 rounded-full shadow-[0_8px_24px_rgba(16,185,129,0.42)] hover:shadow-xl border border-white/25 select-none ${
              isDragging
                ? 'cursor-grabbing scale-105 opacity-95 shadow-2xl'
                : 'cursor-grab active:scale-95 transition-shadow'
            }`}
            title="Drag anywhere • Click for WhatsApp Support"
            aria-label="WhatsApp Support (draggable)"
          >
            <GripVertical className="h-3.5 w-3.5 opacity-75 shrink-0 -ml-1" />
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-300"></span>
            </span>
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">WhatsApp Support</span>
            <span className="sm:hidden whitespace-nowrap">Support</span>
          </button>
        </div>
      )}

      {/* 2. Contextual Recommendation Notification anchored safely near bubble */}
      {showRecommendation && !isOpen && !isDragging && (
        <div
          className="hidden sm:block fixed z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
          style={{
            left: `${recLeft}px`,
            top: `${recTop}px`,
            width: `${recWidth}px`,
          }}
        >
          <div className="bg-card/95 backdrop-blur-md border border-green-500/30 rounded-2xl p-3.5 shadow-2xl shadow-green-950/20 text-card-foreground flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-semibold text-foreground">GGD WhatsApp Support</span>
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Have questions about advertising, promoters, or getting started? Chat with us on WhatsApp.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsOpen(true)}
                  className="h-7 text-xs bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-3 shadow-sm cursor-pointer"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat on WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissRecommendation}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              onClick={dismissRecommendation}
              aria-label="Close notification"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1 rounded-md cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Interactive WhatsApp Support Dialog */}
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
                    <CardTitle className="text-sm font-semibold text-white">GGD WhatsApp Support</CardTitle>
                    <p className="text-[11px] text-green-100 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-ping" />
                      Active • Quick Response
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/85 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title="Minimize panel"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/85 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
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
                      className="w-full text-left text-xs p-2.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-foreground border border-green-500/20 transition-all flex items-center justify-between group cursor-pointer"
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
                  className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-medium h-9 shadow-md cursor-pointer"
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
