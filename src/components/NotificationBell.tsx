import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from "lucide-react";
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
      const utterance = new SpeechSynthesisUtterance(`New notification: ${title}. ${message}`);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const newNotif = payload.new as any;
        if (lastNotifIdRef.current !== newNotif.id) {
          lastNotifIdRef.current = newNotif.id;
          setNotifications(prev => [newNotif, ...prev]);
          playNotificationSound();
          speakNotification(newNotif.title, newNotif.message || '');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, playNotificationSound, speakNotification]);

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const extractLink = (msg: string) => {
    const match = msg?.match(/🔗\s*(https?:\/\/\S+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-10 w-auto sm:w-80 max-w-[calc(100vw-1rem)] z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto rounded-xl border bg-card shadow-2xl">
          <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-card z-10">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] text-orange-600 font-medium">Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map(n => {
              const link = extractLink(n.message);
              return (
                <div key={n.id} className={`p-3 border-b last:border-0 ${!n.is_read ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                  <p className="text-xs font-semibold text-foreground">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {n.message?.replace(/\n\n🔗\s*https?:\/\/\S+/, '')}
                  </p>
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-600 underline mt-1 inline-block">
                      Open Link →
                    </a>
                  )}
                  <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
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
