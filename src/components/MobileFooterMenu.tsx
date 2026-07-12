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
    { id: 'ads',      icon: LayoutDashboard, label: 'Home',   grad: 'from-orange-400 via-orange-500 to-red-500' },
    ...(isEnabled('community') ? [{ id: 'feed', icon: Sparkles, label: 'Feed', grad: 'from-pink-400 via-fuchsia-500 to-purple-500' }] : []),
    ...(isEnabled('tasks') ? [{ id: 'tasks', icon: Activity, label: 'Tasks', grad: 'from-emerald-400 via-green-500 to-teal-500' }] : []),
    { id: 'wallet',   icon: Wallet, label: 'Wallet', grad: 'from-sky-400 via-blue-500 to-indigo-500' },
    ...(isSyndicate && isEnabled('syndicate')
      ? [{ id: 'syndicate', icon: Users, label: 'Crew', grad: 'from-violet-400 via-purple-500 to-indigo-600' }]
      : [{ id: 'my-business', icon: Store, label: 'My Biz', grad: 'from-indigo-400 via-blue-500 to-cyan-500' }]),
    ...(isAdmin ? [{ id: 'admin', icon: Shield, label: 'Admin', grad: 'from-rose-500 via-pink-500 to-fuchsia-600' }] : []),
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
          return (
            <button key={item.id} onClick={() => handleClick(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all flex-1 max-w-[80px] active:scale-90 ${active ? 'scale-105' : ''}`}>
              <span className={`relative inline-grid place-items-center h-11 w-11 rounded-2xl bg-gradient-to-br ${item.grad}
                shadow-[0_6px_14px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-3px_6px_rgba(0,0,0,0.18)]
                ${active ? 'ring-2 ring-white ring-offset-2 ring-offset-card' : ''}`}>
                <span className="absolute inset-x-1 top-0.5 h-3 rounded-full bg-white/35 blur-[2px]" />
                <item.icon className="h-6 w-6 text-white relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" strokeWidth={2.6} />
                {item.id === 'admin' && <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 drop-shadow" />}
              </span>
              <span className={`text-[10px] leading-none ${active ? 'font-black text-foreground' : 'font-semibold text-muted-foreground'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileFooterMenu;
