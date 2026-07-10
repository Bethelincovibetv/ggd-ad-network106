
ALTER TABLE public.business_listings 
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS extra_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

UPDATE public.business_categories
SET slug = lower(regexp_replace(regexp_replace(trim(name),'[^a-zA-Z0-9]+','-','g'),'^-+|-+$','','g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS business_categories_slug_uidx ON public.business_categories(slug);

-- Make listings publicly readable (only active ones) via RLS if not already
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_listings' AND policyname='Public can view active listings') THEN
    CREATE POLICY "Public can view active listings"
      ON public.business_listings FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

GRANT SELECT ON public.business_listings TO anon;
GRANT SELECT ON public.business_categories TO anon;
