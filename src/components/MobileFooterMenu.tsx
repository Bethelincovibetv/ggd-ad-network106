import React from 'react';
import { LayoutDashboard, Gift, HeadphonesIcon, Shield, Users, CreditCard } from "lucide-react";

interface MobileFooterMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  isBusiness?: boolean;
  isSyndicate?: boolean;
}

const MobileFooterMenu = ({ activeTab, onTabChange, isAdmin, isBusiness, isSyndicate }: MobileFooterMenuProps) => {
  const items = [
    { id: 'ads', icon: LayoutDashboard, label: 'Home' },
    { id: 'tasks', icon: Gift, label: 'Earn' },
    { id: 'fund-credits', icon: CreditCard, label: 'Credits' },
    ...(isSyndicate ? [{ id: 'syndicate', icon: Users, label: 'Jobs' }] : []),
    { id: 'support', icon: HeadphonesIcon, label: 'Support' },
    ...(isAdmin ? [{ id: 'admin', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1">
        {items.map(item => {
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors min-w-0
                ${active ? 'text-orange-600 bg-orange-50' : 'text-muted-foreground hover:text-foreground'}`}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileFooterMenu;
