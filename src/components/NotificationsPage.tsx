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
import { playNotificationChime, playMoneyTransferSound, playGuideSuccessSound } from '@/utils/audio';
import TransactionReceiptModal, { ReceiptData } from '@/components/TransactionReceiptModal';
import { getTransferHistory, TransferRecord } from '@/services/transferService';
import {
  isPushSupported,
  isPushEnabled,
  requestPushPermission,
  showPushNotification,
  getPushPermission,
} from '@/services/pushNotificationService';

interface NotificationsPageProps {

  onNavigate?: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'transfers' | 'history' | 'guide' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getPushPermission());

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushPermission(getPushPermission());
    if (granted) {
      toast.success("Push notifications enabled! You'll receive real-time alerts.");
    } else {
      toast.error("Push notifications were not granted. Check browser site permissions.");
    }
  };

  const handleSendTestPush = () => {
    showPushNotification({
      title: '🔥 GGD Ad Network Alert',
      body: 'Push notifications are working perfectly! You will receive instant new arrival and task alerts.',
      url: '/',
    });
    toast.success("Test notification sent!");
  };

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

  const loadHistory = useCallback(async (uid: string) => {
    setLoadingTransfers(true);
    try {
      const data = await getTransferHistory(uid);
      setTransfers(data);
    } catch (err) {
      console.warn('Failed to load transfers:', err);
    } finally {
      setLoadingTransfers(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        setUserId(authData.user.id);
        await Promise.all([
          loadNotifications(authData.user.id),
          loadHistory(authData.user.id),
        ]);
      } else {
        setLoading(false);
      }
    })();
  }, [loadNotifications, loadHistory]);

  useEffect(() => {
    if (userId && (filterTab === 'history' || filterTab === 'transfers')) {
      loadHistory(userId);
    }
  }, [userId, filterTab, loadHistory]);


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
          showPushNotification({
            title: newNotif.title || 'New Notification',
            body: newNotif.message || '',
            url: '/',
          });
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
  const handleOpenReceipt = async (n: any) => {
    markAsRead(n.id);

    // Extract transfer amount & details
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

    // Deep query credit_transfers if rawTrxId exists
    if (rawTrxId) {
      try {
        const { data: ct } = await supabase.from('credit_transfers').select('*').eq('id', rawTrxId).maybeSingle();
        if (ct) {
          if (ct.amount) amount = ct.amount;
          const [sRes, rRes] = await Promise.all([
            supabase.from('profiles').select('display_name, business_name, business_slug, referral_code').eq('user_id', ct.sender_id).maybeSingle(),
            supabase.from('profiles').select('display_name, business_name, business_slug, referral_code').eq('user_id', ct.receiver_id).maybeSingle(),
          ]);
          if (sRes.data) {
            senderName = sRes.data.business_name || sRes.data.display_name || senderName;
            senderHandle = sRes.data.business_slug ? `@${sRes.data.business_slug}` : sRes.data.referral_code ? `@${sRes.data.referral_code}` : '';
          }
          if (rRes.data) {
            receiverName = rRes.data.business_name || rRes.data.display_name || 'You';
            receiverHandle = rRes.data.business_slug ? `@${rRes.data.business_slug}` : rRes.data.referral_code ? `@${rRes.data.referral_code}` : '';
          }
        }
      } catch (err) {
        console.warn('Failed to deep query transfer details:', err);
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

  const handleOpenTransferHistoryReceipt = (trx: TransferRecord) => {
    setSelectedReceipt({
      transferId: trx.id,
      amount: trx.amount,
      direction: trx.direction,
      counterpartyName: trx.counterpartyName,
      senderName: trx.direction === 'received' ? trx.counterpartyName : 'You',
      senderHandle: trx.direction === 'received' ? trx.counterpartyHandle : '',
      receiverName: trx.direction === 'sent' ? trx.counterpartyName : 'You',
      receiverHandle: trx.direction === 'sent' ? trx.counterpartyHandle : '',
      timestamp: trx.created_at,
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
      playGuideSuccessSound();
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

      {/* Push Notification System Card */}
      {isPushSupported() && (
        <Card className="border-border/70 shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                pushPermission === 'granted'
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-orange-500/15 text-orange-600'
              }`}>
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Browser Push Notifications</h3>
                  {pushPermission === 'granted' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px] font-bold">
                      ACTIVE ✓
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/15 text-orange-600 border-0 text-[10px] font-bold">
                      OPT-IN REQUIRED
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pushPermission === 'granted'
                    ? "You'll receive instant native alerts for new arrivals, blazing featured products, and credit transfers."
                    : "Turn on push notifications to get alerted about blazing new arrivals, credit tasks, and incoming chat messages."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {pushPermission === 'granted' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendTestPush}
                  className="rounded-xl text-xs font-bold h-9"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-orange-500" /> Send Test Push
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleEnablePush}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-bold h-9 shadow-md"
                >
                  <Bell className="h-3.5 w-3.5 mr-1.5" /> Enable Push Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                <TabsTrigger value="history" className="rounded-lg text-xs font-bold py-1.5 px-3 text-amber-600 dark:text-amber-400">
                  🧾 Receipts & History ({transfers.length})
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
      {filterTab === 'history' ? (
        loadingTransfers ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground">Loading verified transaction ledger...</p>
          </div>
        ) : transfers.length === 0 ? (
          <Card className="border-dashed border-2 rounded-2xl bg-muted/20">
            <CardContent className="py-16 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Receipt className="h-7 w-7 opacity-70" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Transactions Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When you transfer or receive GGG credits, your complete ledger and verifiable receipts will be listed here with counterparty details.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Showing {transfers.length} verified transaction{transfers.length === 1 ? '' : 's'}
              </p>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                Rate: 1 GGG = ₦10.00
              </span>
            </div>

            {transfers.map((trx) => {
              const isReceived = trx.direction === 'received';
              return (
                <Card
                  key={trx.id}
                  className="transition-all duration-200 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md bg-card border-border/70 hover:border-border"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      {/* Direction Icon */}
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                          isReceived
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isReceived ? (
                          <ArrowDownLeft className="h-6 w-6" />
                        ) : (
                          <ArrowUpRight className="h-6 w-6" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`text-[10px] font-black uppercase tracking-wider ${
                              isReceived
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {isReceived ? 'Received From' : 'Sent To'}
                          </Badge>
                          <span className="text-sm font-black text-foreground">
                            {trx.counterpartyName}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {trx.counterpartyHandle}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                          <span className="font-mono">Ref: TRX-{trx.id.slice(0, 8).toUpperCase()}</span>
                          <span>•</span>
                          <span>{new Date(trx.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                      </div>

                      {/* Amount & Receipt Button */}
                      <div className="flex flex-col sm:items-end justify-between gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="sm:text-right">
                          <div
                            className={`text-base sm:text-lg font-black tracking-tight ${
                              isReceived
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isReceived ? '+' : '-'}{trx.amount.toLocaleString()} GGG
                          </div>
                          <div className="text-[11px] font-semibold text-muted-foreground">
                            ≈ ₦{(trx.amount * 10).toLocaleString()} NGN
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenTransferHistoryReceipt(trx)}
                          className="h-8.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm gap-1.5"
                        >
                          <Receipt className="h-3.5 w-3.5" /> View Official Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : loading ? (

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
