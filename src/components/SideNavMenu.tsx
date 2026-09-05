import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Briefcase, Users, Wallet, Crown, CreditCard, Send, BarChart2,
  Megaphone, Store, Key, Info, Share2, BookOpen, Building2, Headphones, User, Link2, ClipboardList, Edit3, LogOut, Shield, Sparkles, MessageCircle, Rocket
} from "lucide-react";
import ggdLogo from '@/assets/ggd-logo.png';
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useNavigate } from 'react-router-dom';

interface SideNavMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isBusiness: boolean;
  isSyndicate: boolean;
  isAdmin: boolean;
  isPremium?: boolean;
  onLogout?: () => void;
}

const SideNavMenu = ({ activeTab, onTabChange, isBusiness, isSyndicate, isAdmin, isPremium, onLogout }: SideNavMenuProps) => {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const handleSelect = (id: string) => {
    onTabChange(id);
    if (isMobile) setOpenMobile(false);
  };
  const { isEnabled } = useFeatureToggles();
  const navigate = useNavigate();

  const main = [
    ...(isEnabled('nav_home') ? [{ id: 'ads', icon: LayoutDashboard, label: 'Home' }] : []),
    ...(isEnabled('community') ? [{ id: 'feed', icon: Sparkles, label: 'Community' }] : []),
    ...(isEnabled('tasks') ? [{ id: 'tasks', icon: ClipboardList, label: 'Credit Tasks' }] : []),
    ...(isEnabled('nav_campaigns') ? [{ id: 'campaigns', icon: BarChart2, label: 'Banner Ads' }] : []),
    { id: 'growth', icon: Rocket, label: 'Business Growth' },
    ...(isEnabled('nav_profile') ? [{ id: 'profile', icon: User, label: 'My Profile' }] : []),
    ...(isEnabled('nav_wallet') ? [{ id: 'wallet', icon: Wallet, label: 'Wallet' }] : []),
    ...(isEnabled('p2p_chat') && isEnabled('nav_inbox') ? [{ id: 'inbox', icon: MessageCircle, label: 'GGD Inbox' }] : []),
    ...(isEnabled('premium_upgrade') ? [{ id: 'premium', icon: Crown, label: 'Premium' }] : []),
  ];

  const work = [
    ...(isEnabled('business_tasks') ? [{ id: 'business-tasks', icon: Briefcase, label: 'Syndicate Campaigns' }] : []),
    ...(isEnabled('nav_my_business') ? [{ id: 'my-business', icon: Store, label: 'My Business' }] : []),
    ...(isEnabled('nav_business_details') ? [{ id: 'upgrade', icon: Edit3, label: 'Business Details' }] : []),
    ...(isEnabled('syndicate') ? (isSyndicate ? [
      { id: 'syndicate', icon: Users, label: 'Syndicate Hub' },
    ] : [
      { id: 'syndicate-join', icon: Users, label: 'Join Syndicate' },
    ]) : []),
  ];

  const discover = [
    ...(isEnabled('marketplace') ? [{ id: 'marketplace', icon: Store, label: 'Marketing Tools' }] : []),
    ...(isEnabled('directory') ? [{ id: 'directory', icon: Building2, label: 'Business Directory' }] : []),
    ...(isEnabled('promotional_content') && isEnabled('referral_system') ? [{ id: 'promo', icon: Share2, label: 'Promote & Earn' }] : []),
    ...((isPremium || isAdmin) && isEnabled('api_keys') ? [{ id: 'api-keys', icon: Key, label: 'API Keys' }] : []),
  ];

  const help = [
    ...(isEnabled('quick_guide') && isEnabled('nav_guide') ? [{ id: 'guide', icon: BookOpen, label: 'GGD Guide' }] : []),
    ...(isEnabled('nav_about') ? [{ id: 'about', icon: Info, label: 'About GGD' }] : []),
  ];

  const iconGrad: Record<string, string> = {
    ads: 'from-orange-400 to-red-500',
    campaigns: 'from-amber-500 to-orange-600',
    growth: 'from-emerald-500 to-green-600',
    feed: 'from-pink-400 to-fuchsia-500',
    tasks: 'from-emerald-400 to-teal-500',
    profile: 'from-sky-400 to-blue-500',
    'smart-links': 'from-cyan-400 to-blue-500',
    wallet: 'from-blue-500 to-indigo-600',
    inbox: 'from-teal-400 to-cyan-500',
    premium: 'from-amber-400 to-yellow-500',
    'business-tasks': 'from-purple-500 to-indigo-600',
    'my-business': 'from-indigo-400 to-blue-500',
    upgrade: 'from-rose-400 to-red-500',
    syndicate: 'from-violet-500 to-purple-600',
    'syndicate-join': 'from-violet-500 to-purple-600',
    marketplace: 'from-emerald-400 to-green-600',
    directory: 'from-orange-400 to-amber-500',
    promo: 'from-pink-500 to-rose-500',
    'api-keys': 'from-slate-500 to-gray-700',
    guide: 'from-indigo-400 to-purple-500',
    about: 'from-slate-400 to-slate-600',
  };

  const renderItems = (items: { id: string; icon: any; label: string }[]) =>
    items.map(item => {
      const active = activeTab === item.id;
      const grad = iconGrad[item.id] ?? 'from-orange-400 to-red-500';
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            asChild
            isActive={active}
            tooltip={item.label}
            onClick={() => handleSelect(item.id)}
            className="h-12"
          >
            <button className={`w-full flex items-center gap-3 px-2 ${active ? 'bg-gradient-to-r from-orange-500/15 to-red-500/10 text-foreground' : 'hover:bg-orange-50'}`}>
              <span className={`relative inline-grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br ${grad} flex-shrink-0
                shadow-[0_4px_10px_-3px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.18)]
                ${active ? 'ring-2 ring-orange-400/70' : ''}`}>
                <span className="absolute inset-x-1 top-0.5 h-2 rounded-full bg-white/35 blur-[1.5px]" />
                <item.icon className="h-5 w-5 text-white relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" strokeWidth={2.6} />
              </span>
              {!collapsed && <span className={`text-[15px] ${active ? 'font-black' : 'font-semibold'}`}>{item.label}</span>}
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-white">
      <SidebarHeader className="border-b border-border bg-white">
        <div className="flex items-center gap-2 px-2 py-2">
          <img loading="lazy" src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent truncate">
                GGD Network
              </h1>
              <p className="text-[10px] text-muted-foreground truncate">Ad Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(main)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {work.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Work</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(work)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Discover</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(discover)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Help</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(help)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Admin</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Admin Portal"
                    onClick={() => { navigate('/admin'); if (isMobile) setOpenMobile(false); }}
                    className="relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 opacity-90" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_60%)]" />
                    <Shield className="h-4 w-4 flex-shrink-0 relative text-white drop-shadow" />
                    {!collapsed && (
                      <span className="text-sm font-bold relative text-white drop-shadow flex items-center gap-1">
                        Admin Portal
                        <Sparkles className="h-3 w-3 text-yellow-200 animate-pulse" />
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {onLogout && (
        <SidebarFooter className="border-t border-border bg-white mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onLogout}
                tooltip="Logout"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">Logout</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

export default SideNavMenu;
