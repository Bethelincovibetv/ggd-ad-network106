
-- Create user roles type and table FIRST
CREATE TYPE public.app_role AS ENUM ('admin', 'premium', 'business', 'syndicate', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (no recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text,
  display_name text,
  avatar_url text,
  credits integer DEFAULT 0 NOT NULL,
  last_credit_date text,
  referral_code text,
  referred_by text,
  is_banned boolean DEFAULT false,
  business_name text,
  business_description text,
  business_logo_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- App settings
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Ads
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  target_url text NOT NULL,
  is_active boolean DEFAULT true,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ads" ON public.ads FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone can view active ads" ON public.ads FOR SELECT TO authenticated USING (is_active = true);

-- Ad events
CREATE TABLE public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  viewer_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert events" ON public.ad_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can view events" ON public.ad_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- API keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key text DEFAULT ('ggd_' || replace(gen_random_uuid()::text, '-', '')) NOT NULL,
  name text DEFAULT 'Default' NOT NULL,
  domain text,
  is_active boolean DEFAULT true,
  requests_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own keys" ON public.api_keys FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all keys" ON public.api_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can insert any notification" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  reward_credits integer DEFAULT 5,
  task_type text DEFAULT 'share',
  share_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage tasks" ON public.tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Task completions
CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (task_id, user_id)
);

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own completions" ON public.task_completions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Credit transfers
CREATE TABLE public.credit_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transfers" ON public.credit_transfers FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can create transfers" ON public.credit_transfers FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Slides
CREATE TABLE public.slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text NOT NULL,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view slides" ON public.slides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage slides" ON public.slides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Syndicate applications
CREATE TABLE public.syndicate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  whatsapp_influence text,
  facebook_influence text,
  telegram_influence text,
  tiktok_influence text,
  other_platforms text,
  status text DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.syndicate_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own applications" ON public.syndicate_applications FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all applications" ON public.syndicate_applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Syndicate profiles
CREATE TABLE public.syndicate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  verified_platforms text[] DEFAULT '{}',
  ranking_score integer DEFAULT 0,
  tasks_completed integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.syndicate_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own syndicate profile" ON public.syndicate_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage syndicate profiles" ON public.syndicate_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Task wallets
CREATE TABLE public.task_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance numeric DEFAULT 0,
  total_earned numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.task_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own wallet" ON public.task_wallets FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage wallets" ON public.task_wallets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Syndicate tasks
CREATE TABLE public.syndicate_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  share_link text,
  flyer_url text,
  placements text[] DEFAULT '{}',
  locations text,
  max_syndicates integer DEFAULT 10,
  cost_per_syndicate numeric DEFAULT 50,
  total_cost numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.syndicate_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view syndicate tasks" ON public.syndicate_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Business can manage own tasks" ON public.syndicate_tasks FOR ALL TO authenticated USING (business_user_id = auth.uid());
CREATE POLICY "Admin can manage all syndicate tasks" ON public.syndicate_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Syndicate task assignments
CREATE TABLE public.syndicate_task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.syndicate_tasks(id) ON DELETE CASCADE NOT NULL,
  syndicate_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'accepted',
  proof_url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (task_id, syndicate_user_id)
);

ALTER TABLE public.syndicate_task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own assignments" ON public.syndicate_task_assignments FOR ALL TO authenticated USING (syndicate_user_id = auth.uid());
CREATE POLICY "Business can view task assignments" ON public.syndicate_task_assignments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.syndicate_tasks WHERE id = task_id AND business_user_id = auth.uid()));

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  bank_name text,
  account_number text,
  account_name text,
  status text DEFAULT 'pending',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own withdrawals" ON public.withdrawal_requests FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can manage withdrawals" ON public.withdrawal_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Marketing apps
CREATE TABLE public.marketing_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  app_link text NOT NULL,
  image_url text,
  is_free boolean DEFAULT true,
  credit_cost integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.marketing_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view apps" ON public.marketing_apps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage apps" ON public.marketing_apps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User app redemptions
CREATE TABLE public.user_app_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_id uuid REFERENCES public.marketing_apps(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, app_id)
);

ALTER TABLE public.user_app_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own redemptions" ON public.user_app_redemptions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Promotional materials
CREATE TABLE public.promotional_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  type text DEFAULT 'flyer',
  target_audience text DEFAULT 'users',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.promotional_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view promos" ON public.promotional_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage promos" ON public.promotional_materials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Feature toggles
CREATE TABLE public.feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read features" ON public.feature_toggles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage features" ON public.feature_toggles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-images', 'ad-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('slide-images', 'slide-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('task-proofs', 'task-proofs', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view files" ON storage.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can delete files" ON storage.objects FOR DELETE TO authenticated USING (true);

-- Default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('login_credits', '10'),
  ('ad_cost_credits', '5'),
  ('credit_exchange_rate', '100'),
  ('premium_upgrade_credits', '50'),
  ('vendor_upgrade_credits', '100'),
  ('task_cost_per_syndicate', '50'),
  ('payout_mode', 'manual'),
  ('whatsapp_group_link', ''),
  ('admin_whatsapp', ''),
  ('admin_bio', 'GGD Ad Network - Your Digital Marketing Partner');

-- Default feature toggles
INSERT INTO public.feature_toggles (feature_key, feature_name, description) VALUES
  ('ads', 'Ad Creation', 'Allow users to create and manage ads'),
  ('api_keys', 'API Keys', 'Allow users to generate API keys'),
  ('tasks', 'Earning Tasks', 'Show earning tasks to users'),
  ('syndicate', 'Syndicate System', 'Enable syndicate applications and management'),
  ('business_tasks', 'Business Tasks', 'Allow business users to create syndicate tasks'),
  ('credit_funding', 'Credit Funding', 'Allow users to purchase credits'),
  ('credit_transfer', 'Credit Transfer', 'Allow users to transfer credits'),
  ('marketing_apps', 'Marketing Apps', 'Show marketing apps marketplace'),
  ('blog_generator', 'Blog Generator', 'AI blog generation tool'),
  ('ebook_generator', 'Ebook Generator', 'AI ebook generation tool'),
  ('sales_funnel', 'Sales Funnel', 'Sales funnel generator'),
  ('ai_chat', 'AI Chat', 'AI chat assistant'),
  ('premium_upgrade', 'Premium Upgrade', 'Allow premium upgrades'),
  ('promotional_content', 'Promotional Content', 'Show promotional materials'),
  ('slides', 'Slide Carousel', 'Show slide carousel on dashboard');
