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
      ? await supabase.from('profiles').select('user_id, display_name, email, avatar_url, created_at, business_name, business_phone, business_website, business_logo_url, business_location, business_slug').eq('user_id', prof.referred_by_user_id).maybeSingle()
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
            <div className="p-3 rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-red-50 space-y-2">
              <div className="text-[10px] uppercase font-bold text-orange-700 tracking-wider">Referred you</div>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-orange-300">
                  <AvatarImage src={referrer.business_logo_url || referrer.avatar_url} />
                  <AvatarFallback>{(referrer.business_name || referrer.display_name || referrer.email || '?').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{referrer.business_name || referrer.display_name || referrer.email}</div>
                  {referrer.business_name && referrer.display_name && (
                    <div className="text-[11px] text-muted-foreground truncate">{referrer.display_name}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground truncate">{referrer.email}</div>
                </div>
                <Button size="sm" onClick={() => setChatPeer({ id: referrer.user_id, name: referrer.business_name || referrer.display_name || referrer.email })} className="bg-orange-500 hover:bg-orange-600">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {referrer.business_phone && <div className="bg-white/60 rounded px-2 py-1"><span className="font-semibold">📞</span> {referrer.business_phone}</div>}
                {referrer.business_location && <div className="bg-white/60 rounded px-2 py-1"><span className="font-semibold">📍</span> {referrer.business_location}</div>}
                {referrer.business_website && <a href={referrer.business_website} target="_blank" rel="noopener noreferrer" className="bg-white/60 rounded px-2 py-1 col-span-2 truncate text-blue-600 underline">🌐 {referrer.business_website}</a>}
                {referrer.business_slug && <a href={`/business/${referrer.business_slug}`} className="bg-orange-500 text-white rounded px-2 py-1 col-span-2 text-center font-semibold">View Business Page</a>}
              </div>
              <div className="text-[10px] text-muted-foreground">Joined {new Date(referrer.created_at).toLocaleDateString()}</div>
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
