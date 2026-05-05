import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Plus, Trash2, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BusinessAddonsProps {
  isAdmin?: boolean;
}

const BusinessAddons = ({ isAdmin = false }: BusinessAddonsProps) => {
  const [addons, setAddons] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newAddon, setNewAddon] = useState({ name: '', description: '', price: '0', is_free: true });

  useEffect(() => { fetchAddons(); }, []);

  const fetchAddons = async () => {
    const { data } = await supabase.from('business_addons').select('*').order('sort_order', { ascending: true });
    setAddons(data || []);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: pData } = await supabase.from('user_addon_purchases').select('addon_id').eq('user_id', user.id);
      setPurchases((pData || []).map(p => p.addon_id));
    }
  };

  const createAddon = async () => {
    if (!newAddon.name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from('business_addons').insert({
      name: newAddon.name,
      description: newAddon.description || null,
      price: newAddon.is_free ? 0 : parseFloat(newAddon.price) || 0,
      is_free: newAddon.is_free,
    });
    if (error) { toast.error("Failed to create add-on"); return; }
    toast.success("Add-on created!");
    setNewAddon({ name: '', description: '', price: '0', is_free: true });
    setShowCreate(false);
    fetchAddons();
  };

  const deleteAddon = async (id: string) => {
    await supabase.from('business_addons').delete().eq('id', id);
    toast.success("Add-on deleted");
    fetchAddons();
  };

  const toggleAddon = async (id: string, current: boolean) => {
    await supabase.from('business_addons').update({ is_active: !current }).eq('id', id);
    fetchAddons();
  };

  const purchaseAddon = async (addon: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!addon.is_free) {
      const { data: profile } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
      const credits = profile?.credits || 0;
      if (credits < addon.price) {
        toast.error(`Not enough credits. Need ₦${addon.price}, have ₦${credits}`);
        return;
      }
      await supabase.from('profiles').update({ credits: credits - addon.price }).eq('user_id', user.id);
    }

    const { error } = await supabase.from('user_addon_purchases').insert({ user_id: user.id, addon_id: addon.id });
    if (error) {
      if (error.code === '23505') { toast.info("Already purchased!"); return; }
      toast.error("Failed to purchase"); return;
    }
    setPurchases(prev => [...prev, addon.id]);
    toast.success(`${addon.name} activated!`);
  };

  // Admin view
  if (isAdmin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4" />Business Add-ons
          </h3>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>

        {showCreate && (
          <Card className="border-orange-200">
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Add-on name *" value={newAddon.name} onChange={e => setNewAddon({ ...newAddon, name: e.target.value })} className="h-9 text-sm" />
              <Input placeholder="Description" value={newAddon.description} onChange={e => setNewAddon({ ...newAddon, description: e.target.value })} className="h-9 text-sm" />
              <div className="flex items-center gap-3">
                <Switch checked={newAddon.is_free} onCheckedChange={c => setNewAddon({ ...newAddon, is_free: c })} />
                <Label className="text-xs">{newAddon.is_free ? 'Free' : 'Paid'}</Label>
              </div>
              {!newAddon.is_free && (
                <div>
                  <Label className="text-xs">Price (₦)</Label>
                  <Input type="number" value={newAddon.price} onChange={e => setNewAddon({ ...newAddon, price: e.target.value })} className="h-9 text-sm" />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={createAddon} className="flex-1 text-xs">Create</Button>
                <Button onClick={() => setShowCreate(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {addons.map(addon => (
            <Card key={addon.id} className={!addon.is_active ? 'opacity-50' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{addon.name}</p>
                  {addon.description && <p className="text-[10px] text-muted-foreground">{addon.description}</p>}
                  <p className="text-[10px] font-bold text-green-600">{addon.is_free ? 'Free' : `₦${addon.price}`}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toggleAddon(addon.id, addon.is_active)}>
                  {addon.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAddon(addon.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // User view
  return (
    <div className="space-y-4">
      <div className="text-center">
        <Sparkles className="h-8 w-8 mx-auto text-orange-500 mb-2" />
        <h2 className="text-lg font-bold text-foreground">Business Add-ons</h2>
        <p className="text-xs text-muted-foreground">Unlock extra features for your business</p>
      </div>

      <div className="space-y-2">
        {addons.filter(a => a.is_active).map(addon => {
          const owned = purchases.includes(addon.id);
          return (
            <Card key={addon.id} className={`border ${owned ? 'border-green-300 bg-green-50/50' : 'border-border'}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-full ${owned ? 'bg-green-100' : 'bg-orange-100'}`}>
                  {owned ? <Check className="h-4 w-4 text-green-600" /> : <Package className="h-4 w-4 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{addon.name}</p>
                  {addon.description && <p className="text-xs text-muted-foreground">{addon.description}</p>}
                  <p className="text-xs font-bold mt-0.5">{addon.is_free ? <span className="text-green-600">Free</span> : <span className="text-orange-600">₦{addon.price}</span>}</p>
                </div>
                {owned ? (
                  <span className="text-[10px] text-green-600 font-bold px-2 py-1 bg-green-100 rounded-full">Active ✓</span>
                ) : (
                  <Button size="sm" className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white" onClick={() => purchaseAddon(addon)}>
                    {addon.is_free ? 'Activate' : `Buy ₦${addon.price}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {addons.filter(a => a.is_active).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No add-ons available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessAddons;
