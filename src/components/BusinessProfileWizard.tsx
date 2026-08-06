import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Building2, Phone, FileText, Image as ImageIcon, Briefcase, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import ggdLogo from '@/assets/ggd-logo.png';

interface BusinessProfileWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { key: 'name', icon: Building2, color: 'from-orange-500 to-red-600', title: 'Business Name', desc: 'What is your business called? This is shown to customers.' },
  { key: 'category', icon: Briefcase, color: 'from-blue-500 to-indigo-600', title: 'Pick Your Category', desc: 'Choose the industry/category your business belongs to.' },
  { key: 'state', icon: MapPin, color: 'from-pink-500 to-rose-600', title: 'Your State', desc: 'Where is your business located? Used to show you local ads & customers.' },
  { key: 'phone', icon: Phone, color: 'from-emerald-500 to-teal-600', title: 'Contact Phone', desc: 'Customers and the GGD team can reach you here.' },
  { key: 'description', icon: FileText, color: 'from-amber-500 to-orange-600', title: 'Short Description', desc: 'In 1-3 sentences, tell people what your business is about.' },
  { key: 'logo', icon: ImageIcon, color: 'from-fuchsia-500 to-rose-600', title: 'Upload Your Logo', desc: 'Optional but recommended — gives your account a pro look.' },
] as const;

const BusinessProfileWizard: React.FC<BusinessProfileWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    business_name: '',
    category_id: '',
    business_category: '',
    state: '',
    business_phone: '',
    business_description: '',
    business_logo_url: '',
  });

  useEffect(() => {
    (async () => {
      const { data: cats } = await (supabase.from('business_categories') as any)
        .select('id, name').eq('is_active', true).order('sort_order');
      setCategories(cats || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles')
        .select('business_name, business_category, business_phone, business_description, business_logo_url, state')
        .eq('user_id', user.id).maybeSingle();
      const { data: bp } = await (supabase.from('business_profiles') as any)
        .select('category_id').eq('user_id', user.id).maybeSingle();
      if (data || bp) setForm(f => ({
        ...f,
        ...Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, v ?? ''])),
        category_id: bp?.category_id || '',
      } as any));
    })();
  }, []);

  const current = STEPS[step];
  const Icon = current.icon;

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true });
      if (error) { toast.error('Logo upload failed'); return; }
      const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(path);
      setForm(f => ({ ...f, business_logo_url: publicUrl }));
      toast.success('Logo uploaded!');
    } finally { setUploading(false); }
  };

  const validateCurrent = (): boolean => {
    if (current.key === 'logo') return true;
    if (current.key === 'name') return form.business_name.trim().length >= 2;
    if (current.key === 'category') return !!form.category_id;
    if (current.key === 'state') return !!form.state;
    if (current.key === 'phone') return /^[+\d][\d\s-]{6,}$/.test(form.business_phone.trim());
    if (current.key === 'description') return form.business_description.trim().length >= 2;
    return true;
  };

  const next = () => {
    if (!validateCurrent()) { toast.error('Please complete this step before continuing.'); return; }
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const finish = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const businessName = form.business_name.trim();
    const categoryName = categories.find(c => c.id === form.category_id)?.name || '';
    const slugBase = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'business';
    const slug = `${slugBase}-${user.id.slice(0, 6)}`;
    const payload = {
      business_name: businessName,
      industry: categoryName,
      business_category: categoryName,
      state: form.state || null,
      business_phone: form.business_phone.trim(),
      business_description: form.business_description.trim(),
      business_logo_url: form.business_logo_url || null,
      business_slug: slug,
      profile_setup_complete: true,
    };
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      email: user.email || null,
      display_name: businessName || user.email?.split('@')[0] || 'User',
      ...payload,
    } as any, { onConflict: 'user_id' });
    if (error) { setSaving(false); toast.error('Could not save profile'); return; }

    const { data: existingBp } = await supabase.from('business_profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (!existingBp) {
      await supabase.from('business_profiles').insert({
        user_id: user.id,
        business_name: businessName,
        description: form.business_description.trim() || null,
        logo_url: form.business_logo_url || null,
        phone_number: form.business_phone.trim() || null,
        category_id: form.category_id || null,
        is_directory_listed: true,
      } as any);
    } else {
      await (supabase.from('business_profiles') as any)
        .update({ category_id: form.category_id || null }).eq('user_id', user.id);
    }
    setSaving(false);
    toast.success('🎉 Business storefront created! Your public site is live.');
    onComplete();
  };

  const renderField = () => {
    switch (current.key) {
      case 'name':
        return <Input autoFocus value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="e.g. Bethel Stores" className="h-11" />;
      case 'category':
        return (
          <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select your category" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'state':
        return (
          <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select your state" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {NIGERIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'phone':
        return <Input autoFocus type="tel" inputMode="tel" value={form.business_phone} onChange={e => setForm(f => ({ ...f, business_phone: e.target.value }))} placeholder="e.g. +234 801 234 5678" className="h-11" />;
      case 'description':
        return <Textarea autoFocus rows={4} value={form.business_description} onChange={e => setForm(f => ({ ...f, business_description: e.target.value }))} placeholder="Tell customers what makes your business great..." />;
      case 'logo':
        return (
          <div className="space-y-3">
            {form.business_logo_url && (
              <img loading="lazy" src={form.business_logo_url} alt="logo" className="h-24 w-24 rounded-xl object-cover border mx-auto" />
            )}
            <label className="flex items-center justify-center gap-2 h-11 rounded-md border border-dashed cursor-pointer hover:bg-muted/40 transition">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span className="text-sm">{form.business_logo_url ? 'Change logo' : 'Upload a logo (optional)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-background dark:to-background">
      <header className="bg-card/80 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          <img loading="lazy" src={ggdLogo} alt="GGD" className="h-7 w-7 rounded-lg" />
          <h1 className="text-base font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Activate Your Business</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 max-w-md space-y-4">
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 shadow-md">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-900">Set up your business profile</p>
              <p className="text-xs text-orange-700/90 mt-0.5">
                You must complete this short setup to activate your membership. The rest of the platform unlocks once you finish.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-muted'}`} />
          ))}
        </div>

        <Card className="overflow-hidden border-0 shadow-xl">
          <div className={`bg-gradient-to-r ${current.color} p-5 text-white text-center`}>
            <Icon className="h-10 w-10 mx-auto mb-2" />
            <h2 className="text-lg font-bold">{current.title}</h2>
            <p className="text-xs mt-1 opacity-90">{current.desc}</p>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{current.title}</Label>
              {renderField()}
            </div>

            <div className="flex gap-2 pt-1">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />Back
                </Button>
              )}
              <Button onClick={next} disabled={saving}
                className={`flex-1 bg-gradient-to-r ${current.color} text-white`}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : step < STEPS.length - 1 ? (
                  <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-1" />Activate Membership</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
      </div>
    </div>
  );
};

export default BusinessProfileWizard;