-- Migration: 20260905170000_fix_syndicate_rpc.sql
-- Fixes missing GRANT EXECUTE on create_syndicate_task and review_syndicate_assignment
-- Ensures PostgREST exposes them in the public schema cache for authenticated users

CREATE OR REPLACE FUNCTION public.create_syndicate_task(
  p_title text,
  p_description text,
  p_share_link text,
  p_flyer_url text,
  p_placements text[],
  p_target_state text,
  p_max_syndicates integer,
  p_approval_mode text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_cost numeric := 0;
  v_cost_per_syndicate numeric := 0;
  v_payout_amount numeric := 0;
  v_exchange_rate integer := 100;
  v_payout_pct integer := 70;
  v_credits_needed integer;
  v_user_credits integer;
  v_login_bonus integer;
  v_placement_key text;
  v_item_price numeric;
  v_task_id uuid;
  v_rate_setting text;
  v_pct_setting text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task title is required');
  END IF;

  IF p_placements IS NULL OR array_length(p_placements, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least one placement platform is required');
  END IF;

  IF p_max_syndicates <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max syndicates must be at least 1');
  END IF;

  -- Calculate placement costs server-side from platform_pricing
  FOREACH v_placement_key IN ARRAY p_placements LOOP
    SELECT price_per_task INTO v_item_price
    FROM public.platform_pricing
    WHERE platform_key = v_placement_key;

    v_cost_per_syndicate := v_cost_per_syndicate + COALESCE(v_item_price, 50);
  END LOOP;

  IF v_cost_per_syndicate <= 0 THEN
    v_cost_per_syndicate := 50;
  END IF;

  v_total_cost := v_cost_per_syndicate * p_max_syndicates;

  -- Load app settings
  SELECT value INTO v_rate_setting FROM public.app_settings WHERE key = 'credit_exchange_rate';
  IF v_rate_setting IS NOT NULL AND v_rate_setting ~ '^\d+$' THEN
    v_exchange_rate := v_rate_setting::integer;
  END IF;

  SELECT value INTO v_pct_setting FROM public.app_settings WHERE key = 'syndicate_payout_percentage';
  IF v_pct_setting IS NOT NULL AND v_pct_setting ~ '^\d+$' THEN
    v_payout_pct := v_pct_setting::integer;
  END IF;

  v_payout_amount := v_cost_per_syndicate * (v_payout_pct::numeric / 100.0);
  v_credits_needed := ceil(v_total_cost / v_exchange_rate);

  -- Lock user profile
  SELECT credits, COALESCE(login_bonus_credits, 0)
  INTO v_user_credits, v_login_bonus
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF (v_user_credits - v_login_bonus) < v_credits_needed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient eligible credits. Need ' || v_credits_needed || ' credits (₦' || v_total_cost || ').'
    );
  END IF;

  -- Debit creator's credits
  UPDATE public.profiles
  SET credits = credits - v_credits_needed
  WHERE user_id = v_user_id;

  -- Insert task
  INSERT INTO public.syndicate_tasks (
    business_user_id,
    title,
    description,
    share_link,
    flyer_url,
    placements,
    target_state,
    max_syndicates,
    cost_per_syndicate,
    total_cost,
    payout_amount,
    approval_mode,
    status
  )
  VALUES (
    v_user_id,
    trim(p_title),
    trim(p_description),
    p_share_link,
    p_flyer_url,
    p_placements,
    p_target_state,
    p_max_syndicates,
    v_cost_per_syndicate,
    v_total_cost,
    v_payout_amount,
    COALESCE(p_approval_mode, 'manual'),
    'active'
  )
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'credits_debited', v_credits_needed,
    'total_cost', v_total_cost
  );
END;
$$;

-- Explicitly grant execute privileges to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.create_syndicate_task(text,text,text,text,text[],text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_syndicate_task(text,text,text,text,text[],text,integer,text) TO anon;

CREATE OR REPLACE FUNCTION public.review_syndicate_assignment(
  p_assignment_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_assignment record;
  v_task record;
  v_exchange_rate integer := 100;
  v_rate_setting text;
  v_payout_credits integer;
  v_payout_naira numeric;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock assignment
  SELECT * INTO v_assignment
  FROM public.syndicate_task_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF v_assignment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- Fetch associated task
  SELECT * INTO v_task
  FROM public.syndicate_tasks
  WHERE id = v_assignment.task_id;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- Permission: Must be task owner or admin
  IF v_task.business_user_id <> v_caller_id AND NOT public.has_role(v_caller_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Only task owner or admin can review.');
  END IF;

  IF v_assignment.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment is already approved');
  END IF;

  IF p_approve THEN
    SELECT value INTO v_rate_setting FROM public.app_settings WHERE key = 'credit_exchange_rate';
    IF v_rate_setting IS NOT NULL AND v_rate_setting ~ '^\d+$' THEN
      v_exchange_rate := v_rate_setting::integer;
    END IF;

    v_payout_naira := COALESCE(v_task.payout_amount, v_task.cost_per_syndicate * 0.7);
    v_payout_credits := floor(v_payout_naira / v_exchange_rate);
    IF v_payout_credits < 1 THEN
      v_payout_credits := 1;
    END IF;

    UPDATE public.syndicate_task_assignments
    SET status = 'approved',
        reviewed_at = now()
    WHERE id = p_assignment_id;

    UPDATE public.profiles
    SET credits = credits + v_payout_credits
    WHERE user_id = v_assignment.syndicate_user_id;

    UPDATE public.syndicate_profiles
    SET tasks_completed = tasks_completed + 1,
        ranking_score = ranking_score + 5
    WHERE user_id = v_assignment.syndicate_user_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_assignment.syndicate_user_id,
      '🎉 Task Approved & Credits Paid!',
      'Your task submission was approved! You earned ' || v_payout_credits || ' GGG credits.',
      'credit'
    );

    RETURN jsonb_build_object(
      'success', true,
      'payout_credits', v_payout_credits,
      'payout_naira', v_payout_naira
    );
  ELSE
    UPDATE public.syndicate_task_assignments
    SET status = 'rejected',
        reviewed_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_assignment.syndicate_user_id,
      '❌ Task Submission Rejected',
      'Your submission for "' || v_task.title || '" was rejected: ' || COALESCE(p_rejection_reason, 'Proof does not meet requirements'),
      'warning'
    );

    RETURN jsonb_build_object('success', true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_syndicate_assignment(uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_syndicate_assignment(uuid,boolean,text) TO anon;
