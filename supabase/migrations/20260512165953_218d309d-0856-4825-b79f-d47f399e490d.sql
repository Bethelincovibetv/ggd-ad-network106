
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  image_url text,
  link_url text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view posts" ON public.community_posts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can create own posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all posts" ON public.community_posts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_posts_user_id ON public.community_posts(user_id);

CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('like','love','haha','wow','sad','angry')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users manage own reactions" ON public.post_reactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.post_comments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manage comments" ON public.post_comments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id, created_at);

CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('community-posts', 'community-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read community post images"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'community-posts');
CREATE POLICY "Auth users can upload community post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own community post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
