
-- Helper: slugify a business name into a URL-safe slug
CREATE OR REPLACE FUNCTION public.generate_business_slug(_name text, _user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  i int := 0;
  exists_count int;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RETURN NULL;
  END IF;
  base := lower(regexp_replace(trim(_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' THEN base := 'business'; END IF;
  candidate := base;
  LOOP
    SELECT count(*) INTO exists_count
    FROM public.profiles
    WHERE business_slug = candidate AND user_id <> _user_id;
    EXIT WHEN exists_count = 0;
    i := i + 1;
    candidate := base || '-' || i;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Unique index for slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_business_slug_unique
  ON public.profiles (business_slug)
  WHERE business_slug IS NOT NULL;

-- Trigger: keep slug in sync with business_name
CREATE OR REPLACE FUNCTION public.profiles_sync_business_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_name IS NOT NULL AND length(trim(NEW.business_name)) > 0 THEN
    IF NEW.business_slug IS NULL
       OR NEW.business_slug = ''
       OR (TG_OP = 'UPDATE' AND NEW.business_name IS DISTINCT FROM OLD.business_name AND (OLD.business_slug IS NULL OR OLD.business_slug LIKE '%-' || substr(NEW.user_id::text,1,6)))
    THEN
      NEW.business_slug := public.generate_business_slug(NEW.business_name, NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_business_slug_trg ON public.profiles;
CREATE TRIGGER profiles_sync_business_slug_trg
BEFORE INSERT OR UPDATE OF business_name, business_slug ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_sync_business_slug();

-- Backfill: regenerate clean slugs for any profile with a business name
UPDATE public.profiles p
SET business_slug = public.generate_business_slug(p.business_name, p.user_id)
WHERE p.business_name IS NOT NULL
  AND length(trim(p.business_name)) > 0;
