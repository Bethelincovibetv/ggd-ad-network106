
-- Allow syndicates to update their own profile
CREATE POLICY "Users can update own syndicate profile"
ON public.syndicate_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
