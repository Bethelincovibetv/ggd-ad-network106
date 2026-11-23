-- Enforce database-level idempotency on banner ad creation & duplicate requests.
-- Safe to run repeatedly on fresh or existing databases.

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS external_reference TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ads_duration_days_check'
      AND conrelid = 'public.ads'::regclass
  ) THEN
    ALTER TABLE public.ads
      ADD CONSTRAINT ads_duration_days_check CHECK (duration_days BETWEEN 1 AND 365);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ads_user_idempotency_key_uidx
  ON public.ads (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ads_user_external_reference_uidx
  ON public.ads (user_id, external_reference)
  WHERE external_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_banner_ad_idempotent(
  p_idempotency_key TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT '',
  p_image_url TEXT DEFAULT NULL,
  p_target_url TEXT DEFAULT '#',
  p_target_state TEXT DEFAULT NULL,
  p_ad_type TEXT DEFAULT 'banner',
  p_duration_days INTEGER DEFAULT 7,
  p_is_active BOOLEAN DEFAULT TRUE,
  p_approved BOOLEAN DEFAULT FALSE,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_deduct_credits BOOLEAN DEFAULT TRUE,
  p_youtube_url TEXT DEFAULT NULL,
  p_watch_duration_seconds INTEGER DEFAULT NULL,
  p_reward_credits INTEGER DEFAULT NULL,
  p_budget_credits INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_key TEXT := NULLIF(BTRIM(p_idempotency_key), '');
  v_existing public.ads%ROWTYPE;
  v_inserted public.ads%ROWTYPE;
  v_is_admin BOOLEAN := FALSE;
  v_ad_cost INTEGER := 5;
  v_current_credits NUMERIC := 0;
  v_next_credits NUMERIC := 0;
  v_duration INTEGER := LEAST(GREATEST(COALESCE(p_duration_days, 7), 1), 365);
  v_expires TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Authentication required');
  END IF;

  IF v_key IS NULL OR CHAR_LENGTH(v_key) > 128 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'A valid idempotency key (1-128 characters) is required');
  END IF;

  IF NULLIF(BTRIM(p_title), '') IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Banner title is required');
  END IF;

  -- Serialize concurrent retries for the same user + idempotency key
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::TEXT || ':' || v_key));

  -- Check if an ad was already created with this key
  SELECT * INTO v_existing
  FROM public.ads
  WHERE user_id = v_user_id
    AND (idempotency_key = v_key OR external_reference = v_key)
  LIMIT 1;

  SELECT COALESCE(credits, 0) INTO v_current_credits
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF FOUND AND v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'already_exists', TRUE,
      'idempotent_replay', TRUE,
      'ad', to_jsonb(v_existing),
      'credits', COALESCE(v_current_credits, 0)
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF COALESCE(p_deduct_credits, TRUE) AND NOT v_is_admin THEN
    SELECT COALESCE(NULLIF(BTRIM(value), '')::INTEGER, 5) INTO v_ad_cost
    FROM public.app_settings
    WHERE key = 'ad_cost_credits'
    LIMIT 1;

    v_ad_cost := GREATEST(COALESCE(v_ad_cost, 5), 0);

    SELECT COALESCE(credits, 0) INTO v_current_credits
    FROM public.profiles
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF COALESCE(v_current_credits, 0) < v_ad_cost THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', format('Not enough credits. Need %s, have %s', v_ad_cost, COALESCE(v_current_credits, 0)),
        'credits', COALESCE(v_current_credits, 0)
      );
    END IF;

    v_next_credits := GREATEST(0, COALESCE(v_current_credits, 0) - v_ad_cost);
    UPDATE public.profiles
    SET credits = v_next_credits
    WHERE user_id = v_user_id;
  ELSE
    v_next_credits := COALESCE(v_current_credits, 0);
  END IF;

  v_expires := COALESCE(p_expires_at, NOW() + make_interval(days => v_duration));

  BEGIN
    INSERT INTO public.ads (
      user_id,
      title,
      description,
      image_url,
      target_url,
      target_state,
      ad_type,
      duration_days,
      is_active,
      approved,
      expires_at,
      idempotency_key,
      youtube_url,
      watch_duration_seconds,
      reward_credits,
      budget_credits
    )
    VALUES (
      v_user_id,
      LEFT(BTRIM(p_title), 255),
      LEFT(COALESCE(p_description, ''), 1000),
      NULLIF(BTRIM(p_image_url), ''),
      BTRIM(p_target_url),
      NULLIF(BTRIM(p_target_state), ''),
      COALESCE(NULLIF(BTRIM(p_ad_type), ''), 'banner'),
      v_duration,
      COALESCE(p_is_active, TRUE),
      CASE WHEN v_is_admin THEN COALESCE(p_approved, TRUE) ELSE FALSE END,
      v_expires,
      v_key,
      NULLIF(BTRIM(p_youtube_url), ''),
      p_watch_duration_seconds,
      p_reward_credits,
      p_budget_credits
    )
    RETURNING * INTO v_inserted;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO v_existing
      FROM public.ads
      WHERE user_id = v_user_id
        AND (idempotency_key = v_key OR external_reference = v_key)
      LIMIT 1;

      IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'success', TRUE,
          'already_exists', TRUE,
          'idempotent_replay', TRUE,
          'ad', to_jsonb(v_existing),
          'credits', COALESCE(v_current_credits, 0)
        );
      END IF;
      RAISE;
  END;

  RETURN jsonb_build_object(
    'success', TRUE,
    'already_exists', FALSE,
    'idempotent_replay', FALSE,
    'ad', to_jsonb(v_inserted),
    'credits', v_next_credits
  );
END;
$$;
