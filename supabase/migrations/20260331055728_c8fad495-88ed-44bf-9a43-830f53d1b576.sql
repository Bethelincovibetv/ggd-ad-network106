
-- Create promotional_videos table for admin to manage YouTube videos
CREATE TABLE public.promotional_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  youtube_url text NOT NULL,
  section text NOT NULL DEFAULT 'homepage',
  description text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.promotional_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active videos" ON public.promotional_videos FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage videos" ON public.promotional_videos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add is_active to promotional_materials if missing
ALTER TABLE public.promotional_materials ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create storage bucket for task flyers
INSERT INTO storage.buckets (id, name, public) VALUES ('task-flyers', 'task-flyers', true) ON CONFLICT (id) DO NOTHING;

-- RLS for task-flyers bucket
CREATE POLICY "Authenticated users can upload task flyers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-flyers');
CREATE POLICY "Anyone can view task flyers" ON storage.objects FOR SELECT USING (bucket_id = 'task-flyers');

-- Create storage bucket for syndicate proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('syndicate-proofs', 'syndicate-proofs', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Authenticated users can upload proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'syndicate-proofs');
CREATE POLICY "Anyone can view proofs" ON storage.objects FOR SELECT USING (bucket_id = 'syndicate-proofs');

-- Insert the 3 default videos
INSERT INTO public.promotional_videos (title, youtube_url, section, sort_order) VALUES
  ('Welcome to GGD Ad Network', 'https://youtu.be/Y2X1cfb-sLU?si=Lvp0cRvkJOdHuZ36', 'homepage', 1),
  ('How Syndicates Earn', 'https://youtu.be/A6JiMR4HqTQ?si=I7THKmvE3RgY81nE', 'syndicate', 2),
  ('About GGD Network', 'https://youtu.be/xClIkDPOI-Q?si=qJjZphpHxmf8XHnt', 'about', 3);
