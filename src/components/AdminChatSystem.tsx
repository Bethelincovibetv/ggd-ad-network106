import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Search, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendQuickMessageNotification } from "@/services/pushNotificationService";
import MessageStatusIndicator from "@/components/chat/MessageStatusIndicator";

const AdminChatSystem = () => {

  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchParams] = useSearchParams();
  const [adminId, setAdminId] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminId(user.id);
    };
    init();
    fetchUsersWithChats();
  }, []);

  // Automatically select target user if userId query param is provided
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId && users.length > 0) {
      const match = users.find(u => u.user_id === targetUserId || u.id === targetUserId);
      if (match) {
        setSelectedUser(match);
      }
    }
  }, [searchParams, users]);

  useEffect(() => {
    if (!selectedUser || !adminId) return;
    fetchMessages();

    const channelName = `admin-chat-${selectedUser.user_id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'p2p_messages',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as any;
          if (
            (msg.sender_id === selectedUser.user_id && msg.receiver_id === adminId) ||
            (msg.sender_id === adminId && msg.receiver_id === selectedUser.user_id)
          ) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            if (msg.sender_id === selectedUser.user_id) {
              supabase.from('p2p_messages').update({ is_read: true }).eq('id', msg.id);
            }
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
          if (
            (msg.sender_id === selectedUser.user_id && msg.receiver_id === adminId) ||
            (msg.sender_id === adminId && msg.receiver_id === selectedUser.user_id)
          ) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            if (msg.sender_id === selectedUser.user_id) {
              supabase.from('admin_chat_messages').update({ is_read: true }).eq('id', msg.id);
            }
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUser, adminId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsersWithChats = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, display_name, avatar_url')
      .order('created_at', { ascending: false });
    const userList = profiles || [];
    setUsers(userList);

    // If userId query param present, select right away
    const targetUserId = searchParams.get('userId');
    if (targetUserId) {
      const match = userList.find(u => u.user_id === targetUserId);
      if (match) setSelectedUser(match);
    }

    // Get unread counts from both p2p_messages and admin_chat_messages
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: p2pUnread }, { data: adminUnread }] = await Promise.all([
        supabase
          .from('p2p_messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        supabase
          .from('admin_chat_messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false),
      ]);
      const counts: Record<string, number> = {};
      p2pUnread?.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      adminUnread?.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      setUnreadCounts(counts);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser || !adminId) return;
    
    // Fetch from p2p_messages (the standard in-app messages table connected to /inbox)
    const { data: p2pData } = await supabase
      .from('p2p_messages')
      .select('*')
      .or(`and(sender_id.eq.${adminId},receiver_id.eq.${selectedUser.user_id}),and(sender_id.eq.${selectedUser.user_id},receiver_id.eq.${adminId})`)
      .order('created_at', { ascending: true });

    // Also fetch legacy admin_chat_messages to preserve past conversation history
    const { data: legacyData } = await supabase
      .from('admin_chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${adminId},receiver_id.eq.${selectedUser.user_id}),and(sender_id.eq.${selectedUser.user_id},receiver_id.eq.${adminId})`)
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
        .eq('receiver_id', adminId)
        .eq('is_read', false),
      supabase
        .from('admin_chat_messages')
        .update({ is_read: true })
        .eq('sender_id', selectedUser.user_id)
        .eq('receiver_id', adminId)
        .eq('is_read', false)
    ]);
    
    setUnreadCounts(prev => ({ ...prev, [selectedUser.user_id]: 0 }));
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !selectedUser || !adminId) return;
    setNewMessage('');
    
    try {
      // 1. Insert into p2p_messages so user sees message directly in their GGD Inbox (/inbox)
      const { data: insertedMsg, error: p2pError } = await supabase.from('p2p_messages').insert({
        sender_id: adminId,
        receiver_id: selectedUser.user_id,
        message: text,
        kind: 'text',
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

      // 3. Dispatch in-app notification in notifications table
      try {
        await supabase.from('notifications').insert({
          user_id: selectedUser.user_id,
          title: '💬 Direct Support Message from GGD Admin',
          message: text.length > 100 ? `${text.slice(0, 100)}...` : text,
          type: 'message',
          link_url: '/inbox',
          is_read: false,
        });
      } catch {}

      // 4. Dispatch real-time push notification to user's registered devices
      sendQuickMessageNotification({
        recipientUserId: selectedUser.user_id,
        senderName: 'GGD Admin Support',
        messagePreview: text,
        chatUrl: '/inbox',
      });

      toast.success('Message sent to user inbox!');
    } catch (err: any) {
      toast.error('Failed to send message: ' + (err?.message || 'Network error'));
    }
  };

  const filteredUsers = users.filter(u =>
    !searchQuery || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort users: those with unread messages first
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aUnread = unreadCounts[a.user_id] || 0;
    const bUnread = unreadCounts[b.user_id] || 0;
    return bUnread - aUnread;
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
            <div>
              <CardTitle className="text-sm text-white">{selectedUser.display_name || 'User'}</CardTitle>
              <p className="text-[10px] text-orange-100">{selectedUser.email}</p>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_id === adminId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  msg.sender_id === adminId 
                    ? 'bg-orange-500 text-white rounded-br-sm' 
                    : 'bg-secondary text-foreground rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <div className={`mt-1 flex items-center justify-end ${msg.sender_id === adminId ? 'text-orange-100' : 'text-muted-foreground'}`}>
                    {msg.sender_id === adminId ? (
                      <MessageStatusIndicator
                        status={msg.id?.toString().startsWith('tmp-') ? 'sending' : msg.is_read ? 'seen' : 'sent'}
                        timestamp={msg.created_at}
                        variant="on-gradient"
                        size="xs"
                      />
                    ) : (
                      <span className="text-[9px]">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} size="icon" className="bg-orange-500 hover:bg-orange-600 shrink-0">
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
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y border rounded-lg">
            {sortedUsers.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No users found</p>
            ) : (
              sortedUsers.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => setSelectedUser(u)}
                  className="w-full text-left p-3 hover:bg-secondary/80 flex items-center gap-3 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{u.display_name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {unreadCounts[u.user_id] > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px]">
                      {unreadCounts[u.user_id]}
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminChatSystem;
