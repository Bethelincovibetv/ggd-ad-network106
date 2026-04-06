import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  BookOpen, TrendingUp, Users, Settings, Settings2, Briefcase, 
  Image, ClipboardList, Key, Megaphone, Video, ArrowLeft, Shield,
  Menu, X, Bell, MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminAnalytics from "@/components/AdminAnalytics";
import SlideManager from "@/components/SlideManager";
import TaskManager from "@/components/TaskManager";
import AdminSyndicateManager from "@/components/AdminSyndicateManager";
import AdminSettings from "@/components/AdminSettings";
import AdminUserManager from "@/components/AdminUserManager";
import AdminApiManager from "@/components/AdminApiManager";
import AdminMarketingApps from "@/components/AdminMarketingApps";
import AdminFeatureToggles from "@/components/AdminFeatureToggles";
import AdminGuide from "@/components/AdminGuide";
import AdminVideoManager from "@/components/AdminVideoManager";
import AdminAdManager from "@/components/AdminAdManager";
import AdminNotificationSender from "@/components/AdminNotificationSender";
import AdminChatSystem from "@/components/AdminChatSystem";
import AdminCoOwnerManager from "@/components/AdminCoOwnerManager";
import ggdLogo from '@/assets/ggd-logo.png';

const navItems = [
  { id: 'guide', icon: BookOpen, label: 'Admin Guide', color: 'text-orange-500' },
  { id: 'analytics', icon: TrendingUp, label: 'Analytics', color: 'text-blue-500' },
  { id: 'users', icon: Users, label: 'User Management', color: 'text-green-500' },
  { id: 'syndicate', icon: Briefcase, label: 'Syndicate Manager', color: 'text-purple-500' },
  { id: 'settings', icon: Settings, label: 'Platform Settings', color: 'text-gray-500' },
  { id: 'features', icon: Settings2, label: 'Feature Toggles', color: 'text-cyan-500' },
  { id: 'slides', icon: Image, label: 'Slide Manager', color: 'text-pink-500' },
  { id: 'tasks', icon: ClipboardList, label: 'Task Manager', color: 'text-yellow-500' },
  { id: 'api', icon: Key, label: 'API Keys', color: 'text-red-500' },
  { id: 'apps', icon: Megaphone, label: 'Marketing Apps', color: 'text-indigo-500' },
  { id: 'videos', icon: Video, label: 'Video Manager', color: 'text-red-400' },
  { id: 'ads', icon: Megaphone, label: 'Ad Manager', color: 'text-orange-500' },
  { id: 'notifications', icon: Bell, label: 'Notifications', color: 'text-yellow-500' },
  { id: 'chat', icon: MessageSquare, label: 'User Chat', color: 'text-green-500' },
  { id: 'coowners', icon: Crown, label: 'Co-Owners', color: 'text-yellow-500' },
];

type NavItem = (typeof navItems)[number];

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('guide');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const hasAdmin = roles?.some(r => r.role === 'admin');
      if (!hasAdmin) { navigate('/'); return; }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'guide': return <AdminGuide />;
      case 'analytics': return <AdminAnalytics />;
      case 'users': return <AdminUserManager />;
      case 'syndicate': return <AdminSyndicateManager />;
      case 'settings': return <AdminSettings />;
      case 'features': return <AdminFeatureToggles />;
      case 'slides': return <SlideManager />;
      case 'tasks': return <TaskManager />;
      case 'api': return <AdminApiManager />;
      case 'apps': return <AdminMarketingApps />;
      case 'videos': return <AdminVideoManager />;
      case 'ads': return <AdminAdManager />;
      case 'notifications': return <AdminNotificationSender />;
      case 'chat': return <AdminChatSystem />;
      default: return <AdminGuide />;
    }
  };

  const activeItem = navItems.find(n => n.id === activeSection);

  const renderNavItem = (item: NavItem, mobile = false) => {
    const active = activeSection === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveSection(item.id);
          if (mobile) setMobileMenuOpen(false);
        }}
        className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
          active
            ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
            : 'border-transparent bg-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
        }`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary/15' : 'bg-secondary/80'}`}>
          <item.icon className={`h-5 w-5 ${active ? 'text-primary' : item.color}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{item.label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.id === 'guide'
              ? 'Overview and system help'
              : item.id === 'analytics'
              ? 'Performance and usage'
              : item.id === 'users'
              ? 'Profiles, roles and credits'
              : item.id === 'syndicate'
              ? 'Applications and operations'
              : item.id === 'settings'
              ? 'Platform controls'
              : item.id === 'features'
              ? 'Toggle product tools'
              : item.id === 'slides'
              ? 'Homepage slider assets'
              : item.id === 'tasks'
              ? 'Task catalogue management'
              : item.id === 'api'
              ? 'Key access management'
              : item.id === 'apps'
              ? 'Marketplace and promo apps'
              : item.id === 'ads'
              ? 'All platform advertisements'
              : item.id === 'notifications'
              ? 'Send alerts to users'
              : item.id === 'chat'
              ? 'Chat with any user'
              : 'Homepage and section videos'}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex min-h-screen w-56 flex-col border-r border-border bg-white dark:bg-card shadow-2xl lg:w-60">
        <div className="flex items-center gap-3 border-b border-border px-4 py-5">
          <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="text-base font-bold text-foreground">GGD Admin</h1>
            <p className="text-xs text-muted-foreground">Control panel</p>
          </div>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {navItems.map(item => renderNavItem(item))}
          </nav>
        </ScrollArea>
        <div className="border-t border-border p-3">
          <Button 
            variant="ghost" 
            className="h-11 w-full justify-start gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 border-b border-border bg-white dark:bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary/80 text-foreground"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                {activeItem?.label || 'Admin'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </div>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] border-r border-border bg-white dark:bg-card p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-4 py-5 text-left">
              <SheetTitle className="flex items-center gap-3 text-base">
                <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
                <span>Admin Navigation</span>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-3 py-4">
              <nav className="space-y-2">
                {navItems.map(item => renderNavItem(item, true))}
              </nav>
            </ScrollArea>

            <div className="border-t border-border p-3">
              <Button
                variant="ghost"
                className="h-11 w-full justify-start gap-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className="mx-auto max-w-5xl p-4 pb-24 md:p-6 md:pb-6">
          {/* Section Header (desktop) */}
          <div className="mb-6 hidden items-center gap-3 border-b border-border pb-4 md:flex">
            {activeItem && <activeItem.icon className={`h-6 w-6 ${activeItem.color}`} />}
            <h1 className="text-2xl font-bold text-foreground">{activeItem?.label}</h1>
          </div>

          {/* Content Card */}
          <div className="min-h-[60vh] rounded-2xl border border-border bg-card/95 p-4 shadow-xl md:p-6">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav - Quick access to top sections */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white dark:bg-card shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[4]].map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-2.5 py-2 transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-[64px] truncate text-[10px] font-semibold leading-none">
                  {item.id === 'guide' ? 'Guide' : item.id === 'analytics' ? 'Stats' : item.id === 'users' ? 'Users' : item.id === 'syndicate' ? 'Syndicate' : 'Settings'}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AdminPage;
