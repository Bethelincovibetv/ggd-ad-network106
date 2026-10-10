import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, Trash2, Pause, Play, Eye, Globe, Monitor, RefreshCw, 
  Check, X, MapPin, Youtube, Image as ImageIcon, CalendarPlus,
  Minimize2, Maximize2, ChevronDown, ChevronUp, ExternalLink, Sparkles, Megaphone
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface Ad {
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

interface AdminAdManagerProps {
  onNavigateSyndicate?: (ad: Ad) => void;
}

const AdminAdManager: React.FC<AdminAdManagerProps> = ({ onNavigateSyndicate }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [extendDays, setExtendDays] = useState('7');
  const [extending, setExtending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const extendAdDuration = async () => {
    if (!selectedAd) return;
    const days = parseInt(extendDays);
    if (!days || days < 1) { toast.error('Enter a valid number of days'); return; }
    setExtending(true);
    const base = selectedAd.expires_at && new Date(selectedAd.expires_at) > new Date()
      ? new Date(selectedAd.expires_at)
      : new Date();
    base.setDate(base.getDate() + days);
    const newExpiry = base.toISOString();
    const { error } = await supabase.from('ads').update({ expires_at: newExpiry, is_active: true }).eq('id', selectedAd.id);
    setExtending(false);
    if (error) { toast.error('Failed to extend duration'); return; }
    toast.success(`Extended by ${days} day${days > 1 ? 's' : ''}`);
    setSelectedAd({ ...selectedAd, expires_at: newExpiry, is_active: true });
    fetchAds();
  };

  const fetchAds = async () => {
    setLoading(true);
    const { data: adsData, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load ads');
      setLoading(false);
      return;
    }

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
    if (selectedAd?.id === ad.id) {
      setSelectedAd({ ...selectedAd, is_active: newStatus });
    }
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
    const isExpired = !!ad.expires_at && new Date(ad.expires_at) < new Date();
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && ad.is_active && !isExpired) ||
      (filter === 'paused' && !ad.is_active && !isExpired) ||
      (filter === 'pending' && !ad.approved && !ad.rejection_reason) ||
      (filter === 'expired' && isExpired) ||
      (filter === 'api' && ad.source === 'api') ||
      (filter === 'direct' && ad.source === 'direct');

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: ads.length,
    active: ads.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date())).length,
    paused: ads.filter(a => !a.is_active).length,
    pending: ads.filter(a => !a.approved && !a.rejection_reason).length,
    expired: ads.filter(a => a.expires_at && new Date(a.expires_at) < new Date()).length,
    api: ads.filter(a => a.source === 'api').length,
    direct: ads.filter(a => a.source === 'direct').length,
  };

  const filterTabs = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'pending', label: 'Pending', count: stats.pending, alert: stats.pending > 0 },
    { id: 'active', label: 'Active', count: stats.active },
    { id: 'paused', label: 'Paused', count: stats.paused },
    { id: 'expired', label: 'Expired', count: stats.expired },
    { id: 'api', label: 'API Ads', count: stats.api },
    { id: 'direct', label: 'Direct', count: stats.direct },
  ];

  // Minimized Condensed Bar
  if (isMinimized) {
    return (
      <div className="w-full rounded-2xl bg-card border border-border p-3.5 shadow-md flex items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">Full Ad Manager (Minimized)</h2>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{stats.total} total ads</span>
              <span>•</span>
              <span className="text-green-600 font-semibold">{stats.active} live</span>
              {stats.pending > 0 && (
                <>
                  <span>•</span>
                  <span className="text-orange-500 font-bold">{stats.pending} pending</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsMinimized(false)}
          className="rounded-xl h-9 px-3 gap-1.5 text-xs font-bold shrink-0 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Expand Manager</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Top Header Controls with Minimize Button */}
      <div className="flex items-center justify-between gap-2 bg-card/60 backdrop-blur-sm border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold truncate">Advert Management & Approvals</h2>
            <p className="text-[11px] text-muted-foreground hidden sm:block">Control live ads, view statistics, and manage syndicated media</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAds}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs rounded-xl"
            title="Refresh Ads"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Minimize Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl border border-border/60 hover:bg-secondary"
            title="Minimize Ad Manager"
          >
            <Minimize2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Minimize</span>
          </Button>
        </div>
      </div>

      {/* Stats - Responsive Grid with Horizontal Mobile Flow */}
      <div className="w-full overflow-x-auto no-scrollbar pb-1">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 min-w-[340px] sm:min-w-0">
          {[
            { label: 'Total', value: stats.total, color: 'bg-primary/10 text-primary border-primary/20' },
            { label: 'Active', value: stats.active, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
            { label: 'Pending', value: stats.pending, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
            { label: 'Paused', value: stats.paused, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
            { label: 'Expired', value: stats.expired, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
            { label: 'API Ads', value: stats.api, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
            { label: 'Direct', value: stats.direct, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-2.5 sm:p-3 text-center border ${s.color}`}>
              <p className="text-base sm:text-lg font-black">{s.value}</p>
              <p className="text-[10px] font-semibold opacity-90 truncate">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by title, owner email, target URL..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-card text-xs sm:text-sm border-border/80"
        />
      </div>

      {/* Horizontal Scrollable Filter Tabs */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1.5 min-w-max px-0.5">
          {filterTabs.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  active ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area: Adaptive Mobile Cards vs Desktop Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
          <div className="animate-spin h-7 w-7 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-xs font-medium">Loading advertisement catalogue...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-card rounded-2xl border border-dashed border-border/80 p-6 space-y-2">
          <Megaphone className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-bold text-foreground">{search ? 'No matching advertisements found' : 'No ads in this category'}</p>
          <p className="text-xs text-muted-foreground">Try selecting a different filter tab or clearing your search keywords.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map(ad => {
              const isExp = !!ad.expires_at && new Date(ad.expires_at) < new Date();
              const statusLabel = isExp ? 'Expired' : ad.is_active ? 'Live' : !ad.approved && !ad.rejection_reason ? 'Pending' : ad.rejection_reason ? 'Rejected' : 'Paused';
              const statusVariant = isExp ? 'destructive' : ad.is_active ? 'default' : 'secondary';
              
              return (
                <div key={ad.id} className="rounded-2xl border border-border/90 bg-card p-3.5 shadow-sm space-y-3">
                  <div className="flex items-start gap-3">
                    {ad.image_url ? (
                      <img 
                        loading="lazy" 
                        src={ad.image_url} 
                        alt="" 
                        className="h-16 w-16 rounded-xl object-cover border border-border shrink-0 bg-muted"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                        <ImageIcon className="h-6 w-6 opacity-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 font-bold">
                          {statusLabel}
                        </Badge>
                        <Badge variant={ad.source === 'api' ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0.5">
                          {ad.source === 'api' ? '🌐 API' : '🖥️ Direct'}
                        </Badge>
                      </div>
                      <h3 className="text-xs font-bold text-foreground line-clamp-2">{ad.title}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">{ad.owner_email}</p>
                    </div>
                  </div>

                  {/* Stats & Metadata Strip */}
                  <div className="grid grid-cols-3 gap-1.5 py-1 px-2 bg-muted/40 rounded-xl text-[10px] text-muted-foreground font-medium">
                    <div>
                      <span className="text-foreground font-bold">{ad.impressions || 0}</span> views
                    </div>
                    <div>
                      <span className="text-foreground font-bold">{ad.clicks || 0}</span> clicks
                    </div>
                    <div className="truncate">
                      {ad.expires_at ? (
                        (() => {
                          const ms = new Date(ad.expires_at).getTime() - Date.now();
                          const days = Math.ceil(ms / 86400000);
                          return ms < 0 ? <span className="text-red-500 font-bold">Ended</span> : <span>{days}d left</span>;
                        })()
                      ) : (
                        <span>No expiry</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/60">
                    <div className="flex items-center gap-1">
                      {!ad.approved && !ad.rejection_reason && (
                        <Button 
                          size="sm" 
                          className="h-8 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                          onClick={() => approveAd(ad)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={ad.is_active ? 'outline' : 'default'}
                        className={`h-8 px-2.5 text-xs rounded-xl font-bold ${ad.is_active ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20' : ''}`}
                        onClick={() => toggleAdStatus(ad)}
                      >
                        {ad.is_active ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pause</> : <><Play className="h-3.5 w-3.5 mr-1" /> Resume</>}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-xl" 
                        onClick={() => setSelectedAd(ad)} 
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {onNavigateSyndicate && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-purple-600 rounded-xl" 
                          onClick={() => onNavigateSyndicate(ad)} 
                          title="View in Syndicate"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive rounded-xl" 
                        onClick={() => deleteAd(ad.id)} 
                        title="Delete Ad"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-bold">Advertisement</TableHead>
                    <TableHead className="text-xs font-bold">Source</TableHead>
                    <TableHead className="text-xs font-bold">Performance</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(ad => (
                    <TableRow key={ad.id} className="hover:bg-muted/20">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          {ad.image_url ? (
                            <img 
                              loading="lazy" 
                              src={ad.image_url} 
                              alt="" 
                              className="h-11 w-11 rounded-xl object-cover border border-border shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                              <ImageIcon className="h-5 w-5 opacity-40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold truncate max-w-[240px] text-foreground">{ad.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">{ad.owner_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.source === 'api' ? 'default' : 'secondary'} className="text-[10px] font-bold">
                          {ad.source === 'api' ? <Globe className="h-3 w-3 mr-1" /> : <Monitor className="h-3 w-3 mr-1" />}
                          {ad.source === 'api' ? 'API' : 'Direct'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-[11px] text-muted-foreground font-medium space-y-0.5">
                          <p><span className="text-foreground font-bold">{ad.impressions || 0}</span> views</p>
                          <p><span className="text-foreground font-bold">{ad.clicks || 0}</span> clicks</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const isExp = !!ad.expires_at && new Date(ad.expires_at) < new Date();
                            const label = isExp ? 'Expired' : ad.is_active ? 'Live' : !ad.approved && !ad.rejection_reason ? 'Pending' : ad.rejection_reason ? 'Rejected' : 'Paused';
                            return (
                              <Badge variant={isExp ? 'destructive' : ad.is_active ? 'default' : 'secondary'} className="text-[10px] w-fit font-bold">
                                {label}
                              </Badge>
                            );
                          })()}
                          {ad.expires_at && (() => {
                            const ms = new Date(ad.expires_at).getTime() - Date.now();
                            if (ms < 0) return <span className="text-[9px] text-red-500 font-semibold">Ended {Math.abs(Math.floor(ms / 86400000))}d ago</span>;
                            const days = Math.ceil(ms / 86400000);
                            return <span className={`text-[9px] font-semibold ${days <= 2 ? 'text-orange-500' : 'text-muted-foreground'}`}>Expires in {days}d</span>;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!ad.approved && !ad.rejection_reason && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 rounded-xl" onClick={() => approveAd(ad)} title="Approve">
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setSelectedAd(ad)} title="View details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => toggleAdStatus(ad)} title={ad.is_active ? 'Pause' : 'Activate'}>
                            {ad.is_active ? <Pause className="h-4 w-4 text-yellow-500" /> : <Play className="h-4 w-4 text-green-500" />}
                          </Button>
                          {onNavigateSyndicate && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 rounded-xl" onClick={() => onNavigateSyndicate(ad)} title="View Syndicate Broadcasts">
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-xl" onClick={() => deleteAd(ad.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Ad Detail Dialog - Mobile Optimized & Scrollable */}
      <Dialog open={!!selectedAd} onOpenChange={(open) => !open && setSelectedAd(null)}>
        <DialogContent className="w-[94vw] max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl p-4 sm:p-6 border-border bg-card shadow-2xl">
          <DialogHeader className="pb-2 border-b border-border/80">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-bold">Advertisement Details</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Review banner assets, target destination, and moderation actions
            </DialogDescription>
          </DialogHeader>

          {selectedAd && (
            <div className="space-y-4 pt-2">
              {selectedAd.image_url && (
                <img 
                  loading="lazy" 
                  src={selectedAd.image_url} 
                  alt={selectedAd.title} 
                  className="w-full h-44 sm:h-52 object-cover rounded-2xl border border-border shadow-sm bg-muted" 
                />
              )}

              {selectedAd.ad_type === 'watch' && selectedAd.youtube_url && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Youtube className="h-3.5 w-3.5" /> Watch-To-Earn Media
                  </p>
                  <a href={selectedAd.youtube_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline break-all font-semibold">
                    {selectedAd.youtube_url}
                  </a>
                  <p className="text-[10px] text-muted-foreground">
                    Required Watch: {selectedAd.watch_duration_seconds}s · Reward: {selectedAd.reward_credits} credits · Budget: {selectedAd.budget_credits} credits
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <h3 className="font-bold text-base sm:text-lg text-foreground">{selectedAd.title}</h3>
                {selectedAd.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{selectedAd.description}</p>
                )}
                {selectedAd.target_state && (
                  <p className="text-xs flex items-center gap-1 text-orange-600 font-semibold">
                    <MapPin className="h-3.5 w-3.5" /> Target State: {selectedAd.target_state}
                  </p>
                )}
                {selectedAd.rejection_reason && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                    <p className="font-bold">Rejection Note:</p>
                    <p>{selectedAd.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Detail Matrix */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Owner Email</p>
                  <p className="font-bold truncate text-foreground">{selectedAd.owner_email}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Traffic Source</p>
                  <p className="font-bold text-foreground">{selectedAd.source === 'api' ? '🌐 API Integration' : '🖥️ Direct Portal'}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Impressions</p>
                  <p className="font-bold text-foreground">{selectedAd.impressions || 0}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <p className="text-[10px] text-muted-foreground font-semibold">Clicks</p>
                  <p className="font-bold text-foreground">{selectedAd.clicks || 0}</p>
                </div>
              </div>

              {/* Target URL Box */}
              <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50 space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold">Target Destination URL</p>
                <a 
                  href={selectedAd.target_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-primary underline break-all flex items-center gap-1 font-semibold"
                >
                  <span>{selectedAd.target_url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              {/* Duration Extension Section */}
              <div className="bg-muted/40 rounded-2xl p-3 border border-border/50 space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-purple-600" />
                  Extend Advertisement Duration
                </p>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    min={1} 
                    value={extendDays} 
                    onChange={e => setExtendDays(e.target.value)} 
                    className="h-9 text-xs rounded-xl bg-card" 
                    placeholder="Days (e.g. 7)" 
                  />
                  <Button 
                    size="sm" 
                    className="text-xs rounded-xl px-4 font-bold bg-purple-600 hover:bg-purple-700 text-white" 
                    onClick={extendAdDuration} 
                    disabled={extending}
                  >
                    {extending ? 'Saving...' : 'Extend'}
                  </Button>
                </div>
                {selectedAd.expires_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Current Expiry: {new Date(selectedAd.expires_at).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {!selectedAd.approved && !selectedAd.rejection_reason && (
                  <Button 
                    size="sm" 
                    className="text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl h-10 col-span-2" 
                    onClick={() => approveAd(selectedAd)}
                  >
                    <Check className="h-4 w-4 mr-1.5" /> Approve & Launch Ad
                  </Button>
                )}

                <Button 
                  size="sm" 
                  variant={selectedAd.is_active ? 'secondary' : 'default'}
                  className="text-xs font-bold rounded-xl h-10"
                  onClick={() => { toggleAdStatus(selectedAd); }}
                >
                  {selectedAd.is_active ? <><Pause className="h-3.5 w-3.5 mr-1.5 text-yellow-600" /> Pause Ad</> : <><Play className="h-3.5 w-3.5 mr-1.5 text-green-600" /> Resume Ad</>}
                </Button>

                {onNavigateSyndicate && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs font-bold border-purple-500/30 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl h-10"
                    onClick={() => {
                      onNavigateSyndicate(selectedAd);
                      setSelectedAd(null);
                    }}
                  >
                    <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Syndicate
                  </Button>
                )}

                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="text-xs font-bold rounded-xl h-10" 
                  onClick={() => deleteAd(selectedAd.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Ad
                </Button>
              </div>

              {/* Reject Reason Form (if pending) */}
              {!selectedAd.approved && !selectedAd.rejection_reason && (
                <div className="space-y-2 pt-3 border-t border-border/80">
                  <p className="text-xs font-bold text-destructive">Reject with Reason</p>
                  <Textarea 
                    value={rejectReason} 
                    onChange={e => setRejectReason(e.target.value)} 
                    placeholder="State reason for rejection (e.g. low quality creative, broken target URL)..." 
                    rows={2} 
                    className="text-xs rounded-xl bg-card" 
                  />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl h-9" 
                    onClick={() => rejectAd(selectedAd, rejectReason)}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" /> Confirm Rejection
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

