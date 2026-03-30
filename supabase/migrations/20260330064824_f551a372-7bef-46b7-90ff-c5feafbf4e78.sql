
ALTER TABLE public.business_profiles 
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS telegram_url text,
  ADD COLUMN IF NOT EXISTS is_directory_listed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS directory_subscription_expires_at timestamptz;

CREATE POLICY "Anyone can view listed businesses"
  ON public.business_profiles
  FOR SELECT
  TO authenticated
  USING (is_directory_listed = true);
