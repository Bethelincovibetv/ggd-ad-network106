import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shield, Users, Wallet, Sparkles, Store, BarChart2, CheckSquare, MessageCircle } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface MobileFooterMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  isBusiness?: boolean;
  isSyndicate?: boolean;
}

/**
 * Mobile Bottom Navigation:
 * - 5 high-priority, clearly separated mobile destinations.
 * - Complies with >= 48px mobile touch target standards.
 * - Bold, easily legible typography (>= 11px font size).
 * - Tactile 3D gradient icon badges with active state indicators.
 * - Never squishes or truncates labels.
 */
const MobileFooterMenu = ({ activeTab, onTabChange, isAdmin, isSyndicate }: MobileFooterMenuProps) => {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureToggles();

  // Define primary mobile destinations
  const baseItems = [
    ...(isEnabled('nav_home') ? [{
      id: 'ads',
      icon: LayoutDashboard,
      label: 'Home',
      grad: 'from-orange-500 via-orange-600 to-red-600',
      matches: ['ads']
    }] : []),
    ...(isEnabled('community') ? [{
      id: 'feed',
      icon: Sparkles,
      label: 'Feed',
      grad: 'from-pink-500 via-fuchsia-500 to-purple-600',
      matches: ['feed']
    }] : []),
    ...(isEnabled('tasks') ? [{
      id: 'tasks',
      icon: CheckSquare,
      label: 'Tasks',
      grad: 'from-emerald-500 via-green-500 to-teal-600',
      matches: ['tasks']
    }] : []),
    ...(isEnabled('nav_campaigns') ? [{
      id: 'campaigns',
      icon: BarChart2,
      label: 'Ads',
      grad: 'from-amber-500 via-orange-500 to-red-500',
      matches: ['campaigns', 'ads-create']
    }] : []),
    ...(isEnabled('nav_my_business') ? [{
      id: 'my-business',
      icon: Store,
      label: 'My Biz',
      grad: 'from-blue-500 via-indigo-500 to-violet-600',
      matches: ['my-business', 'business', 'growth']
    }] : []),
    ...(isEnabled('nav_wallet') ? [{
      id: 'wallet',
      icon: Wallet,
      label: 'Wallet',
      grad: 'from-sky-500 via-blue-600 to-indigo-700',
      matches: ['wallet', 'fund-credits', 'transfer', 'task-wallet', 'syndicate-wallet']
    }] : []),
  ];

  // If user is admin, add admin destination
  const items = [
    ...baseItems,
    ...(isAdmin ? [{
      id: 'admin',
      icon: Shield,
      label: 'Admin',
      grad: 'from-rose-600 via-pink-600 to-purple-600',
      matches: ['admin']
    }] : [])
  ];

  const handleClick = (id: string) => {
    if (id === 'admin') {
      navigate('/admin');
    } else {
      onTabChange(id);
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed left-0 right-0 z-50 md:hidden pointer-events-none px-2.5"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
    >
      <div className="pointer-events-auto mx-auto max-w-lg flex items-center justify-around gap-1 px-1.5 py-2
        rounded-[1.75rem] bg-card/95 backdrop-blur-2xl border border-border/80
        shadow-[0_12px_36px_-6px_rgba(0,0,0,0.38),0_4px_12px_rgba(0,0,0,0.15)] overflow-x-auto no-scrollbar
        animate-in slide-in-from-bottom-4 duration-300">
        {items.map(item => {
          const active = item.matches ? item.matches.includes(activeTab) : activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 flex-1 min-w-[50px] max-w-[76px] active:scale-95
                ${active ? 'scale-[1.04]' : 'opacity-80 hover:opacity-100'}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* 3D Gradient Icon Badge with gloss reflection */}
              <span
                className={`relative inline-grid place-items-center rounded-2xl h-10 w-10 bg-gradient-to-br ${item.grad}
                  shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.2)]
                  ${active ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-card shadow-lg' : ''}`}
              >
                <span className="absolute inset-x-1 top-0.5 h-2.5 rounded-full bg-white/35 blur-[1px] pointer-events-none" />
                <Icon className="h-5 w-5 text-white relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" strokeWidth={2.4} />
                {item.id === 'admin' && (
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 drop-shadow" />
                )}
              </span>

              {/* Text Label: Crisp, legible, minimum 11px font */}
              <span
                className={`text-[11px] leading-tight truncate w-full text-center tracking-tight
                  ${active ? 'font-black text-foreground' : 'font-semibold text-muted-foreground'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileFooterMenu;
