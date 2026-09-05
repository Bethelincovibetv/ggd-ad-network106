import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Copy, 
  Share2, 
  Users, 
  Coins, 
  MessageCircle, 
  Loader2, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Globe, 
  Store, 
  Calendar,
  Search,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ReferralChat from '@/components/ReferralChat';

interface ReferralsPageProps {
  onSelectTab?: (tab: string) => void;
}

const ReferralsPage: React.FC<ReferralsPageProps> = () => {
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [percentage, setPercentage] = useState('2');
  const [members, setMembers] = useState<any[]>([]);
  const [referrer, setReferrer] = useState<any | null>(null);
  const [hasReferrerChecked, setHasReferrerChecked] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [chatPeer, setChatPeer] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => { 
    load(); 
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [{ data: prof }, { data: setting }, { data: refs }, { data: earnings }] = await Promise.all([
        supabase.from('profiles').select('referral_code, referred_by_user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'referral_percentage').maybeSingle(),
        supabase.from('profiles').select('user_id, display_name, email, avatar_url, created_at').eq('referred_by_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('referral_earnings' as any).select('credits_earned').eq('referrer_id', user.id),
      ]);

      let referrerProfile = null;
      if (prof?.referred_by_user_id) {
        const { data: refData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, avatar_url, created_at, business_name, business_phone, business_website, business_logo_url, business_location, business_slug')
          .eq('user_id', prof.referred_by_user_id)
          .maybeSingle();
        referrerProfile = refData;
      }

      setCode(prof?.referral_code || '');
      setPercentage(setting?.value || '2');
      setMembers(refs || []);
      setReferrer(referrerProfile);
      setHasReferrerChecked(true);
      setTotalEarned((earnings || []).reduce((s: number, r: any) => s + (r.credits_earned || 0), 0));
    } catch (err) {
      console.error('Error loading referral data:', err);
      toast.error('Failed to load some referral information');
    } finally {
      setLoading(false);
    }
  };

  const link = `${window.location.origin}/?ref=${code}`;

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareInvite = () => {
    const shareMessage = `Join me on GGD Ad Network! Earn credits and promote your business: ${link}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join GGD Ad Network',
        text: shareMessage,
        url: link,
      }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
    }
  };

  const shareWhatsApp = () => {
    const shareMessage = `🚀 Join me on GGD Ad Network!\n\nEarn daily credits, share ads, or grow your business with verified advertising across Africa.\n\n👉 Join free using my link: ${link}\n🔑 Referral Code: ${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading referral community...</p>
      </div>
    );
  }

  if (chatPeer) {
    return <ReferralChat peerId={chatPeer.id} peerName={chatPeer.name} onBack={() => setChatPeer(null)} />;
  }

  const filteredMembers = members.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.display_name && m.display_name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* SECTION 1: REFERRAL LINK & SHARE TOOLS */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              Your Share Hub
            </span>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-semibold px-2.5 py-1">
              Earn {percentage}% Commission
            </Badge>
          </div>
          <h2 className="text-xl font-black mt-2">Invite Friends, Earn Credits</h2>
          <p className="text-xs text-white/90 mt-1 max-w-md leading-relaxed">
            Every time your referrals fund their wallet or earn credits, you receive a continuous {percentage}% credit bonus.
          </p>
        </div>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Quick Code & Link fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Your Referral Code</span>
                <span className="text-[11px] text-muted-foreground font-normal">Share with signups</span>
              </label>
              <div className="flex gap-2">
                <Input 
                  value={code} 
                  readOnly 
                  className="font-mono font-bold text-sm bg-muted/40 h-11 rounded-xl" 
                />
                <Button 
                  type="button" 
                  onClick={copyCode} 
                  variant="outline" 
                  className="h-11 px-3.5 rounded-xl font-semibold border-border hover:bg-muted"
                >
                  {copiedCode ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Your Direct Link</span>
                <span className="text-[11px] text-muted-foreground font-normal">Auto-applies code</span>
              </label>
              <div className="flex gap-2">
                <Input 
                  value={link} 
                  readOnly 
                  className="text-xs bg-muted/40 h-11 rounded-xl truncate" 
                />
                <Button 
                  type="button" 
                  onClick={copyLink} 
                  variant="outline" 
                  className="h-11 px-3.5 rounded-xl font-semibold border-border hover:bg-muted"
                >
                  {copiedLink ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Share Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Button
              type="button"
              onClick={shareWhatsApp}
              className="h-12 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share to WhatsApp
            </Button>
            <Button
              type="button"
              onClick={shareInvite}
              className="h-12 rounded-xl text-sm font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-sm flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Invite Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: LIVE STATS */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <Card className="border-border shadow-sm">
          <CardContent className="p-3.5 sm:p-4 text-center">
            <div className="inline-flex p-2 rounded-xl bg-orange-500/10 text-orange-600 mb-1.5">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">{members.length}</div>
            <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">Referred Members</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-3.5 sm:p-4 text-center">
            <div className="inline-flex p-2 rounded-xl bg-green-500/10 text-green-600 mb-1.5">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">{totalEarned}</div>
            <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">Credits Earned</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-3.5 sm:p-4 text-center">
            <div className="inline-flex p-2 rounded-xl bg-purple-500/10 text-purple-600 mb-1.5">
              <Percent className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground">{percentage}%</div>
            <div className="text-[11px] font-semibold text-muted-foreground mt-0.5">Commission Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: REFERRER INFORMATION */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-orange-500" />
              Who Referred You
            </span>
            {referrer ? (
              <Badge variant="outline" className="text-xs font-semibold text-orange-600 border-orange-300 bg-orange-50/50 dark:bg-orange-950/30">
                Verified Sponsor
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border">
                Direct Registration
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          {referrer ? (
            <div className="p-4 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-orange-50/70 via-background to-amber-50/50 dark:from-orange-950/20 dark:via-background dark:to-background space-y-3.5">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-orange-400 shadow-sm">
                  <AvatarImage src={referrer.business_logo_url || referrer.avatar_url} />
                  <AvatarFallback className="bg-orange-500 text-white font-bold text-lg">
                    {(referrer.business_name || referrer.display_name || referrer.email || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-base font-bold text-foreground truncate">
                    {referrer.business_name || referrer.display_name || 'GGD Member'}
                  </div>
                  {referrer.business_name && referrer.display_name && (
                    <p className="text-xs text-muted-foreground truncate">{referrer.display_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <span>{referrer.email}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    Joined {referrer.created_at ? new Date(referrer.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Earlier'}
                  </p>
                </div>
                <Button
                  size="sm"
                  type="button"
                  onClick={() => setChatPeer({
                    id: referrer.user_id,
                    name: referrer.business_name || referrer.display_name || referrer.email
                  })}
                  className="h-11 px-4 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm flex items-center gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Message</span>
                </Button>
              </div>

              {/* Extra Referrer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                {referrer.business_phone && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/80 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{referrer.business_phone}</span>
                  </div>
                )}
                {referrer.business_location && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/80 text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{referrer.business_location}</span>
                  </div>
                )}
                {referrer.business_website && (
                  <a
                    href={referrer.business_website.startsWith('http') ? referrer.business_website : `https://${referrer.business_website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/80 text-blue-600 hover:underline sm:col-span-2 truncate"
                  >
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{referrer.business_website}</span>
                  </a>
                )}
                {referrer.business_slug && (
                  <a
                    href={`/business/${referrer.business_slug}`}
                    className="flex items-center justify-center gap-2 p-2 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 font-bold sm:col-span-2 transition"
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>View Official Storefront</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-1.5">
              <div className="inline-flex p-2.5 rounded-full bg-muted text-muted-foreground mb-1">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground">Direct Registration</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                You joined GGD AD Network directly without a sponsor referral code. You are at the root level of your own network!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: HOW SHARE & EARN WORKS */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader 
          className="p-4 sm:p-5 pb-3 cursor-pointer select-none"
          onClick={() => setShowHowItWorks(!showHowItWorks)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-500" />
              How Share & Earn Works
            </CardTitle>
            <span className="text-xs font-semibold text-orange-600 hover:underline">
              {showHowItWorks ? 'Collapse' : 'Show Details'}
            </span>
          </div>
        </CardHeader>
        {showHowItWorks && (
          <CardContent className="p-4 sm:p-5 pt-0 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">1</span>
                  Get Your Link & Code
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your personal referral code and link are automatically generated for your account. Share them on WhatsApp, Facebook, TikTok, or via personal invite.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">2</span>
                  Automatic Attribution
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  When someone visits your link or enters your code during sign-up, the platform immediately registers them under your referral community.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">3</span>
                  Earn {percentage}% Commission
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Whenever members you referred fund their credit wallet or complete tasks, you automatically receive a {percentage}% commission bonus in GGD Credits.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">4</span>
                  Use in Credit Wallet
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Referral earnings are credited directly to your Credit Wallet balance. Use credits to run banner ads, access AI tools, or promote your store.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SECTION 5: YOUR REFERRED COMMUNITY */}
      <Card className="border-border shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Your Community ({members.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                People who signed up using your link or code
              </p>
            </div>
            {members.length > 0 && (
              <div className="relative w-full sm:w-56">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="h-9 text-xs pl-8 rounded-xl bg-muted/40"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 space-y-2.5">
          {members.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No referrals yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Share your link or WhatsApp message above to start building your community and earning credits!
                </p>
              </div>
              <Button
                type="button"
                onClick={shareWhatsApp}
                className="h-11 px-5 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Now
              </Button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No community members found matching "{searchQuery}".
            </div>
          ) : (
            filteredMembers.map((m) => (
              <div 
                key={m.user_id} 
                className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-card hover:border-orange-500/30 transition-colors"
              >
                <Avatar className="h-11 w-11 ring-1 ring-border">
                  <AvatarImage src={m.avatar_url} />
                  <AvatarFallback className="bg-muted text-foreground font-bold">
                    {(m.display_name || m.email || '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">
                    {m.display_name || 'Community Member'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    Joined {m.created_at ? new Date(m.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  type="button"
                  onClick={() => setChatPeer({ id: m.user_id, name: m.display_name || m.email })}
                  className="h-10 px-3.5 rounded-xl font-semibold border-border hover:bg-muted text-foreground flex items-center gap-1.5"
                >
                  <MessageCircle className="h-4 w-4 text-orange-500" />
                  <span className="hidden sm:inline text-xs">Chat</span>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralsPage;
