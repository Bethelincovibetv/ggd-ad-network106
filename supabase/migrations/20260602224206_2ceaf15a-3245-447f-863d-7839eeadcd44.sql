
-- Suspension + wallet freeze on syndicate_profiles
ALTER TABLE public.syndicate_profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS wallet_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_streak integer NOT NULL DEFAULT 0;

-- Rejection reason + force-reassign tracking on assignments
ALTER TABLE public.syndicate_task_assignments
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reassigned_by_admin boolean NOT NULL DEFAULT false;

-- Seed default app_settings rows so reads work (idempotent)
INSERT INTO public.app_settings (key, value) VALUES
  ('syndicate_paused', 'false'),
  ('syndicate_auto_suspend_threshold', '5')
ON CONFLICT (key) DO NOTHING;

-- Auto-suspend trigger: when an assignment becomes 'rejected' or 'expired',
-- bump failed_streak; reset on 'approved'. Suspend at threshold.
CREATE OR REPLACE FUNCTION public.syndicate_track_failure_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  threshold integer := 5;
  new_streak integer := 0;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT COALESCE(NULLIF(value,'')::int, 5) INTO threshold
      FROM public.app_settings WHERE key = 'syndicate_auto_suspend_threshold';

    IF NEW.status = 'approved' THEN
      UPDATE public.syndicate_profiles
        SET failed_streak = 0
        WHERE user_id = NEW.syndicate_user_id;
    ELSIF NEW.status IN ('rejected','expired') THEN
      UPDATE public.syndicate_profiles
        SET failed_streak = COALESCE(failed_streak,0) + 1
        WHERE user_id = NEW.syndicate_user_id
        RETURNING failed_streak INTO new_streak;

      IF new_streak >= threshold THEN
        UPDATE public.syndicate_profiles
          SET is_suspended = true,
              suspended_reason = COALESCE(suspended_reason, 'Auto-suspended: ' || new_streak || ' consecutive failures')
          WHERE user_id = NEW.syndicate_user_id AND is_suspended = false;

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (NEW.syndicate_user_id, '🚫 Account Suspended',
                'Your syndicate account was auto-suspended after ' || new_streak || ' failed/expired tasks. Contact support.',
                'warning');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_syndicate_failure_streak ON public.syndicate_task_assignments;
CREATE TRIGGER trg_syndicate_failure_streak
AFTER UPDATE ON public.syndicate_task_assignments
FOR EACH ROW EXECUTE FUNCTION public.syndicate_track_failure_streak();
