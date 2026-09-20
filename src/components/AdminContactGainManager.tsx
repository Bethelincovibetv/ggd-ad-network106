import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Users, Download, FileSpreadsheet, Settings, CheckCircle2, XCircle, 
  Eye, RefreshCw, Save, Sparkles, ShieldCheck, Search, Filter,
  Phone, MessageSquare, AlertTriangle, ExternalLink, Trash2, Plus,
  MapPin, Briefcase, Check, Database
} from "lucide-react";
import { toast } from "sonner";
import { 
  fetchCompiledContacts, 
  downloadDailyVCFFile, 
  downloadDailyCSVFile, 
  getActiveContactCampaigns,
  fetchContactProofs,
  reviewContactProof,
  getContactGainSettings,
  updateContactGainSettings,
  registerContactInGainPool,
  deleteContactFromGainPool,
  ContactEntry,
  ContactCampaign,
  ContactProofSubmission,
  ContactGainSettings,
  sanitizePhoneNumber
} from "@/services/contactGainService";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";
import { playMoneyTransferSound } from "@/utils/audio";

export const AdminContactGainManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'proofs' | 'campaigns' | 'add' | 'settings'>('contacts');
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [campaigns, setCampaigns] = useState<ContactCampaign[]>([]);
  const [proofs, setProofs] = useState<ContactProofSubmission[]>([]);
  const [settings, setSettings] = useState<ContactGainSettings>({
    daily_download_reward: 50,
    save_contact_default_reward: 15,
    campaign_creation_cost: 100,
    is_enabled: true,
    auto_compile_daily: true,
    show_on_feed: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Add Contact Form State
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addWhatsapp, setAddWhatsapp] = useState('');
  const [addBusiness, setAddBusiness] = useState('');
  const [addState, setAddState] = useState('Lagos');
  const [addIndustry, setAddIndustry] = useState('Commerce & Retail');
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, camp, p] = await Promise.all([
        getContactGainSettings(),
        fetchCompiledContacts(),
        getActiveContactCampaigns(),
        fetchContactProofs(),
      ]);
      setSettings(s);
      setContacts(c);
      setCampaigns(camp);
      setProofs(p);
    } catch (err) {
      console.error('Failed to load admin contact gain data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const ok = await updateContactGainSettings(settings);
      if (ok) {
        toast.success("Contact Gain platform settings saved to Firebase Firestore!");
      } else {
        toast.error("Failed to update settings in Firestore");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error saving settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveProof = async (proofId: string) => {
    try {
      const res = await reviewContactProof(proofId, 'approved');
      if (res.success) {
        setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: 'approved' } : p));
        toast.success("Proof approved in Firebase! Reward credits credited to user.");
        playMoneyTransferSound();
      } else {
        toast.error(res.error || "Failed to approve proof");
      }
    } catch {
      toast.error("Error approving proof");
    }
  };

  const handleRejectProof = async (proofId: string) => {
    const reason = prompt("Enter rejection reason (optional):") || "Proof screenshot was unclear or invalid.";
    try {
      const res = await reviewContactProof(proofId, 'rejected', reason);
      if (res.success) {
        setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: 'rejected', rejection_reason: reason } : p));
        toast.info("Proof rejected.");
      } else {
        toast.error(res.error || "Failed to reject proof");
      }
    } catch {
      toast.error("Error rejecting proof");
    }
  };

  const handleDeleteContact = async (contact: ContactEntry) => {
    if (!confirm(`Permanently delete contact "${contact.name}" (${contact.phone})?`)) return;
    try {
      if (contact.source === 'firestore' || contact.id.startsWith('ct_')) {
        await deleteContactFromGainPool(contact.id);
      }
      setContacts(prev => prev.filter(c => c.id !== contact.id && c.phone !== contact.phone));
      toast.success(`Contact "${contact.name}" removed from phonebook.`);
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPhone.trim()) {
      toast.error("Name and phone number are required.");
      return;
    }

    setIsAdding(true);
    try {
      const res = await registerContactInGainPool({
        userId: 'admin_verified',
        name: addName.trim(),
        phone: addPhone.trim(),
        whatsapp: addWhatsapp.trim() || addPhone.trim(),
        businessName: addBusiness.trim() || undefined,
        state: addState,
        industry: addIndustry,
      });

      if (res.success && res.entry) {
        setContacts(prev => [res.entry!, ...prev]);
        toast.success(`🎉 Verified contact "${addName}" added to Firebase Phonebook!`);
        setAddName('');
        setAddPhone('');
        setAddWhatsapp('');
        setAddBusiness('');
        setActiveTab('contacts');
      } else {
        toast.error(res.error || "Failed to add contact");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error adding contact");
    } finally {
      setIsAdding(false);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesQuery = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.business_name && c.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery);
    const matchesState = selectedState === 'all' || c.state.toLowerCase() === selectedState.toLowerCase();
    return matchesQuery && matchesState;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-neutral-950 via-gray-900 to-orange-950 border-2 border-orange-500/40 p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-black">
            <Database className="h-3.5 w-3.5 text-amber-400" /> FIREBASE FIRESTORE BACKEND
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Contact Gain Master Management
          </h2>
          <p className="text-xs text-neutral-300 max-w-xl">
            Real-time verified Nigerian entrepreneur phonebook compilation, Save-My-Contact campaigns, screenshot proof reviews, and automated daily rewards.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={loadData}
            variant="outline"
            disabled={loading}
            className="h-10 px-3 rounded-xl bg-neutral-900/80 text-white border-neutral-700 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => downloadDailyVCFFile()}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold gap-1.5 shadow-md shadow-orange-500/20"
          >
            <Download className="h-3.5 w-3.5" /> Export .VCF ({contacts.length})
          </Button>

          <Button
            size="sm"
            onClick={() => downloadDailyCSVFile()}
            variant="outline"
            className="h-10 px-3 rounded-xl bg-neutral-900/80 text-neutral-200 border-neutral-700 text-xs font-bold gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> CSV
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border border-border p-4 bg-card shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Total Verified Contacts</p>
          <p className="text-2xl font-black text-foreground mt-1">{contacts.length}</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Firebase Live</p>
        </Card>

        <Card className="rounded-2xl border border-border p-4 bg-card shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Active Campaigns</p>
          <p className="text-2xl font-black text-orange-600 mt-1">{campaigns.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Paid Contact Tasks</p>
        </Card>

        <Card className="rounded-2xl border border-border p-4 bg-card shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Pending Proofs</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {proofs.filter(p => p.status === 'pending').length}
          </p>
          <p className="text-[11px] text-amber-600 font-bold mt-0.5">Awaiting Review</p>
        </Card>

        <Card className="rounded-2xl border border-border p-4 bg-card shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold">Daily Download Reward</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">+{settings.daily_download_reward} Cr</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Per User / Day</p>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-5 w-full h-12 p-1 bg-card border border-border rounded-2xl">
          <TabsTrigger value="contacts" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Users className="h-3.5 w-3.5" /> Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="proofs" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Proofs ({proofs.filter(p => p.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Sparkles className="h-3.5 w-3.5" /> Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Plus className="h-3.5 w-3.5" /> Add Contact
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Settings className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COMPILED CONTACTS LIST */}
        <TabsContent value="contacts" className="space-y-4 mt-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name, business name, or phone number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs"
                />
              </div>

              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium w-full sm:w-48"
              >
                <option value="all">All States ({contacts.length})</option>
                {NIGERIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Users className="h-10 w-10 mx-auto opacity-30 text-muted-foreground" />
                <p className="font-bold text-sm text-foreground">No Contacts Found</p>
                <p className="text-xs">Try adjusting your search filter or add new contacts directly.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border rounded-2xl overflow-hidden bg-background">
                {filteredContacts.map(c => (
                  <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-foreground truncate">{c.name}</p>
                          {c.is_verified && (
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          )}
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 uppercase">
                            {c.source || 'verified'}
                          </Badge>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">{c.phone}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.business_name ? `${c.business_name} • ` : ''}{c.state} • {c.industry}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={`https://wa.me/${c.whatsapp?.replace(/[^\d]/g, '') || c.phone.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                        title="Open WhatsApp"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={`tel:${c.phone}`}
                        className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                        title="Call"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteContact(c)}
                        className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: PROOFS REVIEW */}
        <TabsContent value="proofs" className="space-y-4 mt-6">
          <Card className="rounded-3xl border border-border p-6 bg-card shadow-sm">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base font-black text-foreground">
                Proof Screenshot Verification
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Review submitted screenshots of saved contacts. Approving immediately credits the user's wallet.
              </CardDescription>
            </CardHeader>

            {proofs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="h-10 w-10 mx-auto opacity-30" />
                <p className="font-bold text-sm text-foreground">No Proof Submissions Yet</p>
                <p className="text-xs">User submissions for saving contacts will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proofs.map(p => (
                  <div key={p.id} className="p-4 rounded-2xl border border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground truncate">
                          {p.campaign_title || 'Contact Campaign'}
                        </span>
                        <Badge className={`text-[10px] font-bold ${
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
                        User: <strong className="text-foreground">{p.user_name}</strong> • Phone: <span className="font-mono">{p.user_phone || 'N/A'}</span>
                      </p>
                      <p className="text-xs text-emerald-600 font-bold">
                        Reward: +{p.reward_credits} Credits • {new Date(p.created_at).toLocaleString()}
                      </p>
                      {p.rejection_reason && (
                        <p className="text-xs text-rose-500 italic">Reason: {p.rejection_reason}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewImage(p.screenshot_url)}
                        className="h-9 px-3 rounded-xl text-xs font-bold gap-1 flex-1 sm:flex-initial"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Screenshot
                      </Button>

                      {p.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveProof(p.id)}
                            className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 flex-1 sm:flex-initial"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectProof(p.id)}
                            className="h-9 px-3 rounded-xl text-xs font-bold gap-1 flex-1 sm:flex-initial"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 3: CAMPAIGNS */}
        <TabsContent value="campaigns" className="space-y-4 mt-6">
          <Card className="rounded-3xl border border-border p-6 bg-card shadow-sm">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base font-black text-foreground">
                Active "Save My Contact" Campaigns ({campaigns.length})
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Sponsored campaigns launched by merchants to grow their WhatsApp status viewership.
              </CardDescription>
            </CardHeader>

            {campaigns.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Sparkles className="h-10 w-10 mx-auto opacity-30 text-orange-400" />
                <p className="font-bold text-sm text-foreground">No Active Campaigns</p>
                <p className="text-xs">User created campaigns will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map(camp => (
                  <Card key={camp.id} className="p-4 rounded-2xl border border-border bg-background space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{camp.title}</h4>
                        <p className="text-xs text-muted-foreground font-mono">{camp.contact_phone}</p>
                      </div>
                      <Badge className="bg-orange-500/15 text-orange-600 font-bold text-[10px]">
                        +{camp.reward_per_save} Cr / Save
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-bold text-foreground">{camp.completed_saves} / {camp.total_target} saves</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, (camp.completed_saves / Math.max(1, camp.total_target)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                      <span>Owner: {camp.user_email || camp.contact_name}</span>
                      <span>Budget: {camp.budget_credits} Cr</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 4: ADD CONTACT */}
        <TabsContent value="add" className="mt-6">
          <Card className="border-2 border-orange-500/30 rounded-3xl p-6 shadow-md max-w-xl mx-auto bg-card">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-orange-500" />
                Add Verified Contact to Firebase Phonebook
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Add an official Nigerian merchant or entrepreneur contact directly into the daily compiled VCF pool.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleAddContactSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Contact Name *</label>
                <Input
                  required
                  placeholder="e.g. Bethel Chukwunyere"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Business / Store Name</label>
                <Input
                  placeholder="e.g. Goodgift Digital"
                  value={addBusiness}
                  onChange={e => setAddBusiness(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Phone Number *</label>
                  <Input
                    required
                    type="tel"
                    placeholder="e.g. +234 801 234 5678"
                    value={addPhone}
                    onChange={e => setAddPhone(e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">WhatsApp Number</label>
                  <Input
                    type="tel"
                    placeholder="e.g. +234 801 234 5678"
                    value={addWhatsapp}
                    onChange={e => setAddWhatsapp(e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">State</label>
                  <select
                    value={addState}
                    onChange={e => setAddState(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs"
                  >
                    {NIGERIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Industry</label>
                  <Input
                    placeholder="e.g. Fashion, Real Estate"
                    value={addIndustry}
                    onChange={e => setAddIndustry(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isAdding}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20"
              >
                {isAdding ? 'Saving to Firebase...' : 'Add to Firebase Phonebook'}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* TAB 5: SETTINGS */}
        <TabsContent value="settings" className="mt-6">
          <Card className="rounded-3xl border border-border p-6 bg-card shadow-sm max-w-xl mx-auto">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base font-black text-foreground">
                Contact Gain System Configuration
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Configured centrally in Firebase Firestore.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/50 border border-border">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-foreground">Enable Contact Gain Module</label>
                  <p className="text-[11px] text-muted-foreground">Allow users to download phonebook and earn credits</p>
                </div>
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={c => setSettings(prev => ({ ...prev, is_enabled: c }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Daily VCF Download Reward (Credits)</label>
                <Input
                  type="number"
                  value={settings.daily_download_reward}
                  onChange={e => setSettings(prev => ({ ...prev, daily_download_reward: parseInt(e.target.value, 10) || 0 }))}
                  className="h-10 rounded-xl text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Credited once every 24 hours per user.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Default Reward Per Save (Credits)</label>
                <Input
                  type="number"
                  value={settings.save_contact_default_reward}
                  onChange={e => setSettings(prev => ({ ...prev, save_contact_default_reward: parseInt(e.target.value, 10) || 0 }))}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={savingSettings}
                className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
              >
                {savingSettings ? 'Saving to Firebase...' : 'Save Settings to Firebase'}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div className="max-w-2xl w-full bg-card rounded-3xl p-4 shadow-2xl relative space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground">Screenshot Proof Preview</h4>
              <Button size="sm" variant="ghost" onClick={() => setPreviewImage(null)} className="h-8 w-8 rounded-full">
                ✕
              </Button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-border bg-black/50 flex items-center justify-center">
              <img src={previewImage} alt="Proof" className="max-w-full h-auto object-contain rounded-xl" />
            </div>
            <div className="flex justify-end">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-orange-600 hover:underline font-bold inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContactGainManager;
