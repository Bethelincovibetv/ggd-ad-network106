import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Code, Eye, Plus, Edit, Trash2, BarChart3, Calendar, CreditCard, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdCreationForm from "./AdCreationForm";
import AdDisplayPreview from "./AdDisplayPreview";

const AdRotator = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [rotatorCode, setRotatorCode] = useState('');

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('ads').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAds(data || []);
  };

  const handlePayment = async (adData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const amount = adData.durationDays * 1.00;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + adData.durationDays);

    // Upload image if it's a data URL
    let imageUrl = adData.imageUrl || null;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const base64 = imageUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { data: uploadData } = await supabase.storage.from('ad-images').upload(fileName, bytes, { contentType: 'image/jpeg' });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('ads').insert({
      user_id: user.id,
      title: adData.title,
      description: adData.description,
      target_url: adData.targetUrl,
      image_url: imageUrl,
      is_active: true,
      expires_at: endDate.toISOString(),
    });

    if (error) {
      toast.error("Failed to create ad");
      return;
    }

    toast.success(`Ad created! Payment of $${amount.toFixed(2)} processed.`);
    setIsCreating(false);
    fetchAds();
  };

  const handleDeleteAd = async (id: string) => {
    await supabase.from('ads').delete().eq('id', id);
    toast.success("Ad deleted!");
    fetchAds();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editingAd) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditingAd({ ...editingAd, image_url: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateAd = async () => {
    if (!editingAd) return;
    if (!editingAd.title.trim() || !editingAd.target_url.trim()) {
      toast.error("Please fill in required fields");
      return;
    }

    let imageUrl = editingAd.image_url;
    if (imageUrl && imageUrl.startsWith('data:')) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const base64 = imageUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { data: uploadData } = await supabase.storage.from('ad-images').upload(fileName, bytes, { contentType: 'image/jpeg' });
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('ad-images').getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }
    }

    await supabase.from('ads').update({
      title: editingAd.title,
      description: editingAd.description,
      target_url: editingAd.target_url,
      image_url: imageUrl,
      is_active: editingAd.is_active,
    }).eq('id', editingAd.id);

    setEditingAd(null);
    toast.success("Ad updated!");
    fetchAds();
  };

  const generateRotatorCode = () => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const apiEndpoint = `https://${projectId}.supabase.co/functions/v1/serve-ads`;

    const rotatorHtml = `<!-- GGD Ad Network - Paste this anywhere on your site -->
<div id="ggd-ad-rotator" style="max-width:300px;margin:20px auto;font-family:Arial,sans-serif;"></div>
<script>
(function(){
  var API = "${apiEndpoint}";
  var container = document.getElementById("ggd-ad-rotator");
  var ads = [];
  var idx = 0;

  var style = document.createElement("style");
  style.textContent = ".ggd-ad{border:1px solid #ddd;border-radius:10px;overflow:hidden;box-shadow:0 4px 8px rgba(0,0,0,.1);cursor:pointer;transition:all .3s}.ggd-ad:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.15)}.ggd-ad img{width:100%;height:200px;object-fit:cover}.ggd-ad-body{padding:15px}.ggd-ad h3{font-size:18px;font-weight:bold;margin:0 0 8px;color:#333}.ggd-ad p{font-size:14px;color:#666;line-height:1.4;margin:0 0 12px}.ggd-cta{display:block;background:linear-gradient(45deg,#ea580c,#dc2626);color:#fff;padding:10px;border-radius:5px;text-align:center;font-weight:bold;font-size:14px;text-decoration:none}.ggd-cta:hover{background:linear-gradient(45deg,#dc2626,#b91c1c)}.ggd-foot{font-size:10px;color:#999;text-align:center;padding:5px;background:#f9f9f9}";
  document.head.appendChild(style);

  function track(adId, evt) {
    navigator.sendBeacon ? navigator.sendBeacon(API + "?ad_id=" + adId + "&event=" + evt) :
      fetch(API + "?ad_id=" + adId + "&event=" + evt, {method:"GET"});
  }

  function render(ad) {
    container.innerHTML =
      '<div class="ggd-ad" onclick="window.open(\\'' + ad.target_url + '\\',\\'_blank\\')">' +
      (ad.image_url ? '<img src="' + ad.image_url + '" alt="' + ad.title + '">' : '') +
      '<div class="ggd-ad-body"><h3>' + ad.title + '</h3>' +
      '<p>' + (ad.description || '') + '</p>' +
      '<a class="ggd-cta" href="' + ad.target_url + '" target="_blank" rel="noopener">Learn More →</a></div>' +
      '<div class="ggd-foot">Powered by GGD AD NETWORK</div></div>';
    track(ad.id, "impression");
  }

  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function rotate() {
    if (!ads.length) { container.innerHTML = ""; return; }
    var pool = shuffle(ads.slice());
    render(pool[idx % pool.length]);
    idx = (idx + 1) % pool.length;
  }

  fetch(API)
    .then(function(r){return r.json()})
    .then(function(d){
      ads = d.ads || [];
      rotate();
      if (ads.length > 1) setInterval(rotate, 8000);
    })
    .catch(function(e){ console.error("GGD Ad Network error:", e); });

  container.addEventListener("click", function(){
    if (ads.length) track(ads[(idx - 1 + ads.length) % ads.length].id, "click");
  });
})();
</script>`;

    setRotatorCode(rotatorHtml);
    toast.success("Embed code generated! This fetches live ads from your network.");
  };

  const copyRotatorCode = () => {
    navigator.clipboard.writeText(rotatorCode);
    toast.success("Embed code copied!");
  };

  const previewRotator = () => {
    const w = window.open('', '_blank');
    if (w) { w.document.write(`<!DOCTYPE html><html><body>${rotatorCode}</body></html>`); }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const end = new Date(expiresAt);
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      {/* Live Ad Preview */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            🌐 Live Ad Display
          </CardTitle>
          <p className="text-gray-600 mt-2">Showing active ads from the network</p>
        </CardHeader>
        <CardContent>
          <AdDisplayPreview />
        </CardContent>
      </Card>

      {/* Dashboard */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            📊 Your Ad Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-3 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="text-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-blue-700">{ads.length}</div>
                <div className="text-xs text-blue-600">Total Ads</div>
              </div>
            </Card>
            <Card className="p-3 bg-gradient-to-r from-green-50 to-green-100">
              <div className="text-center">
                <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-green-700">{ads.filter(ad => ad.is_active).length}</div>
                <div className="text-xs text-green-600">Active Ads</div>
              </div>
            </Card>
            <Card className="p-3 bg-gradient-to-r from-purple-50 to-purple-100">
              <div className="text-center">
                <Eye className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-purple-700">{ads.reduce((s, a) => s + (a.impressions || 0), 0)}</div>
                <div className="text-xs text-purple-600">Total Views</div>
              </div>
            </Card>
            <Card className="p-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <div className="text-center">
                <CreditCard className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-orange-700">{ads.reduce((s, a) => s + (a.clicks || 0), 0)}</div>
                <div className="text-xs text-orange-600">Total Clicks</div>
              </div>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Ad Campaigns</h3>
            <Button onClick={() => setIsCreating(true)} className="bg-gradient-to-r from-orange-600 to-red-600">
              <Plus className="mr-2 h-4 w-4" />
              Create New Ad
            </Button>
          </div>

          {isCreating && (
            <AdCreationForm onAdCreated={handlePayment} onCancel={() => setIsCreating(false)} />
          )}

          <div className="grid gap-4">
            {ads.map((ad) => (
              <Card key={ad.id} className={`p-4 ${ad.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 opacity-60'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{ad.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${ad.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {ad.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{ad.description}</p>
                    <p className="text-xs text-gray-500 mb-2">Target: {ad.target_url}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500">
                      <span>👁️ {ad.impressions || 0} views</span>
                      <span>🖱️ {ad.clicks || 0} clicks</span>
                      {ad.expires_at && (
                        <span className={getDaysRemaining(ad.expires_at) > 0 ? 'text-green-600' : 'text-red-600'}>
                          {getDaysRemaining(ad.expires_at) > 0 ? `${getDaysRemaining(ad.expires_at)} days left` : 'Expired'}
                        </span>
                      )}
                    </div>
                  </div>
                  {ad.image_url && (
                    <img src={ad.image_url} alt={ad.title} className="w-16 h-16 object-cover rounded ml-4" />
                  )}
                  <div className="flex gap-2 ml-4">
                    <Button onClick={() => setEditingAd(ad)} variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDeleteAd(ad.id)} variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {ads.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No ad campaigns yet</p>
                <p className="text-sm">Create your first campaign to start advertising!</p>
              </div>
            )}
          </div>

          <Button
            onClick={generateRotatorCode}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            <Code className="mr-2 h-5 w-5" />
            Generate Ad Network Embed Code
          </Button>
        </CardContent>
      </Card>

      {/* Edit Ad Modal */}
      {editingAd && (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader><CardTitle className="text-xl font-bold">Edit Ad Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ad Title *</Label>
              <Input value={editingAd.title} onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })} />
            </div>
            <div>
              <Label>Target URL *</Label>
              <Input value={editingAd.target_url} onChange={(e) => setEditingAd({ ...editingAd, target_url: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={editingAd.description || ''} onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Ad Image</Label>
              <input type="file" id="editAdImage" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Button variant="outline" onClick={() => document.getElementById('editAdImage')?.click()} className="w-full mt-1">
                <Upload className="mr-2 h-4 w-4" />{editingAd.image_url ? 'Change Image' : 'Upload Image'}
              </Button>
              {editingAd.image_url && <img src={editingAd.image_url} alt="Preview" className="max-w-32 h-32 object-cover rounded mx-auto mt-3" />}
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={editingAd.is_active} onCheckedChange={(checked) => setEditingAd({ ...editingAd, is_active: checked })} />
              <Label>Active</Label>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleUpdateAd} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700">Update Ad</Button>
              <Button onClick={() => setEditingAd(null)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embed Code Output */}
      {rotatorCode && (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardHeader><CardTitle className="text-xl font-bold">GGD Ad Network Embed Code</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Instructions:</strong> Copy this code and paste it on any website. It will automatically fetch and display live ads from the GGD Ad Network.
              </p>
              <p className="text-xs text-blue-700">Ads rotate every 8 seconds with impression & click tracking.</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={copyRotatorCode} className="flex-1"><Code className="mr-2 h-4 w-4" />Copy Embed Code</Button>
              <Button onClick={previewRotator} variant="outline" className="flex-1"><Eye className="mr-2 h-4 w-4" />Preview</Button>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{rotatorCode}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdRotator;
