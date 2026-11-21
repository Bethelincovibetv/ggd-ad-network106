-- Idempotency support for adverts submitted by trusted integrations.
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 1 CHECK (duration_days BETWEEN 1 AND 365);

CREATE UNIQUE INDEX IF NOT EXISTS ads_user_external_reference_uidx
  ON public.ads(user_id, external_reference)
  WHERE external_reference IS NOT NULL;
