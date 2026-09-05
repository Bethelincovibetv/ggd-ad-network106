import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, CheckCircle2, Clock3, Coins, ExternalLink, Megaphone, UserRound, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Campaign = {
  id: string;
  title: string;
  caption: string;
  destination_url: string;
  budget_credits: number;
  reward_credits: number;
  remaining_budget_credits: number;
  duration_days: number;
  promoters_required: number;
  target_state: string | null;
  status: string;
  creative_url: string | null;
};

type Application = {
  id: string;
  campaign_id: string;
  status: string;
  proof_url: string | null;
  proof_notes: string | null;
  created_at: string;
  campaign?: Campaign;
};

type Earnings = { id: string; amount_credits: number; status: string; created_at: string; campaign_id: string };

const statusClass = (status: string) =>
  status === "active" || status === "approved" || status === "available" || status === "paid"
    ? "bg-emerald-100 text-emerald-700"
    : status === "rejected"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

export default function WhatsAppPromoterHub() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [earnings, setEarnings] = useState<Earnings[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ promoter_name: "", audience_category: "", estimated_audience: "", target_state: "", experience: "", whatsapp_channel: "" });

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setUser(null); setLoading(false); return; }
    setUser({ id: auth.user.id, email: auth.user.email });

    const [profileRes, campaignRes, appRes, earningRes, walletRes] = await Promise.all([
      supabase.from("promoter_profiles").select("*").eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("whatsapp_campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("whatsapp_campaign_applications").select("*, whatsapp_campaigns(*)").eq("promoter_user_id", auth.user.id).order("created_at", { ascending: false }),
      supabase.from("whatsapp_earnings").select("*").eq("promoter_user_id", auth.user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("credits").eq("user_id", auth.user.id).maybeSingle(),
    ]);

    if (profileRes.error) console.error(profileRes.error);
    if (campaignRes.error) console.error(campaignRes.error);
    if (appRes.error) console.error(appRes.error);
    if (earningRes.error) console.error(earningRes.error);
    if (walletRes.error) console.error(walletRes.error);

    const p = profileRes.data as any;
    setProfile(p);
    setCampaigns((campaignRes.data || []) as Campaign[]);
    setApplications(((appRes.data || []) as any[]).map((a) => ({ ...a, campaign: a.whatsapp_campaigns })));
    setEarnings((earningRes.data || []) as Earnings[]);
    setCredits((walletRes.data as any)?.credits ?? null);
    if (p) setProfileForm({
      promoter_name: p.promoter_name || "", audience_category: p.audience_category || "", estimated_audience: String(p.estimated_audience || ""),
      target_state: p.target_state || "", experience: p.experience || "", whatsapp_channel: (p.whatsapp_channels || [])[0] || "",
    });
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const available = useMemo(() => campaigns.filter((c) => !applications.some((a) => a.campaign_id === c.id)), [campaigns, applications]);
  const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount_credits || 0), 0);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const payload = {
      user_id: user.id,
      promoter_name: profileForm.promoter_name.trim() || null,
      whatsapp_channels: profileForm.whatsapp_channel.trim() ? [profileForm.whatsapp_channel.trim()] : [],
      audience_category: profileForm.audience_category.trim() || null,
      estimated_audience: Math.max(0, Number(profileForm.estimated_audience) || 0),
      target_state: profileForm.target_state.trim() || null,
      experience: profileForm.experience.trim() || null,
    };
    const { error } = await supabase.from("promoter_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) toast.error(error.message); else { toast.success("Promoter profile saved"); await load(); }
    setSavingProfile(false);
  };

  const apply = async (campaignId: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc("apply_to_whatsapp_campaign", { p_campaign_id: campaignId } as any);
    if (error) toast.error(error.message);
    else if (!(data as any)?.success) toast.error((data as any)?.error || "Unable to apply");
    else { toast.success("Application submitted"); await load(); }
  };

  const submitProof = async (applicationId: string) => {
    const proof = window.prompt("Paste the public proof link (screenshot, post, or status evidence):");
    if (!proof) return;
    const notes = window.prompt("Optional proof notes:") || null;
    const { data, error } = await supabase.rpc("submit_whatsapp_promotion", { p_application_id: applicationId, p_proof_url: proof, p_notes: notes } as any);
    if (error) toast.error(error.message);
    else if (!(data as any)?.success) toast.error((data as any)?.error || "Unable to submit proof");
    else { toast.success("Promotion proof submitted"); await load(); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="w-full max-w-md"><CardHeader><CardTitle>Sign in to WhatsApp Promoter Hub</CardTitle></CardHeader><CardContent><p className="text-muted-foreground mb-4">Sign in to manage your promoter profile, campaigns and earnings.</p><Button asChild className="w-full"><Link to="/">Go to GGD Ad Network</Link></Button></CardContent></Card></div>;

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><div className="flex items-center gap-2 text-primary"><Megaphone className="h-6 w-6" /><span className="font-semibold">GGD Ad Network</span></div><h1 className="mt-1 text-2xl md:text-3xl font-bold">WhatsApp Promoter Hub</h1><p className="text-muted-foreground">Use your WhatsApp audience to promote verified business campaigns and earn GGG credits.</p></div>
          <Button variant="outline" asChild><Link to="/">Back to dashboard</Link></Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Coins className="h-5 w-5" /><div><p className="text-sm text-muted-foreground">GGG Credits</p><p className="text-2xl font-bold">{credits ?? "—"}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Megaphone className="h-5 w-5" /><div><p className="text-sm text-muted-foreground">Available campaigns</p><p className="text-2xl font-bold">{available.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><BriefcaseBusiness className="h-5 w-5" /><div><p className="text-sm text-muted-foreground">My promotions</p><p className="text-2xl font-bold">{applications.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><WalletCards className="h-5 w-5" /><div><p className="text-sm text-muted-foreground">Total earnings</p><p className="text-2xl font-bold">{totalEarnings}</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-5">
          <TabsList className="grid w-full grid-cols-3 md:max-w-xl"><TabsTrigger value="campaigns">Campaigns</TabsTrigger><TabsTrigger value="my">My Promotions</TabsTrigger><TabsTrigger value="profile">My Profile</TabsTrigger></TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            {available.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">No new active campaigns are available right now.</CardContent></Card> : available.map((c) => (
              <Card key={c.id}><CardContent className="p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><div className="flex items-center gap-2"><Badge className={statusClass(c.status)}>{c.status}</Badge>{c.target_state && <Badge variant="outline">{c.target_state}</Badge>}</div><h2 className="text-lg font-semibold">{c.title}</h2><p className="text-sm text-muted-foreground">{c.caption}</p><div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><span><b>{c.reward_credits}</b> credits/reward</span><span><b>{c.promoters_required}</b> promoters</span><span><b>{c.duration_days}</b> days</span><span><b>{c.remaining_budget_credits}</b> remaining</span></div></div><div className="flex shrink-0 gap-2"><Button variant="outline" asChild><a href={c.destination_url} target="_blank" rel="noreferrer">View <ExternalLink className="ml-1 h-4 w-4" /></a></Button><Button onClick={() => void apply(c.id)}>Apply</Button></div></div></CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="my" className="space-y-4">
            {applications.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">You have not joined a campaign yet.</CardContent></Card> : applications.map((a) => <Card key={a.id}><CardContent className="p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold">{a.campaign?.title || "Campaign"}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><Badge className={statusClass(a.status)}>{a.status}</Badge>{a.campaign && <span className="text-sm text-muted-foreground">Reward: {a.campaign.reward_credits} credits</span>}</div></div>{a.status === "approved" && <Button onClick={() => void submitProof(a.id)}>Submit promotion proof</Button>}{a.status === "submitted" && <span className="flex items-center gap-2 text-sm text-amber-700"><Clock3 className="h-4 w-4" /> Awaiting review</span>}{a.status === "rejected" && <span className="text-sm text-red-600">Rejected — check the campaign instructions.</span>}{a.status === "paid" && <span className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Paid</span>}</div></CardContent></Card>)}
            <Card><CardHeader><CardTitle>Earnings history</CardTitle></CardHeader><CardContent>{earnings.length === 0 ? <p className="text-sm text-muted-foreground">No earnings yet.</p> : <div className="space-y-3">{earnings.map((e) => <div key={e.id} className="flex items-center justify-between border-b pb-3 last:border-0"><span>{new Date(e.created_at).toLocaleDateString()}</span><span className="font-semibold">{e.amount_credits} credits</span><Badge className={statusClass(e.status)}>{e.status}</Badge></div>)}</div>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Promoter profile</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Promoter name" value={profileForm.promoter_name} onChange={(e) => setProfileForm({ ...profileForm, promoter_name: e.target.value })} /><Input placeholder="WhatsApp channel/status/community" value={profileForm.whatsapp_channel} onChange={(e) => setProfileForm({ ...profileForm, whatsapp_channel: e.target.value })} /><Input placeholder="Audience category (e.g. business, fashion)" value={profileForm.audience_category} onChange={(e) => setProfileForm({ ...profileForm, audience_category: e.target.value })} /><Input type="number" placeholder="Estimated audience" value={profileForm.estimated_audience} onChange={(e) => setProfileForm({ ...profileForm, estimated_audience: e.target.value })} /><Input placeholder="Target state" value={profileForm.target_state} onChange={(e) => setProfileForm({ ...profileForm, target_state: e.target.value })} /><Input placeholder="Experience" value={profileForm.experience} onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })} /></div><Textarea placeholder="Tell businesses why your audience is a good fit" value={profileForm.experience} onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })} /><div className="flex items-center justify-between rounded-lg border p-4"><div><p className="font-medium">Verification</p><p className="text-sm text-muted-foreground">{profile?.is_verified ? "Your promoter profile is verified." : "Your profile is not verified yet. Admin approval is required before applying."}</p></div><Badge className={profile?.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{profile?.is_verified ? "Verified" : "Pending"}</Badge></div><Button onClick={() => void saveProfile()} disabled={savingProfile}>{savingProfile ? "Saving..." : "Save profile"}</Button></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
