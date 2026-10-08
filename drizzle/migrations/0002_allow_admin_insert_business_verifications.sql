DROP POLICY IF EXISTS "Users can submit their own business verifications" ON public.business_verifications;
CREATE POLICY "Users and admins can submit business verifications"
  ON public.business_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));