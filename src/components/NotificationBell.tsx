import React, { useState, useEffect } from 'react';
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
    setNotifications(data || []);
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => { setOpen(!open); if (!open && unreadCount > 0) markAllRead(); }}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {open && (
        <div className="absolute right-0 top-10 w-72 z-50 max-h-80 overflow-y-auto rounded-xl border bg-card shadow-xl">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] text-orange-600">Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-3 border-b last:border-0 ${!n.is_read ? 'bg-orange-50/50' : ''}`}>
                <p className="text-xs font-semibold text-foreground">{n.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
