DROP POLICY IF EXISTS "Users can increment completions" ON public.tasks;
DROP POLICY IF EXISTS "Creators can update own tasks" ON public.tasks;

-- Allow authenticated users to update completions_count on active tasks
CREATE POLICY "Authenticated can update task completions"
ON public.tasks
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);