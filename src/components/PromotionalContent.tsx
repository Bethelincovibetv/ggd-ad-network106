import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Copy, Download, Users, Briefcase, Sparkles, Eye, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReferralsPage from "@/components/ReferralsPage";

const PromotionalContent = () => {
  const [flyers, setFlyers] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('promotional_materials').select('*').eq('is_active', true)
      .order('created_at', { ascending: false }).then(({ data }) => setFlyers(data || []));
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('referral_code').eq('user_id', user.id).single();
        if (data?.referral_code) setReferralCode(data.referral_code);
      }
    });
  }, []);

  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const downloadFlyer = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Flyer downloaded!');
    } catch {
      toast.error('Download failed');
    }
  };

  const shareCopies = {
    users: [
      { title: '🚀 Turn Your Social Media Into Income!', text: `Hey! I just discovered GGD Ad Network — you can earn money by sharing ads on WhatsApp, Facebook, TikTok & more!\n\n✅ Free to join\n✅ Earn daily credits\n✅ Withdraw real cash\n\nJoin now: ${referralLink}` },
      { title: '💰 Get Paid to Share Ads!', text: `Stop scrolling for free! With GGD Ad Network, every share earns you money.\n\n🎯 Share ads on social media\n💵 Earn per task completed\n📱 Works on mobile\n\nSign up free: ${referralLink}` },
      { title: '🌍 Africa\'s #1 Ad Network', text: `GGD Ad Network is changing the game! Create ads, earn credits, and make money from your social media influence.\n\nUse my code: ${referralCode}\nJoin here: ${referralLink}` },
    ],
    businesses: [
      { title: '📢 Reach Millions of Customers!', text: `GGD Ad Network connects your business with thousands of social media operators who share your ads across WhatsApp groups, Facebook, Instagram, TikTok & more.\n\n✅ Pay-per-performance\n✅ Real verified proofs\n✅ Instant campaign launch\n\nStart now: ${referralLink}` },
      { title: '🎯 Targeted Social Media Advertising', text: `Want your product seen by thousands? GGD Ad Network deploys verified operators to share your ads across:\n\n📱 WhatsApp Status & Groups\n📘 Facebook Groups\n📸 Instagram Stories\n🎵 TikTok Videos\n\nSign up: ${referralLink}` },
    ],
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard!'); };
  const shareText = (text: string) => { if (navigator.share) { navigator.share({ text }).catch(() => {}); } else { copyText(text); } };

  const renderCopies = (copies: typeof shareCopies.users) => (
    <div className="space-y-3">
      {copies.map((copy, i) => (
        <Card key={i} className="border-border">
          <CardContent className="p-3 space-y-2">
            <h4 className="font-bold text-sm text-foreground">{copy.title}</h4>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{copy.text}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => copyText(copy.text)}>
                <Copy className="h-3 w-3 mr-1" />Copy
              </Button>
              <Button size="sm" className="text-xs flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white" onClick={() => shareText(copy.text)}>
                <Share2 className="h-3 w-3 mr-1" />Share
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Sparkles className="h-8 w-8 mx-auto text-orange-500 mb-2" />
        <h2 className="text-lg font-bold text-foreground">Promotional Materials</h2>
        <p className="text-xs text-muted-foreground">Share these to grow your network and earn referral credits</p>
      </div>

      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-orange-800 mb-2">Your Referral Link</p>
          <div className="flex gap-2">
            <input readOnly value={referralLink} className="flex-1 text-xs bg-white border rounded-lg px-3 py-2 text-foreground" />
            <Button size="sm" onClick={() => copyText(referralLink)} className="bg-orange-500 text-white"><Copy className="h-3 w-3" /></Button>
          </div>
          <p className="text-[10px] text-orange-600 mt-1">Code: {referralCode}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="referrals">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="referrals" className="text-[10px] gap-1"><UserPlus className="h-3 w-3" />My Referrals</TabsTrigger>
          <TabsTrigger value="users" className="text-[10px] gap-1"><Users className="h-3 w-3" />Invite Users</TabsTrigger>
          <TabsTrigger value="businesses" className="text-[10px] gap-1"><Briefcase className="h-3 w-3" />Invite Business</TabsTrigger>
        </TabsList>
        <TabsContent value="referrals"><ReferralsPage /></TabsContent>
        <TabsContent value="users">{renderCopies(shareCopies.users)}</TabsContent>
        <TabsContent value="businesses">{renderCopies(shareCopies.businesses)}</TabsContent>
      </Tabs>

      {/* Flyers with Download & Preview */}
      {flyers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">📸 Promotional Flyers</h3>
          <div className="grid grid-cols-2 gap-3">
            {flyers.map((f: any) => (
              <Card key={f.id} className="overflow-hidden">
                {f.image_url && (
                  <div className="relative cursor-pointer" onClick={() => setPreviewImage(f.image_url)}>
                    <img src={f.image_url} alt={f.title} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <Eye className="h-6 w-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                )}
                <CardContent className="p-2 space-y-1">
                  <p className="text-xs font-medium text-foreground truncate">{f.title}</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="flex-1 text-[10px] h-7"
                      onClick={() => setPreviewImage(f.image_url)}>
                      <Eye className="h-3 w-3 mr-1" />Preview
                    </Button>
                    <Button size="sm" className="flex-1 text-[10px] h-7 bg-gradient-to-r from-orange-500 to-red-500 text-white"
                      onClick={() => f.image_url && downloadFlyer(f.image_url, f.title)}>
                      <Download className="h-3 w-3 mr-1" />Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setPreviewImage(null)}>
            <X className="h-6 w-6" />
          </Button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <Button className="absolute bottom-6 bg-gradient-to-r from-orange-500 to-red-500 text-white"
            onClick={(e) => { e.stopPropagation(); downloadFlyer(previewImage, 'flyer'); }}>
            <Download className="h-4 w-4 mr-2" />Download Flyer
          </Button>
        </div>
      )}
    </div>
  );
};

export default PromotionalContent;
