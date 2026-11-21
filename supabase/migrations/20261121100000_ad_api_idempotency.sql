-- Idempotency support for adverts submitted by trusted integrations.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS external_reference TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ads_user_external_reference_uidx
  ON public.ads(user_id, external_reference)
  WHERE external_reference IS NOT NULL;
