import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, CheckCircle, Share2, ExternalLink } from "lucide-react";
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

  const completeTask = async (task: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Open share URL if provided
    if (task.share_url) {
      const platforms = [
        { name: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(task.share_url)}` },
        { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(task.share_url)}` },
        { name: 'Twitter/X', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(task.share_url)}` },
      ];
      const choice = platforms[0]; // Default to WhatsApp
      window.open(choice.url, '_blank');
    }

    const { error } = await supabase.from('task_completions').insert({ task_id: task.id, user_id: user.id });
    if (error) {
      if (error.code === '23505') { toast.info("Already completed!"); return; }
      toast.error("Failed to complete task"); return;
    }

    const newCredits = credits + task.reward_credits;
    await supabase.from('profiles').update({ credits: newCredits }).eq('user_id', user.id);
    onCreditsUpdate(newCredits);
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
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <Gift className="h-5 w-5 text-orange-500" />Earn Credits
      </h2>

      {/* Referral Card */}
      {referralCode && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-bold text-sm text-foreground">🎁 Invite & Earn</h3>
            <p className="text-[11px] text-muted-foreground">Share your referral code and earn 20 credits for each friend who joins!</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white px-3 py-1.5 rounded-lg border text-orange-600 font-mono">{referralCode}</code>
              <Button size="sm" onClick={shareReferral} className="bg-orange-500 text-white text-xs">
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
            <Card key={task.id} className={completed ? 'opacity-60' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-full ${completed ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {completed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Gift className="h-4 w-4 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{task.title}</p>
                  {task.description && <p className="text-[10px] text-muted-foreground">{task.description}</p>}
                  <p className="text-[10px] text-green-600 font-bold">+{task.reward_credits} credits</p>
                </div>
                {!completed ? (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => completeTask(task)}>
                    {task.share_url ? <><Share2 className="h-3 w-3 mr-1" />Share</> : 'Complete'}
                  </Button>
                ) : (
                  <span className="text-[10px] text-green-600 font-medium">Done ✓</span>
                )}
              </CardContent>
            </Card>
          );
        })}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks available yet. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
