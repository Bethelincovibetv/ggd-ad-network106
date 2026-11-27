import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MetaTags from '@/components/MetaTags';
import VixoraChatWorkspace from '@/vixora/components/VixoraChatWorkspace';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

const VixoraCreatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { isEnabled, loading } = useFeatureToggles();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
        if (user.email === 'goodgiftdigital@gmail.com' || user.email === 'bethelincovibetv@gmail.com') {
          setIsAdmin(true);
        } else {
          supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
            if (data?.role === 'admin') setIsAdmin(true);
          });
        }
      }
    });
  }, []);

  if (!loading && !isEnabled('vixora_ai_studio') && !isEnabled('ggd_ai_chat') && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-3xl bg-slate-900 border border-white/10 space-y-4 shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/30">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Vixora AI Chat is Currently Offline</h2>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            The administrator has temporarily switched off Vixora AI Chat for maintenance or updates. Please check back shortly.
          </p>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black uppercase text-xs rounded-xl py-3 shadow-lg cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MetaTags
        title="Vixora AI Chat — Server-Side Gemini & Gemma Assistant"
        description="Chat directly with Vixora AI powered by free-tier Gemini and Gemma models on GGD Ad Network for ad copy, products, campaigns, and clear direct answers."
        badge="AI CHAT AGENT"
        keywords={['Vixora AI Chat', 'Gemini 3.8 Flash', 'Gemma 4', 'AI business assistant', 'GGD Ad Network']}
      />
      <VixoraChatWorkspace
        embedded={false}
        onBackToDashboard={() => navigate('/')}
        userEmail={userEmail}
      />
    </>
  );
};

export default VixoraCreatorPage;
