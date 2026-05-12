import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ExternalLink, MailOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbGxkb3V0dnR3eH19fX19fX19fX19fX19fXx5d3RxbWlmYmBeXFpZWFdXV1dYWVpcXmBiZWhrbm9xdHd5e319fX19fX19fX19fX19fHl3dHFtaWZiYF5cWllYV1dXV1hZWlxeYGJlaGtub3F0d3l7fX19fX19fX19fX19fX18eXd0cW1pZmJgXlxaWVhXV1dXWFlaXF5gYmVoa25vcXR3eXt9fX19fX19fX19fX19';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const lastNotifIdRef = useRef<string>('');
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  }, []);

  const speakNotification = useCallback((title: string, message: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(`New notification: ${title}. ${message}`);
      u.rate = 1; u.volume = 0.8; u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as any;
        if (lastNotifIdRef.current !== n.id) {
          lastNotifIdRef.current = n.id;
          setNotifications(prev => [n, ...prev]);
          playNotificationSound();
          speakNotification(n.title, n.message || '');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, playNotificationSound, speakNotification]);

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications').select('*')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(30);
    setNotifications(data || []);
  };

  // Extracts a URL from the message body for legacy notifications that
  // embed "🔗 https://…" inline.
  const extractLink = (msg: string | null) => {
    if (!msg) return null;
    const m = msg.match(/🔗\s*(https?:\/\/\S+)/);
    return m ? m[1] : null;
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const removeNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    const link: string | null = n.link_url || extractLink(n.message);
    const navTarget: string | null = n.nav_target || null;

    setOpen(false);
    if (navTarget) {
      // Switch dashboard tab
      window.dispatchEvent(new CustomEvent('ggd-nav', { detail: navTarget }));
    } else if (link) {
      // Internal links open in same tab, external in new
      try {
        const url = new URL(link, window.location.origin);
        if (url.origin === window.location.origin) {
          window.location.assign(link);
        } else {
          window.open(link, '_blank', 'noopener,noreferrer');
        }
      } catch {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 rounded-full"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold animate-pulse shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-12 sm:w-96 z-50 max-h-[75vh] overflow-y-auto rounded-2xl border bg-card shadow-2xl">
            <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-card z-10">
              <span className="font-bold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-orange-600 font-semibold flex items-center gap-1">
                  <MailOpen className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const link = n.link_url || extractLink(n.message);
                const hasAction = !!(n.nav_target || link);
                return (
                  <div
                    key={n.id}
                    className={`p-3 border-b last:border-0 transition-colors ${
                      !n.is_read ? 'bg-orange-50/60 dark:bg-orange-900/10' : ''
                    } ${hasAction ? 'cursor-pointer hover:bg-muted/40' : ''}`}
                    onClick={() => hasAction ? handleClick(n) : markAsRead(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />}
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                            {n.message.replace(/\n*🔗\s*https?:\/\/\S+/g, '').trim()}
                          </p>
                        )}
                        {hasAction && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 mt-1.5">
                            Open <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
