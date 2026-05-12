ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_setup_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS industry text;