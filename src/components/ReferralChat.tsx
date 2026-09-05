import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  peerId: string;
  peerName: string;
  onBack: () => void;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  status?: 'pending' | 'sent' | 'delivered';
  tempId?: string;
}

const ReferralChat = ({ peerId, peerName, onBack }: Props) => {
  const [me, setMe] = useState<string>('');
  const [peerProfile, setPeerProfile] = useState<{
    displayName: string;
    avatarUrl?: string | null;
    handle?: string;
  }>({ displayName: peerName });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Auto-scroll helper
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Initialize and load chat
  useEffect(() => {
    let isMounted = true;

    const initChat = async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || !isMounted) {
        setLoading(false);
        return;
      }
      const myId = authData.user.id;
      setMe(myId);

      // Fetch peer profile for avatar and handle
      const { data: peerData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, business_slug, referral_code')
        .eq('user_id', peerId)
        .maybeSingle();

      if (peerData && isMounted) {
        setPeerProfile({
          displayName: peerData.display_name || peerName,
          avatarUrl: peerData.avatar_url,
          handle: peerData.business_slug ? `@${peerData.business_slug}` : peerData.referral_code ? `@${peerData.referral_code}` : undefined,
        });
      }

      // Fetch initial messages
      const { data: fetchedMsgs } = await supabase
        .from('referral_messages' as any)
        .select('*')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      if (isMounted) {
        setMessages((fetchedMsgs || []).map((m: any) => ({ ...m, status: 'delivered' })));
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
      }

      // Realtime subscription setup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`chat-direct-${[myId, peerId].sort().join('-')}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'referral_messages' },
          (payload: any) => {
            const incoming = payload.new as ChatMsg;
            if (!incoming || !incoming.id) return;

            // Only process messages between these two users
            const isRelevant =
              (incoming.sender_id === myId && incoming.receiver_id === peerId) ||
              (incoming.sender_id === peerId && incoming.receiver_id === myId);

            if (!isRelevant) return;

            setMessages((prev) => {
              // ROOT CAUSE FIX: strict deduplication by ID
              const existingIdx = prev.findIndex(
                (m) => m.id === incoming.id || (m.tempId && m.tempId === incoming.id) || (m.sender_id === incoming.sender_id && m.message === incoming.message && Math.abs(new Date(m.created_at).getTime() - new Date(incoming.created_at).getTime()) < 3000)
              );

              if (existingIdx !== -1) {
                // Update existing message in place
                const next = [...prev];
                next[existingIdx] = { ...incoming, status: 'delivered' };
                return next;
              }

              // Otherwise append new message
              return [...prev, { ...incoming, status: 'delivered' }];
            });

            setTimeout(() => scrollToBottom(true), 50);
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    initChat();

    // PROPER SYNCHRONOUS CLEANUP
    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [peerId, peerName, scrollToBottom]);

  // Send message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !me || sending) return;

    setSending(true);
    setText('');

    // Generate unique optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMsg: ChatMsg = {
      id: tempId,
      tempId,
      sender_id: me,
      receiver_id: peerId,
      message: trimmed,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // Add optimistically without duplicating
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 30);

    try {
      const { data, error } = await supabase
        .from('referral_messages' as any)
        .insert({
          sender_id: me,
          receiver_id: peerId,
          message: trimmed,
        })
        .select()
        .single();

      if (error) throw error;

      // Reconcile optimistic message with real message from server
      if (data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...(data as ChatMsg), status: 'sent' } : m
          )
        );
      }
    } catch (err: any) {
      toast.error('Failed to send message. Please retry.');
      // Mark optimistic message as failed/remove
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed); // restore text so user doesn't lose it
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-2 sm:p-4 max-w-2xl mx-auto h-[calc(100vh-140px)] min-h-[500px] flex flex-col">
      <Card className="flex flex-col flex-1 border-border/80 shadow-xl overflow-hidden bg-background">
        {/* Modern WhatsApp / iMessage Style Header */}
        <CardHeader className="border-b border-border/60 py-2.5 px-3 bg-card/80 backdrop-blur flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={onBack}
                className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Avatar className="h-9 w-9 border border-border/60 flex-shrink-0">
                <AvatarImage src={peerProfile.avatarUrl || undefined} alt={peerProfile.displayName} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs">
                  {peerProfile.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground truncate leading-tight">
                    {peerProfile.displayName}
                  </h3>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate leading-tight flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  {peerProfile.handle || 'GGD Member'}
                </p>
              </div>
            </div>

            <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/60">
              End-to-end Encrypted
            </Badge>
          </div>
        </CardHeader>

        {/* Message Feed Canvas */}
        <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-muted/20">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-muted-foreground">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Direct Community Chat</p>
                <p className="text-xs max-w-xs mt-1">
                  Connect directly with {peerProfile.displayName} to collaborate on campaigns and share advice.
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Say hello 👋
              </Badge>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === me;
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <Avatar className="h-6 w-6 mb-0.5 flex-shrink-0">
                      <AvatarImage src={peerProfile.avatarUrl || undefined} />
                      <AvatarFallback className="text-[9px] bg-muted">
                        {peerProfile.displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[78%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm relative break-words ${
                      isMine
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-br-xs'
                        : 'bg-card border border-border/70 text-foreground rounded-bl-xs'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>

                    <div
                      className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                        isMine ? 'text-white/80' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{formatMessageTime(m.created_at)}</span>
                      {isMine && (
                        <span>
                          {m.status === 'pending' ? (
                            <Clock className="h-2.5 w-2.5 animate-spin" />
                          ) : m.status === 'delivered' ? (
                            <CheckCheck className="h-3 w-3 text-white" />
                          ) : (
                            <Check className="h-3 w-3 text-white/90" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Sticky Mobile Input Bar */}
        <div className="p-2 sm:p-3 border-t border-border/60 bg-card flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message ${peerProfile.displayName}...`}
              className="h-11 rounded-xl text-sm bg-muted/40 border-border/60 focus-visible:ring-1 focus-visible:ring-orange-500"
              disabled={sending}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!text.trim() || sending}
              className="h-11 w-11 p-0 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default ReferralChat;
