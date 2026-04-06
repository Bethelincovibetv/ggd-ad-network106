
-- Co-Owner Applications Table
CREATE TABLE public.co_owner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  earning_percentage numeric DEFAULT 5,
  total_earnings numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  UNIQUE(user_id)
);

ALTER TABLE public.co_owner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all co-owner applications"
  ON public.co_owner_applications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own co-owner application"
  ON public.co_owner_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create co-owner application"
  ON public.co_owner_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own co-owner application"
  ON public.co_owner_applications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add co_owner to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'co_owner';

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES ('co_owner_percentage', '5') ON CONFLICT DO NOTHING;

-- Insert feature toggle
INSERT INTO public.feature_toggles (feature_key, feature_name, description, is_enabled) 
VALUES ('co_owner_upgrade', 'Co-Owner Upgrade', 'Allow users to apply to become platform co-owners and earn revenue share', false)
ON CONFLICT DO NOTHING;
