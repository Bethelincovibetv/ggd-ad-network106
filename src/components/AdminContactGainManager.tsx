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
  Phone, MessageSquare, AlertTriangle, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { 
  fetchCompiledContacts, 
  downloadDailyVCFFile, 
  downloadDailyCSVFile, 
  getActiveContactCampaigns,
  getLocalProofs,
  reviewContactProof,
  getContactGainSettings,
  updateContactGainSettings,
  ContactEntry,
  ContactCampaign,
  ContactProofSubmission,
  ContactGainSettings
} from "@/services/contactGainService";
import { playMoneyTransferSound, playNotificationChime } from "@/utils/audio";

export const AdminContactGainManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'proofs' | 'campaigns' | 'settings'>('contacts');
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, camp] = await Promise.all([
        getContactGainSettings(),
        fetchCompiledContacts(),
        getActiveContactCampaigns(),
      ]);
      setSettings(s);
      setContacts(c);
      setCampaigns(camp);
      setProofs(getLocalProofs());
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
        toast.success("Contact Gain platform settings saved successfully!");
      } else {
        toast.error("Failed to update settings");
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
        toast.success("Proof approved! Reward credits credited to the user.");
        playMoneyTransferSound();
      } else {
        toast.error(res.error || "Failed to approve proof");
      }
    } catch {
      toast.error("Error approving proof");
    }
  };

  const handleRejectProof = async (proofId: string) => {
    const reason = window.prompt("Enter rejection reason (optional):", "Screenshot does not clearly show contact saved in phonebook.");
    if (reason === null) return;

    try {
      const res = await reviewContactProof(proofId, 'rejected', reason);
      if (res.success) {
        setProofs(prev => prev.map(p => p.id === proofId ? { ...p, status: 'rejected', rejection_reason: reason } : p));
        toast.info("Proof marked as rejected.");
      } else {
        toast.error(res.error || "Failed to reject proof");
      }
    } catch {
      toast.error("Error rejecting proof");
    }
  };

  const filteredContacts = contacts.filter(c => 
    !searchQuery ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.business_name && c.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.phone.includes(searchQuery) ||
    c.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingProofs = proofs.filter(p => p.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground">Contact Gain Administration</h2>
            <Badge className="bg-orange-500/15 text-orange-600 font-bold border-none text-xs">
              OFFICIAL SYSTEM
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage daily compiled user contacts, VCF/CSV generation, credit rewards, and proof approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => downloadDailyVCFFile()}
            className="rounded-xl h-10 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export VCF
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadDailyCSVFile()}
            className="rounded-xl h-10 text-xs font-bold gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Export CSV
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="rounded-xl h-10 w-10 p-0"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-12 p-1 bg-muted/60 border border-border rounded-2xl">
          <TabsTrigger value="contacts" className="rounded-xl text-xs font-bold gap-1.5">
            <Users className="h-3.5 w-3.5" /> Compiled ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="proofs" className="rounded-xl text-xs font-bold gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Proofs ({pendingProofs.length} pending)
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="rounded-xl text-xs font-bold gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl text-xs font-bold gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Rewards & Config
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COMPILED CONTACTS */}
        <TabsContent value="contacts" className="space-y-4 mt-6">
          <div className="flex items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by name, phone, business, state..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs"
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              Showing {filteredContacts.length} of {contacts.length} Contacts
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Business Name</th>
                    <th className="p-3.5">Phone / WhatsApp</th>
                    <th className="p-3.5">State</th>
                    <th className="p-3.5">Industry</th>
                    <th className="p-3.5">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContacts.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">{c.name}</td>
                      <td className="p-3.5 text-muted-foreground">{c.business_name || '—'}</td>
                      <td className="p-3.5 font-mono font-semibold text-foreground">{c.phone}</td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {c.state}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{c.industry}</td>
                      <td className="p-3.5 text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: PROOFS REVIEW */}
        <TabsContent value="proofs" className="space-y-4 mt-6">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-sm text-foreground mb-1">
              "Save My Contact" Proof Appeals & Verifications
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Review user screenshots confirming they have saved merchant contacts into their phonebook.
            </p>

            {proofs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto opacity-30 mb-2" />
                <p className="font-bold text-sm">No Proofs Submitted Yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {proofs.map(p => (
                  <div key={p.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {p.user_name}
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
                        <span className="text-xs font-bold text-emerald-600">
                          +{p.reward_credits} Credits
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target Campaign: <strong>{p.campaign_title || p.campaign_id}</strong>
                      </p>
                      {p.user_phone && (
                        <p className="text-xs font-mono text-muted-foreground">
                          User WhatsApp: {p.user_phone}
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Submitted on {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewImage(p.screenshot_url)}
                        className="rounded-xl h-9 text-xs font-bold gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Screenshot
                      </Button>

                      {p.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveProof(p.id)}
                            className="rounded-xl h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Credit
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectProof(p.id)}
                            className="rounded-xl h-9 text-xs font-bold gap-1"
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
          </div>
        </TabsContent>

        {/* TAB 3: CAMPAIGNS */}
        <TabsContent value="campaigns" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(camp => (
              <Card key={camp.id} className="border border-border rounded-2xl p-4 bg-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge className="bg-orange-500/15 text-orange-600 text-[10px] font-bold">
                      {camp.status.toUpperCase()}
                    </Badge>
                    <h4 className="font-bold text-sm text-foreground mt-1">{camp.title}</h4>
                    <p className="text-xs text-muted-foreground">{camp.contact_name} • {camp.contact_phone}</p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-xs font-bold">
                    +{camp.reward_per_save} Credits / Save
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-2">
                  <span>Progress: <strong>{camp.completed_saves} / {camp.total_target}</strong></span>
                  <span>State: <strong>{camp.state}</strong></span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: CONFIGURATION & REWARDS */}
        <TabsContent value="settings" className="mt-6">
          <Card className="rounded-3xl border border-border p-6 bg-card max-w-xl shadow-sm">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg font-black text-foreground">
                Contact Gain Rewards & System Config
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Configure reward credit amounts for daily file downloads and individual contact saves.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Daily VCF Download Reward (Credits)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="500"
                  value={settings.daily_download_reward}
                  onChange={e => setSettings(s => ({ ...s, daily_download_reward: parseInt(e.target.value, 10) || 0 }))}
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Credits awarded to a user once per day when they download today's compiled contact file.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Default Save My Contact Reward (Credits)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={settings.save_contact_default_reward}
                  onChange={e => setSettings(s => ({ ...s, save_contact_default_reward: parseInt(e.target.value, 10) || 15 }))}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Enable Contact Gain System</p>
                    <p className="text-[11px] text-muted-foreground">Allow users to download contacts and launch campaigns.</p>
                  </div>
                  <Switch
                    checked={settings.is_enabled}
                    onCheckedChange={v => setSettings(s => ({ ...s, is_enabled: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Auto-Compile Contacts Daily</p>
                    <p className="text-[11px] text-muted-foreground">Automatically aggregate all newly registered members.</p>
                  </div>
                  <Switch
                    checked={settings.auto_compile_daily}
                    onCheckedChange={v => setSettings(s => ({ ...s, auto_compile_daily: v }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Show Contact Gain on Feed & Directory</p>
                    <p className="text-[11px] text-muted-foreground">Display interactive promo cards in community stream.</p>
                  </div>
                  <Switch
                    checked={settings.show_on_feed}
                    onCheckedChange={v => setSettings(s => ({ ...s, show_on_feed: v }))}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingSettings}
                className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
              >
                {savingSettings ? 'Saving...' : 'Save Configuration'}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="max-w-lg w-full bg-card rounded-3xl p-4 space-y-3 border border-border">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground">Proof Screenshot Preview</h4>
              <Button size="sm" variant="ghost" onClick={() => setPreviewImage(null)} className="h-8 w-8 p-0 rounded-full">
                ✕
              </Button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img src={previewImage} alt="Proof" className="max-h-[65vh] object-contain" />
            </div>
            <Button onClick={() => setPreviewImage(null)} className="w-full rounded-xl">
              Close Preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContactGainManager;
