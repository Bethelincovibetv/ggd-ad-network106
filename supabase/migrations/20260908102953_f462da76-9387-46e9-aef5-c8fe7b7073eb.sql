-- 1. Campaign date on the canonical syndicate campaign record
ALTER TABLE public.syndicate_tasks
  ADD COLUMN IF NOT EXISTS campaign_date date NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_syndicate_tasks_campaign_date ON public.syndicate_tasks (campaign_date);
CREATE INDEX IF NOT EXISTS idx_syndicate_tasks_status ON public.syndicate_tasks (status);

-- 2. Remove old deadline / auto-expiry engine
DROP FUNCTION IF EXISTS public.release_expired_syndicate_assignments();
DELETE FROM public.app_settings WHERE key IN ('syndicate_assignment_hours', 'syndicate_assignment_deadline_hours');

-- 3. Real Syndicate Management settings (defaults only if missing)
INSERT INTO public.app_settings (key, value)
SELECT * FROM (VALUES
  ('syndicate_customer_approval', 'false'),
  ('syndicate_registration_open', 'true'),
  ('syndicate_verification_required', 'true'),
  ('syndicate_proof_required', 'true'),
  ('syndicate_bank_change_approval', 'true'),
  ('syndicate_notifications_enabled', 'true'),
  ('syndicate_settlement_mode', 'admin')
) AS v(key, value)
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings s WHERE s.key = v.key);

-- 4. Admin notifications for syndicate applications (existing notifications system)
CREATE OR REPLACE FUNCTION public.notify_admins_new_syndicate_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_row record;
  applicant text;
BEGIN
  IF COALESCE((SELECT value FROM public.app_settings WHERE key = 'syndicate_notifications_enabled'), 'true') <> 'true' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, email, 'A user') INTO applicant
  FROM public.profiles WHERE user_id = NEW.user_id;

  FOR admin_row IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link_url)
    VALUES (
      admin_row.user_id,
      'New Syndicate Application',
      COALESCE(applicant, 'A user') || ' applied to join the Syndicate. Review and approve the application.',
      'syndicate_approval',
      '/admin?section=syndicate&tab=applications'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_syndicate_application ON public.syndicate_applications;
CREATE TRIGGER trg_notify_admins_new_syndicate_application
AFTER INSERT ON public.syndicate_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_syndicate_application();

-- 5. Admin notifications for bank detail changes
CREATE OR REPLACE FUNCTION public.notify_admins_syndicate_bank_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_row record;
  member_name text;
BEGIN
  IF NEW.account_number IS DISTINCT FROM OLD.account_number
     OR NEW.bank_name IS DISTINCT FROM OLD.bank_name THEN

    IF COALESCE((SELECT value FROM public.app_settings WHERE key = 'syndicate_notifications_enabled'), 'true') <> 'true' THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(display_name, email, 'A member') INTO member_name
    FROM public.profiles WHERE user_id = NEW.user_id;

    FOR admin_row IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link_url)
      VALUES (
        admin_row.user_id,
        'Syndicate Bank Change Request',
        COALESCE(member_name, 'A member') || ' updated their payout bank details. Review in Verification.',
        'syndicate_approval',
        '/admin?section=syndicate&tab=verification'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_syndicate_bank_change ON public.syndicate_profiles;
CREATE TRIGGER trg_notify_admins_syndicate_bank_change
AFTER UPDATE ON public.syndicate_profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_syndicate_bank_change();