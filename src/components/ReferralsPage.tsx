import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Share2, Users, Coins, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReferralChat from '@/components/ReferralChat';

const ReferralsPage = () => {
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [percentage, setPercentage] = useState('2');
  const [members, setMembers] = useState<any[]>([]);
  const [referrer, setReferrer] = useState<any | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);
  const [chatPeer, setChatPeer] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const [{ data: prof }, { data: setting }, { data: refs }, { data: earnings }] = await Promise.all([
      supabase.from('profiles').select('referral_code, referred_by_user_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('app_settings').select('value').eq('key', 'referral_percentage').maybeSingle(),
      supabase.from('profiles').select('user_id, display_name, email, avatar_url, created_at').eq('referred_by_user_id', user.id),
      supabase.from('referral_earnings' as any).select('credits_earned').eq('referrer_id', user.id),
    ]);

    const { data: referrerProfile } = prof?.referred_by_user_id
      ? await supabase.from('profiles').select('user_id, display_name, email, avatar_url, created_at').eq('user_id', prof.referred_by_user_id).maybeSingle()
      : { data: null } as any;

    setCode(prof?.referral_code || '');
    setPercentage(setting?.value || '2');
    setMembers(refs || []);
    setReferrer(referrerProfile || null);
    setTotalEarned((earnings || []).reduce((s: number, r: any) => s + (r.credits_earned || 0), 0));
    setLoading(false);
  };

  const link = `${window.location.origin}/?ref=${code}`;
  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success('Copied!'); };
  const share = () => {
    const msg = `Join me on GGD Ad Network! Use my link: ${link}`;
    if (navigator.share) navigator.share({ title: 'Join GGD', text: msg, url: link }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (chatPeer) {
    return <ReferralChat peerId={chatPeer.id} peerName={chatPeer.name} onBack={() => setChatPeer(null)} />;
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader><CardTitle className="text-lg">Your Referral Link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={code} readOnly />
            <Button size="sm" variant="outline" onClick={() => copy(code)}><Copy className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2">
            <Input value={link} readOnly className="text-xs" />
            <Button size="sm" variant="outline" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button>
          </div>
          <Button onClick={share} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <Share2 className="h-4 w-4 mr-2" /> Share Invite
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Earn <strong>{percentage}%</strong> of credits whenever your referrals fund or earn credits.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <div className="text-2xl font-bold">{members.length}</div>
          <div className="text-xs text-muted-foreground">Referred</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Coins className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <div className="text-2xl font-bold">{totalEarned}</div>
          <div className="text-xs text-muted-foreground">Credits Earned</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Your Community</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {referrer && (
            <div className="flex items-center gap-3 p-2 rounded-lg border border-orange-200 bg-orange-50/60">
              <Avatar className="h-9 w-9">
                <AvatarImage src={referrer.avatar_url} />
                <AvatarFallback>{(referrer.display_name || referrer.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{referrer.display_name || referrer.email}</div>
                <div className="text-xs text-muted-foreground">Referred you</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setChatPeer({ id: referrer.user_id, name: referrer.display_name || referrer.email })}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          {members.length === 0 && !referrer && <p className="text-sm text-muted-foreground text-center py-6">No referrals yet. Share your link!</p>}
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg border">
              <Avatar className="h-9 w-9">
                <AvatarImage src={m.avatar_url} />
                <AvatarFallback>{(m.display_name || m.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.display_name || m.email}</div>
                <div className="text-xs text-muted-foreground">Joined {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setChatPeer({ id: m.user_id, name: m.display_name || m.email })}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralsPage;
