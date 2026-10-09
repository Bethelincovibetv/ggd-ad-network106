import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auth as firebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getLocalSession, resilientSignOut } from "@/services/authService";
import AuthForm from "@/components/AuthForm";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import MetaTags from "@/components/MetaTags";

const Index = () => {
  const [session, setSession] = useState<any>(() => getLocalSession());
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(() => !getLocalSession());

  useEffect(() => {
    let mounted = true;

    // Check immediate local session
    const localSess = getLocalSession();
    if (localSess && mounted) {
      setSession(localSess);
      setLoading(false);
    }

    // 1. Listen for Supabase auth state change
    let sub: any = null;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        if (mounted) {
          if (supabaseSession) {
            setSession(supabaseSession);
            setShowAuth(false);
          }
          setLoading(false);
        }
      });
      sub = subscription;
    } catch {
      // Non-blocking
    }

    // 2. Try Supabase getSession
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (mounted && s) {
          setSession(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Session retrieval fallback active:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 3. Listen for Firebase auth state change
    const unsubFirebase = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (mounted && fbUser && fbUser.email) {
        setSession((prev: any) => prev || {
          user: {
            id: fbUser.uid,
            email: fbUser.email,
            user_metadata: { display_name: fbUser.displayName || fbUser.email.split("@")[0] },
          },
        });
        setLoading(false);
      }
    });

    // Safety timeout: prevent indefinite spinner (fast 400ms timeout)
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 400);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (sub) sub.unsubscribe();
      unsubFirebase();
    };
  }, []);

  const handleAuthSuccess = () => {
    const updated = getLocalSession();
    if (updated) {
      setSession(updated);
    }
    setShowAuth(false);
    setLoading(false);
  };

  const handleLogout = async () => {
    await resilientSignOut();
    setSession(null);
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session) {
    return <Dashboard onLogout={handleLogout} userEmail={session?.user?.email || ''} />;
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-orange-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <AuthForm onAuthSuccess={handleAuthSuccess} />
          <button onClick={() => setShowAuth(false)} className="w-full text-center text-gray-400 hover:text-white mt-4 text-sm">
            ← Back to landing page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title="GGD Ad Network — Nigeria's #1 Social Distribution & Marketplace"
        description="Amplify your brand reach across WhatsApp, Telegram, TikTok & Facebook with verified syndicate promoters."
        badge="OFFICIAL NETWORK"
        keywords={['ad network Nigeria', 'social syndicate', 'WhatsApp marketing', 'business directory', 'monetization', 'Telegram promotions']}
      />
      <LandingPage onGetStarted={() => setShowAuth(true)} />
    </>
  );
};

export default Index;
