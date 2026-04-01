ALTER TABLE public.syndicate_applications ADD COLUMN IF NOT EXISTS twitter_influence text;
ALTER TABLE public.syndicate_applications ADD COLUMN IF NOT EXISTS admin_notes text;