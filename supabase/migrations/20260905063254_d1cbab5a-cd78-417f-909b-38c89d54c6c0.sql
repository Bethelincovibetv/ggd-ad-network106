-- WhatsApp Promoter Hub marketplace schema and server-side workflows
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'promoter';

CREATE TABLE public.promoter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  promoter_name text,
  whatsapp_channels text[] NOT NULL DEFAULT '{}',
  audience_category text,
  estimated_audience integer NOT NULL DEFAULT 0,
  target_state text,
  experience text,
  bank_name text,
  account_number text,
  account_name text,
  bank_code text,
  withdraw_pin_hash text,
  is_verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  wallet_frozen boolean NOT NULL DEFAULT false,
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.promoter_profiles TO authenticated;
GRANT ALL ON public.promoter_profiles TO service_role;
ALTER TABLE public.promoter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promoters manage their own profile" ON public.promoter_profiles FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.promoter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promoter_name text NOT NULL,
  whatsapp_channels text[] NOT NULL DEFAULT '{}',
  audience_category text,
  estimated_audience integer NOT NULL DEFAULT 0,
  target_state text,
  experience text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.promoter_applications TO authenticated;
GRANT ALL ON public.promoter_applications TO service_role;
ALTER TABLE public.promoter_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their promoter applications" ON public.promoter_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users submit promoter applications" ON public.promoter_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins review promoter applications" ON public.promoter_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  title text NOT NULL,
  creative_url text,
  video_url text,
  caption text NOT NULL,
  destination_url text NOT NULL,
  budget_credits integer NOT NULL,
  reward_credits integer NOT NULL,
  platform_fee_credits integer NOT NULL DEFAULT 0,
  remaining_budget_credits integer NOT NULL,
  duration_days integer NOT NULL DEFAULT 7,
  promoters_required integer NOT NULL DEFAULT 1,
  requirements text,
  promotion_method text NOT NULL DEFAULT 'WhatsApp status or community',
  target_state text,
  requires_approval boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  approved_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_campaigns TO authenticated;
GRANT ALL ON public.whatsapp_campaigns TO service_role;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view active WhatsApp campaigns and owners view theirs" ON public.whatsapp_campaigns FOR SELECT TO authenticated USING (status = 'active' OR business_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Businesses create their campaigns" ON public.whatsapp_campaigns FOR INSERT TO authenticated WITH CHECK (business_user_id = auth.uid());
CREATE POLICY "Owners and admins manage campaigns" ON public.whatsapp_campaigns FOR UPDATE TO authenticated USING (business_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (business_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_campaign_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  promoter_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  proof_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, promoter_user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_campaign_applications TO authenticated;
GRANT ALL ON public.whatsapp_campaign_applications TO service_role;
ALTER TABLE public.whatsapp_campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promoters and campaign owners view applications" ON public.whatsapp_campaign_applications FOR SELECT TO authenticated USING (promoter_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.whatsapp_campaigns c WHERE c.id = campaign_id AND c.business_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Promoters apply to campaigns" ON public.whatsapp_campaign_applications FOR INSERT TO authenticated WITH CHECK (promoter_user_id = auth.uid());
CREATE POLICY "Promoters and campaign owners update applications" ON public.whatsapp_campaign_applications FOR UPDATE TO authenticated USING (promoter_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.whatsapp_campaigns c WHERE c.id = campaign_id AND c.business_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')) WITH CHECK (promoter_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.whatsapp_campaigns c WHERE c.id = campaign_id AND c.business_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_campaign_applications(id) ON DELETE CASCADE,
  promoter_user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_tracking_links TO anon;
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_tracking_links TO authenticated;
GRANT ALL ON public.whatsapp_tracking_links TO service_role;
ALTER TABLE public.whatsapp_tracking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tracking links by slug" ON public.whatsapp_tracking_links FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Promoters and admins manage tracking links" ON public.whatsapp_tracking_links FOR ALL TO authenticated USING (promoter_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (promoter_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.whatsapp_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_link_id uuid NOT NULL REFERENCES public.whatsapp_tracking_links(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'click',
  visitor_id uuid,
  referrer text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_tracking_events TO authenticated;
GRANT ALL ON public.whatsapp_tracking_events TO service_role;
ALTER TABLE public.whatsapp_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins view tracking events" ON public.whatsapp_tracking_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.whatsapp_tracking_links l WHERE l.id = tracking_link_id AND l.promoter_user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.whatsapp_tracking_links l JOIN public.whatsapp_campaigns c ON c.id = l.campaign_id WHERE l.id = tracking_link_id AND c.business_user_id = auth.uid()));

CREATE TABLE public.whatsapp_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.whatsapp_campaign_applications(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  promoter_user_id uuid NOT NULL,
  amount_credits integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  UNIQUE (application_id)
);
GRANT SELECT ON public.whatsapp_earnings TO authenticated;
GRANT ALL ON public.whatsapp_earnings TO service_role;
ALTER TABLE public.whatsapp_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promoters view their earnings and owners view campaign earnings" ON public.whatsapp_earnings FOR SELECT TO authenticated USING (promoter_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.whatsapp_campaigns c WHERE c.id = campaign_id AND c.business_user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_whatsapp_campaign(
  p_title text,
  p_creative_url text,
  p_video_url text,
  p_caption text,
  p_destination_url text,
  p_budget_credits integer,
  p_duration_days integer,
  p_promoters_required integer,
  p_reward_credits integer,
  p_requirements text DEFAULT NULL,
  p_promotion_method text DEFAULT 'WhatsApp status or community',
  p_target_state text DEFAULT NULL,
  p_requires_approval boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance integer;
  v_bonus integer;
  v_commission numeric := 10;
  v_fee integer;
  v_total integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF length(trim(COALESCE(p_title, ''))) < 3 OR length(trim(COALESCE(p_caption, ''))) < 3 OR p_destination_url IS NULL OR p_destination_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Title, promotional caption and destination link are required');
  END IF;
  IF p_budget_credits < 1 OR p_reward_credits < 1 OR p_promoters_required < 1 OR p_duration_days < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget, reward, promoter count and duration must be positive');
  END IF;
  SELECT COALESCE(NULLIF(value, '')::numeric, 10) INTO v_commission FROM public.app_settings WHERE key = 'whatsapp_promoter_commission_percentage';
  v_fee := ceil((p_reward_credits * p_promoters_required) * (v_commission / 100.0));
  v_total := (p_reward_credits * p_promoters_required) + v_fee;
  IF p_budget_credits < v_total THEN RETURN jsonb_build_object('success', false, 'error', 'Budget must cover promoter rewards and platform commission', 'required_credits', v_total); END IF;
  SELECT credits, COALESCE(login_bonus_credits, 0) INTO v_balance, v_bonus FROM public.profiles WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_balance, 0) - v_bonus < p_budget_credits THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient eligible GGG credits'); END IF;
  UPDATE public.profiles SET credits = credits - p_budget_credits WHERE user_id = v_uid;
  INSERT INTO public.whatsapp_campaigns (business_user_id, title, creative_url, video_url, caption, destination_url, budget_credits, reward_credits, platform_fee_credits, remaining_budget_credits, duration_days, promoters_required, requirements, promotion_method, target_state, requires_approval, status)
  VALUES (v_uid, trim(p_title), NULLIF(p_creative_url, ''), NULLIF(p_video_url, ''), trim(p_caption), trim(p_destination_url), p_budget_credits, p_reward_credits, v_fee, p_budget_credits, p_duration_days, p_promoters_required, p_requirements, COALESCE(p_promotion_method, 'WhatsApp status or community'), NULLIF(p_target_state, ''), p_requires_approval, 'pending') RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'campaign_id', v_id, 'platform_fee_credits', v_fee, 'total_reserved', p_budget_credits);
END; $$;
GRANT EXECUTE ON FUNCTION public.create_whatsapp_campaign(text,text,text,text,text,integer,integer,integer,integer,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_whatsapp_campaign(p_campaign_id uuid, p_approve boolean, p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_campaign record; v_uid uuid := auth.uid(); BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Admin only'); END IF;
  SELECT * INTO v_campaign FROM public.whatsapp_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF v_campaign.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Campaign not found'); END IF;
  IF p_approve THEN UPDATE public.whatsapp_campaigns SET status = 'active', approved_at = now(), starts_at = now(), ends_at = now() + make_interval(days => duration_days), rejection_reason = NULL WHERE id = p_campaign_id; ELSE UPDATE public.whatsapp_campaigns SET status = 'rejected', rejection_reason = p_reason WHERE id = p_campaign_id; END IF;
  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_approve THEN 'active' ELSE 'rejected' END);
END; $$;
GRANT EXECUTE ON FUNCTION public.review_whatsapp_campaign(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_to_whatsapp_campaign(p_campaign_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_campaign record; v_profile record; v_count integer; v_app_id uuid; v_status text; BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  SELECT * INTO v_campaign FROM public.whatsapp_campaigns WHERE id = p_campaign_id FOR UPDATE;
  SELECT * INTO v_profile FROM public.promoter_profiles WHERE user_id = v_uid;
  IF v_campaign.id IS NULL OR v_campaign.status <> 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Campaign is not available'); END IF;
  IF v_campaign.business_user_id = v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'You cannot promote your own campaign'); END IF;
  IF v_profile.id IS NULL OR NOT v_profile.is_verified OR v_profile.is_suspended THEN RETURN jsonb_build_object('success', false, 'error', 'A verified promoter profile is required'); END IF;
  IF v_campaign.target_state IS NOT NULL AND v_campaign.target_state <> v_profile.target_state THEN RETURN jsonb_build_object('success', false, 'error', 'This campaign is limited to another state'); END IF;
  SELECT count(*) INTO v_count FROM public.whatsapp_campaign_applications WHERE campaign_id = p_campaign_id AND status IN ('pending','approved','submitted');
  IF v_count >= v_campaign.promoters_required THEN RETURN jsonb_build_object('success', false, 'error', 'All promoter slots are filled'); END IF;
  v_status := CASE WHEN v_campaign.requires_approval THEN 'pending' ELSE 'approved' END;
  INSERT INTO public.whatsapp_campaign_applications (campaign_id, promoter_user_id, status, reviewed_at) VALUES (p_campaign_id, v_uid, v_status, CASE WHEN v_status = 'approved' THEN now() ELSE NULL END) RETURNING id INTO v_app_id;
  IF v_status = 'approved' THEN INSERT INTO public.whatsapp_tracking_links (campaign_id, application_id, promoter_user_id, slug) VALUES (p_campaign_id, v_app_id, v_uid, 'wa-' || substr(replace(v_app_id::text, '-', ''), 1, 16)); END IF;
  RETURN jsonb_build_object('success', true, 'application_id', v_app_id, 'status', v_status);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('success', false, 'error', 'You already applied to this campaign'); END; $$;
GRANT EXECUTE ON FUNCTION public.apply_to_whatsapp_campaign(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_whatsapp_application(p_application_id uuid, p_approve boolean, p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_app record; v_campaign record; BEGIN
  SELECT a.*, c.business_user_id, c.status AS campaign_status INTO v_app FROM public.whatsapp_campaign_applications a JOIN public.whatsapp_campaigns c ON c.id = a.campaign_id WHERE a.id = p_application_id FOR UPDATE;
  IF v_app.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Application not found'); END IF;
  IF v_app.business_user_id <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Only the campaign owner or admin can review this application'); END IF;
  IF p_approve THEN UPDATE public.whatsapp_campaign_applications SET status = 'approved', reviewed_at = now(), rejection_reason = NULL WHERE id = p_application_id; INSERT INTO public.whatsapp_tracking_links (campaign_id, application_id, promoter_user_id, slug) VALUES (v_app.campaign_id, p_application_id, v_app.promoter_user_id, 'wa-' || substr(replace(p_application_id::text, '-', ''), 1, 16)) ON CONFLICT (application_id) DO NOTHING; ELSE UPDATE public.whatsapp_campaign_applications SET status = 'rejected', reviewed_at = now(), rejection_reason = p_reason WHERE id = p_application_id; END IF;
  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END; $$;
GRANT EXECUTE ON FUNCTION public.review_whatsapp_application(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_whatsapp_promotion(p_application_id uuid, p_proof_url text, p_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_app record; v_campaign record; BEGIN
  SELECT * INTO v_app FROM public.whatsapp_campaign_applications WHERE id = p_application_id FOR UPDATE;
  SELECT * INTO v_campaign FROM public.whatsapp_campaigns WHERE id = v_app.campaign_id;
  IF v_app.id IS NULL OR v_app.promoter_user_id <> v_uid THEN RETURN jsonb_build_object('success', false, 'error', 'Application not found'); END IF;
  IF v_app.status <> 'approved' THEN RETURN jsonb_build_object('success', false, 'error', 'This application is not approved'); END IF;
  IF p_proof_url IS NULL OR p_proof_url = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Proof is required'); END IF;
  UPDATE public.whatsapp_campaign_applications SET status = 'submitted', proof_url = p_proof_url, proof_notes = p_notes, submitted_at = now() WHERE id = p_application_id;
  INSERT INTO public.whatsapp_earnings (application_id, campaign_id, promoter_user_id, amount_credits, status) VALUES (p_application_id, v_app.campaign_id, v_uid, v_campaign.reward_credits, 'pending') ON CONFLICT (application_id) DO UPDATE SET status = 'pending', amount_credits = EXCLUDED.amount_credits;
  RETURN jsonb_build_object('success', true, 'status', 'submitted');
END; $$;
GRANT EXECUTE ON FUNCTION public.submit_whatsapp_promotion(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_whatsapp_promotion(p_application_id uuid, p_approve boolean, p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_app record; v_campaign record; v_earning record; BEGIN
  SELECT a.*, c.business_user_id, c.reward_credits, c.title INTO v_app FROM public.whatsapp_campaign_applications a JOIN public.whatsapp_campaigns c ON c.id = a.campaign_id WHERE a.id = p_application_id FOR UPDATE;
  IF v_app.id IS NULL OR (v_app.business_user_id <> v_uid AND NOT public.has_role(v_uid, 'admin')) THEN RETURN jsonb_build_object('success', false, 'error', 'Only the campaign owner or admin can review proof'); END IF;
  IF p_approve THEN
    SELECT * INTO v_earning FROM public.whatsapp_earnings WHERE application_id = p_application_id FOR UPDATE;
    IF v_earning.id IS NULL OR v_earning.status = 'available' THEN RETURN jsonb_build_object('success', false, 'error', 'This proof has already been processed'); END IF;
    UPDATE public.whatsapp_campaign_applications SET status = 'completed', reviewed_at = now(), rejection_reason = NULL WHERE id = p_application_id;
    UPDATE public.whatsapp_earnings SET status = 'available', approved_at = now(), review_note = NULL WHERE application_id = p_application_id;
    UPDATE public.profiles SET credits = credits + v_earning.amount_credits WHERE user_id = v_app.promoter_user_id;
    UPDATE public.whatsapp_campaigns SET remaining_budget_credits = GREATEST(remaining_budget_credits - v_earning.amount_credits, 0), updated_at = now() WHERE id = v_app.campaign_id;
  ELSE
    UPDATE public.whatsapp_campaign_applications SET status = 'rejected', reviewed_at = now(), rejection_reason = p_reason WHERE id = p_application_id;
    UPDATE public.whatsapp_earnings SET status = 'rejected', review_note = p_reason WHERE application_id = p_application_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_approve THEN 'available' ELSE 'rejected' END);
END; $$;
GRANT EXECUTE ON FUNCTION public.review_whatsapp_promotion(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_whatsapp_click(p_slug text, p_referrer text DEFAULT NULL, p_user_agent text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link record; BEGIN
  SELECT l.*, c.destination_url INTO v_link FROM public.whatsapp_tracking_links l JOIN public.whatsapp_campaigns c ON c.id = l.campaign_id WHERE l.slug = p_slug AND c.status = 'active' FOR UPDATE;
  IF v_link.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tracking link not found'); END IF;
  UPDATE public.whatsapp_tracking_links SET clicks = clicks + 1 WHERE id = v_link.id;
  INSERT INTO public.whatsapp_tracking_events (tracking_link_id, event_type, referrer, user_agent) VALUES (v_link.id, 'click', p_referrer, p_user_agent);
  RETURN jsonb_build_object('success', true, 'destination_url', v_link.destination_url);
END; $$;
GRANT EXECUTE ON FUNCTION public.record_whatsapp_click(text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_whatsapp_promoter_withdrawal(p_amount numeric, p_bank_name text, p_account_number text, p_account_name text, p_bank_code text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_rate integer := 100; v_min numeric := 500; v_credits integer; v_balance integer; v_request uuid; BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.promoter_profiles WHERE user_id = v_uid AND is_verified = true AND is_suspended = false AND wallet_frozen = false) THEN RETURN jsonb_build_object('success', false, 'error', 'Verified promoter profile required'); END IF;
  SELECT COALESCE(NULLIF(value, '')::integer, 100) INTO v_rate FROM public.app_settings WHERE key = 'credit_exchange_rate';
  SELECT COALESCE(NULLIF(value, '')::numeric, 500) INTO v_min FROM public.app_settings WHERE key = 'whatsapp_promoter_min_withdrawal';
  IF p_amount < v_min OR p_account_number = '' OR p_account_name = '' OR p_bank_name = '' THEN RETURN jsonb_build_object('success', false, 'error', 'Valid bank details and minimum withdrawal are required'); END IF;
  v_credits := ceil(p_amount / v_rate);
  SELECT credits INTO v_balance FROM public.profiles WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_balance, 0) < v_credits THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient GGG credits'); END IF;
  UPDATE public.profiles SET credits = credits - v_credits WHERE user_id = v_uid;
  UPDATE public.promoter_profiles SET bank_name = p_bank_name, account_number = p_account_number, account_name = p_account_name, bank_code = p_bank_code, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO public.withdrawal_requests (user_id, amount, bank_name, account_number, account_name, status, payout_mode, credits_held) VALUES (v_uid, p_amount, p_bank_name, p_account_number, p_account_name, 'pending_admin', 'manual', v_credits) RETURNING id INTO v_request;
  RETURN jsonb_build_object('success', true, 'request_id', v_request, 'credits_held', v_credits);
END; $$;
GRANT EXECUTE ON FUNCTION public.request_whatsapp_promoter_withdrawal(numeric,text,text,text,text) TO authenticated;