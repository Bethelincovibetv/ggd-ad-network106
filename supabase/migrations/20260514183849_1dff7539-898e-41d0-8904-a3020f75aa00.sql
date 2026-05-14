
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS target_state text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ad_type text NOT NULL DEFAULT 'banner';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS watch_duration_seconds integer;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS reward_credits integer DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS budget_credits integer DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Backfill: existing ads count as approved
UPDATE public.ads SET approved = true WHERE approved = false AND created_at < now();

CREATE TABLE IF NOT EXISTS public.ad_watch_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL,
  user_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_id, user_id)
);

ALTER TABLE public.ad_watch_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own claims" ON public.ad_watch_claims
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admin manage claims" ON public.ad_watch_claims
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Insertion is done via edge function with service role; no insert policy needed for users.

INSERT INTO public.feature_toggles (feature_key, feature_name, description, is_enabled)
VALUES ('co_owner_visible', 'Co-Owner Program Visible', 'Show the co-owner upgrade option to users', true)
ON CONFLICT (feature_key) DO NOTHING;
