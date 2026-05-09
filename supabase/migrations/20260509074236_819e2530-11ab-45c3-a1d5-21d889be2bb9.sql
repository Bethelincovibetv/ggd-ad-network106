-- Seed premium system settings (idempotent)
INSERT INTO public.app_settings (key, value) VALUES
  ('premium_system_enabled', 'true'),
  ('ad_duration_free_days', '3'),
  ('premium_tier1_days', '7'),
  ('premium_tier1_credits', '50'),
  ('premium_tier2_days', '15'),
  ('premium_tier2_credits', '120'),
  ('premium_tier3_days', '30'),
  ('premium_tier3_credits', '250'),
  ('auto_convert_ads_to_tasks', 'false')
ON CONFLICT (key) DO NOTHING;

-- Allow premium tier metadata column on user_roles (track which tier)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS premium_tier integer;

-- Secure self-upgrade RPC: lets a user grant themselves a premium role after we've already debited them
CREATE OR REPLACE FUNCTION public.self_upgrade_premium(_tier integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _tier NOT IN (1,2,3) THEN RAISE EXCEPTION 'Invalid tier'; END IF;

  INSERT INTO public.user_roles (user_id, role, premium_tier)
  VALUES (uid, 'premium', _tier)
  ON CONFLICT (user_id, role) DO UPDATE SET premium_tier = EXCLUDED.premium_tier;
END;
$$;

-- Add Google My Business platform pricing (idempotent)
INSERT INTO public.platform_pricing (platform_name, platform_key, price_per_task, is_active)
SELECT 'Google My Business Review', 'google_my_business', 150, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_pricing WHERE platform_key = 'google_my_business');

-- Add Pinterest too (often missing)
INSERT INTO public.platform_pricing (platform_name, platform_key, price_per_task, is_active)
SELECT 'Pinterest', 'pinterest', 50, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_pricing WHERE platform_key = 'pinterest');

-- Trigger: when an ad is inserted (e.g. via API), auto-create a share task if toggle on
CREATE OR REPLACE FUNCTION public.auto_convert_ad_to_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toggle text;
BEGIN
  SELECT value INTO toggle FROM public.app_settings WHERE key = 'auto_convert_ads_to_tasks';
  IF toggle = 'true' AND NEW.is_active = true THEN
    INSERT INTO public.tasks (title, description, share_url, task_type, reward_credits, max_completions, creator_id, funded, flyer_url)
    VALUES (
      'Share: ' || NEW.title,
      COALESCE(NEW.description, 'Share this ad and earn credits!'),
      NEW.target_url,
      'share',
      5,
      20,
      NEW.user_id,
      true,
      NEW.image_url
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_convert_ad_to_task_trg ON public.ads;
CREATE TRIGGER auto_convert_ad_to_task_trg
  AFTER INSERT ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_convert_ad_to_task();
