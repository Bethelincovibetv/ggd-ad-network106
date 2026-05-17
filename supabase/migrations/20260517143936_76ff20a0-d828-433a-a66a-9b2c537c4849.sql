
-- Add admin-configurable payout & feature toggles
INSERT INTO public.app_settings (key, value) VALUES
  ('syndicate_payout_percentage', '70'),
  ('landing_search_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Track login-bonus portion of credits (cannot be used for syndicate task creation)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_bonus_credits integer NOT NULL DEFAULT 0;

-- Syndicate security PINs (hashed client-side w/ sha-256 hex)
ALTER TABLE public.syndicate_profiles
  ADD COLUMN IF NOT EXISTS withdraw_pin_hash text,
  ADD COLUMN IF NOT EXISTS bank_pin_hash text;

-- Optional admin-set explicit per-syndicate payout (overrides percentage when set)
ALTER TABLE public.syndicate_tasks
  ADD COLUMN IF NOT EXISTS payout_amount numeric;
