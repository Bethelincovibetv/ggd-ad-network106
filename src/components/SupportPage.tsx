import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = '2348131107416';
const SUPPORT_EMAIL = 'support@ggdadnetwork.com';

interface SupportPageProps {
  userEmail: string;
  onNavigate?: (tab: string) => void;
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
    q: "How do I fund my wallet with GGG credits?",
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
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [openFaq, setOpenFaq] = useState<string | null>('f1');

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState('General Inquiry');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  const filteredFaqs = FAQS.filter(f => {
    const matchesCat = selectedCat === 'all' || f.category === selectedCat;
    const matchesSearch = !search ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

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

      // Submit ticket inquiry
      if (uid) {
        await supabase.from('notifications').insert({
          user_id: uid,
          title: `Support Ticket: ${ticketSubject}`,
          message: `Your inquiry has been received by our support team. Reference: ${ticketCategory}`,
          type: 'system',
        });
      }

      setTicketSent(true);
      toast.success('Support inquiry submitted! We will respond promptly.');
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
    const text = `Hello GGD Support! I need assistance with my account.\n\nAccount: ${userEmail || 'Member'}\nTime: ${time}\nTopic: ${ticketCategory || 'General Assistance'}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-5 pb-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-5 text-white relative overflow-hidden shadow-xl shadow-orange-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                Official Support & Help Center
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1">How can we help you today?</h2>
            <p className="text-xs opacity-90 mt-1">
              Find instant answers, chat live with a support specialist, or browse the complete platform manual.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-2xl text-xs font-semibold self-start sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>All Systems Operational</span>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="mt-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs, credit transfers, ads, syndicate guides..."
            className="pl-10 h-12 rounded-2xl bg-white text-foreground placeholder:text-muted-foreground shadow-lg border-0 text-sm focus-visible:ring-2 focus-visible:ring-orange-400"
          />
        </div>
      </div>

      {/* Direct Contact Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* WhatsApp Channel */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">WhatsApp Live Desk</h4>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Avg reply &lt; 5 mins
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct live chat with our operations desk for immediate transfer or account resolution.
            </p>
            <Button
              onClick={openWhatsAppSupport}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </Button>
          </CardContent>
        </Card>

        {/* Email Support */}
        <Card className="border-border/70 hover:border-orange-500/50 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Official Email Desk</h4>
                <p className="text-[11px] text-muted-foreground">Enterprise inquiries</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Send formal business proposals, bug reports, and partnership inquiries to our team.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Support Inquiry - ${encodeURIComponent(userEmail)}`}
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-bold gap-1.5"
              >
                <Mail className="h-4 w-4 text-orange-600" /> {SUPPORT_EMAIL}
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Unified GGD User Guide Link */}
        <Card className="border-border/70 hover:border-blue-500/50 transition-all shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Unified GGD Guide</h4>
                <p className="text-[11px] text-muted-foreground">Step-by-step walkthroughs</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Read comprehensive documentation covering advertising, credit transfers, and syndicate roles.
            </p>
            <Button
              variant="secondary"
              onClick={() => onNavigate?.('guide')}
              className="w-full h-10 rounded-xl text-xs font-bold gap-1.5"
            >
              <BookOpen className="h-4 w-4 text-blue-600" /> Open Full Manual
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Support Ticket Submission Section */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 bg-muted/30 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="h-4 w-4 text-orange-500" /> Submit an In-App Support Ticket
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Response within 24h
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {ticketSent ? (
            <div className="py-6 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h4 className="font-bold text-base text-foreground">Inquiry Received</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Thank you! Our support team has logged your inquiry. You will also receive an update in your notification feed.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTicketSent(false)}
                className="mt-2 text-xs rounded-xl"
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendTicket} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  placeholder="Please provide details, relevant transaction IDs, or ad names..."
                  rows={3}
                  className="mt-1 rounded-xl text-xs resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={submittingTicket || !ticketSubject.trim() || !ticketMessage.trim()}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs"
                >
                  {submittingTicket ? 'Submitting...' : 'Submit Inquiry'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Frequently Asked Questions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
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
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
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
              No matching questions found for &ldquo;{search}&rdquo;. Try another term or contact WhatsApp support directly.
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
                      <ChevronUp className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </CardContent>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-0 text-xs text-muted-foreground border-t border-border/40 leading-relaxed bg-muted/20">
                      <p className="pt-2.5">{faq.a}</p>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
