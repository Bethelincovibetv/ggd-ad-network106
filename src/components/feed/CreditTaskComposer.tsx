import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Coins, Loader2, Image as ImageIcon, X } from 'lucide-react';
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
  const [goal, setGoal] = useState<string>('flyer_link');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [reward, setReward] = useState('5');
  const [people, setPeople] = useState('10');
  const [watchSeconds, setWatchSeconds] = useState('30');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoal(prefill?.goal || 'flyer_link');
    setTitle(prefill?.title || '');
    setDescription(prefill?.description || '');
    setUrl(prefill?.url || '');
    setFlyerUrl(prefill?.flyer_url || null);
    setFlyerPreview(prefill?.flyer_url || null);
    setFlyerFile(null);
    setReward('5');
    setPeople('10');
    setWatchSeconds('30');
  }, [open, prefill]);

  const active = findGoal(goal);
  const rewardPerPerson = parseInt(reward) || 5;
  const maxPeople = parseInt(people) || 1;
  const totalCost = rewardPerPerson * maxPeople;

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  };

  const uploadFlyerFile = async (userId: string): Promise<string | null> => {
    if (!flyerFile) return flyerUrl;
    setUploadingImage(true);
    try {
      const ext = (flyerFile.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('task-flyers').upload(fileName, flyerFile, { upsert: false, contentType: flyerFile.type });
      if (error) {
        toast.error(`Image upload failed: ${error.message}`);
        return null;
      }
      const { data: urlData } = supabase.storage.from('task-flyers').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch {
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) { toast.error('Give your task a title'); return; }
    if (goal === 'flyer_link' && !url.trim()) { toast.error('Destination link is required'); return; }
    if (goal === 'description' && !description.trim()) { toast.error('Description / copy text is required'); return; }
    if (goal.startsWith('youtube') && !url.trim()) { toast.error('YouTube URL is required'); return; }
    if (credits < totalCost) {
      toast.error(`Insufficient credits! You need ${totalCost} but have ${credits}.`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in'); return; }

    setSaving(true);
    let finalFlyerUrl = flyerUrl;
    if (flyerFile) {
      finalFlyerUrl = await uploadFlyerFile(user.id);
      if (!finalFlyerUrl && flyerFile) {
        setSaving(false);
        return;
      }
    }

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
      share_url: url.trim() || null,
      creator_id: user.id,
      funded: true,
      max_completions: maxPeople,
      flyer_url: finalFlyerUrl || null,
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
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Promotion format</Label>
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
            <Label htmlFor="ct-title" className="text-xs font-bold">Task title *</Label>
            <Input id="ct-title" className="h-11 mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Share Promo Flyer on WhatsApp / Socials" />
          </div>

          {/* Flyer Upload Box */}
          <div>
            <Label className="text-xs font-bold">Flyer / Banner Image {goal === 'flyer_link' ? '(Recommended)' : '(Optional)'}</Label>
            <input type="file" id="composerFlyerInput" accept="image/*" onChange={handleFlyerChange} className="hidden" />
            {flyerPreview ? (
              <div className="relative mt-1 rounded-xl overflow-hidden border border-border/40">
                <img loading="lazy" src={flyerPreview} alt="Flyer preview" className="w-full h-36 object-cover" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFlyerFile(null); setFlyerPreview(null); setFlyerUrl(null); }}
                  className="absolute top-2 right-2 h-7 w-7 p-0 rounded-full bg-black/60 hover:bg-black/80 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('composerFlyerInput')?.click()}
                className="w-full mt-1 h-20 rounded-xl border-dashed border-2 border-border/40 bg-muted/20 hover:bg-muted/30 flex items-center justify-center gap-2"
              >
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload main flyer image</span>
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor="ct-desc" className="text-xs font-bold">
              {goal === 'description' ? 'Marketing Text / Description * (What users will copy & share)' : 'Description & Instructions (optional)'}
            </Label>
            <Textarea
              id="ct-desc"
              className="mt-1"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={goal === 'description' ? 'Paste your exact marketing copy, sales pitch, or social media caption here...' : 'Tell users what to do...'}
            />
          </div>

          <div>
            <Label htmlFor="ct-url" className="text-xs font-bold">
              {active?.urlLabel || 'Destination Link'} {goal === 'description' ? '(optional)' : ''}
            </Label>
            <Input id="ct-url" className="h-11 mt-1" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
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

          <Button onClick={submit} disabled={saving || uploadingImage} className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-bold">
            {saving || uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Publish Credit Task</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditTaskComposer;
