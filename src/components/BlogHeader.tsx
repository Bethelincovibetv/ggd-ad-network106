
import React from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, LogOut } from "lucide-react";

interface BlogHeaderProps {
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

const BlogHeader = ({ onLogout, isAuthenticated }: BlogHeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                GGD Ad Network
              </h1>
              <p className="text-xs text-gray-500">Smart Advertising Platform</p>
            </div>
          </div>
          
          {isAuthenticated && onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default BlogHeader;
