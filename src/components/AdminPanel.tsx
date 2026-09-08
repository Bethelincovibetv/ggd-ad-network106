import React, { useState } from 'react';
import {
  Users,
  Settings,
  TrendingUp,
  Image,
  ClipboardList,
  Briefcase,
  Key,
  Megaphone,
  Settings2,
  BookOpen,
  Video,
  Sparkles,
  ShieldCheck
} from "lucide-react";
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

const ADMIN_MODULES = [
  { id: 'syndicate', label: 'Direct Team', icon: Briefcase, color: 'from-purple-600 to-indigo-600', badge: 'Workforce' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'from-blue-600 to-cyan-600' },
  { id: 'users', label: 'Users & KYC', icon: Users, color: 'from-orange-600 to-red-600' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'from-pink-600 to-rose-600' },
  { id: 'features', label: 'Toggles', icon: Settings2, color: 'from-fuchsia-600 to-purple-600' },
  { id: 'tasks', label: 'Task Hub', icon: ClipboardList, color: 'from-emerald-600 to-teal-600' },
  { id: 'slides', label: 'Banners', icon: Image, color: 'from-violet-600 to-indigo-600' },
  { id: 'api', label: 'API Keys', icon: Key, color: 'from-amber-600 to-yellow-600' },
  { id: 'apps', label: 'Apps', icon: Megaphone, color: 'from-rose-600 to-pink-600' },
  { id: 'videos', label: 'Videos', icon: Video, color: 'from-red-600 to-orange-600' },
  { id: 'guide', label: 'Admin Guide', icon: BookOpen, color: 'from-teal-600 to-emerald-600' },
];

const AdminPanel = () => {
  const [activeModule, setActiveModule] = useState('syndicate');

  return (
    <div className="space-y-5 w-full">
      {/* Mobile-Friendly Horizontal Pill Navigation (Smooth scroll, no squishing or overlapping) */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-2 min-w-max px-0.5">
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`flex items-center gap-2 h-12 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 shadow-sm ${
                  isActive
                    ? `bg-gradient-to-r ${mod.color} text-white shadow-md scale-[1.02]`
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{mod.label}</span>
                {mod.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-white/25 text-white' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}`}>
                    {mod.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Content Container */}
      <div className="w-full">
        {activeModule === 'syndicate' && <AdminSyndicateManager />}
        {activeModule === 'analytics' && <AdminAnalytics />}
        {activeModule === 'users' && <AdminUserManager />}
        {activeModule === 'settings' && <AdminSettings />}
        {activeModule === 'features' && <AdminFeatureToggles />}
        {activeModule === 'tasks' && <TaskManager />}
        {activeModule === 'slides' && <SlideManager />}
        {activeModule === 'api' && <AdminApiManager />}
        {activeModule === 'apps' && <AdminMarketingApps />}
        {activeModule === 'videos' && <AdminVideoManager />}
        {activeModule === 'guide' && <AdminGuide />}
      </div>
    </div>
  );
};

export default AdminPanel;
