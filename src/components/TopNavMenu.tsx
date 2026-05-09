import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LayoutDashboard, Briefcase, Users, Wallet, Crown, Shield, CreditCard, Send, Megaphone, Store, Key, Info, Share2, BookOpen, Building2, Gift } from "lucide-react";

interface TopNavMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isBusiness: boolean;
  isSyndicate: boolean;
  isAdmin: boolean;
  isPremium?: boolean;
}

const TopNavMenu = ({ activeTab, onTabChange, isBusiness, isSyndicate, isAdmin, isPremium }: TopNavMenuProps) => {
  const items = [
    { id: 'ads', icon: LayoutDashboard, label: 'Home' },
    { id: 'fund-credits', icon: CreditCard, label: 'Buy Credits' },
    { id: 'transfer', icon: Send, label: 'Transfer' },
    { id: 'premium', icon: Crown, label: 'Premium' },
    { id: 'marketplace', icon: Store, label: 'Apps' },
    { id: 'directory', icon: Building2, label: 'Directory' },
    { id: 'promo', icon: Share2, label: 'Promote' },
    { id: 'referrals', icon: Gift, label: 'Referrals' },
    ...(isBusiness ? [{ id: 'business-tasks', icon: Briefcase, label: 'Tasks' }, { id: 'my-business', icon: Store, label: 'My Biz' }] : []),
    ...(isSyndicate ? [{ id: 'syndicate', icon: Users, label: 'Jobs' }] : []),
    ...(!isBusiness && !isSyndicate ? [{ id: 'upgrade', icon: Megaphone, label: 'Upgrade' }] : []),
    ...(isSyndicate ? [{ id: 'syndicate-wallet', icon: Wallet, label: 'Earnings' }] : []),
    ...(isBusiness ? [{ id: 'task-wallet', icon: Wallet, label: 'Wallet' }] : []),
    ...(isPremium || isAdmin ? [{ id: 'api-keys', icon: Key, label: 'API' }] : []),
    { id: 'guide', icon: BookOpen, label: 'Guide' },
    { id: 'about', icon: Info, label: 'About' },
  ];

  return (
    <div className="bg-card backdrop-blur border-b border-border">
      <ScrollArea className="w-full">
        <div className="flex gap-1 px-4 py-2">
          {items.map(item => {
            const active = activeTab === item.id;
            return (
              <Button key={item.id} variant={active ? "default" : "ghost"} size="sm"
                className={`flex-shrink-0 text-xs gap-1.5 h-8 ${active ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'text-muted-foreground'}`}
                onClick={() => onTabChange(item.id)}>
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default TopNavMenu;
