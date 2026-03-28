import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Image, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SlideManager = () => {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newSlide, setNewSlide] = useState({ title: '', link_url: '', image_url: '' });

  useEffect(() => { fetchSlides(); }, []);

  const fetchSlides = async () => {
    const { data } = await supabase.from('slides').select('*').order('sort_order');
    setSlides(data || []);
    setLoading(false);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const fileName = `slides/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('slide-images').upload(fileName, file);
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('slide-images').getPublicUrl(fileName);
    setNewSlide(prev => ({ ...prev, image_url: publicUrl }));
    setUploading(false);
  };

  const createSlide = async () => {
    if (!newSlide.image_url) { toast.error("Upload an image first"); return; }
    const { error } = await supabase.from('slides').insert({
      image_url: newSlide.image_url,
      title: newSlide.title || null,
      link_url: newSlide.link_url || null,
      sort_order: slides.length,
    });
    if (error) { toast.error("Failed to create slide"); return; }
    toast.success("Slide added!");
    setNewSlide({ title: '', link_url: '', image_url: '' });
    fetchSlides();
  };

  const deleteSlide = async (id: string) => {
    await supabase.from('slides').delete().eq('id', id);
    toast.success("Slide deleted");
    fetchSlides();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2"><Image className="h-4 w-4" />Slide Management</h3>
      
      <Card className="border-purple-200">
        <CardContent className="p-4 space-y-3">
          <input type="file" id="slideImageUpload" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
          <Button variant="outline" className="w-full h-9 text-xs" disabled={uploading}
            onClick={() => document.getElementById('slideImageUpload')?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload Slide Image'}
          </Button>
          {newSlide.image_url && <img src={newSlide.image_url} alt="Preview" className="w-full h-24 object-cover rounded-lg" />}
          <Input placeholder="Title (optional)" value={newSlide.title} onChange={e => setNewSlide({ ...newSlide, title: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Link URL (optional)" value={newSlide.link_url} onChange={e => setNewSlide({ ...newSlide, link_url: e.target.value })} className="h-8 text-xs" />
          <Button onClick={createSlide} className="w-full text-xs" size="sm"><Plus className="h-3 w-3 mr-1" />Add Slide</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {slides.map(slide => (
          <Card key={slide.id} className="overflow-hidden">
            <CardContent className="p-2 flex items-center gap-3">
              <img src={slide.image_url} alt={slide.title || 'Slide'} className="w-20 h-12 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{slide.title || 'No title'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{slide.link_url || 'No link'}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSlide(slide.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SlideManager;
