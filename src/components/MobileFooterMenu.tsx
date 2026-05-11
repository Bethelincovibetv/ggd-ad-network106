import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, HeadphonesIcon, Shield, Users, Wallet, Sparkles } from "lucide-react";

interface MobileFooterMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  isBusiness?: boolean;
  isSyndicate?: boolean;
}

const MobileFooterMenu = ({ activeTab, onTabChange, isAdmin, isBusiness, isSyndicate }: MobileFooterMenuProps) => {
  const navigate = useNavigate();
  const items = [
    { id: 'ads', icon: LayoutDashboard, label: 'Home' },
    { id: 'tasks', icon: Activity, label: 'Activity' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    ...(isSyndicate
      ? [{ id: 'syndicate', icon: Users, label: 'Syndicate' }]
      : [{ id: 'syndicate-join', icon: Users, label: 'Join' }]),
    { id: 'support', icon: HeadphonesIcon, label: 'Support' },
    ...(isAdmin ? [{ id: 'admin', icon: Shield, label: 'Admin' }] : []),
  ];

  const handleClick = (id: string) => {
    if (id === 'admin') {
      navigate('/admin');
    } else {
      onTabChange(id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1">
        {items.map(item => {
          const active = activeTab === item.id;
          if (item.id === 'admin') {
            return (
              <button key={item.id} onClick={() => handleClick(item.id)}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg overflow-hidden text-white shadow-md min-w-0">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500" />
                <Shield className="h-5 w-5 relative drop-shadow" />
                <span className="text-[10px] font-bold leading-none relative flex items-center gap-0.5">
                  Admin <Sparkles className="h-2.5 w-2.5 text-yellow-200" />
                </span>
              </button>
            );
          }
          return (
            <button key={item.id} onClick={() => handleClick(item.id)}
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
