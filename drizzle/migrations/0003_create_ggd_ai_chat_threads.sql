CREATE TABLE public.ai_copilot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_copilot_sessions TO authenticated;
GRANT ALL ON public.ai_copilot_sessions TO service_role;
ALTER TABLE public.ai_copilot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own GGD AI conversations"
  ON public.ai_copilot_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_copilot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_copilot_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_copilot_messages TO authenticated;
GRANT ALL ON public.ai_copilot_messages TO service_role;
ALTER TABLE public.ai_copilot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own GGD AI messages"
  ON public.ai_copilot_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users add messages to their own GGD AI conversations"
  ON public.ai_copilot_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.ai_copilot_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
CREATE INDEX ai_copilot_sessions_user_updated_idx
  ON public.ai_copilot_sessions (user_id, updated_at DESC);
CREATE INDEX ai_copilot_messages_session_created_idx
  ON public.ai_copilot_messages (session_id, created_at ASC);