
-- Fix storage policies - drop overly permissive ones and add scoped ones
DROP POLICY IF EXISTS "Auth users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files" ON storage.objects;

CREATE POLICY "Auth users upload to own buckets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('ad-images', 'business-logos', 'slide-images', 'task-proofs'));
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('ad-images', 'business-logos', 'slide-images', 'task-proofs'));
