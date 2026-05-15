import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, Shield, Users, Wallet, Sparkles, Store } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface MobileFooterMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  isBusiness?: boolean;
  isSyndicate?: boolean;
}

const MobileFooterMenu = ({ activeTab, onTabChange, isAdmin, isSyndicate }: MobileFooterMenuProps) => {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureToggles();
  const items = [
    { id: 'ads',      icon: LayoutDashboard, label: 'Home',    color: 'text-orange-500' },
    ...(isEnabled('community') ? [{ id: 'feed', icon: Sparkles, label: 'Feed', color: 'text-pink-500' }] : []),
    ...(isEnabled('tasks') ? [{ id: 'tasks', icon: Activity, label: 'Tasks', color: 'text-emerald-500' }] : []),
    { id: 'wallet',   icon: Wallet,          label: 'Wallet',  color: 'text-blue-500' },
    ...(isSyndicate
      ? [{ id: 'syndicate', icon: Users, label: 'Crew', color: 'text-purple-500' }]
      : [{ id: 'my-business', icon: Store, label: 'My Biz', color: 'text-indigo-500' }]),
    ...(isAdmin ? [{ id: 'admin', icon: Shield, label: 'Admin', color: 'text-rose-500' }] : []),
  ];

  const handleClick = (id: string) => {
    if (id === 'admin') navigate('/admin');
    else onTabChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border md:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch justify-around px-1.5 pt-2 pb-2">
        {items.map(item => {
          const active = activeTab === item.id;
          if (item.id === 'admin') {
            return (
              <button key={item.id} onClick={() => handleClick(item.id)}
                className="relative flex flex-col items-center gap-1 py-2 px-3 rounded-2xl overflow-hidden text-white shadow-lg flex-1 max-w-[80px] active:scale-95 transition">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500" />
                <Shield className="h-6 w-6 relative drop-shadow" strokeWidth={2.4} />
                <span className="text-[11px] font-bold leading-none relative flex items-center gap-0.5">
                  Admin <Sparkles className="h-3 w-3 text-yellow-200" />
                </span>
              </button>
            );
          }
          return (
            <button key={item.id} onClick={() => handleClick(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-2xl transition-all flex-1 max-w-[80px] active:scale-95
                ${active
                  ? 'bg-gradient-to-br from-orange-500/15 to-red-500/10 ' + item.color + ' shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'}`}>
              <item.icon className={`h-6 w-6 ${active ? '' : ''}`} strokeWidth={active ? 2.6 : 2.2} />
              <span className={`text-[11px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileFooterMenu;
