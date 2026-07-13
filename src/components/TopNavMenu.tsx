import React from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LayoutDashboard, Briefcase, Users, Wallet, Crown, Shield, CreditCard, Send, Megaphone, Store, Key, Info, Share2, BookOpen, Building2, Gift } from "lucide-react";
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
    { id: 'ads', icon: LayoutDashboard, label: 'Home' },
    { id: 'fund-credits', icon: CreditCard, label: 'Buy Credits' },
    { id: 'transfer', icon: Send, label: 'Transfer' },
    { id: 'premium', icon: Crown, label: 'Premium' },
    ...(isEnabled('marketplace') ? [{ id: 'marketplace', icon: Store, label: 'Apps' }] : []),
    ...(isEnabled('directory') ? [{ id: 'directory', icon: Building2, label: 'Directory' }] : []),
    ...(isEnabled('promotional_content') && isEnabled('referral_system') ? [{ id: 'promo', icon: Share2, label: 'Promote' }] : []),
    ...(isEnabled('referral_system') ? [{ id: 'referrals', icon: Gift, label: 'Referrals' }] : []),
    ...(isBusiness ? [{ id: 'business-tasks', icon: Briefcase, label: 'Tasks' }, { id: 'my-business', icon: Store, label: 'My Biz' }] : []),
    ...(isEnabled('syndicate') ? (isSyndicate
      ? [{ id: 'syndicate', icon: Users, label: 'Open Syndicate' }]
      : [{ id: 'syndicate-join', icon: Users, label: 'Join Syndicate' }]) : []),
    ...(!isBusiness && !isSyndicate ? [{ id: 'upgrade', icon: Megaphone, label: 'Upgrade' }] : []),
    ...(isSyndicate && isEnabled('syndicate') ? [{ id: 'syndicate-wallet', icon: Wallet, label: 'Earnings' }] : []),
    ...(isBusiness ? [{ id: 'task-wallet', icon: Wallet, label: 'Wallet' }] : []),
    ...((isPremium || isAdmin) && isEnabled('api_keys') ? [{ id: 'api-keys', icon: Key, label: 'API' }] : []),
    ...(isEnabled('quick_guide') ? [{ id: 'guide', icon: BookOpen, label: 'Guide' }] : []),
    { id: 'about', icon: Info, label: 'About' },
  ];

  return (
    <div className="bg-card backdrop-blur border-b border-border">
      <ScrollArea className="w-full">
        <div className="flex gap-2 px-3 py-3">
          {items.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 min-w-[92px] h-20 rounded-2xl px-3 transition-all ${
                  active
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg scale-105'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className="h-7 w-7" strokeWidth={2.4} />
                <span className="text-xs font-bold leading-none">{item.label}</span>
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
