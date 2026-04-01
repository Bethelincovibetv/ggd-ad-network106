
-- Add location/state to syndicate applications
ALTER TABLE public.syndicate_applications ADD COLUMN IF NOT EXISTS state text;

-- Add location to syndicate profiles
ALTER TABLE public.syndicate_profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.syndicate_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add deadline to syndicate tasks
ALTER TABLE public.syndicate_tasks ADD COLUMN IF NOT EXISTS deadline_hours integer DEFAULT 24;

-- Add target_state to syndicate tasks for location matching
ALTER TABLE public.syndicate_tasks ADD COLUMN IF NOT EXISTS target_state text;

-- Create platform pricing table
CREATE TABLE IF NOT EXISTS public.platform_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_key text UNIQUE NOT NULL,
  platform_name text NOT NULL,
  price_per_task numeric NOT NULL DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pricing" ON public.platform_pricing FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view pricing" ON public.platform_pricing FOR SELECT TO authenticated USING (true);

-- Insert default platform prices
INSERT INTO public.platform_pricing (platform_key, platform_name, price_per_task) VALUES
  ('whatsapp_status', 'WhatsApp Status', 50),
  ('whatsapp_broadcast', 'WhatsApp Broadcast', 100),
  ('whatsapp_group', 'WhatsApp Group', 50),
  ('facebook_group', 'Facebook Group', 75),
  ('telegram_group', 'Telegram Group', 50),
  ('telegram_channel', 'Telegram Channel', 75),
  ('tiktok_group', 'TikTok Group', 50),
  ('tiktok_video', 'TikTok Video', 150),
  ('ggd_banner', 'GGD Banner', 100)
ON CONFLICT (platform_key) DO NOTHING;

-- Add admin can view all syndicate task assignments
CREATE POLICY "Admin can manage all assignments" ON public.syndicate_task_assignments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
