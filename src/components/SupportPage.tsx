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
  Activity,
  ListOrdered,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceNoteRecorder } from "@/components/chat/VoiceNoteRecorder";
import VoiceNotePlayer from "@/components/chat/VoiceNotePlayer";
import { MessageStatusIndicator } from "@/components/chat/MessageStatusIndicator";
import { StructuredChatMessage } from "@/components/chat/StructuredChatMessage";
import { playMessageSentSound, playMessageReceivedSound } from "@/utils/audio";
import { sendQuickMessageNotification } from "@/services/pushNotificationService";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

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
  kind?: 'text' | 'voice' | 'system' | 'ticket' | string;
  message: string | null;
  image_url?: string | null;
  action_type?: string | null;
  action_payload?: any;
  is_read: boolean;
  created_at: string;
}

export interface SupportTicketTrackerItem {
  id: string;
  ticketId: string;
  category: string;
  subject: string;
  preview: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  createdAt: string;
  lastUpdated: string;
  msgCount: number;
}

interface FAQItem {
  id: string;
  category: 'whatsapp' | 'wallet' | 'ads' | 'syndicate' | 'store' | 'security';
  q: string;
  a: string;
  requiredFeature?: string;
}

// Master FAQ Repository
const ALL_FAQS: FAQItem[] = [
  // WHATSAPP POSITIONING FAQS (PRIMARY FOCUS)
  {
    id: 'f-wa-1',
    category: 'whatsapp',
    q: "How does GGD WhatsApp Status Advertising work?",
    a: "GGD connects your business directly with verified Nigerian promoters who post your campaign flyer on their active WhatsApp Statuses. You pay only for actual views verified by proof screenshots.",
    requiredFeature: 'syndicate_core',
  },
  {
    id: 'f-wa-2',
    category: 'whatsapp',
    q: "How do promoters submit proof screenshots and earn payouts?",
    a: "Promoters share campaign flyers on WhatsApp Status, wait 24 hours to capture view counts, and upload proof screenshots in their Syndicate Portal. Once verified by GGD, payouts are credited immediately to their GGD wallet.",
    requiredFeature: 'syndicate_core',
  },
  {
    id: 'f-wa-3',
    category: 'whatsapp',
    q: "Can I choose target states (e.g., Lagos, Abuja, Rivers) for WhatsApp campaigns?",
    a: "Yes! During campaign creation, you can select specific Nigerian states so your WhatsApp Status flyers reach prospective buyers in your preferred target location.",
    requiredFeature: 'syndicate_core',
  },
  {
    id: 'f-wa-4',
    category: 'whatsapp',
    q: "Is there a minimum budget for launching a WhatsApp Status campaign?",
    a: "No! You can set flexible campaign budgets tailored to the exact number of verified WhatsApp views you want for your business.",
    requiredFeature: 'syndicate_core',
  },

  // WALLET & CREDITS
  {
    id: 'f-wall-1',
    category: 'wallet',
    q: "How do credit transfers work and are they instant?",
    a: "Credit transfers to other verified GGD members are processed instantly with zero platform fees. Simply specify the recipient username or email and confirm.",
    requiredFeature: 'nav_wallet',
  },
  {
    id: 'f-wall-2',
    category: 'wallet',
    q: "How do I fund my wallet with GGD credits or Cash balance?",
    a: "Navigate to Wallet Hub and select 'Fund Credits'. You can purchase packages using Paystack (Card, Bank Transfer, USSD) or direct bank transfer.",
    requiredFeature: 'nav_wallet',
  },

  // BANNER ADS
  {
    id: 'f-ads-1',
    category: 'ads',
    q: "How are my Banner Ads served across the network?",
    a: "Banner Ads are displayed across GGD member feeds, public directory pages, and publisher partner websites with live click and impression analytics.",
    requiredFeature: 'banner_ads',
  },

  // SYNDICATE
  {
    id: 'f-syn-1',
    category: 'syndicate',
    q: "How do I join as a Syndicate Promoter and start earning?",
    a: "Register directly via the Syndicate Portal or landing page. Once approved, browse available tasks, share campaign flyers, and submit view proofs to earn.",
    requiredFeature: 'syndicate_portal',
  },

  // STOREFRONT
  {
    id: 'f-store-1',
    category: 'store',
    q: "How do prospective customers discover my Business Storefront?",
    a: "Your store profile is published to the GGD Business Directory. Customers can inspect your catalog and contact you directly on WhatsApp with one tap.",
    requiredFeature: 'storefronts',
  },

  // SECURITY & VERIFICATION
  {
    id: 'f-sec-1',
    category: 'security',
    q: "How do I verify my account or upgrade to VIP / Premium?",
    a: "Request Premium verification via the VIP Membership tab or direct WhatsApp support line to unlock higher transaction limits and priority indexing.",
    requiredFeature: 'premium_vip_upgrade',
  },
];

const SupportPage: React.FC<SupportPageProps> = ({ userEmail, onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'chat' | 'channels' | 'ticket' | 'faqs'>('tracker');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<string | null>('f-wa-1');
  const [whatsappPositioning, setWhatsappPositioning] = useState<boolean>(false);

  // User & Admin Chat States
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [allAdminIds, setAllAdminIds] = useState<string[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Initialize Support System & Admin lookup
  useEffect(() => {
    initSupportSystem();
  }, []);

  const initSupportSystem = async () => {
    setLoadingChat(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingChat(false);
        return;
      }
      setCurrentUserId(user.id);

      // Collect ALL Admin User IDs
      const adminIdsSet = new Set<string>();

      // 1. Query user_roles table for role='admin'
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles) {
        adminRoles.forEach((r) => r.user_id && adminIdsSet.add(r.user_id));
      }

      // 2. Query known admin profiles by email
      const knownAdminEmails = [
        'goodgiftdigital@gmail.com',
        'accessa787@gmail.com',
        'bethelincovibetv@gmail.com',
      ];
      const { data: knownAdminProfs } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, avatar_url, business_name')
        .in('email', knownAdminEmails);

      let foundAdminProf: any = null;
      if (knownAdminProfs) {
        knownAdminProfs.forEach((p) => {
          if (p.user_id) adminIdsSet.add(p.user_id);
          if (!foundAdminProf) foundAdminProf = p;
        });
      }

      const adminIdsArray = Array.from(adminIdsSet);
      setAllAdminIds(adminIdsArray);

      let primaryAdminId: string | null = adminIdsArray[0] || null;

      if (!foundAdminProf && primaryAdminId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, avatar_url, business_name')
          .eq('user_id', primaryAdminId)
          .maybeSingle();
        if (prof) foundAdminProf = prof;
      }

      if (primaryAdminId) {
        setAdminUserId(primaryAdminId);
        setAdminProfile(foundAdminProf || {
          display_name: 'GGD Support Desk Admin',
          email: SUPPORT_EMAIL,
        });
        await loadSupportMessagesAndTickets(user.id, adminIdsArray, primaryAdminId);
      }
    } catch (err) {
      console.warn('Error initializing support system:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const loadSupportMessagesAndTickets = async (uid: string, adminIds: string[], primaryAdminId: string) => {
    try {
      if (!adminIds.length) return;

      const adminFilterStr = adminIds.map((id) => `'${id}'`).join(',');

      // 1. Fetch p2p_messages for any admin
      const { data: p2pData } = await supabase
        .from('p2p_messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.in.(${adminFilterStr})),and(sender_id.in.(${adminFilterStr}),receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true });

      // 2. Fetch admin_chat_messages for any admin
      const { data: legacyData } = await supabase
        .from('admin_chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.in.(${adminFilterStr})),and(sender_id.in.(${adminFilterStr}),receiver_id.eq.${uid})`)
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

      // Derive Tickets & Statuses
      deriveTicketsFromMessages(list, uid, adminIds);

      // Mark unread messages from any admin as read
      await Promise.all([
        supabase
          .from('p2p_messages')
          .update({ is_read: true })
          .in('sender_id', adminIds)
          .eq('receiver_id', uid)
          .eq('is_read', false),
        supabase
          .from('admin_chat_messages')
          .update({ is_read: true })
          .in('sender_id', adminIds)
          .eq('receiver_id', uid)
          .eq('is_read', false),
      ]);
    } catch (err) {
      console.warn('Error loading support messages & tickets:', err);
    }
  };

  const deriveTicketsFromMessages = (msgs: SupportMsg[], uid: string, adminIds: string[]) => {
    if (msgs.length === 0) {
      setTickets([]);
      return;
    }

    // Group or extract tickets/threads
    const userSentMsgs = msgs.filter((m) => m.sender_id === uid);
    const adminRepliedMsgs = msgs.filter((m) => adminIds.includes(m.sender_id));

    // Look for explicit status updates from admin
    const statusUpdateMsgs = msgs.filter((m) => m.action_type === 'ticket_status_update' && m.action_payload?.status);
    const latestExplicitStatus = statusUpdateMsgs.length > 0 ? statusUpdateMsgs[statusUpdateMsgs.length - 1].action_payload.status : null;

    // Build overall ticket summary items
    const ticketList: SupportTicketTrackerItem[] = [];

    // Main Support Inquiry Ticket Thread
    const firstMsg = userSentMsgs[0] || msgs[0];
    const lastMsg = msgs[msgs.length - 1];

    let currentStatus: 'Pending' | 'In Progress' | 'Resolved' = 'Pending';

    if (latestExplicitStatus) {
      currentStatus = latestExplicitStatus as any;
    } else if (adminRepliedMsgs.length > 0) {
      currentStatus = 'In Progress';
    } else {
      currentStatus = 'Pending';
    }

    // Check if user or admin sent a resolution text
    if (msgs.some((m) => m.message?.toLowerCase().includes('resolved') || m.message?.toLowerCase().includes('ticket marked as resolved'))) {
      if (!latestExplicitStatus || latestExplicitStatus === 'Resolved') {
        currentStatus = 'Resolved';
      }
    }

    const ticketIdNum = String(Math.abs(firstMsg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))).slice(0, 4);

    ticketList.push({
      id: firstMsg.id,
      ticketId: `SUP-${ticketIdNum || '1048'}`,
      category: firstMsg.action_payload?.category || 'Direct Admin Support',
      subject: firstMsg.action_payload?.subject || (firstMsg.message ? firstMsg.message.slice(0, 40) + '...' : 'In-App Support Inquiry'),
      preview: lastMsg.message || 'Support inquiry submitted',
      status: currentStatus,
      createdAt: firstMsg.created_at,
      lastUpdated: lastMsg.created_at,
      msgCount: msgs.length,
    });

    setTickets(ticketList);
  };

  // Realtime subscription for incoming support messages & status changes across all admins
  useEffect(() => {
    if (!currentUserId || !allAdminIds.length) return;

    const channel = supabase
      .channel(`user-support-chat-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'p2p_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const m = payload.new as any;
            const isUserSender = m.sender_id === currentUserId;
            const isAdminSender = allAdminIds.includes(m.sender_id);
            const isUserReceiver = m.receiver_id === currentUserId;
            const isAdminReceiver = allAdminIds.includes(m.receiver_id);

            if ((isUserSender && isAdminReceiver) || (isAdminSender && isUserReceiver)) {
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
                const idx = prev.findIndex((x) => x.id === formatted.id);
                if (idx !== -1) {
                  const copy = [...prev];
                  copy[idx] = formatted;
                  deriveTicketsFromMessages(copy, currentUserId, allAdminIds);
                  return copy;
                }
                const updated = [...prev, formatted];
                deriveTicketsFromMessages(updated, currentUserId, allAdminIds);
                return updated;
              });

              if (isAdminSender && payload.eventType === 'INSERT') {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, allAdminIds]);

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

    const nextList = [...chatMessages, optimisticMsg];
    setChatMessages(nextList);
    deriveTicketsFromMessages(nextList, currentUserId, adminUserId);
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
        setChatMessages((prev) => {
          const list = prev.map((m) => (m.id === tmpId ? (inserted as any) : m));
          deriveTicketsFromMessages(list, currentUserId, adminUserId);
          return list;
        });
      }

      // 2. Also insert into admin_chat_messages
      try {
        await supabase.from('admin_chat_messages').insert({
          sender_id: currentUserId,
          receiver_id: adminUserId,
          message: text,
          is_read: false,
        });
      } catch {}

      // 3. Notify Admin
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

    const nextList = [...chatMessages, optimisticMsg];
    setChatMessages(nextList);
    deriveTicketsFromMessages(nextList, currentUserId, adminUserId);
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
        setChatMessages((prev) => {
          const list = prev.map((m) => (m.id === tmpId ? (inserted as any) : m));
          deriveTicketsFromMessages(list, currentUserId, adminUserId);
          return list;
        });
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
        const ticketBody = `[SUPPORT TICKET - ${ticketCategory.toUpperCase()}]\nSubject: ${ticketSubject}\n\n${ticketMessage}`;

        await supabase.from('p2p_messages').insert({
          sender_id: uid,
          receiver_id: adminUserId,
          kind: 'ticket',
          message: ticketBody,
          action_type: 'support_ticket',
          action_payload: {
            category: ticketCategory,
            subject: ticketSubject,
            status: 'Pending',
          },
          is_read: false,
        });

        await supabase.from('notifications').insert({
          user_id: uid,
          title: `Support Ticket: ${ticketSubject}`,
          message: `Your ticket (${ticketCategory}) has been logged as Pending. Admin will review shortly.`,
          type: 'system',
        });
      }

      setTicketSent(true);
      toast.success('Support ticket submitted successfully!');
      setTicketSubject('');
      setTicketMessage('');
      setActiveSubTab('tracker');
    } catch {
      toast.error('Could not submit ticket. Please contact us on WhatsApp.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const markTicketResolvedLocally = async (ticketId: string) => {
    if (!currentUserId || !adminUserId) return;
    try {
      await supabase.from('p2p_messages').insert({
        sender_id: currentUserId,
        receiver_id: adminUserId,
        kind: 'system',
        message: '✅ Support ticket marked as Resolved by user.',
        action_type: 'ticket_status_update',
        action_payload: { status: 'Resolved' },
      });
      toast.success('Ticket status marked as Resolved!');
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: 'Resolved' } : t)));
    } catch {
      toast.error('Error updating ticket status');
    }
  };

  const openWhatsAppSupport = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = `Hello GGD Support! I need assistance with my account.\n\nAccount Email: ${userEmail || 'Member'}\nTime: ${time}\nTopic: WhatsApp Campaign Support`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // DYNAMICALLY FILTER FAQS BASED ON ACTIVE FEATURE TOGGLES AND WHATSAPP POSITIONING
  const activeFaqs = ALL_FAQS.filter((f) => {
    // Feature gating check
    if (f.requiredFeature && !isEnabled(f.requiredFeature)) {
      return false;
    }
    return true;
  });

  // Re-sort FAQs: If WhatsApp Positioning is ON, put WhatsApp category FIRST!
  const sortedFaqs = [...activeFaqs].sort((a, b) => {
    if (whatsappPositioning) {
      if (a.category === 'whatsapp' && b.category !== 'whatsapp') return -1;
      if (a.category !== 'whatsapp' && b.category === 'whatsapp') return 1;
    }
    return 0;
  });

  const filteredFaqs = sortedFaqs.filter((f) => {
    const matchesCat = selectedCat === 'all' || f.category === selectedCat;
    const matchesSearch =
      !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredTickets = tickets.filter((t) => statusFilter === 'all' || t.status === statusFilter);

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
              Track support request statuses (Pending, In Progress, Resolved), chat live with GGD Admin, or reach us on WhatsApp.
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
            placeholder="Search FAQs, WhatsApp Status ads, credit transfers, syndicate guides..."
            className="pl-10 h-12 rounded-2xl bg-white text-foreground placeholder:text-muted-foreground shadow-lg border-0 text-sm focus-visible:ring-2 focus-visible:ring-orange-400"
          />
        </div>
      </div>

      {/* Primary Contact Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Support Ticket Status Tracker Card */}
        <Card
          onClick={() => setActiveSubTab('tracker')}
          className={`cursor-pointer transition-all border-2 ${
            activeSubTab === 'tracker'
              ? 'border-orange-500 bg-orange-500/5 shadow-md'
              : 'border-border/70 hover:border-orange-500/50 bg-card'
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <Activity className="h-5 w-5" />
              </div>
              <Badge className="bg-orange-500 text-white text-[10px] font-bold">
                {tickets.length} Tracked
              </Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Status Tracker</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Pending, In Progress & Resolved status</p>
            </div>
          </CardContent>
        </Card>

        {/* Direct Admin Live Chat */}
        <Card
          onClick={() => setActiveSubTab('chat')}
          className={`cursor-pointer transition-all border-2 ${
            activeSubTab === 'chat'
              ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
              : 'border-border/70 hover:border-emerald-500/50 bg-card'
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
                <MessageCircle className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Live Chat</Badge>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Direct Admin Chat</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Real-time chat & voice notes</p>
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
              <h4 className="font-bold text-sm text-foreground">WhatsApp Support</h4>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{SUPPORT_PHONE}</p>
            </div>
          </CardContent>
        </Card>

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
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-12 p-1 bg-muted/70 rounded-2xl border">
          <TabsTrigger value="tracker" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4 text-orange-500" /> Status Tracker
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MessageCircle className="h-4 w-4 text-emerald-500" /> Direct Admin Chat
          </TabsTrigger>
          <TabsTrigger value="channels" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Phone className="h-4 w-4 text-blue-500" /> Channels & Address
          </TabsTrigger>
          <TabsTrigger value="ticket" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Send className="h-4 w-4 text-purple-500" /> Submit Ticket
          </TabsTrigger>
          <TabsTrigger value="faqs" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <HelpCircle className="h-4 w-4 text-pink-500" /> FAQs & Knowledge
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SUPPORT TICKET STATUS TRACKER */}
        <TabsContent value="tracker" className="space-y-4 mt-0">
          <Card className="border-border/80 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/40 border-b border-border/60 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Support Messages Status Tracker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live status tracking (Pending, In Progress, Resolved) for all support inquiries sent to GGD Admin.
                  </CardDescription>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center bg-background p-1 rounded-xl border shrink-0">
                  {(['all', 'Pending', 'In Progress', 'Resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {filteredTickets.length === 0 ? (
                <div className="py-12 text-center space-y-3 max-w-sm mx-auto">
                  <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 mx-auto flex items-center justify-center">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">No Support Tickets Found</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You haven't submitted any support inquiries yet. Send a direct message or submit a ticket below to track its live status.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setActiveSubTab('chat')}
                      className="text-xs rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
                    >
                      Open Direct Admin Chat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveSubTab('ticket')}
                      className="text-xs rounded-xl"
                    >
                      Submit Ticket
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((t) => {
                    const isPending = t.status === 'Pending';
                    const isInProgress = t.status === 'In Progress';
                    const isResolved = t.status === 'Resolved';

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl border border-border/80 bg-card hover:border-orange-500/40 transition-all space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs font-bold border-orange-500/30 text-orange-600 bg-orange-500/5">
                              {t.ticketId}
                            </Badge>
                            <span className="font-extrabold text-xs text-foreground">{t.category}</span>
                          </div>

                          {/* Dynamic Status Badge */}
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-1 gap-1.5 animate-pulse">
                                <Clock className="h-3.5 w-3.5" /> Pending Review
                              </Badge>
                            )}
                            {isInProgress && (
                              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-bold px-2.5 py-1 gap-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Admin In Progress
                              </Badge>
                            )}
                            {isResolved && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Resolved
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-foreground">{t.subject}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.preview}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                          <span>Submitted: {new Date(t.createdAt).toLocaleString()}</span>

                          <div className="flex items-center gap-2">
                            {t.status !== 'Resolved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markTicketResolvedLocally(t.id)}
                                className="h-8 text-[11px] font-bold rounded-xl border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                              </Button>
                            )}

                            <Button
                              size="sm"
                              onClick={() => setActiveSubTab('chat')}
                              className="h-8 text-[11px] font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" /> View in Support Chat
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DIRECT ADMIN SUPPORT CHAT (100% WORKING REAL CHAT) */}
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
                    <h4 className="font-bold text-sm text-foreground">Welcome to Direct Admin Support Chat</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Type a message or send a voice note below to chat live with GGD Administrators. Every message updates in real time.
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
                              <StructuredChatMessage text={m.message} isMine={isMine} />
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
                              <MessageStatusIndicator
                                status={m.id?.toString().startsWith('tmp-') ? 'sending' : m.is_read ? 'seen' : 'sent'}
                                showTimestamp={false}
                                size="xs"
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

        {/* TAB 3: CONTACT CHANNELS & OFFICE ADDRESS */}
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
                      className="h-8 text-xs rounded-lg cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={`tel:${SUPPORT_PHONE}`}>
                      <Button size="sm" className="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                        <PhoneCall className="h-3.5 w-3.5 mr-1" /> Call
                      </Button>
                    </a>
                  </div>
                </div>

                <Button
                  onClick={openWhatsAppSupport}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
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
                    className="h-8 text-xs rounded-lg shrink-0 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <a href={`mailto:${SUPPORT_EMAIL}?subject=Support Inquiry - ${encodeURIComponent(userEmail)}`} className="block">
                  <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs gap-2 shadow-md shadow-blue-600/20 cursor-pointer">
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
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto shrink-0 border-orange-500/30 text-orange-600 hover:bg-orange-500/10 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Address
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SUBMIT IN-APP SUPPORT TICKET */}
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
                    Thank you! Your ticket has been logged and sent to Admin. You can track status (Pending, In Progress, Resolved) in the Status Tracker tab.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTicketSent(false)}
                      className="text-xs rounded-xl cursor-pointer"
                    >
                      Submit Another Ticket
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveSubTab('tracker')}
                      className="text-xs rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold cursor-pointer"
                    >
                      Open Status Tracker
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
                        <option value="WhatsApp Status Campaign">WhatsApp Status Campaign</option>
                        <option value="Syndicate Promoter Payouts">Syndicate Promoter Payouts</option>
                        <option value="Wallet & Credit Transfer">Wallet & Credit Transfer</option>
                        <option value="Banner Ad Approval & Performance">Banner Ad Approval & Performance</option>
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

        {/* TAB 5: FREQUENTLY ASKED QUESTIONS (WHATSAPP-FOCUSED & FEATURE-GATED) */}
        <TabsContent value="faqs" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-orange-500" /> Knowledge Base & FAQs
              {whatsappPositioning && (
                <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-black">
                  WhatsApp Status Focused
                </Badge>
              )}
            </h3>
            <span className="text-xs text-muted-foreground">{filteredFaqs.length} active articles</span>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Active Topics', icon: HelpCircle },
              { id: 'whatsapp', label: 'WhatsApp Status Ads', icon: MessageCircle },
              ...(isEnabled('nav_wallet') ? [{ id: 'wallet', label: 'Credits & Wallet', icon: Coins }] : []),
              ...(isEnabled('banner_ads') ? [{ id: 'ads', label: 'Banner Ads', icon: Megaphone }] : []),
              ...(isEnabled('syndicate_portal') ? [{ id: 'syndicate', label: 'Syndicate', icon: Share2 }] : []),
              ...(isEnabled('storefronts') ? [{ id: 'store', label: 'Storefront', icon: Store }] : []),
              ...(isEnabled('premium_vip_upgrade') ? [{ id: 'security', label: 'Security & Verification', icon: Lock }] : []),
            ].map((cat) => {
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
                No matching questions found for &ldquo;{search}&rdquo;. Switch to Direct Admin Chat to send an inquiry.
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <Card
                    key={faq.id}
                    className={`border-border/70 overflow-hidden transition-all hover:border-border cursor-pointer ${
                      faq.category === 'whatsapp' ? 'border-l-4 border-l-emerald-500' : ''
                    }`}
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  >
                    <CardContent className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {faq.category === 'whatsapp' && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[9px] font-black">
                            WhatsApp
                          </Badge>
                        )}
                        <p className="text-xs font-bold text-foreground pr-2">{faq.q}</p>
                      </div>
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
