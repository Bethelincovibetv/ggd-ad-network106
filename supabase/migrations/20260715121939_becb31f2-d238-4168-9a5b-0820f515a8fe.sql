
CREATE TABLE IF NOT EXISTS public.p2p_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  task_id UUID,
  assignment_id UUID,
  kind TEXT NOT NULL DEFAULT 'text',
  message TEXT,
  image_url TEXT,
  action_type TEXT,
  action_payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2p_messages TO authenticated;
GRANT ALL ON public.p2p_messages TO service_role;

ALTER TABLE public.p2p_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2p_select_own" ON public.p2p_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "p2p_insert_own" ON public.p2p_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "p2p_update_own" ON public.p2p_messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS idx_p2p_pair ON public.p2p_messages (
  LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_p2p_task ON public.p2p_messages (task_id);
CREATE INDEX IF NOT EXISTS idx_p2p_receiver_unread ON public.p2p_messages (receiver_id) WHERE is_read = false;

ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_messages;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

INSERT INTO public.feature_toggles (feature_key, feature_name, is_enabled, description) VALUES
  ('p2p_chat', 'Peer-to-Peer Chat', true, 'Direct messaging inbox between members'),
  ('global_network_chat', 'Global Network Chat', true, 'Global member search & direct chat')
ON CONFLICT (feature_key) DO NOTHING;
