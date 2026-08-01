CREATE TABLE public.emoji_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.emoji_reactions TO authenticated;
GRANT SELECT ON public.emoji_reactions TO anon;
GRANT ALL ON public.emoji_reactions TO service_role;

ALTER TABLE public.emoji_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view emoji reactions"
  ON public.emoji_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own emoji reactions"
  ON public.emoji_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own emoji reactions"
  ON public.emoji_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_emoji_reactions_target ON public.emoji_reactions (target_type, target_id);