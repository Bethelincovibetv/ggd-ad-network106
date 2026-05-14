-- Drop business-set deadline from syndicate campaigns
ALTER TABLE public.syndicate_tasks DROP COLUMN IF EXISTS deadline_hours;

-- Track when a syndicate accepted a task
ALTER TABLE public.syndicate_task_assignments
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz NOT NULL DEFAULT now();

-- Global setting for per-syndicate completion window (hours)
INSERT INTO public.app_settings (key, value)
VALUES ('syndicate_assignment_hours', '24')
ON CONFLICT (key) DO NOTHING;

-- Auto-release expired (still pending) assignments so others can claim them
CREATE OR REPLACE FUNCTION public.release_expired_syndicate_assignments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hours numeric := 24;
  released integer := 0;
BEGIN
  SELECT COALESCE(NULLIF(value,'')::numeric, 24) INTO hours
  FROM public.app_settings WHERE key = 'syndicate_assignment_hours';

  WITH updated AS (
    UPDATE public.syndicate_task_assignments
    SET status = 'expired'
    WHERE status IN ('accepted','assigned')
      AND accepted_at + (hours || ' hours')::interval < now()
    RETURNING 1
  )
  SELECT count(*) INTO released FROM updated;

  RETURN released;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_expired_syndicate_assignments() TO authenticated;