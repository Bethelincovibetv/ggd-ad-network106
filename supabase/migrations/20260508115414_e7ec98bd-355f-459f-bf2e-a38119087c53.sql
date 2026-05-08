
DROP POLICY IF EXISTS "Only admins can create tasks" ON public.tasks;
CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
