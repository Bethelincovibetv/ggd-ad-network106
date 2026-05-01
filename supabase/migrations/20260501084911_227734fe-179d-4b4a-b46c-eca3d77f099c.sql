
-- Avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Short links
CREATE TABLE public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  title TEXT,
  link_type TEXT NOT NULL DEFAULT 'website', -- 'whatsapp' | 'website' | 'other'
  clicks INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_short_links_slug ON public.short_links(slug);
CREATE INDEX idx_short_links_user ON public.short_links(user_id);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active short links"
ON public.short_links FOR SELECT
USING (true);

CREATE POLICY "Users manage own short links"
ON public.short_links FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all short links"
ON public.short_links FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Click tracking
CREATE TABLE public.link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_link_id UUID NOT NULL REFERENCES public.short_links(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_link_clicks_link ON public.link_clicks(short_link_id);
CREATE INDEX idx_link_clicks_created ON public.link_clicks(created_at DESC);

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert a click record (for tracking from public redirect)
CREATE POLICY "Anyone can log a click"
ON public.link_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anon can log a click"
ON public.link_clicks FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Owners can view own click logs"
ON public.link_clicks FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.short_links sl
  WHERE sl.id = link_clicks.short_link_id AND sl.user_id = auth.uid()
));

CREATE POLICY "Admin can view all click logs"
ON public.link_clicks FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
