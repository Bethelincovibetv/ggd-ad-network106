import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminVideoManager = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', youtube_url: '', section: 'homepage', description: '' });

  useEffect(() => { fetchVideos(); }, []);

  const fetchVideos = async () => {
    const { data } = await supabase.from('promotional_videos' as any).select('*').order('sort_order');
    setVideos(data || []);
    setLoading(false);
  };

  const addVideo = async () => {
    if (!form.title.trim() || !form.youtube_url.trim()) { toast.error("Title and YouTube URL required"); return; }
    const { error } = await supabase.from('promotional_videos' as any).insert(form as any);
    if (error) { toast.error("Failed to add video"); return; }
    toast.success("Video added!");
    setForm({ title: '', youtube_url: '', section: 'homepage', description: '' });
    setAdding(false);
    fetchVideos();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promotional_videos' as any).update({ is_active: !current } as any).eq('id', id);
    fetchVideos();
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await supabase.from('promotional_videos' as any).delete().eq('id', id);
    toast.success("Video deleted!");
    fetchVideos();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Video className="h-4 w-4 text-red-500" /> Promotional Videos
        </h2>
        <Button size="sm" onClick={() => setAdding(true)} className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white">
          <Plus className="h-3 w-3 mr-1" />Add Video
        </Button>
      </div>

      {adding && (
        <Card className="border-orange-200">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Video title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <Input placeholder="YouTube URL *" value={form.youtube_url} onChange={e => setForm({...form, youtube_url: e.target.value})} />
            <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <div>
              <Label className="text-xs">Section</Label>
              <Select value={form.section} onValueChange={v => setForm({...form, section: v})}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homepage">Homepage</SelectItem>
                  <SelectItem value="syndicate">Syndicate Section</SelectItem>
                  <SelectItem value="about">About Page</SelectItem>
                  <SelectItem value="business">Business Section</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addVideo} className="flex-1 text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white">Add Video</Button>
              <Button onClick={() => setAdding(false)} variant="outline" className="flex-1 text-xs">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {videos.map((v: any) => (
          <Card key={v.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Video className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{v.youtube_url}</p>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{v.section}</span>
              </div>
              <Switch checked={v.is_active} onCheckedChange={() => toggleActive(v.id, v.is_active)} />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteVideo(v.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {videos.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No videos added yet</p>}
      </div>
    </div>
  );
};

export default AdminVideoManager;
