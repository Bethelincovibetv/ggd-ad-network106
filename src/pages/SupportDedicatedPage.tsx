import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SupportPage from '@/components/SupportPage';
import { Button } from '@/components/ui/button';
import { Home, Bell, Headphones } from 'lucide-react';
import ggdLogo from '@/assets/ggd-logo.png';
import MetaTags from '@/components/MetaTags';
import { supabase } from '@/integrations/supabase/client';

export const SupportDedicatedPage: React.FC = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('Member');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MetaTags
        title="GGD Support & Live Help Desk"
        description="Get direct admin support, live chat on WhatsApp, phone support, and answers to your questions on GGD Ad Network."
        badge="SUPPORT DESK"
        keywords={['GGD support', 'admin live chat', 'Nigeria ad help', 'goodgiftdigital support', 'Lekki Phase 1 office']}
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <img src={ggdLogo} alt="GGD Ad Network" className="h-8 w-auto object-contain" />
              <span className="font-black text-sm sm:text-base hidden sm:inline tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                GGD Support Desk
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/notifications')}
              className="rounded-xl text-xs gap-1.5 font-bold cursor-pointer"
            >
              <Bell className="h-4 w-4 text-orange-500" />
              <span className="hidden sm:inline">Notifications</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/')}
              className="rounded-xl text-xs gap-1.5 font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-6">
        <SupportPage userEmail={userEmail} onNavigate={(tab) => navigate(`/?tab=${tab}`)} />
      </main>
    </div>
  );
};

export default SupportDedicatedPage;
