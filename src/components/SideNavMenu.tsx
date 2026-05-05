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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Briefcase, Users, Wallet, Crown, CreditCard, Send,
  Megaphone, Store, Key, Info, Share2, BookOpen, Building2, Headphones, User, Link2, ClipboardList
} from "lucide-react";
import ggdLogo from '@/assets/ggd-logo.png';

interface SideNavMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isBusiness: boolean;
  isSyndicate: boolean;
  isAdmin: boolean;
  isPremium?: boolean;
}

const SideNavMenu = ({ activeTab, onTabChange, isBusiness, isSyndicate, isAdmin, isPremium }: SideNavMenuProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const main = [
    { id: 'ads', icon: LayoutDashboard, label: 'Home' },
    { id: 'profile', icon: User, label: 'My Profile' },
    { id: 'smart-links', icon: Link2, label: 'Smart Links' },
    { id: 'fund-credits', icon: CreditCard, label: 'Buy Credits' },
    { id: 'transfer', icon: Send, label: 'Transfer' },
    { id: 'premium', icon: Crown, label: 'Premium' },
  ];

  const work = [
    ...(isBusiness ? [
      { id: 'business-tasks', icon: Briefcase, label: 'My Tasks' },
      { id: 'my-business', icon: Store, label: 'My Business' },
      { id: 'task-wallet', icon: Wallet, label: 'Task Wallet' },
    ] : []),
    ...(isSyndicate ? [
      { id: 'syndicate', icon: Users, label: 'Available Jobs' },
      { id: 'syndicate-wallet', icon: Wallet, label: 'Earnings' },
    ] : []),
    ...(!isBusiness && !isSyndicate ? [
      { id: 'upgrade', icon: Megaphone, label: 'Upgrade Account' },
    ] : []),
  ];

  const discover = [
    { id: 'marketplace', icon: Store, label: 'Apps' },
    { id: 'directory', icon: Building2, label: 'Directory' },
    { id: 'promo', icon: Share2, label: 'Promote & Earn' },
    ...(isPremium || isAdmin ? [{ id: 'api-keys', icon: Key, label: 'API Keys' }] : []),
  ];

  const help = [
    { id: 'guide', icon: BookOpen, label: 'Guide' },
    { id: 'about', icon: Info, label: 'About' },
    { id: 'support', icon: Headphones, label: 'Support' },
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
      </SidebarContent>
    </Sidebar>
  );
};

export default SideNavMenu;
