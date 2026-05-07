ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS max_completions integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS completions_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flyer_url text;

-- Allow task creators to update their own tasks (for completions_count tracking)
CREATE POLICY "Creators can update own tasks"
ON public.tasks
FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Allow any authenticated user to update completions_count
CREATE POLICY "Users can increment completions"
ON public.tasks
FOR UPDATE
USING (true)
WITH CHECK (true);