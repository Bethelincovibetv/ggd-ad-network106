import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Briefcase, Upload, Loader2, Users, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BusinessUpgradeFormProps {
  onUpgraded: () => void;
}

const BusinessUpgradeForm = ({ onUpgraded }: BusinessUpgradeFormProps) => {
  const [form, setForm] = useState({ business_name: '', description: '', whatsapp_link: '', website_link: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('business-logos').upload(fileName, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('business-logos').getPublicUrl(fileName);
    setLogoUrl(publicUrl);
    setUploading(false);
  };

  const submit = async () => {
    if (!form.business_name.trim()) { toast.error("Business name required"); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error: profileError } = await supabase.from('business_profiles').insert({
      user_id: user.id,
      business_name: form.business_name,
      description: form.description || null,
      whatsapp_link: form.whatsapp_link || null,
      website_link: form.website_link || null,
      logo_url: logoUrl || null,
    });

    if (profileError) {
      if (profileError.code === '23505') toast.error("You already have a business profile");
      else toast.error("Failed to create business profile");
      setSubmitting(false);
      return;
    }

    await supabase.from('user_roles').insert({ user_id: user.id, role: 'business' });
    await supabase.from('task_wallets').insert({ user_id: user.id });
    toast.success("🎉 Business account created! You can now create tasks.");
    onUpgraded();
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
        <CardContent className="p-4 text-center space-y-2">
          <Briefcase className="h-10 w-10 mx-auto text-orange-600" />
          <h3 className="font-bold text-foreground">Upgrade to Business</h3>
          <p className="text-xs text-muted-foreground">Create tasks for syndicates to promote your business across social media!</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Business Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Business Name *</Label>
            <Input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} className="mt-1" placeholder="Your business name" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1" rows={2} placeholder="What does your business do?" />
          </div>
          <div>
            <Label className="text-xs">WhatsApp Link/Number</Label>
            <Input value={form.whatsapp_link} onChange={e => setForm({...form, whatsapp_link: e.target.value})} className="mt-1" placeholder="https://wa.me/..." />
          </div>
          <div>
            <Label className="text-xs">Website</Label>
            <Input value={form.website_link} onChange={e => setForm({...form, website_link: e.target.value})} className="mt-1" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Business Logo</Label>
            <input type="file" id="businessLogoUpload" accept="image/*" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} className="hidden" />
            <Button variant="outline" className="w-full mt-1 text-xs" disabled={uploading}
              onClick={() => document.getElementById('businessLogoUpload')?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </Button>
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg mt-2 object-cover" />}
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Briefcase className="h-4 w-4 mr-2" />}
            Create Business Account (Free)
          </Button>
        </CardContent>
      </Card>

      <Card className="border-purple-200">
        <CardContent className="p-4 text-center space-y-2">
          <Users className="h-8 w-8 mx-auto text-purple-600" />
          <h3 className="font-bold text-sm text-foreground">Want to become a Syndicate?</h3>
          <p className="text-xs text-muted-foreground">Earn money by sharing business posts on your social media. Apply for verification!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessUpgradeForm;
