import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Search, 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  UserCheck, 
  Sparkles, 
  Clock, 
  MapPin, 
  Loader2, 
  Paperclip, 
  CheckCheck,
  Phone,
  Video,
  Inbox,
  X
} from "lucide-react";
import { playMessageReceivedSound, playMessageSentSound } from "@/utils/audio";
import { sendQuickMessageNotification } from "@/services/pushNotificationService";
import VoiceNoteRecorder from "@/components/chat/VoiceNoteRecorder";
import VoiceNotePlayer from "@/components/chat/VoiceNotePlayer";
import { CallButton } from "@/components/call/CallButton";
import { CallHistoryList } from "@/components/call/CallHistoryList";
import { getCurrentUser } from "@/services/authService";
import GGDInbox from "@/components/GGDInbox";

interface PromoterProfile {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
  state?: string;
  ranking_score?: number;
  tasks_completed?: number;
  approved_count?: number;
  created_at: string;
  bank_name?: string;
  is_current_user?: boolean;
}

interface P2PMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  kind: 'text' | 'voice' | 'image' | 'system';
  message: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  action_payload?: any;
}

export const PromoterNetworkChat: React.FC = () => {
  const [me, setMe] = useState<string>('');
  const [myProfile, setMyProfile] = useState<any>(null);
  const [promoters, setPromoters] = useState<PromoterProfile[]>([]);
  const [loadingPromoters, setLoadingPromoters] = useState(true);
  
  // Main Sub-Tab: 'promoter-directory' | 'full-inbox' | 'call-logs'
  const [activeSubTab, setActiveSubTab] = useState<'promoter-directory' | 'full-inbox' | 'call-logs'>('promoter-directory');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'new' | 'chats'>('all');
  
  // Active Direct Chat
  const [activePromoter, setActivePromoter] = useState<PromoterProfile | null>(null);
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeChatUserIds, setActiveChatUserIds] = useState<Set<string>>(new Set());

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initPromoterNetwork();
  }, []);

  const initPromoterNetwork = async () => {
    setLoadingPromoters(true);
    try {
      let user: any = await getCurrentUser();
      if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }
      if (!user) return;
      setMe(user.id);

      const { data: prof } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyProfile(prof);

      // Fetch all syndicate profiles
      const { data: synProfiles } = await supabase
        .from('syndicate_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!synProfiles || synProfiles.length === 0) {
        setPromoters([]);
        setLoadingPromoters(false);
        return;
      }

      // Fetch corresponding user profiles
      const userIds = synProfiles.map(p => p.user_id).filter(Boolean);
      const { data: userProfs } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, avatar_url, created_at')
        .in('user_id', userIds);

      const userProfMap = new Map<string, any>();
      (userProfs || []).forEach(p => userProfMap.set(p.user_id, p));

      const combined: PromoterProfile[] = synProfiles.map(sp => {
        const up = userProfMap.get(sp.user_id) || {};
        return {
          user_id: sp.user_id,
          display_name: up.display_name || sp.account_name || up.email?.split('@')[0] || 'Promoter Member',
          email: up.email || '',
          avatar_url: sp.avatar_url || up.avatar_url || '',
          state: sp.state || '',
          ranking_score: sp.ranking_score || 0,
          tasks_completed: sp.tasks_completed || 0,
          approved_count: sp.approved_count || 0,
          created_at: sp.created_at || up.created_at || new Date().toISOString(),
          bank_name: sp.bank_name || '',
          is_current_user: sp.user_id === user.id,
        };
      });

      setPromoters(combined);

      // Load active P2P chat user IDs for current user
      const { data: recentMsgs } = await supabase
        .from('p2p_messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(200);

      const activeSet = new Set<string>();
      (recentMsgs || []).forEach(m => {
        if (m.sender_id !== user.id) activeSet.add(m.sender_id);
        if (m.receiver_id !== user.id) activeSet.add(m.receiver_id);
      });
      setActiveChatUserIds(activeSet);

    } catch (err) {
      console.error("Error loading promoter network:", err);
    } finally {
      setLoadingPromoters(false);
    }
  };

  // Open Direct Chat with a Promoter
  const openChatWithPromoter = async (promoter: PromoterProfile) => {
    setActivePromoter(promoter);
    setMessages([]);

    try {
      const { data: msgs } = await supabase
        .from('p2p_messages')
        .select('*')
        .or(`and(sender_id.eq.${me},receiver_id.eq.${promoter.user_id}),and(sender_id.eq.${promoter.user_id},receiver_id.eq.${me})`)
        .order('created_at', { ascending: true });

      setMessages((msgs as P2PMessage[]) || []);

      // Mark unread messages as read
      await supabase
        .from('p2p_messages')
        .update({ is_read: true })
        .eq('sender_id', promoter.user_id)
        .eq('receiver_id', me)
        .eq('is_read', false);
    } catch (err) {
      console.error("Error loading chat messages:", err);
    }
  };

  // Realtime Subscription for Active Chat
  useEffect(() => {
    if (!activePromoter || !me) return;

    const channel = supabase
      .channel(`promoter-p2p-${me}-${activePromoter.user_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'p2p_messages' }, (payload) => {
        const newMsg = payload.new as P2PMessage;
        if (
          (newMsg.sender_id === me && newMsg.receiver_id === activePromoter.user_id) ||
          (newMsg.sender_id === activePromoter.user_id && newMsg.receiver_id === me)
        ) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.receiver_id === me) {
            playMessageReceivedSound();
            supabase.from('p2p_messages').update({ is_read: true }).eq('id', newMsg.id);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePromoter, me]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Direct Message
  const sendMessage = async (textToSend?: string, fileUrl?: string, msgKind: 'text' | 'voice' | 'image' = 'text', payload?: any) => {
    const text = textToSend !== undefined ? textToSend : chatInput.trim();
    if ((!text && !fileUrl) || !activePromoter || isSending) return;

    setIsSending(true);
    if (textToSend === undefined) setChatInput('');
    playMessageSentSound();

    try {
      const { data, error } = await supabase
        .from('p2p_messages')
        .insert({
          sender_id: me,
          receiver_id: activePromoter.user_id,
          kind: msgKind,
          message: text || null,
          image_url: fileUrl || null,
          action_payload: payload || null,
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, data as P2PMessage]);
        setActiveChatUserIds(prev => new Set([...Array.from(prev), activePromoter.user_id]));

        // Dispatch quick message push notification
        sendQuickMessageNotification({
          recipientUserId: activePromoter.user_id,
          senderName: myProfile?.display_name || 'Syndicate Promoter',
          messagePreview: text || (msgKind === 'voice' ? '🎤 Sent a voice note' : '📷 Sent an image'),
          chatUrl: `/inbox?chat=${me}`,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const isNewMember = (createdAt: string) => {
    const joinedMs = new Date(createdAt).getTime();
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return joinedMs > thirtyDaysAgoMs;
  };

  // Filter Promoters List
  const filteredPromoters = promoters.filter(p => {
    if (p.is_current_user) return false;

    // Filter Mode
    if (filterMode === 'new' && !isNewMember(p.created_at)) return false;
    if (filterMode === 'chats' && !activeChatUserIds.has(p.user_id)) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.display_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.state && p.state.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const newMembersCount = promoters.filter(p => !p.is_current_user && isNewMember(p.created_at)).length;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* TOP VIEW MODE SUB-TABS */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('promoter-directory');
              setActivePromoter(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'promoter-directory'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Promoter Directory & Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('full-inbox')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'full-inbox'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Inbox className="h-4 w-4 text-purple-400" />
            <span>Full GGD Inbox</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('call-logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'call-logs'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Phone className="h-4 w-4 text-emerald-400" />
            <span>Voice & Video Call History</span>
          </button>
        </div>

        <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-1">
          WebRTC HD Voice & Video Active
        </Badge>
      </div>

      {/* VIEW MODE: FULL GGD INBOX */}
      {activeSubTab === 'full-inbox' && (
        <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card p-2 sm:p-4">
          <GGDInbox />
        </Card>
      )}

      {/* VIEW MODE: CALL HISTORY LOGS */}
      {activeSubTab === 'call-logs' && (
        <Card className="border border-border shadow-xs rounded-2xl overflow-hidden bg-card p-4">
          <CallHistoryList userId={me} />
        </Card>
      )}

      {/* VIEW MODE: PROMOTER DIRECTORY & DIRECT MESSAGES */}
      {activeSubTab === 'promoter-directory' && (
        <>
          {activePromoter ? (
            <Card className="border border-purple-500/30 shadow-lg rounded-2xl overflow-hidden bg-card flex flex-col h-[75vh]">
              {/* Chat Header with WebRTC Live Voice & Video Call Buttons */}
              <div className="p-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setActivePromoter(null)}
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-xl cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9 border-2 border-white/30 shrink-0">
                    <AvatarImage src={activePromoter.avatar_url} />
                    <AvatarFallback className="bg-purple-500 text-white font-black text-xs">
                      {activePromoter.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-white truncate leading-tight">
                      {activePromoter.display_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-purple-200 mt-0.5">
                      <span className="font-semibold">{activePromoter.state ? `${activePromoter.state} Station` : 'Nationwide Station'}</span>
                      {isNewMember(activePromoter.created_at) && (
                        <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0">New Member</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* WebRTC Live Audio & Video Call Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <CallButton
                    calleeId={activePromoter.user_id}
                    calleeName={activePromoter.display_name}
                    calleeAvatar={activePromoter.avatar_url}
                    callType="audio"
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
                  />

                  <CallButton
                    calleeId={activePromoter.user_id}
                    calleeName={activePromoter.display_name}
                    calleeAvatar={activePromoter.avatar_url}
                    callType="video"
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2.5 bg-purple-500/20 text-purple-200 border-purple-500/30 hover:bg-purple-500/30 cursor-pointer"
                  />

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActivePromoter(null)}
                    className="h-8 px-3 text-xs font-bold rounded-xl cursor-pointer shrink-0 bg-white/15 hover:bg-white/25 text-white border border-white/20"
                  >
                    Close
                  </Button>
                </div>
              </div>

              {/* Messages History List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                {messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <MessageCircle className="h-10 w-10 text-purple-500/40 mx-auto" />
                    <p className="text-sm font-bold text-foreground">Start conversation with {activePromoter.display_name}</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Ask strategy advice, discuss local status posting plans, or start a live voice/video call above.
                    </p>
                  </div>
                ) : (
                  messages.map(m => {
                    const isMine = m.sender_id === me;
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[82%] sm:max-w-[70%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isMine
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
                              : 'bg-card border border-border text-foreground rounded-bl-xs'
                          }`}>
                            {m.kind === 'voice' ? (
                              <VoiceNotePlayer
                                src={m.image_url || m.action_payload?.audio_url || ''}
                                duration={m.action_payload?.duration || 0}
                                isMine={isMine}
                              />
                            ) : m.kind === 'image' && m.image_url ? (
                              <div className="space-y-1">
                                <img src={m.image_url} alt="Shared asset" className="rounded-xl max-h-52 object-cover w-full border border-white/20" />
                                {m.message && <p>{m.message}</p>}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap font-medium">{m.message}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 text-[9px] text-muted-foreground px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMine && (
                              <CheckCheck className={`h-3 w-3 ${m.is_read ? 'text-purple-600' : 'text-muted-foreground'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-card border-t border-border flex items-center gap-2 shrink-0">

                <VoiceNoteRecorder
                  onRecorded={(audioUrl, duration) => sendMessage('Voice Note', audioUrl, 'voice', { duration })}
                  disabled={isSending}
                />

                <Input
                  type="text"
                  placeholder={`Message ${activePromoter.display_name.split(' ')[0]}...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  className="h-10 text-xs rounded-xl bg-background border-border flex-1"
                />

                <Button
                  type="button"
                  disabled={!chatInput.trim() || isSending}
                  onClick={() => sendMessage()}
                  className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer shrink-0"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          ) : (
            /* PROMOTER DIRECTORY & DISCOVERY VIEW */
            <div className="space-y-4">
              {/* Header Banner */}
              <Card className="border border-purple-500/30 shadow-md rounded-2xl overflow-hidden bg-card">
                <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-950 p-5 sm:p-6 text-white space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Users className="h-3.5 w-3.5" /> Direct Promoter Network
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Promoter Chat, Voice & Video Calls</h2>
                  <p className="text-xs text-purple-100/90 leading-relaxed max-w-2xl">
                    Discover fellow verified syndicate members across Nigeria. Start direct inbox chats or initiate 1-on-1 WebRTC voice and HD video calls.
                  </p>

                  {/* Network Quick Stats */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-purple-200 text-[10px] block font-semibold">Total Verified Promoters</span>
                      <span className="font-black text-white text-sm">{promoters.length}</span>
                    </div>
                    <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-purple-200 text-[10px] block font-semibold">New Team Joins (30d)</span>
                      <span className="font-black text-amber-300 text-sm">{newMembersCount} New</span>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Search & Filter Controls Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search promoter name, state station (e.g. Lagos, Abuja), or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 text-xs rounded-xl bg-background border-border"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFilterMode('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          filterMode === 'all'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        All Members ({promoters.filter(p => !p.is_current_user).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('new')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          filterMode === 'new'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        🎉 New Members ({newMembersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('chats')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          filterMode === 'chats'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        💬 Active Chats ({activeChatUserIds.size})
                      </button>
                    </div>
                  </div>

                  {/* Promoter Directory Cards Grid */}
                  {loadingPromoters ? (
                    <div className="text-center py-12 space-y-2">
                      <Loader2 className="h-7 w-7 text-purple-600 animate-spin mx-auto" />
                      <p className="text-xs text-muted-foreground font-semibold">Loading syndicate team directory...</p>
                    </div>
                  ) : filteredPromoters.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl border border-border p-6">
                      <Users className="h-10 w-10 mx-auto opacity-40 mb-2" />
                      <p className="text-sm font-bold text-foreground">No matching promoters found</p>
                      <p className="text-xs mt-1">Try adjusting your search query or filter mode above.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {filteredPromoters.map(p => {
                        const isNew = isNewMember(p.created_at);
                        const hasActiveChat = activeChatUserIds.has(p.user_id);

                        return (
                          <Card key={p.user_id} className="border border-border/80 shadow-2xs rounded-2xl overflow-hidden bg-card hover:border-purple-500/40 transition flex flex-col justify-between">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="relative shrink-0">
                                  <Avatar className="h-12 w-12 border-2 border-purple-500/30">
                                    <AvatarImage src={p.avatar_url} />
                                    <AvatarFallback className="bg-purple-600 text-white font-black text-sm">
                                      {p.display_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {hasActiveChat && (
                                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-background rounded-full" title="Active Chat" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-black text-foreground truncate">{p.display_name}</h4>
                                    {isNew && (
                                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-extrabold px-1.5 py-0 shrink-0">
                                        New
                                      </Badge>
                                    )}
                                  </div>

                                  <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>

                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <Badge variant="outline" className="text-[9px] font-bold border-purple-500/40 text-purple-600 dark:text-purple-400">
                                      <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                      {p.state ? `${p.state}` : 'Nationwide'}
                                    </Badge>

                                    {p.ranking_score ? (
                                      <Badge variant="outline" className="text-[9px] font-bold border-amber-500/40 text-amber-600">
                                        ★ {p.ranking_score}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                                <span>Joined {new Date(p.created_at).toLocaleDateString()}</span>
                                <span className="font-bold text-foreground">{p.approved_count || p.tasks_completed || 0} Tasks Approved</span>
                              </div>

                              {/* Direct Chat + WebRTC Audio/Video Call Buttons */}
                              <div className="space-y-1.5 pt-1">
                                <Button
                                  onClick={() => openChatWithPromoter(p)}
                                  className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {hasActiveChat ? 'Continue Direct Chat' : 'Start Direct Chat'}
                                </Button>

                                <div className="grid grid-cols-2 gap-1.5">
                                  <CallButton
                                    calleeId={p.user_id}
                                    calleeName={p.display_name}
                                    calleeAvatar={p.avatar_url}
                                    callType="audio"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-full text-[11px] font-bold border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                    showLabel
                                  />
                                  <CallButton
                                    calleeId={p.user_id}
                                    calleeName={p.display_name}
                                    calleeAvatar={p.avatar_url}
                                    callType="video"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-full text-[11px] font-bold border-purple-500/40 text-purple-600 hover:bg-purple-50 cursor-pointer"
                                    showLabel
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PromoterNetworkChat;
