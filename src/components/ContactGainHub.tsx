import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Users, Download, UserPlus, Sparkles, CheckCircle2, ShieldCheck, 
  Phone, MessageSquare, ExternalLink, Gift, FileSpreadsheet, Upload,
  Search, Filter, MapPin, Briefcase, Plus, AlertCircle, Clock, Eye,
  ArrowRight, Smartphone, Share2, Check, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchCompiledContacts, 
  downloadDailyVCFFile, 
  downloadDailyCSVFile, 
  getActiveContactCampaigns,
  createContactCampaign,
  submitContactProof,
  getLocalProofs,
  getContactGainSettings,
  ContactEntry,
  ContactCampaign,
  ContactProofSubmission,
  ContactGainSettings,
  sanitizePhoneNumber
} from "@/services/contactGainService";
import { NIGERIAN_STATES, TOP_COMMERCIAL_STATES } from "@/utils/nigerianStates";
import { playMoneyTransferSound, playNotificationChime } from "@/utils/audio";

interface ContactGainHubProps {
  userId?: string;
  userEmail?: string;
  onNavigateTab?: (tab: string) => void;
}

export const ContactGainHub: React.FC<ContactGainHubProps> = ({
  userId: propUserId,
  userEmail: propUserEmail,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'tasks' | 'create' | 'proofs'>('daily');
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [campaigns, setCampaigns] = useState<ContactCampaign[]>([]);
  const [myProofs, setMyProofs] = useState<ContactProofSubmission[]>([]);
  const [settings, setSettings] = useState<ContactGainSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  // Proof Submission Modal
  const [submittingProofFor, setSubmittingProofFor] = useState<ContactCampaign | null>(null);
  const [proofImage, setProofImage] = useState<string>('');
  const [proofPhone, setProofPhone] = useState<string>('');
  const [submittingProof, setSubmittingProof] = useState(false);

  // Create Campaign Form
  const [newTitle, setNewTitle] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactWhatsapp, setNewContactWhatsapp] = useState('');
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newState, setNewState] = useState('Lagos');
  const [newIndustry, setNewIndustry] = useState('Technology & Marketing');
  const [newRewardPerSave, setNewRewardPerSave] = useState('15');
  const [newTotalTarget, setNewTotalTarget] = useState('50');
  const [newDescription, setNewDescription] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedSettings, fetchedContacts, fetchedCampaigns] = await Promise.all([
        getContactGainSettings(),
        fetchCompiledContacts(),
        getActiveContactCampaigns(),
      ]);

      setSettings(fetchedSettings);
      setContacts(fetchedContacts);
      setCampaigns(fetchedCampaigns);

      // User authentication check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ id: user.id, email: user.email });
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits, display_name, phone_number, business_name, state, industry')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setUserCredits(profile.credits || 0);
          if (!newContactName) setNewContactName(profile.display_name || '');
          if (!newContactPhone) setNewContactPhone(profile.phone_number || '');
          if (!newBusinessName) setNewBusinessName(profile.business_name || '');
          if (profile.state) setNewState(profile.state);
        }

        const allProofs = getLocalProofs();
        setMyProofs(allProofs.filter(p => p.user_id === user.id));
      } else {
        const allProofs = getLocalProofs();
        setMyProofs(allProofs);
      }
    } catch (err) {
      console.error('Error loading contact gain hub:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime channel for live campaigns
    const channel = supabase
      .channel('contact-gain-live-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_campaigns' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propUserId]);

  const handleDownloadVCF = async () => {
    setDownloading(true);
    try {
      const res = await downloadDailyVCFFile(currentUser?.id, (awarded) => {
        setUserCredits(prev => prev + awarded);
      });

      if (res.creditsAwarded > 0) {
        toast.success(`🎉 Contacts downloaded! You earned +${res.creditsAwarded} Daily Reward Credits!`);
      } else {
        toast.success(`✅ Downloaded ${res.count} verified Nigerian business contacts in .VCF format!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to download contacts");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await downloadDailyCSVFile();
      toast.success(`✅ Exported ${res.count} contacts in .CSV format.`);
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please sign in to create a Save My Contact campaign.");
      return;
    }
    if (!newTitle.trim() || !newContactName.trim() || !newContactPhone.trim()) {
      toast.error("Please fill in contact name, phone number, and campaign title.");
      return;
    }

    const reward = parseInt(newRewardPerSave, 10) || 15;
    const target = parseInt(newTotalTarget, 10) || 50;
    const totalCost = reward * target;

    if (userCredits < totalCost) {
      toast.error(`Insufficient credits! This campaign requires ${totalCost} credits, but you have ${userCredits} credits.`);
      return;
    }

    setCreatingCampaign(true);
    try {
      const res = await createContactCampaign({
        userId: currentUser.id,
        userEmail: currentUser.email,
        title: newTitle.trim(),
        contactName: newContactName.trim(),
        contactPhone: newContactPhone.trim(),
        contactWhatsapp: newContactWhatsapp.trim() || newContactPhone.trim(),
        businessName: newBusinessName.trim() || undefined,
        state: newState,
        industry: newIndustry,
        rewardPerSave: reward,
        totalTarget: target,
        description: newDescription.trim() || undefined,
      });

      if (res.success && res.campaign) {
        setUserCredits(prev => prev - totalCost);
        setCampaigns(prev => [res.campaign!, ...prev]);
        toast.success("🚀 Your 'Save My Contact' Campaign is now live across GGD Ad Network!");
        playMoneyTransferSound();
        setActiveTab('tasks');
        setNewTitle('');
      } else {
        toast.error(res.error || "Failed to launch campaign.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error creating campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingProofFor) return;
    if (!currentUser) {
      toast.error("Please sign in to submit task proof.");
      return;
    }
    if (!proofImage.trim()) {
      toast.error("Please provide your screenshot proof URL or upload.");
      return;
    }

    setSubmittingProof(true);
    try {
      const res = await submitContactProof({
        campaignId: submittingProofFor.id,
        campaignTitle: submittingProofFor.title,
        userId: currentUser.id,
        userName: currentUser.email?.split('@')[0] || 'Member',
        userPhone: proofPhone || undefined,
        screenshotUrl: proofImage,
        rewardCredits: submittingProofFor.reward_per_save,
      });

      if (res.success && res.proof) {
        setMyProofs(prev => [res.proof!, ...prev]);
        toast.success(`🎉 Proof submitted successfully! Your +${submittingProofFor.reward_per_save} credits will be approved shortly.`);
        playNotificationChime();
        setSubmittingProofFor(null);
        setProofImage('');
      } else {
        toast.error(res.error || "Failed to submit proof");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error submitting proof");
    } finally {
      setSubmittingProof(false);
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.business_name && c.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery);
    const matchesState = selectedState === 'all' || c.state.toLowerCase() === selectedState.toLowerCase();
    const matchesIndustry = selectedIndustry === 'all' || c.industry.toLowerCase().includes(selectedIndustry.toLowerCase());
    return matchesSearch && matchesState && matchesIndustry;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 via-gray-900 to-orange-950 border-2 border-orange-500/50 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-black">
              <Sparkles className="h-3.5 w-3.5" /> GGD DAILY CONTACT GAIN SYSTEM
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Grow Your Phonebook & Earn Credits
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Every day, new and verified Nigerian business owners and creators are compiled into instant 1-tap contact files. Download today's contacts to boost your WhatsApp status views and customer reach!
            </p>

            <div className="flex items-center gap-4 pt-2 text-xs text-neutral-300 flex-wrap">
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Users className="h-4 w-4" /> {contacts.length} Active Contacts Today
              </span>
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <Gift className="h-4 w-4" /> +{settings?.daily_download_reward || 50} Daily Download Reward
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Button
              onClick={handleDownloadVCF}
              disabled={downloading}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-orange-500/30 gap-2 flex-1 sm:flex-initial"
            >
              {downloading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="h-4 w-4 stroke-[2.5]" />
              )}
              Download Today's Contacts (.VCF)
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadCSV}
              className="h-12 px-4 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border-neutral-700 text-xs font-bold gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-13 p-1.5 bg-card border border-border/80 rounded-2xl shadow-sm">
          <TabsTrigger value="daily" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Users className="h-4 w-4" /> <span className="hidden sm:inline">Daily</span> Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <UserPlus className="h-4 w-4" /> Save & Earn ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="create" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Plus className="h-4 w-4" /> Promote Contact
          </TabsTrigger>
          <TabsTrigger value="proofs" className="rounded-xl text-xs sm:text-sm font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <CheckCircle2 className="h-4 w-4" /> My Proofs ({myProofs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DAILY CONTACT LIST */}
        <TabsContent value="daily" className="space-y-4 mt-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by merchant name, business or phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="h-11 rounded-xl w-[160px] text-xs font-semibold">
                    <MapPin className="h-3.5 w-3.5 mr-1 text-orange-500" />
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Nigeria</SelectItem>
                    {NIGERIAN_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="h-11 px-3 rounded-xl border-border"
                  title="Refresh Contacts"
                >
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Step-by-Step Info Box */}
            <div className="p-3.5 rounded-xl bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 flex items-start gap-3 text-xs">
              <Smartphone className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-orange-900 dark:text-orange-300 font-bold block mb-0.5">
                  How to Save All Contacts in 1 Tap:
                </strong>
                <span className="text-muted-foreground leading-relaxed">
                  Click the <strong>Download Contacts (.VCF)</strong> button. When prompted, open with your phone's <strong>Contacts / Phonebook App</strong> and select <strong>Import All</strong>. All contacts will be automatically labeled with GGD and their State!
                </span>
              </div>
            </div>
          </div>

          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredContacts.map(c => (
              <Card key={c.id} className="border border-border/80 hover:border-orange-500/50 transition-all shadow-sm rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground leading-tight">
                        {c.business_name || c.name}
                      </h4>
                      {c.business_name && c.name && (
                        <p className="text-xs text-muted-foreground">{c.name}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-orange-600 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40">
                      {c.state || 'Lagos'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{c.industry || 'Commerce'}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {c.phone}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${c.phone.replace(/[^\d]/g, '')}?text=Hello%20${encodeURIComponent(c.name)}%2C%20I%20found%20your%20contact%20on%20GGD%20Ad%20Network!`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 text-xs font-bold transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" /> WhatsApp
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: SAVE MY CONTACT TASKS */}
        <TabsContent value="tasks" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(camp => {
              const progressPct = Math.min(100, Math.round((camp.completed_saves / (camp.total_target || 1)) * 100));
              return (
                <Card key={camp.id} className="border-2 border-orange-500/20 hover:border-orange-500/60 rounded-3xl p-5 shadow-sm transition-all bg-card space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-black text-xs">
                          +{camp.reward_per_save} CREDITS
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {camp.state}
                        </Badge>
                      </div>
                      <h3 className="font-black text-base text-foreground tracking-tight">
                        {camp.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Merchant: <strong>{camp.contact_name}</strong> {camp.business_name && `(${camp.business_name})`}
                      </p>
                    </div>

                    <div className="h-10 w-10 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">
                      <UserPlus className="h-5 w-5" />
                    </div>
                  </div>

                  {camp.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-xl border border-border/50">
                      {camp.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Saves Completed</span>
                      <span className="text-orange-600">{camp.completed_saves} / {camp.total_target} ({progressPct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/70">
                    <a
                      href={`https://wa.me/${camp.contact_phone.replace(/[^\d]/g, '')}?text=Hello%20${encodeURIComponent(camp.contact_name)}%2C%20I%20have%20saved%20your%20contact%20from%20GGD%20Ad%20Network!`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> 1. Chat & Save
                    </a>

                    <Button
                      onClick={() => setSubmittingProofFor(camp)}
                      className="flex-1 h-10 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-orange-500/20"
                    >
                      <Upload className="h-3.5 w-3.5" /> 2. Upload Proof
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 3: PROMOTE MY CONTACT (CREATE CAMPAIGN) */}
        <TabsContent value="create" className="mt-6">
          <Card className="border-2 border-orange-500/30 rounded-3xl p-6 shadow-md max-w-2xl mx-auto bg-card">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-500" />
                Launch "Save My Contact" Campaign
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Pay GGD community members to save your WhatsApp contact, increasing your status viewers, client inquiries, and brand trust.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Campaign Title *</label>
                <Input
                  required
                  placeholder="e.g. Save Goodgift Digital VIP WhatsApp Line"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Contact / Person Name *</label>
                  <Input
                    required
                    placeholder="e.g. Bethel Chukwunyere"
                    value={newContactName}
                    onChange={e => setNewContactName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Business / Brand Name</label>
                  <Input
                    placeholder="e.g. Goodgift Digital"
                    value={newBusinessName}
                    onChange={e => setNewBusinessName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Phone / WhatsApp Number *</label>
                  <Input
                    required
                    type="tel"
                    placeholder="e.g. +234 801 234 5678"
                    value={newContactPhone}
                    onChange={e => setNewContactPhone(e.target.value)}
                    className="h-11 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">State Location</label>
                  <Select value={newState} onValueChange={setNewState}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Reward Per Saved Contact (Credits)</label>
                  <Select value={newRewardPerSave} onValueChange={setNewRewardPerSave}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 Credits / Save</SelectItem>
                      <SelectItem value="15">15 Credits / Save (Recommended)</SelectItem>
                      <SelectItem value="20">20 Credits / Save (Fastest Growth)</SelectItem>
                      <SelectItem value="50">50 Credits / Save (VIP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Target Number of Saves</label>
                  <Select value={newTotalTarget} onValueChange={setNewTotalTarget}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 Contacts</SelectItem>
                      <SelectItem value="50">50 Contacts</SelectItem>
                      <SelectItem value="100">100 Contacts</SelectItem>
                      <SelectItem value="250">250 Contacts</SelectItem>
                      <SelectItem value="500">500 Contacts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Custom Instructions / Description (Optional)</label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Save my line and drop a quick 'Hi' on WhatsApp to get our daily discounted prices."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-2xl bg-muted/60 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Budget Required:</p>
                  <p className="text-lg font-black text-orange-600">
                    {(parseInt(newRewardPerSave, 10) || 15) * (parseInt(newTotalTarget, 10) || 50)} Credits
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-muted-foreground">Your Balance:</p>
                  <p className="font-bold text-foreground">{userCredits} Credits</p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={creatingCampaign}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-xl shadow-orange-500/30"
              >
                {creatingCampaign ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Launch Contact Campaign
                  </>
                )}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 4: MY PROOFS & EARNINGS */}
        <TabsContent value="proofs" className="space-y-4 mt-6">
          <Card className="rounded-3xl border border-border p-6 bg-card shadow-sm">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-black text-foreground">
                My Contact Save Proofs & Earnings
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Track your screenshot appeals and credit rewards for saved contacts.
              </CardDescription>
            </CardHeader>

            {myProofs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto opacity-30 text-muted-foreground" />
                <p className="font-bold text-sm text-foreground">No Proofs Submitted Yet</p>
                <p className="text-xs max-w-sm mx-auto">
                  Head over to the "Save & Earn" tab to save merchant contacts and upload your screenshot proof to earn credits!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myProofs.map(p => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {p.campaign_title || 'Contact Campaign'}
                        </span>
                        <Badge className={`text-[10px] font-black ${
                          p.status === 'approved' 
                            ? 'bg-emerald-500/15 text-emerald-600' 
                            : p.status === 'rejected' 
                            ? 'bg-rose-500/15 text-rose-600' 
                            : 'bg-amber-500/15 text-amber-600'
                        }`}>
                          {p.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reward: <strong className="text-emerald-600">+{p.reward_credits} Credits</strong> • {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <a
                      href={p.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-600 hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Proof
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* PROOF SUBMISSION MODAL */}
      {submittingProofFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card border-2 border-orange-500 p-6 shadow-2xl relative space-y-4 text-card-foreground">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-foreground">
                Submit Save Proof for {submittingProofFor.contact_name}
              </h3>
              <Badge className="bg-emerald-500/15 text-emerald-600 font-bold">
                +{submittingProofFor.reward_per_save} Credits
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Please provide a link or image URL of your screenshot showing this merchant's contact saved in your phonebook.
            </p>

            <form onSubmit={handleProofSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Screenshot Image URL *</label>
                <Input
                  required
                  placeholder="https://i.imgur.com/... or uploaded screenshot link"
                  value={proofImage}
                  onChange={e => setProofImage(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Your WhatsApp Number (Optional)</label>
                <Input
                  placeholder="e.g. +234 801 234 5678"
                  value={proofPhone}
                  onChange={e => setProofPhone(e.target.value)}
                  className="h-11 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmittingProofFor(null)}
                  className="flex-1 rounded-xl h-11"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submittingProof}
                  className="flex-1 rounded-xl h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  {submittingProof ? 'Submitting...' : 'Submit Proof'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactGainHub;
