import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Youtube, Coins, CheckCircle2, Loader2, Clock, Sparkles, Award, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playRewardSound } from '@/lib/soundEffects';
import confetti from 'canvas-confetti';

interface WatchAd {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  watch_duration_seconds: number;
  reward_credits: number;
}

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const WatchVideoAdItem: React.FC<{
  ad: WatchAd;
  claimed: boolean;
  onClaimed: (rewardCredits: number) => void;
}> = ({ ad, claimed, onClaimed }) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const ref = useRef<number | null>(null);
  const videoId = extractYouTubeId(ad.youtube_url);

  useEffect(() => () => {
    if (ref.current) window.clearInterval(ref.current);
  }, []);

  const start = () => {
    if (running || claimed) return;
    setRunning(true);
    ref.current = window.setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const ready = elapsed >= ad.watch_duration_seconds;

  const claim = async () => {
    if (!ready || claimed || claiming) return;
    setClaiming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to claim your video reward.");
        setClaiming(false);
        return;
      }

      // Idempotent database check: has this user already claimed this watch ad?
      const { data: existingClaim } = await (supabase.from('ad_watch_claims') as any)
        .select('id')
        .eq('ad_id', ad.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingClaim) {
        toast.info("Reward already claimed for this video!");
        onClaimed(ad.reward_credits);
        setClaiming(false);
        return;
      }

      // Invoke server edge function or perform atomic claim
      let awarded = false;
      try {
        const { data, error } = await supabase.functions.invoke('claim-watch-reward', {
          body: { ad_id: ad.id }
        });
        if (!error && data && !data.error) {
          awarded = true;
        }
      } catch {
        // Fallback to direct claim if edge function is unreachable
      }

      if (!awarded) {
        // Direct database claim insertion with unique constraint protection
        const { error: claimErr } = await (supabase.from('ad_watch_claims') as any).insert({
          ad_id: ad.id,
          user_id: user.id,
          credits_awarded: ad.reward_credits,
        });

        if (claimErr) {
          if ((claimErr as any).code === '23505') {
            toast.info("Reward already claimed!");
            onClaimed(ad.reward_credits);
            setClaiming(false);
            return;
          }
          throw new Error(claimErr.message || "Could not record claim.");
        }

        // Increment user's profile credits
        const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', user.id).maybeSingle();
        const currentCredits = Number(prof?.credits || 0);
        await supabase.from('profiles').update({ credits: currentCredits + ad.reward_credits }).eq('user_id', user.id);
      }

      // Trigger reward sound and celebration feedback
      playRewardSound();
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (confettiErr) {
        console.warn("Confetti effect skipped:", confettiErr);
      }
      onClaimed(ad.reward_credits);
    } catch (e: any) {
      console.error("Watch reward claim error:", e);
      toast.error(e.message || 'Failed to claim reward. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!videoId) return null;
  const pct = Math.min(100, Math.round((elapsed / ad.watch_duration_seconds) * 100));

  return (
    <Card className="overflow-hidden border border-border/70 hover:border-orange-500/40 transition-colors shadow-xs rounded-2xl">
      <div className="relative aspect-video bg-black" onClick={start}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={ad.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-foreground/75 line-clamp-2 mt-0.5 leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-orange-600 dark:text-orange-400 shrink-0 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
            <Coins className="h-3.5 w-3.5 text-orange-500" />+{ad.reward_credits}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-foreground/80 pt-0.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>
              {claimed
                ? 'Reward claimed'
                : ready
                ? 'Watch complete — ready to claim!'
                : `Watch ${ad.watch_duration_seconds - elapsed}s more`}
            </span>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">{claimed ? '100%' : `${pct}%`}</span>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300"
            style={{ width: `${claimed ? 100 : pct}%` }}
          />
        </div>

        <div className="pt-1">
          {claimed ? (
            <Button
              disabled
              variant="outline"
              className="w-full h-10 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-950/20 border-green-300/40 rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" />
              Reward Already Claimed
            </Button>
          ) : !running ? (
            <Button
              onClick={start}
              className="w-full h-10 text-xs font-bold bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl shadow-xs"
            >
              <Play className="h-4 w-4 mr-1.5 fill-current" />
              Start Watching ({ad.watch_duration_seconds}s)
            </Button>
          ) : (
            <Button
              onClick={claim}
              disabled={!ready || claiming}
              className={`w-full h-10 text-xs font-bold rounded-xl shadow-xs transition-all ${
                ready
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white ring-2 ring-green-500/30'
                  : 'bg-muted text-foreground/60 border border-border cursor-not-allowed'
              }`}
            >
              {claiming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Claiming Reward...
                </>
              ) : ready ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Claim +{ad.reward_credits} Credits
                </>
              ) : (
                `Keep watching (${ad.watch_duration_seconds - elapsed}s remaining)`
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

const WatchVideoAds: React.FC = () => {
  const [ads, setAds] = useState<WatchAd[]>([]);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [celebrationReward, setCelebrationReward] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      let stateFilter: string | null = null;
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('state').eq('user_id', uid).maybeSingle();
        stateFilter = (prof as any)?.state || null;
      }
      const { data } = await (supabase.from('ads') as any)
        .select('id, title, description, youtube_url, watch_duration_seconds, reward_credits, target_state')
        .eq('ad_type', 'watch')
        .eq('approved', true)
        .eq('is_active', true);
      const filtered: WatchAd[] = ((data as any[]) || []).filter(a => !a.target_state || (stateFilter && a.target_state === stateFilter));
      setAds(filtered);

      // Persistent check: load all already claimed video IDs for this user
      if (uid && filtered.length > 0) {
        const { data: claims } = await (supabase.from('ad_watch_claims') as any)
          .select('ad_id')
          .eq('user_id', uid)
          .in('ad_id', filtered.map(a => a.id));
        setClaimed(new Set((claims || []).map((c: any) => c.ad_id)));
      }
    } catch (err) {
      console.warn("Failed to load video ads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading || ads.length === 0) return null;

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-foreground flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" /> Watch & Earn
        </h2>
        <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5">
          {ads.length} Available Video{ads.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ads.map(a => (
          <WatchVideoAdItem
            key={a.id}
            ad={a}
            claimed={claimed.has(a.id)}
            onClaimed={(creditsAwarded) => {
              setClaimed(prev => new Set([...prev, a.id]));
              setCelebrationReward(creditsAwarded);
              try {
                confetti({
                  particleCount: 100,
                  spread: 80,
                  origin: { y: 0.5 },
                });
              } catch (e) {
                console.warn(e);
              }
            }}
          />
        ))}
      </div>

      {/* Celebratory Completion Modal */}
      <Dialog open={celebrationReward !== null} onOpenChange={(open) => { if (!open) setCelebrationReward(null); }}>
        <DialogContent className="sm:max-w-[400px] p-6 text-center rounded-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 animate-bounce">
            <Award className="h-9 w-9" />
          </div>

          <DialogHeader className="space-y-2 mt-4 text-center">
            <DialogTitle className="text-2xl font-black text-foreground">
              Congratulations! 🎉
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground/80 font-medium">
              You watched the video and completed the watch requirements!
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
            <p className="text-xs uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400">Reward Added</p>
            <p className="text-3xl font-black text-foreground mt-1">+{celebrationReward} Credits</p>
            <p className="text-xs text-muted-foreground mt-1">Credited directly to your GGD Wallet</p>
          </div>

          <Button
            onClick={() => setCelebrationReward(null)}
            className="w-full h-11 text-sm font-bold rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md"
          >
            Awesome! Continue
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default WatchVideoAds;
