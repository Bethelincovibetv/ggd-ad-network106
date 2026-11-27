import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { VixoraTextChatPanel } from './VixoraTextChatPanel';
import { VixoraAppContext } from '../services/vixoraAgentTools';
import { getStoredVixoraModel, getVixoraModelOption } from '@/lib/vixoraModels';

export interface VixoraChatWorkspaceProps {
  embedded?: boolean;
  onBackToDashboard?: () => void;
  userEmail?: string;
}

export const VixoraChatWorkspace: React.FC<VixoraChatWorkspaceProps> = ({
  embedded = false,
  onBackToDashboard,
  userEmail,
}) => {
  const navigate = useNavigate();
  const [userFullName, setUserFullName] = useState<string>(() =>
    userEmail ? userEmail.split('@')[0] : 'Creator'
  );
  const [activeModel, setActiveModel] = useState<string>(() => getStoredVixoraModel());

  useEffect(() => {
    const onModelChanged = (evt: any) => {
      if (evt?.detail?.model) {
        setActiveModel(evt.detail.model);
      } else {
        setActiveModel(getStoredVixoraModel());
      }
    };
    window.addEventListener('vixora-model-changed', onModelChanged);
    return () => window.removeEventListener('vixora-model-changed', onModelChanged);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted || !user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('display_name, business_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mounted) return;
      const resolvedName =
        prof?.display_name ||
        prof?.business_name ||
        user.email?.split('@')[0] ||
        'Creator';
      setUserFullName(resolvedName);
    });
    return () => {
      mounted = false;
    };
  }, [userEmail]);

  const appContext: VixoraAppContext = useMemo(
    () => ({
      userFullName,
      setActiveTab: (tab: string) => {
        if (tab === 'ads' || tab === 'dashboard') {
          if (onBackToDashboard) onBackToDashboard();
          else navigate('/');
          return;
        }
        if (tab === 'my-business' || tab === 'directory' || tab === 'campaigns' || tab === 'wallet' || tab === 'tasks') {
          navigate(`/${tab === 'campaigns' ? 'campaigns' : tab === 'my-business' ? 'my-business' : tab}`);
        }
      },
      handleAutopilotVideoGeneration: () => {},
      setSelectedVoice: () => {},
      setVideoRatio: () => {},
      setTargetVideoDuration: () => {},
      saveCustomLearnedSkill: (name: string, desc: string) => {
        try {
          const saved = JSON.parse(localStorage.getItem('vixora_learned_skills') || '[]');
          saved.unshift({ id: Date.now(), name, desc, createdAt: new Date().toISOString() });
          localStorage.setItem('vixora_learned_skills', JSON.stringify(saved.slice(0, 20)));
        } catch {}
      },
      setGeneratedScript: () => {},
      setScriptTopic: () => {},
      setVideoScriptInput: () => {},
      getAccountOverview: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return {
            fullName: userFullName,
            email: userEmail || 'Guest',
            credits: 0,
            walletBalance: 0,
            activeAdsCount: 0,
            activeTasksCount: 0,
            productsCount: 0,
            unreadNotificationsCount: 0,
            summaryText: 'Sign in to inspect your live GGD Ad Network wallet and campaign stats.',
          };
        }

        const [profRes, walletRes, adsRes, tasksRes, listingsRes, notifRes] = await Promise.all([
          supabase.from('profiles').select('display_name, credits').eq('user_id', user.id).maybeSingle(),
          supabase.from('task_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('ads').select('id, is_active').eq('user_id', user.id),
          supabase.from('tasks').select('id, is_active').eq('creator_id', user.id),
          (supabase.from('business_listings') as any).select('id').eq('user_id', user.id),
          supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_read', false),
        ]);

        const credits = Number(profRes.data?.credits || 0);
        const walletBalance = Number(walletRes.data?.balance || 0);
        const activeAdsCount = (adsRes.data || []).filter((a: any) => a.is_active).length;
        const activeTasksCount = (tasksRes.data || []).filter((t: any) => t.is_active).length;
        const productsCount = (listingsRes.data || []).length;
        const unreadNotificationsCount = (notifRes.data || []).length;

        return {
          fullName: profRes.data?.display_name || userFullName,
          email: user.email || userEmail || 'Active Account',
          credits,
          walletBalance,
          activeAdsCount,
          activeTasksCount,
          productsCount,
          unreadNotificationsCount,
          summaryText: `You have ${credits.toLocaleString()} GGG credits, ₦${walletBalance.toLocaleString()} in your task wallet, ${activeAdsCount} active banner ads, and ${productsCount} storefront listings.`,
        };
      },
      listUserProducts: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await (supabase.from('business_listings') as any)
          .select('id, title, price, description, listing_type, image_url, is_active')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(12);
        return (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          price: Number(row.price || 0),
          description: row.description,
          category: row.listing_type === 'service' ? 'Service' : 'Product',
          image_url: row.image_url,
          status: row.is_active === false ? 'draft' : 'active',
        }));
      },
      createUserProduct: async (product) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, message: 'Sign in required to publish a product.' };
        }
        const { data: biz } = await (supabase.from('business_profiles') as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data, error } = await (supabase.from('business_listings') as any)
          .insert({
            user_id: user.id,
            business_id: biz?.id || null,
            title: product.title,
            price: Number(product.price || 0),
            description: product.description || 'Added via Vixora AI Chat',
            listing_type: 'product',
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          return { success: false, message: error.message };
        }
        return {
          success: true,
          product: data,
          message: `Product "${product.title}" created successfully.`,
        };
      },
      listActiveCampaigns: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return [];
        const { data } = await supabase
          .from('ads')
          .select('id, title, impressions, clicks, is_active')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        return data || [];
      },
    }),
    [navigate, onBackToDashboard, userEmail, userFullName]
  );

  const modelMeta = getVixoraModelOption(activeModel);

  return (
    <div
      className={
        embedded
          ? 'w-full min-w-0 space-y-3 overflow-x-hidden'
          : 'min-h-[100dvh] w-full bg-slate-950 text-white p-2 sm:p-4 md:p-6 overflow-x-hidden flex flex-col gap-3 max-w-5xl mx-auto'
      }
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-slate-900/90 border border-white/10 console-header-3d">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => (onBackToDashboard ? onBackToDashboard() : navigate('/'))}
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black tracking-tight text-white truncate flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-orange-400 shrink-0" />
                <span>Vixora AI Chat</span>
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Model: {modelMeta.label} ({modelMeta.badge})
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 shrink-0">
            <Sparkles className="h-3.5 w-3.5" /> Server-Side AI Ready
          </span>
        </div>
      )}

      <VixoraTextChatPanel
        isOpen={true}
        isFullTab={true}
        onClose={() => (onBackToDashboard ? onBackToDashboard() : navigate('/'))}
        appContext={appContext}
        themeMode="dark"
      />
    </div>
  );
};

export default VixoraChatWorkspace;
