import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeEmbedProps {
  section: string;
  className?: string;
}

const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const YouTubeEmbed = ({ section, className = '' }: YouTubeEmbedProps) => {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('promotional_videos' as any).select('*')
      .eq('section', section).eq('is_active', true).order('sort_order')
      .then(({ data }) => setVideos(data || []));
  }, [section]);

  if (videos.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {videos.map((video: any) => {
        const videoId = getYouTubeId(video.youtube_url);
        if (!videoId) return null;
        return (
          <Card key={video.id} className="overflow-hidden border-border/50">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {video.title && (
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-foreground">{video.title}</p>
                {video.description && <p className="text-[10px] text-muted-foreground mt-1">{video.description}</p>}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default YouTubeEmbed;
