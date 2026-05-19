
-- 1) Partial unique index: one active task per syndicate
CREATE UNIQUE INDEX IF NOT EXISTS uniq_syndicate_one_active_task
  ON public.syndicate_task_assignments (syndicate_user_id)
  WHERE status IN ('accepted','assigned','submitted');

-- 2) Capacity + lose-access trigger
CREATE OR REPLACE FUNCTION public.enforce_syndicate_task_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap integer;
  active_count integer;
BEGIN
  SELECT max_syndicates INTO cap FROM public.syndicate_tasks WHERE id = NEW.task_id;
  IF cap IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO active_count
  FROM public.syndicate_task_assignments
  WHERE task_id = NEW.task_id
    AND status IN ('accepted','assigned','submitted','approved');

  IF active_count >= cap THEN
    RAISE EXCEPTION 'Task capacity reached' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_syndicate_capacity ON public.syndicate_task_assignments;
CREATE TRIGGER trg_enforce_syndicate_capacity
  BEFORE INSERT ON public.syndicate_task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_syndicate_task_capacity();

-- 3) Notify on status change to expired / reassigned / approved / rejected
CREATE OR REPLACE FUNCTION public.notify_syndicate_assignment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_title text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT title INTO task_title FROM public.syndicate_tasks WHERE id = NEW.task_id;
    IF NEW.status = 'expired' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.syndicate_user_id, '⏰ Task Expired',
              COALESCE(task_title, 'Task') || ' was released back to the pool.', 'warning');
    ELSIF NEW.status = 'reassigned' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.syndicate_user_id, '🔄 Task Reassigned',
              COALESCE(task_title, 'Task') || ' was claimed by another syndicate.', 'warning');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (NEW.syndicate_user_id, '❌ Proof Rejected',
              'Your proof for "' || COALESCE(task_title,'task') || '" was rejected.', 'warning');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_syndicate_assignment ON public.syndicate_task_assignments;
CREATE TRIGGER trg_notify_syndicate_assignment
  AFTER UPDATE ON public.syndicate_task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_syndicate_assignment_change();

-- 4) Enable pg_cron + pg_net for auto-release scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
