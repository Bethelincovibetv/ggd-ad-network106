import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Unified public site: /business/:id now redirects to the user's
// professional profile site (slug-based if available).
const BusinessDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      // If id looks like a slug (non-uuid), try slug first
      const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!uuidLike) {
        const { data: bySlug } = await supabase
          .from('profiles').select('user_id').eq('business_slug', id).maybeSingle();
        if (bySlug?.user_id) return navigate(`/b/${id}`, { replace: true });
      }
      const { data: bp } = await (supabase.from('business_profiles') as any)
        .select('user_id').eq('id', id).maybeSingle();
      if (!bp?.user_id) return navigate('/', { replace: true });
      const { data: prof } = await supabase
        .from('profiles').select('business_slug').eq('user_id', bp.user_id).maybeSingle();
      if (prof?.business_slug) navigate(`/b/${prof.business_slug}`, { replace: true });
      else navigate(`/user/${bp.user_id}`, { replace: true });
    })();
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );
};

export default BusinessDetailPage;
