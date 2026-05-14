import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Youtube, Coins, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const WatchVideoAdItem: React.FC<{ ad: WatchAd; claimed: boolean; onClaimed: () => void }> = ({ ad, claimed, onClaimed }) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const ref = useRef<number | null>(null);
  const videoId = extractYouTubeId(ad.youtube_url);

  useEffect(() => () => { if (ref.current) window.clearInterval(ref.current); }, []);

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
      const { data, error } = await supabase.functions.invoke('claim-watch-reward', { body: { ad_id: ad.id } });
      if (error || (data && (data as any).error)) throw new Error(error?.message || (data as any).error);
      toast.success(`+${ad.reward_credits} credits earned!`);
      onClaimed();
    } catch (e: any) {
      toast.error(e.message || 'Failed to claim');
    } finally { setClaiming(false); }
  };

  if (!videoId) return null;
  const pct = Math.min(100, Math.round((elapsed / ad.watch_duration_seconds) * 100));

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black" onClick={start}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={ad.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{ad.title}</p>
            {ad.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{ad.description}</p>}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-orange-500 shrink-0">
            <Coins className="h-3.5 w-3.5" />+{ad.reward_credits}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {claimed ? 'Reward claimed' : ready ? 'Ready to claim!' : `Watch ${ad.watch_duration_seconds - elapsed}s more`}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all" style={{ width: `${claimed ? 100 : pct}%` }} />
        </div>
        {claimed ? (
          <Button disabled variant="outline" className="w-full h-9 text-xs"><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />Already claimed</Button>
        ) : !running ? (
          <Button onClick={start} className="w-full h-9 text-xs bg-gradient-to-r from-red-500 to-pink-600 text-white"><Youtube className="h-3.5 w-3.5 mr-1" />Start watching</Button>
        ) : (
          <Button onClick={claim} disabled={!ready || claiming} className="w-full h-9 text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ready ? 'Claim reward' : 'Keep watching...'}
          </Button>
        )}
      </div>
    </Card>
  );
};

const WatchVideoAds: React.FC = () => {
  const [ads, setAds] = useState<WatchAd[]>([]);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
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
    if (uid && filtered.length > 0) {
      const { data: claims } = await (supabase.from('ad_watch_claims') as any)
        .select('ad_id').eq('user_id', uid).in('ad_id', filtered.map(a => a.id));
      setClaimed(new Set((claims || []).map((c: any) => c.ad_id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (ads.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black flex items-center gap-2">
          <Youtube className="h-4 w-4 text-red-500" /> Watch & Earn
        </h2>
        <span className="text-[10px] text-muted-foreground">{ads.length} videos</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ads.map(a => (
          <WatchVideoAdItem
            key={a.id}
            ad={a}
            claimed={claimed.has(a.id)}
            onClaimed={() => setClaimed(prev => new Set([...prev, a.id]))}
          />
        ))}
      </div>
    </section>
  );
};

export default WatchVideoAds;