ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_category text,
  ADD COLUMN IF NOT EXISTS business_location text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS business_website text,
  ADD COLUMN IF NOT EXISTS business_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_business_slug_key ON public.profiles(business_slug) WHERE business_slug IS NOT NULL;

-- Allow public read of minimal business fields for the public profile page
DROP POLICY IF EXISTS "Public can view business profile fields" ON public.profiles;
CREATE POLICY "Public can view business profile fields"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);