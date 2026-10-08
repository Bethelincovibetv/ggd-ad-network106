-- Real business verification storage and profile status synchronization.
-- This migration intentionally does not write to restricted storage system tables.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS verification_document_type text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS verification_document_type text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.business_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_profile_id uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  user_email text,
  account_type text NOT NULL,
  document_type text NOT NULL,
  document_number text NOT NULL DEFAULT '',
  submitted_name text NOT NULL,
  registered_profile_name text NOT NULL,
  document_file_url text,
  status text NOT NULL DEFAULT 'PENDING',
  verified_badge_granted boolean NOT NULL DEFAULT false,
  match_confidence text NOT NULL DEFAULT 'LOW',
  rejection_reason text,
  extraction_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_action text NOT NULL DEFAULT 'NONE',
  admin_note text,
  admin_id uuid,
  admin_email text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_verifications_account_type_check CHECK (account_type IN ('individual', 'registered_business')),
  CONSTRAINT business_verifications_document_type_check CHECK (document_type IN ('NIN', 'CAC', 'UNKNOWN')),
  CONSTRAINT business_verifications_status_check CHECK (status IN ('VERIFIED', 'REJECTED', 'FLAGGED_FOR_MANUAL_REVIEW', 'PENDING')),
  CONSTRAINT business_verifications_confidence_check CHECK (match_confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  CONSTRAINT business_verifications_admin_action_check CHECK (admin_action IN ('APPROVE', 'REJECT', 'NONE'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_verifications TO authenticated;
GRANT ALL ON public.business_verifications TO service_role;

ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own business verifications" ON public.business_verifications;
CREATE POLICY "Users can view their own business verifications"
  ON public.business_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can submit their own business verifications" ON public.business_verifications;
CREATE POLICY "Users can submit their own business verifications"
  ON public.business_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and admins can update business verifications" ON public.business_verifications;
CREATE POLICY "Users and admins can update business verifications"
  ON public.business_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete business verifications" ON public.business_verifications;
CREATE POLICY "Admins can delete business verifications"
  ON public.business_verifications
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_business_verifications_user_submitted
  ON public.business_verifications(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_verifications_status_submitted
  ON public.business_verifications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_verifications_business_profile
  ON public.business_verifications(business_profile_id);

CREATE OR REPLACE FUNCTION public.sync_business_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_verified boolean := (NEW.status = 'VERIFIED' AND NEW.verified_badge_granted = true);
  v_verified_at timestamptz := CASE WHEN v_is_verified THEN COALESCE(NEW.reviewed_at, NEW.evaluated_at, now()) ELSE NULL END;
BEGIN
  UPDATE public.profiles
  SET is_verified = v_is_verified,
      verification_status = NEW.status,
      verification_document_type = NEW.document_type,
      verified_at = v_verified_at
  WHERE user_id = NEW.user_id;

  IF NEW.business_profile_id IS NOT NULL THEN
    UPDATE public.business_profiles
    SET is_verified = v_is_verified,
        verification_status = NEW.status,
        verification_document_type = NEW.document_type,
        verified_at = v_verified_at,
        is_directory_listed = CASE WHEN v_is_verified THEN true ELSE is_directory_listed END
    WHERE id = NEW.business_profile_id;
  ELSE
    UPDATE public.business_profiles
    SET is_verified = v_is_verified,
        verification_status = NEW.status,
        verification_document_type = NEW.document_type,
        verified_at = v_verified_at,
        is_directory_listed = CASE WHEN v_is_verified THEN true ELSE is_directory_listed END
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_verifications_sync_status ON public.business_verifications;
CREATE TRIGGER business_verifications_sync_status
  AFTER INSERT OR UPDATE OF status, verified_badge_granted, document_type, reviewed_at, business_profile_id
  ON public.business_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_business_verification_status();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_verifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_verifications;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END;
$$;