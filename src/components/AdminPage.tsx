import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  BookOpen, TrendingUp, Users, Settings, Settings2, Briefcase, 
  Image, ClipboardList, Key, Megaphone, Video, ArrowLeft, Shield,
  Menu, X, Bell, MessageSquare, Crown
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

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  sublabel: string;
  color: string;
  gradient: string;
}

const navGroups: NavGroup[] = [
  {
    title: 'CORE & ANALYTICS',
    items: [
      { id: 'guide', icon: BookOpen, label: 'Admin Guide', sublabel: 'System workflows and help', color: 'text-white', gradient: 'from-emerald-500 to-teal-600' },
      { id: 'analytics', icon: TrendingUp, label: 'Analytics', sublabel: 'Platform metrics & growth', color: 'text-white', gradient: 'from-blue-500 to-indigo-600' },
    ]
  },
  {
    title: 'DIRECT TEAM / SYNDICATE',
    items: [
      { id: 'syndicate', icon: Briefcase, label: 'Syndicate Management', sublabel: 'Team campaigns, proofs & payouts', color: 'text-white', gradient: 'from-purple-600 to-indigo-700' },
    ]
  },
  {
    title: 'ADVERTISING & CAMPAIGNS',
    items: [
      { id: 'ads', icon: Megaphone, label: 'Ad Manager', sublabel: 'Banner & video ad approvals', color: 'text-white', gradient: 'from-amber-500 to-orange-600' },
      { id: 'apps', icon: Megaphone, label: 'Marketing Apps', sublabel: 'Promotional apps & showcase', color: 'text-white', gradient: 'from-fuchsia-500 to-pink-600' },
      { id: 'videos', icon: Video, label: 'Video Manager', sublabel: 'Watch-to-earn media', color: 'text-white', gradient: 'from-red-500 to-rose-600' },
      { id: 'tasks', icon: ClipboardList, label: 'Task Manager', sublabel: 'Standard task catalogue', color: 'text-white', gradient: 'from-green-500 to-emerald-600' },
      { id: 'slides', icon: Image, label: 'Slide Manager', sublabel: 'Homepage hero banners', color: 'text-white', gradient: 'from-violet-500 to-purple-600' },
    ]
  },
  {
    title: 'USERS & COMMUNITY',
    items: [
      { id: 'users', icon: Users, label: 'User Management', sublabel: 'Profiles, roles and credits', color: 'text-white', gradient: 'from-orange-500 to-red-600' },
      { id: 'chat', icon: MessageSquare, label: 'User Chat', sublabel: 'Direct support & messaging', color: 'text-white', gradient: 'from-lime-500 to-green-600' },
      { id: 'notifications', icon: Bell, label: 'Notifications', sublabel: 'Broadcast alerts to users', color: 'text-white', gradient: 'from-yellow-400 to-orange-500' },
      { id: 'coowners', icon: Crown, label: 'Co-Owners', sublabel: 'Partner equity & revenue share', color: 'text-white', gradient: 'from-amber-400 to-yellow-600' },
    ]
  },
  {
    title: 'PLATFORM & CONFIG',
    items: [
      { id: 'settings', icon: Settings, label: 'Platform Settings', sublabel: 'Exchange rate & global config', color: 'text-white', gradient: 'from-pink-500 to-rose-600' },
      { id: 'features', icon: Settings2, label: 'Feature Toggles', sublabel: 'Enable or disable modules', color: 'text-white', gradient: 'from-cyan-500 to-blue-600' },
      { id: 'api', icon: Key, label: 'API Keys', sublabel: 'External integration secrets', color: 'text-white', gradient: 'from-yellow-500 to-amber-600' },
    ]
  }
];

const allNavItems = navGroups.flatMap(g => g.items);

const AdminPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('syndicate');
  const [syndicateProps, setSyndicateProps] = useState<{ initialCampaignId?: string; initialTab?: any }>({});
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

  // Sync with URL query parameters (e.g. ?section=syndicate&tab=verification&id=...)
  useEffect(() => {
    const sectionParam = searchParams.get('section');
    const tabParam = searchParams.get('tab');
    const idParam = searchParams.get('id');

    if (sectionParam) {
      setActiveSection(sectionParam);
      if (sectionParam === 'syndicate') {
        setSyndicateProps({
          initialTab: (tabParam as any) || 'members',
          initialCampaignId: idParam || undefined,
        });
      }
    }
  }, [searchParams]);

  // Listen for in-app navigation events
  useEffect(() => {
    const handleNav = (e: any) => {
      const detail = e.detail;
      if (typeof detail === 'string') {
        if (detail.startsWith('admin:')) {
          const parts = detail.split(':');
          const section = parts[1] || 'syndicate';
          const tab = parts[2];
          setActiveSection(section);
          if (section === 'syndicate' && tab) {
            setSyndicateProps({ initialTab: tab as any });
          }
        } else if (detail === 'admin') {
          setActiveSection('syndicate');
        }
      }
    };

    window.addEventListener('ggd-nav' as any, handleNav);
    return () => window.removeEventListener('ggd-nav' as any, handleNav);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const navigateToSection = (sectionId: string, extraProps?: any) => {
    if (sectionId === 'syndicate' && extraProps) {
      setSyndicateProps(extraProps);
    }
    setActiveSection(sectionId);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'guide': return <AdminGuide />;
      case 'analytics': return <AdminAnalytics />;
      case 'users': return <AdminUserManager />;
      case 'syndicate': return (
        <AdminSyndicateManager 
          initialCampaignId={syndicateProps.initialCampaignId} 
          initialTab={syndicateProps.initialTab}
          onNavigateSection={navigateToSection}
        />
      );
      case 'settings': return <AdminSettings />;
      case 'features': return <AdminFeatureToggles />;
      case 'slides': return <SlideManager />;
      case 'tasks': return <TaskManager />;
      case 'api': return <AdminApiManager />;
      case 'apps': return <AdminMarketingApps />;
      case 'videos': return <AdminVideoManager />;
      case 'ads': return (
        <AdminAdManager 
          onNavigateSyndicate={(ad) => navigateToSection('syndicate', { initialCampaignId: ad.id, initialTab: 'campaigns' })} 
        />
      );
      case 'notifications': return <AdminNotificationSender />;
      case 'chat': return <AdminChatSystem />;
      case 'coowners': return <AdminCoOwnerManager />;
      default: return <AdminGuide />;
    }
  };

  const activeItem = allNavItems.find(n => n.id === activeSection) || allNavItems[0];

  const renderNavItem = (item: NavItem, mobile = false) => {
    const active = activeSection === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveSection(item.id);
          if (mobile) setMobileMenuOpen(false);
        }}
        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left transition-all ${
          active
            ? `bg-gradient-to-r ${item.gradient} text-white shadow-md scale-[1.01]`
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/20' : `bg-muted text-foreground`}`}>
          <item.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-foreground'}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-xs font-bold leading-tight ${active ? 'text-white' : 'text-foreground'}`}>
            {item.label}
          </span>
          <span className={`block truncate text-[10px] ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
            {item.sublabel}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex min-h-screen w-64 flex-col border-r border-border bg-card shadow-sm lg:w-72 flex-shrink-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <img loading="lazy" src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg shadow-xs" />
          <div>
            <h1 className="text-sm font-black text-foreground">GGD Ad Network</h1>
            <p className="text-[11px] text-muted-foreground">Admin Command Console</p>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3 py-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70">
                    {group.title}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => renderNavItem(item))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 bg-muted/20">
          <Button 
            variant="ghost" 
            className="h-10 w-full justify-start gap-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to User Portal
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/80 text-foreground"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                {activeItem?.label || 'Admin'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Exit
          </Button>
        </div>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-[320px] border-r border-border bg-card p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="flex items-center gap-3 text-sm font-bold">
                <img loading="lazy" src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
                <span>GGD Admin Navigation</span>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1">
                    <div className="px-3 py-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/70">
                        {group.title}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(item => renderNavItem(item, true))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-3 bg-muted/20">
              <Button
                variant="ghost"
                className="h-10 w-full justify-start gap-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/');
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to User Portal
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area - Full-Page Flow */}
      <main className="flex-1 min-h-screen min-w-0 bg-background overflow-x-hidden">
        <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-12 space-y-5">
          {/* Top Active Section Header (for non-syndicate sections) */}
          {activeSection !== 'syndicate' && (
            <div className={`rounded-2xl bg-gradient-to-r ${activeItem.gradient} text-white p-4 md:p-5 shadow-lg flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <activeItem.icon className="h-6 w-6 text-white drop-shadow" />
                <div>
                  <h1 className="text-base md:text-xl font-black drop-shadow">{activeItem.label}</h1>
                  <p className="text-xs text-white/80">{activeItem.sublabel}</p>
                </div>
              </div>
            </div>
          )}

          {/* Render Active Content */}
          <div className="w-full min-w-0">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Quick Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {[
            { id: 'syndicate', label: 'Syndicate', icon: Briefcase },
            { id: 'ads', label: 'Ads', icon: Megaphone },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                  active ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="max-w-[64px] truncate text-[10px] leading-none">
                  {item.label}
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
