import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MetaTags from '@/components/MetaTags';

// Unified public site: /business/:id now redirects to the user's
// professional profile site (slug-based if available).
const BusinessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      // 1. Try slug on profiles
      const { data: bySlug } = await supabase
        .from('profiles').select('user_id, business_slug').eq('business_slug', id).maybeSingle();
      if (bySlug?.user_id) {
        return navigate(`/b/${bySlug.business_slug || id}`, { replace: true });
      }

      // 2. Try user_id directly on profiles
      const { data: byUserId } = await supabase
        .from('profiles').select('user_id, business_slug').eq('user_id', id).maybeSingle();
      if (byUserId?.user_id) {
        if (byUserId.business_slug) return navigate(`/b/${byUserId.business_slug}`, { replace: true });
        return navigate(`/user/${byUserId.user_id}`, { replace: true });
      }

      // 3. Try business_profiles by id
      const { data: bpById } = await (supabase.from('business_profiles') as any)
        .select('user_id, slug').eq('id', id).maybeSingle();
      if (bpById?.user_id) {
        if (bpById.slug) return navigate(`/b/${bpById.slug}`, { replace: true });
        const { data: prof } = await supabase
          .from('profiles').select('business_slug').eq('user_id', bpById.user_id).maybeSingle();
        if (prof?.business_slug) return navigate(`/b/${prof.business_slug}`, { replace: true });
        return navigate(`/user/${bpById.user_id}`, { replace: true });
      }

      // 4. Try business_profiles by user_id
      const { data: bpByUser } = await (supabase.from('business_profiles') as any)
        .select('user_id, slug').eq('user_id', id).maybeSingle();
      if (bpByUser?.user_id) {
        if (bpByUser.slug) return navigate(`/b/${bpByUser.slug}`, { replace: true });
        return navigate(`/user/${bpByUser.user_id}`, { replace: true });
      }

      // Fallback directly to user route
      navigate(`/user/${id}`, { replace: true });
    })();
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50">
      <MetaTags
        title="Business Profile — GGD Ad Network"
        description="View verified business storefront, products, and contact info on GGD Ad Network."
        type="business"
      />
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
};

export default BusinessDetailPage;
