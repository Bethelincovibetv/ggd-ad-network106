import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
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
      <Card className="border-purple-200">
        <CardContent className="p-6 text-center space-y-3">
          <StatusIcon className={`h-12 w-12 mx-auto ${status.color}`} />
          <h3 className="font-bold text-foreground">Syndicate Application</h3>
          <Badge className={`${application.status === 'approved' ? 'bg-green-500' : application.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}>
            {status.label}
          </Badge>
          {application.state && <p className="text-xs text-muted-foreground">State: {application.state}</p>}
          {application.admin_notes && <p className="text-xs text-muted-foreground mt-2">Admin note: {application.admin_notes}</p>}
          {application.status === 'approved' && <p className="text-xs text-green-600">You're now a verified syndicate! Check the Syndicate tab.</p>}
        </CardContent>
      </Card>
    );
  }

  const platforms = [
    { key: 'whatsapp_influence', label: 'WhatsApp', placeholder: 'e.g. 5 groups, 200+ status views' },
    { key: 'facebook_influence', label: 'Facebook', placeholder: 'e.g. 1.2k followers, active in 10 groups' },
    { key: 'telegram_influence', label: 'Telegram', placeholder: 'e.g. Channel with 500 subs' },
    { key: 'tiktok_influence', label: 'TikTok', placeholder: 'e.g. 3k followers, avg 5k views' },
    { key: 'twitter_influence', label: 'X (Twitter)', placeholder: 'e.g. 800 followers' },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-4 text-center space-y-2">
          <Users className="h-10 w-10 mx-auto text-purple-600" />
          <h3 className="font-bold text-foreground">Become a Syndicate</h3>
          <p className="text-xs text-muted-foreground">Earn money by sharing business content on your social media. Tell us about your influence!</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Your Social Influence</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {/* State Selection */}
          <div>
            <Label className="text-xs">Your State *</Label>
            <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
              <option value="">Select your state</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {platforms.map(p => (
            <div key={p.key}>
              <Label className="text-xs">{p.label}</Label>
              <Input value={(form as any)[p.key]} onChange={e => setForm({...form, [p.key]: e.target.value})} className="mt-1" placeholder={p.placeholder} />
            </div>
          ))}
          <Button onClick={submit} disabled={submitting} className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
            Submit Application
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyndicateApplicationForm;
