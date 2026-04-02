import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, TrendingUp, Users, Settings, Settings2, Briefcase, 
  Image, ClipboardList, Key, Megaphone, Video, ArrowLeft, Shield,
  Menu, X
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
];

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
      default: return <AdminGuide />;
    }
  };

  const activeItem = navItems.find(n => n.id === activeSection);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900/80 backdrop-blur border-r border-white/10 min-h-screen">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold text-white">GGD Admin</h1>
            <p className="text-[10px] text-gray-400">Control Panel</p>
          </div>
        </div>
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {navItems.map(item => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${active 
                      ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <item.icon className={`h-4 w-4 ${active ? 'text-orange-400' : item.color}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t border-white/10">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-400 hover:text-white text-sm gap-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-bold text-white">
                {activeItem?.label || 'Admin'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 text-xs" onClick={() => navigate('/')}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-gray-900/98 backdrop-blur border-b border-white/10 z-50 max-h-[70vh] overflow-y-auto">
            <nav className="p-2 space-y-1">
              {navItems.map(item => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all
                      ${active 
                        ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon className={`h-4.5 w-4.5 ${active ? 'text-orange-400' : item.color}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* Section Header (desktop) */}
          <div className="hidden md:flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            {activeItem && <activeItem.icon className={`h-6 w-6 ${activeItem.color}`} />}
            <h1 className="text-xl font-bold text-white">{activeItem?.label}</h1>
          </div>

          {/* Content Card */}
          <div className="bg-card rounded-xl shadow-xl border border-border/50 p-4 md:p-6 min-h-[60vh]">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav - Quick access to top sections */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1.5">
          {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[4]].map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-colors min-w-0
                  ${active ? 'text-orange-400 bg-orange-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium leading-none truncate max-w-[50px]">
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
