import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, XCircle, Loader2, Sparkles, TrendingUp, DollarSign, Zap, MessageCircle, Facebook, Send as SendIcon, Music2, Twitter, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

interface SyndicateApplicationFormProps {
  onApplied: () => void;
}

const SyndicateApplicationForm = ({ onApplied }: SyndicateApplicationFormProps) => {
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    whatsapp_influence: '', facebook_influence: '', telegram_influence: '',
    tiktok_influence: '', twitter_influence: '', state: '',
  });

  useEffect(() => { fetchApplication(); }, []);

  const fetchApplication = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('syndicate_applications').select('*').eq('user_id', user.id).maybeSingle();
    setApplication(data);
    setLoading(false);
  };

  const submit = async () => {
    const hasInfluence = [form.whatsapp_influence, form.facebook_influence, form.telegram_influence, form.tiktok_influence, form.twitter_influence].some(v => v.trim());
    if (!hasInfluence) { toast.error("Please provide at least one platform influence detail"); return; }
    if (!form.state) { toast.error("Please select your state"); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error } = await supabase.from('syndicate_applications').insert({
      user_id: user.id,
      whatsapp_influence: form.whatsapp_influence || null,
      facebook_influence: form.facebook_influence || null,
      telegram_influence: form.telegram_influence || null,
      tiktok_influence: form.tiktok_influence || null,
      twitter_influence: form.twitter_influence || null,
      state: form.state,
    });

    if (error) {
      if (error.code === '23505') toast.error("Application already submitted");
      else toast.error("Failed to submit application");
      setSubmitting(false);
      return;
    }

    toast.success("Application submitted! Admin will review it.");
    onApplied();
    fetchApplication();
    setSubmitting(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  if (application) {
    const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
      pending: { icon: Clock, color: 'text-yellow-600', label: 'Pending Review' },
      approved: { icon: CheckCircle, color: 'text-green-600', label: 'Approved ✓' },
      rejected: { icon: XCircle, color: 'text-red-600', label: 'Rejected' },
    };
    const status = statusConfig[application.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-orange-500/10 via-background to-red-500/10">
        <div className="relative p-6 text-center space-y-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="relative">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
              <StatusIcon className="h-10 w-10 text-white" />
            </div>
            <h3 className="font-bold text-lg text-foreground mt-3">Syndicate Application</h3>
            <Badge className={`mt-2 ${application.status === 'approved' ? 'bg-green-500' : application.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}>
              {status.label}
            </Badge>
            {application.state && <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1"><MapPin className="h-3 w-3" />{application.state}</p>}
            {application.admin_notes && <p className="text-xs text-muted-foreground mt-2 italic">"{application.admin_notes}"</p>}
            {application.status === 'approved' && <p className="text-sm text-green-500 font-medium mt-3">🎉 You're now a verified syndicate! Check the Jobs tab.</p>}
          </div>
        </div>
      </Card>
    );
  }

  const platforms = [
    { key: 'whatsapp_influence', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', placeholder: '5 groups, 200+ status views' },
    { key: 'facebook_influence', label: 'Facebook', icon: Facebook, color: 'text-blue-500', placeholder: '1.2k followers, 10 groups' },
    { key: 'telegram_influence', label: 'Telegram', icon: SendIcon, color: 'text-sky-500', placeholder: 'Channel with 500 subs' },
    { key: 'tiktok_influence', label: 'TikTok', icon: Music2, color: 'text-pink-500', placeholder: '3k followers, avg 5k views' },
    { key: 'twitter_influence', label: 'X (Twitter)', icon: Twitter, color: 'text-foreground', placeholder: '800 followers' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-orange-600 via-red-600 to-orange-700">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,200,100,0.4) 0%, transparent 40%)' }} />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-300/20 blur-3xl" />
        <CardContent className="relative p-6 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
            <Sparkles className="h-3 w-3 text-yellow-200" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Earn From Your Influence</span>
          </div>
          <h3 className="text-2xl font-extrabold text-white drop-shadow-lg">Become a Syndicate</h3>
          <p className="text-xs text-white/90 max-w-xs mx-auto leading-relaxed">
            Get paid to share business content with your followers. The more influence — the more you earn.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { icon: DollarSign, label: 'Per Task', value: '₦50+' },
              { icon: TrendingUp, label: 'Active Jobs', value: 'Daily' },
              { icon: Zap, label: 'Payout', value: 'Fast' },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 p-2">
                <s.icon className="h-4 w-4 mx-auto text-yellow-200" />
                <p className="text-[10px] text-white/80 mt-1">{s.label}</p>
                <p className="text-xs font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">1</span>
            Where are you based?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 outline-none transition"
              value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
              <option value="">Select your state</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardContent>

        <CardHeader className="pb-3 pt-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">2</span>
            Your Social Reach
          </CardTitle>
          <p className="text-[11px] text-muted-foreground pl-8">Fill any platform you're active on — at least one is required.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {platforms.map(p => {
            const Icon = p.icon;
            const filled = (form as any)[p.key]?.trim();
            return (
              <div key={p.key} className={`group relative rounded-xl border transition-all ${filled ? 'border-orange-500/50 bg-orange-500/5' : 'border-border bg-muted/20 hover:border-orange-500/30'}`}>
                <div className="flex items-center gap-3 p-3">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-background flex items-center justify-center ${p.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-bold text-foreground">{p.label}</Label>
                    <Input
                      value={(form as any)[p.key]}
                      onChange={e => setForm({...form, [p.key]: e.target.value})}
                      placeholder={p.placeholder}
                      className="mt-1 h-9 text-xs sm:text-sm border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                    />
                  </div>
                  {filled && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                </div>
              </div>
            );
          })}

          <Button
            onClick={submit}
            disabled={submitting}
            className="w-full h-12 mt-2 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all rounded-xl"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Submit Application</>
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">Reviewed within 24 hours</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyndicateApplicationForm;
