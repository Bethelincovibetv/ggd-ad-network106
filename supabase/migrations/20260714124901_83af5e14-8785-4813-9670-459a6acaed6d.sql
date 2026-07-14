
INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description)
VALUES ('business_pays_syndicate', 'Business Pays Syndicate', false, 'When ON, businesses pay syndicates directly; when OFF, admin handles payouts')
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE public.syndicate_task_assignments
  ADD COLUMN IF NOT EXISTS payout_amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_by uuid,
  ADD COLUMN IF NOT EXISTS payment_note text;

DROP POLICY IF EXISTS "Business owners can view assignments for own tasks" ON public.syndicate_task_assignments;
CREATE POLICY "Business owners can view assignments for own tasks"
ON public.syndicate_task_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_tasks t
    WHERE t.id = syndicate_task_assignments.task_id
      AND t.business_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Business owners can mark payout for own tasks" ON public.syndicate_task_assignments;
CREATE POLICY "Business owners can mark payout for own tasks"
ON public.syndicate_task_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.syndicate_tasks t
    WHERE t.id = syndicate_task_assignments.task_id
      AND t.business_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.syndicate_tasks t
    WHERE t.id = syndicate_task_assignments.task_id
      AND t.business_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Business can view syndicate bank for own task assignees" ON public.syndicate_profiles;
CREATE POLICY "Business can view syndicate bank for own task assignees"
ON public.syndicate_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.syndicate_task_assignments a
    JOIN public.syndicate_tasks t ON t.id = a.task_id
    WHERE a.syndicate_user_id = syndicate_profiles.user_id
      AND t.business_user_id = auth.uid()
      AND a.status = 'approved'
  )
);
