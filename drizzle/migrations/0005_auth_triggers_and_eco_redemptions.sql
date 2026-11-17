CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  bonus_amount numeric := 0;
  ref_code text;
  ref_user uuid;
BEGIN
  ref_code := NEW.raw_user_meta_data->>'ref';
  IF ref_code IS NOT NULL AND ref_code <> '' THEN
    SELECT user_id INTO ref_user FROM public.profiles WHERE referral_code = ref_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, email, display_name, referral_code, referred_by_user_id, referred_by)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    substring(replace(NEW.id::text,'-',''),1,8), ref_user, ref_code)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'business')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, premium_tier, premium_expires_at)
  VALUES (NEW.id, 'premium', 0, now() + interval '1 month')
  ON CONFLICT (user_id, role) DO NOTHING;

  BEGIN
    SELECT COALESCE(NULLIF(value, '')::numeric, 0) INTO bonus_amount
    FROM public.app_settings WHERE key = 'vendor_wallet_bonus';
  EXCEPTION WHEN others THEN bonus_amount := 0;
  END;

  INSERT INTO public.task_wallets (user_id, balance, total_funded)
  VALUES (NEW.id, COALESCE(bonus_amount, 0), COALESCE(bonus_amount, 0))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_admin_user_created ON auth.users;
CREATE TRIGGER on_admin_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_assignment();

-- Backfill orphaned accounts
INSERT INTO public.profiles (user_id, email, display_name, referral_code)
SELECT u.id, u.email, split_part(u.email,'@',1), substring(replace(u.id::text,'-',''),1,8)
FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.task_wallets (user_id, balance, total_funded)
SELECT u.id, 0, 0 FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.task_wallets w WHERE w.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'business'::app_role FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;

-- ECO redemptions
CREATE TABLE public.eco_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits_spent integer NOT NULL CHECK (credits_spent > 0),
  eco_points numeric(12,4) NOT NULL,
  naira_equivalent numeric(12,2) NOT NULL,
  recipient text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  eco_reference text,
  error_message text,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  rate_ggg_per_eco numeric NOT NULL,
  rate_naira_per_ggg numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.eco_redemptions TO authenticated;
GRANT ALL ON public.eco_redemptions TO service_role;
ALTER TABLE public.eco_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own eco redemptions" ON public.eco_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX eco_redemptions_user_idx ON public.eco_redemptions(user_id, created_at DESC);

-- Atomic reservation (service role only)
CREATE OR REPLACE FUNCTION public.reserve_eco_redemption(p_user_id uuid, p_credits integer, p_recipient text, p_environment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_rate_eco numeric; v_rate_naira numeric; v_min integer; v_bal integer; v_id uuid;
BEGIN
  SELECT COALESCE(NULLIF(value,'')::numeric,125) INTO v_rate_eco FROM app_settings WHERE key='eco_ggg_redemption_rate';
  SELECT COALESCE(NULLIF(value,'')::numeric,0.48) INTO v_rate_naira FROM app_settings WHERE key='credit_exchange_rate';
  SELECT COALESCE(NULLIF(value,'')::integer,125) INTO v_min FROM app_settings WHERE key='eco_min_redemption_ggg';
  v_rate_eco := COALESCE(v_rate_eco,125); v_rate_naira := COALESCE(v_rate_naira,0.48); v_min := COALESCE(v_min,125);

  IF p_credits IS NULL OR p_credits < v_min THEN
    RETURN jsonb_build_object('success',false,'error','Minimum redemption is '||v_min||' GGG');
  END IF;

  SELECT credits INTO v_bal FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  IF v_bal IS NULL THEN RETURN jsonb_build_object('success',false,'error','Profile not found'); END IF;
  IF v_bal < p_credits THEN RETURN jsonb_build_object('success',false,'error','Insufficient GGG balance'); END IF;

  UPDATE profiles SET credits = credits - p_credits WHERE user_id = p_user_id;

  INSERT INTO eco_redemptions(user_id, credits_spent, eco_points, naira_equivalent, recipient, environment, rate_ggg_per_eco, rate_naira_per_ggg)
  VALUES (p_user_id, p_credits, round(p_credits / v_rate_eco, 4), round(p_credits * v_rate_naira, 2), p_recipient, p_environment, v_rate_eco, v_rate_naira)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success',true,'id',v_id,'eco_points',round(p_credits / v_rate_eco,4),'naira',round(p_credits * v_rate_naira,2),'new_credits',v_bal - p_credits);
END $$;

CREATE OR REPLACE FUNCTION public.settle_eco_redemption(p_id uuid, p_success boolean, p_reference text, p_error text, p_response jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r eco_redemptions%ROWTYPE;
BEGIN
  SELECT * INTO r FROM eco_redemptions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RETURN jsonb_build_object('success',false,'error','Not pending'); END IF;
  IF p_success THEN
    UPDATE eco_redemptions SET status='completed', eco_reference=p_reference, provider_response=COALESCE(p_response,'{}'), updated_at=now() WHERE id=p_id;
  ELSE
    UPDATE profiles SET credits = credits + r.credits_spent WHERE user_id = r.user_id;
    UPDATE eco_redemptions SET status='refunded', error_message=p_error, provider_response=COALESCE(p_response,'{}'), updated_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('success',true);
END $$;

REVOKE ALL ON FUNCTION public.reserve_eco_redemption(uuid,integer,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_eco_redemption(uuid,boolean,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_eco_redemption(uuid,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_eco_redemption(uuid,boolean,text,text,jsonb) TO service_role;