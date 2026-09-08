-- Migration: 20260908120000_syndicate_date_campaigns_and_settlement.sql
-- Direct Team / Syndicate Date-Based Campaign Management, Payout Snapshot, & Settlement Architecture

-- 1. Extend syndicate_tasks with campaign_date
ALTER TABLE public.syndicate_tasks 
  ADD COLUMN IF NOT EXISTS campaign_date date DEFAULT CURRENT_DATE NOT NULL;

UPDATE public.syndicate_tasks 
  SET campaign_date = (created_at AT TIME ZONE 'UTC')::date 
  WHERE campaign_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_syndicate_tasks_campaign_date 
  ON public.syndicate_tasks(campaign_date);

-- 2. Extend syndicate_task_assignments with campaign_date and payout/settlement fields
ALTER TABLE public.syndicate_task_assignments 
  ADD COLUMN IF NOT EXISTS campaign_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payout_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paystack_reference text,
  ADD COLUMN IF NOT EXISTS paystack_transfer_code text,
  ADD COLUMN IF NOT EXISTS settlement_notes text;

CREATE INDEX IF NOT EXISTS idx_syndicate_assignments_task_user 
  ON public.syndicate_task_assignments(task_id, syndicate_user_id);

CREATE INDEX IF NOT EXISTS idx_syndicate_assignments_campaign_date 
  ON public.syndicate_task_assignments(campaign_date);

-- 3. Create persistent syndicate_settlements table
CREATE TABLE IF NOT EXISTS public.syndicate_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.syndicate_tasks(id) ON DELETE CASCADE NOT NULL,
  campaign_date date NOT NULL DEFAULT CURRENT_DATE,
  settlement_base numeric NOT NULL DEFAULT 0,
  payout_percentage integer NOT NULL DEFAULT 70,
  total_pool numeric NOT NULL DEFAULT 0,
  participating_count integer NOT NULL DEFAULT 0,
  individual_payout numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  settled_by uuid REFERENCES auth.users(id),
  settled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT uq_syndicate_settlements_task UNIQUE (task_id)
);

ALTER TABLE public.syndicate_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to syndicate_settlements" ON public.syndicate_settlements;
CREATE POLICY "Admin full access to syndicate_settlements"
  ON public.syndicate_settlements
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Syndicate members can view settlements" ON public.syndicate_settlements;
CREATE POLICY "Syndicate members can view settlements"
  ON public.syndicate_settlements
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Update create_syndicate_task RPC to accept campaign_date
CREATE OR REPLACE FUNCTION public.create_syndicate_task(
  p_title text,
  p_description text,
  p_share_link text,
  p_flyer_url text,
  p_placements text[],
  p_target_state text,
  p_max_syndicates integer,
  p_approval_mode text DEFAULT 'manual',
  p_campaign_date date DEFAULT CURRENT_DATE
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
  v_effective_date date := COALESCE(p_campaign_date, CURRENT_DATE);
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

  -- Insert task with explicit campaign_date
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
    status,
    campaign_date
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
    'active',
    v_effective_date
  )
  RETURNING id INTO v_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'credits_debited', v_credits_needed,
    'total_cost', v_total_cost,
    'campaign_date', v_effective_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_syndicate_task(text,text,text,text,text[],text,integer,text,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_syndicate_task(text,text,text,text,text[],text,integer,text,date) TO anon;

-- 5. Stored Procedure for Admin Direct Team Campaign Settlement
CREATE OR REPLACE FUNCTION public.settle_syndicate_campaign(
  p_task_id uuid,
  p_payment_mode text DEFAULT 'manual',
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_task record;
  v_settlement_base numeric;
  v_payout_pct integer := 70;
  v_pct_setting text;
  v_total_pool numeric;
  v_participating_count integer;
  v_individual_payout numeric;
  v_settlement_id uuid;
  v_assignment record;
BEGIN
  -- Verify caller is Admin
  SELECT public.has_role(v_admin_id, 'admin'::app_role) INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin privileges required');
  END IF;

  -- Lock and fetch syndicate task
  SELECT * INTO v_task
  FROM public.syndicate_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Campaign task not found');
  END IF;

  v_settlement_base := COALESCE(v_task.total_cost, 0);

  -- Fetch payout percentage from app settings
  SELECT value INTO v_pct_setting FROM public.app_settings WHERE key = 'syndicate_payout_percentage';
  IF v_pct_setting IS NOT NULL AND v_pct_setting ~ '^\d+$' THEN
    v_payout_pct := v_pct_setting::integer;
  END IF;

  -- Count eligible participating members (who submitted or were approved)
  SELECT count(*) INTO v_participating_count
  FROM public.syndicate_task_assignments
  WHERE task_id = p_task_id
    AND status IN ('submitted', 'approved', 'accepted');

  -- Calculate team payout pool and individual payout
  v_total_pool := v_settlement_base * (v_payout_pct::numeric / 100.0);
  IF v_participating_count > 0 THEN
    v_individual_payout := round(v_total_pool / v_participating_count::numeric, 2);
  ELSE
    v_individual_payout := 0;
  END IF;

  -- Insert or update settlement snapshot record
  INSERT INTO public.syndicate_settlements (
    task_id,
    campaign_date,
    settlement_base,
    payout_percentage,
    total_pool,
    participating_count,
    individual_payout,
    status,
    settled_by,
    settled_at,
    notes
  )
  VALUES (
    p_task_id,
    v_task.campaign_date,
    v_settlement_base,
    v_payout_pct,
    v_total_pool,
    v_participating_count,
    v_individual_payout,
    'completed',
    v_admin_id,
    now(),
    p_admin_notes
  )
  ON CONFLICT (task_id) DO UPDATE
  SET
    campaign_date = EXCLUDED.campaign_date,
    settlement_base = EXCLUDED.settlement_base,
    payout_percentage = EXCLUDED.payout_percentage,
    total_pool = EXCLUDED.total_pool,
    participating_count = EXCLUDED.participating_count,
    individual_payout = EXCLUDED.individual_payout,
    status = 'completed',
    settled_by = EXCLUDED.settled_by,
    settled_at = EXCLUDED.settled_at,
    notes = EXCLUDED.notes
  RETURNING id INTO v_settlement_id;

  -- Update participating assignments to Paid with individual payout and reference
  UPDATE public.syndicate_task_assignments
  SET
    payment_status = 'paid',
    payout_amount = v_individual_payout,
    paid_at = now(),
    paystack_reference = COALESCE(paystack_reference, 'GGD_SETTLE_' || substring(p_task_id::text from 1 for 8) || '_' || to_char(now(), 'YYYYMMDDHH24MISS')),
    settlement_notes = p_admin_notes
  WHERE task_id = p_task_id
    AND status IN ('submitted', 'approved', 'accepted');

  -- Mark task as completed
  UPDATE public.syndicate_tasks
  SET status = 'completed'
  WHERE id = p_task_id;

  -- Notify participating members
  FOR v_assignment IN 
    SELECT syndicate_user_id 
    FROM public.syndicate_task_assignments 
    WHERE task_id = p_task_id AND status IN ('submitted', 'approved', 'accepted')
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type
    )
    VALUES (
      v_assignment.syndicate_user_id,
      '💰 Campaign Settlement Paid: ' || v_task.title,
      'Your participation in ' || v_task.title || ' for ' || to_char(v_task.campaign_date, 'Mon DD, YYYY') || ' has been settled. Payout: ₦' || to_char(v_individual_payout, 'FM999,999,990.00'),
      'success'
    );
  END LOOP;

  -- Record audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    v_admin_id,
    'settle_syndicate_campaign',
    'syndicate_tasks',
    p_task_id::text,
    jsonb_build_object(
      'campaign_date', v_task.campaign_date,
      'settlement_base', v_settlement_base,
      'payout_percentage', v_payout_pct,
      'total_pool', v_total_pool,
      'participating_count', v_participating_count,
      'individual_payout', v_individual_payout,
      'payment_mode', p_payment_mode
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'campaign_date', v_task.campaign_date,
    'settlement_base', v_settlement_base,
    'payout_percentage', v_payout_pct,
    'total_pool', v_total_pool,
    'participating_count', v_participating_count,
    'individual_payout', v_individual_payout
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_syndicate_campaign(uuid, text, text) TO authenticated;
