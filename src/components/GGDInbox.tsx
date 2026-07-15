import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Send, Search, ArrowLeft, User, MessageCircle, Copy, ExternalLink,
  CheckCircle2, Upload, Pin, Briefcase, Users, Globe,
} from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Kind = "text" | "proof" | "system" | "action";

interface Msg {
  id: string;
  sender_id: string;
  receiver_id: string;
  task_id: string | null;
  assignment_id: string | null;
  kind: Kind;
  message: string | null;
  image_url: string | null;
  action_type: string | null;
  action_payload: any;
  is_read: boolean;
  created_at: string;
}

interface Thread {
  otherId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  taskId?: string | null;
  scope: "business" | "syndicate" | "global";
}

interface Profile {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  business_name?: string | null;
  business_phone?: string | null;
  whatsapp_number?: string | null;
}

interface AssignmentMeta {
  id: string;
  task_id: string;
  syndicate_user_id: string;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  proof_image_url?: string | null;
  status: string;
}

const tabTitles = {
  business: "As a Business",
  syndicate: "As a Syndicate",
  global: "Global Network",
} as const;

const GGDInbox: React.FC = () => {
  const [me, setMe] = useState<string>("");
  const [tab, setTab] = useState<"business" | "syndicate" | "global">("business");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeOther, setActiveOther] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [globalResults, setGlobalResults] = useState<Profile[]>([]);
  const [assignment, setAssignment] = useState<AssignmentMeta | null>(null);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Init & load threads ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setMe(data.user.id);
      await loadThreads(data.user.id);
    })();
  }, []);

  // Realtime subscription for the current user
  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`inbox-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "p2p_messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.sender_id !== me && m.receiver_id !== me) return;
        if (activeOther && (m.sender_id === activeOther || m.receiver_id === activeOther)) {
          setMessages((prev) => [...prev, m]);
          if (m.receiver_id === me) {
            supabase.from("p2p_messages").update({ is_read: true }).eq("id", m.id);
          }
        }
        loadThreads(me);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, activeOther]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadThreads = async (uid: string) => {
    const { data } = await supabase
      .from("p2p_messages")
      .select("*")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(300);
    const map = new Map<string, Msg>();
    (data || []).forEach((m: any) => {
      const other = m.sender_id === uid ? m.receiver_id : m.sender_id;
      const key = `${other}:${m.task_id || ""}`;
      if (!map.has(key)) map.set(key, m);
    });
    const otherIds = Array.from(new Set(Array.from(map.values()).map((m) => (m.sender_id === uid ? m.receiver_id : m.sender_id))));
    let profileMap = new Map<string, Profile>();
    if (otherIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, avatar_url, business_name")
        .in("user_id", otherIds);
      (profs || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    // Classify: is `other` a business owner of the task, or syndicate?
    const taskIds = Array.from(new Set(Array.from(map.values()).map((m) => m.task_id).filter(Boolean))) as string[];
    let creatorByTask = new Map<string, string>();
    if (taskIds.length > 0) {
      const { data: ts } = await supabase.from("tasks").select("id, creator_id, title").in("id", taskIds);
      (ts || []).forEach((t: any) => creatorByTask.set(t.id, t.creator_id));
      const { data: sts } = await supabase.from("syndicate_tasks").select("id, creator_id, title").in("id", taskIds);
      (sts || []).forEach((t: any) => creatorByTask.set(t.id, t.creator_id));
    }

    // Unread counts per other
    const { data: unread } = await supabase
      .from("p2p_messages")
      .select("sender_id")
      .eq("receiver_id", uid)
      .eq("is_read", false);
    const unreadByOther = new Map<string, number>();
    (unread || []).forEach((u: any) => unreadByOther.set(u.sender_id, (unreadByOther.get(u.sender_id) || 0) + 1));

    const built: Thread[] = [];
    for (const [key, m] of map.entries()) {
      const other = m.sender_id === uid ? m.receiver_id : m.sender_id;
      const prof = profileMap.get(other);
      const creator = m.task_id ? creatorByTask.get(m.task_id) : null;
      let scope: Thread["scope"] = "global";
      if (creator) scope = creator === uid ? "business" : "syndicate";
      built.push({
        otherId: other,
        displayName: prof?.business_name || prof?.display_name || prof?.email?.split("@")[0] || "Member",
        email: prof?.email || undefined,
        avatarUrl: prof?.avatar_url || undefined,
        lastMessage: m.kind === "proof" ? "📎 Proof screenshot" : m.message || "",
        lastAt: m.created_at,
        unread: unreadByOther.get(other) || 0,
        taskId: m.task_id,
        scope,
      });
    }
    setThreads(built);
  };

  // ---- Global network search ----
  useEffect(() => {
    if (tab !== "global" || !search.trim()) { setGlobalResults([]); return; }
    const q = search.trim();
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, avatar_url, business_name")
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%,business_name.ilike.%${q}%`)
        .limit(20);
      setGlobalResults((data || []).filter((p: any) => p.user_id !== me));
    }, 250);
    return () => clearTimeout(t);
  }, [search, tab, me]);

  // ---- Open conversation ----
  const openThread = async (otherId: string, taskId?: string | null) => {
    setActiveOther(otherId);
    setActiveTaskId(taskId || null);
    setAssignment(null);
    setTaskTitle("");

    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, email, display_name, avatar_url, business_name, business_phone, whatsapp_number")
      .eq("user_id", otherId)
      .maybeSingle();
    setOtherProfile((prof as any) || null);

    let msgQuery = supabase
      .from("p2p_messages")
      .select("*")
      .or(`and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`)
      .order("created_at", { ascending: true });
    if (taskId) msgQuery = msgQuery.eq("task_id", taskId);
    const { data: msgs } = await msgQuery;
    setMessages((msgs as any) || []);

    // Mark unread as read
    await supabase
      .from("p2p_messages")
      .update({ is_read: true })
      .eq("sender_id", otherId)
      .eq("receiver_id", me)
      .eq("is_read", false);

    if (taskId) {
      // Load task title
      const { data: t1 } = await supabase.from("tasks").select("title, creator_id").eq("id", taskId).maybeSingle();
      const { data: t2 } = t1 ? { data: null } : await supabase.from("syndicate_tasks").select("title, creator_id").eq("id", taskId).maybeSingle();
      const t = t1 || t2;
      setTaskTitle((t as any)?.title || "");

      // Load latest assignment for this task+syndicate (works whether viewer is biz or syndicate)
      const syndicateId = (t as any)?.creator_id === me ? otherId : me;
      const { data: a } = await supabase
        .from("syndicate_task_assignments")
        .select("id, task_id, syndicate_user_id, bank_name, bank_account_name, bank_account_number, proof_image_url, status")
        .eq("task_id", taskId)
        .eq("syndicate_user_id", syndicateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setAssignment((a as any) || null);
    }
  };

  const closeThread = () => {
    setActiveOther(null);
    setActiveTaskId(null);
    setOtherProfile(null);
    setMessages([]);
    setAssignment(null);
  };

  // ---- Send text ----
  const send = async () => {
    const text = input.trim();
    if (!text || !activeOther) return;
    setInput("");
    const optimistic: any = {
      id: `tmp-${Date.now()}`,
      sender_id: me, receiver_id: activeOther, task_id: activeTaskId, assignment_id: null,
      kind: "text", message: text, image_url: null, action_type: null, action_payload: null,
      is_read: false, created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    const { error } = await supabase.from("p2p_messages").insert({
      sender_id: me, receiver_id: activeOther, task_id: activeTaskId, kind: "text", message: text,
    });
    if (error) toast.error("Failed to send");
  };

  // ---- Upload proof screenshot & embed into chat ----
  const uploadProof = async (file: File) => {
    if (!activeOther || !activeTaskId) {
      toast.error("Open a task chat before uploading proof");
      return;
    }
    setUploading(true);
    try {
      const path = `${me}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { data, error } = await supabase.storage.from("syndicate-proofs").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("syndicate-proofs").getPublicUrl(data.path);
      const proofUrl = pub.publicUrl;

      // Update the assignment record with proof if we own one
      if (assignment) {
        await supabase
          .from("syndicate_task_assignments")
          .update({ proof_image_url: proofUrl, status: "submitted" })
          .eq("id", assignment.id);
      }
      // Inject the proof screenshot as a system-generated chat message
      await supabase.from("p2p_messages").insert({
        sender_id: me,
        receiver_id: activeOther,
        task_id: activeTaskId,
        assignment_id: assignment?.id || null,
        kind: "proof",
        message: "Task proof submitted",
        image_url: proofUrl,
        action_type: "approve_pay",
        action_payload: { assignment_id: assignment?.id || null, task_title: taskTitle },
      });
      toast.success("Proof sent");
      if (activeTaskId) openThread(activeOther, activeTaskId);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ---- Approve & Pay flow (business owner clicks it) ----
  const approveAndPay = async (m: Msg) => {
    const asgId = m.action_payload?.assignment_id || assignment?.id;
    if (!asgId) { toast.error("Missing assignment reference"); return; }
    const { error } = await supabase
      .from("syndicate_task_assignments")
      .update({ status: "approved", paid_at: new Date().toISOString(), paid_by: me })
      .eq("id", asgId);
    if (error) { toast.error(error.message); return; }
    toast.success("Approved. Payment marked complete.");
    await supabase.from("p2p_messages").insert({
      sender_id: me, receiver_id: activeOther!, task_id: activeTaskId,
      kind: "system", message: `✅ ${taskTitle || "Task"} approved & payment marked complete`,
    });
  };

  // ---- Filter by tab ----
  const shownThreads = useMemo(() => {
    if (tab === "global") return threads; // all convos are searchable via inbox list too
    return threads.filter((t) => t.scope === tab);
  }, [threads, tab]);

  // ---- Pinned metadata (only for Business viewer + when proof submitted) ----
  const iAmBusinessInThisTask = tab === "business" || (assignment && assignment.syndicate_user_id !== me);
  const showBankDetails = !!(iAmBusinessInThisTask && assignment?.proof_image_url && assignment?.bank_account_number);
  const waLink = otherProfile ? buildWhatsAppLink(otherProfile.whatsapp_number || otherProfile.business_phone, { taskName: taskTitle }) : null;

  const copy = async (text: string, label = "Copied") => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error("Copy failed"); }
  };

  // ================= UI =================
  if (activeOther) {
    return (
      <Card className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
          <button onClick={closeThread}><ArrowLeft className="h-5 w-5" /></button>
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {otherProfile?.avatar_url ? <img src={otherProfile.avatar_url} className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate">{otherProfile?.business_name || otherProfile?.display_name || "Member"}</p>
            {taskTitle && <p className="text-[10px] text-orange-100 truncate">{taskTitle}</p>}
          </div>
        </div>

        {/* Pinned Metadata Box */}
        {activeTaskId && (
          <div className="border-b bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground mb-1">
              <Pin className="h-3 w-3" /> Task Metadata
            </div>
            {showBankDetails ? (
              <div className="space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span><b>Bank:</b> {assignment!.bank_name}</span>
                  <span><b>Name:</b> {assignment!.bank_account_name}</span>
                  <span className="font-mono"><b>#:</b> {assignment!.bank_account_number}</span>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] ml-auto"
                    onClick={() => copy(assignment!.bank_account_number!, "Account number copied")}>
                    <Copy className="h-3 w-3 mr-1" /> Copy Account Number
                  </Button>
                </div>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-green-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> WhatsApp Chat
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Awaiting Task Submission</p>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">Say hello — start the conversation.</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            if (m.kind === "system") {
              return (
                <div key={m.id} className="text-center">
                  <span className="inline-block text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                    {m.message}
                  </span>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-orange-500 text-white rounded-br-sm" : "bg-background border rounded-bl-sm"}`}>
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer" className="block mb-1">
                      <img src={m.image_url} alt="proof" className="rounded-lg max-h-64 object-cover" />
                    </a>
                  )}
                  {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}

                  {/* Approve & Pay action button — only for the receiver (business owner) */}
                  {m.kind === "proof" && m.action_type === "approve_pay" && !mine && (
                    <Button
                      size="sm"
                      onClick={() => approveAndPay(m)}
                      className="mt-2 h-8 bg-green-500 hover:bg-green-600 text-white text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Pay
                    </Button>
                  )}
                  <p className={`text-[9px] mt-1 ${mine ? "text-orange-100" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="p-2 border-t bg-background">
          <div className="flex gap-2 items-center">
            {activeTaskId && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(f); e.currentTarget.value = ""; }}
                />
                <Button
                  variant="outline" size="icon"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  title="Upload proof screenshot"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </>
            )}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={send} size="icon" className="bg-orange-500 hover:bg-orange-600 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Inbox list view
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-black">GGD Inbox</h2>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="business" className="text-xs">
            <Briefcase className="h-3 w-3 mr-1" /> {tabTitles.business}
          </TabsTrigger>
          <TabsTrigger value="syndicate" className="text-xs">
            <Users className="h-3 w-3 mr-1" /> {tabTitles.syndicate}
          </TabsTrigger>
          <TabsTrigger value="global" className="text-xs">
            <Globe className="h-3 w-3 mr-1" /> {tabTitles.global}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3 space-y-2">
          {tab === "global" && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search any GGD member by name, email or business…"
                className="pl-9 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {tab === "global" && search && (
            <Card>
              <CardContent className="p-0 divide-y">
                {globalResults.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">No members match "{search}"</p>
                ) : globalResults.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => openThread(p.user_id, null)}
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted/40 transition"
                  >
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{p.business_name || p.display_name || p.email?.split("@")[0]}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Start Chat</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0 divide-y">
              {shownThreads.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {tab === "business" && "No business-side conversations yet. Syndicates who perform your tasks will appear here."}
                  {tab === "syndicate" && "No syndicate-side conversations yet. Businesses whose tasks you accept will appear here."}
                  {tab === "global" && "Search a member above to start a new direct chat."}
                </p>
              ) : shownThreads.map((t) => (
                <button
                  key={`${t.otherId}:${t.taskId || ""}`}
                  onClick={() => openThread(t.otherId, t.taskId)}
                  className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted/40 transition"
                >
                  <div className="h-11 w-11 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
                    {t.avatarUrl ? <img src={t.avatarUrl} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-orange-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{t.displayName}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(t.lastAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.lastMessage}</p>
                  </div>
                  {t.unread > 0 && <Badge className="bg-red-500 text-white text-[10px]">{t.unread}</Badge>}
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GGDInbox;