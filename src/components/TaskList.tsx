import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Plus, Gift, CheckCircle, Share2, Coins, Wallet, ArrowRight, X, Crown, Zap, Lock, Megaphone, Users, Upload, Image, Loader2, Timer, Facebook, Instagram, Send, MessageCircle, Link as LinkIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SlideCarousel from "@/components/SlideCarousel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOrCreateTaskShareUrl } from "@/lib/taskShare";

interface TaskListProps {
  onCreditsUpdate: (newCredits: number) => void;
  credits: number;
  onNavigate?: (tab: string) => void;
}

type TaskType = 'share' | 'social' | 'youtube';

const TaskList = ({ onCreditsUpdate, credits, onNavigate }: TaskListProps) => {
  const { isEnabled } = useFeatureToggles();
  const [tasks, setTasks] = useState<any[]>([]);
  const [completions, setCompletions] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', reward_credits: '5', share_url: '', max_completions: '10' });
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ task: any; sharedTo?: string } | null>(null);
  const [myShortLinks, setMyShortLinks] = useState<any[]>([]);
  const [shareLinkMode, setShareLinkMode] = useState<'manual' | 'smart'>('manual');
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => { fetchTasks(); checkBusinessStatus(); fetchMyShortLinks(); }, []);

  const fetchMyShortLinks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('short_links').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false });
    setMyShortLinks(data || []);
  };

  const checkBusinessStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('business_name').eq('user_id', user.id).single();
    setIsBusiness(!!data?.business_name);
  };

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUid(user.id);
    // Owner Mode: a user's own campaigns are shown with management tools,
    // never with "do this task" actions.
    const [{ data: othersData }, { data: mineData }] = await Promise.all([
      supabase.from('tasks').select('*').eq('is_active', true).neq('creator_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }),
    ]);
    setTasks([...(mineData || []), ...(othersData || [])]);
    const { data: comps } = await supabase.from('task_completions').select('task_id').eq('user_id', user.id);
    setCompletions((comps || []).map(c => c.task_id));
  };

  const toggleTaskActive = async (task: any) => {
    const { error } = await supabase.from('tasks').update({ is_active: !task.is_active }).eq('id', task.id);
    if (error) { toast.error(error.message); return; }
    toast.success(task.is_active ? 'Campaign paused' : 'Campaign resumed');
    fetchTasks();
  };

  const deleteTask = async (task: any) => {
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Campaign deleted');
    fetchTasks();
  };

  const handleFlyerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  };

  const uploadFlyer = async (userId: string): Promise<{ url: string | null; failed: boolean }> => {
    if (!flyerFile) return { url: null, failed: false };
    setUploadingFlyer(true);
    const ext = (flyerFile.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('task-flyers').upload(fileName, flyerFile, { upsert: false, contentType: flyerFile.type });
    setUploadingFlyer(false);
    if (error) { toast.error(`Failed to upload image: ${error.message}`); return { url: null, failed: true }; }
    const { data: urlData } = supabase.storage.from('task-flyers').getPublicUrl(fileName);
    return { url: urlData.publicUrl, failed: false };
  };

  const createTask = async () => {
    if (!newTask.title.trim()) { toast.error("Title required"); return; }
    if (selectedTaskType === 'youtube' && !newTask.share_url.trim()) { toast.error("YouTube URL required"); return; }
    const rewardPerPerson = parseInt(newTask.reward_credits) || 5;
    const maxPeople = parseInt(newTask.max_completions) || 1;
    const totalCost = rewardPerPerson * maxPeople;

    if (credits < totalCost) {
      toast.error(`Insufficient credits! You need ${totalCost} credits (${rewardPerPerson} × ${maxPeople} people) but have ${credits}.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upload flyer if selected
    const { url: flyerUrl, failed } = await uploadFlyer(user.id);
    if (failed) return; // do not deduct credits if image upload failed

    const newCredits = credits - totalCost;
    const { error: creditError } = await supabase.from('profiles').update({ credits: newCredits }).eq('user_id', user.id);
    if (creditError) { toast.error("Failed to deduct credits"); return; }

    const { error } = await supabase.from('tasks').insert([{
      title: newTask.title,
      description: newTask.description || null,
      reward_credits: rewardPerPerson,
      task_type: selectedTaskType || 'share',
      share_url: newTask.share_url || null,
      creator_id: user.id,
      funded: true,
      max_completions: maxPeople,
      flyer_url: flyerUrl,
    }]);
    if (error) {
      await supabase.from('profiles').update({ credits }).eq('user_id', user.id);
      toast.error("Failed to create task");
      return;
    }

    onCreditsUpdate(newCredits);
    toast.success(`Task created! ${totalCost} credits deducted (${rewardPerPerson} × ${maxPeople} people).`);
    setNewTask({ title: '', description: '', reward_credits: '5', share_url: '', max_completions: '10' });
    setFlyerFile(null);
    setFlyerPreview(null);
    setShowCreate(false);
    setSelectedTaskType(null);
    fetchTasks();
  };

  const SHARE_PLATFORMS = [
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500', build: (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}` },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600', build: (_text: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { key: 'telegram', label: 'Telegram', icon: Send, color: 'bg-sky-500', build: (text: string, url: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
    { key: 'twitter', label: 'X / Twitter', icon: Share2, color: 'bg-black', build: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { key: 'pinterest', label: 'Pinterest', icon: Image, color: 'bg-red-600', build: (text: string, url: string, img?: string) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}${img ? `&media=${encodeURIComponent(img)}` : ''}` },
    { key: 'instagram', label: 'Instagram (copy)', icon: Instagram, color: 'bg-pink-600', build: () => '' /* IG has no web share — copy + open */ },
  ];

  const openShare = async (task: any, platformKey: string) => {
    const platform = SHARE_PLATFORMS.find(p => p.key === platformKey);
    if (!platform || !task.share_url) return;
    // Generate (or reuse) a tracked smart share URL that shows the banner before redirect
    const smartUrl = (await getOrCreateTaskShareUrl(task.id)) || task.share_url;
    const text = `${task.title}${task.description ? ` — ${task.description}` : ''}`;
    if (platformKey === 'instagram') {
      navigator.clipboard.writeText(`${text}\n${smartUrl}`);
      toast.success('Caption copied! Open Instagram to paste.');
      window.open('https://www.instagram.com/', '_blank');
    } else {
      window.open(platform.build(text, smartUrl, task.flyer_url), '_blank', 'noopener,noreferrer');
    }
  };

  const completeTask = async (task: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (task.creator_id === user.id) {
      toast.error("You can't complete your own task!");
      return;
    }
    if (task.max_completions && task.completions_count >= task.max_completions) {
      toast.error("This task has reached its maximum number of completions.");
      return;
    }
    // Open share platform picker first — user must actually share before reward
    setShareTarget({ task });
  };

  const startVerification = (task: any, platformKey: string) => {
    openShare(task, platformKey);
    setShareTarget(null);

    setVerifyingTaskId(task.id);
    toast.info("⏳ Sharing... Verifying in 15 seconds. Stay on the share page!", { duration: 15000 });

    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setVerifyingTaskId(null); return; }
      const { error } = await supabase.from('task_completions').insert({ task_id: task.id, user_id: user.id });
      if (error) {
        setVerifyingTaskId(null);
        if (error.code === '23505') { toast.info("Already completed!"); return; }
        toast.error("Failed to complete task"); return;
      }
      await supabase.from('tasks').update({ completions_count: (task.completions_count || 0) + 1 }).eq('id', task.id);
      if (task.max_completions && (task.completions_count || 0) + 1 >= task.max_completions) {
        await supabase.from('tasks').update({ is_active: false }).eq('id', task.id);
      }
      const updatedCredits = credits + task.reward_credits;
      await supabase.from('profiles').update({ credits: updatedCredits }).eq('user_id', user.id);
      onCreditsUpdate(updatedCredits);
      setCompletions(prev => [...prev, task.id]);
      setVerifyingTaskId(null);
      toast.success(`🎉 Earned ${task.reward_credits} credits!`);
      fetchTasks();
    }, 15000);
  };

  const totalCost = (parseInt(newTask.reward_credits) || 5) * (parseInt(newTask.max_completions) || 1);

  return (
    <div className="space-y-4">
      {/* Slides at top of task feed */}
      {isEnabled('slides') && <SlideCarousel />}

      {/* Earn summary header */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white p-3.5 flex items-center justify-between shadow-lg shadow-orange-500/20">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">Your Credits</p>
            <p className="text-lg font-black leading-tight">{credits.toLocaleString()}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(!showCreate); setSelectedTaskType(null); }} className="bg-white text-orange-600 hover:bg-white/90 text-xs rounded-full px-4 font-bold shadow-md">
          <Plus className="h-3 w-3 mr-1" />New Task
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Gift className="h-5 w-5 text-orange-500" />Activity Feed
        </h2>
      </div>

      {/* Task Type Selector */}
      {showCreate && !selectedTaskType && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center mb-1">
            <h3 className="text-sm font-bold text-foreground">Create New</h3>
            <p className="text-[10px] text-muted-foreground">Pick a campaign type to launch</p>
          </div>

          {/* Normal Share Task */}
          <Card
            className="border border-border/50 hover:border-orange-500/40 cursor-pointer transition-all hover:shadow-lg hover:shadow-orange-500/5 overflow-hidden group"
            onClick={() => setSelectedTaskType('share')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Share2 className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">📢 Normal Task</h4>
                  <span className="text-[9px] font-bold bg-green-500/15 text-green-600 px-2 py-0.5 rounded-full">FREE</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Credit ads — basic sharing task. Promote on WhatsApp, Telegram & more.</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> All users</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> From 5 credits</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0" />
            </CardContent>
          </Card>

          {/* Premium Social Task */}
          <Card
            className="border overflow-hidden transition-all border-purple-500/30 hover:border-purple-500/50 cursor-pointer hover:shadow-lg hover:shadow-purple-500/10 group"
            onClick={() => {
              // Every user is now a business — go straight to syndicate campaign creation
              if (onNavigate) {
                onNavigate('business-tasks');
                setShowCreate(false);
                setSelectedTaskType(null);
              } else {
                setSelectedTaskType('social');
              }
            }}
          >
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Crown className="h-6 w-6 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">💰 Advanced Task</h4>
                    <span className="text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">PRO</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Paid Syndicate ads — verified promoters share your ad across Facebook, Instagram, TikTok & more for massive reach.
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Megaphone className="h-3 w-3" /> Business only</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> From 20 credits</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors shrink-0" />
              </div>

              <div className="mt-3 rounded-xl bg-purple-500/10 border border-purple-500/20 px-3 py-2">
                <p className="text-[10px] text-purple-400 font-semibold mb-1">🔥 How is this different?</p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Your ad is assigned to <span className="font-semibold text-foreground">verified Syndicate promoters</span></li>
                  <li>Promoters share with <span className="font-semibold text-foreground">proof of posting</span> on real social accounts</li>
                  <li>Get <span className="font-semibold text-foreground">massive organic reach</span> across multiple platforms</li>
                  <li>Track performance with detailed analytics per promoter</li>
                </ul>
                <p className="text-[10px] text-green-400 font-bold mt-1.5 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Tap to launch your campaign
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Banner Advert */}
          <Card
            className="border border-blue-500/30 hover:border-blue-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden group"
            onClick={() => {
              if (onNavigate) {
                onNavigate('ads-create');
                setShowCreate(false);
                setSelectedTaskType(null);
              }
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Megaphone className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">🖼️ Banner Advert</h4>
                  <span className="text-[9px] font-bold bg-blue-500/15 text-blue-500 px-2 py-0.5 rounded-full">CROSS-PLATFORM</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Display banner ads across the GGD network and partner sites for guaranteed views.</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> Pay per duration</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0" />
            </CardContent>
          </Card>

          {/* YouTube Video Task — reuses the credit task system */}
          <Card
            className="border border-red-500/30 hover:border-red-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-red-500/10 overflow-hidden group"
            onClick={() => setSelectedTaskType('youtube')}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Eye className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">▶️ YouTube Video Task</h4>
                  <span className="text-[9px] font-bold bg-red-500/15 text-red-500 px-2 py-0.5 rounded-full">CREDITS</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Promote your YouTube video — users share & watch it to earn credits.</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> From 5 credits</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors shrink-0" />
            </CardContent>
          </Card>

          <Button variant="ghost" onClick={() => setShowCreate(false)} className="w-full text-xs text-muted-foreground h-9 rounded-xl">Cancel</Button>
        </div>
      )}

      {/* Create Task Form */}
      {showCreate && selectedTaskType && (
        <Card className={`border overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 ${
          selectedTaskType === 'social'
            ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent'
            : 'border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-transparent'
        }`}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {selectedTaskType === 'social' ? (
                  <><Crown className="h-4 w-4 text-purple-500" />Premium Social Task</>
                ) : selectedTaskType === 'youtube' ? (
                  <><Eye className="h-4 w-4 text-red-500" />YouTube Video Task</>
                ) : (
                  <><ClipboardList className="h-4 w-4 text-orange-500" />Share Task</>
                )}
              </h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setSelectedTaskType(null)} className="h-7 text-[10px] text-muted-foreground rounded-full px-2">
                  Change type
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setSelectedTaskType(null); }} className="h-7 w-7 p-0 rounded-full">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Credit wallet info */}
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${
              selectedTaskType === 'social' ? 'bg-purple-500/10' : 'bg-orange-500/10'
            }`}>
              <Wallet className={`h-4 w-4 ${selectedTaskType === 'social' ? 'text-purple-500' : 'text-orange-500'}`} />
              <span className="text-xs text-muted-foreground">Your balance:</span>
              <span className={`text-sm font-bold ${selectedTaskType === 'social' ? 'text-purple-500' : 'text-orange-500'}`}>{credits} credits</span>
            </div>

            <Input placeholder="Task title *" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="h-11 text-sm rounded-2xl border-border/40 bg-muted/30 font-medium" />
            <Textarea placeholder="Describe what needs to be done..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={2} className="text-sm rounded-2xl border-border/40 bg-muted/30 resize-none" />

            {/* Flyer / Image Upload */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Task Flyer / Image</Label>
              <input type="file" id="taskFlyerInput" accept="image/*" onChange={handleFlyerSelect} className="hidden" />
              {flyerPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-border/40">
                  <img loading="lazy" src={flyerPreview} alt="Flyer preview" className="w-full h-40 object-cover" />
                  <Button variant="ghost" size="sm" onClick={() => { setFlyerFile(null); setFlyerPreview(null); }} className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full bg-black/50 hover:bg-black/70 text-white">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('taskFlyerInput')?.click()}
                  className="w-full h-24 rounded-2xl border-dashed border-2 border-border/40 bg-muted/20 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5"
                >
                  <Image className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Upload flyer or image</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Credits/Person</Label>
                <div className="relative">
                  <Coins className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${selectedTaskType === 'social' ? 'text-purple-500' : 'text-orange-500'}`} />
                  <Input
                    type="number"
                    min={selectedTaskType === 'social' ? 20 : 1}
                    value={newTask.reward_credits}
                    onChange={e => setNewTask({ ...newTask, reward_credits: e.target.value })}
                    className="h-11 text-sm pl-9 rounded-2xl border-border/40 bg-muted/30 font-medium"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Max People</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={1}
                    value={newTask.max_completions}
                    onChange={e => setNewTask({ ...newTask, max_completions: e.target.value })}
                    className="h-11 text-sm pl-9 rounded-2xl border-border/40 bg-muted/30 font-medium"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">
                  {selectedTaskType === 'youtube' ? 'YouTube URL' : 'Share Link'}
                </Label>
                <div className="flex gap-1 mb-1">
                  <button type="button" onClick={() => setShareLinkMode('manual')} className={`flex-1 text-[10px] py-1 rounded-lg font-semibold ${shareLinkMode === 'manual' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>Paste URL</button>
                  {selectedTaskType !== 'youtube' && (
                    <button type="button" onClick={() => setShareLinkMode('smart')} className={`flex-1 text-[10px] py-1 rounded-lg font-semibold ${shareLinkMode === 'smart' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>My Smart Links</button>
                  )}
                </div>
                {shareLinkMode === 'manual' || selectedTaskType === 'youtube' ? (
                  <Input
                    placeholder={selectedTaskType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                    value={newTask.share_url}
                    onChange={e => setNewTask({ ...newTask, share_url: e.target.value })}
                    className="h-11 text-sm rounded-2xl border-border/40 bg-muted/30"
                  />
                ) : myShortLinks.length > 0 ? (
                  <Select value={newTask.share_url} onValueChange={v => setNewTask({ ...newTask, share_url: v })}>
                    <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-border/40 text-sm"><SelectValue placeholder="Pick smart link" /></SelectTrigger>
                    <SelectContent>
                      {myShortLinks.map((sl: any) => (
                        <SelectItem key={sl.id} value={`${window.location.origin}/r/${sl.slug}`} className="text-xs">
                          {sl.title || sl.slug} ({sl.clicks} clicks)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-[10px] text-muted-foreground bg-muted/30 rounded-xl p-2">No smart links yet. Create one in Smart Links menu.</p>
                )}
              </div>
            </div>

            {/* Cost Summary */}
            <div className={`rounded-xl px-3 py-2.5 border ${selectedTaskType === 'social' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Credits per person</span>
                <span className="font-semibold text-foreground">{parseInt(newTask.reward_credits) || 5}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-muted-foreground">Number of people</span>
                <span className="font-semibold text-foreground">× {parseInt(newTask.max_completions) || 1}</span>
              </div>
              <div className="border-t border-border/30 my-1.5" />
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-foreground">Total Cost</span>
                <span className={`font-black ${selectedTaskType === 'social' ? 'text-purple-500' : 'text-orange-500'}`}>{totalCost} credits</span>
              </div>
            </div>

            {totalCost > credits && (
              <div className="flex items-center gap-2 bg-red-500/10 rounded-xl px-3 py-2">
                <Zap className="h-3.5 w-3.5 text-red-500" />
                <p className="text-xs text-red-500 font-medium">Not enough credits. You need {totalCost} but have {credits}.</p>
              </div>
            )}

            <Button
              onClick={createTask}
              disabled={totalCost > credits || uploadingFlyer}
              className={`w-full text-white text-sm h-12 rounded-2xl font-bold shadow-lg transition-all ${
                selectedTaskType === 'social'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-purple-500/25'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/25'
              }`}
            >
              {uploadingFlyer ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : (
                <><Wallet className="h-4 w-4 mr-2" />Fund & Create — {totalCost} credits</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Share Platform Picker Dialog */}
      <Dialog open={!!shareTarget} onOpenChange={o => { if (!o) setShareTarget(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Where will you share?</DialogTitle>
          </DialogHeader>
          {shareTarget?.task && (
            <div className="space-y-3">
              {shareTarget.task.flyer_url && (
                <img loading="lazy" src={shareTarget.task.flyer_url} alt="" className="w-full h-32 object-cover rounded-xl" />
              )}
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-sm font-bold text-foreground">{shareTarget.task.title}</p>
                {shareTarget.task.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{shareTarget.task.description}</p>}
                <p className="text-[10px] text-blue-500 mt-1 truncate">{shareTarget.task.share_url}</p>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">Pick a platform — sharing opens with title, image & link.</p>
              <div className="grid grid-cols-3 gap-2">
                {SHARE_PLATFORMS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.key}
                      onClick={() => startVerification(shareTarget.task, p.key)}
                      className={`${p.color} text-white rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:opacity-90 active:scale-95 transition`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">{p.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-orange-500 text-center font-medium">⏳ You'll earn credits 15s after sharing.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map(task => {
          const completed = completions.includes(task.id);
          const isPremium = task.task_type === 'social';
          const isVerifying = verifyingTaskId === task.id;
          const spotsLeft = task.max_completions ? task.max_completions - (task.completions_count || 0) : null;
          const isOwner = !!uid && task.creator_id === uid;
          return (
            <Card key={task.id} className={`transition-all ${completed && !isOwner ? 'opacity-60' : 'hover:shadow-md'} ${isOwner ? 'border-blue-500/40 ring-1 ring-blue-500/15' : isPremium ? 'border-purple-500/20' : ''}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    completed
                      ? 'bg-green-100 dark:bg-green-500/20'
                      : isPremium
                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20'
                        : 'bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-500/20 dark:to-yellow-500/20'
                  }`}>
                    {completed ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     isPremium ? <Crown className="h-4 w-4 text-purple-600" /> :
                     <Gift className="h-4 w-4 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-foreground">{task.title}</p>
                      {isPremium && <span className="text-[8px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full">PRO</span>}
                      {isOwner && <span className="text-[8px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">CREATED BY YOU</span>}
                      {isOwner && !task.is_active && <span className="text-[8px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">PAUSED</span>}
                    </div>
                    {task.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-green-500" />
                        <p className="text-[10px] text-green-600 font-bold">+{task.reward_credits} credits</p>
                      </div>
                      {spotsLeft !== null && (
                        <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                          {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                        </span>
                      )}
                    </div>
                  </div>
                  {isOwner ? (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-full">
                      {task.completions_count || 0}/{task.max_completions || '∞'} done
                    </span>
                  ) : isVerifying ? (
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                      <Timer className="h-3 w-3 text-yellow-600 animate-pulse" />
                      <span className="text-[10px] text-yellow-600 font-medium">Verifying...</span>
                    </div>
                  ) : !completed ? (
                    <Button size="sm" className={`h-8 text-xs rounded-full text-white px-4 ${
                      isPremium ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-gradient-to-r from-orange-500 to-red-600'
                    }`} onClick={() => completeTask(task)} disabled={spotsLeft !== null && spotsLeft <= 0}>
                      {task.share_url ? <><Share2 className="h-3 w-3 mr-1" />Share</> : <>Do it <ArrowRight className="h-3 w-3 ml-1" /></>}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-green-600 font-medium bg-green-100 dark:bg-green-500/20 px-2.5 py-1 rounded-full">Done ✓</span>
                  )}
                </div>

                {/* Task flyer image */}
                {task.flyer_url && (
                  <div className="rounded-xl overflow-hidden border border-border/30">
                    <img loading="lazy" src={task.flyer_url} alt={task.title} className="w-full h-32 object-cover" />
                  </div>
                )}

                {/* Preview share page (everyone can preview) */}
                {isOwner ? (
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" className="h-9 text-[11px] rounded-xl" onClick={() => toggleTaskActive(task)}>
                      {task.is_active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 text-[11px] rounded-xl" onClick={async () => {
                      const u = await getOrCreateTaskShareUrl(task.id);
                      if (u) window.open(`/s/${u.split('/').pop()?.split('?')[0]}`, '_blank');
                    }}>
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 text-[11px] rounded-xl text-red-600 border-red-500/30" onClick={() => deleteTask(task)}>
                      Delete
                    </Button>
                  </div>
                ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[10px] rounded-full"
                  onClick={async () => {
                    const u = await getOrCreateTaskShareUrl(task.id);
                    if (u) window.open(`/s/${u.split('/').pop()?.split('?')[0]}`, '_blank');
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />Preview Share Page
                </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No tasks available yet</p>
            <p className="text-xs opacity-60">Create one or check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
