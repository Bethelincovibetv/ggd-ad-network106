
-- 1. Add expiration column for premium subscriptions
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;

-- 2. Seed app settings: free tier (tier 0) days, business contact, default ad days
INSERT INTO public.app_settings (key, value) VALUES
  ('ad_duration_free_days', '3'),
  ('premium_tier0_days', '3'),
  ('premium_tier0_label', 'Free Premium'),
  ('premium_tier4_label', 'Business / White-Label'),
  ('premium_business_contact', '')
ON CONFLICT (key) DO NOTHING;

-- 3. Update self_upgrade_premium to allow tier 0..4 and set 1-month expiry
CREATE OR REPLACE FUNCTION public.self_upgrade_premium(_tier integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _tier NOT IN (0,1,2,3,4) THEN RAISE EXCEPTION 'Invalid tier'; END IF;

  -- Tier 4 (Business) cannot be self-assigned, only admin
  IF _tier = 4 AND NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'Business plan requires admin assignment';
  END IF;

  INSERT INTO public.user_roles (user_id, role, premium_tier, premium_expires_at)
  VALUES (uid, 'premium', _tier, now() + interval '1 month')
  ON CONFLICT (user_id, role) DO UPDATE
    SET premium_tier = EXCLUDED.premium_tier,
        premium_expires_at = EXCLUDED.premium_expires_at;
END;
$$;

-- 4. Admin can subscribe any user to any plan (1-month duration)
CREATE OR REPLACE FUNCTION public.admin_subscribe_user(_user_id uuid, _tier integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _tier NOT IN (0,1,2,3,4) THEN RAISE EXCEPTION 'Invalid tier'; END IF;

  INSERT INTO public.user_roles (user_id, role, premium_tier, premium_expires_at)
  VALUES (_user_id, 'premium', _tier, now() + interval '1 month')
  ON CONFLICT (user_id, role) DO UPDATE
    SET premium_tier = EXCLUDED.premium_tier,
        premium_expires_at = EXCLUDED.premium_expires_at;
END;
$$;

-- 5. Auto-grant Free Premium (tier 0) to every newly-signed-up user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bonus_amount numeric := 0;
  ref_code text;
  ref_user uuid;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'ref';
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT user_id INTO ref_user FROM public.profiles WHERE referral_code = ref_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, referral_code, referred_by_user_id, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    substring(replace(NEW.id::text,'-',''),1,8),
    ref_user,
    ref_code
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'business')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Free Premium tier 0, 1-month rolling
  INSERT INTO public.user_roles (user_id, role, premium_tier, premium_expires_at)
  VALUES (NEW.id, 'premium', 0, now() + interval '1 month')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT COALESCE(NULLIF(value, '')::numeric, 0) INTO bonus_amount
  FROM public.app_settings WHERE key = 'vendor_wallet_bonus';

  INSERT INTO public.task_wallets (user_id, balance, total_funded)
  VALUES (NEW.id, COALESCE(bonus_amount, 0), COALESCE(bonus_amount, 0))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 6. Backfill: give every existing user the Free Premium tier 0
INSERT INTO public.user_roles (user_id, role, premium_tier, premium_expires_at)
SELECT p.user_id, 'premium', 0, now() + interval '1 month'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role = 'premium'
)
ON CONFLICT (user_id, role) DO NOTHING;
