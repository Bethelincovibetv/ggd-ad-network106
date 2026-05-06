import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Plus, Gift, CheckCircle, Share2, Coins, Wallet, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TaskListProps {
  onCreditsUpdate: (newCredits: number) => void;
  credits: number;
}

const TaskList = ({ onCreditsUpdate, credits }: TaskListProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completions, setCompletions] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', reward_credits: '5', share_url: '' });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: tasksData } = await supabase.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false });
    setTasks(tasksData || []);
    const { data: comps } = await supabase.from('task_completions').select('task_id').eq('user_id', user.id);
    setCompletions((comps || []).map(c => c.task_id));
    const { data: profile } = await supabase.from('profiles').select('referral_code').eq('user_id', user.id).single();
    if (profile?.referral_code) setReferralCode(profile.referral_code);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) { toast.error("Title required"); return; }
    const rewardAmount = parseInt(newTask.reward_credits) || 5;

    // Check if user has enough credits
    if (credits < rewardAmount) {
      toast.error(`Insufficient credits! You need ${rewardAmount} credits but have ${credits}.`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deduct credits from creator's wallet
    const newCredits = credits - rewardAmount;
    const { error: creditError } = await supabase.from('profiles').update({ credits: newCredits }).eq('user_id', user.id);
    if (creditError) { toast.error("Failed to deduct credits"); return; }

    const { error } = await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      reward_credits: rewardAmount,
      task_type: 'share',
      share_url: newTask.share_url || null,
      creator_id: user.id,
      funded: true,
    });
    if (error) {
      // Refund credits on failure
      await supabase.from('profiles').update({ credits }).eq('user_id', user.id);
      toast.error("Failed to create task");
      return;
    }

    onCreditsUpdate(newCredits);
    toast.success(`Task created! ${rewardAmount} credits deducted from your wallet.`);
    setNewTask({ title: '', description: '', reward_credits: '5', share_url: '' });
    setShowCreate(false);
    fetchTasks();
  };

  const completeTask = async (task: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Don't let creator complete own task
    if (task.creator_id === user.id) {
      toast.error("You can't complete your own task!");
      return;
    }

    if (task.share_url) {
      window.open(`https://wa.me/?text=${encodeURIComponent(task.share_url)}`, '_blank');
    }
    const { error } = await supabase.from('task_completions').insert({ task_id: task.id, user_id: user.id });
    if (error) {
      if (error.code === '23505') { toast.info("Already completed!"); return; }
      toast.error("Failed to complete task"); return;
    }
    const updatedCredits = credits + task.reward_credits;
    await supabase.from('profiles').update({ credits: updatedCredits }).eq('user_id', user.id);
    onCreditsUpdate(updatedCredits);
    setCompletions(prev => [...prev, task.id]);
    toast.success(`🎉 Earned ${task.reward_credits} credits!`);
  };

  const shareReferral = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Join GGD Ad Network', text: `Use my referral code ${referralCode} to join GGD Ad Network!`, url: link });
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Gift className="h-5 w-5 text-orange-500" />Earn Credits
        </h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs rounded-full px-4">
          <Plus className="h-3 w-3 mr-1" />Create Task
        </Button>
      </div>

      {/* Create Task Form */}
      {showCreate && (
        <Card className="border border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-transparent overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-500" />New Task
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} className="h-7 w-7 p-0 rounded-full">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Credit wallet info */}
            <div className="flex items-center gap-2 bg-orange-500/10 rounded-xl px-3 py-2">
              <Wallet className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Your balance:</span>
              <span className="text-sm font-bold text-orange-500">{credits} credits</span>
            </div>

            <Input placeholder="Task title *" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="h-10 text-sm rounded-xl border-border/50 bg-background/50" />
            <Textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={2} className="text-sm rounded-xl border-border/50 bg-background/50" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Reward Credits</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-500" />
                  <Input type="number" value={newTask.reward_credits} onChange={e => setNewTask({ ...newTask, reward_credits: e.target.value })} className="h-10 text-sm pl-9 rounded-xl border-border/50 bg-background/50" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Share URL</Label>
                <Input placeholder="https://..." value={newTask.share_url} onChange={e => setNewTask({ ...newTask, share_url: e.target.value })} className="h-10 text-sm rounded-xl border-border/50 bg-background/50" />
              </div>
            </div>

            {parseInt(newTask.reward_credits) > credits && (
              <p className="text-xs text-red-500 font-medium">⚠️ Not enough credits. You need {parseInt(newTask.reward_credits) || 5} but have {credits}.</p>
            )}

            <Button onClick={createTask} disabled={parseInt(newTask.reward_credits) > credits} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm h-11 rounded-xl font-semibold">
              <Wallet className="h-4 w-4 mr-2" />
              Fund & Create Task — {parseInt(newTask.reward_credits) || 5} credits
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Referral Card */}
      {referralCode && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-500/10 dark:to-yellow-500/10 overflow-hidden">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-sm text-foreground">🎁 Invite & Earn</h3>
            <p className="text-[11px] text-muted-foreground">Share your referral code and earn 20 credits for each friend who joins!</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background/80 px-3 py-1.5 rounded-xl border text-orange-600 font-mono">{referralCode}</code>
              <Button size="sm" onClick={shareReferral} className="bg-orange-500 text-white text-xs rounded-full px-4">
                <Share2 className="h-3 w-3 mr-1" />Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.map(task => {
          const completed = completions.includes(task.id);
          return (
            <Card key={task.id} className={`transition-all ${completed ? 'opacity-60' : 'hover:shadow-md'}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${completed ? 'bg-green-100 dark:bg-green-500/20' : 'bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-500/20 dark:to-yellow-500/20'}`}>
                  {completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Gift className="h-4 w-4 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{task.title}</p>
                  {task.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{task.description}</p>}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Coins className="h-3 w-3 text-green-500" />
                    <p className="text-[10px] text-green-600 font-bold">+{task.reward_credits} credits</p>
                  </div>
                </div>
                {!completed ? (
                  <Button size="sm" className="h-8 text-xs rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-4" onClick={() => completeTask(task)}>
                    {task.share_url ? <><Share2 className="h-3 w-3 mr-1" />Share</> : <>Do it <ArrowRight className="h-3 w-3 ml-1" /></>}
                  </Button>
                ) : (
                  <span className="text-[10px] text-green-600 font-medium bg-green-100 dark:bg-green-500/20 px-2.5 py-1 rounded-full">Done ✓</span>
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
