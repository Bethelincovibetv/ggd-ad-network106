import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, ExternalLink, Share2, Smartphone } from 'lucide-react';
import { ShareToEarnBroadcastModal } from '@/components/whatsapp/ShareToEarnBroadcastModal';

interface Props { ad: any; currentUserId?: string | null }

/** Active Banner Adverts rendered as clearly-labelled sponsored feed posts.
 *  Reuses the existing `ads` table plus its impression/click counters. */
const SponsoredAdCard: React.FC<Props> = ({ ad, currentUserId }) => {
  const logged = useRef(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    supabase.from('ads').update({ impressions: (ad.impressions || 0) + 1 }).eq('id', ad.id).then(() => {});
    supabase.from('ad_events').insert({ ad_id: ad.id, event_type: 'impression' }).then(() => {});
  }, [ad.id]);

  const open = async () => {
    await supabase.from('ads').update({ clicks: (ad.clicks || 0) + 1 }).eq('id', ad.id);
    await supabase.from('ad_events').insert({ ad_id: ad.id, event_type: 'click' });
    window.open(ad.target_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Card className="border border-orange-500/30 shadow-sm overflow-hidden rounded-xl">
        <CardContent className="p-0">
          <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-[13px] truncate">{ad.title}</p>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 shrink-0">SPONSORED</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Advertisement · GGD Ad Network</p>
            </div>
          </div>
          {ad.description && (
            <p className="px-3 pb-2 text-[14px] leading-snug whitespace-pre-wrap break-words">{ad.description}</p>
          )}
          {ad.image_url && (
            <button onClick={open} className="block w-full">
              <img loading="lazy" src={ad.image_url} alt={ad.title} className="w-full max-h-[420px] object-cover" />
            </button>
          )}
          <div className="p-3 grid grid-cols-2 gap-2">
            <Button onClick={open} className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-xs">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Learn more
            </Button>
            <Button
              onClick={() => setIsShareModalOpen(true)}
              variant="outline"
              className="h-11 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold text-xs"
            >
              <Smartphone className="h-4 w-4 mr-1.5 text-emerald-600" /> Share to Earn
            </Button>
          </div>
        </CardContent>
      </Card>

      <ShareToEarnBroadcastModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={{
          id: ad.id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.image_url,
          targetUrl: ad.target_url,
          rewardCredits: 50,
        }}
        userId={currentUserId || undefined}
      />
    </>
  );
};

export default SponsoredAdCard;