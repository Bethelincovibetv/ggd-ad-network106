import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Users, DollarSign, Smartphone, Globe, ArrowLeft, CheckCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { useNavigate } from 'react-router-dom';
import ggdLogo from '@/assets/ggd-logo.png';

const SyndicateRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'info' | 'register' | 'application' | 'done'>('info');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authData, setAuthData] = useState({ email: '', password: '', displayName: '' });
  const [form, setForm] = useState({
    whatsapp_influence: '', facebook_influence: '', telegram_influence: '',
    tiktok_influence: '', twitter_influence: '', state: '',
  });

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStep('application');
    });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authData.email || !authData.password) { toast.error("Please fill in all fields"); return; }
    if (authData.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setIsLoading(true);
    try {
      // Try sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authData.email, password: authData.password,
      });
      if (!signInError) {
        toast.success("Logged in! Now complete your syndicate application.");
        setStep('application');
        setIsLoading(false);
        return;
      }

      // Sign up
      const { error } = await supabase.auth.signUp({
        email: authData.email, password: authData.password,
        options: { data: { display_name: authData.displayName || authData.email.split('@')[0] } },
      });
      if (error) throw error;
      toast.success("Account created! Check your email to verify, then come back to complete your application.");
      setStep('application');
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplication = async () => {
    const hasInfluence = [form.whatsapp_influence, form.facebook_influence, form.telegram_influence, form.tiktok_influence, form.twitter_influence].some(v => v.trim());
    if (!hasInfluence) { toast.error("Provide at least one platform influence detail"); return; }
    if (!form.state) { toast.error("Please select your state"); return; }

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in first"); setStep('register'); setIsLoading(false); return; }

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
      setIsLoading(false);
      return;
    }

    toast.success("Application submitted! Admin will review it.");
    setStep('done');
    setIsLoading(false);
  };

  const benefits = [
    { icon: DollarSign, title: "Earn Daily", desc: "Get paid for every task you complete" },
    { icon: Smartphone, title: "Work From Phone", desc: "No laptop needed — just your mobile" },
    { icon: Globe, title: "Work Anywhere", desc: "Share content from wherever you are" },
    { icon: Star, title: "Grow Your Income", desc: "Top syndicates earn premium rates" },
  ];

  const platforms = [
    { key: 'whatsapp_influence', label: 'WhatsApp', placeholder: 'e.g. 5 groups, 200+ status views' },
    { key: 'facebook_influence', label: 'Facebook', placeholder: 'e.g. 1.2k followers, active in 10 groups' },
    { key: 'telegram_influence', label: 'Telegram', placeholder: 'e.g. Channel with 500 subs' },
    { key: 'tiktok_influence', label: 'TikTok', placeholder: 'e.g. 3k followers, avg 5k views' },
    { key: 'twitter_influence', label: 'X (Twitter)', placeholder: 'e.g. 800 followers' },
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
            <span className="font-black text-xl text-white">GGD Syndicate</span>
          </div>
          <button onClick={() => navigate('/')} className="text-white/80 hover:text-white text-sm flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 max-w-md space-y-5">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-yellow-300/15 blur-2xl" />
          <Users className="h-12 w-12 mx-auto mb-3 drop-shadow-lg relative" />
          <h1 className="text-2xl font-black relative">Become a Syndicate</h1>
          <p className="text-sm opacity-80 mt-1 relative">Turn your social media into daily income</p>
        </div>

        {step === 'info' && (
          <>
            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((b, i) => (
                <Card key={i} className="bg-[#222] border-[#333] hover:border-purple-500/40 transition-colors">
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="p-2 bg-purple-500/10 rounded-xl w-fit mx-auto">
                      <b.icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <p className="text-xs font-bold text-white">{b.title}</p>
                    <p className="text-[10px] text-gray-400">{b.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-[#222] border-[#333]">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">How It Works</h3>
                {[
                  "Register your account below",
                  "Tell us about your social media reach",
                  "Admin reviews & approves your application",
                  "Start accepting tasks and earning money!",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="min-w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400">{i + 1}</div>
                    <p className="text-xs text-gray-300">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={() => setStep('register')} className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white py-6 text-base font-bold rounded-xl hover:scale-105 transition-transform">
              Register as Syndicate <Users className="ml-2 h-5 w-5" />
            </Button>
          </>
        )}

        {step === 'register' && (
          <Card className="bg-[#222] border-[#333]">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-base font-bold text-white text-center">Create Your Account</h3>
              <p className="text-xs text-gray-400 text-center">Already have an account? Just enter your credentials to sign in.</p>
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-300">Display Name</Label>
                  <Input placeholder="Your name" value={authData.displayName}
                    onChange={e => setAuthData({ ...authData, displayName: e.target.value })}
                    className="mt-1 bg-[#1a1a1a] border-[#444] text-white" />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Email *</Label>
                  <Input type="email" placeholder="you@example.com" value={authData.email}
                    onChange={e => setAuthData({ ...authData, email: e.target.value })} required
                    className="mt-1 bg-[#1a1a1a] border-[#444] text-white" />
                </div>
                <div className="relative">
                  <Label className="text-xs text-gray-300">Password *</Label>
                  <div className="relative mt-1">
                    <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                      value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })}
                      required className="pr-10 bg-[#1a1a1a] border-[#444] text-white" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white py-5 font-bold rounded-xl">
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Continue →"}
                </Button>
              </form>
              <button onClick={() => setStep('info')} className="w-full text-center text-gray-500 hover:text-white text-xs">← Back</button>
            </CardContent>
          </Card>
        )}

        {step === 'application' && (
          <Card className="bg-[#222] border-[#333]">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-base font-bold text-white text-center">Your Social Media Influence</h3>
              <p className="text-xs text-gray-400 text-center">Tell us about your reach on each platform</p>

              <div>
                <Label className="text-xs text-gray-300">Your State *</Label>
                <select className="w-full mt-1 h-9 rounded-md border border-[#444] bg-[#1a1a1a] px-3 text-sm text-white"
                  value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                  <option value="">Select your state</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {platforms.map(p => (
                <div key={p.key}>
                  <Label className="text-xs text-gray-300">{p.label}</Label>
                  <Input value={(form as any)[p.key]} onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                    className="mt-1 bg-[#1a1a1a] border-[#444] text-white" placeholder={p.placeholder} />
                </div>
              ))}

              <Button onClick={handleApplication} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white py-5 font-bold rounded-xl">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : <>Submit Application <Users className="ml-2 h-4 w-4" /></>}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card className="bg-[#222] border-[#333]">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">Application Submitted!</h3>
              <p className="text-sm text-gray-400">Admin will review your application shortly. You'll be notified once approved.</p>
              <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white px-8 py-5 rounded-xl font-bold">
                Go to Dashboard →
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SyndicateRegister;
