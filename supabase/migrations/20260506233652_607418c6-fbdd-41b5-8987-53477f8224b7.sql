
-- 1. FIX PRIVILEGE ESCALATION: Drop the permissive INSERT policy on user_roles
DROP POLICY IF EXISTS "Insert own roles" ON public.user_roles;

-- Create admin-only INSERT policy
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. FIX STORAGE POLICIES

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;

-- Replace with per-bucket public SELECT (these buckets contain public content like ads, logos, slides)
CREATE POLICY "Public read ad-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'ad-images');

CREATE POLICY "Public read business-logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-logos');

CREATE POLICY "Public read slide-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'slide-images');

-- task-proofs: only owner and admin can view
CREATE POLICY "Owner or admin can view task-proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Fix INSERT policy: add ownership check
DROP POLICY IF EXISTS "Auth users upload to own buckets" ON storage.objects;
CREATE POLICY "Auth users upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = ANY (ARRAY['ad-images','business-logos','slide-images','task-proofs'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix DELETE policy: add ownership check
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = ANY (ARRAY['ad-images','business-logos','slide-images','task-proofs'])
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix syndicate-proofs INSERT: add ownership check
DROP POLICY IF EXISTS "Authenticated users can upload proofs" ON storage.objects;
CREATE POLICY "Users upload own syndicate proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'syndicate-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix task-flyers INSERT: add ownership check
DROP POLICY IF EXISTS "Authenticated users can upload task flyers" ON storage.objects;
CREATE POLICY "Users upload own task flyers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-flyers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. FIX AD EVENTS: Add constraint on event_type
ALTER TABLE public.ad_events ADD CONSTRAINT valid_event_type
  CHECK (event_type IN ('click', 'impression', 'view'));

-- 4. FIX SYNDICATE PROFILES: Add user INSERT policy
CREATE POLICY "Users can insert own syndicate profile"
  ON public.syndicate_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
