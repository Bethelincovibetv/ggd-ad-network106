-- Prevent non-admin users from self-approving verification records or profile badges.
CREATE OR REPLACE FUNCTION public.protect_business_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.verified_badge_granted := OLD.verified_badge_granted;
  NEW.match_confidence := OLD.match_confidence;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.admin_action := OLD.admin_action;
  NEW.admin_note := OLD.admin_note;
  NEW.admin_id := OLD.admin_id;
  NEW.admin_email := OLD.admin_email;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.evaluated_at := OLD.evaluated_at;
  NEW.last_updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_verifications_protect_fields ON public.business_verifications;
CREATE TRIGGER business_verifications_protect_fields
  BEFORE UPDATE ON public.business_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_business_verification_fields();

CREATE OR REPLACE FUNCTION public.protect_profile_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.is_verified := OLD.is_verified;
  NEW.verification_status := OLD.verification_status;
  NEW.verification_document_type := OLD.verification_document_type;
  NEW.verified_at := OLD.verified_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_verification_fields ON public.profiles;
CREATE TRIGGER profiles_protect_verification_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_verification_fields();

DROP TRIGGER IF EXISTS business_profiles_protect_verification_fields ON public.business_profiles;
CREATE TRIGGER business_profiles_protect_verification_fields
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_verification_fields();