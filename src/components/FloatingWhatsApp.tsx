import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userEmail?: string;
}

const STORAGE_KEY = 'ggd_wa_pos_v1';

const FloatingWhatsApp: React.FC<Props> = ({ userEmail }) => {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 16, y: 120 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { x: 16, y: window.innerHeight - 220 };
  });
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('2348131107416');
  const startRef = useRef<{ ox: number; oy: number; px: number; py: number; moved: boolean } | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'admin_whatsapp').maybeSingle()
      .then(({ data }) => {
        if (data?.value) setAdminWhatsapp(String(data.value).replace(/[^\d]/g, ''));
      });
  }, []);

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
    if (startRef.current) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
      // If user didn't drag, treat as click
      if (!startRef.current.moved) openChat();
    }
    startRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const openChat = () => {
    const msg = encodeURIComponent(`Hello! I need help${userEmail ? ` (${userEmail})` : ''}.`);
    window.open(`https://wa.me/${adminWhatsapp}?text=${msg}`, '_blank');
  };

  if (hidden) return null;

  return (
    <div
      ref={btnRef}
      style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
      className="fixed z-[60] select-none"
    >
      <div className="relative">
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="WhatsApp support — drag to move, tap to chat"
          className={`h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl shadow-green-500/40 flex items-center justify-center active:scale-95 transition-transform ${dragging ? 'cursor-grabbing scale-110' : 'cursor-grab'}`}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label="Hide WhatsApp button"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-background border shadow flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-white/90 bg-black/40 px-1.5 py-0.5 rounded-full pointer-events-none flex items-center gap-0.5">
          <GripVertical className="h-2 w-2" />drag
        </span>
      </div>
    </div>
  );
};

export default FloatingWhatsApp;
