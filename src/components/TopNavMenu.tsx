import React from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LayoutDashboard, Briefcase, Users, Wallet, Crown, Megaphone, Store, Key, Info, Share2, BookOpen, Building2, Sparkles, CheckSquare } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface TopNavMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isBusiness: boolean;
  isSyndicate: boolean;
  isAdmin: boolean;
  isPremium?: boolean;
}

const TopNavMenu = ({ activeTab, onTabChange, isBusiness, isSyndicate, isAdmin, isPremium }: TopNavMenuProps) => {
  const { isEnabled } = useFeatureToggles();

  const items = [
    { id: 'ads', icon: LayoutDashboard, label: 'Home', matches: ['ads'] },
    ...(isEnabled('community') ? [{ id: 'feed', icon: Sparkles, label: 'Community', matches: ['feed'] }] : []),
    ...(isEnabled('ads') ? [{ id: 'campaigns', icon: Megaphone, label: 'Advertising', matches: ['campaigns', 'ads-create'] }] : []),
    { id: 'my-business', icon: Store, label: 'My Business', matches: ['my-business', 'business', 'growth'] },
    { id: 'wallet', icon: Wallet, label: 'Wallet', matches: ['wallet', 'fund-credits', 'transfer', 'task-wallet', 'syndicate-wallet'] },
    ...(isEnabled('tasks') ? [{ id: 'tasks', icon: CheckSquare, label: 'Tasks', matches: ['tasks'] }] : []),
    ...(isEnabled('syndicate') ? [{
      id: isSyndicate ? 'syndicate' : 'syndicate-join',
      icon: Users,
      label: isSyndicate ? 'Syndicate Hub' : 'Join Syndicate',
      matches: ['syndicate', 'syndicate-join', 'business-tasks']
    }] : []),
    ...(isEnabled('promotional_content') || isEnabled('referral_system') ? [{
      id: 'share-earn',
      icon: Share2,
      label: 'Share & Earn',
      matches: ['share-earn', 'promo', 'referrals']
    }] : []),
    ...(isEnabled('directory') ? [{ id: 'directory', icon: Building2, label: 'Directory', matches: ['directory'] }] : []),
    ...(isEnabled('marketplace') ? [{ id: 'marketplace', icon: Store, label: 'Marketing Apps', matches: ['marketplace'] }] : []),
    { id: 'premium', icon: Crown, label: 'VIP Premium', matches: ['premium', 'upgrade'] },
    ...((isPremium || isAdmin) && isEnabled('api_keys') ? [{ id: 'api-keys', icon: Key, label: 'API Keys', matches: ['api-keys'] }] : []),
    ...(isEnabled('quick_guide') ? [{ id: 'guide', icon: BookOpen, label: 'User Guide', matches: ['guide'] }] : []),
    { id: 'about', icon: Info, label: 'About GGD', matches: ['about'] },
  ];

  return (
    <div className="bg-card/90 backdrop-blur border-b border-border/80 sticky top-0 z-30">
      <ScrollArea className="w-full">
        <div className="flex gap-2 px-3 py-2.5">
          {items.map(item => {
            const active = item.matches.includes(activeTab) || activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 min-w-[84px] h-[72px] rounded-2xl px-3 transition-all ${
                  active
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20 scale-[1.03]'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" strokeWidth={2.3} />
                <span className="text-[11px] font-bold leading-tight whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default TopNavMenu;
