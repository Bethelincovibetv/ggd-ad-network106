import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, TrendingUp, Image, ClipboardList, Briefcase, Key, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminAnalytics from "@/components/AdminAnalytics";
import SlideManager from "@/components/SlideManager";
import TaskManager from "@/components/TaskManager";
import AdminSyndicateManager from "@/components/AdminSyndicateManager";
import AdminSettings from "@/components/AdminSettings";
import AdminUserManager from "@/components/AdminUserManager";
import AdminApiManager from "@/components/AdminApiManager";
import AdminMarketingApps from "@/components/AdminMarketingApps";

const AdminPanel = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="analytics" className="text-[10px]"><TrendingUp className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="users" className="text-[10px]"><Users className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="settings" className="text-[10px]"><Settings className="h-3 w-3" /></TabsTrigger>
          <TabsTrigger value="more" className="text-[10px]"><Megaphone className="h-3 w-3" /></TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="users">
          <AdminUserManager />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>

        <TabsContent value="more">
          <Tabs defaultValue="syndicate" className="space-y-4">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="syndicate" className="text-[10px]"><Briefcase className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="slides" className="text-[10px]"><Image className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="tasks" className="text-[10px]"><ClipboardList className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="api" className="text-[10px]"><Key className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="apps" className="text-[10px]"><Megaphone className="h-3 w-3" /></TabsTrigger>
            </TabsList>
            <TabsContent value="syndicate"><AdminSyndicateManager /></TabsContent>
            <TabsContent value="slides"><SlideManager /></TabsContent>
            <TabsContent value="tasks"><TaskManager /></TabsContent>
            <TabsContent value="api"><AdminApiManager /></TabsContent>
            <TabsContent value="apps"><AdminMarketingApps /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
