-- GGD AD NETWORK 2.0 — PHASE 2: PAYSTACK AUTOMATIC SYNDICATE PAYOUT SYSTEM
-- Preserves all Phase 1 foundations, escrow, RLS, and security constraints.

-- 1. Extend withdrawal_requests with Paystack payout columns
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS payout_mode text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS paystack_recipient_code text,
  ADD COLUMN IF NOT EXISTS paystack_transfer_code text,
  ADD COLUMN IF NOT EXISTS paystack_reference text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS credits_held integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure unique paystack_reference constraint when not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'withdrawal_requests_paystack_ref_unique'
  ) THEN
    ALTER TABLE public.withdrawal_requests
      ADD CONSTRAINT withdrawal_requests_paystack_ref_unique UNIQUE (paystack_reference);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Extend syndicate_profiles with Paystack recipient tracking & bank_code
ALTER TABLE public.syndicate_profiles
  ADD COLUMN IF NOT EXISTS bank_code text,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code text,
  ADD COLUMN IF NOT EXISTS paystack_recipient_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS paystack_recipient_details jsonb;

-- 3. Default app_settings for Paystack Auto-Payout
INSERT INTO public.app_settings (key, value)
VALUES
  ('auto_payout_enabled', 'false'),
  ('max_auto_payout_amount', '50000'),
  ('min_auto_payout_amount', '500')
ON CONFLICT (key) DO NOTHING;

-- 4. Atomic Stored Procedure: Safe Syndicate Withdrawal Refund
CREATE OR REPLACE FUNCTION public.refund_syndicate_withdrawal(
  p_request_id uuid,
  p_reason text DEFAULT 'Transfer failed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_refund_credits integer;
  v_exchange_rate integer := 100;
  v_rate_setting text;
BEGIN
  -- Lock the withdrawal request
  SELECT * INTO v_req
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;

  -- Idempotency check: Cannot refund if already completed, failed, or rejected
  IF v_req.status IN ('completed', 'failed', 'rejected', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Withdrawal is already in terminal state: ' || v_req.status,
      'status', v_req.status
    );
  END IF;

  -- Calculate refund credits
  IF v_req.credits_held IS NOT NULL AND v_req.credits_held > 0 THEN
    v_refund_credits := v_req.credits_held;
  ELSE
    SELECT value INTO v_rate_setting FROM public.app_settings WHERE key = 'credit_exchange_rate';
    IF v_rate_setting IS NOT NULL AND v_rate_setting ~ '^\d+$' THEN
      v_exchange_rate := v_rate_setting::integer;
    END IF;
    v_refund_credits := ceil(v_req.amount / v_exchange_rate);
  END IF;

  -- Restore credits to user profile atomically
  UPDATE public.profiles
  SET credits = credits + v_refund_credits
  WHERE user_id = v_req.user_id;

  -- Update withdrawal request status
  UPDATE public.withdrawal_requests
  SET
    status = 'failed',
    failure_reason = p_reason,
    processed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (
    v_req.user_id,
    'WITHDRAWAL_REFUNDED',
    'withdrawal_request',
    p_request_id,
    jsonb_build_object(
      'amount', v_req.amount,
      'credits_restored', v_refund_credits,
      'reason', p_reason,
      'paystack_reference', v_req.paystack_reference
    )
  );

  -- User Notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_req.user_id,
    '⚠️ Withdrawal Refunded',
    'Your withdrawal of ₦' || v_req.amount || ' could not be completed (' || COALESCE(p_reason, 'Failed') || '). ' || v_refund_credits || ' GGG credits have been restored to your balance.',
    'warning'
  );

  RETURN jsonb_build_object(
    'success', true,
    'refunded_credits', v_refund_credits,
    'amount', v_req.amount
  );
END;
$$;

-- 5. Atomic Stored Procedure: Complete / Update Paystack Payout
CREATE OR REPLACE FUNCTION public.complete_paystack_withdrawal(
  p_reference text,
  p_transfer_code text DEFAULT NULL,
  p_status text DEFAULT 'completed',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_new_status text;
BEGIN
  -- Find withdrawal by paystack_reference, paystack_transfer_code, or UUID id
  SELECT * INTO v_req
  FROM public.withdrawal_requests
  WHERE paystack_reference = p_reference
     OR (paystack_transfer_code IS NOT NULL AND paystack_transfer_code = p_transfer_code)
     OR (p_reference ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = p_reference::uuid)
  FOR UPDATE;

  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found for reference: ' || p_reference);
  END IF;

  -- Normalize status
  IF p_status IN ('success', 'completed', 'paid') THEN
    v_new_status := 'completed';
  ELSIF p_status IN ('failed', 'reversed', 'rejected') THEN
    v_new_status := 'failed';
  ELSIF p_status IN ('processing', 'pending', 'otp') THEN
    v_new_status := 'processing';
  ELSE
    v_new_status := p_status;
  END IF;

  -- Idempotency check: If already completed
  IF v_req.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'status', 'completed',
      'request_id', v_req.id
    );
  END IF;

  -- If status is transitioning to failed
  IF v_new_status = 'failed' THEN
    -- Call refund procedure
    RETURN public.refund_syndicate_withdrawal(v_req.id, COALESCE(p_reason, 'Paystack transfer failed'));
  END IF;

  -- If status is transitioning to completed
  IF v_new_status = 'completed' THEN
    UPDATE public.withdrawal_requests
    SET
      status = 'completed',
      paystack_transfer_code = COALESCE(p_transfer_code, v_req.paystack_transfer_code),
      processed_at = now(),
      updated_at = now()
    WHERE id = v_req.id;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
      v_req.user_id,
      'WITHDRAWAL_COMPLETED_PAYSTACK',
      'withdrawal_request',
      v_req.id,
      jsonb_build_object(
        'amount', v_req.amount,
        'payout_mode', 'automatic',
        'paystack_reference', v_req.paystack_reference,
        'paystack_transfer_code', COALESCE(p_transfer_code, v_req.paystack_transfer_code)
      )
    );

    -- Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_req.user_id,
      '🎉 Withdrawal Paid Successfully!',
      '₦' || v_req.amount || ' has been transferred directly to your ' || v_req.bank_name || ' account (' || v_req.account_number || ').',
      'success'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'completed',
      'request_id', v_req.id,
      'amount', v_req.amount
    );
  END IF;

  -- If status is processing
  IF v_new_status = 'processing' THEN
    UPDATE public.withdrawal_requests
    SET
      status = 'processing',
      paystack_transfer_code = COALESCE(p_transfer_code, v_req.paystack_transfer_code),
      updated_at = now()
    WHERE id = v_req.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'processing',
      'request_id', v_req.id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

-- 6. Updated Secure Syndicate Withdrawal Request Procedure (Phase 2 with Auto-Payout Routing)
CREATE OR REPLACE FUNCTION public.request_syndicate_withdrawal(
  p_amount numeric,
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_pin_hash text DEFAULT NULL,
  p_bank_code text DEFAULT NULL
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
  v_auto_payout_setting text;
  v_max_auto_setting text;
  v_auto_payout_enabled boolean := false;
  v_max_auto_amount numeric := 50000;
  v_initial_status text := 'pending_admin';
  v_payout_mode text := 'manual';
  v_profile_bank_code text;
  v_recipient_code text;
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

  SELECT value INTO v_auto_payout_setting FROM public.app_settings WHERE key = 'auto_payout_enabled';
  IF v_auto_payout_setting IS NOT NULL AND LOWER(v_auto_payout_setting) IN ('true', '1', 'on') THEN
    v_auto_payout_enabled := true;
  END IF;

  SELECT value INTO v_max_auto_setting FROM public.app_settings WHERE key = 'max_auto_payout_amount';
  IF v_max_auto_setting IS NOT NULL AND v_max_auto_setting ~ '^\d+(\.\d+)?$' THEN
    v_max_auto_amount := v_max_auto_setting::numeric;
  END IF;

  IF p_amount < v_min_withdraw THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum withdrawal amount is ₦' || v_min_withdraw);
  END IF;

  -- Check PIN & bank info from syndicate_profiles
  SELECT withdraw_pin_hash, bank_code, paystack_recipient_code
  INTO v_stored_pin, v_profile_bank_code, v_recipient_code
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

  -- Determine payout mode and initial status
  IF v_auto_payout_enabled AND p_amount <= v_max_auto_amount THEN
    v_initial_status := 'pending_automatic';
    v_payout_mode := 'automatic';
  ELSE
    v_initial_status := 'pending_admin';
    v_payout_mode := 'manual';
  END IF;

  -- Insert withdrawal request with credits_held & payout_mode
  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    bank_name,
    account_number,
    account_name,
    status,
    payout_mode,
    credits_held,
    paystack_recipient_code
  )
  VALUES (
    v_user_id,
    p_amount,
    p_bank_name,
    p_account_number,
    p_account_name,
    v_initial_status,
    v_payout_mode,
    v_credits_needed,
    v_recipient_code
  )
  RETURNING id INTO v_request_id;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (
    v_user_id,
    'WITHDRAWAL_REQUESTED',
    'withdrawal_request',
    v_request_id,
    jsonb_build_object(
      'amount', p_amount,
      'credits_held', v_credits_needed,
      'payout_mode', v_payout_mode,
      'status', v_initial_status,
      'auto_payout_enabled', v_auto_payout_enabled
    )
  );

  -- Notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    v_user_id,
    '⏳ Withdrawal Submitted',
    CASE
      WHEN v_payout_mode = 'automatic' THEN
        'Your withdrawal of ₦' || p_amount || ' (' || v_credits_needed || ' credits) has been submitted for automatic Paystack transfer.'
      ELSE
        'Your withdrawal request for ₦' || p_amount || ' (' || v_credits_needed || ' credits) has been submitted for admin review.'
    END,
    'info'
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'amount', p_amount,
    'credits_held', v_credits_needed,
    'status', v_initial_status,
    'payout_mode', v_payout_mode,
    'auto_payout_enabled', v_auto_payout_enabled,
    'new_credits', v_user_credits - v_credits_needed
  );
END;
$$;

-- 7. Admin Process Withdrawal Procedure (Supports Manual Fallback, Instant Paystack Trigger, or Rejection)
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
  v_refund_res jsonb;
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

  IF v_req.status IN ('completed', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal has already reached terminal status: ' || v_req.status);
  END IF;

  IF p_approve THEN
    UPDATE public.withdrawal_requests
    SET
      status = 'completed',
      processed_at = now(),
      updated_at = now(),
      payout_mode = COALESCE(payout_mode, 'manual')
    WHERE id = p_request_id;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
      v_admin_id,
      'WITHDRAWAL_APPROVED_MANUAL',
      'withdrawal_request',
      p_request_id,
      jsonb_build_object('amount', v_req.amount, 'user_id', v_req.user_id)
    );

    -- Notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_req.user_id,
      '✅ Withdrawal Paid Manually',
      'Your withdrawal of ₦' || v_req.amount || ' has been approved and paid by admin.',
      'success'
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'completed',
      'request_id', p_request_id
    );
  ELSE
    -- Rejection with atomic refund
    v_refund_res := public.refund_syndicate_withdrawal(
      p_request_id,
      COALESCE(p_rejection_reason, 'Rejected by Administrator')
    );

    -- Update status to rejected explicitly
    UPDATE public.withdrawal_requests
    SET status = 'rejected'
    WHERE id = p_request_id;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
    VALUES (
      v_admin_id,
      'WITHDRAWAL_REJECTED_ADMIN',
      'withdrawal_request',
      p_request_id,
      jsonb_build_object(
        'amount', v_req.amount,
        'user_id', v_req.user_id,
        'reason', p_rejection_reason
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'request_id', p_request_id,
      'refund_details', v_refund_res
    );
  END IF;
END;
$$;
