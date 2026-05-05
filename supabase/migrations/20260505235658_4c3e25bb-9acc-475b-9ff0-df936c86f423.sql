
CREATE POLICY "Any user can create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (true);
