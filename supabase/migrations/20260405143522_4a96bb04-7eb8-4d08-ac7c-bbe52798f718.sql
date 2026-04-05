
-- Create admin chat messages table
CREATE TABLE public.admin_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all chat messages"
ON public.admin_chat_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can see messages where they are sender or receiver
CREATE POLICY "Users can view their own chat messages"
ON public.admin_chat_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages (to admin)
CREATE POLICY "Users can send chat messages"
ON public.admin_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can mark their received messages as read
CREATE POLICY "Users can update read status"
ON public.admin_chat_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_messages;

-- Also enable realtime on notifications for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
