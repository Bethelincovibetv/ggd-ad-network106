import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, ExternalLink, MailOpen, Trash2, Volume2, ArrowRight,
  ArrowDownLeft, BookOpen, ShieldCheck, Receipt, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationChime, cancelOngoingSpeech } from "@/utils/audio";
import { showPushNotification } from "@/services/pushNotificationService";
import TransactionReceiptModal, { ReceiptData } from '@/components/TransactionReceiptModal';


const NotificationBell = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const lastNotifIdRef = useRef<string>('');
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const playSound = useCallback(() => {
    playNotificationChime();
  }, []);

  const speakNotification = useCallback((title: string, message: string) => {
    // Graceful, non-repeating notification speech: cancel previous utterance first
    if ('speechSynthesis' in window) {
      cancelOngoingSpeech();
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
      .channel('user-notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as any;
        if (lastNotifIdRef.current !== n.id) {
          lastNotifIdRef.current = n.id;
          setNotifications(prev => [n, ...prev]);
          playSound();
          showPushNotification({
            title: n.title || 'Notification',
            body: n.message || '',
            url: '/',
          });
        }
      })
      .subscribe();
    return () => { 
      cancelOngoingSpeech();
      supabase.removeChannel(channel); 
    };
  }, [userId, playSound]);

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications').select('*')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(25);
    setNotifications(data || []);
  };

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

  const handleOpenReceipt = async (n: any) => {
    markAsRead(n.id);
    let amount = 0;
    let senderName = 'Sender';
    let senderHandle = '';
    let receiverName = 'You';
    let receiverHandle = '';

    const amountMatch = n.message?.match(/(\d+[\d,]*)\s*GGG credits/i) || n.message?.match(/(\d+[\d,]*)\s*credits/i);
    if (amountMatch) {
      amount = parseInt(amountMatch[1].replace(/,/g, ''), 10) || 0;
    }
    const fromMatch = n.message?.match(/from\s+([^.]+)/i);
    if (fromMatch) {
      senderName = fromMatch[1].trim();
    }

    const rawTrxId = n.nav_target?.replace('receipt:', '').trim();
    const transferId = rawTrxId || `TRX-${n.id.slice(0, 8).toUpperCase()}`;

    // Query credit_transfers record for authenticated sender info
    if (rawTrxId) {
      try {
        const { data: ct } = await supabase.from('credit_transfers').select('*').eq('id', rawTrxId).maybeSingle();
        if (ct) {
          if (ct.amount) amount = ct.amount;
          const [senderRes, recvRes] = await Promise.all([
            supabase.from('profiles').select('display_name, business_name, business_slug, referral_code').eq('user_id', ct.sender_id).maybeSingle(),
            supabase.from('profiles').select('display_name, business_name, business_slug, referral_code').eq('user_id', ct.receiver_id).maybeSingle(),
          ]);
          if (senderRes.data) {
            senderName = senderRes.data.business_name || senderRes.data.display_name || senderName;
            senderHandle = senderRes.data.business_slug ? `@${senderRes.data.business_slug}` : senderRes.data.referral_code ? `@${senderRes.data.referral_code}` : '';
          }
          if (recvRes.data) {
            receiverName = recvRes.data.business_name || recvRes.data.display_name || 'You';
            receiverHandle = recvRes.data.business_slug ? `@${recvRes.data.business_slug}` : recvRes.data.referral_code ? `@${recvRes.data.referral_code}` : '';
          }
        }
      } catch (err) {
        console.warn('Failed to load deep transfer receipt:', err);
      }
    }

    setSelectedReceipt({
      transferId,
      amount: amount || 100,
      direction: 'received',
      counterpartyName: senderName,
      senderName,
      senderHandle,
      receiverName,
      receiverHandle,
      timestamp: n.created_at,
      status: 'Settled & Verified',
    });
    setReceiptModalOpen(true);
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    const link: string | null = n.link_url || extractLink(n.message);
    let navTarget: string | null = n.nav_target || null;

    setOpen(false);

    // Safeguard Guide notification navigation so it NEVER goes to an empty page!
    if (
      n.type === 'guide_step_completion' ||
      n.title?.toLowerCase().includes('guide') ||
      navTarget?.toLowerCase().includes('guide') ||
      navTarget?.startsWith('step_')
    ) {
      setOpen(false);
      playGuideSuccessSound();
      if (window.location.pathname === '/') {
        window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'guide' }));
      } else {
        window.location.assign('/guide');
      }
      return;
    }

    // Transfer receipt handling
    if (
      n.type === 'credit_transfer' ||
      n.type === 'credit' ||
      n.type === 'transfer_credited' ||
      navTarget?.startsWith('receipt:')
    ) {
      handleOpenReceipt(n);
      return;
    }

    if (navTarget) {
      if (navTarget.startsWith('admin:')) {
        const parts = navTarget.split(':');
        const section = parts[1] || 'syndicate';
        const tab = parts[2] || 'overview';
        if (window.location.pathname.startsWith('/admin')) {
          window.dispatchEvent(new CustomEvent('ggd-nav', { detail: navTarget }));
        } else {
          window.location.assign(`/admin?section=${section}&tab=${tab}`);
        }
      } else {
        window.dispatchEvent(new CustomEvent('ggd-nav', { detail: navTarget }));
      }
    } else if (link) {
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

  const navigateToAllNotifications = () => {
    setOpen(false);
    if (window.location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'notifications' }));
    } else {
      window.location.assign('/notifications');
    }
  };


  return (
    <div className="relative">
      {/* Enhanced 3D Tactile Notification Button */}
      <button
        type="button"
        className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer
          bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 dark:from-amber-500 dark:via-orange-600 dark:to-orange-700
          border-2 border-amber-300/60 dark:border-orange-400/40
          shadow-[0_6px_0_0_#c2410c,0_10px_20px_rgba(234,88,12,0.38),inset_0_2px_1px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.2)]
          hover:shadow-[0_4px_0_0_#c2410c,0_8px_16px_rgba(234,88,12,0.45),inset_0_2px_1px_rgba(255,255,255,0.85)]
          hover:-translate-y-0.5 active:translate-y-1.5 active:shadow-[0_1px_0_0_#c2410c,0_2px_4px_rgba(234,88,12,0.2),inset_0_2px_4px_rgba(0,0,0,0.25)]
          focus:outline-none focus:ring-2 focus:ring-orange-400"
        onClick={() => setOpen(o => !o)}
        aria-label="Open notifications"
      >
        <div className="relative">
          <Bell className={`h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)] ${unreadCount > 0 ? 'animate-[ring_2s_ease-in-out_infinite]' : ''}`} strokeWidth={2.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-2.5 -right-3 h-5.5 min-w-[22px] px-1.5 bg-gradient-to-b from-red-500 via-rose-600 to-red-700 text-white text-[11px] rounded-full flex items-center justify-center font-black shadow-[0_2.5px_0_0_#991b1b,0_4px_8px_rgba(239,68,68,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] ring-2 ring-white dark:ring-neutral-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </button>


      {/* Popover Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/35 z-40 sm:hidden backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-14 sm:w-[420px] z-50 max-h-[80vh] flex flex-col rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.25),0_8px_16px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-border/70 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-850">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-foreground tracking-tight">Notifications</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={playSound}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  title="Test notification sound chime"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                  >
                    <MailOpen className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification items */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50 max-h-[50vh]">
              {notifications.length === 0 ? (
                <div className="py-14 px-6 text-center text-sm text-muted-foreground space-y-2">
                  <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                    <Bell className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="font-bold text-foreground text-sm">No notifications yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Incoming transfers, guide completions, tasks, and system alerts will show here.
                  </p>
                </div>
              ) : (
                notifications.map(n => {
                  const link = n.link_url || extractLink(n.message);
                  const isTransfer =
                    n.type === 'credit_transfer' ||
                    n.type === 'credit' ||
                    n.type === 'transfer_credited' ||
                    n.title?.toLowerCase().includes('credit');

                  const isGuide =
                    n.type === 'guide_step_completion' ||
                    n.title?.toLowerCase().includes('guide') ||
                    n.nav_target?.toLowerCase().includes('guide');

                  const hasAction = !!(n.nav_target || link || isTransfer || isGuide);

                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 transition-colors relative group ${
                        !n.is_read
                          ? 'bg-gradient-to-r from-orange-50/90 via-card to-card dark:from-orange-950/25 dark:via-card dark:to-card'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${
                            isTransfer
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : isGuide
                              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                              : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {isTransfer ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : isGuide ? (
                            <BookOpen className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </div>

                        {/* Text */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleClick(n)}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {!n.is_read && (
                              <span className="h-2 w-2 rounded-full bg-orange-500 ring-2 ring-orange-400/30 inline-block animate-pulse" />
                            )}
                            <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                              {n.title}
                            </h4>
                            {isTransfer && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[9px] font-black px-1.5 py-0">
                                💰 Money
                              </Badge>
                            )}
                            {isGuide && (
                              <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-none text-[9px] font-black px-1.5 py-0">
                                📘 Guide
                              </Badge>
                            )}
                          </div>

                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap break-words">
                              {n.message.replace(/\n*🔗\s*https?:\/\/\S+/g, '').trim()}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {new Date(n.created_at).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {isTransfer && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline">
                                <Receipt className="h-3 w-3" /> View Receipt
                              </span>
                            )}

                            {isGuide && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
                                <BookOpen className="h-3 w-3" /> Go to Guide
                              </span>
                            )}

                            {!isTransfer && !isGuide && hasAction && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline">
                                View <ArrowRight className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Delete action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(n.id);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-muted/60 transition-colors opacity-60 hover:opacity-100"
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

            {/* Footer with Dedicated Page Button */}
            <div className="p-3 border-t border-border/70 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-850">
              <Button
                variant="outline"
                onClick={navigateToAllNotifications}
                className="w-full h-10 rounded-xl text-xs font-bold bg-background hover:bg-muted text-foreground border-border/80 shadow-sm justify-center gap-2 group"
              >
                <span>View All Notifications Page</span>
                <ArrowRight className="h-3.5 w-3.5 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Transaction Receipt Modal */}
      <TransactionReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receipt={selectedReceipt}
      />
    </div>
  );
};

export default NotificationBell;
