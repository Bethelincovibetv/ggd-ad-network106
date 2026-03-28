
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Home } from "lucide-react";

interface FeatureNavigationProps {
  activeFeature: string;
  onFeatureChange: (feature: string) => void;
}

const FeatureNavigation = ({ activeFeature, onFeatureChange }: FeatureNavigationProps) => {
  const features = [
    {
      id: 'home',
      title: 'Dashboard',
      icon: Home,
      description: 'Ad Network Dashboard'
    },
    {
      id: 'rotator',
      title: 'Ad Manager',
      icon: RotateCcw,
      description: 'Manage your ad campaigns'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card 
            key={feature.id}
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              activeFeature === feature.id 
                ? 'ring-2 ring-orange-500 bg-orange-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => onFeatureChange(feature.id)}
          >
            <CardContent className="p-4 text-center">
              <Icon className={`mx-auto mb-2 h-8 w-8 ${
                activeFeature === feature.id 
                  ? 'text-orange-600' 
                  : 'text-gray-600'
              }`} />
              <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default FeatureNavigation;
