import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CREDIT_TASK_GOALS, findGoal } from './creditTaskGoals';

export interface CreditTaskPrefill {
  title?: string;
  description?: string;
  url?: string;
  flyer_url?: string | null;
  goal?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  credits: number;
  onCreated: (newCredits: number) => void;
  prefill?: CreditTaskPrefill | null;
}

/** Credit Task creation, available directly inside the Community Feed.
 *  Writes to the same `tasks` table used by the Task Feed — the existing
 *  reward, funding and completion engine is reused unchanged. */
const CreditTaskComposer: React.FC<Props> = ({ open, onClose, credits, onCreated, prefill }) => {
  const [goal, setGoal] = useState<string>('share');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [reward, setReward] = useState('5');
  const [people, setPeople] = useState('10');
  const [watchSeconds, setWatchSeconds] = useState('30');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoal(prefill?.goal || 'share');
    setTitle(prefill?.title || '');
    setDescription(prefill?.description || '');
    setUrl(prefill?.url || '');
    setReward('5');
    setPeople('10');
    setWatchSeconds('30');
  }, [open, prefill]);

  const active = findGoal(goal);
  const rewardPerPerson = parseInt(reward) || 5;
  const maxPeople = parseInt(people) || 1;
  const totalCost = rewardPerPerson * maxPeople;

  const submit = async () => {
    if (!title.trim()) { toast.error('Give your task a title'); return; }
    if (!url.trim()) { toast.error(`${active?.urlLabel || 'Link'} is required`); return; }
    if (credits < totalCost) {
      toast.error(`Insufficient credits! You need ${totalCost} but have ${credits}.`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in'); return; }

    setSaving(true);
    const newCredits = credits - totalCost;
    const { error: creditError } = await supabase.from('profiles').update({ credits: newCredits }).eq('user_id', user.id);
    if (creditError) { setSaving(false); toast.error('Failed to deduct credits'); return; }

    const secs = active?.timed ? Math.max(5, parseInt(watchSeconds) || 30) : 0;
    const fullDescription = [description.trim(), secs ? `⏱ Watch at least ${secs} seconds to earn.` : '']
      .filter(Boolean).join('\n');

    const { error } = await supabase.from('tasks').insert([{
      title: title.trim(),
      description: fullDescription || null,
      reward_credits: rewardPerPerson,
      task_type: goal,
      share_url: url.trim(),
      creator_id: user.id,
      funded: true,
      max_completions: maxPeople,
      flyer_url: prefill?.flyer_url || null,
    }]);
    setSaving(false);

    if (error) {
      await supabase.from('profiles').update({ credits }).eq('user_id', user.id);
      toast.error('Failed to create task');
      return;
    }
    onCreated(newCredits);
    toast.success(`Credit Task published! ${totalCost} credits reserved.`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Coins className="h-5 w-5 text-green-600" /> Create Credit Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Promotion goal</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {CREDIT_TASK_GOALS.map(g => {
                const Icon = g.icon;
                const on = goal === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGoal(g.key)}
                    className={`flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                      on ? 'border-green-500 bg-green-500/10' : 'border-border/60 hover:border-green-500/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${on ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-bold leading-tight">{g.label}</span>
                      <span className="block text-[10px] text-muted-foreground leading-tight">{g.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="ct-title" className="text-xs font-bold">Task title</Label>
            <Input id="ct-title" className="h-11 mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Watch my new product video" />
          </div>

          <div>
            <Label htmlFor="ct-url" className="text-xs font-bold">{active?.urlLabel || 'Link'}</Label>
            <Input id="ct-url" className="h-11 mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <Label htmlFor="ct-desc" className="text-xs font-bold">Instructions (optional)</Label>
            <Textarea id="ct-desc" className="mt-1" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell users exactly what to do" />
          </div>

          {active?.timed && (
            <div>
              <Label htmlFor="ct-secs" className="text-xs font-bold">Required watch duration (seconds)</Label>
              <Input id="ct-secs" type="number" min={5} className="h-11 mt-1" value={watchSeconds} onChange={e => setWatchSeconds(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ct-reward" className="text-xs font-bold">Reward per person</Label>
              <Input id="ct-reward" type="number" min={1} className="h-11 mt-1" value={reward} onChange={e => setReward(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ct-people" className="text-xs font-bold">Number of people</Label>
              <Input id="ct-people" type="number" min={1} className="h-11 mt-1" value={people} onChange={e => setPeople(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Total cost</span>
            <span className="font-black text-green-600">{totalCost} credits</span>
          </div>

          <Button onClick={submit} disabled={saving} className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Publish Credit Task</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditTaskComposer;