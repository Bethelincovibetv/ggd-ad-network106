import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Plus, Gift, CheckCircle, Share2, Coins, Wallet, ArrowRight, X, Crown, Zap, Lock, Megaphone, Users, Upload, Image, Loader2, Timer, Facebook, Instagram, Send, MessageCircle, Link as LinkIcon, Eye, Sparkles, FileText, Image as ImageIcon, Copy, Check, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";
import SlideCarousel from "@/components/SlideCarousel";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOrCreateTaskShareUrl } from "@/lib/taskShare";
import { playRewardSound } from "@/lib/soundEffects";

interface TaskListProps {
  onCreditsUpdate: (newCredits: number) => void;
  credits: number;
  onNavigate?: (tab: string) => void;
}

type TaskType = 'flyer_link' | 'description' | 'share' | 'youtube' | 'social';

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
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
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
    const completedIds = (comps || []).map(c => c.task_id);
    setCompletions(completedIds);
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
    if (!newTask.title.trim()) { toast.error("Task title required"); return; }
    
    // Type-specific validation
    if (selectedTaskType === 'flyer_link') {
      if (!flyerFile && !flyerPreview) { toast.error("Please upload your main promotional flyer image"); return; }
      if (!newTask.share_url.trim()) { toast.error("Destination share link is required"); return; }
    } else if (selectedTaskType === 'description') {
      if (!newTask.description.trim()) { toast.error("Please provide the marketing text / description copy"); return; }
    } else if (selectedTaskType === 'youtube') {
      if (!newTask.share_url.trim()) { toast.error("YouTube URL required"); return; }
    }

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
      title: newTask.title.trim(),
      description: newTask.description?.trim() || null,
      reward_credits: rewardPerPerson,
      task_type: selectedTaskType || 'share',
      share_url: newTask.share_url?.trim() || null,
      creator_id: user.id,
      funded: true,
      max_completions: maxPeople,
      flyer_url: flyerUrl || null,
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
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500', build: (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(url ? `${text}\n${url}` : text)}` },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600', build: (text: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || window.location.origin)}&quote=${encodeURIComponent(text)}` },
    { key: 'telegram', label: 'Telegram', icon: Send, color: 'bg-sky-500', build: (text: string, url: string) => `https://t.me/share/url?url=${encodeURIComponent(url || window.location.origin)}&text=${encodeURIComponent(text)}` },
    { key: 'twitter', label: 'X / Twitter', icon: Share2, color: 'bg-black', build: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ''}` },
    { key: 'pinterest', label: 'Pinterest', icon: Image, color: 'bg-red-600', build: (text: string, url: string, img?: string) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url || window.location.origin)}&description=${encodeURIComponent(text)}${img ? `&media=${encodeURIComponent(img)}` : ''}` },
    { key: 'instagram', label: 'Instagram (copy)', icon: Instagram, color: 'bg-pink-600', build: () => '' /* IG has no web share — copy + open */ },
  ];

  const openShare = async (task: any, platformKey: string) => {
    const platform = SHARE_PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;
    
    let smartUrl = task.share_url || '';
    if (task.share_url) {
      smartUrl = (await getOrCreateTaskShareUrl(task.id)) || task.share_url;
    }
    const text = [task.title, task.description].filter(Boolean).join('\n\n');
    
    if (platformKey === 'instagram') {
      const copyPayload = smartUrl ? `${text}\n\n${smartUrl}` : text;
      navigator.clipboard.writeText(copyPayload);
      toast.success('Caption & link copied! Open Instagram to paste.');
      window.open('https://www.instagram.com/', '_blank');
    } else {
      window.open(platform.build(text, smartUrl, task.flyer_url), '_blank', 'noopener,noreferrer');
    }
  };

  const copyTaskDescription = (task: any) => {
    const text = [task.title, task.description, task.share_url].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedTaskId(task.id);
    toast.success('📋 Task copy text copied to clipboard!');
    setTimeout(() => setCopiedTaskId(null), 2500);
  };

  const completeTask = async (task: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (completions.includes(task.id)) {
      toast.info("You have already completed this task!");
      return;
    }

    if (!task.is_official && task.creator_id === user.id) {
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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setVerifyingTaskId(null);
          return;
        }

        // 1. Dedicated idempotent handler for official platform tasks
        if (task.is_official) {
          const { data: existingClaims } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'platform_share_100_completed')
            .limit(1);

          if (existingClaims && existingClaims.length > 0) {
            setVerifyingTaskId(null);
            toast.info("100-credit sharing reward has already been claimed!");
            setCompletions(prev => Array.from(new Set([...prev, task.id])));
            return;
          }

          // Persist the completion record idempotently
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: '100 Credits Awarded',
            message: 'You earned 100 promotional credits for sharing GGD Ad Network!',
            type: 'platform_share_100_completed',
            read: true,
          });

          // Fetch fresh credits and add 100
          const { data: prof } = await supabase
            .from('profiles')
            .select('credits')
            .eq('user_id', user.id)
            .maybeSingle();

          const currentCredits = Number(prof?.credits || 0);
          const updatedCredits = currentCredits + 100;

          // Real-time update in database
          await supabase
            .from('profiles')
            .update({ credits: updatedCredits })
            .eq('user_id', user.id);

          // Real-time update in UI state
          onCreditsUpdate(updatedCredits);
          setCompletions(prev => Array.from(new Set([...prev, task.id])));
          setVerifyingTaskId(null);
          playRewardSound();
          toast.success("🎉 Incredible! 100 Credits have been added to your balance!");
          return;
        }

        // 2. Handler for community and advertiser tasks via complete_credit_task RPC
        const { data, error } = await callRpc('complete_credit_task', {
          p_task_id: task.id,
        });

        if (error) {
          if ((error as any).code === '23505') {
            setVerifyingTaskId(null);
            toast.info("Already completed!");
            setCompletions(prev => Array.from(new Set([...prev, task.id])));
            return;
          }

          // Fallback: direct database insertion with unique constraint protection
          const { error: insErr } = await supabase.from('task_completions').insert({
            task_id: task.id,
            user_id: user.id,
          });

          if (insErr) {
            setVerifyingTaskId(null);
            if ((insErr as any).code === '23505') {
              toast.info("Already completed!");
              setCompletions(prev => Array.from(new Set([...prev, task.id])));
              return;
            }
            toast.error(insErr.message || "Failed to complete task");
            return;
          }

          const awarded = task.reward_credits || 5;
          const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle();
          const currentCredits = Number(prof?.credits || 0);
          const updatedCredits = currentCredits + awarded;
          await supabase.from('profiles').update({ credits: updatedCredits }).eq('user_id', user.id);

          await supabase.from('tasks').update({ completions_count: (task.completions_count || 0) + 1 }).eq('id', task.id);
          if (task.max_completions && (task.completions_count || 0) + 1 >= task.max_completions) {
            await supabase.from('tasks').update({ is_active: false }).eq('id', task.id);
          }

          onCreditsUpdate(updatedCredits);
          setCompletions(prev => Array.from(new Set([...prev, task.id])));
          setVerifyingTaskId(null);
          playRewardSound();
          toast.success(`🎉 Earned ${awarded} credits!`);
          fetchTasks();
          return;
        }

        const res = data as any;
        if (res && !res.success) {
          setVerifyingTaskId(null);
          toast.info(res.error || "Could not complete task");
          return;
        }

        const awarded = res?.credits_awarded || task.reward_credits || 5;
        const updatedCredits = credits + awarded;
        onCreditsUpdate(updatedCredits);
        setCompletions(prev => Array.from(new Set([...prev, task.id])));
        setVerifyingTaskId(null);
        playRewardSound();
        toast.success(`🎉 Earned ${awarded} credits!`);
        fetchTasks();
      } catch (err: any) {
        setVerifyingTaskId(null);
        toast.error(err.message || "Task verification failed");
      }
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
          <Gift className="h-5 w-5 text-orange-500" />Credit Tasks (Community Promotion)
        </h2>
      </div>

      {/* Task Type Selector / Creator Options */}
      {showCreate && !selectedTaskType && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center mb-1">
            <h3 className="text-sm font-bold text-foreground">Create Community Credit Task</h3>
            <p className="text-[10px] text-muted-foreground">Choose how community members will promote your campaign for GGD Credits</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Main Flyer & Link Task */}
            <Card
              className="border border-blue-500/30 hover:border-blue-500/60 bg-gradient-to-br from-blue-500/5 to-transparent cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/5 overflow-hidden group"
              onClick={() => setSelectedTaskType('flyer_link')}
            >
              <CardContent className="p-3.5 flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">🖼️ Main Flyer & Link</h4>
                    <span className="text-[8px] font-bold bg-blue-500/15 text-blue-600 px-1.5 py-0.5 rounded-full">POPULAR</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">Members share your main flyer banner image + destination smart link.</p>
                  <div className="flex items-center gap-2 mt-1 text-[9.5px] text-muted-foreground">
                    <span><Coins className="h-2.5 w-2.5 inline mr-0.5 text-blue-500" />From 5 cr</span>
                    <span>• Flyer + Link</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
              </CardContent>
            </Card>

            {/* 2. Description & Text Copy Task */}
            <Card
              className="border border-purple-500/30 hover:border-purple-500/60 bg-gradient-to-br from-purple-500/5 to-transparent cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/5 overflow-hidden group"
              onClick={() => setSelectedTaskType('description')}
            >
              <CardContent className="p-3.5 flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">📝 Description & Copy</h4>
                    <span className="text-[8px] font-bold bg-purple-500/15 text-purple-600 px-1.5 py-0.5 rounded-full">1-CLICK COPY</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">Members copy your exact marketing copy/caption to post and broadcast.</p>
                  <div className="flex items-center gap-2 mt-1 text-[9.5px] text-muted-foreground">
                    <span><Coins className="h-2.5 w-2.5 inline mr-0.5 text-purple-500" />From 5 cr</span>
                    <span>• Copy text required</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-500 transition-colors shrink-0 mt-1" />
              </CardContent>
            </Card>

            {/* 3. Full Promo Package (Flyer + Description + Link) */}
            <Card
              className="border border-orange-500/30 hover:border-orange-500/60 bg-gradient-to-br from-orange-500/5 to-transparent cursor-pointer transition-all hover:shadow-lg hover:shadow-orange-500/5 overflow-hidden group"
              onClick={() => setSelectedTaskType('share')}
            >
              <CardContent className="p-3.5 flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Share2 className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">🚀 Full Promo Package</h4>
                    <span className="text-[8px] font-bold bg-orange-500/15 text-orange-600 px-1.5 py-0.5 rounded-full">ALL-IN-ONE</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">All-in-one broadcast: full flyer image, detailed ad copy, and smart link.</p>
                  <div className="flex items-center gap-2 mt-1 text-[9.5px] text-muted-foreground">
                    <span><Coins className="h-2.5 w-2.5 inline mr-0.5 text-orange-500" />From 5 cr</span>
                    <span>• Full Broadcast</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0 mt-1" />
              </CardContent>
            </Card>

            {/* 4. YouTube Video Task */}
            <Card
              className="border border-red-500/30 hover:border-red-500/60 bg-gradient-to-br from-red-500/5 to-transparent cursor-pointer transition-all hover:shadow-lg hover:shadow-red-500/5 overflow-hidden group"
              onClick={() => setSelectedTaskType('youtube')}
            >
              <CardContent className="p-3.5 flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Eye className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">▶️ YouTube Video Task</h4>
                    <span className="text-[8px] font-bold bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded-full">FEED PLAYER</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">Members watch your video in-app and share it to earn credits.</p>
                  <div className="flex items-center gap-2 mt-1 text-[9.5px] text-muted-foreground">
                    <span><Coins className="h-2.5 w-2.5 inline mr-0.5 text-red-500" />From 5 cr</span>
                    <span>• YouTube URL</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-500 transition-colors shrink-0 mt-1" />
              </CardContent>
            </Card>
          </div>

          <Button variant="ghost" onClick={() => setShowCreate(false)} className="w-full text-xs text-muted-foreground h-9 rounded-xl">Cancel</Button>
        </div>
      )}

      {/* Create Task Form — Same Flow for all options */}
      {showCreate && selectedTaskType && (
        <Card className={`border overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 ${
          selectedTaskType === 'flyer_link'
            ? 'border-blue-500/30 bg-gradient-to-b from-blue-500/5 to-transparent'
            : selectedTaskType === 'description'
            ? 'border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-transparent'
            : selectedTaskType === 'youtube'
            ? 'border-red-500/30 bg-gradient-to-b from-red-500/5 to-transparent'
            : 'border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-transparent'
        }`}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                {selectedTaskType === 'flyer_link' ? (
                  <><ImageIcon className="h-4 w-4 text-blue-500" />Create Main Flyer & Link Task</>
                ) : selectedTaskType === 'description' ? (
                  <><FileText className="h-4 w-4 text-purple-500" />Create Description & Text Copy Task</>
                ) : selectedTaskType === 'youtube' ? (
                  <><Eye className="h-4 w-4 text-red-500" />Create YouTube Video Task</>
                ) : (
                  <><Share2 className="h-4 w-4 text-orange-500" />Create Full Promo Campaign</>
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
              selectedTaskType === 'flyer_link'
                ? 'bg-blue-500/10'
                : selectedTaskType === 'description'
                ? 'bg-purple-500/10'
                : selectedTaskType === 'youtube'
                ? 'bg-red-500/10'
                : 'bg-orange-500/10'
            }`}>
              <Wallet className={`h-4 w-4 ${
                selectedTaskType === 'flyer_link' ? 'text-blue-500' : selectedTaskType === 'description' ? 'text-purple-500' : selectedTaskType === 'youtube' ? 'text-red-500' : 'text-orange-500'
              }`} />
              <span className="text-xs text-muted-foreground">Your balance:</span>
              <span className={`text-sm font-bold ${
                selectedTaskType === 'flyer_link' ? 'text-blue-500' : selectedTaskType === 'description' ? 'text-purple-500' : selectedTaskType === 'youtube' ? 'text-red-500' : 'text-orange-500'
              }`}>{credits} credits</span>
            </div>

            {/* Task Title */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Task Title *</Label>
              <Input
                placeholder={
                  selectedTaskType === 'flyer_link' ? 'e.g., Share 50% Off Promo Flyer on WhatsApp & Facebook' :
                  selectedTaskType === 'description' ? 'e.g., Copy & Post New App Launch Caption' :
                  selectedTaskType === 'youtube' ? 'e.g., Watch GGD Product Demo Video' :
                  'e.g., Share Special Offer on Social Media'
                }
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                className="h-11 text-sm rounded-2xl border-border/40 bg-muted/30 font-medium"
              />
            </div>

            {/* Flyer / Image Upload */}
            {(selectedTaskType === 'flyer_link' || selectedTaskType === 'share' || selectedTaskType === 'description') && (
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">
                  {selectedTaskType === 'flyer_link' ? 'Main Promotional Flyer * (Required)' :
                   selectedTaskType === 'share' ? 'Task Flyer / Banner Image *' :
                   'Optional Flyer / Image Attachment'}
                </Label>
                <input type="file" id="taskFlyerInput" accept="image/*" onChange={handleFlyerSelect} className="hidden" />
                {flyerPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border/40">
                    <img loading="lazy" src={flyerPreview} alt="Flyer preview" className="w-full h-40 object-cover" />
                    <Button variant="ghost" size="sm" onClick={() => { setFlyerFile(null); setFlyerPreview(null); }} className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full bg-black/60 hover:bg-black/80 text-white">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('taskFlyerInput')?.click()}
                    className="w-full h-24 rounded-2xl border-dashed border-2 border-border/40 bg-muted/20 hover:bg-muted/30 flex flex-col items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {selectedTaskType === 'flyer_link' ? 'Upload Main Flyer Image (Required)' : 'Upload flyer or promotional image'}
                    </span>
                  </Button>
                )}
              </div>
            )}

            {/* Description / Copywriting Text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">
                  {selectedTaskType === 'description' ? 'Marketing Description & Text Copy * (What users will copy)' :
                   selectedTaskType === 'share' ? 'Description & Ad Copy *' :
                   'Description & Instructions (Optional)'}
                </Label>
                {newTask.description && (
                  <span className="text-[9px] text-muted-foreground">{newTask.description.length} chars</span>
                )}
              </div>
              <Textarea
                placeholder={
                  selectedTaskType === 'description'
                    ? 'Paste your exact marketing text, sales pitch, or social media caption here. Community members will 1-click copy this exact text to broadcast.'
                    : 'Describe what needs to be done or provide additional promotional context...'
                }
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                rows={selectedTaskType === 'description' ? 4 : 2}
                className="text-sm rounded-2xl border-border/40 bg-muted/30 resize-none"
              />
            </div>

            {/* Destination Link / Mode Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block font-semibold uppercase tracking-wider">Credits/Person</Label>
                <div className="relative">
                  <Coins className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${
                    selectedTaskType === 'flyer_link' ? 'text-blue-500' : selectedTaskType === 'description' ? 'text-purple-500' : selectedTaskType === 'youtube' ? 'text-red-500' : 'text-orange-500'
                  }`} />
                  <Input
                    type="number"
                    min={1}
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
                  {selectedTaskType === 'youtube' ? 'YouTube URL *' : selectedTaskType === 'description' ? 'Destination Link (Optional)' : 'Destination Link *'}
                </Label>
                {selectedTaskType !== 'youtube' && (
                  <div className="flex gap-1 mb-1">
                    <button type="button" onClick={() => setShareLinkMode('manual')} className={`flex-1 text-[9px] py-0.5 rounded-md font-semibold ${shareLinkMode === 'manual' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>URL</button>
                    <button type="button" onClick={() => setShareLinkMode('smart')} className={`flex-1 text-[9px] py-0.5 rounded-md font-semibold ${shareLinkMode === 'smart' ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'}`}>Smart Links</button>
                  </div>
                )}
                {shareLinkMode === 'manual' || selectedTaskType === 'youtube' ? (
                  <Input
                    placeholder={selectedTaskType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                    value={newTask.share_url}
                    onChange={e => setNewTask({ ...newTask, share_url: e.target.value })}
                    className="h-11 text-sm rounded-2xl border-border/40 bg-muted/30"
                  />
                ) : myShortLinks.length > 0 ? (
                  <Select value={newTask.share_url} onValueChange={v => setNewTask({ ...newTask, share_url: v })}>
                    <SelectTrigger className="h-11 rounded-2xl bg-muted/30 border-border/40 text-xs"><SelectValue placeholder="Pick smart link" /></SelectTrigger>
                    <SelectContent>
                      {myShortLinks.map((sl: any) => (
                        <SelectItem key={sl.id} value={`${window.location.origin}/r/${sl.slug}`} className="text-xs">
                          {sl.title || sl.slug} ({sl.clicks} clicks)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-[9px] text-muted-foreground bg-muted/30 rounded-xl p-2">No smart links yet.</p>
                )}
              </div>
            </div>

            {/* Cost Summary */}
            <div className={`rounded-xl px-3 py-2.5 border ${
              selectedTaskType === 'flyer_link' ? 'bg-blue-500/5 border-blue-500/20' :
              selectedTaskType === 'description' ? 'bg-purple-500/5 border-purple-500/20' :
              selectedTaskType === 'youtube' ? 'bg-red-500/5 border-red-500/20' :
              'bg-orange-500/5 border-orange-500/20'
            }`}>
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
                <span className={`font-black ${
                  selectedTaskType === 'flyer_link' ? 'text-blue-600' :
                  selectedTaskType === 'description' ? 'text-purple-600' :
                  selectedTaskType === 'youtube' ? 'text-red-600' :
                  'text-orange-600'
                }`}>{totalCost} credits</span>
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
                selectedTaskType === 'flyer_link'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25'
                  : selectedTaskType === 'description'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-purple-500/25'
                  : selectedTaskType === 'youtube'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/25'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/25'
              }`}
            >
              {uploadingFlyer ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading Image...</> : (
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
            <DialogTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-orange-500" /> Share & Earn Credits
            </DialogTitle>
          </DialogHeader>
          {shareTarget?.task && (
            <div className="space-y-3">
              {shareTarget.task.flyer_url && (
                <img loading="lazy" src={shareTarget.task.flyer_url} alt="" className="w-full h-32 object-cover rounded-xl" />
              )}
              <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                <p className="text-sm font-bold text-foreground">{shareTarget.task.title}</p>
                {shareTarget.task.description && (
                  <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{shareTarget.task.description}</p>
                )}
                {shareTarget.task.share_url && (
                  <p className="text-[10px] text-blue-500 truncate">{shareTarget.task.share_url}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[10px] rounded-lg mt-1 font-semibold"
                  onClick={() => copyTaskDescription(shareTarget.task)}
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  {copiedTaskId === shareTarget.task.id ? 'Copied to Clipboard!' : 'Copy Caption & Link'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">Select platform to share this campaign:</p>
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

      {/* Community & Advertiser Tasks Feed */}
      <div className="space-y-2.5">
        {tasks.map(task => {
          const completed = completions.includes(task.id);
          const isFlyerLink = task.task_type === 'flyer_link';
          const isDescription = task.task_type === 'description';
          const isYouTube = task.task_type === 'youtube' || task.task_type?.startsWith('youtube');
          const isPremium = task.task_type === 'social';
          const isVerifying = verifyingTaskId === task.id;
          const spotsLeft = task.max_completions ? task.max_completions - (task.completions_count || 0) : null;
          const isOwner = !!uid && task.creator_id === uid;
          return (
            <Card key={task.id} className={`transition-all ${completed && !isOwner ? 'opacity-60' : 'hover:shadow-md'} ${
              isOwner ? 'border-blue-500/40 ring-1 ring-blue-500/15' :
              isFlyerLink ? 'border-blue-500/20' :
              isDescription ? 'border-purple-500/20' :
              isYouTube ? 'border-red-500/20' :
              isPremium ? 'border-purple-500/20' : ''
            }`}>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${
                    completed
                      ? 'bg-green-100 dark:bg-green-500/20'
                      : isFlyerLink
                        ? 'bg-blue-100 dark:bg-blue-500/20'
                        : isDescription
                        ? 'bg-purple-100 dark:bg-purple-500/20'
                        : isYouTube
                        ? 'bg-red-100 dark:bg-red-500/20'
                        : 'bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-500/20 dark:to-yellow-500/20'
                  }`}>
                    {completed ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     isFlyerLink ? <ImageIcon className="h-4 w-4 text-blue-600" /> :
                     isDescription ? <FileText className="h-4 w-4 text-purple-600" /> :
                     isYouTube ? <Eye className="h-4 w-4 text-red-600" /> :
                     <Gift className="h-4 w-4 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-foreground leading-tight">{task.title}</p>
                      {isFlyerLink && <span className="text-[8px] font-bold bg-blue-500/15 text-blue-600 px-1.5 py-0.5 rounded-full">🖼️ FLYER & LINK</span>}
                      {isDescription && <span className="text-[8px] font-bold bg-purple-500/15 text-purple-600 px-1.5 py-0.5 rounded-full">📝 COPY TEXT</span>}
                      {isYouTube && <span className="text-[8px] font-bold bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded-full">▶️ VIDEO</span>}
                      {task.task_type === 'share' && <span className="text-[8px] font-bold bg-orange-500/15 text-orange-600 px-1.5 py-0.5 rounded-full">🚀 FULL PROMO</span>}
                      {isOwner && <span className="text-[8px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">CREATED BY YOU</span>}
                      {isOwner && !task.is_active && <span className="text-[8px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">PAUSED</span>}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
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
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-full shrink-0">
                      {task.completions_count || 0}/{task.max_completions || '∞'} done
                    </span>
                  ) : isVerifying ? (
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full shrink-0">
                      <Timer className="h-3 w-3 text-yellow-600 animate-pulse" />
                      <span className="text-[10px] text-yellow-600 font-medium">Verifying...</span>
                    </div>
                  ) : !completed ? (
                    <Button size="sm" className={`h-8 text-xs rounded-full text-white px-3.5 shrink-0 ${
                      isFlyerLink ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                      isDescription ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                      isYouTube ? 'bg-gradient-to-r from-red-500 to-rose-600' :
                      'bg-gradient-to-r from-orange-500 to-red-600'
                    }`} onClick={() => completeTask(task)} disabled={spotsLeft !== null && spotsLeft <= 0}>
                      {isDescription && !task.share_url ? (
                        <><Copy className="h-3 w-3 mr-1" />Copy & Share</>
                      ) : isYouTube ? (
                        <><Eye className="h-3 w-3 mr-1" />Watch & Earn</>
                      ) : (
                        <><Share2 className="h-3 w-3 mr-1" />Share</>
                      )}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-green-600 font-medium bg-green-100 dark:bg-green-500/20 px-2.5 py-1 rounded-full shrink-0">Done ✓</span>
                  )}
                </div>

                {/* Description Text Box with 1-Click Copy */}
                {task.description && (
                  <div className="bg-muted/40 rounded-xl p-2.5 border border-border/40 space-y-1.5">
                    <p className="text-[11.5px] text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                      <span className="text-[9.5px] text-muted-foreground">Promotion text copy</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-purple-600 hover:text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 rounded-md font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTaskDescription(task);
                        }}
                      >
                        {copiedTaskId === task.id ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copiedTaskId === task.id ? 'Copied!' : 'Copy Text'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Task flyer image */}
                {task.flyer_url && (
                  <div className="rounded-xl overflow-hidden border border-border/30">
                    <img loading="lazy" src={task.flyer_url} alt={task.title} className="w-full h-36 object-cover" />
                  </div>
                )}

                {/* Owner controls / preview */}
                {isOwner ? (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-xl" onClick={() => toggleTaskActive(task)}>
                      {task.is_active ? 'Pause' : 'Resume'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-xl" onClick={async () => {
                      const u = await getOrCreateTaskShareUrl(task.id);
                      if (u) window.open(`/s/${u.split('/').pop()?.split('?')[0]}`, '_blank');
                    }}>
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-xl text-red-600 border-red-500/30 hover:bg-red-500/10" onClick={() => deleteTask(task)}>
                      Delete
                    </Button>
                  </div>
                ) : task.share_url ? (
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
                ) : null}
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
