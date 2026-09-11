import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsPage } from '@/components/NotificationsPage';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, BookOpen } from 'lucide-react';
import ggdLogo from '@/assets/ggd-logo.png';
import NotificationBell from '@/components/NotificationBell';
import SeoHead from '@/components/SeoHead';

export const NotificationsDedicatedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead
        title="Notifications Center — GGD Ad Network"
        description="Stay updated with task approvals, earnings alerts, community interactions, and network announcements."
        badge="ACTIVITY ALERTS"
        theme="dark"
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
                GGD Ad Network
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/guide')}
              className="rounded-xl text-xs gap-1.5 font-bold"
            >
              <BookOpen className="h-4 w-4 text-orange-500" />
              <span className="hidden sm:inline">User Guide</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="rounded-xl text-xs gap-1.5 font-bold"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>

            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <NotificationsPage
          onNavigate={(tab) => {
            if (tab === 'guide') {
              navigate('/guide');
            } else {
              navigate('/');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ggd-nav', { detail: tab }));
              }, 150);
            }
          }}
        />
      </main>
    </div>
  );
};

export default NotificationsDedicatedPage;
