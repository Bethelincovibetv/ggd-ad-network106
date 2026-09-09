import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, Send, CheckCircle2, ShieldCheck,
  Sparkles, Loader2, Clock, X, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playNotificationChime } from '@/utils/audio';
import VoiceNoteRecorder from '@/components/chat/VoiceNoteRecorder';
import VoiceNotePlayer from '@/components/chat/VoiceNotePlayer';
import WhatsAppSlideMessage from '@/components/chat/WhatsAppSlideMessage';
import BusinessConnectMargin from '@/components/chat/BusinessConnectMargin';

interface BusinessPublicChatModalProps {
  businessUserId: string;
  businessName: string;
  businessLogo?: string;
  businessSlug?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  kind?: string;
  is_read?: boolean;
  created_at: string;
}

export const BusinessPublicChatModal: React.FC<BusinessPublicChatModalProps> = ({
  businessUserId,
  businessName,
  businessLogo,
  businessSlug,
  open,
  onOpenChange,
}) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Customer');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Hello! I am interested in your products/services.',
    'Hi, are you currently available for new orders?',
    'What is your pricing and delivery timeframe?',
    'Can I get more information about this?',
  ];

  // Check authenticated user
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: prof } = await supabase
          .from('profiles')
          .select('display_name, business_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setCurrentUserName(prof?.display_name || prof?.business_name || user.email?.split('@')[0] || 'Customer');
      }
    })();
  }, []);

  // Fetch conversation history from p2p_messages (the existing chat table)
  useEffect(() => {
    if (!open || !currentUserId || !businessUserId) return;

    let isMounted = true;
    setLoadingHistory(true);

    const loadChatHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('p2p_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${businessUserId}),and(sender_id.eq.${businessUserId},receiver_id.eq.${currentUserId})`
          )
          .order('created_at', { ascending: true })
          .limit(80);

        if (!error && isMounted && data) {
          setMessages(data as ChatMsg[]);
        }
      } catch (err) {
        console.warn('Error loading chat history:', err);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    loadChatHistory();

    // Subscribe to realtime changes in p2p_messages
    const channel = supabase
      .channel(`public-biz-chat-${currentUserId}-${businessUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'p2p_messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMsg;
          if (newMsg.sender_id === businessUserId) {
            setMessages((prev) => [...prev, newMsg]);
            playNotificationChime();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [open, currentUserId, businessUserId]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, open]);

  // Send message using the existing chat flow (p2p_messages)
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || !currentUserId || !businessUserId || sending) return;

    setSending(true);
    setInputText('');

    const optimisticMsg: ChatMsg = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: businessUserId,
      message: text,
      kind: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // 1. Insert into existing p2p_messages table
      const { data, error } = await supabase.from('p2p_messages').insert({
        sender_id: currentUserId,
        receiver_id: businessUserId,
        message: text,
        kind: 'text',
        is_read: false,
      }).select().maybeSingle();

      if (error) throw error;

      // Replace optimistic message with real record
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? (data as ChatMsg) : m)));
      }

      // 2. Alert the business owner via notifications table
      try {
        await supabase.from('notifications').insert({
          user_id: businessUserId,
          title: `💬 New Customer Message from ${currentUserName}`,
          message: `${currentUserName}: ${text.slice(0, 120)}`,
          type: 'message',
          nav_target: 'inbox',
          is_read: false,
        });
      } catch {
        // Non-blocking notification
      }

      toast.success('Message sent to business');
    } catch (err: any) {
      toast.error('Failed to send message. Please try again.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleSendVoiceNote = async (audioDataUrl: string, durationSeconds: number) => {
    if (!currentUserId || !businessUserId || sending) return;
    setSending(true);

    const optimisticMsg: any = {
      id: `tmp-${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: businessUserId,
      message: 'Voice Note',
      kind: 'voice',
      action_type: 'voice_note',
      action_payload: { audio_url: audioDataUrl, duration: durationSeconds },
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase.from('p2p_messages').insert({
        sender_id: currentUserId,
        receiver_id: businessUserId,
        message: 'Voice Note',
        kind: 'voice',
        image_url: audioDataUrl,
        action_type: 'voice_note',
        action_payload: { audio_url: audioDataUrl, duration: durationSeconds },
        is_read: false,
      }).select().maybeSingle();

      if (error) throw error;
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? (data as any) : m)));
      }
      toast.success('Voice note sent to business');
    } catch (err) {
      toast.error('Failed to send voice note');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-border/80 bg-card rounded-2xl shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between border-b border-orange-500/30">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 border-2 border-white/40 shadow-sm shrink-0">
              <AvatarImage src={businessLogo || ''} alt={businessName} />
              <AvatarFallback className="bg-orange-800 text-white font-black text-sm">
                {businessName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm truncate">{businessName}</h3>
                <Badge className="bg-white/20 text-white border-none text-[9px] font-bold px-1.5 py-0 shrink-0">
                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" /> Verified
                </Badge>
              </div>
              <p className="text-[11px] text-orange-100 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Replies directly in GGD Inbox
              </p>
            </div>
          </div>
        </div>

        {/* Smart Business Connect Margin */}
        <div className="px-3 pt-2.5 pb-1 border-b border-border/50 bg-muted/20">
          <BusinessConnectMargin
            businessUserId={businessUserId}
            isCompact
            onApplyPrompt={(t) => setInputText(t)}
          />
        </div>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-muted/20 to-card">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground">Direct Chat with {businessName}</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Send a message to ask about products, pricing, availability, or custom orders.
                </p>
              </div>

              {/* Quick suggestion pills */}
              <div className="w-full space-y-1.5 pt-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Quick Inquiries</p>
                {quickPrompts.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="w-full text-left text-xs bg-muted/60 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-500/40 border border-border/60 rounded-xl p-2.5 transition-all text-foreground font-medium"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center py-1">
                <span className="text-[10px] bg-muted/80 text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full">
                  Official GGD Ad Network Chat Flow
                </span>
              </div>

              {messages.map((m) => {
                const isMe = m.sender_id === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <WhatsAppSlideMessage messageId={m.id} currentUserId={currentUserId} isMine={isMe}>
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                          isMe
                            ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-none'
                            : 'bg-muted/80 text-foreground border border-border/70 rounded-bl-none'
                        }`}
                      >
                        {m.kind === 'voice' ? (
                          <div className="min-w-[200px]">
                            <VoiceNotePlayer
                              src={(m as any).action_payload?.audio_url || m.image_url || ''}
                              duration={(m as any).action_payload?.duration || 0}
                              isMine={isMe}
                            />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        )}
                      </div>
                    </WhatsAppSlideMessage>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <CheckCircle2 className="h-2.5 w-2.5 text-orange-500 inline" />
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-card border-t border-border/70 space-y-2">
          <div className="flex items-center gap-2">
            <VoiceNoteRecorder onSendVoice={handleSendVoiceNote} disabled={sending} />
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${businessName}...`}
              className="text-xs sm:text-sm h-10 rounded-xl bg-muted/40 border-border/80 focus-visible:ring-orange-500 flex-1"
              disabled={sending}
            />
            <Button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || sending}
              className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold shadow-md shrink-0"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Powered by GGD Unified Inbox</span>
            <span>Slide message right to react</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessPublicChatModal;
