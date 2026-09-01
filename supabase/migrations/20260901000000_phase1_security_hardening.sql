-- Phase 1 Security Hardening: Server-Authoritative Financial Integrity & RLS Hardening

-- 1. Create Processed Payments Ledger Table for idempotency & duplicate-prevention
CREATE TABLE IF NOT EXISTS public.processed_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view processed payments" ON public.processed_payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own processed payments" ON public.processed_payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2. Secure Atomic Credit Transfer Function
CREATE OR REPLACE FUNCTION public.transfer_credits(
  p_recipient_email text,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_recipient_id uuid;
  v_sender_credits integer;
  v_sender_bonus integer;
  v_recipient_credits integer;
BEGIN
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer amount must be greater than zero');
  END IF;

  -- Lock sender row for update
  SELECT credits, COALESCE(login_bonus_credits, 0)
  INTO v_sender_credits, v_sender_bonus
  FROM public.profiles
  WHERE user_id = v_sender_id
  FOR UPDATE;

  IF v_sender_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender profile not found');
  END IF;

  IF (v_sender_credits - v_sender_bonus) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient eligible credits. Login bonus credits cannot be transferred.');
  END IF;

  -- Find recipient by email
  SELECT user_id, credits
  INTO v_recipient_id, v_recipient_credits
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_recipient_email))
  FOR UPDATE;

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient user not found with that email');
  END IF;

  IF v_recipient_id = v_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer credits to yourself');
  END IF;

  -- Atomic transfer
  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE user_id = v_sender_id;

  UPDATE public.profiles
  SET credits = credits + p_amount
  WHERE user_id = v_recipient_id;

  -- Record transfer ledger
  INSERT INTO public.credit_transfers (sender_id, receiver_id, amount)
  VALUES (v_sender_id, v_recipient_id, p_amount);

  -- Notify recipient
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_recipient_id,
    '💰 Credits Received',
    'You received ' || p_amount || ' GGG credits from transfer.',
    'credit'
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_sender_credits - p_amount,
    'transferred', p_amount
  );
END;
$$;

-- 3. Secure Atomic Syndicate Withdrawal Request Function
CREATE OR REPLACE FUNCTION public.request_syndicate_withdrawal(
  p_amount numeric,
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_pin_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_credits integer;
  v_login_bonus integer;
  v_exchange_rate integer := 100;
  v_min_withdraw numeric := 500;
  v_cooldown_hours integer := 24;
  v_credits_needed integer;
  v_stored_pin text;
  v_last_withdrawal timestamptz;
  v_request_id uuid;
  v_rate_setting text;
  v_min_setting text;
  v_cooldown_setting text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Retrieve configuration from app_settings
  SELECT value INTO v_rate_setting FROM public.app_settings WHERE key = 'credit_exchange_rate';
  IF v_rate_setting IS NOT NULL AND v_rate_setting ~ '^\d+$' THEN
    v_exchange_rate := v_rate_setting::integer;
  END IF;

  SELECT value INTO v_min_setting FROM public.app_settings WHERE key = 'syndicate_min_withdraw_amount';
  IF v_min_setting IS NOT NULL AND v_min_setting ~ '^\d+(\.\d+)?$' THEN
    v_min_withdraw := v_min_setting::numeric;
  END IF;

  SELECT value INTO v_cooldown_setting FROM public.app_settings WHERE key = 'syndicate_withdraw_cooldown_hours';
  IF v_cooldown_setting IS NOT NULL AND v_cooldown_setting ~ '^\d+$' THEN
    v_cooldown_hours := v_cooldown_setting::integer;
  END IF;

  IF p_amount < v_min_withdraw THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal amount is ₦' || v_min_withdraw);
  END IF;

  -- Check PIN if user configured one
  SELECT withdraw_pin_hash INTO v_stored_pin
  FROM public.syndicate_profiles
  WHERE user_id = v_user_id;

  IF v_stored_pin IS NOT NULL AND v_stored_pin <> '' THEN
    IF p_pin_hash IS NULL OR p_pin_hash <> v_stored_pin THEN
      RETURN jsonb_build_object('success', false, 'error', 'Incorrect withdrawal PIN');
    END IF;
  END IF;

  -- Check cooldown from last withdrawal
  SELECT created_at INTO v_last_withdrawal
  FROM public.withdrawal_requests
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_withdrawal IS NOT NULL AND (now() - v_last_withdrawal) < (v_cooldown_hours || ' hours')::interval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Withdrawal cooldown active. You can submit one withdrawal request every ' || v_cooldown_hours || ' hours.'
    );
  END IF;

  v_credits_needed := ceil(p_amount / v_exchange_rate);

  -- Lock user profile row
  SELECT credits, COALESCE(login_bonus_credits, 0)
  INTO v_user_credits, v_login_bonus
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF (v_user_credits - v_login_bonus) < v_credits_needed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient eligible credits. You need ' || v_credits_needed || ' credits (₦' || p_amount || '). Login bonus credits cannot be withdrawn.'
    );
  END IF;

  -- Deduct and hold credits in escrow
  UPDATE public.profiles
  SET credits = credits - v_credits_needed
  WHERE user_id = v_user_id;

  -- Insert withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    bank_name,
    account_number,
    account_name,
    status
  )
  VALUES (
    v_user_id,
    p_amount,
    p_bank_name,
    p_account_number,
    p_account_name,
    'pending'
  )
  RETURNING id INTO v_request_id;

  -- Notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_user_id,
    '⏳ Withdrawal Submitted',
    'Your withdrawal request for ₦' || p_amount || ' (' || v_credits_needed || ' credits) has been submitted for review.',
    'info'
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'amount', p_amount,
    'credits_held', v_credits_needed,
    'new_credits', v_user_credits - v_credits_needed
  );
END;
$$;

-- 4. Secure Admin Withdrawal Processing Function (with atomic refund on rejection)
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_request_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_req record;
  v_exchange_rate integer := 100;
  v_rate_setting text;
  v_refund_credits integer;
BEGIN
  IF v_admin_id IS NULL OR NOT public.has_role(v_admin_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Admin role required.');
  END IF;

  -- Lock withdrawal request
  SELECT * INTO v_req
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal has already been processed with status: ' || v_req.status);
  END IF;

  IF p_approve THEN
    UPDATE public.withdrawal_requests
    SET status = 'approved',
        processed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_req.user_id,
      '🎉 Withdrawal Approved',
      'Your withdrawal of ₦' || v_req.amount || ' has been approved and disbursed.',
      'credit'
    );

    RETURN jsonb_build_object('success', true, 'status', 'approved');
  ELSE
    -- Calculate refund credits
    SELECT value INTO v_rate_setting FROM public.app_settings WHERE key = 'credit_exchange_rate';
    IF v_rate_setting IS NOT NULL AND v_rate_setting ~ '^\d+$' THEN
      v_exchange_rate := v_rate_setting::integer;
    END IF;

    v_refund_credits := ceil(v_req.amount / v_exchange_rate);

    -- Refund credits to user
    UPDATE public.profiles
    SET credits = credits + v_refund_credits
    WHERE user_id = v_req.user_id;

    UPDATE public.withdrawal_requests
    SET status = 'rejected',
        processed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_req.user_id,
      '❌ Withdrawal Rejected',
      'Your withdrawal request for ₦' || v_req.amount || ' was rejected. ' || v_refund_credits || ' credits have been refunded. Reason: ' || COALESCE(p_rejection_reason, 'No reason provided.'),
      'warning'
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'credits_refunded', v_refund_credits);
  END IF;
END;
$$;

-- 5. Secure Syndicate Task Creation Function (Server-Authoritative Pricing & Credit Lock)
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

-- 6. Secure Review & Payout of Syndicate Task Assignment Function
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
    -- Get exchange rate
    SELECT value INTO v_rate_setting FROM public.app_settings WHERE key = 'credit_exchange_rate';
    IF v_rate_setting IS NOT NULL AND v_rate_setting ~ '^\d+$' THEN
      v_exchange_rate := v_rate_setting::integer;
    END IF;

    v_payout_naira := COALESCE(v_task.payout_amount, v_task.cost_per_syndicate * 0.7);
    v_payout_credits := floor(v_payout_naira / v_exchange_rate);
    IF v_payout_credits < 1 THEN
      v_payout_credits := 1;
    END IF;

    -- Update assignment
    UPDATE public.syndicate_task_assignments
    SET status = 'approved',
        reviewed_at = now()
    WHERE id = p_assignment_id;

    -- Credit syndicate user atomically
    UPDATE public.profiles
    SET credits = credits + v_payout_credits
    WHERE user_id = v_assignment.syndicate_user_id;

    -- Update syndicate stats
    UPDATE public.syndicate_profiles
    SET tasks_completed = COALESCE(tasks_completed, 0) + 1,
        ranking_score = COALESCE(ranking_score, 0) + 10
    WHERE user_id = v_assignment.syndicate_user_id;

    -- Notify syndicate member
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_assignment.syndicate_user_id,
      '💰 Task Approved!',
      'Your task submission for "' || v_task.title || '" was approved! ' || v_payout_credits || ' GGG credits (≈₦' || v_payout_naira || ') credited.',
      'credit'
    );

    RETURN jsonb_build_object('success', true, 'status', 'approved', 'payout_credits', v_payout_credits);
  ELSE
    UPDATE public.syndicate_task_assignments
    SET status = 'rejected',
        reviewed_at = now()
    WHERE id = p_assignment_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_assignment.syndicate_user_id,
      '❌ Task Submission Rejected',
      'Your task submission for "' || v_task.title || '" was rejected. Reason: ' || COALESCE(p_rejection_reason, 'Did not meet requirements.'),
      'warning'
    );

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  END IF;
END;
$$;

-- 7. Secure Simple Credit Task Completion Function
CREATE OR REPLACE FUNCTION public.complete_credit_task(
  p_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_task record;
  v_already_completed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Lock task row
  SELECT * INTO v_task
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  IF NOT COALESCE(v_task.is_active, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task is no longer active');
  END IF;

  IF v_task.creator_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot complete your own task');
  END IF;

  IF v_task.max_completions IS NOT NULL AND COALESCE(v_task.completions_count, 0) >= v_task.max_completions THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task has reached maximum completion limit');
  END IF;

  -- Check if already completed
  SELECT EXISTS (
    SELECT 1 FROM public.task_completions
    WHERE task_id = p_task_id AND user_id = v_user_id
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task already completed by you');
  END IF;

  -- Record completion
  INSERT INTO public.task_completions (task_id, user_id)
  VALUES (p_task_id, v_user_id);

  -- Increment completions count and deactivate if cap reached
  UPDATE public.tasks
  SET completions_count = COALESCE(completions_count, 0) + 1,
      is_active = CASE 
        WHEN max_completions IS NOT NULL AND COALESCE(completions_count, 0) + 1 >= max_completions THEN false 
        ELSE is_active 
      END
  WHERE id = p_task_id;

  -- Credit user
  UPDATE public.profiles
  SET credits = credits + COALESCE(v_task.reward_credits, 5)
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'credits_awarded', COALESCE(v_task.reward_credits, 5)
  );
END;
$$;

-- 8. Hardened RLS Policies for Financial Tables

-- Task Wallets: Users can SELECT their own, only admin/system can UPDATE balances
DROP POLICY IF EXISTS "Users can manage own wallet" ON public.task_wallets;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.task_wallets;
DROP POLICY IF EXISTS "Users can create own wallet" ON public.task_wallets;

CREATE POLICY "Users can view own wallet" ON public.task_wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own wallet" ON public.task_wallets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Withdrawal Requests: Users can view own, only admin can update status
DROP POLICY IF EXISTS "Users can manage own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawal_requests;

CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Syndicate Task Assignments: Prevent users from setting status to approved
DROP POLICY IF EXISTS "Users can manage own assignments" ON public.syndicate_task_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.syndicate_task_assignments;
DROP POLICY IF EXISTS "Users can insert own assignments" ON public.syndicate_task_assignments;
DROP POLICY IF EXISTS "Users can update own submitted assignments" ON public.syndicate_task_assignments;

CREATE POLICY "Users can view own assignments" ON public.syndicate_task_assignments
  FOR SELECT TO authenticated USING (syndicate_user_id = auth.uid());

CREATE POLICY "Users can insert own assignments" ON public.syndicate_task_assignments
  FOR INSERT TO authenticated WITH CHECK (syndicate_user_id = auth.uid());

CREATE POLICY "Users can update own submitted assignments" ON public.syndicate_task_assignments
  FOR UPDATE TO authenticated
  USING (syndicate_user_id = auth.uid())
  WITH CHECK (
    syndicate_user_id = auth.uid() AND
    status IN ('accepted', 'submitted')
  );
