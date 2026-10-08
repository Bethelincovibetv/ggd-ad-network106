import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Edit, ExternalLink, Globe, Layout, Check, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PLACEMENT_OPTIONS = [
  { id: 'marketplace', label: 'Marketplace', icon: Layout, desc: 'Apps Hub tab' },
  { id: 'landing', label: 'Home Landing Page', icon: Globe, desc: 'Visible to public visitors & users' },
  { id: 'dashboard', label: 'Dashboard Home', icon: Sparkles, desc: 'Quick tools for logged-in users' },
  { id: 'directory', label: 'Business Directory', icon: Store, desc: 'Alongside business listings' },
];

const AdminMarketingApps = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [placementsMap, setPlacementsMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // New app state
  const [newApp, setNewApp] = useState({
    title: '',
    description: '',
    app_link: '',
    image_url: '',
    is_free: true,
    credit_cost: 0,
    sort_order: 0,
    placements: ['marketplace', 'landing'] as string[],
  });

  // Edit app state
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    const [appsRes, placementsRes] = await Promise.all([
      supabase.from('marketing_apps').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('app_settings').select('value').eq('key', 'marketing_apps_placements').maybeSingle(),
    ]);

    setApps(appsRes.data || []);

    if (placementsRes.data?.value) {
      try {
        const parsed = JSON.parse(placementsRes.data.value);
        setPlacementsMap(parsed);
      } catch {
        setPlacementsMap({});
      }
    }
    setLoading(false);
  };

  const savePlacements = async (updated: Record<string, string[]>) => {
    setPlacementsMap(updated);
    await supabase.from('app_settings').upsert({
      key: 'marketing_apps_placements',
      value: JSON.stringify(updated),
    }, { onConflict: 'key' });
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `apps/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
      if (isEdit && editingApp) {
        setEditingApp((prev: any) => ({ ...prev, image_url: publicUrl }));
      } else {
        setNewApp(prev => ({ ...prev, image_url: publicUrl }));
      }
      toast.success('Image uploaded');
    } else {
      toast.error('Image upload failed');
    }
  };

  const toggleNewPlacement = (id: string) => {
    setNewApp(prev => {
      const exists = prev.placements.includes(id);
      const next = exists ? prev.placements.filter(p => p !== id) : [...prev.placements, id];
      return { ...prev, placements: next.length > 0 ? next : ['marketplace'] };
    });
  };

  const toggleEditPlacement = (id: string) => {
    if (!editingApp) return;
    const current = editingApp.placements || ['marketplace'];
    const exists = current.includes(id);
    const next = exists ? current.filter((p: string) => p !== id) : [...current, id];
    setEditingApp({ ...editingApp, placements: next.length > 0 ? next : ['marketplace'] });
  };

  const addApp = async () => {
    if (!newApp.title.trim() || !newApp.app_link.trim()) {
      toast.error('Title and app link are required');
      return;
    }

    const { data, error } = await supabase.from('marketing_apps').insert({
      title: newApp.title.trim(),
      description: newApp.description.trim() || null,
      app_link: newApp.app_link.trim(),
      image_url: newApp.image_url || null,
      is_free: newApp.is_free,
      credit_cost: newApp.is_free ? 0 : (Number(newApp.credit_cost) || 0),
      sort_order: Number(newApp.sort_order) || 0,
      is_active: true,
    }).select('id').single();

    if (error) {
      toast.error('Failed to create marketing app: ' + error.message);
      return;
    }

    if (data?.id) {
      const nextPlacements = {
        ...placementsMap,
        [data.id]: newApp.placements.length > 0 ? newApp.placements : ['marketplace', 'landing'],
      };
      await savePlacements(nextPlacements);
    }

    toast.success('Marketing App added successfully!');
    setNewApp({
      title: '',
      description: '',
      app_link: '',
      image_url: '',
      is_free: true,
      credit_cost: 0,
      sort_order: 0,
      placements: ['marketplace', 'landing'],
    });
    fetchApps();
  };

  const openEditModal = (app: any) => {
    const currentPlacements = placementsMap[app.id] || ['marketplace', 'landing'];
    setEditingApp({
      id: app.id,
      title: app.title || '',
      description: app.description || '',
      app_link: app.app_link || '',
      image_url: app.image_url || '',
      is_free: !!app.is_free,
      credit_cost: app.credit_cost || 0,
      sort_order: app.sort_order || 0,
      is_active: !!app.is_active,
      placements: currentPlacements,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingApp || !editingApp.title.trim() || !editingApp.app_link.trim()) {
      toast.error('Title and app link are required');
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase.from('marketing_apps').update({
      title: editingApp.title.trim(),
      description: editingApp.description.trim() || null,
      app_link: editingApp.app_link.trim(),
      image_url: editingApp.image_url || null,
      is_free: editingApp.is_free,
      credit_cost: editingApp.is_free ? 0 : (Number(editingApp.credit_cost) || 0),
      sort_order: Number(editingApp.sort_order) || 0,
      is_active: editingApp.is_active,
    }).eq('id', editingApp.id);

    if (error) {
      toast.error('Failed to update marketing app: ' + error.message);
      setSavingEdit(false);
      return;
    }

    const updatedPlacements = {
      ...placementsMap,
      [editingApp.id]: editingApp.placements && editingApp.placements.length > 0
        ? editingApp.placements
        : ['marketplace'],
    };
    await savePlacements(updatedPlacements);

    toast.success('App updated successfully!');
    setSavingEdit(false);
    setIsEditOpen(false);
    setEditingApp(null);
    fetchApps();
  };

  const deleteApp = async (id: string) => {
    if (!confirm('Are you sure you want to delete this marketing app?')) return;
    const { error } = await supabase.from('marketing_apps').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
      return;
    }
    const updated = { ...placementsMap };
    delete updated[id];
    await savePlacements(updated);
    toast.success('Marketing app deleted');
    fetchApps();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from('marketing_apps').update({ is_active: !currentActive }).eq('id', id);
    toast.success(!currentActive ? 'App activated' : 'App deactivated');
    fetchApps();
  };

  return (
    <div className="space-y-6">
      {/* Create New App */}
      <Card className="border shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-black flex items-center justify-between">
            <span>Add New Marketing App</span>
            <Badge variant="outline" className="text-xs">Full Admin Control</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure tools and growth apps. Select exactly which pages (Landing Page, Marketplace, Dashboard, Directory) each app appears on.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">App Title *</Label>
              <Input
                placeholder="e.g. AI Content Writer Pro"
                value={newApp.title}
                onChange={e => setNewApp(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">App Link (URL) *</Label>
              <Input
                placeholder="https://..."
                value={newApp.app_link}
                onChange={e => setNewApp(p => ({ ...p, app_link: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Description</Label>
            <Textarea
              placeholder="What does this app do? Describe its features for users..."
              rows={2}
              value={newApp.description}
              onChange={e => setNewApp(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Pricing & Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 rounded-xl bg-secondary/40 border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Access Model</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={newApp.is_free}
                  onCheckedChange={c => setNewApp(p => ({ ...p, is_free: c }))}
                />
                <span className={`text-xs font-bold ${newApp.is_free ? 'text-emerald-600' : 'text-purple-600'}`}>
                  {newApp.is_free ? 'Free (Immediate Access)' : 'Paid (Requires Credits)'}
                </span>
              </div>
            </div>

            {!newApp.is_free && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Credit Cost</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 50"
                  value={newApp.credit_cost}
                  onChange={e => setNewApp(p => ({ ...p, credit_cost: parseInt(e.target.value) || 0 }))}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sort Order</Label>
              <Input
                type="number"
                placeholder="0"
                value={newApp.sort_order}
                onChange={e => setNewApp(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {/* Display Placements */}
          <div className="space-y-2 p-3 rounded-xl bg-secondary/20 border">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Display On Pages (Choose Where App Appears)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLACEMENT_OPTIONS.map(opt => {
                const active = newApp.placements.includes(opt.id);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleNewPlacement(opt.id)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-orange-500/10 border-orange-500 text-foreground shadow-sm'
                        : 'bg-card border-border/60 text-muted-foreground hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <Icon className={`h-4 w-4 ${active ? 'text-orange-600' : 'text-muted-foreground'}`} />
                      {active && <Check className="h-3.5 w-3.5 text-orange-600 font-bold" />}
                    </div>
                    <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">App Logo / Banner Image</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Image URL or upload..."
                value={newApp.image_url}
                onChange={e => setNewApp(p => ({ ...p, image_url: e.target.value }))}
                className="flex-1"
              />
              <input
                type="file"
                id="newAppImage"
                accept="image/*"
                onChange={e => uploadImage(e, false)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('newAppImage')?.click()}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
            {newApp.image_url && (
              <img
                src={newApp.image_url}
                alt="Preview"
                className="h-20 w-36 rounded-lg object-cover border shadow-sm"
              />
            )}
          </div>

          <Button onClick={addApp} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold h-11">
            <Plus className="h-4 w-4 mr-1.5" /> Add Marketing App
          </Button>
        </CardContent>
      </Card>

      {/* Existing Apps List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-foreground">
            Manage Existing Marketing Apps ({apps.length})
          </h3>
          <p className="text-xs text-muted-foreground">Click Edit to modify details and page placements</p>
        </div>

        {apps.map(app => {
          const appPlacements = placementsMap[app.id] || ['marketplace', 'landing'];
          return (
            <Card key={app.id} className="border shadow-sm overflow-hidden hover:border-orange-500/40 transition-all">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {app.image_url ? (
                    <img
                      src={app.image_url}
                      alt={app.title}
                      className="h-14 w-14 rounded-xl object-cover border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0 font-bold text-lg">
                      {app.title?.charAt(0) || 'A'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground truncate">{app.title}</h4>
                      <Badge className={app.is_free ? 'bg-emerald-500 text-white text-[10px]' : 'bg-purple-600 text-white text-[10px]'}>
                        {app.is_free ? 'Free' : `${app.credit_cost} Credits`}
                      </Badge>
                      {!app.is_active && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] border-dashed">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    {app.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{app.description}</p>
                    )}

                    {/* Placements Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] text-muted-foreground font-semibold">Displays on:</span>
                      {appPlacements.map((pId: string) => {
                        const opt = PLACEMENT_OPTIONS.find(o => o.id === pId);
                        return (
                          <Badge
                            key={pId}
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 bg-secondary/80 text-foreground font-semibold"
                          >
                            {opt?.label || pId}
                          </Badge>
                        );
                      })}
                      <span className="text-[10px] text-muted-foreground ml-2">Order: #{app.sort_order || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(app.app_link, '_blank')}
                    className="h-8 px-2.5 text-xs gap-1"
                    title="Open App URL"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(app)}
                    className="h-8 px-3 text-xs gap-1.5 font-bold border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>

                  <div className="flex items-center gap-1.5 pl-2 border-l">
                    <Switch
                      checked={app.is_active}
                      onCheckedChange={() => toggleActive(app.id, app.is_active)}
                      title={app.is_active ? 'Deactivate' : 'Activate'}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteApp(app.id)}
                      title="Delete app"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {apps.length === 0 && !loading && (
          <div className="text-center py-12 border-2 border-dashed rounded-2xl">
            <p className="text-sm font-semibold text-muted-foreground">No marketing apps configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Use the form above to add your first marketing app.</p>
          </div>
        )}
      </div>

      {/* Edit App Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Edit className="h-5 w-5 text-orange-500" /> Edit Marketing App
            </DialogTitle>
          </DialogHeader>

          {editingApp && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">App Title *</Label>
                <Input
                  value={editingApp.title}
                  onChange={e => setEditingApp({ ...editingApp, title: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">App Link (URL) *</Label>
                <Input
                  value={editingApp.app_link}
                  onChange={e => setEditingApp({ ...editingApp, app_link: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  rows={2}
                  value={editingApp.description}
                  onChange={e => setEditingApp({ ...editingApp, description: e.target.value })}
                />
              </div>

              {/* Pricing & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/40 border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Access Model</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={editingApp.is_free}
                      onCheckedChange={c => setEditingApp({ ...editingApp, is_free: c })}
                    />
                    <span className={`text-xs font-bold ${editingApp.is_free ? 'text-emerald-600' : 'text-purple-600'}`}>
                      {editingApp.is_free ? 'Free' : 'Paid'}
                    </span>
                  </div>
                </div>

                {!editingApp.is_free && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Credit Cost</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingApp.credit_cost}
                      onChange={e => setEditingApp({ ...editingApp, credit_cost: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Sort Order</Label>
                  <Input
                    type="number"
                    value={editingApp.sort_order}
                    onChange={e => setEditingApp({ ...editingApp, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Display Placements */}
              <div className="space-y-2 p-3 rounded-xl bg-secondary/20 border">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Display On Pages
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PLACEMENT_OPTIONS.map(opt => {
                    const active = (editingApp.placements || []).includes(opt.id);
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleEditPlacement(opt.id)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-orange-500/10 border-orange-500 text-foreground shadow-sm'
                            : 'bg-card border-border/60 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className={`h-4 w-4 ${active ? 'text-orange-600' : 'text-muted-foreground'}`} />
                          {active && <Check className="h-3.5 w-3.5 text-orange-600 font-bold" />}
                        </div>
                        <span className="text-xs font-bold leading-tight">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Logo / Banner Image</Label>
                <div className="flex gap-2">
                  <Input
                    value={editingApp.image_url}
                    onChange={e => setEditingApp({ ...editingApp, image_url: e.target.value })}
                    className="flex-1"
                  />
                  <input
                    type="file"
                    id="editAppImage"
                    accept="image/*"
                    onChange={e => uploadImage(e, true)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('editAppImage')?.click()}
                    className="gap-1.5"
                  >
                    <Upload className="h-4 w-4" /> Upload
                  </Button>
                </div>
                {editingApp.image_url && (
                  <img
                    src={editingApp.image_url}
                    alt="Preview"
                    className="h-20 w-36 rounded-lg object-cover border shadow-sm"
                  />
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
                <div>
                  <p className="text-xs font-bold">App Status</p>
                  <p className="text-[10px] text-muted-foreground">Toggle whether users can discover this app</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingApp.is_active}
                    onCheckedChange={c => setEditingApp({ ...editingApp, is_active: c })}
                  />
                  <span className="text-xs font-semibold">{editingApp.is_active ? 'Active' : 'Hidden'}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMarketingApps;
