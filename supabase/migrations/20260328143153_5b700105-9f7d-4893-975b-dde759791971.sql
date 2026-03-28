
-- Add bank details to syndicate_profiles
ALTER TABLE public.syndicate_profiles ADD COLUMN bank_name text;
ALTER TABLE public.syndicate_profiles ADD COLUMN account_number text;
ALTER TABLE public.syndicate_profiles ADD COLUMN account_name text;

-- Business profiles table
CREATE TABLE public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text NOT NULL,
  description text,
  whatsapp_link text,
  website_link text,
  logo_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own business profile" ON public.business_profiles FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all business profiles" ON public.business_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
