import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Crown, Loader2, Check, TrendingUp, DollarSign, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import coOwnerBanner from '@/assets/co-owner-banner.jpg';

interface CoOwnerUpgradeFormProps {
  onUpgraded: () => void;
  credits: number;
}

const CoOwnerUpgradeForm = ({ onUpgraded, credits }: CoOwnerUpgradeFormProps) => {
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cost, setCost] = useState(100);
  const [percentage, setPercentage] = useState(5);
  const [exchangeRate, setExchangeRate] = useState(100);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: app }, { data: settings }] = await Promise.all([
        (supabase.from('co_owner_applications' as any) as any).select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('app_settings').select('*'),
      ]);

      if (app) setExisting(app);
      settings?.forEach((s: any) => {
        if (s.key === 'vendor_upgrade_credits') setCost(parseInt(s.value));
        if (s.key === 'co_owner_percentage') setPercentage(parseFloat(s.value));
        if (s.key === 'credit_exchange_rate') setExchangeRate(parseInt(s.value));
      });
      setLoading(false);
    };
    load();
  }, []);

  const submit = async () => {
    if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_name.trim()) {
      toast.error("All bank details are required");
      return;
    }
    if (credits < cost) {
      toast.error(`You need ${cost} credits. You have ${credits}.`);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Deduct credits
      await supabase.from('profiles').update({ credits: credits - cost }).eq('user_id', user.id);

      // Create application
      await (supabase.from('co_owner_applications' as any) as any).insert({
        user_id: user.id,
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_name: form.account_name,
        earning_percentage: percentage,
      });

      // Notify admin
      const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin' as any);
      if (admins?.length) {
        const notifications = admins.map((a: any) => ({
          user_id: a.user_id,
          title: '🤝 New Co-Owner Application',
          message: `A user has applied to become a co-owner. Bank: ${form.bank_name}, Account: ${form.account_number}, Name: ${form.account_name}`,
          type: 'co_owner',
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast.success("🎉 Co-Owner application submitted! Awaiting admin approval.");
      setExisting({ ...form, status: 'pending', earning_percentage: percentage, total_earnings: 0 });
      onUpgraded();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const upgradeWithPaystack = async () => {
    const nairaAmount = cost * exchangeRate;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_name.trim()) {
        toast.error("Fill in all bank details first");
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: {
          amount: nairaAmount, email: user.email,
          type: 'co_owner_upgrade',
          metadata: { 
            callback_url: window.location.origin,
            bank_name: form.bank_name,
            account_number: form.account_number,
            account_name: form.account_name,
          },
        },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        toast.success('Complete payment in Paystack to proceed!');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  // Already applied
  if (existing) {
    return (
      <div className="space-y-4">
        <img src={coOwnerBanner} alt="Co-Owner" className="w-full rounded-xl" loading="lazy" width={1024} height={512} />
        <Card className={`border-2 ${existing.status === 'approved' ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50' : existing.status === 'rejected' ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50'}`}>
          <CardContent className="p-5 text-center space-y-3">
            {existing.status === 'approved' ? (
              <>
                <Crown className="h-12 w-12 mx-auto text-yellow-500" />
                <h3 className="text-xl font-bold text-foreground">You're a Co-Owner! 🤝</h3>
                <p className="text-sm text-muted-foreground">You earn {existing.earning_percentage}% of all platform revenue automatically.</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Card className="bg-green-100 border-green-200">
                    <CardContent className="p-3 text-center">
                      <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-1" />
                      <p className="text-xs text-muted-foreground">Total Earnings</p>
                      <p className="text-lg font-bold text-green-700">₦{(existing.total_earnings || 0).toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-100 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                      <p className="text-xs text-muted-foreground">Revenue Share</p>
                      <p className="text-lg font-bold text-blue-700">{existing.earning_percentage}%</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="bg-white/80 rounded-lg p-3 text-left space-y-1 mt-3">
                  <p className="text-xs text-muted-foreground">Bank: <span className="font-semibold text-foreground">{existing.bank_name}</span></p>
                  <p className="text-xs text-muted-foreground">Account: <span className="font-semibold text-foreground">{existing.account_number}</span></p>
                  <p className="text-xs text-muted-foreground">Name: <span className="font-semibold text-foreground">{existing.account_name}</span></p>
                </div>
                <p className="text-xs text-green-600 flex items-center justify-center gap-1"><Shield className="h-3 w-3" /> Payments are automatically sent to your bank</p>
              </>
            ) : existing.status === 'rejected' ? (
              <>
                <h3 className="text-lg font-bold text-red-700">Application Rejected</h3>
                <p className="text-sm text-muted-foreground">{existing.admin_notes || 'Your application was not approved. Please contact support.'}</p>
              </>
            ) : (
              <>
                <Clock className="h-10 w-10 mx-auto text-yellow-500 animate-pulse" />
                <h3 className="text-lg font-bold text-foreground">Application Pending</h3>
                <p className="text-sm text-muted-foreground">Your co-owner application is being reviewed by the admin. You'll be notified once approved.</p>
                <div className="bg-white/80 rounded-lg p-3 text-left space-y-1">
                  <p className="text-xs text-muted-foreground">Bank: <span className="font-semibold">{existing.bank_name}</span></p>
                  <p className="text-xs text-muted-foreground">Account: <span className="font-semibold">{existing.account_number}</span></p>
                  <p className="text-xs text-muted-foreground">Name: <span className="font-semibold">{existing.account_name}</span></p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <img src={coOwnerBanner} alt="Become a Co-Owner" className="w-full rounded-xl" loading="lazy" width={1024} height={512} />
      
      <Card className="border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-3 text-center">
          <span className="text-sm font-bold text-white">👑 BECOME A PLATFORM CO-OWNER</span>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="text-center space-y-2">
            <Crown className="h-12 w-12 mx-auto text-yellow-500" />
            <h3 className="text-xl font-bold text-foreground">Co-Owner Partnership</h3>
            <p className="text-3xl font-black text-yellow-600">{cost} <span className="text-sm font-normal">credits</span></p>
            <p className="text-xs text-muted-foreground">or ₦{(cost * exchangeRate).toLocaleString()} via Paystack</p>
          </div>

          <div className="bg-white/80 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-sm text-foreground">What you get:</h4>
            <ul className="space-y-2">
              {[
                { icon: DollarSign, text: `Earn ${percentage}% of ALL platform revenue` },
                { icon: TrendingUp, text: 'Automatic payments to your bank account' },
                { icon: Crown, text: 'Co-Owner badge and exclusive status' },
                { icon: Shield, text: 'Paystack sub-account integration' },
                { icon: Check, text: 'Real-time earnings tracking dashboard' },
                { icon: Check, text: 'No withdrawals needed — auto-payout!' },
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <f.icon className="h-4 w-4 text-yellow-500 shrink-0" />{f.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground">Your Bank Details</h4>
            <p className="text-xs text-muted-foreground">Enter your bank details for automatic payment via Paystack sub-account</p>
            <div>
              <Label className="text-xs">Bank Name *</Label>
              <Input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className="mt-1" placeholder="e.g. GTBank, Access Bank" />
            </div>
            <div>
              <Label className="text-xs">Account Number *</Label>
              <Input value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} className="mt-1" placeholder="10-digit account number" maxLength={10} />
            </div>
            <div>
              <Label className="text-xs">Account Name *</Label>
              <Input value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} className="mt-1" placeholder="Name on your bank account" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button onClick={submit} disabled={submitting} className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-sm h-11">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
              Apply with {cost} Credits
            </Button>
            <Button onClick={upgradeWithPaystack} variant="outline" disabled={submitting} className="w-full text-sm">
              Pay ₦{(cost * exchangeRate).toLocaleString()} via Paystack
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoOwnerUpgradeForm;
