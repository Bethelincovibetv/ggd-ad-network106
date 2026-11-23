import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Search, User, ArrowLeft, AlertTriangle, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendQuickMessageNotification } from "@/services/pushNotificationService";
import { notifyAdminsSystemUpdate, notifyMemberOfStatusUpdate } from "@/services/adminNotificationHelper";
import MessageStatusIndicator from "@/components/chat/MessageStatusIndicator";
import { StructuredChatMessage } from "@/components/chat/StructuredChatMessage";

interface AdminChatSystemProps {
  initialUserId?: string;
  initialTicketId?: string;
}

const AdminChatSystem: React.FC<AdminChatSystemProps> = ({ initialUserId, initialTicketId }) => {

  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'tickets' | 'unread'>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUrgentReply, setIsUrgentReply] = useState(false);
  const [searchParams] = useSearchParams();
  const [adminId, setAdminId] = useState('');
  const [allAdminIds, setAllAdminIds] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [ticketUserIds, setTicketUserIds] = useState<Record<string, { count: number; latestStatus?: string }>>({});
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(initialTicketId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUid = user?.id || '';
      if (currentUid) setAdminId(currentUid);

      // Resolve all admin user IDs across the network
      const adminIdsSet = new Set<string>();
      if (currentUid) adminIdsSet.add(currentUid);

      try {
        const [{ data: roles }, { data: profs }] = await Promise.all([
          supabase.from('user_roles').select('user_id').eq('role', 'admin'),
          supabase.from('profiles').select('user_id').or('email.eq.goodgiftdigital@gmail.com,email.eq.accessa787@gmail.com,email.eq.bethelincovibetv@gmail.com'),
        ]);

        roles?.forEach((r: any) => adminIdsSet.add(r.user_id));
        profs?.forEach((p: any) => adminIdsSet.add(p.user_id));
      } catch (err) {
        console.warn('Notice resolving admin IDs:', err);
      }

      const resolved = Array.from(adminIdsSet);
      setAllAdminIds(resolved);
      await fetchUsersWithChats(resolved);
    };

    init();
  }, []);

  // Automatically select target user & highlighted ticket from props or URL query params
  useEffect(() => {
    const targetUserId = initialUserId || searchParams.get('userId');
    const targetTicketId = initialTicketId || searchParams.get('ticketId');
    if (targetTicketId) {
      setHighlightedTicketId(targetTicketId);
    }
    if (targetUserId && users.length > 0) {
      const match = users.find(u => u.user_id === targetUserId || u.id === targetUserId);
      if (match) {
        setSelectedUser(match);
      }
    }
  }, [initialUserId, initialTicketId, searchParams, users]);

  // Real-time channel for selected conversation & overall support messages
  useEffect(() => {
    if (!adminId) return;

    const channelName = `admin-support-chat-hub-${adminId.slice(0, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'p2p_messages',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as any;
          const isForAdmin = allAdminIds.length > 0 ? allAdminIds.includes(msg.receiver_id) : msg.receiver_id === adminId;

          if (msg.kind === 'ticket' || msg.action_type === 'support_ticket') {
            setTicketUserIds(prev => ({
              ...prev,
              [msg.sender_id]: {
                count: (prev[msg.sender_id]?.count || 0) + 1,
                latestStatus: msg.action_payload?.status || 'Pending',
              },
            }));
          } else if (msg.action_type === 'ticket_status_update' && msg.receiver_id) {
            setTicketUserIds(prev => prev[msg.receiver_id] ? ({
              ...prev,
              [msg.receiver_id]: {
                ...prev[msg.receiver_id],
                latestStatus: msg.action_payload?.status || prev[msg.receiver_id].latestStatus,
              },
            }) : prev);
          }

          if (selectedUser && (
            (msg.sender_id === selectedUser.user_id && isForAdmin) ||
            (allAdminIds.includes(msg.sender_id) && msg.receiver_id === selectedUser.user_id)
          )) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
            if (msg.sender_id === selectedUser.user_id) {
              supabase.from('p2p_messages').update({ is_read: true }).eq('id', msg.id);
            }
          }

          if (isForAdmin && !allAdminIds.includes(msg.sender_id)) {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
            }));
            toast.info(msg.kind === 'ticket' || msg.action_type === 'support_ticket' ? `🎫 New Support Ticket` : `💬 New Support Message`, {
              description: msg.message?.slice(0, 80) || 'Support inquiry received',
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setMessages(prev =>
            prev.map(m => (m.id === updated.id ? { ...m, is_read: updated.is_read } : m))
          );
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_chat_messages',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as any;
          const isForAdmin = allAdminIds.length > 0 ? allAdminIds.includes(msg.receiver_id) : msg.receiver_id === adminId;
          
          if (selectedUser && (
            (msg.sender_id === selectedUser.user_id && isForAdmin) ||
            (allAdminIds.includes(msg.sender_id) && msg.receiver_id === selectedUser.user_id)
          )) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
            if (msg.sender_id === selectedUser.user_id) {
              supabase.from('admin_chat_messages').update({ is_read: true }).eq('id', msg.id);
            }
          }

          if (isForAdmin && !allAdminIds.includes(msg.sender_id)) {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
            }));
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, adminId, allAdminIds]);

  // Load conversation thread whenever a user is selected
  useEffect(() => {
    if (selectedUser && adminId) {
      void fetchMessages();
    }
  }, [selectedUser?.user_id, adminId]);

  useEffect(() => {
    if (highlightedTicketId && messageRefs.current[highlightedTicketId]) {
      messageRefs.current[highlightedTicketId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, highlightedTicketId]);

  const fetchUsersWithChats = async (adminIdsList?: string[]) => {
    const adminTargets = adminIdsList && adminIdsList.length > 0 ? adminIdsList : (allAdminIds.length > 0 ? allAdminIds : [adminId]);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, display_name, avatar_url, business_name')
      .order('created_at', { ascending: false });
    const userList = profiles || [];

    // Get unread counts + support tickets metadata for ALL admin accounts
    let p2pUnread: any[] = [];
    let adminUnread: any[] = [];
    let ticketMsgs: any[] = [];

    if (adminTargets.length > 0) {
      try {
        const [res1, res2, res3] = await Promise.all([
          supabase
            .from('p2p_messages')
            .select('sender_id, receiver_id')
            .in('receiver_id', adminTargets)
            .eq('is_read', false),
          supabase
            .from('admin_chat_messages')
            .select('sender_id, receiver_id')
            .in('receiver_id', adminTargets)
            .eq('is_read', false),
          supabase
            .from('p2p_messages')
            .select('sender_id, receiver_id, kind, action_type, action_payload, created_at')
            .in('action_type', ['support_ticket', 'ticket_status_update'])
            .order('created_at', { ascending: false })
            .limit(200),
        ]);
        p2pUnread = res1.data || [];
        adminUnread = res2.data || [];
        ticketMsgs = res3.data || [];
      } catch (err) {
        console.warn('Notice fetching unread admin chats:', err);
      }
    }

    const counts: Record<string, number> = {};
    p2pUnread.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
    adminUnread.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
    setUnreadCounts(counts);

    const tMap: Record<string, { count: number; latestStatus?: string }> = {};
    ticketMsgs.forEach((m: any) => {
      const uid = m.action_type === 'support_ticket' ? m.sender_id : m.receiver_id;
      if (!uid) return;
      if (!tMap[uid]) {
        tMap[uid] = {
          count: m.action_type === 'support_ticket' ? 1 : 0,
          latestStatus: m.action_payload?.status || 'Pending',
        };
      } else if (m.action_type === 'support_ticket') {
        tMap[uid].count += 1;
      }
    });
    setTicketUserIds(tMap);

    // Sort users so those with unread support messages or tickets appear at the top
    const sortedUsers = [...userList].sort((a, b) => {
      const uA = counts[a.user_id] || 0;
      const uB = counts[b.user_id] || 0;
      if (uB !== uA) return uB - uA;
      const tA = tMap[a.user_id]?.count || 0;
      const tB = tMap[b.user_id]?.count || 0;
      return tB - tA;
    });

    setUsers(sortedUsers);

    // If userId prop or query param present, select right away
    const targetUserId = initialUserId || searchParams.get('userId');
    if (targetUserId) {
      const match = sortedUsers.find(u => u.user_id === targetUserId);
      if (match) setSelectedUser(match);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser || !adminId) return;
    const adminTargets = allAdminIds.length > 0 ? allAdminIds : [adminId];

    // Build OR filters for all admin IDs
    const adminReceivers = adminTargets.map(id => `receiver_id.eq.${id}`).join(',');
    const adminSenders = adminTargets.map(id => `sender_id.eq.${id}`).join(',');
    
    // Fetch from p2p_messages (the standard in-app messages table connected to /inbox)
    const { data: p2pData } = await supabase
      .from('p2p_messages')
      .select('*')
      .or(`and(sender_id.eq.${selectedUser.user_id},or(${adminReceivers})),and(or(${adminSenders}),receiver_id.eq.${selectedUser.user_id})`)
      .order('created_at', { ascending: true });

    // Also fetch legacy admin_chat_messages to preserve past conversation history
    const { data: legacyData } = await supabase
      .from('admin_chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${selectedUser.user_id},or(${adminReceivers})),and(or(${adminSenders}),receiver_id.eq.${selectedUser.user_id})`)
      .order('created_at', { ascending: true });

    // Deduplicate and combine messages
    const existingIds = new Set<string>();
    const combined: any[] = [];
    [...(legacyData || []), ...(p2pData || [])].forEach((msg) => {
      if (!existingIds.has(msg.id)) {
        existingIds.add(msg.id);
        combined.push(msg);
      }
    });

    combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(combined);

    // Mark as read in both tables
    await Promise.all([
      supabase
        .from('p2p_messages')
        .update({ is_read: true })
        .eq('sender_id', selectedUser.user_id)
        .in('receiver_id', adminTargets)
        .eq('is_read', false),
      supabase
        .from('admin_chat_messages')
        .update({ is_read: true })
        .eq('sender_id', selectedUser.user_id)
        .in('receiver_id', adminTargets)
        .eq('is_read', false)
    ]);
    
    setUnreadCounts(prev => ({ ...prev, [selectedUser.user_id]: 0 }));
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !selectedUser || !adminId) return;
    const urgentFlag = isUrgentReply;
    setNewMessage('');
    setIsUrgentReply(false);
    
    try {
      // 1. Insert into p2p_messages so user sees message directly in their GGD Inbox (/inbox)
      const { data: insertedMsg, error: p2pError } = await supabase.from('p2p_messages').insert({
        sender_id: adminId,
        receiver_id: selectedUser.user_id,
        message: text,
        kind: 'text',
        action_type: urgentFlag ? 'urgent_message' : null,
        action_payload: urgentFlag ? { urgent: true } : null,
        is_read: false,
      }).select().single();

      if (p2pError) throw p2pError;

      if (insertedMsg) {
        setMessages(prev => [...prev, insertedMsg]);
      }

      // 2. Also insert into admin_chat_messages for dual-table compatibility
      try {
        await supabase.from('admin_chat_messages').insert({
          sender_id: adminId,
          receiver_id: selectedUser.user_id,
          message: text,
          is_read: false,
        });
      } catch {}

      // 3. Dispatch real-time DB + encrypted Web Push notification to user's devices
      sendQuickMessageNotification({
        recipientUserId: selectedUser.user_id,
        senderName: 'GGD Admin Support',
        messagePreview: text,
        chatUrl: '/inbox',
        urgent: urgentFlag,
      });

      toast.success(urgentFlag ? 'Urgent support alert sent to user!' : 'Message sent to user inbox!');
    } catch (err: any) {
      toast.error('Failed to send message: ' + (err?.message || 'Network error'));
    }
  };

  const handleUpdateTicketStatus = async (status: 'Pending' | 'In Progress' | 'Resolved') => {
    if (!selectedUser || !adminId) return;
    const statusText =
      status === 'Pending'
        ? '📋 Support ticket status set to Pending'
        : status === 'In Progress'
        ? '⚡ Support ticket status updated to In Progress'
        : '✅ Support ticket marked as Resolved';

    try {
      const { data: insertedStatus } = await supabase
        .from('p2p_messages')
        .insert({
          sender_id: adminId,
          receiver_id: selectedUser.user_id,
          kind: 'system',
          message: statusText,
          action_type: 'ticket_status_update',
          action_payload: { status, updated_by: adminId, ticket_id: highlightedTicketId || undefined },
        })
        .select()
        .single();

      if (insertedStatus) {
        setMessages(prev => prev.some(m => m.id === insertedStatus.id) ? prev : [...prev, insertedStatus]);
      }

      const activeTicket =
        messages.find(m => m.id === highlightedTicketId) ||
        [...messages].reverse().find(m => m.kind === 'ticket' || m.action_type === 'support_ticket');

      void notifyMemberOfStatusUpdate({
        userId: selectedUser.user_id,
        title: `🎫 Ticket Update: ${status}`,
        message: statusText,
        type: 'support_ticket',
        navTarget: 'support',
        linkUrl: '/?tab=support',
      });

      void notifyAdminsSystemUpdate({
        title: `Ticket ${status}: ${selectedUser.display_name || selectedUser.email || 'User'}`,
        summary: `${statusText}${activeTicket?.action_payload?.subject ? ` (${activeTicket.action_payload.subject})` : ''}`,
        category: 'support_ticket',
        section: 'chat',
        userId: selectedUser.user_id,
        ticketId: activeTicket?.id || highlightedTicketId || undefined,
        actionLabel: 'Open Ticket',
        actorName: selectedUser.display_name || undefined,
        actorEmail: selectedUser.email || undefined,
        urgent: false,
      });

      toast.success(`Ticket status set to ${status}`);
    } catch (e: any) {
      toast.error(e.message || 'Error updating status');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      !searchQuery ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (userFilter === 'tickets') return Boolean(ticketUserIds[u.user_id]?.count);
    if (userFilter === 'unread') return (unreadCounts[u.user_id] || 0) > 0;
    return true;
  });

  // Sort users: those with unread messages first, then support tickets
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aUnread = unreadCounts[a.user_id] || 0;
    const bUnread = unreadCounts[b.user_id] || 0;
    if (bUnread !== aUnread) return bUnread - aUnread;
    return (ticketUserIds[b.user_id]?.count || 0) - (ticketUserIds[a.user_id]?.count || 0);
  });

  if (selectedUser) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-2 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm text-white">{selectedUser.display_name || 'User'}</CardTitle>
              <p className="text-[10px] text-orange-100">{selectedUser.email}</p>
            </div>
            {/* Admin Support Ticket Status Controller */}
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/10 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 hidden sm:inline px-1">
                Status:
              </span>
              <button
                type="button"
                onClick={() => handleUpdateTicketStatus('Pending')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-200 hover:bg-amber-500/40 border border-amber-400/30 transition-all cursor-pointer"
                title="Mark ticket as Pending"
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTicketStatus('In Progress')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 border border-blue-400/30 transition-all cursor-pointer"
                title="Mark ticket as In Progress"
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTicketStatus('Resolved')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/40 border border-emerald-400/30 transition-all cursor-pointer"
                title="Mark ticket as Resolved"
              >
                Resolved
              </button>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
            )}
            {messages.map(msg => {
              const isMine = msg.sender_id === adminId || allAdminIds.includes(msg.sender_id);
              const isTicketMsg = msg.kind === 'ticket' || msg.action_type === 'support_ticket';
              const isTargetedTicket = highlightedTicketId && msg.id === highlightedTicketId;

              return (
                <div
                  key={msg.id}
                  ref={(el) => {
                    if (msg.id) messageRefs.current[msg.id] = el;
                  }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm transition-all ${
                      isTargetedTicket
                        ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-background shadow-md'
                        : ''
                    } ${
                      isMine
                        ? 'bg-orange-500 text-white rounded-br-sm'
                        : isTicketMsg
                        ? 'bg-amber-500/10 border border-amber-500/30 text-foreground rounded-bl-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}
                  >
                    {isTicketMsg && (
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        <Ticket className="h-3 w-3 shrink-0" />
                        <span>Support Ticket</span>
                        {msg.action_payload?.category && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 uppercase">
                            {msg.action_payload.category}
                          </span>
                        )}
                      </div>
                    )}
                    <StructuredChatMessage text={msg.message} isMine={isMine} />
                    <div className={`mt-1 flex items-center justify-end ${isMine ? 'text-orange-100' : 'text-muted-foreground'}`}>
                      {isMine ? (
                        <MessageStatusIndicator
                          status={msg.id?.toString().startsWith('tmp-') ? 'sending' : msg.is_read ? 'seen' : 'sent'}
                          timestamp={msg.created_at}
                          variant="on-gradient"
                          size="xs"
                        />
                      ) : (
                        <span className="text-[9px] tabular-nums">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              id="admin-chat-urgent-toggle"
              variant={isUrgentReply ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsUrgentReply((v) => !v)}
              aria-pressed={isUrgentReply}
              title="Send as Urgent high-priority push notification"
              className="h-9 px-2.5 text-xs font-bold shrink-0 gap-1"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isUrgentReply ? 'Urgent On' : 'Urgent'}</span>
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isUrgentReply ? "Type urgent support message..." : "Type a message..."}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className={isUrgentReply ? "bg-red-600 hover:bg-red-700 shrink-0" : "bg-orange-500 hover:bg-orange-600 shrink-0"}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-orange-500" />
            Chat with Users
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Users' },
                  { id: 'tickets', label: `Tickets (${Object.keys(ticketUserIds).length})` },
                  { id: 'unread', label: `Unread (${Object.values(unreadCounts).filter(c => c > 0).length})` },
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setUserFilter(tab.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    userFilter === tab.id
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-background text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y border rounded-lg">
            {sortedUsers.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No users found</p>
            ) : (
              sortedUsers.map(u => {
                const ticketInfo = ticketUserIds[u.user_id];
                return (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full text-left p-3 hover:bg-secondary/80 flex items-center gap-3 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{u.display_name || 'No name'}</p>
                        {ticketInfo && ticketInfo.count > 0 && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1 shrink-0">
                            <Ticket className="h-2.5 w-2.5" />
                            {ticketInfo.latestStatus || 'Ticket'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {unreadCounts[u.user_id] > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px] tabular-nums">
                        {unreadCounts[u.user_id]}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChatSystem;
