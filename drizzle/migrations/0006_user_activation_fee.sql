-- Migration 0006: User Activation / Onboarding Fee (Existing Tables Only)
-- Extends public.profiles, seeds app_settings keys, and creates atomic activation RPCs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_activated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz NULL;

-- Ensure existing admin accounts default to activated
UPDATE public.profiles p
SET
  is_activated = true,
  activated_at = COALESCE(p.activated_at, now())
WHERE
  LOWER(COALESCE(p.email, '')) IN ('goodgiftdigital@gmail.com', 'accessa787@gmail.com')
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'
  );

-- Seed activation fee defaults inside existing app_settings table
INSERT INTO public.app_settings (key, value)
VALUES
  ('activation_fee_enabled', 'true'),
  ('activation_fee_amount', '1000'),
  ('activation_bonus_credits', '200')
ON CONFLICT (key) DO NOTHING;

-- Atomic activation & starter bonus credit procedure
CREATE OR REPLACE FUNCTION public.activate_user_account(
  p_user_id uuid,
  p_bonus integer DEFAULT 200,
  p_source text DEFAULT 'paystack',
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_activated boolean := false;
  v_current_credits integer := 0;
  v_new_credits integer := 0;
  v_bonus integer := GREATEST(0, COALESCE(p_bonus, 0));
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required');
  END IF;

  SELECT COALESCE(is_activated, false), COALESCE(credits, 0)
  INTO v_was_activated, v_current_credits
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_was_activated THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_activated', true,
      'bonus_credited', 0,
      'new_credits', v_current_credits,
      'source', p_source,
      'reference', p_reference
    );
  END IF;

  v_new_credits := v_current_credits + v_bonus;

  UPDATE public.profiles
  SET
    is_activated = true,
    activated_at = COALESCE(activated_at, now()),
    credits = v_new_credits
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_activated', false,
    'bonus_credited', v_bonus,
    'new_credits', v_new_credits,
    'source', p_source,
    'reference', p_reference
  );
END;
$$;

-- Admin manual override RPC for offline / VIP activation
CREATE OR REPLACE FUNCTION public.admin_mark_user_activated(
  p_target_user_id uuid,
  p_grant_bonus boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_email text := '';
  v_is_admin boolean := false;
  v_bonus_setting text;
  v_bonus integer := 200;
  v_res jsonb;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT COALESCE(email, '') INTO v_caller_email
  FROM public.profiles
  WHERE user_id = v_caller_id;

  SELECT (
    LOWER(v_caller_email) IN ('goodgiftdigital@gmail.com', 'accessa787@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller_id AND role = 'admin'
    )
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  IF p_grant_bonus THEN
    SELECT value INTO v_bonus_setting
    FROM public.app_settings
    WHERE key = 'activation_bonus_credits';

    IF v_bonus_setting IS NOT NULL AND v_bonus_setting ~ '^\d+$' THEN
      v_bonus := v_bonus_setting::integer;
    END IF;
  ELSE
    v_bonus := 0;
  END IF;

  SELECT public.activate_user_account(p_target_user_id, v_bonus, 'admin_override', NULL)
  INTO v_res;

  IF COALESCE((v_res->>'success')::boolean, false)
     AND NOT COALESCE((v_res->>'already_activated')::boolean, false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, nav_target)
    VALUES (
      p_target_user_id,
      '🎉 Account Activated! Starter Pack Unlocked',
      CASE
        WHEN v_bonus > 0 THEN
          'Your GGD Ad Network account has been activated! +' || v_bonus || ' GGG Starter Credits have been added to your wallet.'
        ELSE
          'Your GGD Ad Network account has been activated! All earning, posting, syndicate, and withdrawal features are now unlocked.'
      END,
      'activation',
      'tasks'
    );
  END IF;

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_user_account(uuid, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_user_activated(uuid, boolean) TO authenticated, service_role;
