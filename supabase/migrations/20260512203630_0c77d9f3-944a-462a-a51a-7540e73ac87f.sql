
-- 1. Seed default settings (only insert when missing)
INSERT INTO public.app_settings (key, value) VALUES
  ('login_credits', '10'),
  ('ad_cost_credits', '5'),
  ('credit_exchange_rate', '100'),
  ('premium_upgrade_credits', '500'),
  ('vendor_wallet_bonus', '0'),
  ('directory_listing_cost', '0'),
  ('referral_percentage', '5'),
  ('premium_system_enabled', 'true'),
  ('auto_convert_ads_to_tasks', 'false'),
  ('premium_tier1_price', '1000'),
  ('premium_tier1_days', '3'),
  ('premium_tier2_price', '3000'),
  ('premium_tier2_days', '15'),
  ('premium_tier3_price', '5000'),
  ('premium_tier3_days', '30'),
  ('whatsapp_group_link', ''),
  ('admin_whatsapp', '2348131107416'),
  ('admin_bio', 'GGD Ad Network — Boost your brand. Amplify your reach.'),
  ('credit_brand_name', 'Goodgift Digital (GGG)'),
  ('credit_brand_short', 'GGG')
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure community feature toggle exists
INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description) VALUES
  ('community', 'Community Feed', true, 'Community/social feed page')
ON CONFLICT (feature_key) DO NOTHING;

-- 3. is_feature_enabled helper (defaults to TRUE if key missing so app stays usable)
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_enabled FROM public.feature_toggles WHERE feature_key = _key LIMIT 1), true);
$$;

-- 4. Backend enforcement: block writes when feature is disabled (admins exempt)
DROP POLICY IF EXISTS "Block community when disabled" ON public.community_posts;
CREATE POLICY "Block community when disabled" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_feature_enabled('community') OR public.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "Users can create own posts" ON public.community_posts;

DROP POLICY IF EXISTS "Block syndicate when disabled" ON public.syndicate_tasks;
CREATE POLICY "Block syndicate when disabled" ON public.syndicate_tasks
  FOR INSERT TO authenticated
  WITH CHECK (business_user_id = auth.uid() AND (public.is_feature_enabled('syndicate') OR public.has_role(auth.uid(),'admin')));
