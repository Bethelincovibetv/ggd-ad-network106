import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthForm from "@/components/AuthForm";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import FeaturedStorefronts from "@/components/FeaturedStorefronts";
import SeoHead from "@/components/SeoHead";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
        if (session) setShowAuth(false);
      }
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Session retrieval error:", err);
        if (mounted) setLoading(false);
      });

    // Safety timeout: prevent indefinite spinner if network is degraded
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session) {
    return <Dashboard onLogout={() => setSession(null)} userEmail={session.user.email || ''} />;
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <AuthForm onAuthSuccess={() => {}} />
          <button onClick={() => setShowAuth(false)} className="w-full text-center text-gray-400 hover:text-white mt-4 text-sm">
            ← Back to landing page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title="GGD Ad Network — Nigeria's #1 Social Distribution & Marketplace"
        description="Amplify your brand reach across WhatsApp, Telegram, TikTok & Facebook with verified syndicate promoters."
        badge="OFFICIAL NETWORK"
        theme="orange"
      />
      <LandingPage onGetStarted={() => setShowAuth(true)} />
      <FeaturedStorefronts onRequireAuth={() => setShowAuth(true)} />
    </>
  );
};

export default Index;
