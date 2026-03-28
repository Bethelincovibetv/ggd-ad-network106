import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Users, Crown, Store } from "lucide-react";
import BusinessUpgradeForm from "@/components/BusinessUpgradeForm";
import SyndicateApplicationForm from "@/components/SyndicateApplicationForm";

interface UpgradePageProps {
  onUpgraded: () => void;
}

const UpgradePage = ({ onUpgraded }: UpgradePageProps) => {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-foreground">Upgrade Your Account</h2>
        <p className="text-xs text-muted-foreground">Choose how you want to grow on GGD Ad Network</p>
      </div>
      <Tabs defaultValue="business">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="business" className="text-xs gap-1">
            <Briefcase className="h-3 w-3" />Business
          </TabsTrigger>
          <TabsTrigger value="syndicate" className="text-xs gap-1">
            <Users className="h-3 w-3" />Syndicate
          </TabsTrigger>
        </TabsList>
        <TabsContent value="business">
          <BusinessUpgradeForm onUpgraded={onUpgraded} />
        </TabsContent>
        <TabsContent value="syndicate">
          <SyndicateApplicationForm onApplied={onUpgraded} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UpgradePage;
