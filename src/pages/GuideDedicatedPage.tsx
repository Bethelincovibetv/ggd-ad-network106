import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserGuide from '@/components/UserGuide';
import { Button } from '@/components/ui/button';
import { Home, Bell } from 'lucide-react';
import ggdLogo from '@/assets/ggd-logo.png';
import NotificationBell from '@/components/NotificationBell';
import SeoHead from '@/components/SeoHead';

export const GuideDedicatedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead
        title="GGD User Guide & Growth Academy"
        description="Comprehensive guide on how to launch social syndicate campaigns, earn as a promoter, and scale sales on GGD Ad Network."
        badge="USER GUIDE"
        theme="emerald"
      />
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <img src={ggdLogo} alt="GGD Ad Network" className="h-8 w-auto object-contain" />
              <span className="font-black text-sm sm:text-base hidden sm:inline tracking-tight">
                GGD Growth Guide
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/notifications')}
              className="rounded-xl text-xs gap-1.5 font-bold"
            >
              <Bell className="h-4 w-4 text-orange-500" />
              <span className="hidden sm:inline">Notifications</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/')}
              className="rounded-xl text-xs gap-1.5 font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
            >
              <Home className="h-4 w-4" />
              <span>Back to App</span>
            </Button>

            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <UserGuide />
      </main>
    </div>
  );
};

export default GuideDedicatedPage;
