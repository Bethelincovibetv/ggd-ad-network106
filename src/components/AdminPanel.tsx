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
import TaskProofReviewList from "@/components/taskproof/TaskProofReviewList";
import AdminSyndicateManager from "@/components/AdminSyndicateManager";
import AdminSettings from "@/components/AdminSettings";
import AdminUserManager from "@/components/AdminUserManager";
import AdminApiManager from "@/components/AdminApiManager";
import AdminMarketingApps from "@/components/AdminMarketingApps";
import AdminFeatureToggles from "@/components/AdminFeatureToggles";
import AdminGuide from "@/components/AdminGuide";
import AdminVideoManager from "@/components/AdminVideoManager";
import AdminAdManager from "@/components/AdminAdManager";
import AdminChatSystem from "@/components/AdminChatSystem";
import AdminVixoraManager from "@/components/AdminVixoraManager";
import AdminBusinessAgentManager from "@/components/AdminBusinessAgentManager";
import AdminDigitalProductsManager from "@/components/admin/AdminDigitalProductsManager";
import AdminRedeemManager from "@/components/AdminRedeemManager";
import AdminNotificationSender from "@/components/AdminNotificationSender";
import AdminCoOwnerManager from "@/components/AdminCoOwnerManager";
import AdminEmailStudio from "@/components/admin/AdminEmailStudio";
import AdminContactGainManager from "@/components/AdminContactGainManager";
import { AdminVerificationManager } from "@/components/admin/AdminVerificationManager";
import AdminActivationManager from "@/components/admin/AdminActivationManager";
import { AdminRealtimeSearchBar } from "@/components/admin/AdminRealtimeSearchBar";
import { MessageSquare, LayoutGrid, Package, Smartphone } from "lucide-react";

const ADMIN_MODULES = [
  { id: 'digital-products', label: 'Digital Products', icon: Package, color: 'from-orange-500 via-amber-500 to-red-600', badge: 'Direct Buy' },
  { id: 'vixora-admin', label: 'Vixora AI & API', icon: Video, color: 'from-orange-500 via-purple-600 to-indigo-700', badge: 'AI Engine' },
  { id: 'business-agent', label: 'Business AI Agent', icon: Sparkles, color: 'from-violet-600 via-purple-600 to-fuchsia-600', badge: 'Copilot' },
  { id: 'syndicate', label: 'Syndicate Management', icon: Briefcase, color: 'from-purple-600 to-indigo-600', badge: 'Syndicate' },
  { id: 'ads', label: 'Full Ad Manager', icon: Megaphone, color: 'from-amber-600 to-orange-600', badge: 'Ads' },
  { id: 'chat', label: 'Support & Chat', icon: MessageSquare, color: 'from-blue-600 to-indigo-600', badge: 'Live' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'from-blue-600 to-cyan-600' },
  { id: 'users', label: 'Users & KYC', icon: Users, color: 'from-orange-600 to-red-600' },
  { id: 'activation-fee', label: 'Activation Fee', icon: ShieldCheck, color: 'from-orange-500 to-amber-600', badge: 'Onboarding' },
  { id: 'airtime', label: 'Airtime & Data', icon: Smartphone, color: 'from-orange-500 via-amber-500 to-red-600' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'from-pink-600 to-rose-600' },
  { id: 'features', label: 'Toggles', icon: Settings2, color: 'from-fuchsia-600 to-purple-600' },
  { id: 'tasks', label: 'Credit Tasks', icon: ClipboardList, color: 'from-emerald-600 to-teal-600' },
  { id: 'task-proofs', label: 'Task Proofs', icon: ShieldCheck, color: 'from-emerald-600 to-teal-600', badge: 'Review' },
  { id: 'slides', label: 'Banners', icon: Image, color: 'from-violet-600 to-indigo-600' },
  { id: 'api', label: 'API Keys', icon: Key, color: 'from-amber-600 to-yellow-600' },
  { id: 'apps', label: 'Apps', icon: LayoutGrid, color: 'from-rose-600 to-pink-600' },
  { id: 'videos', label: 'Videos', icon: Video, color: 'from-red-600 to-orange-600' },
  { id: 'guide', label: 'Admin Guide', icon: BookOpen, color: 'from-teal-600 to-emerald-600' },
];

const AdminPanel = () => {
  const [activeModule, setActiveModule] = useState('syndicate');
  const [featureProps, setFeatureProps] = useState<{ featureSearch?: string; featureTab?: 'features' | 'menus' }>({});
  const [syndicateProps, setSyndicateProps] = useState<{ initialCampaignId?: string; initialTab?: any }>({});

  const handleNavigate = (sectionId: string, extraProps?: any) => {
    if (sectionId === 'syndicate' && extraProps) {
      setSyndicateProps(extraProps);
    }
    if (sectionId === 'features') {
      setFeatureProps({
        featureSearch: extraProps?.featureSearch ?? '',
        featureTab: extraProps?.featureTab || 'features',
      });
    } else {
      setFeatureProps({});
    }
    setActiveModule(sectionId);
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Search any feature, toggle, section, user, or campaign */}
      <div className="w-full px-1">
        <AdminRealtimeSearchBar onNavigate={handleNavigate} className="max-w-2xl" />
      </div>

      {/* Mobile-Friendly Horizontal Pill Navigation with 3D tactile buttons */}
      <div className="w-full overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-2.5 min-w-max px-1">
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => handleNavigate(mod.id)}
                className={`group flex items-center gap-2.5 h-12 px-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-r ${mod.color} text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02] border border-white/20`
                    : 'bg-card text-foreground/80 hover:text-foreground hover:bg-muted/80 border border-border shadow-xs'
                }`}
              >
                <span className={`relative inline-grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br ${mod.color} flex-shrink-0 shadow-[0_3px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.2)] ${
                  isActive ? 'ring-2 ring-white/70' : 'opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all'
                }`}>
                  <span className="absolute inset-x-1 top-0.5 h-2 rounded-full bg-white/40 blur-[1px]" />
                  <Icon className="h-4 w-4 text-white relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
                </span>
                <span className="whitespace-nowrap">{mod.label}</span>
                {mod.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isActive ? 'bg-white/25 text-white' : 'bg-primary/10 text-primary'}`}>
                    {mod.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Content Container */}
      <div className="w-full min-w-0 max-w-full">
        {activeModule === 'digital-products' && <AdminDigitalProductsManager />}
        {activeModule === 'vixora-admin' && <AdminVixoraManager />}
        {activeModule === 'business-agent' && <AdminBusinessAgentManager />}
        {activeModule === 'syndicate' && (
          <AdminSyndicateManager
            initialCampaignId={syndicateProps.initialCampaignId}
            initialTab={syndicateProps.initialTab}
            onNavigateSection={handleNavigate}
          />
        )}
        {activeModule === 'ads' && <AdminAdManager />}
        {activeModule === 'chat' && <AdminChatSystem />}
        {activeModule === 'analytics' && <AdminAnalytics />}
        {activeModule === 'users' && <AdminUserManager />}
        {activeModule === 'activation-fee' && <AdminActivationManager />}
        {activeModule === 'verification' && <AdminVerificationManager />}
        {activeModule === 'contact-gain' && <AdminContactGainManager />}
        {activeModule === 'email-studio' && <AdminEmailStudio />}
        {activeModule === 'notifications' && <AdminNotificationSender />}
        {activeModule === 'coowners' && <AdminCoOwnerManager />}
        {(activeModule === 'airtime' || activeModule === 'redeem') && <AdminRedeemManager />}
        {activeModule === 'settings' && <AdminSettings />}
        {activeModule === 'features' && (
          <AdminFeatureToggles
            initialSearch={featureProps.featureSearch}
            initialTab={featureProps.featureTab}
          />
        )}
        {activeModule === 'tasks' && <TaskManager />}
        {activeModule === 'task-proofs' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Credit Task Proofs</h2>
            <p className="text-sm text-muted-foreground">Review proofs for every credit task. Unreviewed proofs are approved automatically after 48 hours.</p>
            <TaskProofReviewList />
          </div>
        )}
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
