
-- ===== Activity types (admin-managed) =====
CREATE TABLE public.email_activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'core',
  is_enabled boolean NOT NULL DEFAULT true,
  default_opt_in boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_activity_types TO anon, authenticated;
GRANT ALL ON public.email_activity_types TO service_role;
ALTER TABLE public.email_activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read activity types" ON public.email_activity_types FOR SELECT USING (true);
CREATE POLICY "admins manage activity types" ON public.email_activity_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== User per-activity preferences =====
CREATE TABLE public.user_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_key text NOT NULL,
  opted_in boolean NOT NULL DEFAULT true,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_email_preferences TO authenticated;
GRANT ALL ON public.user_email_preferences TO service_role;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own prefs" ON public.user_email_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view all prefs" ON public.user_email_preferences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== Email campaigns =====
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  preview_text text,
  target_mode text NOT NULL DEFAULT 'opted_in', -- opted_in | filter | upload
  filter_states text[],
  filter_industries text[],
  uploaded_emails text[],
  recipient_count integer NOT NULL DEFAULT 0,
  credit_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed | cancelled
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage all campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Campaign recipients =====
CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | opened | clicked | bounced
  error_message text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own campaign recipients" ON public.email_campaign_recipients FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.email_campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "admins manage all recipients" ON public.email_campaign_recipients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);

-- ===== Email send log (all emails sent through the system) =====
CREATE TABLE public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  source text NOT NULL, -- admin | activity | campaign
  source_ref uuid,
  template_name text,
  sender_user_id uuid,
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  subject text,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | bounced | suppressed
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view all logs" ON public.email_send_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users view own sent logs" ON public.email_send_log FOR SELECT TO authenticated
  USING (sender_user_id = auth.uid());
CREATE INDEX idx_email_send_log_created ON public.email_send_log(created_at DESC);
CREATE INDEX idx_email_send_log_status ON public.email_send_log(status);

-- ===== Email capture / lead-grabbing pages =====
CREATE TABLE public.email_capture_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  headline text NOT NULL,
  subheadline text,
  cta_text text NOT NULL DEFAULT 'Get Free Access',
  hero_image_url text,
  theme text NOT NULL DEFAULT 'orange',
  custom_html text,
  is_active boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  lead_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_capture_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.email_capture_pages TO authenticated;
GRANT ALL ON public.email_capture_pages TO service_role;
ALTER TABLE public.email_capture_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read active pages" ON public.email_capture_pages FOR SELECT USING (is_active = true OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users manage own pages" ON public.email_capture_pages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage all pages" ON public.email_capture_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== Leads collected =====
CREATE TABLE public.email_capture_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.email_capture_pages(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_capture_leads TO authenticated;
GRANT INSERT ON public.email_capture_leads TO anon, authenticated;
GRANT ALL ON public.email_capture_leads TO service_role;
ALTER TABLE public.email_capture_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit lead" ON public.email_capture_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "owners view own leads" ON public.email_capture_leads FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_leads_page ON public.email_capture_leads(page_id);

-- ===== updated_at triggers =====
CREATE TRIGGER trg_eat_updated BEFORE UPDATE ON public.email_activity_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_uep_updated BEFORE UPDATE ON public.user_email_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ec_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ecp_updated BEFORE UPDATE ON public.email_capture_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Seed activity types (Core + engagement + everything) =====
INSERT INTO public.email_activity_types (activity_key, label, description, category, is_enabled, default_opt_in) VALUES
  ('task_assigned', 'New Task Assigned', 'A syndicate task was assigned to you', 'core', true, true),
  ('task_approved', 'Task Approved', 'Your task proof was approved', 'core', true, true),
  ('task_rejected', 'Task Rejected', 'Your task proof was rejected', 'core', true, true),
  ('withdrawal_status', 'Withdrawal Status', 'Withdrawal approved, rejected, or paid', 'core', true, true),
  ('syndicate_application', 'Syndicate Application', 'Status update on your syndicate application', 'core', true, true),
  ('new_referral', 'New Referral Signup', 'Someone signed up using your referral code', 'core', true, true),
  ('new_follower', 'New Follower', 'Someone followed your business', 'engagement', true, true),
  ('new_review', 'New Review', 'Your business received a new review', 'engagement', true, true),
  ('low_credits', 'Low Credit Warning', 'Your credit balance is running low', 'engagement', true, true),
  ('premium_expiring', 'Premium Expiring', 'Your premium plan is about to expire', 'engagement', true, true),
  ('weekly_summary', 'Weekly Summary', 'Weekly performance digest', 'engagement', true, false),
  ('new_comment', 'New Comment', 'Someone commented on your content', 'all', true, false),
  ('new_reaction', 'New Reaction', 'Someone reacted to your post', 'all', true, false),
  ('login_alert', 'Login Alert', 'New device or location signed in', 'all', true, true),
  ('admin_announcement', 'Admin Announcement', 'Important platform announcements', 'all', true, true),
  ('marketing_promo', 'Promotional Offers', 'Promotions and special offers from the platform', 'all', true, false)
ON CONFLICT (activity_key) DO NOTHING;

-- ===== Feature toggles =====
INSERT INTO public.feature_toggles (feature_key, feature_name, description, is_enabled) VALUES
  ('email_campaigns', 'Email Campaigns', 'Allow users to create paid email campaigns', true),
  ('email_custom_upload_list', 'Email Custom Upload List', 'Allow users to upload their own recipient lists for campaigns', true),
  ('email_capture_pages', 'Email Capture Pages', 'Allow users to build lead-capture landing pages', true),
  ('activity_emails', 'Activity Email Notifications', 'Send email notifications for user activities', true)
ON CONFLICT (feature_key) DO NOTHING;

-- ===== App settings =====
INSERT INTO public.app_settings (key, value) VALUES
  ('email_campaign_credit_per_recipient', '1'),
  ('email_sender_name', 'GGD Ad Network'),
  ('email_sender_address', '')
ON CONFLICT (key) DO NOTHING;
