import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Download, Sparkles, UserPlus, ArrowRight, 
  Smartphone, MessageSquare, Gift, ShieldCheck 
} from "lucide-react";
import { toast } from "sonner";
import { 
  fetchCompiledContacts, 
  downloadDailyVCFFile, 
  getActiveContactCampaigns,
  getContactGainSettings,
  ContactEntry,
  ContactCampaign
} from "@/services/contactGainService";
import { supabase } from "@/integrations/supabase/client";

interface ContactGainFeedCardProps {
  onOpenContactHub?: () => void;
}

export const ContactGainFeedCard: React.FC<ContactGainFeedCardProps> = ({
  onOpenContactHub,
}) => {
  const [contactsCount, setContactsCount] = useState<number>(0);
  const [topCampaigns, setTopCampaigns] = useState<ContactCampaign[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [rewardCredits, setRewardCredits] = useState(50);
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const init = async () => {
      try {
        const [c, camp, s] = await Promise.all([
          fetchCompiledContacts(),
          getActiveContactCampaigns(),
          getContactGainSettings(),
        ]);
        setContactsCount(c.length);
        setTopCampaigns(camp.slice(0, 2));
        if (s?.daily_download_reward) setRewardCredits(s.daily_download_reward);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch {}
    };
    init();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadDailyVCFFile(userId);
      if (res.creditsAwarded > 0) {
        toast.success(`🎉 Contacts saved! You received +${res.creditsAwarded} Reward Credits!`);
      } else {
        toast.success(`✅ Downloaded ${res.count} verified Nigerian business contacts!`);
      }
    } catch {
      toast.error("Failed to download contact file");
    } finally {
      setDownloading(false);
    }
  };

  const handleClickHub = () => {
    if (onOpenContactHub) {
      onOpenContactHub();
    } else {
      window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'contact-gain' }));
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-neutral-950 via-gray-900 to-orange-950 border-2 border-orange-500/60 p-5 text-white shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[11px] font-black">
            <Sparkles className="h-3 w-3" /> DAILY CONTACT GAIN
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
            Today's Compiled Entrepreneur Phonebook
          </h3>
          <p className="text-xs text-neutral-300 leading-snug">
            Download {contactsCount} verified Nigerian merchants in 1 tap to expand your WhatsApp status reach.
          </p>
        </div>

        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 flex-shrink-0">
          <Users className="h-6 w-6 stroke-[2.5]" />
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/30 gap-1.5 flex-1"
        >
          {downloading ? (
            <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download Today's Contacts (.VCF)
        </Button>

        <Button
          variant="outline"
          onClick={handleClickHub}
          className="h-10 px-3.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border-neutral-700 text-xs font-bold gap-1"
        >
          <span>Save & Earn Hub</span>
          <ArrowRight className="h-3.5 w-3.5 text-orange-400" />
        </Button>
      </div>

      {/* Mini Campaign Preview */}
      {topCampaigns.length > 0 && (
        <div className="pt-2 border-t border-neutral-800 space-y-2">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Featured Save-to-Earn Tasks:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topCampaigns.map(camp => (
              <div 
                key={camp.id} 
                onClick={handleClickHub}
                className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-orange-500/50 transition-all cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{camp.title}</p>
                  <p className="text-[10px] text-neutral-400 truncate">{camp.contact_name} • {camp.state}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black flex-shrink-0">
                  +{camp.reward_per_save} Cr
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactGainFeedCard;
