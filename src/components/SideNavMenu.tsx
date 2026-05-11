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
  LayoutDashboard, Briefcase, Users, Wallet, Crown, CreditCard, Send,
  Megaphone, Store, Key, Info, Share2, BookOpen, Building2, Headphones, User, Link2, ClipboardList, Edit3, LogOut, Shield, Sparkles
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
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isEnabled } = useFeatureToggles();
  const navigate = useNavigate();

  const main = [
    { id: 'ads', icon: LayoutDashboard, label: 'Home' },
    ...(isEnabled('tasks') ? [{ id: 'tasks', icon: ClipboardList, label: 'Activity Feed' }] : []),
    { id: 'profile', icon: User, label: 'My Profile' },
    { id: 'smart-links', icon: Link2, label: 'Smart Links' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    ...(isEnabled('premium_upgrade') ? [{ id: 'premium', icon: Crown, label: 'Premium' }] : []),
  ];

  const work = [
    ...(isEnabled('business_tasks') ? [{ id: 'business-tasks', icon: Briefcase, label: 'Syndicate Campaigns' }] : []),
    { id: 'my-business', icon: Store, label: 'My Business' },
    { id: 'upgrade', icon: Edit3, label: 'Business Details' },
    ...(isEnabled('syndicate') ? (isSyndicate ? [
      { id: 'syndicate', icon: Users, label: 'Open Syndicate' },
    ] : [
      { id: 'syndicate-join', icon: Users, label: 'Join Syndicate' },
    ]) : []),
  ];

  const discover = [
    ...(isEnabled('marketplace') ? [{ id: 'marketplace', icon: Store, label: 'Apps' }] : []),
    ...(isEnabled('directory') ? [{ id: 'directory', icon: Building2, label: 'Directory' }] : []),
    ...(isEnabled('promotional_content') ? [{ id: 'promo', icon: Share2, label: 'Promote & Earn' }] : []),
    ...((isPremium || isAdmin) && isEnabled('api_keys') ? [{ id: 'api-keys', icon: Key, label: 'API Keys' }] : []),
  ];

  const help = [
    { id: 'guide', icon: BookOpen, label: 'Guide' },
    { id: 'about', icon: Info, label: 'About' },
  ];

  const renderItems = (items: { id: string; icon: any; label: string }[]) =>
    items.map(item => {
      const active = activeTab === item.id;
      return (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            asChild
            isActive={active}
            tooltip={item.label}
            onClick={() => onTabChange(item.id)}
          >
            <button className={`w-full flex items-center gap-3 ${active ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-500 hover:to-red-600 hover:text-white' : ''}`}>
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-white">
      <SidebarHeader className="border-b border-border bg-white">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg flex-shrink-0" />
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
                    onClick={() => navigate('/admin')}
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
