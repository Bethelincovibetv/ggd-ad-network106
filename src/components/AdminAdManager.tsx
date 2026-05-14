import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Trash2, Pause, Play, Eye, Globe, Monitor, RefreshCw, Check, X, MapPin, Youtube, Image as ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_url: string;
  is_active: boolean | null;
  impressions: number | null;
  clicks: number | null;
  user_id: string;
  created_at: string;
  expires_at: string | null;
  source?: string;
  owner_email?: string;
  approved?: boolean;
  rejection_reason?: string | null;
  ad_type?: string;
  target_state?: string | null;
  youtube_url?: string | null;
  watch_duration_seconds?: number | null;
  reward_credits?: number | null;
  budget_credits?: number | null;
}

const AdminAdManager = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchAds = async () => {
    setLoading(true);
    // Fetch all ads (admin RLS allows via "Users can manage own ads" + we need a broader policy)
    // We'll fetch ads and profiles separately then merge
    const { data: adsData, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load ads');
      setLoading(false);
      return;
    }

    // Get unique user_ids to fetch emails
    const userIds = [...new Set((adsData || []).map(a => a.user_id))];
    let profileMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);
      
      profiles?.forEach(p => {
        profileMap[p.user_id] = p.email || 'Unknown';
      });
    }

    // Check which ads came via API by looking at api_keys ownership
    const { data: apiKeys } = await supabase.from('api_keys').select('user_id');
    const apiUserIds = new Set((apiKeys || []).map(k => k.user_id));

    const enrichedAds = (adsData || []).map(ad => ({
      ...ad,
      owner_email: profileMap[ad.user_id] || 'Unknown',
      source: apiUserIds.has(ad.user_id) ? 'api' : 'direct',
    }));

    setAds(enrichedAds);
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  const toggleAdStatus = async (ad: Ad) => {
    const newStatus = !ad.is_active;
    const { error } = await supabase
      .from('ads')
      .update({ is_active: newStatus })
      .eq('id', ad.id);

    if (error) {
      toast.error('Failed to update ad');
      return;
    }
    toast.success(newStatus ? 'Ad activated' : 'Ad paused');
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: newStatus } : a));
  };

  const approveAd = async (ad: Ad) => {
    const { error } = await supabase.from('ads').update({ approved: true, is_active: true, rejection_reason: null }).eq('id', ad.id);
    if (error) { toast.error('Approve failed'); return; }
    toast.success('Ad approved & live');
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, approved: true, is_active: true, rejection_reason: null } : a));
    if (selectedAd?.id === ad.id) setSelectedAd({ ...selectedAd, approved: true, is_active: true });
  };

  const rejectAd = async (ad: Ad, reason: string) => {
    if (!reason.trim()) { toast.error('Provide a reason'); return; }
    const { error } = await supabase.from('ads').update({ approved: false, is_active: false, rejection_reason: reason }).eq('id', ad.id);
    if (error) { toast.error('Reject failed'); return; }
    toast.success('Ad rejected');
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, approved: false, is_active: false, rejection_reason: reason } : a));
    setRejectReason('');
    if (selectedAd?.id === ad.id) setSelectedAd(null);
  };

  const deleteAd = async (id: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete ad');
      return;
    }
    toast.success('Ad deleted');
    setAds(prev => prev.filter(a => a.id !== id));
    if (selectedAd?.id === id) setSelectedAd(null);
  };

  const filtered = ads.filter(ad => {
    const matchesSearch = !search || 
      ad.title.toLowerCase().includes(search.toLowerCase()) ||
      ad.description?.toLowerCase().includes(search.toLowerCase()) ||
      ad.owner_email?.toLowerCase().includes(search.toLowerCase()) ||
      ad.target_url.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && ad.is_active) ||
      (filter === 'paused' && !ad.is_active) ||
      (filter === 'pending' && !ad.approved && !ad.rejection_reason) ||
      (filter === 'api' && ad.source === 'api') ||
      (filter === 'direct' && ad.source === 'direct');

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: ads.length,
    active: ads.filter(a => a.is_active).length,
    paused: ads.filter(a => !a.is_active).length,
    pending: ads.filter(a => !a.approved && !a.rejection_reason).length,
    api: ads.filter(a => a.source === 'api').length,
    direct: ads.filter(a => a.source === 'direct').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: 'Active', value: stats.active, color: 'bg-green-500/10 text-green-500' },
          { label: 'Paused', value: stats.paused, color: 'bg-yellow-500/10 text-yellow-500' },
          { label: 'Pending', value: stats.pending, color: 'bg-orange-500/10 text-orange-500' },
          { label: 'API Ads', value: stats.api, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Direct', value: stats.direct, color: 'bg-purple-500/10 text-purple-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] font-medium opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search ads by title, URL, owner..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchAds} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
          <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
          <TabsTrigger value="api" className="text-xs">API</TabsTrigger>
          <TabsTrigger value="direct" className="text-xs">Direct</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Ads Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search ? 'No ads match your search' : 'No ads found'}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Ad</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Source</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Stats</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ad => (
                <TableRow key={ad.id} className="group">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      {ad.image_url && (
                        <img 
                          src={ad.image_url} 
                          alt="" 
                          className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate max-w-[140px] sm:max-w-[200px]">{ad.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{ad.owner_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={ad.source === 'api' ? 'default' : 'secondary'} className="text-[10px]">
                      {ad.source === 'api' ? <Globe className="h-3 w-3 mr-1" /> : <Monitor className="h-3 w-3 mr-1" />}
                      {ad.source === 'api' ? 'API' : 'Direct'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="text-[10px] text-muted-foreground">
                      <span>{ad.impressions || 0} views</span>
                      <span className="mx-1">·</span>
                      <span>{ad.clicks || 0} clicks</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-[10px] w-fit">
                        {ad.is_active ? 'Live' : !ad.approved && !ad.rejection_reason ? 'Pending' : ad.rejection_reason ? 'Rejected' : 'Paused'}
                      </Badge>
                      {ad.ad_type === 'watch' && (
                        <Badge variant="outline" className="text-[9px] w-fit"><Youtube className="h-2.5 w-2.5 mr-1 text-red-500" />Watch</Badge>
                      )}
                      {ad.target_state && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{ad.target_state}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!ad.approved && !ad.rejection_reason && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={() => approveAd(ad)} title="Approve">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAd(ad)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAdStatus(ad)} title={ad.is_active ? 'Pause' : 'Activate'}>
                        {ad.is_active ? <Pause className="h-3.5 w-3.5 text-yellow-500" /> : <Play className="h-3.5 w-3.5 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAd(ad.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Ad Detail Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Ad Details</DialogTitle>
          </DialogHeader>
          {selectedAd && (
            <div className="space-y-4">
              {selectedAd.image_url && (
                <img src={selectedAd.image_url} alt={selectedAd.title} className="w-full h-40 object-cover rounded-xl border border-border" />
              )}
              {selectedAd.ad_type === 'watch' && selectedAd.youtube_url && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">YouTube Video</p>
                  <a href={selectedAd.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">{selectedAd.youtube_url}</a>
                  <p className="text-[10px] text-muted-foreground">Watch {selectedAd.watch_duration_seconds}s · Reward {selectedAd.reward_credits} credits · Budget {selectedAd.budget_credits} credits</p>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="font-bold text-lg">{selectedAd.title}</h3>
                {selectedAd.description && <p className="text-sm text-muted-foreground">{selectedAd.description}</p>}
                {selectedAd.target_state && (
                  <p className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3 text-orange-500" /> Target: <span className="font-semibold">{selectedAd.target_state}</span></p>
                )}
                {selectedAd.rejection_reason && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
                    <p className="font-bold">Rejected:</p> {selectedAd.rejection_reason}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium truncate">{selectedAd.owner_email}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedAd.source === 'api' ? '🌐 API' : '🖥️ Direct'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Impressions</p>
                  <p className="font-medium">{selectedAd.impressions || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Clicks</p>
                  <p className="font-medium">{selectedAd.clicks || 0}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={selectedAd.is_active ? 'default' : 'secondary'} className="text-[10px] mt-1">
                    {selectedAd.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(selectedAd.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Target URL</p>
                <a href={selectedAd.target_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all">
                  {selectedAd.target_url}
                </a>
              </div>
              {selectedAd.expires_at && (
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Expires</p>
                  <p className="text-xs font-medium">{new Date(selectedAd.expires_at).toLocaleString()}</p>
                </div>
              )}
              <div className="flex gap-2">
                {!selectedAd.approved && !selectedAd.rejection_reason && (
                  <Button size="sm" className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white" onClick={() => approveAd(selectedAd)}>
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant={selectedAd.is_active ? 'secondary' : 'default'}
                  className="flex-1 text-xs"
                  onClick={() => { toggleAdStatus(selectedAd); setSelectedAd({ ...selectedAd, is_active: !selectedAd.is_active }); }}
                >
                  {selectedAd.is_active ? <><Pause className="h-3 w-3 mr-1" /> Pause</> : <><Play className="h-3 w-3 mr-1" /> Activate</>}
                </Button>
                <Button size="sm" variant="destructive" className="text-xs" onClick={() => deleteAd(selectedAd.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
              {!selectedAd.approved && !selectedAd.rejection_reason && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={2} className="text-xs" />
                  <Button size="sm" variant="outline" className="w-full text-xs text-destructive border-destructive/30" onClick={() => rejectAd(selectedAd, rejectReason)}>
                    <X className="h-3 w-3 mr-1" /> Reject with Reason
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdManager;
