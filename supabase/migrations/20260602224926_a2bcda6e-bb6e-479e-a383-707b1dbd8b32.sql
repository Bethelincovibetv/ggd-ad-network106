
ALTER TABLE public.syndicate_task_assignments
  ADD COLUMN IF NOT EXISTS proof_hash text,
  ADD COLUMN IF NOT EXISTS proof_link text;

-- Hash & link reuse blocked globally for accepted/submitted/approved rows
CREATE UNIQUE INDEX IF NOT EXISTS uniq_syndicate_proof_hash
  ON public.syndicate_task_assignments (proof_hash)
  WHERE proof_hash IS NOT NULL AND status IN ('submitted','approved');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_syndicate_proof_link
  ON public.syndicate_task_assignments (lower(proof_link))
  WHERE proof_link IS NOT NULL AND status IN ('submitted','approved');

ALTER TABLE public.syndicate_profiles
  ADD COLUMN IF NOT EXISTS bank_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_count integer NOT NULL DEFAULT 0;

INSERT INTO public.app_settings (key, value) VALUES
  ('syndicate_withdraw_cooldown_hours', '48')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.syndicate_track_outcome_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.syndicate_profiles
        SET approved_count = COALESCE(approved_count,0) + 1
        WHERE user_id = NEW.syndicate_user_id;
    ELSIF NEW.status IN ('rejected','expired') THEN
      UPDATE public.syndicate_profiles
        SET rejected_count = COALESCE(rejected_count,0) + 1
        WHERE user_id = NEW.syndicate_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_syndicate_outcome_counts ON public.syndicate_task_assignments;
CREATE TRIGGER trg_syndicate_outcome_counts
AFTER UPDATE ON public.syndicate_task_assignments
FOR EACH ROW EXECUTE FUNCTION public.syndicate_track_outcome_counts();
