-- Allow admin to manage all ads
CREATE POLICY "Admin can manage all ads"
ON public.ads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
