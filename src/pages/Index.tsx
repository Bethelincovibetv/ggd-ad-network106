import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AuthForm from "@/components/AuthForm";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) setShowAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

  return <LandingPage onGetStarted={() => setShowAuth(true)} />;
};

export default Index;
