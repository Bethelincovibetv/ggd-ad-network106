import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resilientSignOut } from "@/services/authService";
import { safeStorage } from "@/utils/safeStorage";
import AuthForm from "@/components/AuthForm";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import MetaTags from "@/components/MetaTags";

interface IndexProps {
  initialTab?: string;
}

const Index: React.FC<IndexProps> = ({ initialTab }) => {
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whatsappPositioning, setWhatsappPositioning] = useState<boolean>(() => {
    return safeStorage.getItem('landing_whatsapp_positioning') === 'true';
  });
  const [settingLoaded, setSettingLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Authoritative fetch of landing_whatsapp_positioning from database
    Promise.resolve(supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'landing_whatsapp_positioning')
      .maybeSingle())
      .then(({ data, error }) => {
        if (mounted) {
          if (!error) {
            const isEnabled = data?.value === 'true';
            setWhatsappPositioning(isEnabled);
            safeStorage.setItem('landing_whatsapp_positioning', isEnabled ? 'true' : 'false');
          } else {
            const cached = safeStorage.getItem('landing_whatsapp_positioning');
            setWhatsappPositioning(cached === 'true');
          }
        }
      })
      .catch((err) => {
        console.warn("Failed fetching landing_whatsapp_positioning:", err);
        if (mounted) {
          const cached = safeStorage.getItem('landing_whatsapp_positioning');
          setWhatsappPositioning(cached === 'true');
        }
      })
      .finally(() => {
        if (mounted) {
          setSettingLoaded(true);
        }
      });

    // 1. Listen for Supabase Auth state changes as single source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (mounted) {
        setSession(supabaseSession);
        if (supabaseSession) {
          setShowAuth(false);
        }
        setLoading(false);
      }
    });

    // 2. Restore active Supabase session
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (mounted) {
          setSession(s);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Session retrieval error:", err);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      });

    // Safety timeout (3000ms): prevent indefinite spinner
    const timer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
        setSettingLoaded(true);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
    } catch {
      // onAuthStateChange will update session if available
    }
    setShowAuth(false);
    setLoading(false);
  };

  const handleLogout = async () => {
    await resilientSignOut();
    setSession(null);
  };

  if ((loading || !settingLoaded) && !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-3">
        <div className="animate-spin h-9 w-9 border-4 border-orange-500 border-t-transparent rounded-full shadow-md" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading GGD Ad Network…</p>
      </div>
    );
  }

  if (session) {
    return <Dashboard onLogout={handleLogout} userEmail={session?.user?.email || ''} initialTab={initialTab} />;
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
        title={
          whatsappPositioning
            ? "GGD Ad Network: WhatsApp promotion for Nigerian businesses"
            : "GGD Ad Network — Nigeria's #1 Social Distribution & Marketplace"
        }
        description={
          whatsappPositioning
            ? "Our team of promoters posts your business on their Status, groups and channels, reaching real people in the states you choose. You pay only for the views we prove."
            : "Amplify your brand reach across WhatsApp, Telegram, TikTok & Facebook with verified syndicate promoters."
        }
        badge={whatsappPositioning ? "WHATSAPP PROMOTION TEAM" : "OFFICIAL NETWORK"}
        keywords={
          whatsappPositioning
            ? ['WhatsApp promotion Nigeria', 'WhatsApp marketing', 'social syndicate', 'WhatsApp status ads', 'promoter network']
            : ['ad network Nigeria', 'social syndicate', 'WhatsApp marketing', 'business directory', 'monetization', 'Telegram promotions']
        }
      />
      <LandingPage onGetStarted={() => setShowAuth(true)} whatsappPositioning={whatsappPositioning} />
    </>
  );
};

export default Index;
