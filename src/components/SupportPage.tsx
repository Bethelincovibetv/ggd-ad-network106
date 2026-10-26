import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageCircle,
  Mail,
  HelpCircle,
  ShieldCheck,
  Search,
  BookOpen,
  Send,
  CheckCircle2,
  PhoneCall,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Coins,
  Megaphone,
  Share2,
  Store,
  Lock,
  Headphones,
  MapPin,
  Copy,
  ExternalLink,
  Phone,
  CheckCheck,
  Loader2,
  User,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceNoteRecorder } from "@/components/chat/VoiceNoteRecorder";
import VoiceNotePlayer from "@/components/chat/VoiceNotePlayer";
import { MessageStatusIndicator } from "@/components/chat/MessageStatusIndicator";
import { playMessageSentSound, playMessageReceivedSound } from "@/utils/audio";
import { sendQuickMessageNotification } from "@/services/pushNotificationService";

const SUPPORT_EMAIL = 'goodgiftdigital@gmail.com';
const SUPPORT_PHONE = '07043537401';
const WHATSAPP_NUMBER = '2347043537401';
const OFFICE_ADDRESS = '23a Adebayo Doherty Rd lekki phase1, Lagos, Nigeria';

interface SupportPageProps {
  userEmail: string;
  onNavigate?: (tab: string) => void;
}

interface SupportMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  kind?: 'text' | 'voice' | 'system' | string;
  message: string | null;
  image_url?: string | null;
  action_type?: string | null;
  action_payload?: any;
  is_read: boolean;
  created_at: string;
}

interface FAQItem {
  id: string;
  category: 'wallet' | 'ads' | 'syndicate' | 'store' | 'security';
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'f1',
    category: 'wallet',
    q: "How do credit transfers work and are they instant?",
    a: "Credit transfers to other verified GGD members are processed instantly with zero platform fees. You verify the recipient's username or email first, confirm the details, and the credits reflect in their account immediately."
  },
  {
    id: 'f2',
    category: 'wallet',
    q: "How do I fund my wallet with GGD credits?",
    a: "Go to the Wallet Hub and tap 'Fund Credits'. You can purchase credit packages using Paystack (cards, bank transfer, USSD) or manual bank transfer. Once confirmed, your balance updates immediately."
  },
  {
    id: 'f3',
    category: 'ads',
    q: "How are my Banner Ads served and tracked?",
    a: "Banner Ads are displayed across GGD member feeds and external publisher partner sites. You get real-time impression and click tracking in your Campaigns Hub and Campaign Analytics dashboard."
  },
  {
    id: 'f4',
    category: 'ads',
    q: "Can I target my Banner Ads to specific Nigerian states?",
    a: "Yes! During campaign creation, you can select state targeting (e.g., Lagos, Abuja, Rivers, or All Nigeria) so your advertising budget reaches your exact prospective customers."
  },
  {
    id: 'f5',
    category: 'syndicate',
    q: "What is the GGD WhatsApp Syndicate and how do promoters get paid?",
    a: "The Syndicate connects businesses with verified promoters who share campaign flyers on their active WhatsApp Statuses. Promoters submit proof screenshots, and once verified, payouts are credited to their wallet."
  },
  {
    id: 'f6',
    category: 'store',
    q: "How do customers find my Business Storefront?",
    a: "Your business listing is published to the public Business Directory. Customers can browse your catalog, contact you directly on WhatsApp, or send direct inquiries right from your public profile."
  },
  {
    id: 'f7',
    category: 'security',
    q: "How do I verify my account or request Premium membership?",
    a: "You can request Premium verification through our verified support desk or WhatsApp line. Premium members unlock advanced API access, higher transfer limits, and priority campaign indexing."
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: HelpCircle },
  { id: 'wallet', label: 'Credits & Wallet', icon: Coins },
  { id: 'ads', label: 'Banner Ads', icon: Megaphone },
  { id: 'syndicate', label: 'Syndicate', icon: Share2 },
  { id: 'store', label: 'Storefront', icon: Store },
  { id: 'security', label: 'Security & Verification', icon: Lock },
];

const SupportPage: React.FC<SupportPageProps> = ({ userEmail, onNavigate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'channels' | 'ticket' | 'faqs'>('chat');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<string | null>('f1');

  // User & Admin Chat States
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<SupportMsg[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [loadingChat, setLoadingChat] = useState<boolean>(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState('General Inquiry');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  // Load User & Identify Admin ID
  useEffect(() => {
    initSupportChat();
  }, []);

  const initSupportChat = async () => {
    setLoadingChat(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingChat(false);
        return;
      }
      setCurrentUserId(user.id);

      // Identify Admin User ID
      let foundAdminId: string | null = null;
      let foundAdminProf: any = null;

      // 1. Check user_roles for admin
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (adminRoles && adminRoles.length > 0) {
        foundAdminId = adminRoles[0].user_id;
      }

      // 2. Fallback to admin email profile if user_roles didn't return
      if (!foundAdminId) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, avatar_url, business_name')
          .or('email.eq.goodgiftdigital@gmail.com,email.eq.accessa787@gmail.com')
          .limit(1);

        if (profs && profs.length > 0) {
          foundAdminId = profs[0].user_id;
          foundAdminProf = profs[0];
        }
      } else {
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, avatar_url, business_name')
          .eq('user_id', foundAdminId)
          .maybeSingle();
        if (prof) foundAdminProf = prof;
      }

      if (foundAdminId) {
        setAdminUserId(foundAdminId);
        setAdminProfile(foundAdminProf || {
          display_name: 'GGD Support Admin',
          email: SUPPORT_EMAIL,
        });
        await loadSupportMessages(user.id, foundAdminId);
      }
    } catch (err) {
      console.warn('Error initializing support chat:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const loadSupportMessages = async (uid: string, adminId: string) => {
    try {
      // Query p2p_messages between user and admin
      const { data: p2pData } = await supabase
        .from('p2p_messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true });

      // Query admin_chat_messages
      const { data: legacyData } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true });

      const existingMap = new Map<string, SupportMsg>();
      [...(legacyData || []), ...(p2pData || [])].forEach((msg: any) => {
        existingMap.set(msg.id, {
          id: msg.id,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          kind: msg.kind || (msg.action_payload?.audio_url ? 'voice' : 'text'),
          message: msg.message,
          image_url: msg.image_url,
          action_type: msg.action_type,
          action_payload: msg.action_payload,
          is_read: msg.is_read || false,
          created_at: msg.created_at,
        });
      });

      const list = Array.from(existingMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setChatMessages(list);

      // Mark unread messages from admin as read
      await Promise.all([
        supabase
          .from('p2p_messages')
          .update({ is_read: true })
          .eq('sender_id', adminId)
          .eq('receiver_id', uid)
          .eq('is_read', false),
        supabase
          .from('admin_chat_messages')
          .update({ is_read: true })
          .eq('sender_id', adminId)
          .eq('receiver_id', uid)
          .eq('is_read', false),
      ]);
    } catch (err) {
      console.warn('Error loading support messages:', err);
    }
  };

  // Realtime subscription for incoming support messages
  useEffect(() => {
    if (!currentUserId || !adminUserId) return;

    const channel = supabase
      .channel(`user-support-chat-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'p2p_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new as any;
            if (
              (m.sender_id === currentUserId && m.receiver_id === adminUserId) ||
              (m.sender_id === adminUserId && m.receiver_id === currentUserId)
            ) {
              const formatted: SupportMsg = {
                id: m.id,
                sender_id: m.sender_id,
                receiver_id: m.receiver_id,
                kind: m.kind || (m.action_payload?.audio_url ? 'voice' : 'text'),
                message: m.message,
                image_url: m.image_url,
                action_type: m.action_type,
                action_payload: m.action_payload,
                is_read: m.is_read || false,
                created_at: m.created_at,
              };

              setChatMessages((prev) => {
                if (prev.some((x) => x.id === formatted.id)) return prev;
                return [...prev, formatted];
              });

              if (m.sender_id === adminUserId) {
                playMessageReceivedSound();
                supabase
                  .from('p2p_messages')
                  .update({ is_read: true })
                  .eq('id', m.id);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const m = payload.new as any;
            if (
              (m.sender_id === currentUserId && m.receiver_id === adminUserId) ||
              (m.sender_id === adminUserId && m.receiver_id === currentUserId)
            ) {
              const formatted: SupportMsg = {
                id: m.id,
                sender_id: m.sender_id,
                receiver_id: m.receiver_id,
                kind: 'text',
                message: m.message,
                is_read: m.is_read || false,
                created_at: m.created_at,
              };

              setChatMessages((prev) => {
                if (prev.some((x) => x.id === formatted.id)) return prev;
                return [...prev, formatted];
              });

              if (m.sender_id === adminUserId) {
                playMessageReceivedSound();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, adminUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeSubTab]);

  const sendSupportText = async () => {
    const text = chatInput.trim();
    if (!text || !currentUserId || !adminUserId || isSendingChat) return;

    setIsSendingChat(true);
    setChatInput('');

    const tmpId = `tmp-${Date.now()}`;
    const optimisticMsg: SupportMsg = {
      id: tmpId,
      sender_id: currentUserId,
      receiver_id: adminUserId,
      kind: 'text',
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);
    playMessageSentSound();

    try {
      // 1. Insert into p2p_messages
      const { data: inserted, error: err1 } = await supabase
        .from('p2p_messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: adminUserId,
          message: text,
          kind: 'text',
          is_read: false,
        })
        .select()
        .single();

      if (err1) throw err1;

      if (inserted) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === tmpId ? (inserted as any) : m))
        );
      }

      // 2. Also insert into admin_chat_messages for admin dashboard
      try {
        await supabase.from('admin_chat_messages').insert({
          sender_id: currentUserId,
          receiver_id: adminUserId,
          message: text,
          is_read: false,
        });
      } catch {}

      // 3. Insert notification for Admin
      try {
        await supabase.from('notifications').insert({
          user_id: adminUserId,
          title: `🚨 Direct Support Inquiry from ${userEmail}`,
          message: text,
          type: 'urgent_message',
          nav_target: 'chat',
          is_read: false,
        });
      } catch {}

      sendQuickMessageNotification({
        recipientUserId: adminUserId,
        senderName: userEmail || 'GGD Member',
        messagePreview: text,
        chatUrl: `/admin?tab=chat&userId=${currentUserId}`,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send support message');
      setChatMessages((prev) => prev.filter((m) => m.id !== tmpId));
    } finally {
      setIsSendingChat(false);
    }
  };

  const sendSupportVoiceNote = async (audioDataUrl: string, durationSeconds: number) => {
    if (!currentUserId || !adminUserId || isSendingChat) return;

    setIsSendingChat(true);
    const tmpId = `tmp-${Date.now()}`;
    const optimisticMsg: SupportMsg = {
      id: tmpId,
      sender_id: currentUserId,
      receiver_id: adminUserId,
      kind: 'voice',
      message: 'Voice Note',
      action_type: 'voice_note',
      action_payload: { audio_url: audioDataUrl, duration: durationSeconds },
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);
    playMessageSentSound();

    try {
      const { data: inserted, error } = await supabase
        .from('p2p_messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: adminUserId,
          kind: 'voice',
          message: 'Voice Note',
          action_type: 'voice_note',
          action_payload: { audio_url: audioDataUrl, duration: durationSeconds },
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (inserted) {
        setChatMessages((prev) =>
          prev.map((m) => (m.id === tmpId ? (inserted as any) : m))
        );
      }

      toast.success('Voice note sent to GGD Admin!');
    } catch (err: any) {
      toast.error('Could not send voice note');
      setChatMessages((prev) => prev.filter((m) => m.id !== tmpId));
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Please enter a subject and message.');
      return;
    }

    setSubmittingTicket(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;

      if (uid && adminUserId) {
        // Send as support message
        const ticketBody = `[IN-APP TICKET - ${ticketCategory.toUpperCase()}]\nSubject: ${ticketSubject}\n\n${ticketMessage}`;

        await supabase.from('p2p_messages').insert({
          sender_id: uid,
          receiver_id: adminUserId,
          kind: 'text',
          message: ticketBody,
          is_read: false,
        });

        await supabase.from('notifications').insert({
          user_id: uid,
          title: `Support Ticket: ${ticketSubject}`,
          message: `Your ticket (${ticketCategory}) has been logged. Our operations team will respond shortly.`,
          type: 'system',
        });
      }

      setTicketSent(true);
      toast.success('Support ticket submitted successfully!');
      setTicketSubject('');
      setTicketMessage('');
    } catch {
      toast.error('Could not submit ticket. Please contact us on WhatsApp.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const openWhatsAppSupport = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = `Hello GGD Support! I need assistance with my account.\n\nAccount Email: ${userEmail || 'Member'}\nTime: ${time}\nTopic: General Inquiry`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const filteredFaqs = FAQS.filter((f) => {
    const matchesCat = selectedCat === 'all' || f.category === selectedCat;
    const matchesSearch =
      !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 sm:p-6 text-white relative overflow-hidden shadow-xl shadow-orange-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider opacity-90">
                Official Support & Live Desk
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">How can we help you today?</h2>
            <p className="text-xs sm:text-sm opacity-90 mt-1 max-w-xl">
              Chat live with GGD Admin, reach us via WhatsApp, call directly, or send an official email inquiry.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3.5 py-2 rounded-2xl text-xs font-extrabold self-start sm:self-auto border border-white/20">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>24/7 Support Desk Active</span>
          </div>
        </div>

        {/* Live Search Input for FAQs */}
        <div className="mt-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help topics, credit transfers, ads, syndicate guides..."
            className="pl-10 h-12 rounded-2xl bg-white text-foreground placeholder:text-muted-foreground shadow-lg border-0 text-sm focus-visible:ring-2 focus-visible:ring-orange-400"
          />
        </div>
      </div>

      {/* Primary Contact Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Direct Admin Live Chat */}
        <Card
          onClick={() => setActiveSubTab('chat')}
          className={`cursor-pointer transition-all border-2 ${
            activeSubTab === 'chat'
              ? 'border-orange-500 bg-orange-500/5 shadow-md'
              : 'border-border/70 hover:border-orange-500/50 bg-card'
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <MessageCircle className="h-5 w-5" />
              </div>
              <Badge className="bg-orange-500 text-white text-[10px] font-bold">In-App Live</Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Direct Admin Chat</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Real-time chat & voice notes with Admin</p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Support */}
        <Card
          onClick={openWhatsAppSupport}
          className="cursor-pointer transition-all border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/70 shadow-xs hover:shadow-md"
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                <PhoneCall className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Fastest</Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">WhatsApp Live</h4>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{SUPPORT_PHONE}</p>
            </div>
          </CardContent>
        </Card>

        {/* Official Email Desk */}
        <a href={`mailto:${SUPPORT_EMAIL}?subject=Support Inquiry - ${encodeURIComponent(userEmail)}`} className="block">
          <Card className="cursor-pointer transition-all border border-border/70 hover:border-blue-500/50 bg-card hover:bg-blue-500/5 h-full">
            <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Mail className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">Official</Badge>
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Email Desk</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{SUPPORT_EMAIL}</p>
              </div>
            </CardContent>
          </Card>
        </a>

        {/* Direct Call & Address */}
        <Card
          onClick={() => setActiveSubTab('channels')}
          className={`cursor-pointer transition-all border-2 ${
            activeSubTab === 'channels'
              ? 'border-indigo-500 bg-indigo-500/5 shadow-md'
              : 'border-border/70 hover:border-indigo-500/50 bg-card'
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px]">Lekki Phase 1</Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Office & Phone</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Physical Address & Direct Line</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Sub-Navigation Tabs */}
      <Tabs value={activeSubTab} onValueChange={(v: any) => setActiveSubTab(v)} className="w-full space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-12 p-1 bg-muted/70 rounded-2xl border">
          <TabsTrigger value="chat" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MessageCircle className="h-4 w-4 text-orange-500" /> Direct Admin Chat
          </TabsTrigger>
          <TabsTrigger value="channels" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Phone className="h-4 w-4 text-emerald-500" /> Contact Channels
          </TabsTrigger>
          <TabsTrigger value="ticket" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Send className="h-4 w-4 text-blue-500" /> Submit Ticket
          </TabsTrigger>
          <TabsTrigger value="faqs" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <HelpCircle className="h-4 w-4 text-purple-500" /> FAQs & Knowledge
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DIRECT ADMIN SUPPORT CHAT */}
        <TabsContent value="chat" className="space-y-3 mt-0">
          <Card className="border-border/80 shadow-md rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-gradient-to-r from-orange-950 via-slate-900 to-slate-950 p-4 text-white border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-black text-white text-base shadow-md">
                      {adminProfile?.display_name?.charAt(0) || 'A'}
                    </div>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>{adminProfile?.display_name || 'GGD Support Desk Admin'}</span>
                      <Badge className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase">Online</Badge>
                    </h3>
                    <p className="text-xs text-orange-200/80">Direct 1-on-1 Support & Voice Messaging</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={openWhatsAppSupport}
                  className="hidden sm:flex h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Fallback
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex flex-col h-[480px]">
              {/* Chat Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/20">
                {loadingChat ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="py-12 text-center space-y-3 max-w-sm mx-auto">
                    <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 mx-auto flex items-center justify-center">
                      <Headphones className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground">Welcome to Direct Admin Support</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Type a message or send a voice note below to get direct assistance from our platform administrators.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((m) => {
                    const isMine = m.sender_id === currentUserId;
                    return (
                      <div key={m.id} className={`flex gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {!isMine && (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            A
                          </div>
                        )}
                        <div className={`max-w-[85%] sm:max-w-[70%] space-y-1`}>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                              isMine
                                ? 'bg-orange-500 text-white rounded-br-none'
                                : 'bg-card border border-border text-foreground rounded-bl-none'
                            }`}
                          >
                            {m.kind === 'voice' || m.action_payload?.audio_url ? (
                              <VoiceNotePlayer
                                audioUrl={m.action_payload?.audio_url || m.image_url || ''}
                                durationSeconds={m.action_payload?.duration}
                                isMine={isMine}
                              />
                            ) : (
                              <p className="whitespace-pre-wrap font-medium">{m.message}</p>
                            )}
                          </div>
                          <div
                            className={`flex items-center gap-1 text-[10px] text-muted-foreground px-1 ${
                              isMine ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMine && (
                              <CheckCheck
                                className={`h-3 w-3 ${m.is_read ? 'text-orange-600' : 'text-muted-foreground'}`}
                              />
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
                  onSendVoice={sendSupportVoiceNote}
                  disabled={isSendingChat || !adminUserId}
                />

                <Input
                  type="text"
                  placeholder="Type message to GGD Admin..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendSupportText()}
                  disabled={isSendingChat || !adminUserId}
                  className="h-10 text-xs rounded-xl bg-background border-border flex-1"
                />

                <Button
                  type="button"
                  disabled={!chatInput.trim() || isSendingChat || !adminUserId}
                  onClick={sendSupportText}
                  className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shrink-0 cursor-pointer"
                >
                  {isSendingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CONTACT CHANNELS & OFFICE ADDRESS */}
        <TabsContent value="channels" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone & WhatsApp Channel */}
            <Card className="border-border/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold">Phone & WhatsApp Support</CardTitle>
                    <CardDescription className="text-xs">Direct helpline for voice call or WhatsApp chat</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-semibold">Direct Phone Line</p>
                    <p className="text-base font-black text-foreground">{SUPPORT_PHONE}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(SUPPORT_PHONE, 'Phone number')}
                      className="h-8 text-xs rounded-lg"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={`tel:${SUPPORT_PHONE}`}>
                      <Button size="sm" className="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                        <PhoneCall className="h-3.5 w-3.5 mr-1" /> Call
                      </Button>
                    </a>
                  </div>
                </div>

                <Button
                  onClick={openWhatsAppSupport}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs gap-2 shadow-md shadow-emerald-600/20"
                >
                  <MessageCircle className="h-4 w-4" /> Open Official WhatsApp Support
                </Button>
              </CardContent>
            </Card>

            {/* Email Support Channel */}
            <Card className="border-border/80 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold">Official Email Desk</CardTitle>
                    <CardDescription className="text-xs">For enterprise, partnership & formal inquiries</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[11px] text-muted-foreground font-semibold">Support Email Address</p>
                    <p className="text-sm font-black text-foreground truncate">{SUPPORT_EMAIL}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(SUPPORT_EMAIL, 'Email address')}
                    className="h-8 text-xs rounded-lg shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <a href={`mailto:${SUPPORT_EMAIL}?subject=Support Inquiry - ${encodeURIComponent(userEmail)}`} className="block">
                  <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs gap-2 shadow-md shadow-blue-600/20">
                    <Mail className="h-4 w-4" /> Send Email via Mail Client
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Physical Office Address Card */}
          <Card className="border-border/80 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-extrabold">Physical Headquarters</CardTitle>
                  <CardDescription className="text-xs">Our office location in Lagos, Nigeria</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Good Gift Digital Headquarters</p>
                  <p className="text-sm font-extrabold text-foreground">{OFFICE_ADDRESS}</p>
                  <p className="text-xs text-muted-foreground">Operating Hours: Mon - Sat (8:00 AM - 6:00 PM WAT)</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(OFFICE_ADDRESS, 'Office address')}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto shrink-0 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Address
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SUBMIT IN-APP SUPPORT TICKET */}
        <TabsContent value="ticket" className="mt-0">
          <Card className="border-border/80 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Send className="h-4 w-4 text-orange-500" /> Submit an In-App Support Ticket
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-600">
                  Tracked In-App
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {ticketSent ? (
                <div className="py-8 text-center space-y-3">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="font-extrabold text-base text-foreground">Inquiry Submitted Successfully</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Thank you! Your ticket has been logged and sent directly to our support queue. You can track replies in the Direct Admin Chat tab above.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTicketSent(false)}
                      className="text-xs rounded-xl"
                    >
                      Submit Another Ticket
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveSubTab('chat')}
                      className="text-xs rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
                    >
                      Go to Live Chat
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendTicket} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Account Email</Label>
                      <Input value={userEmail} disabled className="mt-1 h-10 rounded-xl bg-muted/50 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Inquiry Category</Label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full mt-1 h-10 px-3 rounded-xl border border-input bg-background text-xs focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="Wallet & Credit Transfer">Wallet & Credit Transfer</option>
                        <option value="Banner Ad Approval & Performance">Banner Ad Approval & Performance</option>
                        <option value="Syndicate Campaign Submission">Syndicate Campaign Submission</option>
                        <option value="Business Listing & Storefront">Business Listing & Storefront</option>
                        <option value="Account Verification & Premium">Account Verification & Premium</option>
                        <option value="Other / Bug Report">Other / Bug Report</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Subject</Label>
                    <Input
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Brief summary of what you need help with"
                      className="mt-1 h-10 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Detailed Message</Label>
                    <Textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Please provide details, transaction IDs, or campaign names..."
                      rows={4}
                      className="mt-1 rounded-xl text-xs resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      disabled={submittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs shadow-md cursor-pointer"
                    >
                      {submittingTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: FREQUENTLY ASKED QUESTIONS */}
        <TabsContent value="faqs" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-orange-500" /> Knowledge Base & FAQs
            </h3>
            <span className="text-xs text-muted-foreground">{filteredFaqs.length} articles</span>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCat === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Accordion FAQ list */}
          <div className="space-y-2">
            {filteredFaqs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No matching questions found for &ldquo;{search}&rdquo;. Try another term or switch to Direct Admin Chat.
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <Card
                    key={faq.id}
                    className="border-border/70 overflow-hidden transition-all hover:border-border cursor-pointer"
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  >
                    <CardContent className="p-3.5 flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground pr-2">{faq.q}</p>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-orange-500 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </CardContent>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 pt-0 text-xs text-muted-foreground border-t border-border/40 leading-relaxed bg-muted/20">
                        <p className="pt-2.5 font-normal">{faq.a}</p>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportPage;
