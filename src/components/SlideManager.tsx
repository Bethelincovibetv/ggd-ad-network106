import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Image, Plus, Trash2, Upload, Loader2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SlideManager = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSlide, setNewSlide] = useState({ title: '', link_url: '', image_url: '' });
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => { fetchSlides(); }, []);

  const fetchSlides = async () => {
    const { data } = await supabase.from('slides').select('*').order('sort_order');
    setSlides(data || []);
    setLoading(false);
  };

  const uploadImage = async (file: File, target: 'new' | 'edit') => {
    setUploading(true);
    const fileName = `slides/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
    if (target === 'new') setNewSlide(prev => ({ ...prev, image_url: publicUrl }));
    else setEditing((p: any) => ({ ...p, image_url: publicUrl }));
    setUploading(false);
  };

  const createSlide = async () => {
    if (!newSlide.image_url) { toast.error("Upload an image first"); return; }
    const { error } = await supabase.from('slides').insert({
      image_url: newSlide.image_url,
      title: newSlide.title || null,
      link_url: newSlide.link_url || null,
      sort_order: slides.length,
      is_active: true,
    });
    if (error) { toast.error("Failed to create slide"); return; }
    toast.success("Slide added!");
    setNewSlide({ title: '', link_url: '', image_url: '' });
    fetchSlides();
  };

  const toggleActive = async (slide: any) => {
    await supabase.from('slides').update({ is_active: !slide.is_active }).eq('id', slide.id);
    fetchSlides();
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await supabase.from('slides').delete().eq('id', id);
    toast.success("Slide deleted");
    fetchSlides();
  };

  const saveEdit = async () => {
    if (!editing) return;
    await supabase.from('slides').update({
      title: editing.title || null,
      link_url: editing.link_url || null,
      image_url: editing.image_url,
      is_active: editing.is_active,
    }).eq('id', editing.id);
    toast.success('Slide updated');
    setEditing(null);
    fetchSlides();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2"><Image className="h-4 w-4" />Slide Management</h3>

      <Card className="border-purple-200">
        <CardContent className="p-4 space-y-3">
          <input type="file" id="slideImageUpload" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'new'); }} />
          <Button variant="outline" className="w-full h-9 text-xs" disabled={uploading}
            onClick={() => document.getElementById('slideImageUpload')?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload Slide Image'}
          </Button>
          {newSlide.image_url && <img src={newSlide.image_url} alt="Preview" className="w-full h-24 object-cover rounded-lg" />}
          <Input placeholder="Title (optional)" value={newSlide.title} onChange={e => setNewSlide({ ...newSlide, title: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Link URL (optional)" value={newSlide.link_url} onChange={e => setNewSlide({ ...newSlide, link_url: e.target.value })} className="h-8 text-xs" />
          <Button onClick={createSlide} className="w-full text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white" size="sm"><Plus className="h-3 w-3 mr-1" />Add Slide</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {slides.map(slide => (
          <Card key={slide.id} className="overflow-hidden">
            <CardContent className="p-2">
              {editing?.id === slide.id ? (
                <div className="space-y-2">
                  <img src={editing.image_url} alt="" className="w-full h-20 object-cover rounded" />
                  <input type="file" id={`edit-${slide.id}`} accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'edit'); }} />
                  <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => document.getElementById(`edit-${slide.id}`)?.click()}>
                    <Upload className="h-3 w-3 mr-1" />Replace image
                  </Button>
                  <Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Title" className="h-7 text-xs" />
                  <Input value={editing.link_url || ''} onChange={e => setEditing({ ...editing, link_url: e.target.value })} placeholder="Link URL" className="h-7 text-xs" />
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2">
                    <span className="text-[10px] font-semibold">Active</span>
                    <Switch checked={!!editing.is_active} onCheckedChange={c => setEditing({ ...editing, is_active: c })} />
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="flex-1 h-7 text-[10px] bg-gradient-to-r from-orange-500 to-red-600 text-white" onClick={saveEdit}><Save className="h-3 w-3 mr-1" />Save</Button>
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px]" onClick={() => setEditing(null)}><X className="h-3 w-3 mr-1" />Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img src={slide.image_url} alt={slide.title || 'Slide'} className="w-20 h-12 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{slide.title || 'No title'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{slide.link_url || 'No link'}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${slide.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {slide.is_active ? 'LIVE' : 'OFF'}
                    </span>
                  </div>
                  <Switch checked={!!slide.is_active} onCheckedChange={() => toggleActive(slide)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...slide })}><Edit className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSlide(slide.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SlideManager;
