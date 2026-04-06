
-- Allow business users to update assignments on their own tasks
CREATE POLICY "Business can update task assignments"
ON public.syndicate_task_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM syndicate_tasks
    WHERE syndicate_tasks.id = syndicate_task_assignments.task_id
    AND syndicate_tasks.business_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM syndicate_tasks
    WHERE syndicate_tasks.id = syndicate_task_assignments.task_id
    AND syndicate_tasks.business_user_id = auth.uid()
  )
);
