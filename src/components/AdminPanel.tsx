import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, TrendingUp, Image, ClipboardList, Briefcase, Key, Megaphone, Settings2, BookOpen, Video } from "lucide-react";
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
const tabBase = "flex flex-col items-center justify-center gap-1 h-16 rounded-xl text-[10px] font-semibold text-white border-0 transition-all data-[state=active]:scale-105 data-[state=active]:shadow-lg data-[state=inactive]:opacity-70";

const AdminPanel = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="guide" className="space-y-4">
        <TabsList className="w-full grid grid-cols-6 gap-2 bg-transparent p-0 h-auto">
          <TabsTrigger value="guide" className={`${tabBase} bg-gradient-to-br from-emerald-500 to-teal-600`}>
            <BookOpen className="h-5 w-5" /><span>Guide</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className={`${tabBase} bg-gradient-to-br from-blue-500 to-indigo-600`}>
            <TrendingUp className="h-5 w-5" /><span>Stats</span>
          </TabsTrigger>
          <TabsTrigger value="users" className={`${tabBase} bg-gradient-to-br from-orange-500 to-red-600`}>
            <Users className="h-5 w-5" /><span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className={`${tabBase} bg-gradient-to-br from-pink-500 to-rose-600`}>
            <Settings className="h-5 w-5" /><span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="features" className={`${tabBase} bg-gradient-to-br from-purple-500 to-fuchsia-600`}>
            <Settings2 className="h-5 w-5" /><span>Toggles</span>
          </TabsTrigger>
          <TabsTrigger value="more" className={`${tabBase} bg-gradient-to-br from-amber-500 to-orange-600`}>
            <Megaphone className="h-5 w-5" /><span>More</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide">
          <AdminGuide />
        </TabsContent>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="users">
          <AdminUserManager />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>

        <TabsContent value="features">
          <AdminFeatureToggles />
        </TabsContent>

        <TabsContent value="more">
          <Tabs defaultValue="syndicate" className="space-y-4">
            <TabsList className="w-full grid grid-cols-6 gap-2 bg-transparent p-0 h-auto">
              <TabsTrigger value="syndicate" className={`${tabBase} bg-gradient-to-br from-cyan-500 to-blue-600`}>
                <Briefcase className="h-5 w-5" /><span>Syndicate</span>
              </TabsTrigger>
              <TabsTrigger value="slides" className={`${tabBase} bg-gradient-to-br from-violet-500 to-purple-600`}>
                <Image className="h-5 w-5" /><span>Slides</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className={`${tabBase} bg-gradient-to-br from-green-500 to-emerald-600`}>
                <ClipboardList className="h-5 w-5" /><span>Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="api" className={`${tabBase} bg-gradient-to-br from-yellow-500 to-amber-600`}>
                <Key className="h-5 w-5" /><span>API</span>
              </TabsTrigger>
              <TabsTrigger value="apps" className={`${tabBase} bg-gradient-to-br from-fuchsia-500 to-pink-600`}>
                <Megaphone className="h-5 w-5" /><span>Apps</span>
              </TabsTrigger>
              <TabsTrigger value="videos" className={`${tabBase} bg-gradient-to-br from-red-500 to-rose-600`}>
                <Video className="h-5 w-5" /><span>Videos</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="syndicate"><AdminSyndicateManager /></TabsContent>
            <TabsContent value="slides"><SlideManager /></TabsContent>
            <TabsContent value="tasks"><TaskManager /></TabsContent>
            <TabsContent value="api"><AdminApiManager /></TabsContent>
            <TabsContent value="apps"><AdminMarketingApps /></TabsContent>
            <TabsContent value="videos"><AdminVideoManager /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
