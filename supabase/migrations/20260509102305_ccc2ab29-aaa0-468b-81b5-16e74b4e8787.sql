-- Update handle_new_user to auto-assign business role + create task wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bonus_amount numeric := 0;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Every user is a business by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'business')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create task wallet with optional signup bonus
  SELECT COALESCE(NULLIF(value, '')::numeric, 0) INTO bonus_amount
  FROM public.app_settings WHERE key = 'vendor_wallet_bonus';

  INSERT INTO public.task_wallets (user_id, balance, total_funded)
  VALUES (NEW.id, COALESCE(bonus_amount, 0), COALESCE(bonus_amount, 0))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Backfill: grant business role to all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'business'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id AND ur.role = 'business'
);

-- Backfill: ensure every user has a task wallet
INSERT INTO public.task_wallets (user_id, balance, total_funded)
SELECT p.user_id, 0, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.task_wallets tw WHERE tw.user_id = p.user_id
);