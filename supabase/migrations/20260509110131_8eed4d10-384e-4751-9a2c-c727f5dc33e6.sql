
-- Default referral percentage setting
INSERT INTO public.app_settings (key, value)
VALUES ('referral_percentage', '2')
ON CONFLICT DO NOTHING;

-- Add referrer linkage column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Backfill referral codes for existing users
UPDATE public.profiles
SET referral_code = substring(replace(user_id::text,'-',''),1,8)
WHERE referral_code IS NULL OR referral_code = '';

-- Referral earnings table
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'fund',
  source_amount numeric NOT NULL DEFAULT 0,
  credits_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrer can view own earnings" ON public.referral_earnings
  FOR SELECT TO authenticated USING (referrer_id = auth.uid());
CREATE POLICY "Admin can manage earnings" ON public.referral_earnings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Referral community chat
CREATE TABLE IF NOT EXISTS public.referral_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages" ON public.referral_messages
  FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.referral_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Receiver can mark read" ON public.referral_messages
  FOR UPDATE TO authenticated USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());
CREATE POLICY "Admin can manage messages" ON public.referral_messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_messages;

-- Updated handle_new_user with referral capture + auto code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    substring(replace(NEW.id::text,'-',''),1,8),
    ref_user,
    ref_code
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'business')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT COALESCE(NULLIF(value, '')::numeric, 0) INTO bonus_amount
  FROM public.app_settings WHERE key = 'vendor_wallet_bonus';

  INSERT INTO public.task_wallets (user_id, balance, total_funded)
  VALUES (NEW.id, COALESCE(bonus_amount, 0), COALESCE(bonus_amount, 0))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Award referral bonus when referred user's credits increase
CREATE OR REPLACE FUNCTION public.award_referral_on_credit_increase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pct numeric := 0;
  delta integer := 0;
  bonus integer := 0;
  ref_uid uuid;
BEGIN
  IF NEW.credits IS NULL OR OLD.credits IS NULL THEN RETURN NEW; END IF;
  delta := NEW.credits - OLD.credits;
  IF delta <= 0 THEN RETURN NEW; END IF;

  SELECT referred_by_user_id INTO ref_uid FROM public.profiles WHERE user_id = NEW.user_id;
  IF ref_uid IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(value, '')::numeric, 0) INTO pct
  FROM public.app_settings WHERE key = 'referral_percentage';
  IF pct <= 0 THEN RETURN NEW; END IF;

  bonus := floor(delta * pct / 100.0);
  IF bonus <= 0 THEN RETURN NEW; END IF;

  UPDATE public.profiles SET credits = credits + bonus WHERE user_id = ref_uid;

  INSERT INTO public.referral_earnings (referrer_id, referred_user_id, source, source_amount, credits_earned)
  VALUES (ref_uid, NEW.user_id, 'credits', delta, bonus);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_award_referral_credits ON public.profiles;
CREATE TRIGGER trg_award_referral_credits
AFTER UPDATE OF credits ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_referral_on_credit_increase();
