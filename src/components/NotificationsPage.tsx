import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, CheckCircle2, Trash2, MailOpen, Volume2, Search, ArrowRight,
  ExternalLink, ArrowDownLeft, ArrowUpRight, BookOpen, Sparkles, Filter,
  ShieldCheck, Loader2, RefreshCw, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { playNotificationChime } from '@/utils/audio';
import TransactionReceiptModal, { ReceiptData } from '@/components/TransactionReceiptModal';

interface NotificationsPageProps {
  onNavigate?: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'transfers' | 'guide' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Initialize and load
  const loadNotifications = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        setUserId(authData.user.id);
        await loadNotifications(authData.user.id);
      } else {
        setLoading(false);
      }
    })();
  }, [loadNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`page-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications((prev) => [newNotif, ...prev]);
          playNotificationChime();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    toast.success('All notifications marked as read');
  };

  const removeNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
    toast.success('Notification removed');
  };

  const clearAllRead = async () => {
    if (!userId) return;
    const readIds = notifications.filter((n) => n.is_read).map((n) => n.id);
    if (readIds.length === 0) {
      toast.info('No read notifications to clear');
      return;
    }
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    await supabase.from('notifications').delete().in('id', readIds);
    toast.success('Cleared read notifications');
  };

  // Open receipt for a transfer notification
  const handleOpenReceipt = (n: any) => {
    markAsRead(n.id);

    // Extract transfer amount & details
    let amount = 0;
    let senderName = 'Sender';
    const amountMatch = n.message?.match(/(\d+[\d,]*)\s*GGG credits/i) || n.message?.match(/(\d+[\d,]*)\s*credits/i);
    if (amountMatch) {
      amount = parseInt(amountMatch[1].replace(/,/g, ''), 10) || 0;
    }

    const fromMatch = n.message?.match(/from\s+([^.]+)/i);
    if (fromMatch) {
      senderName = fromMatch[1].trim();
    }

    let transferId = n.nav_target?.replace('receipt:', '') || `TRX-${n.id.slice(0, 8).toUpperCase()}`;

    setSelectedReceipt({
      transferId,
      amount: amount || 100,
      direction: 'received',
      counterpartyName: senderName,
      timestamp: n.created_at,
      status: 'Settled & Verified',
    });
    setReceiptModalOpen(true);
  };

  const handleAction = (n: any) => {
    markAsRead(n.id);

    const navTarget: string | null = n.nav_target || null;
    const isGuide =
      n.type === 'guide_step_completion' ||
      n.title?.toLowerCase().includes('guide') ||
      navTarget?.toLowerCase().includes('guide') ||
      navTarget?.startsWith('step_');

    const isTransfer =
      n.type === 'credit_transfer' ||
      n.type === 'credit' ||
      n.type === 'transfer_credited' ||
      n.title?.toLowerCase().includes('credit') ||
      navTarget?.startsWith('receipt:');

    if (isTransfer && (navTarget?.startsWith('receipt:') || n.type === 'credit_transfer')) {
      handleOpenReceipt(n);
      return;
    }

    if (isGuide) {
      if (onNavigate) onNavigate('guide');
      else window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'guide' }));
      return;
    }

    if (navTarget) {
      if (navTarget.startsWith('receipt:')) {
        handleOpenReceipt(n);
      } else {
        if (onNavigate) onNavigate(navTarget);
        else window.dispatchEvent(new CustomEvent('ggd-nav', { detail: navTarget }));
      }
      return;
    }

    if (n.link_url) {
      window.open(n.link_url, '_blank');
    }
  };

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (filterTab === 'unread' && n.is_read) return false;

      const isTransfer =
        n.type === 'credit_transfer' ||
        n.type === 'credit' ||
        n.type === 'transfer_credited' ||
        n.title?.toLowerCase().includes('credit') ||
        n.title?.toLowerCase().includes('transfer');

      const isGuide =
        n.type === 'guide_step_completion' ||
        n.title?.toLowerCase().includes('guide') ||
        n.nav_target?.toLowerCase().includes('guide');

      if (filterTab === 'transfers' && !isTransfer) return false;
      if (filterTab === 'guide' && !isGuide) return false;
      if (filterTab === 'system' && (isTransfer || isGuide)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMsg = n.message?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg) return false;
      }

      return true;
    });
  }, [notifications, filterTab, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Banner with 3D styling */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-6 sm:p-8 text-white shadow-2xl border border-white/10">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Notification Center</h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
              Realtime notifications for credit transfers, receipts, task updates, guide progress, and system alerts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={playNotificationChime}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-xl text-xs gap-1.5 h-9"
              title="Test notification sound chime"
            >
              <Volume2 className="h-4 w-4 text-orange-400" /> Test Sound
            </Button>
            {userId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadNotifications(userId)}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-xl text-xs gap-1.5 h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                size="sm"
                onClick={markAllRead}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl text-xs gap-1.5 h-9 shadow-md"
              >
                <MailOpen className="h-3.5 w-3.5" /> Mark All Read ({unreadCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <Card className="border-border/70 shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Tabs
              value={filterTab}
              onValueChange={(v: any) => setFilterTab(v)}
              className="w-full sm:w-auto"
            >
              <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap">
                <TabsTrigger value="all" className="rounded-lg text-xs font-bold py-1.5 px-3">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="rounded-lg text-xs font-bold py-1.5 px-3">
                  Unread ({unreadCount})
                </TabsTrigger>
                <TabsTrigger value="transfers" className="rounded-lg text-xs font-bold py-1.5 px-3 text-emerald-600 dark:text-emerald-400">
                  💰 Transfers
                </TabsTrigger>
                <TabsTrigger value="guide" className="rounded-lg text-xs font-bold py-1.5 px-3 text-indigo-600 dark:text-indigo-400">
                  📘 Guide
                </TabsTrigger>
                <TabsTrigger value="system" className="rounded-lg text-xs font-bold py-1.5 px-3">
                  System
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>
              {notifications.some((n) => n.is_read) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllRead}
                  className="text-xs text-muted-foreground hover:text-destructive h-9 px-2.5 rounded-xl"
                  title="Remove all read notifications"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Read
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Listing */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground">Loading your notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-dashed border-2 rounded-2xl bg-muted/20">
          <CardContent className="py-16 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
              <Bell className="h-7 w-7 opacity-70" />
            </div>
            <h3 className="text-base font-bold text-foreground">No notifications found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? 'No notifications matched your search query.'
                : filterTab === 'unread'
                ? 'You are all caught up! No unread notifications.'
                : 'When you receive credit transfers, task assignments, or guide completions, they will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => {
            const isTransfer =
              n.type === 'credit_transfer' ||
              n.type === 'credit' ||
              n.type === 'transfer_credited' ||
              n.title?.toLowerCase().includes('credit') ||
              n.title?.toLowerCase().includes('transfer');

            const isGuide =
              n.type === 'guide_step_completion' ||
              n.title?.toLowerCase().includes('guide') ||
              n.nav_target?.toLowerCase().includes('guide');

            return (
              <Card
                key={n.id}
                className={`transition-all duration-200 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md ${
                  !n.is_read
                    ? 'bg-gradient-to-r from-orange-50/80 via-background to-background dark:from-orange-950/20 dark:via-card dark:to-card border-orange-300 dark:border-orange-800/60'
                    : 'bg-card border-border/70 hover:border-border'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon Badge */}
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        isTransfer
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : isGuide
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : isGuide ? (
                        <BookOpen className="h-5 w-5" />
                      ) : (
                        <Bell className="h-5 w-5" />
                      )}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-orange-500 ring-2 ring-orange-400/30 animate-pulse" />
                        )}
                        <h4 className="text-sm sm:text-base font-bold text-foreground">
                          {n.title}
                        </h4>

                        {/* Category tag */}
                        {isTransfer && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] font-bold">
                            Money Received
                          </Badge>
                        )}
                        {isGuide && (
                          <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 text-[10px] font-bold">
                            Guide Progress
                          </Badge>
                        )}
                      </div>

                      {n.message && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                          {n.message}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {new Date(n.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {isTransfer && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReceipt(n)}
                              className="h-8 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
                            >
                              <Receipt className="h-3.5 w-3.5" /> View Receipt
                            </Button>
                          )}

                          {isGuide && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(n)}
                              className="h-8 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                            >
                              <BookOpen className="h-3.5 w-3.5" /> Open Guide <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}

                          {!isTransfer && !isGuide && (n.nav_target || n.link_url) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAction(n)}
                              className="h-8 rounded-xl text-xs font-bold gap-1.5"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeNotification(n.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-xl"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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

export default NotificationsPage;
