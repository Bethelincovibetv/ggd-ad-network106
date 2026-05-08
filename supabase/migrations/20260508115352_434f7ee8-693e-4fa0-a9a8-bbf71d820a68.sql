
-- 1. co_owner_applications: prevent users from updating admin-controlled fields
DROP POLICY IF EXISTS "Users can update own co-owner application" ON public.co_owner_applications;

CREATE OR REPLACE FUNCTION public.prevent_co_owner_admin_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    OR NEW.earning_percentage IS DISTINCT FROM OLD.earning_percentage
    OR NEW.total_earnings IS DISTINCT FROM OLD.total_earnings
    OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
  THEN
    RAISE EXCEPTION 'Not allowed to modify admin-controlled fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_co_owner_admin_field_changes_trg ON public.co_owner_applications;
CREATE TRIGGER prevent_co_owner_admin_field_changes_trg
  BEFORE UPDATE ON public.co_owner_applications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_co_owner_admin_field_changes();

CREATE POLICY "Users can update own co-owner application"
  ON public.co_owner_applications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. tasks: restrict INSERT to admins only
DROP POLICY IF EXISTS "Any user can create tasks" ON public.tasks;
CREATE POLICY "Only admins can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. syndicate_profiles: fix update policy role to authenticated
DROP POLICY IF EXISTS "Users can update own syndicate profile" ON public.syndicate_profiles;
CREATE POLICY "Users can update own syndicate profile"
  ON public.syndicate_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. short_links: only active links readable publicly
DROP POLICY IF EXISTS "Anyone can read active short links" ON public.short_links;
CREATE POLICY "Anyone can read active short links"
  ON public.short_links FOR SELECT
  TO public
  USING (is_active = true);

-- 5. storage UPDATE policies for owner-scoped buckets
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['ad-images','business-logos','slide-images','syndicate-proofs','task-flyers']
  LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Owner can update files in %1$s" ON storage.objects;
      CREATE POLICY "Owner can update files in %1$s"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1])
        WITH CHECK (bucket_id = %2$L AND auth.uid()::text = (storage.foldername(name))[1]);
    $f$, b, b);
  END LOOP;
END$$;
