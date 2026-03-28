
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertYouTubeUrl } from "@/utils/funnel/utils";

interface VideoSectionProps {
  mainVideoUrl: string;
  bonusVideoUrl: string;
  onMainVideoUrlChange: (value: string) => void;
  onBonusVideoUrlChange: (value: string) => void;
}

const VideoSection = ({
  mainVideoUrl,
  bonusVideoUrl,
  onMainVideoUrlChange,
  onBonusVideoUrlChange
}: VideoSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="mainVideoUrl" className="text-lg font-medium">Main YouTube Video URL</Label>
          <Input
            id="mainVideoUrl"
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            value={mainVideoUrl}
            onChange={(e) => onMainVideoUrlChange(e.target.value)}
            className="mt-2"
          />
          {mainVideoUrl && mainVideoUrl.trim() && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-600">Video Preview:</Label>
              <div className="mt-2 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {(() => {
                  const embedUrl = convertYouTubeUrl(mainVideoUrl);
                  if (!embedUrl) {
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                        <p className="text-red-600 text-sm">Invalid YouTube URL</p>
                      </div>
                    );
                  }
                  return (
                    <iframe 
                      src={embedUrl} 
                      className="w-full h-full border-none"
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title="Main Video Preview"
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <Label htmlFor="bonusVideoUrl" className="text-lg font-medium">Bonus YouTube Video URL</Label>
          <Input
            id="bonusVideoUrl"
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            value={bonusVideoUrl}
            onChange={(e) => onBonusVideoUrlChange(e.target.value)}
            className="mt-2"
          />
          {bonusVideoUrl && bonusVideoUrl.trim() && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-600">Video Preview:</Label>
              <div className="mt-2 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {(() => {
                  const embedUrl = convertYouTubeUrl(bonusVideoUrl);
                  if (!embedUrl) {
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                        <p className="text-red-600 text-sm">Invalid YouTube URL</p>
                      </div>
                    );
                  }
                  return (
                    <iframe 
                      src={embedUrl} 
                      className="w-full h-full border-none"
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title="Bonus Video Preview"
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoSection;
